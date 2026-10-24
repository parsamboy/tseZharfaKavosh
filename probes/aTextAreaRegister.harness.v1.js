#!/usr/bin/env node
/**
 * tseZharfaKavosh — node-side harness for probes/aTextAreaRegister.live.v1.js (G-31)
 *
 * WHY THIS EXISTS
 *   The owner's instruction (2026-10-24) was that the registration must happen through
 *   the TEXTAREA, not the console. E-058/E-059 left that path unmeasured because the
 *   textarea only exists while the filter dialog is open, so the probe has to be able to
 *   open the dialog itself. That is UI work, and UI work is exactly what a live run
 *   cannot be asked to debug - so the probe is exercised here first.
 *
 * WHAT THE FAKE SITE MUST GET RIGHT
 *   1. The textarea must NOT exist until the dialog is opened (E-058's actual finding).
 *      A fake site that ships the textarea from the start would prove nothing about the
 *      opener ladder.
 *   2. jQuery must exist, because QueryWindowCheckFilter reads $("#InputFilterCode").val()
 *      and the probe prefers the jQuery path when it is present.
 *   3. QueryWindowSaveFilter must read #InputFilterName - that is what threw in E-058
 *      ("Cannot read properties of undefined (reading 'replace')") when the dialog was
 *      closed - and must write what it reads into the slot AND the mirror.
 *   4. The save path's behaviour is CONFIGURABLE, because what the site does with the
 *      pasted text is precisely the unknown: it may store it verbatim, compile it through
 *      its own DSL, or transform it. Each of those is a different finding and the probe
 *      must report the right one.
 *   5. RenderData must be fail-closed and must not render every row.
 *
 * SPDX-License-Identifier: Smart-FFA-1.1
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const REPO = path.join(__dirname, '..');
const BUNDLE = path.join(REPO, 'src', 'engine', 'tseEngine.browser.v1.js');
const PROBE = path.join(REPO, 'probes', 'aTextAreaRegister.live.v1.js');

let failures = 0, checks = 0;
function check(name, cond, detail) {
  checks++;
  if (cond) { console.log('  PASS  ' + name + (detail !== undefined ? '   [' + detail + ']' : '')); return; }
  failures++;
  console.log('  FAIL  ' + name + (detail !== undefined ? '   [' + detail + ']' : ''));
}

function probeSource() {
  let src = fs.readFileSync(PROBE, 'utf8');
  const before = src;
  src = src.replace('var RENDER_WAIT = 2600;', 'var RENDER_WAIT = 0;');
  src = src.replace('var POLL_MS = 260;', 'var POLL_MS = 0;');
  if (src === before) throw new Error('the probe no longer contains the waits this harness neutralises - update the harness');
  return src;
}

// ---------------- a minimal but honest fake DOM ----------------
function El(tag, id, name) {
  this.tagName = String(tag).toUpperCase();
  this.id = id || ''; this.name = name || '';
  this.value = ''; this.textContent = ''; this.type = '';
  this.maxLength = -1; this.offsetParent = null; this.offsetHeight = 0;
  this.children = []; this._l = {};
}
El.prototype.addEventListener = function (t, fn) { (this._l[t] = this._l[t] || []).push(fn); };
El.prototype.removeEventListener = function () {};
El.prototype.dispatchEvent = function (ev) {
  (this._l[ev.type] || []).slice().forEach((fn) => fn(ev));
  if (ev && ev.bubbles && this.parent) this.parent.dispatchEvent(ev);
  return true;
};
El.prototype.click = function () { (this._l.click || []).slice().forEach((fn) => fn({ type: 'click' })); };

function FakeDoc() { this._all = []; }
FakeDoc.prototype.createElement = function (tag) { const e = new El(tag); this._all.push(e); return e; };
FakeDoc.prototype.getElementById = function (id) {
  for (let i = 0; i < this._all.length; i++) if (this._all[i].id === id) return this._all[i];
  return null;
};
FakeDoc.prototype.getElementsByTagName = function (tag) {
  const t = String(tag).toUpperCase();
  return this._all.filter((e) => e.tagName === t);
};
// supports: 'tag', 'tag[attr=val]', 'tag[attr]', '[attr]' - enough for the probe's selectors
FakeDoc.prototype.querySelectorAll = function (sel) {
  const out = [];
  this._all.forEach((e) => {
    sel.split(',').forEach((part) => {
      const p = part.trim();
      const m = p.match(/^([a-zA-Z]*)(\[[^\]]*\])?$/);
      if (!m) return;
      if (m[1] && e.tagName !== m[1].toUpperCase()) return;
      if (m[2]) {
        const am = m[2].match(/^\[([a-zA-Z-]+)(?:=["']?([^"'\]]*)["']?)?\]$/);
        if (!am) return;
        const attr = am[1], want = am[2];
        const have = (attr === 'id') ? e.id : (attr === 'name') ? e.name : (attr === 'type') ? e.type : e[attr];
        if (want === undefined) { if (!have) return; }
        else if (String(have) !== want) return;
      }
      if (out.indexOf(e) === -1) out.push(e);
    });
  });
  return out;
};
FakeDoc.prototype.createEvent = function () {
  return { initEvent: function (t) { this.type = t; } };
};

function Event(type, opts) { this.type = type; this.bubbles = !!(opts && opts.bubbles); }

// ---------------- the population (measured ladder from E-072) ----------------
const LADDER_ITM = [530, 600, 700, 800, 900, 1000, 1100, 1200, 1300, 1400];
const LADDER_OTM = [0.01, 1, 20, 120, 300, 500, 700, 850, 950, 1150];
const LADDER_ATM = [400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1300];
function population() {
  const rows = {};
  for (let i = 0; i < 20; i++) {
    const k = 'U' + i;
    rows[k] = { inscode: k, l18: k, l30: k, pc: 1500 + i * 40, pl: 1500 + i * 40, pd1: 0, po1: 0, tno: 1000 + i };
  }
  for (let i = 0; i < 8; i++) {
    const k = 'REJECT' + i;
    rows[k] = { inscode: k, l18: 'notanoptionrow' + i, l30: 'plain equity row ' + i, pc: 900 + i, pl: 900 + i, tno: 10 };
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

/**
 * opts.saveMode:
 *   'verbatim'   - the site stores the pasted text unchanged (the ideal)
 *   'compiles'   - the site runs its own DSL compiler first; a plain-JS body passes
 *                  through unchanged, so this must still land the body byte for byte
 *   'transforms' - the site mangles the text (the failure the probe must catch)
 * opts.openWith:  which mw function opens the dialog, or null for "nothing works"
 * opts.rewriteInTextArea: the page rewrites the textarea's value on the input event
 */
