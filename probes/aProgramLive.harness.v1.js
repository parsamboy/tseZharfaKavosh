'use strict';
/*
 * ---------------------------------------------------------------------------
 * THIS IS A NODE HARNESS - it must NOT be pasted into a browser console.
 *   run it with:   node probes/<this file>
 * A browser console has no `require`, no `process` and no filesystem, so pasting
 * this file there fails with `require is not defined`. The file to paste into the
 * page is the matching *.live.v1.js / aProgramLive.v1.js, never a *.harness.v1.js.
 * ---------------------------------------------------------------------------
 */
if (typeof require !== 'function') {
  console.log('STOP: this is a NODE harness. Run it with  node ' +
    (typeof __filename !== 'undefined' ? __filename : 'this file') +
    '  - do not paste it into a browser console. The browser file is the matching *.live.v1.js / aProgramLive.v1.js.');
  throw new Error('node harness pasted into a browser console');
}

/**
 * probes/aProgramLive.harness.v1.js
 *
 * Exercises probes/aProgramLive.v1.js against a FAKE PAGE that behaves like the real
 * site: RenderData evaluates the filter body per row exactly as E-061 recorded it, the
 * DSL compiler PrepareFilterCode is a real function the scenario can make faithful or
 * destructive, and the DOM is built lazily so a createElement that registers nodes cannot
 * fake the opener ladder (the defect the textarea harness hit).
 *
 * The point of this harness is the SAFETY GATE. The probe's first duty is to run the
 * site's own PrepareFilterCode over the whole 51 KB program and refuse to register
 * anything if it rewrites even one byte, because the site is fail-closed on exception and
 * a rewritten body hides EVERY row. A scenario makes PrepareFilterCode destructive and
 * asserts that the probe registers nothing at all.
 *
 * Run: node probes/aProgramLive.harness.v1.js
 *
 * SPDX-License-Identifier: Smart-FFA-1.1
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const BUNDLE = path.join(ROOT, 'src', 'engine', 'tseEngine.browser.v1.js');
// The probe the owner pastes. It lives at the repository root under a name that cannot
// be confused with the two dozen other *.live.v1.js files or with the node harnesses.
const PROBE = path.join(ROOT, 'RUN_ME.js');

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
const LABEL = 'اختيارخ ';

function makePopulation() {
  const rows = {};
  for (let i = 0; i < 20; i++) {
    const k = 'U' + i;
    rows[k] = { inscode: k, l18: k, l30: k, pc: 1500 + i * 40, pl: 1500 + i * 40, pd1: 0, po1: 0, tno: 1000 + i };
  }
  for (let i = 0; i < 156; i++) {
    const und = 'U' + (i % 20), base = 1500 + (i % 20) * 40;
    const band = i % 3, rung = Math.floor(i / 3) % 10, sb = i % 5, np = (i % 7 === 6);
    const K = Math.round(band === 0 ? base * 0.75 : band === 1 ? base * 1.6 : base);
    const price = band === 0 ? LADDER_ITM[rung] : band === 1 ? LADDER_OTM[rung] : LADDER_ATM[rung];
    const w = (sb === 4) ? 0.15 : 0.02;
    rows['O' + i] = {
      inscode: 'O' + i, l18: 'ض' + i, l30: LABEL + und + '-' + K + '-1406/02/01',
      pd1: np ? 0 : Math.round(price * (1 - w) * 1000) / 1000,
      po1: np ? 0 : Math.round(price * (1 + w) * 1000) / 1000,
      pl: np ? 0 : price, tno: np ? 0 : 5
    };
  }
  return rows;
}

// ---------- the fake page ----------
// opts.prepare: 'faithful' | 'destructive'   — what the site's DSL compiler does
// opts.openers: true | false                 — whether any opener produces the textarea
// opts.tickThrows: true | false              — whether the program's background tick fails
function makePage(opts) {
  const o = opts || {};
  const rows = makePopulation();
  const win = {};
  win.window = win;
  win.global = win;
  win.globalThis = win;
  win.location = { host: 'old.tsetmc.com', href: 'https://old.tsetmc.com/Loader.aspx?ParTree=15131F' };
  win.performance = { now: () => Number(process.hrtime.bigint() / 1000n) / 1000 };
  win.console = console;
  win.__timers = [];
  win.setTimeout = function (fn, ms) { win.__timers.push({ fn: fn, ms: ms }); return win.__timers.length; };
  win.clearTimeout = function () {};
  win.requestIdleCallback = function (fn) { win.__timers.push({ fn: fn, ms: 0 }); return win.__timers.length; };
  win.__flush = function (limit) {
    let n = 0;
    const max = limit || 400;
    while (win.__timers.length && n < max) { const t = win.__timers.shift(); t.fn(); n++; }
    return n;
  };
  const store = {};
  win.localStorage = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; }
  };

  // --- the fake DOM. createElement does NOT register a node: in a real document only
  //     appendChild does, and a fake that registers at creation lets the opener ladder
  //     pass without opening anything.
  const nodes = [];
  function El(tag) { this.tagName = String(tag).toUpperCase(); this.id = ''; this.value = '';
    this.textContent = ''; this.className = ''; this._h = {}; }
  El.prototype.getAttribute = function (n) { return this._h[n] !== undefined ? this._h[n] : null; };
  El.prototype.addEventListener = function () {};
  El.prototype.removeEventListener = function () {};
  El.prototype.dispatchEvent = function (ev) {
    (this._h[ev && ev.type] || []).slice().forEach((fn) => fn(ev));
    return true;
  };
  El.prototype.click = function () { (this._h.click || []).slice().forEach((fn) => fn({ type: 'click' })); };
  const doc = {
    _nodes: nodes,
    createElement: (tag) => new El(tag),
    getElementById: (id) => { for (let i = 0; i < nodes.length; i++) if (nodes[i].id === id) return nodes[i]; return null; },
    getElementsByTagName: (tag) => nodes.filter((e) => e.tagName === String(tag).toUpperCase()),
    querySelectorAll: () => nodes.slice(),
    createEvent: () => ({ initEvent: function () {} })
  };
  // the market-watch toolbar: present before any dialog, as on the real page
  const toolbar = doc.createElement('div');
  toolbar.id = 'FilterToolbar';
  toolbar.textContent = 'فیلتر';
  nodes.push(toolbar);

  win.document = doc;

  // the dialog's DOM, created only when an opener runs (as on the real page)
  function buildDialog() {
    if (doc.getElementById('InputFilterCode')) return;
    const ta = doc.createElement('textarea'); ta.id = 'InputFilterCode'; ta.value = ''; nodes.push(ta);
    const nm = doc.createElement('input'); nm.id = 'InputFilterName'; nm.value = ''; nodes.push(nm);
    const save = doc.createElement('button'); save.id = 'BtnSaveFilter'; save.value = 'ثبت'; nodes.push(save);
  }

  const mw = {
    AllRows: rows, RoundNo: 7, FilterCode: '', __modelCalls: 0,
    Settings: { Filters: [{ FilterCode: '/* the owner original filter */' }, { FilterCode: '' }], FilterNo: 0 },
    QueryWindowEditFilter: function () { if (o.openers === false) return; buildDialog(); },
    QueryWindowNewFilter: function () { if (o.openers === false) return; buildDialog(); },
    QueryWindowSaveFilter: function () {
      // E-056/E-073: the UI save writes the slot AND the mirror. A fake that throws only
      // when the dialog is closed leaves mw.FilterCode empty, so the body never runs and
      // the program never boots - the harness would then blame the probe for its own gap.
      if (!doc.getElementById('InputFilterCode')) throw new Error('Cannot read properties of undefined (reading \'replace\')');
      var code = String(doc.getElementById('InputFilterCode').value || '');
      var n = mw.Settings.FilterNo;
      if (mw.Settings.Filters[n]) mw.Settings.Filters[n].FilterCode = code;
      mw.FilterCode = code;
    },
    QueryWindowCheckFilter: function () {},
    SelectFilter: function () {},
    PrepareFilterCode: function (raw) {
      // the site's own DSL compiler (E-056): 61 .replace() rules mapping `(field)`
      // shorthand to row["field"]. The three recorded ones are implemented here; the
      // destructive scenario adds a fourth that DOES have a target in our body.
      let s = String(raw);
      s = s.replace(/\(l18\)/g, 'row["l18"]');
      s = s.replace(/\(l30\)/g, 'row["l30"]');
      s = s.replace(/\(tno\)/g, 'row["tno"]');
      if (o.prepare === 'destructive') s = s.replace(/\(row\)/g, 'row["row"]');
      return s;
    },
    SaveParams: function () {}
  };
  win.mw = mw;
  vm.createContext(win);
  vm.runInContext(fs.readFileSync(BUNDLE, 'utf8'), win, { filename: 'bundle.js' });
  // THE SITE'S OWN CALL SITE (E-061, verbatim), built INSIDE the page context.
  //
  // This is the fix for the defect that made the first version of this harness report
  // `program-did-not-boot` on a working probe: RenderData was defined in the NODE realm,
  // so `eval(code)` ran in the node realm too. The body then resolved `window` to node's
  // globalThis, cached the program there, and armed a REAL node setTimeout - so the page
  // object never saw __TSE_PROGRAM, no timer ever reached the fake queue, and the probe
  // correctly concluded the program had not booted. The harness was wrong, not the probe.
  //
  // A direct eval inherits the CALLING function's scope. Defining the site's own function
  // inside the page context is what makes `window`, `mw` and `row` resolve the way they do
  // on the real page - and it is the only reason the completion value of the body is the
  // verdict rather than a node-realm artefact.
  mw.RenderData = vm.runInContext('(function () {' +
    '  return function RenderData() {' +
    '    var code = String(mw.FilterCode || "");' +
    '    mw.__renderedRows = 0; mw.__hiddenRows = 0; mw.__threwRows = 0; mw.__firstError = null;' +
    '    if (code.length === 0) return;' +
    '    for (var key in mw.AllRows) {' +
    '      var row = mw.AllRows[key];' +
    '      mw.__renderedRows++;' +
    '      var FilterResult;' +
    '      try { FilterResult = eval(code); }' +
    '      catch (e) { FilterResult = false; mw.__threwRows++; if (!mw.__firstError) mw.__firstError = String((e && e.message) || e); }' +
    '      if (!FilterResult) mw.__hiddenRows++;' +
    '    }' +
    '  };' +
    '})()', win, { filename: 'siteRenderData.js' });
  return win;
}

