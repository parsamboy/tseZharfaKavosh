/**
 * tseZharfaKavosh — engine parity + unit test v0.1.0 (node)
 * Tests the A/B separation modules against the REAL repo models:
 *   src/engine/bEngine.v0.1.0.js + src/engine/aLookup.v0.1.0.js
 *   with src/optionParser.v0.1.0.js + src/models/greeks.v0.1.0.js injected.
 *
 * Covers: index build, dirty detection, dual-trigger guard, atomic swap,
 * fail-closed (error publishes nothing), fail-open (unknown -> true),
 * bitset round-trip, A parity (generated body vs evaluateRow), capacity check,
 * and a timing report against the live budget (full ~18.4ms, cycle ~3ms).
 *
 * Run: node probes/engine.parity.v1.js
 * SPDX-License-Identifier: Smart-FFA-1.1
 */
'use strict';

const path = require('path');
const fs = require('fs');
const ROOT = path.join(__dirname, '..');

const { createBEngine, VERSION: B_VERSION, DIRTY_FIELDS, DEFAULT_FUNNEL_CONFIG } = require(path.join(ROOT, 'src/engine/bEngine.v0.1.0.js'));
const A = require(path.join(ROOT, 'src/engine/aLookup.v0.1.0.js'));
const OP = require(path.join(ROOT, 'src/optionParser.v0.1.0.js'));
const G = require(path.join(ROOT, 'src/models/greeks.v0.1.0.js'));

let pass = 0, fail = 0;
const failures = [];
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  PASS  ' + name + (extra ? '  (' + extra + ')' : '')); }
  else { fail++; failures.push(name); console.log('  FAIL  ' + name + (extra ? '  (' + extra + ')' : '')); }
}
function section(t) { console.log('\n=== ' + t + ' ==='); }

// ---------- synthetic live-shaped data ----------
const UNDERLYINGS = ['اهرم', 'بساما', 'فولاد', 'شپنا', 'وبانک', 'خودرو', 'کچاد', 'پارس', 'مبین', 'آرمان'];
const SPOTS = [15000, 22000, 27500, 44000, 53000, 61500, 72813, 79500];
const TOTAL = 3282, OPTION_RATIO = 0.30, T = 0.082, R = 0.2, TRUE_SIGMA = 0.35;

function makeRows(n) {
  const rows = [];
  for (let i = 0; i < n; i++) {
    const isOption = i < Math.floor(n * OPTION_RATIO);
    const u = UNDERLYINGS[i % UNDERLYINGS.length];
    const S = SPOTS[i % SPOTS.length];
    const inscode = String(400000000000000 + i * 7919);
    const base = { inscode, tvol: 1000 + (i % 9000), tno: 20 + (i % 300) };
    if (isOption) {
      const kind = (i % 2 === 0) ? 'call' : 'put';
      const strike = Math.round((S * (0.85 + 0.3 * ((i % 17) / 16))) / 500) * 500;
      const jm = 7 + (i % 3), jd = 1 + (i % 27);
      base.l18 = (kind === 'call' ? 'ض' : 'ط') + 'هرم' + strike;
      base.l30 = (kind === 'call' ? 'اختیارخ ' : 'اختیارف ') + u + '-' + strike + '-1405/' +
        String(jm).padStart(2, '0') + '/' + String(jd).padStart(2, '0');
      base.pl = S; base.pc = strike;
      const g = G.bsGreeks({ S, K: strike, T, r: R, sigma: TRUE_SIGMA, kind });
      const premium = Math.max(1, g.price);
      base.plc = premium * (1 + ((i % 7) - 3) * 0.01);
      base.pcp = premium * 0.98; base.plp = premium * 1.01;
    } else {
      base.l18 = u + String(1000 + i); base.l30 = u;
      base.pl = 3000 + (i % 7000); base.pc = 2950 + (i % 700);
      base.plc = 3010 + (i % 500); base.pcp = 2990 + (i % 500); base.plp = 3005 + (i % 500);
    }
    rows.push(base);
  }
  return rows;
}

const models = { parseOptionLabel: OP.parseOptionLabel, impliedVol: G.impliedVol, bsGreeks: G.bsGreeks };
const rows = makeRows(TOTAL);
const mwMock = { RoundNo: 7, AllRows: {}, FilterCode: '' };
rows.forEach(r => { mwMock.AllRows[r.inscode] = r; });

function newEngine(overrides) {
  return createBEngine(Object.assign({ models: models }, overrides || {}));
}

