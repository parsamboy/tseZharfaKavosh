/**
 * tseZharfaKavosh — register the FINAL code through the TEXTAREA (the real UI path) v1
 *
 * WHY THIS EXISTS (owner, 2026-10-24)
 *   Every registration probe so far (E-060..E-072) wrote the filter slot from the
 *   CONSOLE: `mw.Settings.Filters[i].FilterCode = body; mw.FilterCode = body;
 *   mw.SaveParams(); mw.RenderData();`. That proved the machinery, but it is NOT the
 *   path the product uses. The owner pastes the code into the filter editor's
 *   TEXTAREA and saves it through the UI, and E-058/E-059 left that path unmeasured:
 *   there is no textarea in the DOM until the filter dialog is opened, and
 *   `QueryWindowSaveFilter()` throws while it is closed.
 *
 *   The question this probe answers is therefore the product question: does the code
 *   the owner pastes into the textarea reach `mw.FilterCode` UNCHANGED, and does it
 *   then behave exactly like the code the console path registered? `PrepareFilterCode`
 *   is the site's own DSL compiler, so a textarea path that routes through a different
 *   transformation would silently produce a different program.
 *
 * WHAT IT DOES, IN ORDER
 *   1. recon: the filter DOM (textareas, inputs, filter controls) and which
 *      QueryWindow* functions exist.
 *   2. open the dialog: a ranked list of openers, each polled briefly, reporting which
 *      one actually produced `#InputFilterCode`. If NONE does, the probe STOPS and says
 *      so - it does NOT fall back to the console path, because that is the very
 *      confusion this probe exists to remove.
 *   3. write: the repo-generated A body into `#InputFilterCode` and a name into
 *      `#InputFilterName`, dispatching input+change so any page-side handler runs.
 *      The textarea is read back afterwards: if the page rewrote the code, that is a
 *      finding, not an error to be hidden.
 *   4. save through the UI: `QueryWindowSaveFilter()`, then a save-button click.
 *   5. read back what actually landed in the slot AND the mirror, and compare it byte
 *      for byte against the generated body (length + fnv1a + exact equality).
 *   6. run B with the owner's settings, publish the projection, and execute the code the
 *      UI path saved, reading the verdicts back through the tallying Proxy.
 *   7. roll back: slot, mirror, FilterNo, the textarea's original value, the persisted
 *      storage, and the dialog if this probe opened it.
 *
 * WHAT IT TOUCHES
 *   The filter editor's textarea and its name field, one filter slot, the mirror, and
 *   the persisted storage - all restored. It never navigates and never reloads.
 *
 * PREREQUISITE (one paste, once per page load)
 *   Paste src/engine/tseEngine.browser.v1.js first (46,484 bytes; it defines
 *   window.TseBEngine / TseModels / TseLookup / TseFunnelSettings).
 *
 * RUN HERE (always): old.tsetmc.com/Loader.aspx?ParTree=15131F  ->  Console (F12)
 *   tag: [کنسول] — paste the bundle, then this file. The probe opens the filter dialog
 *   itself; if it cannot, it says so and tells you to open it by hand and re-run.
 *   Send the single PROBE_JSON line.
 *
 * SPDX-License-Identifier: Smart-FFA-1.1
 */
