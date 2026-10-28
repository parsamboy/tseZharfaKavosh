'use strict';
/**
 * probes/filterProgram.harness.v1.js
 *
 * Exercises the self-contained filter body (build/filterProgram.v1.js) through the
 * SITE'S OWN execution model, not through a convenience wrapper.
 *
 * The site does (E-061, verbatim):
 *   var FilterResult; try { FilterResult = eval(mw.FilterCode) } catch(e){ FilterResult=false }
 *   if (!FilterResult) { if(document.getElementById(row.inscode)!=null){ ...hide... } }
 *
 * Two consequences that this harness is built around:
 *   1. the COMPLETION VALUE of the body is the verdict. E-074 was a body whose guards
 *      were all correct and which still hid every fail-open row, because it completed
 *      with `undefined`. Only executing the body the way the site does can see that.
 *   2. an exception HIDES the row. The body must never throw.
 *
 * It also checks the two properties the owner's "one paste" requirement rests on:
 *   - B never runs inside RenderData (the A/B architecture), and
 *   - the program survives a page reload (re-initialises from the filter code alone).
 *
 * Run: node probes/filterProgram.harness.v1.js
 *
 * SPDX-License-Identifier: Smart-FFA-1.1
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const BUNDLE = path.join(ROOT, 'src', 'engine', 'tseEngine.browser.v1.js');
const BODY = path.join(ROOT, 'build', 'filterProgram.v1.js');
const META = path.join(ROOT, 'build', 'filterProgram.v1.json');

let checks = 0, failures = 0;
function check(name, cond, detail) {
  checks++;
  if (cond) { console.log('  PASS  ' + name + (detail !== undefined ? '   [' + detail + ']' : '')); return; }
  failures++;
  console.log('  FAIL  ' + name + (detail !== undefined ? '   [' + detail + ']' : ''));
}
function section(t) { console.log('\n=== ' + t + ' ==='); }

// ---------- a measured population: keep, hide and fail-open all occur ----------

const LADDER_ITM = [530, 600, 700, 800, 900, 1000, 1100, 1200, 1300, 1400];
const LADDER_OTM = [0.01, 1, 20, 120, 300, 500, 700, 850, 950, 1150];
const LADDER_ATM = [400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1300];

function makePopulation() {
  const rows = {};
  for (let i = 0; i < 20; i++) {
    const k = 'U' + i;
    rows[k] = { inscode: k, l18: k, l30: k, pc: 1500 + i * 40, pl: 1500 + i * 40, pd1: 0, po1: 0, tno: 1000 + i };
  }
  for (let i = 0; i < 156; i++) {
    const und = 'U' + (i % 20), base = 1500 + (i % 20) * 40;
    const band = i % 3, rung = Math.floor(i / 3) % 10, spreadBand = i % 5, noPrice = (i % 7 === 6);
    const K = Math.round(band === 0 ? base * 0.75 : band === 1 ? base * 1.6 : base);
    const price = band === 0 ? LADDER_ITM[rung] : band === 1 ? LADDER_OTM[rung] : LADDER_ATM[rung];
    const w = (spreadBand === 4) ? 0.15 : 0.02;
    rows['O' + i] = {
      inscode: 'O' + i, l18: 'ض' + i, l30: 'اختيارخ ' + und + '-' + K + '-1406/02/01',
      pd1: noPrice ? 0 : Math.round(price * (1 - w) * 1000) / 1000,
      po1: noPrice ? 0 : Math.round(price * (1 + w) * 1000) / 1000,
      pl: noPrice ? 0 : price, tno: noPrice ? 0 : 5
    };
  }
  return rows;
}

// ---------- the fake page ----------

function makePage(rows) {
  const win = {};
  win.window = win;
  win.global = win;
  win.globalThis = win;
  win.location = { host: 'old.tsetmc.com' };
  win.performance = { now: () => 1 };
  win.console = console;
  win.setTimeout = function (fn, ms) { win.__timers.push({ fn: fn, ms: ms }); return win.__timers.length; };
  win.clearTimeout = function () {};
  win.requestIdleCallback = function (fn) { win.__timers.push({ fn: fn, ms: 0 }); return win.__timers.length; };
  win.__timers = [];
  win.__flush = function () {
    let n = 0;
    while (win.__timers.length && n < 50) {
      const t = win.__timers.shift();
      t.fn();
      n++;
    }
    return n;
  };
  const store = {};
  win.localStorage = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; }
  };
  const mw = {
    AllRows: rows,
    RoundNo: 7,
    FilterCode: '',
    Settings: { Filters: [], FilterNo: -1 },
    __modelCalls: 0,
    __createCalls: 0
  };
  win.mw = mw;
  vm.createContext(win);
  // The bundle is deliberately NOT pre-loaded here. The self-contained body embeds it and
  // installs its OWN module instances on first run, replacing whatever the page had
  // (window.TseBEngine / TseModels / TseLookup / TseFunnelSettings). That is documented
  // behaviour, but it means any wrapper installed before the first render is thrown away -
  // which is exactly how the first version of this harness went blind and reported
  // modelCalls=0 while the engine was plainly running. Counters are armed AFTER init by
  // armCounters().
  return win;
}

/**
 * Install the compute counters. Must be called after the program has initialised, because
 * the program replaces the page's module instances on its first run.
 */