// The probe is a chain of setTimeout phases. The default budget drains the phases a healthy
// run needs; a scenario that ends in a timeout (no textarea, no boot) legitimately takes
// longer, because the opener ladder now waits for the market-watch toolbar and retries
// before it concludes the page has no filter editor.
function runProbe(win, budget) {
  let json = null, lines = [];
  const origLog = console.log;
  console.log = function () {
    const a = Array.prototype.slice.call(arguments);
    const s = a.map(String).join(' ');
    lines.push(s);
    const i = s.indexOf('PROBE_JSON ');
    if (i !== -1) { try { json = JSON.parse(s.slice(i + 'PROBE_JSON '.length)); } catch (e) {} }
  };
  try {
    vm.runInContext(fs.readFileSync(PROBE, 'utf8'), win, { filename: 'probe.js' });
    // the probe is a chain of setTimeout phases: drain them all
    win.__flush(budget || 2000);
  } finally { console.log = origLog; }
  return { json: json, lines: lines };
}

// ==========================================================================
section('0. the generated probe exists and carries the real program');
{
  check('the generated probe exists', fs.existsSync(PROBE));
  const src = fs.readFileSync(PROBE, 'utf8');
  check('the probe is one paste of a plausible size', src.length > 70000 && src.length < 200000, src.length + ' bytes');
  check('the probe embeds the whole program', src.indexOf('__TSE_PROGRAM') !== -1 && src.indexOf('TseBEngine') !== -1);
  check('the probe still has the safety gate first', /PHASE 0 — THE SAFETY GATE/.test(src));
}