// ---------- 1. index + bitset shape ----------
section('1. index + bitset shape');
{
  const b = newEngine();
  const idx = b.buildIndex(rows);
  check('index built for all symbols', idx.count === TOTAL, 'count=' + idx.count);
  check('index changed on first build', idx.changed === true);
  check('bitset byte size = ceil(n/8)', b.state.bitset.length === Math.ceil(TOTAL / 8), b.state.bitset.length + ' bytes');
  check('known mask same size', b.state.known.length === b.state.bitset.length);
  check('reverse index O(1) hit', b.state.index[rows[10].inscode] === 10);
  check('dedupe keeps first position', (function () {
    const dup = [{ inscode: 'A', tvol: 1 }, { inscode: 'A', tvol: 2 }, { inscode: 'B', tvol: 3 }];
    const e = newEngine(); const r = e.buildIndex(dup);
    return r.count === 2 && e.state.index.A === 0 && e.state.index.B === 1 && e.state.rowIndex.A.tvol === 1;
  })());
  check('normalizeRows accepts object map', b._normalizeRows(mwMock.AllRows).length === TOTAL);
}

// ---------- 2. dirty detection ----------
section('2. dirty detection (O(n), no mutation)');
{
  const b = newEngine();
  b.buildIndex(rows);
  const d1 = b.detectDirty(rows);
  check('first pass: all dirty', d1.count === TOTAL, 'dirty=' + d1.count);
  check('detectDirty does not mutate prevRows', Object.keys(b.state.prevRows).length === 0);
  b.commitDirty(d1.rowMap);
  const d2 = b.detectDirty(rows);
  check('after commit: zero dirty (no-change)', d2.count === 0, 'dirty=' + d2.count);
  // change 2% of rows
  for (let i = 0; i < Math.floor(TOTAL * 0.02); i++) rows[i].tvol += 1;
  const d3 = b.detectDirty(rows);
  check('2% change -> ~2% dirty', d3.count === Math.floor(TOTAL * 0.02), 'dirty=' + d3.count);
  check('dirty list contains changed inscodes', d3.dirty.indexOf(rows[0].inscode) !== -1);
  b.commitDirty(d3.rowMap);
  check('after commit again: zero dirty', b.detectDirty(rows).count === 0);
  check('DIRTY_FIELDS cover every funnel input', ['pl', 'plc', 'l18', 'l30'].every(f => DIRTY_FIELDS.indexOf(f) !== -1), DIRTY_FIELDS.join(','));
  check('DIRTY_FIELDS keep the validated activity proxies', ['tvol', 'tno', 'pcp'].every(f => DIRTY_FIELDS.indexOf(f) !== -1), DIRTY_FIELDS.join(','));
  // index caching: second cycle must not rebuild
  const bc = newEngine();
  bc.run(rows, 's1', 'c1');
  const rebuildsAfterFirst = bc.state.indexRebuilds;
  rows[1].tvol += 1;
  bc.run(rows, 's2', 'c1');
  check('index cached when symbol set unchanged', bc.state.indexRebuilds === rebuildsAfterFirst && bc.state.indexCacheHits >= 1,
    'rebuilds=' + bc.state.indexRebuilds + ' cacheHits=' + bc.state.indexCacheHits);
  check('cached index keeps the same positions', bc.state.index[rows[5].inscode] === 5);
  // index rebuild when the symbol set changes
  rows.push({ inscode: 'NEWONE', l18: 'x', l30: 'y', pl: 1000, pc: 900, plc: 950, tvol: 1, tno: 1 });
  const rAdd = bc.run(rows, 's3', 'c1');
  check('index rebuilt when a symbol is added', bc.state.indexRebuilds === rebuildsAfterFirst + 1 && rAdd.published === true,
    'rebuilds=' + bc.state.indexRebuilds);
  rows.pop();
  // stale-row safety: replace the row OBJECT with new values -> compute must use the new one
  const bs = newEngine();
  bs.run(rows, 's1', 'c1');
  const target = rows.find(r => /^[\u0636\u0637]/.test(r.l18));
  const fresh = Object.assign({}, target, { plc: target.plc * 3 });
  const replaced = rows.map(r => (r === target ? fresh : r));
  const dStale = bs.detectDirty(replaced);
  check('detectDirty reports the replaced row as dirty', dStale.count >= 1 && dStale.rowMap[target.inscode] === fresh);
  const rStale = bs.run(replaced, 's2', 'c1');
  check('stale-row cycle publishes from the CURRENT row', rStale.published === true && rStale.dirtyCount === dStale.count);
  // plc-only change must invalidate the old bit (the bug this test was written for)
  const onlyPlc = rows.map(r => (r === target ? Object.assign({}, r, { plc: r.plc * 2 }) : r));
  check('plc-only change is detected as dirty', bs.detectDirty(onlyPlc).count >= 1);
}