function armCounters(win) {
  const mw = win.mw;
  if (!win.TseBEngine || typeof win.TseBEngine.createBEngine !== 'function') return false;
  const origCreate = win.TseBEngine.createBEngine;
  win.TseBEngine.createBEngine = function (opts) {
    mw.__createCalls++;
    const o = Object.assign({}, opts);
    const m = Object.assign({}, (opts && opts.models) || {});
    const inner = m.parseOptionLabel;
    m.parseOptionLabel = function (r) { mw.__modelCalls++; return inner(r); };
    o.models = m;
    return origCreate(o);
  };
  return true;
}

// The site's own render function, built INSIDE the page context so that eval() sees the
// page's `window` (and therefore the body's W = window resolves to the page, not to node).
function siteRenderer(win) {
  return vm.runInContext('(function () {' +
    '  return function renderRow(row, mw, document) {' +
    '    var hidden = false;' +
    '    if (mw.FilterCode.length != 0) {' +
    '      var FilterResult;' +
    '      try { FilterResult = eval(mw.FilterCode); }' +
    '      catch (e) { FilterResult = false; }' +
    '      if (!FilterResult) { if (document.getElementById(row.inscode) != null) { hidden = true; } }' +
    '    }' +
    '    return { verdict: FilterResult, hidden: hidden };' +
    '  };' +
    '})()', win, { filename: 'site.js' });
}

function renderAll(win, renderRow) {
  const mw = win.mw;
  const document = { getElementById: () => ({}) };
  const out = { visible: 0, hidden: 0, perRow: [], threw: 0 };
  const t0 = process.hrtime.bigint();
  for (const key in mw.AllRows) {
    const row = mw.AllRows[key];
    const r = renderRow(row, mw, document);
    if (r.verdict === undefined) out.threw++;
    if (r.hidden) out.hidden++; else out.visible++;
    out.perRow.push({ inscode: String(row.inscode), verdict: r.verdict, hidden: r.hidden });
  }
  out.ms = Number(process.hrtime.bigint() - t0) / 1e6;
  return out;
}

/** How many rows the projection HIDES (a keep bit of 0 on a judged symbol). */
function hiddenCount(win) {
  const mw = win.mw;
  if (!mw.__B_index || !mw.__B_bitset || !mw.__B_known) return -1;
  let hidden = 0;
  for (const k in mw.__B_index) {
    const pos = mw.__B_index[k];
    const b = pos >> 3, m = pos & 7;
    if (b >= mw.__B_known.length || !((mw.__B_known[b] >> m) & 1)) continue; // not judged -> fail-open
    if (!((mw.__B_bitset[b] >> m) & 1)) hidden++;
  }
  return hidden;
}