(function aTextAreaRegister() {
  'use strict';

  // E-058: RenderData is not synchronous with respect to the filter - the body starts
  // running about 1.25s after the call returns. Wait well past that.
  var RENDER_WAIT = 2600;
  var POLL_MS = 260;
  var out = {
    meta: {
      test: 'A-TEXTAREA-REGISTER-v1', gate: 'G-31', evidenceId: 'E-073',
      host: (typeof location !== 'undefined') ? location.host : 'unknown',
      parTree: '15131F', capturedAt: new Date().toISOString(),
      method: 'the repo-generated A body is written into the filter editor textarea and saved through the UI path (QueryWindowSaveFilter), what actually lands in the slot and the mirror is compared byte for byte against the generated body, B is run with the owner settings and the code the UI saved is executed and measured through a tallying Proxy, then everything is rolled back'
    },
    preflight: {}, dom: {}, dialog: {}, textarea: {}, save: {}, identity: {},
    settings: {}, engine: {}, projection: {}, body: {}, execute: {}, rollback: {},
    errors: [], status: 'unknown', verdict: '', path: null
  };

  var mw = (typeof window !== 'undefined') ? window.mw : null;
  var ENG = (typeof window !== 'undefined') ? window.TseBEngine : null;
  var MODELS = (typeof window !== 'undefined') ? window.TseModels : null;
  var LOOKUP = (typeof window !== 'undefined') ? window.TseLookup : null;
  var UX = (typeof window !== 'undefined') ? window.TseFunnelSettings : null;

  function fnv1a(s) {
    var h = 0x811c9dc5, i;
    for (i = 0; i < s.length; i++) { h ^= s.charCodeAt(i) & 0xff; h = (h * 0x01000193) >>> 0; }
    return ('00000000' + h.toString(16)).slice(-8);
  }
  function say(o) { console.log('PROBE_JSON ' + JSON.stringify(o)); }
  function doRender() {
    if (mw && typeof mw.RenderData === 'function') {
      try { mw.RenderData(); return true; } catch (e) { out.errors.push('RenderData: ' + String((e && e.message) || e)); }
    }
    return false;
  }
  function jq(sel) {
    // E-059: QueryWindowCheckFilter reads $("#InputFilterCode").val(), so jQuery is on
    // the page. Use it when it is there, because a page-side handler may bind to it.
    try { if (typeof window !== 'undefined' && window.jQuery) { var r = window.jQuery(sel); if (r && r.length) return r[0]; } } catch (e) {}
    return null;
  }

  out.preflight = {
    bundle: { engine: !!ENG, models: !!MODELS, lookup: !!LOOKUP, settings: !!UX },
    engineVersion: ENG ? ENG.VERSION : null,
    settingsVersion: UX ? UX.VERSION : null,
    filterCodeLimit: LOOKUP ? LOOKUP.FILTER_CODE_LIMIT : null,
    jquery: (typeof window !== 'undefined' && !!window.jQuery)
  };
  if (!ENG || !MODELS || !LOOKUP || !UX) {
    out.status = 'needs-bundle';
    out.verdict = 'window.TseBEngine/TseModels/TseLookup/TseFunnelSettings are not all on this page - paste src/engine/tseEngine.browser.v1.js in the console first (46,484 bytes, it now includes the settings layer), then run this probe again. Nothing was changed.';
    say(out);
    console.log('A-TEXTAREA-REGISTER: ' + out.verdict);
    return;
  }

  // ---------- rollback state: memory, the textarea, AND the persisted storage ----------
  var savedFilters = [], savedFilterCode = '', savedFilterNo = null;
  var savedTextArea = null, savedTextAreaExisted = false, openedDialog = false;
  function snapshotState() {
    savedFilterNo = (mw && mw.Settings && typeof mw.Settings.FilterNo !== 'undefined') ? mw.Settings.FilterNo : null;
    savedFilters = [];
    if (mw && mw.Settings && mw.Settings.Filters) {
      for (var i = 0; i < mw.Settings.Filters.length; i++) {
        savedFilters.push(String((mw.Settings.Filters[i] && mw.Settings.Filters[i].FilterCode) || ''));
      }
    }
    savedFilterCode = (mw && mw.FilterCode !== undefined && mw.FilterCode !== null) ? String(mw.FilterCode) : '';
    var el = findCodeTextArea();
    savedTextAreaExisted = !!el;
    savedTextArea = el ? { id: el.id || null, value: String(el.value || '') } : null;
  }
  function restoreState() {
    try {
      if (mw && mw.Settings && mw.Settings.Filters) {
        for (var i = 0; i < mw.Settings.Filters.length; i++) {
          if (savedFilters[i] !== undefined && mw.Settings.Filters[i]) mw.Settings.Filters[i].FilterCode = savedFilters[i];
        }
        if (savedFilterNo !== null) mw.Settings.FilterNo = savedFilterNo;
      }
      mw.FilterCode = savedFilterCode;
      // The textarea is the one place a half-finished rollback is dangerous: leaving our
      // code sitting in the owner's filter editor means a later manual «ذخیره» registers
      // it. If the editor existed before the run, put its original text back. If THIS
      // PROBE opened the dialog, there was no original text, so clear both fields - the
      // dialog itself is left open (closing it needs a control we cannot identify
      // reliably) and that is reported rather than hidden.
      var ta = findCodeTextArea();
      var nameEl = findNameInput();
      if (ta) {
        ta.value = (savedTextAreaExisted && savedTextArea) ? savedTextArea.value : '';
        try { ta.dispatchEvent(new Event('input', { bubbles: true })); } catch (e) {}
        try { ta.dispatchEvent(new Event('change', { bubbles: true })); } catch (e) {}
      }
      if (nameEl) nameEl.value = '';
      var i;
      for (i in mw) { if (mw.hasOwnProperty(i) && i.indexOf('__B_') === 0) delete mw[i]; }
      if (mw && typeof mw.SaveParams === 'function') mw.SaveParams();
      return { restored: true, filterNo: savedFilterNo, filters: savedFilters.length,
        textAreaRestored: savedTextAreaExisted, textAreaCleared: !!ta && !savedTextAreaExisted,
        nameFieldCleared: !!nameEl };
    } catch (e) { return { restored: false, error: String((e && e.message) || e) }; }
  }

  // ---------- the filter DOM ----------
  function findCodeTextArea() {
    if (typeof document === 'undefined') return null;
    var el = document.getElementById('InputFilterCode') || jq('#InputFilterCode');
    if (el && String(el.tagName).toUpperCase() === 'TEXTAREA') return el;
    // The editor may not be open yet, or the id may differ. E-058's heuristic: the live
    // filter editor is the textarea whose current value is exactly the active slot's code.
    var tas = document.getElementsByTagName('textarea');
    var activeLen = -1;
    if (mw && mw.Settings && mw.Settings.Filters && savedFilterNo !== null && mw.Settings.Filters[savedFilterNo]) {
      activeLen = String(mw.Settings.Filters[savedFilterNo].FilterCode || '').length;
    }
    var best = null, bestLen = -1;
    for (var i = 0; i < tas.length; i++) {
      var t = tas[i], len = String(t.value || '').length;
      if (len > 0 && len === activeLen) return t;
      if (len > bestLen) { bestLen = len; best = t; }
    }
    return best;
  }
  function findNameInput() {
    if (typeof document === 'undefined') return null;
    return document.getElementById('InputFilterName') || jq('#InputFilterName');
  }
  function describeDom() {
    var d = { textareas: [], filterInputs: [], filterControls: [], filterIds: [], hasInputFilterCode: false, hasInputFilterName: false };
    if (typeof document === 'undefined') { d.note = 'no document'; return d; }
    d.hasInputFilterCode = !!(document.getElementById('InputFilterCode') || jq('#InputFilterCode'));
    d.hasInputFilterName = !!(document.getElementById('InputFilterName') || jq('#InputFilterName'));
    var tas = document.getElementsByTagName('textarea');
    for (var t = 0; t < tas.length && d.textareas.length < 10; t++) {
      var e = tas[t];
      d.textareas.push({ id: e.id || null, name: e.name || null, valueLen: String(e.value || '').length,
        maxLength: (e.maxLength === undefined ? null : e.maxLength), visible: !!(e.offsetParent || e.offsetHeight) });
    }
    var ins = document.getElementsByTagName('input');
    for (var q = 0; q < ins.length && d.filterInputs.length < 15; q++) {
      var ie = ins[q], idn = (ie.id || '') + ' ' + (ie.name || '');
      if (/filter|فیلتر/i.test(idn)) d.filterInputs.push({ type: (ie.type || '').toLowerCase(), id: ie.id || null, name: ie.name || null });
    }
    var all = document.querySelectorAll('[id],[name],a,button');
    for (var z = 0; z < all.length && d.filterControls.length < 15; z++) {
      var a = all[z], txt = ((a.textContent || '') + ' ' + (a.id || '') + ' ' + (a.name || '') + ' ' + (a.value || ''));
      if (/filter|فیلتر/i.test(txt)) {
        d.filterControls.push({ tag: a.tagName, id: a.id || null, text: String(txt).trim().slice(0, 40) });
      }
    }
    return d;
  }
  function clickMatching(must, also) {
    if (typeof document === 'undefined') return null;
    var els = document.querySelectorAll('a,button,input[type=button],input[type=submit],[onclick]');
    for (var i = 0; i < els.length; i++) {
      var e = els[i];
      var txt = ((e.textContent || '') + ' ' + (e.id || '') + ' ' + (e.name || '') + ' ' + (e.value || ''));
      if (!must.test(txt)) continue;
      if (also && !also.test(txt)) continue;
      try { if (typeof e.click === 'function') { e.click(); return (e.id || e.value || e.textContent || 'el').toString().trim().slice(0, 40); } } catch (x) {}
    }
    return null;
  }
  function queryWindowFns() {
    var names = ['QueryWindowNewFilter', 'QueryWindowEditFilter', 'QueryWindowSaveFilter',
      'QueryWindowCheckFilter', 'QueryWindowFilterNames', 'QueryWindowConfirmDeleteFilter',
      'SelectFilter', 'PrepareFilterCode', 'SaveParams', 'RenderData'];
    var r = {};
    for (var i = 0; i < names.length; i++) r[names[i]] = (mw && typeof mw[names[i]] === 'function') ? 'fn/' + mw[names[i]].length : 'absent';
    return r;
  }

  // ---------- the population ----------
  // The projection covers EVERY symbol, but the site only renders a subset of them. The
  // expected verdicts must therefore be computed over the rows that were ACTUALLY
  // evaluated - comparing the tally against the engine's whole-population totals would
  // compare two different populations and fail on a correct run (the harness caught
  // exactly that: 81/13/44 over 138 rendered rows against 113/15/56 over 184 symbols).
  function population() {
    var codes = [];
    if (mw && mw.AllRows) {
      var ks = Object.keys(mw.AllRows);
      for (var i = 0; i < ks.length; i++) {
        var row = mw.AllRows[ks[i]];
        codes.push((row && row.inscode !== undefined) ? String(row.inscode) : String(ks[i]));
      }
    }
    return { codes: codes };
  }

  // ---------- the verdict tally (the proven Proxy: absent keys count as fail-open) ----------
  var P = null;
  function verdictOf(inscode, index, known, bits) {
    var pos = index[inscode];
    if (pos === undefined) return 'failOpen';
    var b = pos >> 3, m = pos & 7;
    if (b < 0 || b >= known.length) return 'failOpen';
    if (!((known[b] >> m) & 1)) return 'failOpen';
    return ((bits[b] >> m) & 1) ? 'keep' : 'hide';
  }
  var NOT_A_LOOKUP = { length: 1, name: 1, toString: 1, valueOf: 1, constructor: 1,
    prototype: 1, hasOwnProperty: 1, isPrototypeOf: 1, propertyIsEnumerable: 1,
    toLocaleString: 1, __proto__: 1, then: 1, catch: 1, inspect: 1, nodeType: 1,
    $$typeof: 1, undefined: 1 };
  function isLookup(k) { return (typeof k === 'string') && k.length > 0 && NOT_A_LOOKUP[k] !== 1; }
  function install(index, known, bits, label) {
    var tally = { reads: 0, distinct: {}, perInscode: {}, sample: [], verdicts: { keep: 0, hide: 0, failOpen: 0 }, byteReads: 0, bytesSeen: {}, label: label };
    function own(t, k) { return (typeof k === 'string') && Object.prototype.hasOwnProperty.call(t, k); }
    function isByte(t, k) {
      if (!own(t, k) || !/^\d+$/.test(k)) return false;
      var v = +k; return (v >= 0 && v < t.length);
    }
    var pIndex = new Proxy(index, {
      get: function (t, k) {
        if (isLookup(k)) {
          var code = String(k), pos = t[k];
          tally.reads++;
          if (tally.distinct[code] === undefined) {
            tally.distinct[code] = true;
            var v = verdictOf(code, index, known, bits);
            tally.perInscode[code] = v;
            tally.verdicts[v]++;
            if (tally.sample.length < 12) tally.sample.push({ inscode: code, inProjection: (pos !== undefined), pos: pos, verdict: v });
          }
        }
        return t[k];
      }
    });
    var pKnown = new Proxy(known, { get: function (t, k) { if (isByte(t, k)) { tally.byteReads++; tally.bytesSeen['k' + (+k)] = t[k]; } return t[k]; } });
    var pBits = new Proxy(bits, { get: function (t, k) { if (isByte(t, k)) { tally.byteReads++; tally.bytesSeen['b' + (+k)] = t[k]; } return t[k]; } });
    mw.__B_index = pIndex; mw.__B_known = pKnown; mw.__B_bitset = pBits;
    mw.__B_symbols = P.symbols;
    mw.__B_snapshotId = P.snapshotId; mw.__B_configHash = P.configHash;
    mw.__B_configVersion = P.configVersion; mw.__B_totalRuns = P.totalRuns;
    mw.__B_meta = P.meta; mw.__B_lastError = P.lastError;
    P.tally = tally;
    return tally;
  }
  function resetTally() {
    if (!P || !P.tally) return;
    P.tally.reads = 0; P.tally.distinct = {}; P.tally.perInscode = {}; P.tally.sample = [];
    P.tally.verdicts = { keep: 0, hide: 0, failOpen: 0 };
    P.tally.byteReads = 0; P.tally.bytesSeen = {};
  }
  function tallyReport(t) {
    var seen = Object.keys(t.bytesSeen), sample = [];
    for (var i = 0; i < seen.length && i < 8; i++) sample.push({ key: seen[i], value: t.bytesSeen[seen[i]] });
    return {
      reads: t.reads, distinctCount: Object.keys(t.distinct).length, verdicts: t.verdicts,
      byteReads: t.byteReads, distinctBytesRead: seen.length, byteSample: sample,
      sample: t.sample.slice(0, 8)
    };
  }

  // ---------- one engine run over the whole population ----------
  function engineRun(settingsObj) {
    var t0 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    var cfg = UX.toFunnelConfig(settingsObj);
    var engine = ENG.createBEngine({
      models: {
        parseOptionLabel: MODELS.optionParser.parseOptionLabel,
        impliedVol: MODELS.greeks.impliedVol,
        bsGreeks: MODELS.greeks.bsGreeks
      },
      funnelConfig: cfg
    });
    var rows = mw.AllRows;
    var idx = engine.buildIndex(rows);
    var snapId = engine.computeSnapshotId(mw);
    var cfgHash = UX.configHash(settingsObj);
    var res = engine.run(rows, snapId, cfgHash);
    var pub = {};
    engine.publish(pub);
    var n = pub.__B_symbols.length, computed = 0, kept = 0, hidden = 0;
    for (var i = 0; i < pub.__B_known.length; i++) {
      for (var bit = 0; bit < 8; bit++) {
        var pos = i * 8 + bit;
        if (pos >= n) break;
        if ((pub.__B_known[i] >> bit) & 1) { computed++; if ((pub.__B_bitset[i] >> bit) & 1) kept++; else hidden++; }
      }
    }
    return {
      engine: engine, config: cfg, report: res, snapshotId: snapId, configHash: cfgHash,
      configVersion: pub.__B_configVersion, totalRuns: pub.__B_totalRuns, meta: pub.__B_meta,
      lastError: pub.__B_lastError, pub: pub, symbols: n, computed: computed, kept: kept, hidden: hidden,
      failOpen: n - computed, bitset: pub.__B_bitset.length, elapsedMs: Math.round(((typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now()) - t0)
    };
  }

  // ---------- settings: override > storage > defaults (the owner's own choice) ----------
  function pickSettings() {
    var override = (typeof window !== 'undefined') ? window.__FUNNEL_SETTINGS_OVERRIDE : null;
    if (override && typeof override === 'object') {
      var o = UX.normalizeSettings(override);
      return { settings: o.settings, warnings: o.warnings, source: 'override' };
    }
    var loaded = UX.load((typeof localStorage !== 'undefined') ? localStorage : null);
    if (loaded.source === 'storage' && loaded.warnings.filter(function (w) { return w.reason === 'storage-garbage'; }).length === 0) {
      return { settings: loaded.settings, warnings: loaded.warnings, source: 'storage' };
    }
    return { settings: UX.normalizeSettings(null).settings, warnings: loaded.warnings, source: 'defaults' };
  }

  // ============================== PHASES ==============================
  function phaseDom(next) {
    out.dom = describeDom();
    out.dom.queryWindow = queryWindowFns();
    next();
  }

  // Try each opener in turn. The FIRST one that produces a textarea wins, and the probe
  // records which. If none does, the probe stops: falling back to the console path would
  // recreate exactly the ambiguity this probe exists to remove.
  function phaseOpenDialog(next) {
    var openers = [
      { name: 'QueryWindowEditFilter()', run: function () { return { ok: mw.QueryWindowEditFilter() }; } },
      { name: 'QueryWindowNewFilter()', run: function () { return { ok: mw.QueryWindowNewFilter() }; } },
      { name: 'click an edit-filter control', run: function () { var c = clickMatching(/filter|فیلتر/i, /edit|ویرایش|تغییر/i); return { clicked: c }; } },
      { name: 'click any filter control', run: function () { var c = clickMatching(/filter|فیلتر/i, null); return { clicked: c }; } }
    ];
    var attempts = [];
    var step = 0;
    function tryNext() {
      if (step >= openers.length) {
        out.dialog = { opened: false, attempts: attempts, textAreaFound: !!findCodeTextArea() };
        out.status = 'textarea-unavailable';
        out.path = null;
        out.verdict = 'no opener produced the filter editor textarea, so this probe did NOT run the UI path and did not change anything. Open the filter dialog by hand (the filter/edit control on the market-watch toolbar) and run this probe again - it will then use the textarea. What was tried: ' +
          attempts.map(function (a) { return a.name + (a.error ? ' threw ' + a.error : (a.clicked ? ' clicked ' + a.clicked : ' no effect')); }).join('; ') + '.';
        say(out);
        console.log('A-TEXTAREA-REGISTER: ' + out.verdict);
        return;
      }
      var o = openers[step];
      var rec = { name: o.name };
      try { var r = o.run(); if (r && r.clicked) rec.clicked = r.clicked; } catch (e) { rec.error = String((e && e.message) || e); }
      attempts.push(rec);
      setTimeout(function () {
        if (findCodeTextArea()) {
          openedDialog = true;
          out.dialog = { opened: true, by: o.name, attempts: attempts, textAreaFound: true };
          next();
          return;
        }
        step++;
        tryNext();
      }, POLL_MS);
    }
    tryNext();
  }

  function phaseWriteTextArea(next) {
    var el = findCodeTextArea();
    var nameEl = findNameInput();
    if (!el) {
      out.status = 'textarea-lost';
      out.verdict = 'the textarea disappeared between opening the dialog and writing to it - nothing was registered. Re-run the probe.';
      say(out);
      console.log('A-TEXTAREA-REGISTER: ' + out.verdict);
      return;
    }
    // The body is generated ONCE, at load, and every later comparison is against that
    // same string - regenerating it here would let a non-deterministic generator hide
    // behind a byte comparison that is really comparing two different generations.
    var built = LOOKUP.buildFilterCode();
    var BODY = built.body;
    if (BODY !== BODY_CACHE) out.errors.push('buildFilterCode() is not deterministic: the second generation differs from the first');
    out.body = {
      source: 'TseLookup.buildFilterCode()  (the repo generator, not a literal)',
      bytes: built.bytes, limit: built.limit, fits: built.fits, version: built.version,
      fnv1a: fnv1a(BODY), deterministic: (BODY === BODY_CACHE)
    };
    var before = String(el.value || '');
    el.value = BODY;
    // dispatch input+change so any page-side handler sees the paste, exactly as a real
    // paste would. If the page rewrites the code, the read-back below catches it.
    var dispatched = [];
    ['input', 'change'].forEach(function (type) {
      try {
        var ev = new Event(type, { bubbles: true });
        el.dispatchEvent(ev); dispatched.push(type);
      } catch (e) {
        try { var ev2 = document.createEvent('HTMLEvents'); ev2.initEvent(type, true, true); el.dispatchEvent(ev2); dispatched.push(type + '/legacy'); } catch (e2) {}
      }
    });
    var afterImmediate = String(el.value || '');
    if (nameEl) {
      try { nameEl.value = 'tseZharfaKavosh-A'; } catch (e) { out.errors.push('name field: ' + String((e && e.message) || e)); }
    }
    out.textarea = {
      id: el.id || null, tag: String(el.tagName), maxLength: (el.maxLength === undefined ? null : el.maxLength),
      beforeLen: before.length, writtenLen: BODY.length, readBackLen: afterImmediate.length,
      pageRewroteIt: (afterImmediate !== BODY), eventsDispatched: dispatched,
      nameField: nameEl ? { id: nameEl.id || null, set: true } : null,
      head: afterImmediate.slice(0, 60)
    };
    next();
  }

  function phaseSaveUi(next) {
    var rec = { saveFilter: null, button: null, checkFilter: null };
    try { mw.QueryWindowSaveFilter(); rec.saveFilter = 'called'; }
    catch (e) { rec.saveFilter = 'threw: ' + String((e && e.message) || e); }
    try { rec.button = clickMatching(/save|ذخیره|ثبت|تایید/i, null); } catch (e) { rec.button = 'threw: ' + String((e && e.message) || e); }
    try { mw.QueryWindowCheckFilter(); rec.checkFilter = 'called'; }
    catch (e) { rec.checkFilter = 'threw: ' + String((e && e.message) || e); }
    // What actually landed: every slot that now holds the body, plus the mirror.
    var landed = [];
    if (mw && mw.Settings && mw.Settings.Filters) {
      for (var i = 0; i < mw.Settings.Filters.length; i++) {
        var c = String((mw.Settings.Filters[i] && mw.Settings.Filters[i].FilterCode) || '');
        if (c.length) landed.push({ slot: i, len: c.length, fnv1a: fnv1a(c), isBody: (c === BODY_CACHE) });
      }
    }
    var mirror = String(mw.FilterCode || '');
    // Everything the identity check needs is captured HERE, before any rollback runs.
    // Reading it later would compare the ORIGINAL code against the generated body and
    // report a clean result for a path that never delivered anything.
    out.save = {
      calls: rec,
      slotsHoldingCode: landed,
      activeSlot: (mw && mw.Settings) ? mw.Settings.FilterNo : null,
      mirrorLen: mirror.length, mirrorFnv1a: fnv1a(mirror),
      mirrorIsBody: (mirror === BODY_CACHE),
      anySlotHoldsGenerated: landed.some(function (x) { return x.isBody; })
    };
    next();
  }

  function phaseEngine(next) {
    var picked = pickSettings();
    var d = UX.describe(picked.settings);
    out.settings = {
      source: picked.source, hash: d.hash, changedCount: d.changedCount, isDefault: d.isDefault,
      changed: d.changed, warnings: picked.warnings, storageKey: UX.STORAGE_KEY
    };
    P = engineRun(picked.settings);
    install(P.pub.__B_index, P.pub.__B_known, P.pub.__B_bitset, 'textarea-path');
    out.engine = {
      version: ENG.VERSION, settingsSource: picked.source, funnelConfig: P.config,
      snapshotId: P.snapshotId, configHash: P.configHash,
      configHashSource: 'TseFunnelSettings.configHash(settings)'
    };
    out.projection = {
      symbols: P.symbols, bitsetBytes: P.bitset,
      engineVerdicts: { total: P.symbols, computed: P.computed, kept: P.kept, hidden: P.hidden, failOpen: P.failOpen }
    };
    next();
  }

  function phaseExecute(next) {
    resetTally();
    var rendered = doRender();
    setTimeout(function () {
      var t = P.tally;
      // expected, restricted to the rows the site actually evaluated
      var pop = population();
      var expected = { keep: 0, hide: 0, failOpen: 0 };
      for (var i = 0; i < pop.codes.length; i++) {
        var c = pop.codes[i];
        if (P.tally.perInscode[c] === undefined) continue;      // never rendered by the page
        expected[verdictOf(c, P.pub.__B_index, P.pub.__B_known, P.pub.__B_bitset)]++;
      }
      out.execute = {
        renderCalled: rendered,
        tally: tallyReport(t),
        expectedVerdicts: expected,
        verdictsMatchProjection: (t.verdicts.keep === expected.keep && t.verdicts.hide === expected.hide && t.verdicts.failOpen === expected.failOpen),
        evaluated: Object.keys(t.distinct).length,
        coverage: {
          engineSymbols: P.symbols, evaluatedBySite: Object.keys(t.distinct).length,
          pctOfAllRows: (mw && mw.AllRows) ? Math.round(1000 * Object.keys(t.distinct).length / Object.keys(mw.AllRows).length) / 10 : null
        }
      };
      finish();
    }, RENDER_WAIT);
  }

  function finish() {
    out.rollback.restore = restoreState();
    out.rollback.renderCalled = doRender();
    out.rollback.slotRestored = (mw && mw.Settings && mw.Settings.Filters && savedFilterNo !== null &&
      String((mw.Settings.Filters[savedFilterNo] && mw.Settings.Filters[savedFilterNo].FilterCode) || '') === (savedFilters[savedFilterNo] || ''));
    out.rollback.mirrorRestored = (String(mw.FilterCode || '') === savedFilterCode);
    out.rollback.cleaned = true;
    var i;
    for (i in mw) { if (mw.hasOwnProperty(i) && i.indexOf('__B_') === 0) { out.rollback.cleaned = false; break; } }
    out.rollback.textAreaRestored = savedTextAreaExisted;
    out.rollback.openedDialog = openedDialog;
    // If this probe opened the dialog it cannot close it again, so the owner must know
    // the editor is still on screen - and must know the fields were emptied first.
    out.rollback.dialogLeftOpen = openedDialog && !savedTextAreaExisted;
    out.rollback.editorFieldsEmptied = (out.rollback.restore && out.rollback.restore.textAreaCleared) || savedTextAreaExisted;

    // THE identity: did the code the UI path saved equal the code the repo generated?
    // This reads what phaseSaveUi captured, NOT the current state - by this point
    // restoreState() has already put the owner's original code back, and comparing that
    // against the generated body would be comparing the wrong two strings entirely.
    out.identity = {
      generatedBytes: out.body.bytes, generatedFnv1a: out.body.fnv1a,
      textAreaReadBackLen: out.textarea.readBackLen,
      pageRewroteIt: out.textarea.pageRewroteIt,
      mirrorEqualsGenerated: out.save.mirrorIsBody,
      anySlotHoldsGenerated: out.save.anySlotHoldsGenerated,
      slotsHoldingGenerated: out.save.slotsHoldingCode.filter(function (x) { return x.isBody; }).map(function (x) { return x.slot; })
    };

    var t = out.execute.tally;
    var parts = [];
    parts.push('the code reached the page through the TEXTAREA path (dialog opened by ' + out.dialog.by + ')');
    parts.push('the repo-generated body is ' + out.body.bytes + ' bytes (fnv1a ' + out.body.fnv1a + ')');
    parts.push(out.identity.pageRewroteIt
      ? 'THE PAGE REWROTE THE CODE IN THE TEXTAREA (' + out.body.bytes + ' -> ' + out.identity.textAreaReadBackLen + ' bytes), which is a finding about the editor, not a failure'
      : 'the textarea held the body unchanged');
    parts.push(out.identity.mirrorEqualsGenerated
      ? 'after the UI save, mw.FilterCode is byte-identical to the generated body'
      : 'after the UI save, mw.FilterCode is NOT the generated body (' + out.save.mirrorLen + ' bytes, fnv1a ' + out.save.mirrorFnv1a + ')');
    parts.push(t.distinctCount === 0
      ? 'on the page the code read ZERO rows, so nothing above is evidence that it ran at all - a mangled body throws before it reaches mw.__B_index and the site hides the row (fail-closed, E-061)'
      : 'on the page the code read ' + t.distinctCount + ' distinct rows and produced ' +
        t.verdicts.keep + ' keep / ' + t.verdicts.hide + ' hide / ' + t.verdicts.failOpen +
        ' fail-open against the projection verdicts ' + out.execute.expectedVerdicts.keep + ' / ' +
        out.execute.expectedVerdicts.hide + ' / ' + out.execute.expectedVerdicts.failOpen +
        ' over the same ' + t.distinctCount + ' rendered rows');

    // Every applicable reason is reported, in priority order, rather than only the first
    // one that matches. A run can fail for several reasons at once - the harness's
    // "transformed" scenario both fails to deliver the body AND never executes - and
    // picking one would hide the other. Rollback comes first because it is the only
    // failure that damages the owner's page.
    var reasons = [];
    if (!out.rollback.slotRestored || !out.rollback.mirrorRestored || !out.rollback.cleaned) {
      reasons.push('ROLLBACK INCOMPLETE');
    }
    if (!out.identity.anySlotHoldsGenerated && !out.identity.mirrorEqualsGenerated) {
      reasons.push('THE UI PATH DID NOT DELIVER THE CODE');
    }
    if (t.distinctCount === 0) {
      // the E-061/E-065 vacuous-success rule: a match over zero rows is not a match
      reasons.push('THE CODE DID NOT RUN');
    } else if (!out.execute.verdictsMatchProjection) {
      reasons.push('THE CODE RAN BUT ITS VERDICTS DIFFER FROM THE PROJECTION');
    }
    if (reasons.length) {
      out.status = 'failed-check';
      parts.unshift(reasons.join(' + ') + ':');
    } else {
      out.status = 'textarea-registered-live';
    }
    out.path = 'textarea';
    out.verdict = parts.join('. ') + '.';
    say(out);
    console.log('A-TEXTAREA-REGISTER: ' + out.verdict);
    console.log('  dialog=' + out.dialog.by + ' textarea=' + out.textarea.id + ' ' + out.textarea.readBackLen + 'B' +
      ' mirror=' + out.save.mirrorLen + 'B(' + out.save.mirrorFnv1a + ')' +
      ' generated=' + out.body.bytes + 'B(' + out.body.fnv1a + ')' +
      ' identical=' + out.identity.mirrorEqualsGenerated);
    console.log('  EXECUTE: reads=' + t.reads + ' distinct=' + t.distinctCount +
      ' verdicts=' + JSON.stringify(t.verdicts) + ' match=' + out.execute.verdictsMatchProjection);
    console.log('  ROLLBACK: slot=' + out.rollback.slotRestored + ' mirror=' + out.rollback.mirrorRestored +
      ' cleaned=' + out.rollback.cleaned + ' textarea=' + out.rollback.textAreaRestored);
  }

  // The generated body is needed by phaseSaveUi and finish, so it is produced once here.
  var BODY_CACHE = (function () { try { return LOOKUP.buildFilterCode().body; } catch (e) { return null; } })();

  // ============================== the chain ==============================
  snapshotState();
  phaseDom(function () {
    phaseOpenDialog(function () {
      phaseWriteTextArea(function () {
        phaseSaveUi(function () {
          phaseEngine(function () {
            phaseExecute();
          });
        });
      });
    });
  }
  );
})();