// ---------- 3. dual-trigger guard ----------
section('3. dual-trigger guard (snapshotId + configHash)');
{
  const b = newEngine();
  check('first run always needed', b.needsRun('snap-1-100', '0-0') === true);
  b.run(rows, 'snap-1-100', '0-0');
  check('same ids -> no re-run', b.needsRun('snap-1-100', '0-0') === false);
  check('new snapshotId -> re-run', b.needsRun('snap-2-100', '0-0') === true);
  check('new configHash -> re-run', b.needsRun('snap-1-100', '1-0') === true);
  const snap = b.computeSnapshotId({ RoundNo: 7, AllRows: mwMock.AllRows });
  const cfg = b.computeConfigHash({ __B_configVersion: 3, FilterCode: 'abc' });
  check('computeSnapshotId format', snap === 'snap-7-' + TOTAL, snap);
  check('computeConfigHash format', cfg === '3-3', cfg);
}

// ---------- 4. full cycle + publish + fail-open ----------
section('4. full cycle, atomic swap, publish, fail-open');
{
  const b = newEngine();
  const r1 = b.run(rows, 'snap-7-' + TOTAL, '0-0');
  check('run1 published', r1.published === true);
  check('run1 dirty = all symbols', r1.dirtyCount === TOTAL, 'dirty=' + r1.dirtyCount);
  check('run1 computed only option rows', r1.computed > 0 && r1.computed <= Math.ceil(TOTAL * OPTION_RATIO) + 5, 'computed=' + r1.computed);
  check('run1 unknown = non-option rows', r1.unknown > 0, 'unknown=' + r1.unknown);
  check('bitset bytes = 411-ish', b.state.bitset.length === Math.ceil(TOTAL / 8), b.state.bitset.length + ' bytes');

  const mw2 = {};
  b.publish(mw2);
  check('publish writes projection', mw2.__B_bitset && mw2.__B_known && mw2.__B_index && mw2.__B_symbols);
  check('publish writes snapshotId+configHash', mw2.__B_snapshotId === 'snap-7-' + TOTAL && mw2.__B_configHash === '0-0');
  check('publish writes meta', mw2.__B_meta && mw2.__B_meta.version === B_VERSION);

  // A fail-open: no published projection at all
  check('A fail-open when nothing published', A.evaluateRow(rows[0], { ok: false }) === true);
  check('A fail-open on empty published', A.evaluateRow(rows[0], null) === true);
  // A fail-open: symbol not in index
  check('A fail-open for unknown symbol', A.evaluateRow({ inscode: '999999999' }, b.getPublished()) === true);
  // A: computed symbols follow the bit
  const pub = b.getPublished();
  let agree = 0, disagree = 0;
  for (let i = 0; i < rows.length; i++) {
    const pos = pub.index[rows[i].inscode];
    const known = b._getBit(pub.known, pos) === 1;
    const expected = known ? (b._getBit(pub.bitset, pos) === 1) : true;
    if (A.evaluateRow(rows[i], pub) === expected) agree++; else disagree++;
  }
  check('A agrees with projection on every row', disagree === 0, 'agree=' + agree + ' disagree=' + disagree);

  // non-computed symbols must fail open
  const stockRow = rows[Math.floor(TOTAL * OPTION_RATIO) + 5];
  const stockPos = pub.index[stockRow.inscode];
  check('non-option symbol is unknown (A true)', b._getBit(pub.known, stockPos) === 0 && A.evaluateRow(stockRow, pub) === true);

  // atomic swap: previous projection preserved on error
  // (start from a VALID projection, then break the model on the next cycle)
  let broken = false;
  const flaky = {
    parseOptionLabel: OP.parseOptionLabel,
    impliedVol: function (p) { if (broken) throw new Error('boom'); return G.impliedVol(p); },
    bsGreeks: G.bsGreeks
  };
  const bErr = newEngine({ models: flaky });
  const rOk = bErr.run(rows, 'snap-a', '0-0');
  check('baseline cycle publishes before the break', rOk.published === true);
  const beforeBits = bErr.state.bitset;
  const beforeKnown = bErr.state.known;
  broken = true;
  rows[0].tvol += 5;
  const rErr = bErr.run(rows, 'snap-b', '0-0');
  check('B fail-closed: error cycle publishes nothing', rErr.published === false && rErr.reason === 'error');
  check('B fail-closed: previous projection object untouched', bErr.state.bitset === beforeBits && bErr.state.known === beforeKnown);
  check('B fail-closed: snapshotId not advanced', bErr.state.snapshotId === 'snap-a');
  check('B fail-closed: A still sees the previous valid projection', bErr.getPublished().ok === true && bErr.getPublished().bitset === beforeBits);
  const dRetry = bErr.detectDirty(rows);
  check('B fail-closed: failed rows retried next cycle', dRetry.count > 0, 'retry dirty=' + dRetry.count);
  broken = false;
  const rFix = bErr.run(rows, 'snap-b', '0-0');
  check('after fix the retried cycle publishes', rFix.published === true && rFix.dirtyCount === dRetry.count);
}