// ==========================================================================
section('A. the happy path: gate passes, program boots, verdicts agree');
{
  const win = makePage({ prepare: 'faithful', openers: true });
  const before = { slot0: win.mw.Settings.Filters[0].FilterCode, mirror: win.mw.FilterCode };
  const r = runProbe(win);
  const j = r.json;
  check('the probe emitted PROBE_JSON', !!j, j ? j.status : 'no json');
  if (!j) { console.log(r.lines.slice(0, 5).join('\n')); }
  else {
    check('the safety gate ran and passed', j.gate.ran === true && j.gate.identical === true,
      'in=' + j.gate.inputBytes + ' out=' + j.gate.outputBytes + ' firstDiffAt=' + j.gate.firstDiffAt);
    check('the dialog was opened through the UI ladder', j.dialog.opened === true, j.dialog.by);
    check('the textarea received the whole program', j.textarea.readBackLen === j.gate.inputBytes,
      j.textarea.readBackLen + ' of ' + j.gate.inputBytes);
    check('the page did not rewrite the code in the textarea', j.textarea.pageRewroteIt === false);
    check('the UI save delivered the program to a slot', j.save.anySlotHoldsGenerated === true);
    check('the mirror is byte-identical to the program', j.identity.mirrorEqualsGenerated === true);
    var st = j.boot.schedState || {};
    check('the program booted through its own tick', j.boot.timedOut !== true && st.runs >= 1,
      'ticks=' + st.ticks + ' runs=' + st.runs + ' lastError=' + st.lastError + ' schedState=' + (j.boot.schedState ? 'present' : 'NULL'));
    check('the tick recorded no error', st.lastError === null || st.lastError === undefined, String(st.lastError));
    check('the program installed its modules on the page',
      !!(j.boot.engineOnPage && j.boot.engineOnPage.engine === true && j.boot.engineOnPage.lookup === true),
      j.boot.engineOnPage ? JSON.stringify(j.boot.engineOnPage) : 'engineOnPage is UNDEFINED (the boot phase timed out)');
    // diagnostics while the harness is still being brought up
    console.log('       save   = ' + JSON.stringify(j.save));
    console.log('       textarea = ' + JSON.stringify(j.textarea));
    console.log('       page   = rendered=' + win.mw.__renderedRows + ' threw=' + win.mw.__threwRows +
      ' hidden=' + win.mw.__hiddenRows + ' firstError=' + win.mw.__firstError);
    console.log('       pageState = program=' + (typeof win.__TSE_PROGRAM) + ' sched=' + (typeof win.__TSE_SCHED) +
      ' timers=' + win.__timers.length + ' mirrorLen=' + String(win.mw.FilterCode || '').length);
    check('the program read rows on the page', j.execute.distinctCount > 0, j.execute.distinctCount + ' distinct');
    check('the verdict histogram is not vacuous',
      j.execute.verdicts.keep > 0 && j.execute.verdicts.failOpen > 0, JSON.stringify(j.execute.verdicts));
    check('the per-row cost was measured', typeof j.execute.perRowUs === 'number', j.execute.perRowUs + ' us/row');
    check('the cross-check ran and agrees on the visibility decision',
      j.crossCheck.ran === true && j.crossCheck.disagree === 0,
      'agree=' + j.crossCheck.agree + ' disagree=' + j.crossCheck.disagree + ' of ' + j.crossCheck.compared + ' (failOpen=' + j.crossCheck.bodyFailOpen + ')');
    check('the cross-check is not vacuous (fail-open rows really were compared)',
      j.crossCheck.bodyFailOpen > 0 && j.crossCheck.compared > j.crossCheck.bodyFailOpen,
      'failOpen=' + j.crossCheck.bodyFailOpen + ' of ' + j.crossCheck.compared);
    check('the status is program-verified-live', j.status === 'program-verified-live', j.status);
    check('the rollback restored the owner slot', j.rollback.slotRestored === true);
    check('the rollback restored the mirror', j.rollback.mirrorRestored === true);
    check('the rollback removed the program page state', j.rollback.restore.programStateRemoved === true);
    check('the owner original code is back in the slot',
      win.mw.Settings.Filters[0].FilterCode === before.slot0 && win.mw.FilterCode === before.mirror);
    check('the textarea was emptied (this probe opened the dialog)',
      String(win.document.getElementById('InputFilterCode').value || '') === '');
    check('no probe errors', j.errors.length === 0, j.errors.join('; '));
  }
}