function classify(win, inscode) {
  const mw = win.mw;
  const pos = mw.__B_index ? mw.__B_index[inscode] : undefined;
  if (pos === undefined) return 'failOpen';
  const b = pos >> 3, m = pos & 7;
  if (b >= mw.__B_known.length || !((mw.__B_known[b] >> m) & 1)) return 'failOpen';
  return ((mw.__B_bitset[b] >> m) & 1) ? 'keep' : 'hide';
}

// ---------- the harness ----------

section('0. the artifact exists and its own guards passed');
{
  check('the self-contained body was built', fs.existsSync(BODY));
  const meta = JSON.parse(fs.readFileSync(META, 'utf8'));
  check('the builder recorded its guards', Array.isArray(meta.guards) && meta.guards.length >= 6, meta.guards.length + ' guards');
  check('the body is a single paste of a plausible size', meta.bytes > 40000 && meta.bytes < 200000, meta.bytes + ' bytes');
  const body = fs.readFileSync(BODY, 'utf8');
  check('the built body matches the metadata hash', meta.fnv1a === (function fnv1a(s) {
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i) & 0xff; h = (h * 0x01000193) >>> 0; }
    return ('00000000' + h.toString(16)).slice(-8);
  })(body), meta.fnv1a);
  check('the body parses in a (row, mw) scope', (function () {
    try { new Function('row', 'mw', body); return true; } catch (e) { return false; }
  })());
}

section('1. first render is entirely fail-open (B has not run yet)');
let win = makePage(makePopulation());
let renderRow = siteRenderer(win);
win.mw.FilterCode = fs.readFileSync(BODY, 'utf8');
{
  const r = renderAll(win, renderRow);
  check('no row is hidden before the first tick', r.hidden === 0, r.hidden + ' hidden of ' + r.perRow.length);
  check('every verdict is the boolean true', r.perRow.every((p) => p.verdict === true));
  // This is the clobber-proof proof that B did not run inside the render: nothing has been
  // published, so there is nothing for the per-row code to read but fail-open.
  check('nothing was published during the render',
    win.mw.__B_index === undefined && win.mw.__B_bitset === undefined && win.mw.__B_known === undefined);
  check('the program initialised itself on the first render', !!win.__TSE_PROGRAM && !!win.__TSE_SCHED);
  check('the program installed its own module instances (documented)',
    typeof win.TseBEngine === 'object' && typeof win.TseModels === 'object' &&
    typeof win.TseFunnelSettings === 'object' && typeof win.TseLookup === 'object');
}

section('2. B runs in the background tick, OUTSIDE RenderData');
{
  // armed only now: the first render already replaced the page's module instances
  check('the counters could be armed after init', armCounters(win));
  const flushed = win.__flush();
  check('a tick was armed by the per-row code', flushed > 0, flushed + ' timer(s) fired');
  check('the engine ran in the tick', win.mw.__modelCalls > 0, 'modelCalls=' + win.mw.__modelCalls);
  check('the projection is published', !!win.mw.__B_index && !!win.mw.__B_bitset && !!win.mw.__B_known);
  const sc = win.__TSE_SCHED.state;
  check('the tick published at least one projection', sc.runs >= 1, 'runs=' + sc.runs);
  check('the tick re-armed itself', win.__timers.length === 1, 'pending timers=' + win.__timers.length);
  check('no error was recorded', sc.lastError === null, String(sc.lastError));
}