// ---------- 5. incremental cycle ----------
section('5. incremental cycle');
{
  const b = newEngine();
  b.run(rows, 'snap-7-' + TOTAL, '0-0');
  const rNo = b.run(rows, 'snap-7-' + TOTAL, '0-0');
  check('no-change cycle publishes nothing (no-change)', rNo.published === false && rNo.reason === 'no-change');
  rows[3].tvol += 2; rows[9].pl += 2;
  const rInc = b.run(rows, 'snap-8-' + TOTAL, '0-0');
  check('incremental cycle publishes', rInc.published === true);
  check('incremental dirty = 2', rInc.dirtyCount === 2, 'dirty=' + rInc.dirtyCount);
  check('totalRuns counts only published cycles', b.state.totalRuns === 2, 'runs=' + b.state.totalRuns);
  check('no-dirty with new snapshot marks processed', (function () {
    const r = b.run(rows, 'snap-9-' + TOTAL, '0-0');
    return r.published === false && r.reason === 'no-dirty' && b.needsRun('snap-9-' + TOTAL, '0-0') === false;
  })());
}

// ---------- 6. hooks (configVersion) ----------
section('6. hooks — configVersion (UX-owned)');
{
  const b = newEngine();
  let settingsCalls = 0, paramsCalls = 0;
  const mwH = {
    RoundNo: 1, AllRows: {}, FilterCode: '',
    SaveSettings: function () { settingsCalls++; return 'settings-ok'; },
    SaveParams: function () { paramsCalls++; return 'params-ok'; }
  };
  const ctx = { marker: 'window-context' };
  const h = b.installHooks(mwH, ctx);
  const a1 = mwH.SaveSettings();
  const a2 = mwH.SaveParams();
  check('original SaveSettings still called', settingsCalls === 1 && a1 === 'settings-ok');
  check('original SaveParams still called', paramsCalls === 1 && a2 === 'params-ok');
  check('configVersion bumped by both hooks', b.state.configVersion === 2 && mwH.__B_configVersion === 2);
  check('configHash reflects version + FilterCode length', b.computeConfigHash({ __B_configVersion: 2, FilterCode: 'xy' }) === '2-2');
  h.uninstall();
  mwH.SaveSettings();
  check('uninstall restores originals', b.state.configVersion === 2);
  check('hook context is window (this) not mw', (function () {
    const e = newEngine();
    const c = { id: 'ctx' };
    const mwT = { RoundNo: 1, AllRows: {}, SaveSettings: function () { return this === c; } };
    e.installHooks(mwT, c);
    return mwT.SaveSettings() === true;
  })());
}

// ---------- 7. A generated body parity ----------
section('7. A generated filter body — parity + capacity');
{
  const fc = A.buildFilterCode();
  check('generated body non-empty', typeof fc.body === 'string' && fc.body.length > 0);
  check('generated body fits filter slot', fc.fits === true, fc.bytes + ' / ' + fc.limit + ' bytes');
  check('generated body has no mangled identifiers', !/\b_[a-z]\b/.test(fc.body.replace(/__[a-z]/g, '')));
  const compiled = A.compileFilterCodeBody(fc.body);
  const b = newEngine();
  b.run(rows, 'snap-7-' + TOTAL, '0-0');
  const mwPage = {};
  b.publish(mwPage);
  let agree = 0, disagree = 0;
  for (let i = 0; i < rows.length; i++) {
    const viaBody = compiled(rows[i], mwPage);
    const viaModule = A.evaluateRow(rows[i], b.getPublished());
    if (viaBody === viaModule) agree++; else disagree++;
  }
  check('generated body == evaluateRow on all rows', disagree === 0, 'agree=' + agree + ' disagree=' + disagree);
  // fail-open paths through the generated body
  check('body fail-open: no projection', compiled(rows[0], {}) === true);
  check('body fail-open: unknown symbol', compiled({ inscode: 'nope' }, mwPage) === true);
  const stockRow = rows[Math.floor(TOTAL * OPTION_RATIO) + 5];
  check('body fail-open: unknown bit', compiled(stockRow, mwPage) === true);
  // acorn parse of generated body (G-14 convention) — skipped if acorn is not installed
  let acornOk = false, acornErr = null, acornSkipped = false;
  try {
    const acorn = require(path.join(ROOT, 'node_modules/acorn'));
    acorn.parse(fc.body, { ecmaVersion: 2020 });
    acornOk = true;
  } catch (e) {
    acornErr = String(e && e.message || e);
    if (/Cannot find module/.test(acornErr)) acornSkipped = true;
  }
  if (acornSkipped) console.log('  SKIP  acorn parses generated body (acorn not installed)');
  else check('acorn parses generated body', acornOk, acornErr || 'ok');
}