// ==========================================================================
section('B. THE SAFETY GATE: a destructive PrepareFilterCode must stop the probe');
{
  const win = makePage({ prepare: 'destructive', openers: true });
  const before = { slot0: win.mw.Settings.Filters[0].FilterCode, mirror: win.mw.FilterCode };
  const r = runProbe(win);
  const j = r.json;
  check('the probe emitted PROBE_JSON', !!j);
  if (j) {
    check('the gate detected the rewrite', j.gate.ran === true && j.gate.identical === false,
      'in=' + j.gate.inputBytes + ' out=' + j.gate.outputBytes);
    check('the gate reported where the first difference is', typeof j.gate.firstDiffAt === 'number' && j.gate.firstDiffAt >= 0,
      'firstDiffAt=' + j.gate.firstDiffAt);
    check('the status is prepare-filter-code-changed', j.status === 'prepare-filter-code-changed', j.status);
    check('NOTHING was registered: no slot holds the program', j.save === undefined || !j.save.anySlotHoldsGenerated);
    check('the owner slot is untouched', win.mw.Settings.Filters[0].FilterCode === before.slot0);
    check('the mirror is untouched', win.mw.FilterCode === before.mirror);
    check('the textarea was never written', win.document.getElementById('InputFilterCode') === null ||
      String(win.document.getElementById('InputFilterCode').value || '') === '');
    check('the program was never booted', win.__TSE_PROGRAM === undefined);
    check('the verdict explains the fail-closed danger', /fail-closed|HIDES EVERY ROW|hides every row/i.test(j.verdict));
  }
}