section('3. the verdicts match the projection, through the site\'s own model');
{
  const r = renderAll(win, renderRow);
  const counts = { keep: 0, hide: 0, failOpen: 0 };
  const wrong = [];
  for (let i = 0; i < r.perRow.length; i++) {
    const p = r.perRow[i];
    const cls = classify(win, p.inscode);
    counts[cls]++;
    const wantVisible = (cls === 'keep' || cls === 'failOpen');
    if (p.hidden === wantVisible && wrong.length < 8) {
      wrong.push({ inscode: p.inscode, class: cls, verdict: String(p.verdict), hidden: p.hidden });
    }
  }
  check('the population exercises keep, hide AND fail-open',
    counts.keep > 0 && counts.hide > 0 && counts.failOpen > 0, JSON.stringify(counts));
  check('the site hides exactly the rows the projection hides', wrong.length === 0,
    'wrong=' + wrong.length + ' of ' + r.perRow.length + ' ' + JSON.stringify(wrong.slice(0, 3)));
  check('no verdict came back undefined (the E-074 failure mode)', r.threw === 0, 'undefined verdicts=' + r.threw);
}

section('4. per-row cost (E-064 budget: ~13-16 us/row)');
{
  const keys = Object.keys(win.mw.AllRows);
  const N = 3;
  let best = Infinity;
  for (let pass = 0; pass < N; pass++) {
    const t0 = process.hrtime.bigint();
    for (let i = 0; i < keys.length; i++) renderRow(win.mw.AllRows[keys[i]], win.mw, { getElementById: () => ({}) });
    const ms = Number(process.hrtime.bigint() - t0) / 1e6;
    best = Math.min(best, ms);
  }
  const perRowUs = (best * 1000) / keys.length;
  check('per-row cost is inside the live budget', perRowUs < 16, perRowUs.toFixed(2) + ' us/row over ' + keys.length + ' rows');
  check('the engine is built only once (cost is flat across passes)', win.mw.__createCalls <= 1,
    'createCalls=' + win.mw.__createCalls + ' over ' + keys.length + ' rows');
  console.log('       (per-row: ' + perRowUs.toFixed(2) + ' us; the 430-byte body measured 0.3 us/row,');
  console.log('        so the whole engine costs about ' + (perRowUs - 0.3).toFixed(2) + ' us/row more)');
}

section('5. staleness: a price change with the SAME rows must be picked up');
{
  const before = win.mw.__B_index ? Object.keys(win.mw.__B_index).length : 0;
  const beforeVerdicts = {};
  for (const k in win.mw.AllRows) beforeVerdicts[k] = classify(win, String(win.mw.AllRows[k].inscode));
  // the drift that actually happens live (E-070 -> E-071 -> E-073: judged 143 -> 188 -> 191
  // with the SAME key set). Same RoundNo, same symbol count, different prices.
  win.mw.RoundNo = 7;
  for (const k in win.mw.AllRows) {
    const r = win.mw.AllRows[k];
    if (r.tno > 0) { r.pl = r.pl * 1.05; r.pd1 = r.pd1 * 1.05; r.po1 = r.po1 * 1.05; }
  }
  const flushed = win.__flush();
  check('the tick ran again after the change', flushed > 0, flushed + ' timer(s)');
  let changed = 0;
  for (const k in win.mw.AllRows) {
    if (classify(win, String(win.mw.AllRows[k].inscode)) !== beforeVerdicts[k]) changed++;
  }
  check('the fingerprint saw the price change and the projection moved', changed > 0,
    changed + ' of ' + Object.keys(beforeVerdicts).length + ' verdicts changed');
  check('the symbol set is unchanged (this was a price change, not a rename)',
    Object.keys(win.mw.__B_index).length === before, before + ' -> ' + Object.keys(win.mw.__B_index).length);
}

