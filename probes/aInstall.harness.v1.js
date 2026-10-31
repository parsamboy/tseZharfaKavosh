/**
 * probes/aInstall.harness.v1.js — node-side harness for INSTALL_ME.js
 *
 * WHY THIS HARNESS IS NOT OPTIONAL
 *   RUN_ME.js measures and then restores everything, so a defect in it costs a bad reading.
 *   INSTALL_ME.js does the opposite: it registers the program in the owner's filter slot and
 *   mirror and LEAVES IT THERE, because the registration is the product. A defect in it
 *   therefore costs the owner a live filter they did not choose, on a page whose failure mode
 *   is fail-CLOSED (E-061: an exception in the body hides the row). So the installer is tested
 *   against the same fake page the probe was, with one extra family of checks: that it really
 *   does not undo anything, and that it really does not disarm the tick.
 *
 * THE FAKE PAGE IS THE SAME SHAPE AS THE ONE THAT CAUGHT FOUR DEFECTS IN THE PROBE
 *   - createElement does NOT register a node: only the dialog's construction pushes nodes, so
 *     an opener ladder cannot pass without opening anything.
 *   - the site's RenderData is built INSIDE the page context with vm.runInContext, so the
 *     body's eval sees the page's window. Defining it in the node realm made the program cache
 *     on node's globalThis and arm a real node timer, which is how the probe harness spent an
 *     afternoon.
 *   - PrepareFilterCode has a faithful and a destructive variant, and the destructive one is
 *     what proves the safety gate.
 *
 * SPDX-License-Identifier: Smart-FFA-1.1
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const ROOT = path.join(__dirname, '..');
const INSTALLER = path.join(ROOT, 'INSTALL_ME.js');
const PROGRAM = path.join(ROOT, 'build', 'filterProgram.v1.js');
const LIVE_VERIFIED_FNV1A = '036ebf14';

let checks = 0, failures = 0;
function check(name, ok, detail) {
  checks++;
  if (ok) { console.log('  PASS  ' + name + (detail !== undefined ? '   [' + detail + ']' : '')); }
  else { failures++; console.log('  FAIL  ' + name + (detail !== undefined ? '   [' + detail + ']' : '')); }
}
function section(t) { console.log('\n=== ' + t + ' ==='); }

// ---------------------------------------------------------------- the fake page
function makePage(opts) {
  const o = opts || {};
  const prepare = o.prepare || 'faithful';   // 'faithful' | 'destructive'
  const openers = o.openers !== false;        // false: no opener produces the textarea
  const win = {};
  win.window = win; win.global = win; win.globalThis = win;
  // The installer runs INSIDE the vm context, so its console.log resolves against the context's
  // globals. Without this it throws on the very first line of finish(), after the registration
  // has already happened - which is exactly the kind of failure that looks like success.
  win.console = console;
  win.Event = Event;
  win.Proxy = Proxy;
  win.performance = { now: () => Date.now() };
  win.setTimeout = function (fn, ms) { win.__timers.push({ fn: fn, ms: ms }); return win.__timers.length; };
  win.clearTimeout = function () {};
  win.requestIdleCallback = function (fn) { win.__timers.push({ fn: fn, ms: 0 }); return win.__timers.length; };
  win.__timers = [];
  win.__flush = function (limit) {
    let n = 0; const max = limit || 600;
    while (win.__timers.length && n < max) { const t = win.__timers.shift(); t.fn(); n++; }
    return n;
  };
  const store = {};
  win.localStorage = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; }
  };

  // ---- the fake DOM. createElement does NOT register a node. ----
  const nodes = [];
  function El(tag) {
    this.tagName = String(tag).toUpperCase(); this.id = ''; this.value = '';
    this.textContent = ''; this.className = ''; this.maxLength = -1; this._h = {};
  }
  El.prototype.addEventListener = function () {};
  El.prototype.removeEventListener = function () {};
  El.prototype.getAttribute = function (n) { return this._h[n] !== undefined ? this._h[n] : null; };
  El.prototype.dispatchEvent = function (ev) {
    (this._h[ev && ev.type] || []).slice().forEach((fn) => fn(ev)); return true;
  };
  El.prototype.click = function () { (this._h.click || []).slice().forEach((fn) => fn({ type: 'click' })); };
  const doc = {
    createElement: (tag) => new El(tag),
    getElementById: (id) => { for (let i = 0; i < nodes.length; i++) if (nodes[i].id === id) return nodes[i]; return null; },
    getElementsByTagName: (tag) => nodes.filter((e) => e.tagName === String(tag).toUpperCase()),
    querySelectorAll: () => nodes.slice(),
    createEvent: () => ({ initEvent: function () {} })
  };
  win.document = doc;
  // the market-watch toolbar is on the page from the start; the dialog is not
  const toolbar = doc.createElement('div');
  toolbar.id = 'FilterToolbar'; toolbar.textContent = 'فیلتر';
  nodes.push(toolbar);

  // ---- the site ----
  const rows = [];
  for (let i = 0; i < 60; i++) rows.push({ inscode: 'S' + i, pl: 10 + (i % 7), plc: 1, l18: 2, l30: 3, tvol: 4, tno: 5, pcp: 6, pd1: 7, po1: 8, pc: 9 });
  win.mw = {
    AllRows: rows,
    Settings: { FilterNo: 0, Filters: [{ FilterCode: '' }, { FilterCode: '' }] },
    FilterCode: '',
    PrepareFilterCode: function (code) {
      const s = String(code);
      if (prepare === 'destructive') return s.replace(/\(row\)/g, 'row["row"]');
      return s;
    },
    SaveParams: function () {},
    RenderData: null,
    __renderedRows: 0, __hiddenRows: 0, __threwRows: 0, __firstError: null
  };
  // the site's verbatim call site, built INSIDE the page context so the body's eval sees the
  // page's window (E-061, and the reason the probe harness was blind for a while)
  const ctx = vm.createContext(win);
  win.__ctx = ctx;
  win.mw.RenderData = vm.runInContext(
    '(function RenderData(){' +
    '  for (var k in mw.AllRows) {' +
    '    var row = mw.AllRows[k];' +
    '    if (mw.FilterCode.length != 0) {' +
    '      var FilterResult;' +
    '      try { FilterResult = eval(mw.FilterCode); }' +
    '      catch (e) { FilterResult = false; mw.__threwRows++; if (!mw.__firstError) mw.__firstError = String(e && e.message || e); }' +
    '      if (!FilterResult) { mw.__hiddenRows++; }' +
    '    }' +
    '    mw.__renderedRows++;' +
    '  }' +
    '  return mw.__renderedRows;' +
    '})', ctx, { filename: 'siteRenderData.js' });
  win.mw.QueryWindowEditFilter = openers ? function () { buildDialog(); } : function () { throw new Error('no dialog'); };
  win.mw.QueryWindowNewFilter = openers ? function () { buildDialog(); } : function () {};
  win.mw.QueryWindowSaveFilter = function () {
    if (!doc.getElementById('InputFilterCode')) throw new Error("Cannot read properties of undefined (reading 'replace')");
    const code = String(doc.getElementById('InputFilterCode').value || '');
    // the two writes a real save performs: the active slot and the mirror
    const no = (win.mw.Settings && win.mw.Settings.FilterNo) || 0;
    if (win.mw.Settings && win.mw.Settings.Filters[no]) win.mw.Settings.Filters[no].FilterCode = code;
    win.mw.FilterCode = code;
  };
  win.mw.QueryWindowCheckFilter = function () {};
  win.mw.SelectFilter = function () {};

  function buildDialog() {
    if (doc.getElementById('InputFilterCode')) return;
    const ta = doc.createElement('textarea'); ta.id = 'InputFilterCode'; ta.value = ''; nodes.push(ta);
    const nm = doc.createElement('input'); nm.id = 'InputFilterName'; nm.value = ''; nodes.push(nm);
    const save = doc.createElement('button'); save.id = 'BtnSaveFilter'; save.value = 'ثبت'; nodes.push(save);
  }
  return win;
}

// Walk a double-quoted JS string literal out of the source: find the opening quote after the
// prefix, then advance to the matching close quote, honouring backslash escapes. A regex
// cannot do this, because the body contains escaped quotes and backslashes of its own.
function extractLiteral(src, prefix) {
  const at = src.indexOf(prefix);
  if (at === -1) return null;
  const from = at + prefix.length;
  if (src[from] !== '"') return null;
  let esc = false;
  for (let i = from + 1; i < src.length; i++) {
    const c = src[i];
    if (esc) { esc = false; continue; }
    if (c === '\\') { esc = true; continue; }
    if (c === '"') { return JSON.parse(src.slice(from, i + 1)); }
  }
  return null;
}

function fnv1a(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i) & 0xff; h = (h * 0x01000193) >>> 0; }
  return ('00000000' + h.toString(16)).slice(-8);
}

function runInstaller(win, budget) {
  let json = null, lines = [];
  const origLog = console.log;
  console.log = function () {
    const s = Array.prototype.slice.call(arguments).map(String).join(' ');
    lines.push(s);
    const i = s.indexOf('INSTALL_JSON ');
    if (i !== -1) { try { json = JSON.parse(s.slice(i + 'INSTALL_JSON '.length)); } catch (e) {} }
  };
  try {
    vm.runInContext(fs.readFileSync(INSTALLER, 'utf8'), win.__ctx || vm.createContext(win), { filename: 'installer.js' });
    win.__flush(budget || 900);
  } finally { console.log = origLog; }
  return { json: json, lines: lines };
}

const installerSrc = fs.readFileSync(INSTALLER, 'utf8');
const programSrc = fs.readFileSync(PROGRAM, 'utf8').replace(/\s+$/, '');

// ==========================================================================
section('0. the installer exists, carries the live-verified program, and keeps its contract');
{
  check('the installer exists', fs.existsSync(INSTALLER));
  check('it is one paste of a plausible size', installerSrc.length > 80000 && installerSrc.length < 200000,
    installerSrc.length + ' bytes');
  // The body is injected as a JSON string literal, so its raw text is NOT in the file (newlines
  // are \n, quotes are \"). Decode the literal and compare - a substring search on the source
  // would report a correct installer as broken.
  const embedded = extractLiteral(installerSrc, 'var BODY = ');
  check('it embeds the whole program', embedded === programSrc,
    embedded === null ? 'no BODY literal' : (embedded.length + ' of ' + programSrc.length + ' bytes, fnv1a ' + fnv1a(embedded)));
  check('the embedded program is the one that ran live',
    fnv1a(programSrc) === LIVE_VERIFIED_FNV1A, 'fnv1a ' + fnv1a(programSrc));
  check('the safety gate is the first thing it does',
    /phaseGate\(function \(\)/.test(installerSrc) && installerSrc.indexOf('PrepareFilterCode(BODY)') < installerSrc.indexOf('ta.value = BODY'));
  // the three things that make an installer different from a probe
  check('it does NOT roll back (the registration is the product)',
    !/function restoreState/.test(installerSrc) && !/slotRestored/.test(installerSrc));
  check('it does NOT disarm the tick (a slider change must reach the rows)',
    !/__TSE_SCHED\.arm\s*=/.test(installerSrc));
  check('it does NOT leave a tallying Proxy on the projection',
    !/new Proxy/.test(installerSrc));
  check('it prints how to take the program off the page', /howToRemove/.test(installerSrc));
}

// ==========================================================================
section('A. the happy path: the program is registered, boots, and STAYS registered');
{
  const win = makePage({ prepare: 'faithful' });
  const before = { slot0: win.mw.Settings.Filters[0].FilterCode, mirror: win.mw.FilterCode };
  const r = runInstaller(win, 1200);
  const j = r.json;
  check('the installer emitted INSTALL_JSON', !!j);
  if (j) {
    check('the gate passed and the program was accepted', j.gate.identical === true,
      j.gate.inputBytes + ' -> ' + j.gate.outputBytes + ' bytes, firstDiffAt=' + j.gate.firstDiffAt);
    check('the status is installed', j.status === 'installed', j.status);
    check('the filter editor was opened', j.dialog.opened === true, j.dialog.by);
    check('the textarea held the whole program unchanged',
      j.textarea.readBackLen === programSrc.length && j.textarea.pageRewroteIt === false,
      j.textarea.beforeLen + ' -> ' + j.textarea.readBackLen);
    check('the UI save delivered it to a slot and the mirror',
      j.identity.anySlotHoldsGenerated && j.identity.mirrorEqualsGenerated,
      'slot ' + j.save.activeSlot + ', mirror ' + j.save.mirrorLen + 'B/' + j.save.mirrorFnv1a);
    check('the program booted and published a projection',
      j.boot.program === true && j.boot.published && j.boot.published.index === true,
      'ticks=' + (j.boot.schedState && j.boot.schedState.ticks) + ' runs=' + (j.boot.schedState && j.boot.schedState.runs));
    check('the program hid only the rows it judged, and threw nothing',
      win.mw.__threwRows === 0, 'rendered=' + win.mw.__renderedRows + ' hidden=' + win.mw.__hiddenRows + ' threw=' + win.mw.__threwRows);
    check('the UX panel was built', j.panel.built === true,
      j.panel.built ? (j.panel.variables + ' variables, ' + j.panel.presets + ' presets') : j.panel.reason);
    check('the tick is still armed, so a config change reaches the rows',
      win.__TSE_SCHED && typeof win.__TSE_SCHED.arm === 'function' && win.__TSE_SCHED.arm !== noop);
    check('the settings storage key the panel writes is the one the program reads',
      j.panel.storageKey === 'tseFunnelSettings.v1', j.panel.storageKey);
  }
  // THE POINT OF AN INSTALLER: nothing was undone
  check('the owner slot STILL holds the program', win.mw.Settings.Filters[0].FilterCode === programSrc);
  check('the mirror STILL holds the program', win.mw.FilterCode === programSrc);
  check('the program STILL runs on the page', !!win.__TSE_PROGRAM && !!win.__TSE_SCHED);
  check('the slot and mirror were both different before the install',
    before.slot0 !== programSrc && before.mirror !== programSrc, 'the test is not vacuous');
  check('the textarea still shows the program', String(doc_Id(win, 'InputFilterCode').value) === programSrc);
}
function noop() {}
function doc_Id(win, id) { return win.document.getElementById(id); }

// ==========================================================================
section('B. THE SAFETY GATE: a destructive PrepareFilterCode must stop the install');
{
  const win = makePage({ prepare: 'destructive' });
  const before = { slot0: win.mw.Settings.Filters[0].FilterCode, mirror: win.mw.FilterCode };
  const r = runInstaller(win, 400);
  const j = r.json;
  check('the installer emitted INSTALL_JSON', !!j);
  if (j) {
    check('the gate detected the rewrite', j.gate.identical === false && j.gate.firstDiffAt >= 0,
      j.gate.inputBytes + ' -> ' + j.gate.outputBytes + ' bytes, firstDiffAt=' + j.gate.firstDiffAt);
    check('the status says it refused', /refused/.test(j.status), j.status);
    check('the verdict explains the fail-closed danger', /fail-closed|hidden every row/i.test(j.verdict || ''));
  }
  check('NOTHING was written to the textarea', doc_Id(win, 'InputFilterCode') === null);
  check('the owner slot is untouched', win.mw.Settings.Filters[0].FilterCode === before.slot0);
  check('the mirror is untouched', win.mw.FilterCode === before.mirror);
  check('the program was never booted', win.__TSE_PROGRAM === undefined);
  check('RenderData was never called', win.mw.__renderedRows === 0);
}

// ==========================================================================
section('C. no opener produces the textarea: the install must not happen');
{
  const win = makePage({ prepare: 'faithful', openers: false });
  const before = { slot0: win.mw.Settings.Filters[0].FilterCode, mirror: win.mw.FilterCode };
  const r = runInstaller(win, 9000);
  const j = r.json;
  check('the installer emitted INSTALL_JSON', !!j);
  if (j) {
    check('the status is editor-unavailable', j.status === 'editor-unavailable', j.status);
    check('the gate still ran first (the order is right)', j.gate.identical === true);
    check('the verdict tells the owner to open the dialog by hand', /by hand/i.test(j.verdict || ''));
  }
  check('nothing was registered', win.mw.Settings.Filters[0].FilterCode === before.slot0);
  check('the mirror is untouched', win.mw.FilterCode === before.mirror);
  check('the program was never booted', win.__TSE_PROGRAM === undefined);
}

// ==========================================================================
section('D. the settings layer must be able to change the live verdicts afterwards');
{
  // the installer leaves the program live, so a settings write must move the verdicts. This is
  // the mechanism E-080 proved live (hide 4 -> 100 with cfgHash fs1-df750af0 -> fs1-f52463a4):
  // the program's own tick re-arms from the per-row code and re-publishes when the config hash
  // changes, and the panel writes the very storage key it reads.
  const win = makePage({ prepare: 'faithful' });
  runInstaller(win, 1200);
  check('the program is installed and its modules are on the page',
    !!win.__TSE_PROGRAM && !!win.TseFunnelSettings);
  const key = win.TseFunnelSettings.STORAGE_KEY;
  const before = win.TseFunnelSettings.configHash(win.TseFunnelSettings.normalizeSettings({}).settings);
  win.TseFunnelSettings.save(win.localStorage, key, { ivMax: 1.0 });
  const loaded = win.TseFunnelSettings.load(win.localStorage, key);
  const after = win.TseFunnelSettings.configHash(loaded.settings);
  // load() returns { settings, warnings, source, version } - it has NO `ok`; `ok` belongs to
  // save(). Asserting it would have been the "a module API that looks like another" trap the
  // ledger already records for this very layer.
  check('a settings write is readable through the layer the program uses',
    loaded.source !== 'defaults' && loaded.settings.ivMax === 1.0 &&
    (!loaded.warnings || loaded.warnings.length === 0),
    'source=' + loaded.source + ' ivMax=' + loaded.settings.ivMax +
    ' warnings=' + JSON.stringify(loaded.warnings || []));
  check('the config hash MOVES, which is what the program watches',
    before !== after, before + ' -> ' + after);
  check('garbage falls back to the default, never to a real alternative',
    win.TseFunnelSettings.normalizeSettings({ ivMax: 'not-a-number' }).settings.ivMax ===
    win.TseFunnelSettings.normalizeSettings({}).settings.ivMax);
  // and the program must still be live after all that
  win.mw.RenderData();
  check('the program still runs and still throws nothing after a settings change',
    win.mw.__threwRows === 0 && !!win.__TSE_PROGRAM,
    'threw=' + win.mw.__threwRows + ' hidden=' + win.mw.__hiddenRows);
}

// ==========================================================================
console.log('\n=== SUMMARY ===');
console.log('  checks=' + checks + ' failures=' + failures);
if (failures === 0) console.log('ALL CHECKS PASSED');
else console.log(failures + ' FAILURES');
process.exit(failures === 0 ? 0 : 1);