// ==========================================================================
section('C. no opener produces the textarea: the probe must not change anything');
{
  const win = makePage({ prepare: 'faithful', openers: false });
  const before = { slot0: win.mw.Settings.Filters[0].FilterCode, mirror: win.mw.FilterCode };
  const r = runProbe(win, 9000);
  const j = r.json;
  check('the probe emitted PROBE_JSON', !!j);
  if (j) {
    check('the gate passed first (the order is right)', j.gate.identical === true);
    check('the status is textarea-unavailable', j.status === 'textarea-unavailable', j.status);
    check('no dialog was opened', j.dialog.opened === false, JSON.stringify(j.dialog.attempts && j.dialog.attempts.map((a) => a.name)));
    check('the owner slot is untouched', win.mw.Settings.Filters[0].FilterCode === before.slot0);
    check('the mirror is untouched', win.mw.FilterCode === before.mirror);
    // out.save is initialised to {} in the probe, so "nothing was registered" cannot be
    // tested by its absence - it must be tested by its content. The first version of this
    // check read `j.save === undefined` and failed on a probe that had correctly stopped.
    check('nothing was registered', !j.save || !j.save.anySlotHoldsGenerated,
      'slotsHoldingCode=' + JSON.stringify((j.save && j.save.slotsHoldingCode) || null));
    check('the program was never booted', win.__TSE_PROGRAM === undefined);
  }
}