section('6. fail-open on every missing or broken piece');
{
  const document = { getElementById: () => ({}) };
  const body = win.mw.FilterCode;
  const row = { inscode: 'O0' };
  const cases = [
    ['no projection at all', {}],
    ['an empty index', { __B_index: {}, __B_known: win.mw.__B_known, __B_bitset: win.mw.__B_bitset }],
    ['a short known array', { __B_index: win.mw.__B_index, __B_known: [], __B_bitset: win.mw.__B_bitset }],
    ['a short bitset array', { __B_index: win.mw.__B_index, __B_known: win.mw.__B_known, __B_bitset: [] }],
    ['no AllRows', { AllRows: null, __B_index: win.mw.__B_index, __B_known: win.mw.__B_known, __B_bitset: win.mw.__B_bitset }],
    ['an unknown symbol in a good projection', { AllRows: win.mw.AllRows, __B_index: win.mw.__B_index, __B_known: win.mw.__B_known, __B_bitset: win.mw.__B_bitset }]
  ];
  for (let i = 0; i < cases.length; i++) {
    const label = cases[i][0];
    const page = Object.assign({}, win.mw, cases[i][1]);
    page.FilterCode = body;
    const r = renderRow(row, page, document);
    check('fail-open: ' + label, r.hidden === false && r.verdict === true,
      'verdict=' + String(r.verdict) + ' hidden=' + r.hidden);
  }
  // an unknown symbol through a good projection
  const good = Object.assign({}, win.mw, { FilterCode: body });
  const r = renderRow({ inscode: 'NOT-A-SYMBOL' }, good, document);
  check('fail-open: a symbol the projection never heard of', r.hidden === false && r.verdict === true,
    'verdict=' + String(r.verdict));
  // a throwing body must still hide the row (the site's own law)
  const thrower = Object.assign({}, win.mw, { FilterCode: 'var FilterResult = true; throw new Error("boom");' });
  const rt = renderRow(row, thrower, document);
  check('a throwing body hides the row (the site is fail-closed on exception)', rt.hidden === true);
}

section('7. the program survives a page reload');
{
  // A reload means a brand-new page object and a brand-new global: the ONLY thing that
  // carries over is the filter code itself, which is the owner's "one paste" requirement.
  const rows2 = makePopulation();
  const win2 = makePage(rows2);
  const render2 = siteRenderer(win2);
  win2.mw.FilterCode = fs.readFileSync(BODY, 'utf8');
  const first = renderAll(win2, render2);
  check('after a reload the first render is again all fail-open', first.hidden === 0, first.hidden + ' hidden');
  win2.__flush();
  const second = renderAll(win2, render2);
  const counts = { keep: 0, hide: 0, failOpen: 0 };
  const wrong = [];
  for (let i = 0; i < second.perRow.length; i++) {
    const cls = classify(win2, second.perRow[i].inscode);
    counts[cls]++;
    if (second.perRow[i].hidden === (cls === 'keep' || cls === 'failOpen') && wrong.length < 5) {
      wrong.push({ inscode: second.perRow[i].inscode, class: cls });
    }
  }
  check('after a reload the program recomputed and judged again',
    counts.keep > 0 && counts.hide > 0 && counts.failOpen > 0, JSON.stringify(counts));
  check('after a reload the verdicts are right', wrong.length === 0, 'wrong=' + wrong.length);
  check('the engine was rebuilt, not leaked from the old page', win2.__TSE_PROGRAM !== win.__TSE_PROGRAM);
}