// ---------- 8. timing vs live budget ----------
section('8. timing vs live budget (node, real models)');
{
  const b = newEngine();
  // phase breakdown: index / dirty / compute (design doc requires separate timers)
  const phases = {};
  let mark = process.hrtime.bigint();
  let lapTarget = phases;
  function lap(name) { const n = process.hrtime.bigint(); lapTarget[name] = Number(n - mark) / 1e6; mark = n; }
  b.buildIndex(rows); lap('buildIndex');
  b.detectDirty(rows); lap('detectDirty');
  const t0 = process.hrtime.bigint();
  const r1 = b.run(rows, 'snap-7-' + TOTAL, '0-0');
  lap('fullRun');
  const t1 = process.hrtime.bigint();
  const fullMs = Number(t1 - t0) / 1e6;
  console.log('  full recompute (3282 symbols, ' + r1.computed + ' option rows): ' + fullMs.toFixed(1) + 'ms');
  console.log('  phases: buildIndex=' + phases.buildIndex.toFixed(2) + 'ms detectDirty=' + phases.detectDirty.toFixed(2) + 'ms fullRun=' + phases.fullRun.toFixed(2) + 'ms');
  for (let i = 0; i < Math.floor(TOTAL * 0.02); i++) rows[i].tvol += 1;
  const p2 = {};
  mark = process.hrtime.bigint();
  lapTarget = p2;
  b.buildIndex(rows); lap('buildIndex');
  const dInc = b.detectDirty(rows); lap('detectDirty');
  const t2 = process.hrtime.bigint();
  const r2 = b.run(rows, 'snap-8-' + TOTAL, '0-0');
  const t3 = process.hrtime.bigint();
  const incMs = Number(t3 - t2) / 1e6;
  lap('fullRun');
  console.log('  incremental (dirty=' + r2.dirtyCount + '): ' + incMs.toFixed(2) + 'ms  [buildIndex=' + p2.buildIndex.toFixed(2) + ' detectDirty=' + p2.detectDirty.toFixed(2) + ' fullRun=' + p2.fullRun.toFixed(2) + ']');
  check('buildIndex alone is not the bottleneck', p2.buildIndex < 2.0, p2.buildIndex.toFixed(2) + 'ms');
  check('detectDirty alone is not the bottleneck', p2.detectDirty < 3.0, p2.detectDirty.toFixed(2) + 'ms');
  console.log('  per-row funnel (node warm): ' + (fullMs * 1000 / Math.max(1, r1.computed)).toFixed(2) + 'us');
  check('full recompute under live budget (18.4ms x3)', fullMs < 55, fullMs.toFixed(1) + 'ms');
  check('incremental cycle under 5ms threshold', incMs < 5, incMs.toFixed(2) + 'ms');
}

// ---------- summary ----------
console.log('\n=== SUMMARY ===');
console.log('pass=' + pass + ' fail=' + fail);
if (fail > 0) { console.log('FAILURES: ' + failures.join(' | ')); process.exitCode = 1; }
console.log('PROBE_JSON ' + JSON.stringify({
  probe: 'engine.parity.v1', tag: 'node', host: 'local',
  bVersion: B_VERSION, aVersion: A.VERSION,
  totalSymbols: TOTAL, optionRows: Math.floor(TOTAL * OPTION_RATIO),
  bitsetBytes: Math.ceil(TOTAL / 8), generatedBodyBytes: A.buildFilterCode().bytes,
  pass: pass, fail: fail
}));