// ==========================================================================
section('D. the program registers but its tick never publishes');
{
  const win = makePage({ prepare: 'faithful', openers: true });
  // The first version of this scenario wrapped win.TseBEngine.createBEngine to throw. It
  // changed nothing, because the program installs its OWN module instances on first run
  // and replaces the ones the harness wrapped - so the program booted normally and the
  // scenario asserted against a passing run. Break the program's own background tick
  // instead: drop the setTimeout whose delay is the program's TICK_MS (read out of the
  // built program so it cannot drift), so the tick never fires and nothing is published.
  const programSrc = fs.readFileSync(path.join(ROOT, 'build', 'filterProgram.v1.js'), 'utf8');
  const tickMs = (programSrc.match(/setTimeout\(tick,\s*(\d+)\)/) || [])[1];
  const realSetTimeout = win.setTimeout;
  win.setTimeout = function (fn, ms) {
    if (String(ms) === String(tickMs)) return 0;      // the program's tick: never fires
    return realSetTimeout(fn, ms);
  };
  const before = { slot0: win.mw.Settings.Filters[0].FilterCode, mirror: win.mw.FilterCode };
  const r = runProbe(win);
  const j = r.json;
  check('the probe emitted PROBE_JSON', !!j);
  if (j) {
    check('the gate passed', j.gate.identical === true);
    check('the program was registered through the textarea', j.identity && j.identity.mirrorEqualsGenerated === true);
    check('the status is program-did-not-boot', j.status === 'program-did-not-boot', j.status);
    check('the boot phase timed out rather than pretending success', j.boot.timedOut === true,
      'timedOut=' + j.boot.timedOut + ' waitedMs=' + j.boot.waitedMs);
    check('no tick error was invented (the tick simply never ran)',
      j.boot.schedState === null || j.boot.schedState.lastError === null || j.boot.schedState.lastError === undefined,
      String(j.boot.schedState && j.boot.schedState.lastError));
    check('the rollback still ran and restored the slot', j.rollback.slotRestored === true);
    check('the rollback still restored the mirror', j.rollback.mirrorRestored === true);
    check('the owner original code is back', win.mw.Settings.Filters[0].FilterCode === before.slot0 && win.mw.FilterCode === before.mirror);
    check('the program page state was removed', win.__TSE_PROGRAM === undefined && win.__TSE_SCHED === undefined);
  }
}

// ==========================================================================
section('E. the site is fail-closed: a throwing body hides every row');
{
  // This asserts the property the whole safety gate exists to protect. A body that
  // throws must produce hidden === rendered, and the probe's verdict must say so rather
  // than reporting a clean run.
  const win = makePage({ prepare: 'faithful', openers: true });
  const code = 'var FilterResult = true; throw new Error("boom");';
  win.mw.FilterCode = code;
  win.mw.RenderData();
  check('a throwing body hides every rendered row',
    win.mw.__hiddenRows === win.mw.__renderedRows && win.mw.__renderedRows > 0,
    'hidden=' + win.mw.__hiddenRows + ' of ' + win.mw.__renderedRows);
  // and the program body itself must NOT be such a body: it must return true everywhere
  // when nothing is published
  const program = fs.readFileSync(path.join(ROOT, 'build', 'filterProgram.v1.js'), 'utf8');
  win.mw.FilterCode = program;
  win.mw.RenderData();
  check('the real program hides NOTHING before its first tick',
    win.mw.__hiddenRows === 0 && win.mw.__threwRows === 0,
    'hidden=' + win.mw.__hiddenRows + ' threw=' + win.mw.__threwRows + ' of ' + win.mw.__renderedRows);
}

console.log('\n=== SUMMARY ===');
console.log('  checks=' + checks + ' failures=' + failures);
if (failures === 0) console.log('ALL CHECKS PASSED');
else console.log(failures + ' FAILURES');
process.exit(failures === 0 ? 0 : 1);
