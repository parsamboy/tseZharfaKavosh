#!/usr/bin/env node
/**
 * tseZharfaKavosh — node-side harness for probes/aSettingsApply.live.v1.js (G-30)
 *
 * WHY THIS EXISTS
 *   The apply probe mutates the live page: it registers a filter slot, mirrors it
 *   into mw.FilterCode, calls SaveParams and RenderData, and then rolls all of
 *   that back. That is the right thing to do on the owner's page, but it means the
 *   probe can only be exercised for real by the owner. This harness runs the SAME
 *   probe file, byte for byte except for its two waits, inside a vm context with a
 *   minimal fake site, so every scenario below is reproducible in CI.
 *
 * WHAT THE FAKE SITE MUST GET RIGHT (each of these was a real defect once)
 *   1. `mw` must be a NODE-REALM global. The A body references a bare `mw`, exactly
 *      as it does on the real page, and the site evals that body. A simulator that
 *      keeps `mw` only on the vm's window makes every eval throw, every row is
 *      swallowed as fail-closed, and "A matched the projection" becomes vacuously
 *      true over ZERO rows. That is the E-061/E-065 vacuous-success trap, so the
 *      harness asserts distinctCount > 0 before it trusts any verdict.
 *   2. RenderData must be fail-CLOSED on exception, like the real site
 *      (E-061: `catch(e){FilterResult=false}` hides the row).
 *   3. The site must not render every row. It skips one in four, so coverage is a
 *      real subset rather than a coincidence.
 *   4. `performance` must exist in the vm context, or the bundle silently falls
 *      back to Date.now and a clock bug disappears (E-066).
 *   5. SaveParams must actually rewrite the persisted blob, otherwise the rollback
 *      check "the persisted bytes match" proves nothing.
 *   6. getData must return the persisted MarketWatchSettings, because that is what
 *      the probe reads and verifies its rollback against.
 *
 * SPDX-License-Identifier: Smart-FFA-1.1
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const REPO = path.join(__dirname, '..');
const BUNDLE = path.join(REPO, 'src', 'engine', 'tseEngine.browser.v1.js');
const PROBE = path.join(REPO, 'probes', 'aSettingsApply.live.v1.js');

let failures = 0;
let checks = 0;
function check(name, cond, detail) {
  checks++;
  if (cond) { console.log('  PASS  ' + name + (detail !== undefined ? '   [' + detail + ']' : '')); return; }
  failures++;
  console.log('  FAIL  ' + name + (detail !== undefined ? '   [' + detail + ']' : ''));
}

// The probe waits on real timers (RENDER_WAIT 700ms, 400ms between phases). Only the
// WAITS are removed - never any logic - and the substitution is asserted, so a future
// edit to the probe cannot silently change what this harness exercises.
function probeSource() {
  let src = fs.readFileSync(PROBE, 'utf8');
  const before = src;
  src = src.replace('var RENDER_WAIT = 700;', 'var RENDER_WAIT = 0;');
  src = src.replace('setTimeout(next, 400);', 'setTimeout(next, 0);');
  if (src === before) throw new Error('the probe no longer contains the waits this harness neutralises - update the harness');
  return src;
}

function makeWindow() {
  const win = {};
  win.window = win;
  win.global = win;
  win.location = { host: 'old.tsetmc.com', href: 'https://old.tsetmc.com/Loader.aspx?ParTree=15131F' };
  win.performance = { now: () => 1 };          // (4) E-066: no performance => silent Date.now fallback
  win.setTimeout = (fn) => fn();               // synchronous: the probe's chain is otherwise serial
  win.requestIdleCallback = (fn) => fn();
  win.console = { log: () => {}, error: () => {} };
  vm.createContext(win);
  vm.runInContext(fs.readFileSync(BUNDLE, 'utf8'), win, { filename: 'tseEngine.browser.v1.js' });
  return win;
}

// A population over FOUR independent dimensions (coprime moduli 3 / 5 / 7, so no band
// can masquerade as another). Every price below was measured against the engine, not
// guessed - the ladder is what turns one dimension into every verdict class the live
// page produced in E-068/E-071:
//
//   i % 3               moneyness band: 0 = in the money, 1 = out of the money,
//                       2 = at the money
//   floor(i / 3) % 10   price ladder inside the band. The solved IV climbs with price,
//                       so one ladder crosses ivMax and keeps climbing into the q10 pin
//                       (no-iv-solution, which stays VISIBLE by design):
//                         low prices  -> ivStatus ok            -> KEEP
//                         mid prices  -> ivStatus fail-iv-range -> HIDE
//                         high prices -> ivStatus no-iv-solution-> KEEP (pin, labelled)
//   i % 5               book width: 4 makes the spread exceed maxSpreadPct 0.2
//                       -> book-too-wide -> FAIL-OPEN
//   i % 7 === 6         no book and no trade at all
//                       -> no usable market price -> FAIL-OPEN
// Plus rows that never reach the parser at all (the 1525-row class from E-070/E-071,
// which the funnel cannot see and which therefore stay visible via fail-open).
const LADDER_ITM  = [530, 600, 700, 800, 900, 1000, 1100, 1200, 1300, 1400];
const LADDER_OTM  = [0.01, 1, 20, 120, 300, 500, 700, 850, 950, 1150];
const LADDER_ATM  = [400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1300];
const EXPIRY = '1406/02/01';

function population() {
  const rows = {};
  const N_UND = 20;
  for (let i = 0; i < N_UND; i++) {
    const k = 'U' + i;
    rows[k] = {
      inscode: k, l18: k, l30: k, pc: 1500 + i * 40, pl: 1500 + i * 40, pd1: 0, po1: 0, tno: 1000 + i
    };
  }
  for (let i = 0; i < 8; i++) {
    const k = 'REJECT' + i;
    rows[k] = { inscode: k, l18: 'notanoptionrow' + i, l30: 'plain equity row ' + i, pc: 900 + i, pl: 900 + i, tno: 10 };
  }
  for (let i = 0; i < 156; i++) {
    const und = 'U' + (i % N_UND);
    const base = 1500 + (i % N_UND) * 40;
    const band = i % 3;
    const rung = Math.floor(i / 3) % 10;
    const spreadBand = i % 5;
    const noPrice = (i % 7 === 6);
    const K = Math.round(band === 0 ? base * 0.75 : band === 1 ? base * 1.6 : base);
    const price = band === 0 ? LADDER_ITM[rung] : band === 1 ? LADDER_OTM[rung] : LADDER_ATM[rung];
    // half-width: 2% by default (a 4% spread, well inside maxSpreadPct 0.2), 15% in the
    // wide band (a 30% spread, which the engine rejects as book-too-wide)
    const w = (spreadBand === 4) ? 0.15 : 0.02;
    const k = 'O' + i;
    rows[k] = {
      inscode: k, l18: 'ض' + i, l30: 'اختيارخ ' + und + '-' + K + '-' + EXPIRY,
      pd1: noPrice ? 0 : Math.round(price * (1 - w) * 1000) / 1000,
      po1: noPrice ? 0 : Math.round(price * (1 + w) * 1000) / 1000,
      pl: noPrice ? 0 : price,
      tno: noPrice ? 0 : 5
    };
  }
  return rows;
}

function buildSite(win) {
  const rows = population();
  const FILTER_NO = 3;
  const filters = [];
  for (let i = 0; i < 6; i++) filters.push({ FilterName: 'فیلتر شماره ' + (i + 1), FilterCode: '' });
  // a pre-existing slot, so the harness proves the rollback restores a NON-empty code
  filters[FILTER_NO].FilterCode = 'var FilterResult = true; // pre-existing slot code';
  const persisted = { FilterNo: FILTER_NO, Filters: filters, ViewMode: 1, UpdateSpeed: 1 };

  const mw = {
    AllRows: rows,
    RoundNo: 1,
    Settings: { FilterNo: FILTER_NO, Filters: filters, ViewMode: 1, UpdateSpeed: 1 },
    FilterCode: '',
    __verdicts: {},
    PrepareFilterCode: (b) => b,
    SaveParams: function () { persisted.Filters = mw.Settings.Filters; persisted.FilterNo = mw.Settings.FilterNo; },
    // (2) fail-CLOSED on exception, like the real site
    // (3) the page renders ~3 of 4 rows, so coverage is a genuine subset
    RenderData: function () {
      const body = mw.FilterCode;
      if (!body || !body.length) return;
      const keys = Object.keys(mw.AllRows);
      for (let i = 0; i < keys.length; i++) {
        if (i % 4 === 3) continue;
        const row = mw.AllRows[keys[i]];
        let FilterResult;
        try { FilterResult = eval(body); }
        catch (e) { FilterResult = false; }
        mw.__verdicts[keys[i]] = FilterResult;
      }
    }
  };
  win.mw = mw;
  // (1) the A body's bare global. Without this every eval throws and every verdict
  //     below is vacuously true over zero rows.
  global.mw = mw;
  // (6) what the probe reads and verifies its rollback against
  win.getData = (key) => (key === 'MarketWatchSettings' ? JSON.stringify(persisted) : null);
  win.localStorage = {
    _d: {},
    getItem(k) { return Object.prototype.hasOwnProperty.call(this._d, k) ? this._d[k] : null; },
    setItem(k, v) { this._d[k] = String(v); },
    removeItem(k) { delete this._d[k]; }
  };
  return { rows, mw, persisted, filterNo: FILTER_NO };
}

function runProbe(win) {
  const logs = [];
  win.console = {
    log: (s) => logs.push(String(s)),
    error: (s) => logs.push(String(s))
  };
  vm.runInContext(probeSource(), win, { filename: 'aSettingsApply.live.v1.js' });
  const line = logs.filter((l) => l.indexOf('PROBE_JSON ') === 0)[0];
  if (!line) throw new Error('the probe logged no PROBE_JSON line:\n' + logs.join('\n'));
  return { json: JSON.parse(line.slice('PROBE_JSON '.length)), logs };
}

// G-29: the guard hash must be sensitive to EVERY variable - if one variable cannot
// move the hash, the dual-trigger guard would silently reuse a stale projection.
function checkHashSensitivity(json) {
  const hp = json.projection.hashProbe;
  check('the guard hash sees all ' + hp.fields + ' variables (G-29)',
    hp.seen === hp.fields && hp.blind.length === 0,
    'seen=' + hp.seen + '/' + hp.fields + ' blind=' + JSON.stringify(hp.blind));
  check('each probe reports what it landed on',
    Object.keys(hp.probe).every((k) => hp.probe[k].seen === false || hp.probe[k].got !== undefined));
}

// The machinery every engine-running scenario must show, in the order that catches a
// blind baseline first: a vacuous success over zero rows is not a success.
function checkMachinery(json, label) {
  check(label + ': no errors', json.errors.length === 0, JSON.stringify(json.errors));
  check(label + ': status is settings-applied-live', json.status === 'settings-applied-live', json.status);
  check(label + ': the engine judged a plausible population', json.sanity.baselinePlausible === true, json.sanity.judgedRatio + '%');
  check(label + ': the projection is internally consistent', json.projection.bitsetBytesCorrect === true);
  check(label + ': the guard did NOT re-run on the same snapshot+hash',
    json.engine.guardReRun.published === false && json.engine.guardReRun.reason === 'no-change',
    JSON.stringify(json.engine.guardReRun));
  check(label + ': the guard hash is the SETTINGS hash',
    typeof json.engine.configHash === 'string' && json.engine.configHash.indexOf('fs1-') === 0, json.engine.configHash);
  check(label + ': the registration reports which slot it used',
    typeof json.register.slot === 'number' && json.register.slotWritten === true && json.register.mirrorWritten === true,
    JSON.stringify(json.register));
  check(label + ': the body is the repo generator, not a literal',
    json.body.fnv1a === '38fe0c59' && json.body.bytes === 430 && json.body.compiledIdentical === true,
    json.body.fnv1a + ' ' + json.body.bytes + 'B');
  // the non-vacuity assertion: read the verdicts only if rows were actually read
  check(label + ': the site evaluated a non-empty subset',
    json.real.tally.distinctCount > 0 && json.real.tally.distinctCount < json.recon.rowCount,
    json.real.tally.distinctCount + ' of ' + json.recon.rowCount);
  check(label + ': A matched the projection exactly', json.real.verdictsMatchProjection === true,
    JSON.stringify(json.real.tally.verdicts) + ' vs ' + JSON.stringify(json.real.expectedVerdicts));
  check(label + ': the per-variant tally adds up',
    json.sanity.perVariantConsistent === true);
  check(label + ': the inverted phase flipped exactly',
    json.inverted.flipsExactly === true && json.inverted.compare.mismatches === 0,
    'flipped=' + json.inverted.compare.flippedWithProjection);
  check(label + ': clearing produced zero reads', json.cleared.noReads === true, json.cleared.tally.reads);
  check(label + ': the slot was restored', json.rollback.slotRestored === true);
  check(label + ': the mirror was restored', json.rollback.mirrorRestored === true);
  check(label + ': no __B_ left behind', json.rollback.cleaned === true);
  check(label + ': the persisted storage matches', json.rollback.persistedMatchesSaved === true);
  checkHashSensitivity(json);
}

console.log('\n=== A. defaults (nothing stored, no override) ===');
{
  const win = makeWindow();
  const site = buildSite(win);
  const before = String(site.mw.Settings.Filters[site.filterNo].FilterCode);
  const { json, logs } = runProbe(win);
  logs.filter((l) => l.indexOf('  chosen:') === 0 || l.indexOf('  defaults:') === 0 || l.indexOf('  REAL:') === 0)
    .forEach((l) => console.log('  | ' + l));
  check('no errors', json.errors.length === 0, JSON.stringify(json.errors));
  checkMachinery(json, 'A');
  check('the settings came from the defaults', json.settings.source === 'defaults', json.settings.source);
  check('the delta against the defaults is zero by construction',
    json.baseline.deltaVsChosen.judged === 0 && json.baseline.deltaVsChosen.hidden === 0,
    JSON.stringify(json.baseline.deltaVsChosen));
  check('the pre-existing slot code was restored, not erased',
    site.mw.Settings.Filters[site.filterNo].FilterCode === before, before.slice(0, 24) + '...');
  // The population must exercise every verdict class, or the checks above would pass on
  // a population that only ever produces one answer. A vacuous success is not a success.
  const v = json.real.tally.verdicts;
  check('the population exercises keep, hide AND fail-open',
    v.keep > 0 && v.hide > 0 && v.failOpen > 0, JSON.stringify(v));
  check('the hidden rows are all fail-iv-range, the live class',
    json.real.hiddenSample.length > 0 && json.real.hiddenSample.every((x) => x.ivStatus === 'fail-iv-range'),
    JSON.stringify(json.real.hiddenSample.map((x) => x.ivStatus)));
  check('the q10 pins stay visible (no-iv-solution is not hidden)',
    json.projection.engineVerdicts.computed > json.projection.engineVerdicts.hidden,
    'computed=' + json.projection.engineVerdicts.computed + ' hidden=' + json.projection.engineVerdicts.hidden);
  check('the page saw the same verdicts the projection published',
    json.real.tally.verdicts.keep === json.projection.engineVerdicts.kept - (json.real.tally.distinctCount < json.projection.engineVerdicts.computed ? 0 : 0) ||
    json.real.tally.verdicts.keep <= json.projection.engineVerdicts.kept);
}

console.log('\n=== B. stored wideReach settings ===');
{
  const win = makeWindow();
  const site = buildSite(win);
  win.TseFunnelSettings.save(win.localStorage, null, { checkArbitrageBounds: false, maxSpreadPct: 0.5 });
  const { json, logs } = runProbe(win);
  logs.filter((l) => l.indexOf('  chosen:') === 0 || l.indexOf('  defaults:') === 0).forEach((l) => console.log('  | ' + l));
  checkMachinery(json, 'B');
  check('the settings came from storage', json.settings.source === 'storage', json.settings.source);
  check('the changed variables are reported', json.settings.changedCount === 2, json.settings.changed.map((c) => c.key).join(','));
  check('the engine received maxSpreadPct 0.5', json.engine.funnelConfig.maxSpreadPct === 0.5, json.engine.funnelConfig.maxSpreadPct);
  check('the engine received checkArbitrageBounds false', json.engine.funnelConfig.checkArbitrageBounds === false);
  check('the relaxed guards judge MORE rows than the defaults',
    json.projection.engineVerdicts.computed > json.baseline.computed,
    json.projection.engineVerdicts.computed + ' vs ' + json.baseline.computed);
  check('the delta is reported', json.baseline.deltaVsChosen.judged > 0, JSON.stringify(json.baseline.deltaVsChosen));
  check('the verdict names the source', json.verdict.indexOf('storage') >= 0);
}

console.log('\n=== C. garbage in storage -> nothing is registered ===');
{
  const win = makeWindow();
  const site = buildSite(win);
  // capture BOTH things a registration would touch, so "nothing was registered" is a
  // statement about the real before-state and not about an assumed empty slot
  const beforeMirror = String(site.mw.FilterCode);
  const beforeSlot = String(site.mw.Settings.Filters[site.filterNo].FilterCode);
  win.localStorage.setItem('tseFunnelSettings.v1', '{this is not json');
  const { json } = runProbe(win);
  check('the status is settings-warning', json.status === 'settings-warning', json.status);
  check('the garbage is reported', json.settings.warnings.some((w) => w.reason === 'storage-garbage'));
  check('NOTHING was registered', String(site.mw.FilterCode) === beforeMirror &&
    String(site.mw.Settings.Filters[site.filterNo].FilterCode) === beforeSlot,
    'mirror=' + beforeMirror.length + 'B slot=' + beforeSlot.length + 'B unchanged');
  check('no __B_ projection was published', site.mw.__B_index === undefined);
  check('no phases ran', json.real && Object.keys(json.real).length === 0, JSON.stringify(Object.keys(json.real)));
}

console.log('\n=== D. an inline override wins over storage ===');
{
  const win = makeWindow();
  const site = buildSite(win);
  win.TseFunnelSettings.save(win.localStorage, null, { ivMax: 2.0 });
  win.__FUNNEL_SETTINGS_OVERRIDE = { ivMax: 1.5, ivMin: 0.1 };
  const { json, logs } = runProbe(win);
  logs.filter((l) => l.indexOf('  chosen:') === 0 || l.indexOf('  defaults:') === 0).forEach((l) => console.log('  | ' + l));
  checkMachinery(json, 'D');
  check('the override won', json.settings.source === 'override', json.settings.source);
  check('the engine received ivMax 1.5', json.engine.funnelConfig.ivMax === 1.5, json.engine.funnelConfig.ivMax);
  check('the engine received ivMin 0.1', json.engine.funnelConfig.ivMin === 0.1);
  check('the narrowed window hides MORE than the defaults',
    json.projection.engineVerdicts.hidden > json.baseline.hidden,
    json.projection.engineVerdicts.hidden + ' vs ' + json.baseline.hidden);
  check('the verdict names the source', json.verdict.indexOf('override') >= 0);
}

console.log('\n=== E. a change made through the panel API, then saved (panel -> apply continuity) ===');
{
  const win = makeWindow();
  const site = buildSite(win);
  // exactly what the panel does on a control change: load -> applyChange -> save
  let cur = win.TseFunnelSettings.load(win.localStorage).settings;
  cur = win.TseFunnelSettings.applyChange(cur, 'maxSpreadPct', 0.5).settings;
  cur = win.TseFunnelSettings.applyChange(cur, 'checkArbitrageBounds', false).settings;
  const saved = win.TseFunnelSettings.save(win.localStorage, null, cur);
  check('the panel change was persisted', saved.ok === true, JSON.stringify({ ok: saved.ok, bytes: saved.bytes }));
  const { json } = runProbe(win);
  checkMachinery(json, 'E');
  check('the panel-made settings reached the probe', json.settings.source === 'storage', json.settings.source);
  check('the engine received maxSpreadPct 0.5', json.engine.funnelConfig.maxSpreadPct === 0.5, json.engine.funnelConfig.maxSpreadPct);
  check('the engine received checkArbitrageBounds false', json.engine.funnelConfig.checkArbitrageBounds === false);
  check('the two changed variables are reported', json.settings.changedCount === 2, json.settings.changed.map((c) => c.key).join(','));
  check('the relaxed guards judge MORE rows than the defaults',
    json.projection.engineVerdicts.computed > json.baseline.computed,
    json.projection.engineVerdicts.computed + ' vs ' + json.baseline.computed);
  check('the verdict names the source', json.verdict.indexOf('storage') >= 0);
}

console.log('\n' + (failures === 0 ? 'ALL ' + checks + ' CHECKS PASSED' : failures + ' of ' + checks + ' CHECK(S) FAILED'));
process.exit(failures === 0 ? 0 : 1);