function buildSite(win, opts) {
  const doc = new FakeDoc();
  win.document = doc;
  win.Event = Event;

  const rows = population();
  const FILTER_NO = 3;
  const filters = [];
  for (let i = 0; i < 6; i++) filters.push({ FilterName: 'فیلتر شماره ' + (i + 1), FilterCode: '' });
  filters[FILTER_NO].FilterCode = 'var FilterResult = true; // the owner pre-existing slot code';
  const persisted = { FilterNo: FILTER_NO, Filters: filters };

  // a toolbar button that opens the dialog, as the real page has
  const openBtn = doc.createElement('a');
  openBtn.id = 'filterEditLink'; openBtn.textContent = 'ویرایش فیلتر';

  // (1) NOT in the DOM yet - and note HOW: createElement must NOT register the element,
  // because in the real page the dialog's DOM is built lazily. A fake document whose
  // createElement registers every node would make the textarea exist from the start and
  // the opener ladder would pass on the first try without opening anything - which is
  // precisely the false positive this harness is supposed to prevent.
  const codeTa = new El('textarea');
  codeTa.id = 'InputFilterCode'; codeTa.maxLength = 4096;
  const nameIn = new El('input');
  nameIn.id = 'InputFilterName'; nameIn.type = 'text';

  let dialogOpen = false;
  function openDialog() {
    if (dialogOpen) return;
    dialogOpen = true;
    doc._all.push(codeTa, nameIn);                 // the dialog's DOM appears
  }
  if (opts.preopen) openDialog();

  const mw = {
    AllRows: rows, RoundNo: 1,
    Settings: { FilterNo: FILTER_NO, Filters: filters },
    FilterCode: '', __verdicts: {},
    PrepareFilterCode: (b) => b,
    SaveParams: function () { persisted.Filters = mw.Settings.Filters; persisted.FilterNo = mw.Settings.FilterNo; },
    RenderData: function () {
      const b = mw.FilterCode;
      if (!b || !b.length) return;
      Object.keys(mw.AllRows).forEach((k, i) => {
        if (i % 4 === 3) return;
        const row = mw.AllRows[k];
        let R; try { R = eval(b); } catch (e) { R = false; }
        mw.__verdicts[k] = R;
      });
    },
    // (2) the opener ladder the probe walks
    QueryWindowEditFilter: function () { if (opts.openWith === 'edit') openDialog(); },
    QueryWindowNewFilter: function () { if (opts.openWith === 'new') openDialog(); },
    // (3) reads the name field - exactly what threw in E-058 when the dialog was closed
    QueryWindowSaveFilter: function () {
      const nameEl = doc.getElementById('InputFilterName');
      const nm = nameEl ? String(nameEl.value || '').replace(/\s/g, '') : null;
      if (nm === null) throw new Error("Cannot read properties of undefined (reading 'replace')");
      const ta = doc.getElementById('InputFilterCode');
      let code = ta ? String(ta.value || '') : '';
      if (opts.saveMode === 'compiles') code = mw.PrepareFilterCode(code);
      if (opts.saveMode === 'transforms') code = '/* mangled */ ' + code.toUpperCase();
      const fno = mw.Settings.FilterNo;
      if (mw.Settings.Filters[fno]) mw.Settings.Filters[fno].FilterCode = code;
      mw.FilterCode = code;                        // the mirror
      mw.SaveParams();
      return { name: nm, bytes: code.length };
    },
    QueryWindowCheckFilter: function () {
      const ta = doc.getElementById('InputFilterCode');
      return ta ? String(ta.value || '') : null;
    }
  };
  win.mw = mw;
  global.mw = mw;                                  // the A body's bare global
  openBtn.addEventListener('click', function () { if (opts.openWith === 'click') openDialog(); });
  win.getData = (k) => (k === 'MarketWatchSettings' ? JSON.stringify(persisted) : null);
  win.localStorage = {
    _d: {},
    getItem(k) { return Object.prototype.hasOwnProperty.call(this._d, k) ? this._d[k] : null; },
    setItem(k, v) { this._d[k] = String(v); },
    removeItem(k) { delete this._d[k]; }
  };
  // (2) jQuery, because the probe prefers it when present
  win.jQuery = function (sel) {
    const id = String(sel).replace(/^#/, '');
    const el = doc.getElementById(id);
    const r = el ? [el] : [];
    r.length = r.length; return r;
  };
  return { mw, doc, codeTa, nameIn, persisted, filterNo: FILTER_NO, openBtn };
}

function runProbe(win) {
  const logs = [];
  win.console = { log: (s) => logs.push(String(s)), error: (s) => logs.push(String(s)) };
  vm.runInContext(probeSource(), win, { filename: 'aTextAreaRegister.live.v1.js' });
  const line = logs.filter((l) => l.indexOf('PROBE_JSON ') === 0)[0];
  if (!line) throw new Error('the probe logged no PROBE_JSON line:\n' + logs.join('\n'));
  return { json: JSON.parse(line.slice('PROBE_JSON '.length)), logs };
}

console.log('\n=== A. the dialog is closed; QueryWindowEditFilter opens it; the site stores the paste verbatim ===');
{
  const win = {}; win.window = win; win.global = win; win.location = { host: 'old.tsetmc.com' };
  win.performance = { now: () => 1 }; win.setTimeout = (fn) => fn(); win.requestIdleCallback = (fn) => fn();
  vm.createContext(win);
  vm.runInContext(fs.readFileSync(BUNDLE, 'utf8'), win, { filename: 'b.js' });
  const site = buildSite(win, { saveMode: 'verbatim', openWith: 'edit' });
  const beforeSlot = String(site.mw.Settings.Filters[site.filterNo].FilterCode);
  const { json, logs } = runProbe(win);
  logs.filter((l) => l.indexOf('  dialog=') === 0 || l.indexOf('  EXECUTE:') === 0 || l.indexOf('  ROLLBACK:') === 0)
    .forEach((l) => console.log('  | ' + l));
  check('no errors', json.errors.length === 0, JSON.stringify(json.errors));
  check('the dialog was opened by QueryWindowEditFilter()', json.dialog.opened === true && json.dialog.by === 'QueryWindowEditFilter()', json.dialog.by);
  check('the path is the textarea', json.path === 'textarea', json.path);
  check('the body is the repo generator', json.body.bytes === 430 && json.body.fnv1a === '38fe0c59', json.body.fnv1a);
  check('the body is deterministic', json.body.deterministic === true);
  check('the page did NOT rewrite the textarea', json.textarea.pageRewroteIt === false, json.textarea.readBackLen + 'B');
  check('the textarea received the whole body', json.textarea.readBackLen === 430, json.textarea.readBackLen);
  check('the name field was filled', json.textarea.nameField && json.textarea.nameField.set === true);
  check('input+change were dispatched', json.textarea.eventsDispatched.join(',') === 'input,change', json.textarea.eventsDispatched.join(','));
  check('QueryWindowSaveFilter ran', json.save.calls.saveFilter === 'called', json.save.calls.saveFilter);
  check('the UI save put the generated body in the mirror', json.identity.mirrorEqualsGenerated === true,
    json.save.mirrorLen + 'B fnv1a ' + json.save.mirrorFnv1a + ' vs ' + json.identity.generatedFnv1a);
  check('a slot holds the generated body', json.identity.anySlotHoldsGenerated === true, JSON.stringify(json.identity.slotsHoldingGenerated));
  check('the projection was published', json.projection.symbols === 184 && json.projection.engineVerdicts.computed > 0,
    'symbols=' + json.projection.symbols + ' computed=' + json.projection.engineVerdicts.computed);
  // the non-vacuity rule: a match over zero rows is not a match
  check('the code actually ran (a non-zero row count)', json.execute.tally.distinctCount > 0, json.execute.tally.distinctCount);
  check('the code ran on a subset of the rows', json.execute.tally.distinctCount < 184, json.execute.tally.distinctCount + ' of 184');
  check('the verdicts match the projection', json.execute.verdictsMatchProjection === true,
    JSON.stringify(json.execute.tally.verdicts) + ' vs ' + JSON.stringify(json.projection.engineVerdicts));
  check('keep, hide and fail-open are all exercised', json.execute.tally.verdicts.keep > 0 &&
    json.execute.tally.verdicts.hide > 0 && json.execute.tally.verdicts.failOpen > 0, JSON.stringify(json.execute.tally.verdicts));
  check('the slot was restored', json.rollback.slotRestored === true);
  check('the mirror was restored', json.rollback.mirrorRestored === true);
  check('nothing of ours is left on mw', json.rollback.cleaned === true);
  check('the pre-existing slot code came back', String(site.mw.Settings.Filters[site.filterNo].FilterCode) === beforeSlot,
    beforeSlot.slice(0, 30) + '...');
  check('the textarea was restored', site.codeTa.value === '');
  // The probe opened this dialog itself, so it cannot close it - but it MUST empty the
  // fields it wrote. Leaving the generated body sitting in the owner's filter editor
  // means a later manual «ذخیره» registers code the owner never chose.
  check('the editor fields were emptied', json.rollback.editorFieldsEmptied === true);
  check('the dialog being left open is reported, not hidden',
    json.rollback.dialogLeftOpen === true && json.verdict.length > 0);
  check('the name field was emptied too', site.nameIn.value === '');
  check('status is textarea-registered-live', json.status === 'textarea-registered-live', json.status);
}

console.log('\n=== B. no opener works -> the probe must STOP, not fall back to the console ===');
{
  const win = {}; win.window = win; win.global = win; win.location = { host: 'old.tsetmc.com' };
  win.performance = { now: () => 1 }; win.setTimeout = (fn) => fn(); win.requestIdleCallback = (fn) => fn();
  vm.createContext(win);
  vm.runInContext(fs.readFileSync(BUNDLE, 'utf8'), win, { filename: 'b.js' });
  const site = buildSite(win, { saveMode: 'verbatim', openWith: null });
  const beforeMirror = String(site.mw.FilterCode);
  const beforeSlot = String(site.mw.Settings.Filters[site.filterNo].FilterCode);
  const { json } = runProbe(win);
  check('the status is textarea-unavailable', json.status === 'textarea-unavailable', json.status);
  check('the path is null - it did NOT silently use the console', json.path === null, json.path);
  check('all four openers were tried', json.dialog.attempts.length === 4, json.dialog.attempts.map((a) => a.name).join(' | '));
  check('nothing was registered in the mirror', String(site.mw.FilterCode) === beforeMirror);
  check('nothing was registered in the slot', String(site.mw.Settings.Filters[site.filterNo].FilterCode) === beforeSlot);
  check('no projection was published', site.mw.__B_index === undefined);
  check('the verdict tells the owner what to do', json.verdict.indexOf('Open the filter dialog by hand') >= 0);
}

console.log('\n=== C. the page REWRITES the pasted code in the textarea ===');
{
  const win = {}; win.window = win; win.global = win; win.location = { host: 'old.tsetmc.com' };
  win.performance = { now: () => 1 }; win.setTimeout = (fn) => fn(); win.requestIdleCallback = (fn) => fn();
  vm.createContext(win);
  vm.runInContext(fs.readFileSync(BUNDLE, 'utf8'), win, { filename: 'b.js' });
  const site = buildSite(win, { saveMode: 'verbatim', openWith: 'new' });
  // a page-side handler that rewrites the textarea on input, as a live editor might
  site.codeTa.addEventListener('input', function () { site.codeTa.value = '/* rewritten by the page */ ' + site.codeTa.value; });
  const { json } = runProbe(win);
  check('the probe reports that the page rewrote it', json.textarea.pageRewroteIt === true, json.textarea.readBackLen + 'B');
  check('the rewrite is reported, not hidden', json.identity.pageRewroteIt === true);
  check('the verdict mentions the rewrite', json.verdict.indexOf('THE PAGE REWROTE THE CODE') >= 0);
  check('the rewritten code does not match the generated body', json.identity.mirrorEqualsGenerated === false);
  check('the probe says so instead of claiming success', json.status === 'failed-check', json.status);
  check('everything was still rolled back', json.rollback.slotRestored === true && json.rollback.mirrorRestored === true);
}

console.log('\n=== D. the site stores a TRANSFORMED code, so the UI path does not deliver the body ===');
{
  const win = {}; win.window = win; win.global = win; win.location = { host: 'old.tsetmc.com' };
  win.performance = { now: () => 1 }; win.setTimeout = (fn) => fn(); win.requestIdleCallback = (fn) => fn();
  vm.createContext(win);
  vm.runInContext(fs.readFileSync(BUNDLE, 'utf8'), win, { filename: 'b.js' });
  const site = buildSite(win, { saveMode: 'transforms', openWith: 'edit' });
  const { json } = runProbe(win);
  check('the mirror does NOT hold the generated body', json.identity.mirrorEqualsGenerated === false,
    json.save.mirrorLen + 'B fnv1a ' + json.save.mirrorFnv1a);
  check('no slot holds it either', json.identity.anySlotHoldsGenerated === false);
  check('the verdict names the failure', json.verdict.indexOf('THE UI PATH DID NOT DELIVER THE CODE') >= 0);
  check('the status is failed-check', json.status === 'failed-check', json.status);
  // The mangled body is uppercased, so `mw` becomes `MW` and the eval throws before it
  // ever reaches mw.__B_index - zero reads is the CORRECT outcome here, and it is exactly
  // why "zero rows read" must never be read as "the code ran and matched".
  check('the mangled code never reached the projection (zero reads)',
    json.execute.tally.distinctCount === 0, 'distinct=' + json.execute.tally.distinctCount);
  check('the verdict says the code did not run', json.verdict.indexOf('THE CODE DID NOT RUN') >= 0);
  check('everything was rolled back', json.rollback.slotRestored === true && json.rollback.mirrorRestored === true && json.rollback.cleaned === true);
}

console.log('\n=== E. the dialog is already open when the probe starts ===');
{
  const win = {}; win.window = win; win.global = win; win.location = { host: 'old.tsetmc.com' };
  win.performance = { now: () => 1 }; win.setTimeout = (fn) => fn(); win.requestIdleCallback = (fn) => fn();
  vm.createContext(win);
  vm.runInContext(fs.readFileSync(BUNDLE, 'utf8'), win, { filename: 'b.js' });
  const site = buildSite(win, { saveMode: 'compiles', openWith: null, preopen: true });
  const { json } = runProbe(win);
  check('the probe used the already-open dialog', json.dialog.opened === true, json.dialog.by);
  check('the DSL compiler left the plain-JS body unchanged (E-059 note b)',
    json.identity.mirrorEqualsGenerated === true, json.save.mirrorLen + 'B fnv1a ' + json.save.mirrorFnv1a);
  check('the verdicts still match the projection', json.execute.verdictsMatchProjection === true);
  check('status is textarea-registered-live', json.status === 'textarea-registered-live', json.status);
  check('the textarea value was restored', site.codeTa.value === '');
}

console.log('\n' + (failures === 0 ? 'ALL ' + checks + ' CHECKS PASSED' : failures + ' of ' + checks + ' CHECK(S) FAILED'));
process.exit(failures === 0 ? 0 : 1);