section('8. UX settings are honoured and changeable without a re-paste');
{
  // every funnel variable must be configurable (owner, G-29). The program reads the
  // settings module's storage on every tick, so a written value must take effect.
  const KEY = win.TseFunnelSettings.STORAGE_KEY;
  // the settings module takes its storage as an ARGUMENT (load(storage, key)); calling
  // load() with no argument silently returns the defaults forever
  const hashOf = () => win.TseFunnelSettings.configHash(
    win.TseFunnelSettings.normalizeSettings(win.TseFunnelSettings.load(win.localStorage).settings).settings);
  const hashBefore = hashOf();
  // a configuration change moves the KEPT/HIDDEN split, not the judged count: whether a
  // row is judged at all is decided by the option parser, before the funnel config runs.
  const hiddenBefore = hiddenCount(win);
  // narrow the IV window hard: the config sweep measured that ivMax 1.0 hides many more
  const written = win.TseFunnelSettings.applyChange(win.TseFunnelSettings.load(win.localStorage).settings, 'ivMax', 1.0);
  win.TseFunnelSettings.save(win.localStorage, null, written.settings);
  check('the settings write landed in storage', win.localStorage.getItem(KEY) !== null);
  win.__flush();
  const hashAfter = hashOf();
  check('the config hash moved, so the engine must re-run', hashAfter !== hashBefore, hashBefore + ' -> ' + hashAfter);
  const hiddenAfter = hiddenCount(win);
  check('the new configuration changed the projection', hiddenAfter !== hiddenBefore,
    'hidden ' + hiddenBefore + ' -> ' + hiddenAfter);
  // and a garbage value must fall back to the default, never to a real alternative
  const garbage = win.TseFunnelSettings.applyChange(win.TseFunnelSettings.load(win.localStorage).settings, 'ivMax', 'not-a-number');
  win.TseFunnelSettings.save(garbage.settings);
  const normGarbage = win.TseFunnelSettings.normalizeSettings(garbage.settings);
  check('a garbage value falls back to the default', normGarbage.settings.ivMax === win.TseFunnelSettings.DEFAULTS.ivMax,
    'ivMax=' + normGarbage.settings.ivMax + ' default=' + win.TseFunnelSettings.DEFAULTS.ivMax);
}

section('9. the site\'s DSL compiler cannot rewrite this body');
{
  // PrepareFilterCode has 61 .replace() rules mapping `(field)` shorthand to row["field"]
  // (E-056). The three recorded ones are applied here; the build refuses any `(siteField)`
  // shape, so none of the other 58 can have a target either.
  const body = fs.readFileSync(BODY, 'utf8');
  const RULES = [/\(l18\)/g, /\(l30\)/g, /\(tno\)/g];
  let changed = false;
  for (let i = 0; i < RULES.length; i++) {
    if (RULES[i].test(body)) { changed = true; RULES[i].lastIndex = 0; }
  }
  check('the recorded shorthand rules have no target in the body', changed === false);
  const SHAPES = /\(([A-Za-z_$][A-Za-z0-9_$]{1,15})\)/g;
  const seen = {};
  let m;
  while ((m = SHAPES.exec(body)) !== null) seen[m[1]] = (seen[m[1]] || 0) + 1;
  const FIELDS = ['inscode', 'InsCode', 'l18', 'l30', 'tno', 'pc', 'pl', 'pd1', 'po1', 'py', 'pd', 'pmd',
    'tvol', 'qd', 'z', 'ytc', 'ct', 'isps', 'bv', 'cs', 'tmin', 'tmax', 'pf', 'pmin', 'pmax',
    'SectorNo', 'Market', 'Flow', 'BaseVol', 'DEven', 'PClosing', 'PDrCotVal', 'ZTotTran', 'QTotTran',
    'Delta', 'Gamma', 'Theta', 'Vega', 'Rho', 'IV', 'KA', 'KAj', 'KAjy', 'ExDate', 'Op', 'Lo', 'Hi',
    'PMeDem', 'EPS', 'PE', 'Week'];
  const collisions = Object.keys(seen).filter((s) => FIELDS.indexOf(s) !== -1);
  check('no `(siteField)` shape anywhere in the body', collisions.length === 0,
    collisions.length ? collisions.join(', ') : Object.keys(seen).length + ' harmless shapes');
}

console.log('\n=== SUMMARY ===');
console.log('  checks=' + checks + ' failures=' + failures);
if (failures === 0) console.log('ALL CHECKS PASSED');
else console.log(failures + ' FAILURES');
process.exit(failures === 0 ? 0 : 1);
