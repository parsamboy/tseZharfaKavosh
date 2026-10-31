/**
 * tseZharfaKavosh — run the SELF-CONTAINED program through the TEXTAREA, live  v1
 *
 * TEMPLATE. tools/buildProgramProbe.v1.js injects build/filterProgram.v1.js and writes
 * RUN_ME.js at the repository root - the ONLY file in this repo meant to be pasted into
 * the page. The template is not runnable on its own; the generated file is.
 *
 * WHY THIS EXISTS (owner, 2026-10-24, decision "self_contained")
 *   The owner asked for the whole program in ONE paste in the filter textarea: no console
 *   step, and it survives a reload. build/filterProgram.v1.js is that paste (51,720 bytes:
 *   the engine, the models, the UX settings layer and the per-row lookup). Everything
 *   proven about it so far is NODE-SIDE. This probe asks the only question that matters
 *   for the product: does that one paste actually work on the live page?
 *
 * THE SAFETY GATE — this is why the probe exists before anything else
 *   The site runs the pasted code through PrepareFilterCode(), its own DSL compiler with
 *   61 .replace() rules that map `(field)` shorthand to row["field"] (E-056). Only three
 *   of those 61 rules were ever recorded. If any of the other 58 has a target inside our
 *   51 KB body, the body is rewritten - and a rewrite inside a call expression is a syntax
 *   error, which the site turns into `FilterResult=false`, i.e. IT HIDES EVERY ROW.
 *   So the FIRST thing this probe does is run the site's own PrepareFilterCode over the
 *   whole body and compare it byte for byte. If it differs, the probe registers NOTHING,
 *   changes NOTHING, and says exactly where the first difference is.
 *
 * WHAT IT DOES, IN ORDER
 *   0. GATE: mw.PrepareFilterCode(BODY) === BODY ? If not: stop, report, touch nothing.
 *   1. recon: the filter DOM, which QueryWindow* functions exist, the textarea's maxLength
 *      and the size of the code already sitting in the owner's active slot.
 *   2. open the dialog through the ranked opener ladder (the E-073 path). If none works it
 *      STOPS - it never falls back to a console write.
 *   3. write the program into #InputFilterCode, dispatching input+change, and read it back.
 *   4. save through the UI: QueryWindowSaveFilter(), the save button, QueryWindowCheckFilter().
 *   5. read back what actually landed in the slot AND the mirror, byte for byte.
 *   6. boot: one RenderData, then wait for the program's own background tick to publish.
 *      The probe then DISARMS the tick (window.__TSE_SCHED.arm = noop) so that the
 *      measurement below cannot be disturbed by a re-publish, and snapshots the program's
 *      own state: ticks, runs, fingerprint, lastError.
 *   7. execute: install the tallying Proxy over the projection the PROGRAM published, run
 *      RenderData again, and read the verdicts the body actually produced per row - plus
 *      the first/last read timestamps, so the per-row cost is measured rather than assumed.
 *   8. cross-check: for every rendered row, compare the body's verdict against
 *      TseLookup.evaluateRow on the same projection. Two independent paths to the same
 *      answer, so a wiring mistake cannot pass.
 *   9. roll back everything: slot, mirror, FilterNo, the textarea's original value, the
 *      persisted storage, and the program's own page state.
 *
 * PREREQUISITE: none. The program is self-contained; that is the point of it.
 *
 * RUN HERE (always): old.tsetmc.com/Loader.aspx?ParTree=15131F  ->  Console (F12)
 *   tag: [کنسول] — this ONE file, nothing else. It opens the filter dialog itself.
 *   Send back the single PROBE_JSON line.
 *
 * SPDX-License-Identifier: Smart-FFA-1.1
 */
(function aProgramLive() {
  'use strict';

  // E-058: RenderData is not synchronous with respect to the filter - the body starts
  // running about 1.25s after the call returns. Wait well past that.
  var RENDER_WAIT = 2600;
  var POLL_MS = 260;
  var BOOT_WAIT = 3000;
  var out = {
    meta: {
      test: 'A-PROGRAM-LIVE-v1', gate: 'G-32', evidenceId: 'E-075',
      host: (typeof location !== 'undefined') ? location.host : 'unknown',
      parTree: '15131F', capturedAt: new Date().toISOString(),
      method: 'the site own PrepareFilterCode is run over the whole self-contained body FIRST and compared byte for byte (the safety gate), then the body is written into the filter editor textarea and saved through the UI path, the program is booted by one RenderData and its own background tick, the tick is disarmed, the per-row verdicts are read through a tallying Proxy and cross-checked against TseLookup.evaluateRow, and everything is rolled back'
    },
    preflight: {}, gate: {}, dom: {}, dialog: {}, textarea: {}, save: {}, identity: {},
    boot: {}, execute: {}, crossCheck: {}, body: {}, rollback: {},
    errors: [], status: 'unknown', verdict: '', path: null
  };

  var mw = (typeof window !== 'undefined') ? window.mw : null;
  if (!mw) {
    out.status = 'no-page-object';
    out.verdict = 'window.mw is not on this page - open the market watch (ParTree 15131F) and run this probe there. Nothing was changed.';
    say(out); return;
  }

  // ---------- the program, embedded verbatim by the builder ----------
  // tools/buildProgramProbe.v1.js replaces the single token below with the contents of
  // build/filterProgram.v1.js as a JSON string literal, so no escaping can go wrong.
  // The token is unique in this file; the build fails if it is not found exactly once.
  var BODY = '__TSE_PROGRAM_BODY__';

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
    try { if (typeof window !== 'undefined' && window.jQuery) { var r = window.jQuery(sel); if (r && r.length) return r[0]; } } catch (e) {}
    return null;
  }
  function firstDiff(a, b) {
    var n = Math.min(a.length, b.length);
    for (var i = 0; i < n; i++) if (a.charCodeAt(i) !== b.charCodeAt(i)) return i;
    return a.length === b.length ? -1 : n;
  }

  out.preflight = {
    bundle: {
      engine: !!window.TseBEngine, models: !!window.TseModels,
      lookup: !!window.TseLookup, settings: !!window.TseFunnelSettings
    },
    programAlreadyOnPage: !!window.__TSE_PROGRAM,
    jquery: !!(typeof window !== 'undefined' && window.jQuery),
    prepareFilterCode: (typeof mw.PrepareFilterCode === 'function') ? 'fn/' + mw.PrepareFilterCode.length : 'absent'
  };

  if (typeof BODY !== 'string' || !BODY.length) {
    out.status = 'no-body';
    out.verdict = 'the program body was not injected into this probe - run tools/buildProgramProbe.v1.js first. Nothing was changed.';
    say(out); return;
  }

  // ==========================================================================
  // PHASE 0 — THE SAFETY GATE. Nothing is registered until this passes.
  // ==========================================================================
  function phaseGate(next) {
    if (typeof mw.PrepareFilterCode !== 'function') {
      out.gate = { ran: false, reason: 'PrepareFilterCode is not a function on this page' };
      out.status = 'gate-unavailable';
      out.verdict = 'mw.PrepareFilterCode is not available, so the site DSL compiler could not be ruled out. The probe did NOT register anything, because an unverified rewrite is exactly the failure that hides every row. Nothing was changed.';
      say(out); return;
    }
    var compiled = null, threw = null;
    try { compiled = mw.PrepareFilterCode(BODY); } catch (e) { threw = String((e && e.message) || e); }
    var ok = (typeof compiled === 'string') && (compiled === BODY);
    var d = (typeof compiled === 'string') ? firstDiff(BODY, compiled) : null;
    out.gate = {
      ran: true, threw: threw,
      inputBytes: BODY.length,
      outputBytes: (typeof compiled === 'string') ? compiled.length : null,
      outputFnv1a: (typeof compiled === 'string') ? fnv1a(compiled) : null,
      identical: ok,
      firstDiffAt: d,
      inputFnv1a: fnv1a(BODY)
    };
    if (!ok) {
      out.status = 'prepare-filter-code-changed';
      out.verdict = 'STOPPED BEFORE REGISTERING ANYTHING. The site own PrepareFilterCode rewrote the program body (' +
        out.gate.inputBytes + ' -> ' + out.gate.outputBytes + ' bytes, first difference at offset ' + d + '). ' +
        'The site hides EVERY row when the filter code throws (fail-closed, E-061), so registering a rewritten ' +
        'body would empty the owner market watch. Nothing was registered and nothing was changed. ' +
        'The fix is to make the body contain no site shorthand, then re-run.';
      say(out);
      console.log('A-PROGRAM-LIVE: ' + out.verdict);
      return;
    }
    next();
  }

  // ---------- rollback state ----------
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
  // Close the filter dialog the probe opened, so the page is left as it was found. The site
  // gives no QueryWindow*Close, so try the controls a real user would use, in order, and
  // report which one worked. Returns null when the dialog was not open in the first place.
  function closeDialog() {
    if (typeof document === 'undefined') return null;
    var ta = document.getElementById('InputFilterCode');
    if (!ta) return null;                       // the dialog is not open, nothing to do
    var tried = [];
    function attempt(label, el) {
      if (!el) return false;
      tried.push(label);
      try { el.click(); } catch (e) { return false; }
      return !document.getElementById('InputFilterCode');
    }
    // 1. a control whose text or class says it closes
    var closers = document.querySelectorAll(
      '#ModalWindowInner1 .close, #ModalWindowInner1 [data-dismiss], #ModalWindowInner1 button, #ModalWindowInner1 a, .close, [data-dismiss]');
    for (var i = 0; i < closers.length; i++) {
      var el = closers[i];
      var txt = String((el.textContent || '') + ' ' + (el.className || '') + ' ' + (el.getAttribute && el.getAttribute('aria-label') || ''));
      if (/بستن|انصراف|Cancel|close/i.test(txt)) {
        if (attempt('control:' + txt.trim().slice(0, 24), el)) return 'control:' + txt.trim().slice(0, 24);
      }
    }
    // 2. Escape, the way a user would dismiss a modal
    try {
      var target = document.getElementById('ModalWindowInner1') || ta;
      ['keydown', 'keyup'].forEach(function (type) {
        var ev = new KeyboardEvent(type, { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true });
        target.dispatchEvent(ev);
      });
      tried.push('escape');
      if (!document.getElementById('InputFilterCode')) return 'escape';
    } catch (e) {}
    // 3. the overlay the site uses to host the modal
    var outer = document.getElementById('ModalWindowOuter1');
    if (outer) {
      try {
        outer.style.display = 'none';
        outer.setAttribute('style', 'display:none');
        tried.push('overlay-hidden');
        if (!document.getElementById('InputFilterCode')) return 'overlay-hidden';
      } catch (e) {}
    }
    return null;
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
      var ta = findCodeTextArea(), nameEl = findNameInput();
      if (ta) {
        ta.value = (savedTextAreaExisted && savedTextArea) ? savedTextArea.value : '';
        try { ta.dispatchEvent(new Event('input', { bubbles: true })); } catch (e) {}
        try { ta.dispatchEvent(new Event('change', { bubbles: true })); } catch (e) {}
      }
      if (nameEl) nameEl.value = '';
      // The probe opened this dialog itself, so leaving it open is a change to the owner's
      // page. E-077 left it open - everything else rolled back, but a probe that opens a
      // modal must close it again. Best effort: an explicit close control first, then Escape,
      // then the modal overlay the site uses.
      var closedBy = closeDialog();
      for (var k in mw) { if (mw.hasOwnProperty(k) && k.indexOf('__B_') === 0) delete mw[k]; }
      // the program's own page state must go too, or the owner keeps a half-live program
      try { delete window.__TSE_PROGRAM; } catch (e) {}
      try { delete window.__TSE_SCHED; } catch (e) {}
      if (mw && typeof mw.SaveParams === 'function') mw.SaveParams();
      return { restored: true, filterNo: savedFilterNo, filters: savedFilters.length,
        textAreaRestored: savedTextAreaExisted, textAreaCleared: !!ta && !savedTextAreaExisted,
        nameFieldCleared: !!nameEl, programStateRemoved: (!window.__TSE_PROGRAM && !window.__TSE_SCHED),
        dialogClosedBy: closedBy };
    } catch (e) { return { restored: false, error: String((e && e.message) || e) }; }
  }

  // ---------- the filter DOM ----------
  function findCodeTextArea() {
    if (typeof document === 'undefined') return null;
    var el = document.getElementById('InputFilterCode') || jq('#InputFilterCode');
    if (el && String(el.tagName).toUpperCase() === 'TEXTAREA') return el;
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
    var d = { textareas: [], hasInputFilterCode: false, hasInputFilterName: false };
    if (typeof document === 'undefined') { d.note = 'no document'; return d; }
    d.hasInputFilterCode = !!(document.getElementById('InputFilterCode') || jq('#InputFilterCode'));
    d.hasInputFilterName = !!(document.getElementById('InputFilterName') || jq('#InputFilterName'));
    var tas = document.getElementsByTagName('textarea');
    for (var t = 0; t < tas.length && d.textareas.length < 10; t++) {
      var e = tas[t];
      d.textareas.push({ id: e.id || null, name: e.name || null, valueLen: String(e.value || '').length,
        maxLength: (e.maxLength === undefined ? null : e.maxLength), visible: !!(e.offsetParent || e.offsetHeight) });
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
      'QueryWindowCheckFilter', 'SelectFilter', 'PrepareFilterCode', 'SaveParams', 'RenderData'];
    var r = {};
    for (var i = 0; i < names.length; i++) r[names[i]] = (mw && typeof mw[names[i]] === 'function') ? 'fn/' + mw[names[i]].length : 'absent';
    return r;
  }

  // ==========================================================================
  // PHASES 1-5 — the proven textarea path (E-073), unchanged in shape
  // ==========================================================================
  function phaseDom(next) {
    out.dom = describeDom();
    out.dom.queryWindow = queryWindowFns();
    out.dom.ownerActiveSlot = (mw && mw.Settings && savedFilterNo !== null && mw.Settings.Filters[savedFilterNo])
      ? { slot: savedFilterNo, bytes: String(mw.Settings.Filters[savedFilterNo].FilterCode || '').length } : null;
    next();
  }

  function phaseOpenDialog(next) {
    var openers = [
      { name: 'QueryWindowEditFilter()', run: function () { return { ok: mw.QueryWindowEditFilter() }; } },
      { name: 'QueryWindowNewFilter()', run: function () { return { ok: mw.QueryWindowNewFilter() }; } },
      { name: 'click an edit-filter control', run: function () { var c = clickMatching(/filter|فیلتر/i, /edit|ویرایش|تغییر/i); return { clicked: c }; } },
      { name: 'click any filter control', run: function () { var c = clickMatching(/filter|فیلتر/i, null); return { clicked: c }; } }
    ];
    var attempts = [], step = 0;
    function tryNext() {
      if (step >= openers.length) {
        out.dialog = { opened: false, attempts: attempts, textAreaFound: !!findCodeTextArea() };
        out.status = 'textarea-unavailable';
        out.verdict = 'no opener produced the filter editor textarea, so this probe did NOT run the UI path and did not change anything. Open the filter dialog by hand (the filter/edit control on the market-watch toolbar) and run this probe again. What was tried: ' +
          attempts.map(function (a) { return a.name + (a.error ? ' threw ' + a.error : (a.clicked ? ' clicked ' + a.clicked : ' no effect')); }).join('; ') + '.';
        say(out);
        console.log('A-PROGRAM-LIVE: ' + out.verdict);
        return;
      }
      var o = openers[step], rec = { name: o.name };
      try { var r = o.run(); if (r && r.clicked) rec.clicked = r.clicked; } catch (e) { rec.error = String((e && e.message) || e); }
      attempts.push(rec);
      setTimeout(function () {
        if (findCodeTextArea()) {
          openedDialog = true;
          out.dialog = { opened: true, by: o.name, attempts: attempts, textAreaFound: true };
          next(); return;
        }
        step++; tryNext();
      }, POLL_MS);
    }
    tryNext();
  }

  function phaseWriteTextArea(next) {
    var el = findCodeTextArea(), nameEl = findNameInput();
    if (!el) {
      out.status = 'textarea-lost';
      out.verdict = 'the textarea disappeared between opening the dialog and writing to it - nothing was registered. Re-run the probe.';
      say(out); return;
    }
    var before = String(el.value || '');
    el.value = BODY;
    var dispatched = [];
    ['input', 'change'].forEach(function (type) {
      try { el.dispatchEvent(new Event(type, { bubbles: true })); dispatched.push(type); }
      catch (e) {
        try { var ev2 = document.createEvent('HTMLEvents'); ev2.initEvent(type, true, true); el.dispatchEvent(ev2); dispatched.push(type + '/legacy'); } catch (e2) {}
      }
    });
    var afterImmediate = String(el.value || '');
    if (nameEl) { try { nameEl.value = 'tseZharfaKavosh-program'; } catch (e) { out.errors.push('name field: ' + String((e && e.message) || e)); } }
    out.textarea = {
      id: el.id || null, tag: String(el.tagName), maxLength: (el.maxLength === undefined ? null : el.maxLength),
      beforeLen: before.length, writtenLen: BODY.length, readBackLen: afterImmediate.length,
      pageRewroteIt: (afterImmediate !== BODY), eventsDispatched: dispatched,
      nameField: nameEl ? { id: nameEl.id || null, set: true } : null
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
    var landed = [];
    if (mw && mw.Settings && mw.Settings.Filters) {
      for (var i = 0; i < mw.Settings.Filters.length; i++) {
        var c = String((mw.Settings.Filters[i] && mw.Settings.Filters[i].FilterCode) || '');
        if (c.length) landed.push({ slot: i, len: c.length, fnv1a: fnv1a(c), isBody: (c === BODY) });
      }
    }
    var mirror = String(mw.FilterCode || '');
    out.save = {
      calls: rec, slotsHoldingCode: landed,
      activeSlot: (mw && mw.Settings) ? mw.Settings.FilterNo : null,
      mirrorLen: mirror.length, mirrorFnv1a: fnv1a(mirror), mirrorIsBody: (mirror === BODY),
      anySlotHoldsGenerated: landed.some(function (x) { return x.isBody; })
    };
    next();
  }

  // ==========================================================================
  // PHASE 6 — boot the program and disarm its tick
  // ==========================================================================
  function phaseBoot(next) {
    doRender();
    var waited = 0;
    (function poll() {
      var st = window.__TSE_SCHED && window.__TSE_SCHED.state;
      if (st && st.runs >= 1) {
        // DISARM. The program re-arms its tick from inside the per-row code, so unless the
        // tick is stopped here it will re-publish the projection underneath the tallying
        // Proxy installed in the next phase and the measurement would be silently blind.
        try { window.__TSE_SCHED.arm = function () {}; } catch (e) { out.errors.push('disarm: ' + String((e && e.message) || e)); }
        out.boot = {
          waitedMs: waited,
          program: !!window.__TSE_PROGRAM,
          schedState: { ticks: st.ticks, runs: st.runs, fp: st.fp, cfgHash: st.cfgHash, lastError: st.lastError },
          published: {
            index: !!mw.__B_index, known: !!mw.__B_known, bitset: !!mw.__B_bitset,
            snapshotId: mw.__B_snapshotId, configHash: mw.__B_configHash, totalRuns: mw.__B_totalRuns
          },
          engineOnPage: { engine: !!window.TseBEngine, models: !!window.TseModels, lookup: !!window.TseLookup, settings: !!window.TseFunnelSettings },
          disarmed: (typeof window.__TSE_SCHED.arm === 'function')
        };
        next(); return;
      }
      waited += POLL_MS;
      if (waited > BOOT_WAIT) {
        var st2 = window.__TSE_SCHED && window.__TSE_SCHED.state;
        out.boot = { waitedMs: waited, timedOut: true, program: !!window.__TSE_PROGRAM,
          schedState: st2 ? { ticks: st2.ticks, runs: st2.runs, lastError: st2.lastError } : null };
        // DIAGNOSE, do not guess. window.__TSE_PROGRAM is unset, so the body did not install.
        // That is either because the site never evaluated the filter code after the UI save
        // (a trigger defect - E-073 proved it does evaluate) or because the 51,719-byte body
        // was evaluated and threw (a body defect - the site is fail-closed on exception, so
        // every row would be hidden). A three-line sentinel body separates them: it can
        // neither be size-related nor syntax-related. The owner's code is put back straight
        // after, and the rollback that follows restores the slot regardless.
        try {
          window.__TSE_SENTINEL_RAN = 0;
          var savedFilterCode = mw.FilterCode;
          mw.FilterCode = 'window.__TSE_SENTINEL_RAN++; true;';
          doRender();
          out.boot.sentinelRuns = window.__TSE_SENTINEL_RAN;
          mw.FilterCode = savedFilterCode;
          // and once more with the real body, to see whether the site evaluates it and what
          // a throw would look like: the site swallows the exception, so we cannot read it
          // directly - but a second sentinel AFTER the real body tells us whether the site
          // kept going.
          mw.FilterCode = BODY;
          doRender();
          out.boot.bodyThenSentinel = window.__TSE_SENTINEL_RAN;
          out.boot.bodyThrewEvidence = {
            programAfter: !!window.__TSE_PROGRAM,
            lastError: (window.__TSE_SCHED && window.__TSE_SCHED.state && window.__TSE_SCHED.state.lastError) || null
          };
        } catch (e) { out.errors.push('sentinel diagnosis: ' + String((e && e.message) || e)); }
        // ROLL BACK ANYWAY. The program is already sitting in the owner's slot and mirror
        // at this point, so bailing out here without restoring would leave code the owner
        // never chose registered on their page. The first version of this probe returned
        // straight after say(), which is exactly what the harness caught.
        finish();
        return;
      }
      setTimeout(poll, POLL_MS);
    })();
  }

  // ==========================================================================
  // PHASE 7 — the per-row verdicts, read the way the body reads them
  // ==========================================================================
  var T = null;
  function verdictOf(inscode, index, known, bits) {
    var pos = index[inscode];
    if (pos === undefined) return 'failOpen';
    var b = pos >> 3, m = pos & 7;
    if (b < 0 || b >= known.length) return 'failOpen';
    if (b >= bits.length) return 'failOpen';       // the E-074 short-bitset hole
    if (!((known[b] >> m) & 1)) return 'failOpen';
    return ((bits[b] >> m) & 1) ? 'keep' : 'hide';
  }
  var NOT_A_LOOKUP = { length: 1, name: 1, toString: 1, valueOf: 1, constructor: 1,
    prototype: 1, hasOwnProperty: 1, isPrototypeOf: 1, propertyIsEnumerable: 1,
    toLocaleString: 1, __proto__: 1, then: 1, catch: 1, inspect: 1, nodeType: 1,
    $$typeof: 1, undefined: 1 };
  function isLookup(k) { return (typeof k === 'string') && k.length > 0 && NOT_A_LOOKUP[k] !== 1; }
  function installTally() {
    var index = mw.__B_index, known = mw.__B_known, bits = mw.__B_bitset;
    var tally = { reads: 0, distinct: {}, perInscode: {}, sample: [], verdicts: { keep: 0, hide: 0, failOpen: 0 },
      byteReads: 0, firstReadAt: null, lastReadAt: null };
    function own(t, k) { return (typeof k === 'string') && Object.prototype.hasOwnProperty.call(t, k); }
    function isByte(t, k) {
      if (!own(t, k) || !/^\d+$/.test(k)) return false;
      var v = +k; return (v >= 0 && v < t.length);
    }
    var now = function () { return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now(); };
    var pIndex = new Proxy(index, {
      get: function (t, k) {
        if (isLookup(k)) {
          var code = String(k);
          tally.reads++;
          if (tally.firstReadAt === null) tally.firstReadAt = now();
          tally.lastReadAt = now();
          if (tally.distinct[code] === undefined) {
            tally.distinct[code] = true;
            var v = verdictOf(code, index, known, bits);
            tally.perInscode[code] = v;
            tally.verdicts[v]++;
            if (tally.sample.length < 12) tally.sample.push({ inscode: code, pos: t[k], verdict: v });
          }
        }
        return t[k];
      }
    });
    var pKnown = new Proxy(known, { get: function (t, k) { if (isByte(t, k)) tally.byteReads++; return t[k]; } });
    var pBits = new Proxy(bits, { get: function (t, k) { if (isByte(t, k)) tally.byteReads++; return t[k]; } });
    mw.__B_index = pIndex; mw.__B_known = pKnown; mw.__B_bitset = pBits;
    return tally;
  }
  function phaseExecute(next) {
    T = installTally();
    doRender();
    setTimeout(function () {
      var t = T;
      var span = (t.firstReadAt !== null && t.lastReadAt !== null) ? (t.lastReadAt - t.firstReadAt) : null;
      var perRowUs = (span !== null && Object.keys(t.distinct).length > 1)
        ? Math.round(1000 * span / Object.keys(t.distinct).length) / 1000 : null;
      out.execute = {
        renderCalled: true,
        reads: t.reads, distinctCount: Object.keys(t.distinct).length,
        verdicts: t.verdicts, byteReads: t.byteReads,
        sample: t.sample.slice(0, 8),
        firstReadAtMs: t.firstReadAt, lastReadAtMs: t.lastReadAt, spanMs: span,
        perRowUs: perRowUs,
        coverage: {
          allRows: (mw && mw.AllRows) ? Object.keys(mw.AllRows).length : null,
          evaluatedBySite: Object.keys(t.distinct).length,
          pctOfAllRows: (mw && mw.AllRows && Object.keys(t.distinct).length)
            ? Math.round(1000 * Object.keys(t.distinct).length / Object.keys(mw.AllRows).length) / 10 : null
        }
      };
      next();
    }, RENDER_WAIT);
  }

  // ==========================================================================
  // PHASE 8 — cross-check the body against the reference implementation
  // ==========================================================================
  function phaseCrossCheck(next) {
    var LOOKUP = window.TseLookup;
    if (!LOOKUP || typeof LOOKUP.evaluateRow !== 'function') {
      out.crossCheck = { ran: false, reason: 'TseLookup.evaluateRow is not on the page' };
      next(); return;
    }
    var index = mw.__B_index, known = mw.__B_known, bits = mw.__B_bitset;
    var raw = { index: index, known: known, bitset: bits };
    // unwrap the Proxy: evaluateRow wants the real arrays
    var pub = { index: raw.index, known: raw.known, bitset: raw.bitset, ok: true };
    // Compare the DECISION, not the class. evaluateRow returns a boolean, so it cannot
    // express "fail-open": a fail-open row returns true, exactly as a keep row does. The
    // first version of this check mapped true -> 'keep' and then compared classes, so all
    // 48 fail-open rows disagreed and the probe reported a finding on a correct program.
    // What the two paths must agree on is whether the row is HIDDEN.
    var agree = 0, disagree = 0, bodyFailOpen = 0, moduleFailOpen = 0, samples = [];
    var codes = Object.keys(T.distinct);
    for (var i = 0; i < codes.length; i++) {
      var code = codes[i];
      var cls = T.perInscode[code];
      var bodyHides = (cls === 'hide');
      var moduleVerdict = LOOKUP.evaluateRow({ inscode: code }, pub);
      var moduleHides = (moduleVerdict === false);
      if (cls === 'failOpen') bodyFailOpen++;
      if (moduleVerdict === true) moduleFailOpen++;
      if (bodyHides === moduleHides) agree++;
      else {
        disagree++;
        if (samples.length < 8) samples.push({ inscode: code, bodyClass: cls, bodyHides: bodyHides, moduleHides: moduleHides });
      }
    }
    out.crossCheck = {
      ran: true, compared: codes.length, agree: agree, disagree: disagree,
      bodyFailOpen: bodyFailOpen, samples: samples,
      note: 'the body and TseLookup.evaluateRow on the SAME published projection must agree on whether the row is HIDDEN (evaluateRow returns a boolean, so keep and fail-open are the same answer to it)'
    };
    next();
  }

  // ==========================================================================
  // PHASE 9 — rollback and verdict
  // ==========================================================================
  function finish() {
    // Defensive: the program-did-not-boot path reaches finish() without ever running
    // phaseExecute or phaseCrossCheck, so those objects are still the empty {} the probe
    // was initialised with. Reading them unconditionally would throw here - and an
    // exception in the rollback path is the one place a probe must never throw, because it
    // is the only thing standing between the owner and a filter they did not choose.
    if (!out.execute || typeof out.execute.distinctCount !== 'number') {
      out.execute = { renderCalled: false, distinctCount: 0, verdicts: { keep: 0, hide: 0, failOpen: 0 },
        reads: 0, byteReads: 0, sample: [], perRowUs: null, coverage: { allRows: null, evaluatedBySite: 0, pctOfAllRows: null } };
    }
    if (!out.crossCheck || typeof out.crossCheck.ran !== 'boolean') {
      out.crossCheck = { ran: false, reason: 'the program never booted, so there was nothing to cross-check' };
    }
    out.rollback.restore = restoreState();
    out.rollback.renderCalled = doRender();
    out.rollback.slotRestored = (mw && mw.Settings && mw.Settings.Filters && savedFilterNo !== null &&
      String((mw.Settings.Filters[savedFilterNo] && mw.Settings.Filters[savedFilterNo].FilterCode) || '') === (savedFilters[savedFilterNo] || ''));
    out.rollback.mirrorRestored = (String(mw.FilterCode || '') === savedFilterCode);
    out.rollback.textAreaRestored = savedTextAreaExisted;
    out.rollback.openedDialog = openedDialog;
    var closedBy = out.rollback.restore && out.rollback.restore.dialogClosedBy;
    out.rollback.dialogLeftOpen = openedDialog && !savedTextAreaExisted && !closedBy;
    out.rollback.dialogClosedBy = closedBy;
    out.rollback.editorFieldsEmptied = (out.rollback.restore && out.rollback.restore.textAreaCleared) || savedTextAreaExisted;
    out.identity = {
      generatedBytes: BODY.length, generatedFnv1a: fnv1a(BODY),
      textAreaReadBackLen: out.textarea.readBackLen, pageRewroteIt: out.textarea.pageRewroteIt,
      mirrorEqualsGenerated: out.save.mirrorIsBody,
      anySlotHoldsGenerated: out.save.anySlotHoldsGenerated,
      slotsHoldingGenerated: out.save.slotsHoldingCode.filter(function (x) { return x.isBody; }).map(function (x) { return x.slot; })
    };

    var t = out.execute, cc = out.crossCheck;
    var parts = [];
    parts.push('the site PrepareFilterCode left the whole ' + BODY.length + '-byte program byte-identical (the safety gate passed)');
    parts.push('the program reached the page through the TEXTAREA path (dialog opened by ' + out.dialog.by + ')');
    parts.push(out.identity.pageRewroteIt
      ? 'THE PAGE REWROTE THE CODE IN THE TEXTAREA (' + BODY.length + ' -> ' + t.textAreaReadBackLen + ' bytes)'
      : 'the textarea held the program unchanged');
    parts.push(out.identity.mirrorEqualsGenerated
      ? 'after the UI save, mw.FilterCode is byte-identical to the program'
      : 'after the UI save, mw.FilterCode is NOT the program (' + out.save.mirrorLen + ' bytes)');
    if (out.boot.timedOut) {
      parts.push('the program was registered through the textarea but its background tick never published a projection within ' + out.boot.waitedMs + 'ms' +
        (out.boot.schedState && out.boot.schedState.lastError ? ' (the tick recorded: ' + out.boot.schedState.lastError + ')' : ' (no tick error was recorded)'));
      parts.push('the page is therefore on the fail-open path - every row visible, which is safe but is not the program');
    } else {
      parts.push(t.distinctCount === 0
        ? 'on the page the program read ZERO rows, so nothing above is evidence it ran'
        : 'the program booted (ticks=' + out.boot.schedState.ticks + ', runs=' + out.boot.schedState.runs + ') and on the page read ' +
          t.distinctCount + ' distinct rows producing ' + t.verdicts.keep + ' keep / ' + t.verdicts.hide +
          ' hide / ' + t.verdicts.failOpen + ' fail-open, at ' + t.perRowUs + ' us/row');
    }
    if (cc.ran) parts.push('the body and TseLookup.evaluateRow agreed on whether the row is hidden for ' + cc.agree + ' of ' + cc.compared + ' rendered rows (disagreements: ' + cc.disagree + ', of which ' + cc.bodyFailOpen + ' were fail-open)');

    var reasons = [];
    if (!out.rollback.slotRestored || !out.rollback.mirrorRestored) reasons.push('the rollback did not restore the owner filter slot or mirror');
    if (!out.rollback.restore || !out.rollback.restore.programStateRemoved) reasons.push('the program page state was not removed');
    if (!out.identity.mirrorEqualsGenerated || !out.identity.anySlotHoldsGenerated) reasons.push('the UI save did not deliver the program to the slot and the mirror');
    if (out.boot.timedOut) reasons.push('the program never published a projection (the page is on the fail-open path)');
    if (t.distinctCount === 0) reasons.push('the program read zero rows on the page');
    if (cc.ran && cc.disagree > 0) reasons.push('the body and TseLookup.evaluateRow disagree on ' + cc.disagree + ' rows');
    if (out.execute.verdicts.hide > 0 && out.execute.verdicts.keep === 0) reasons.push('every judged row was hidden, which is the fail-closed signature');
    if (out.errors.length) reasons.push('probe errors: ' + out.errors.join('; '));

    // A pre-set root-cause status wins: 'program-did-not-boot' says what went wrong, while
    // 'program-live-with-findings' only says that something did. finish() must not flatten
    // the one into the other.
    out.status = out.boot.timedOut ? 'program-did-not-boot'
      : (reasons.length ? 'program-live-with-findings' : 'program-verified-live');
    out.path = 'textarea';
    out.verdict = parts.join('. ') + '.' + (reasons.length ? ' FINDINGS: ' + reasons.join('; ') + '.' : '');
    say(out);
    console.log('A-PROGRAM-LIVE: ' + out.verdict);
    console.log('  GATE: PrepareFilterCode identical=' + out.gate.identical + ' (' + out.gate.inputBytes + ' -> ' + out.gate.outputBytes + ' bytes, firstDiffAt=' + out.gate.firstDiffAt + ')');
    console.log('  SAVE: dialog=' + out.dialog.by + ' textarea=' + out.textarea.readBackLen + 'B mirror=' + out.save.mirrorLen + 'B(' + out.save.mirrorFnv1a + ') identical=' + out.identity.mirrorEqualsGenerated);
    // schedState is null whenever the program never booted, so this line must not assume it.
    console.log('  BOOT: ' + (out.boot.schedState
      ? 'ticks=' + out.boot.schedState.ticks + ' runs=' + out.boot.schedState.runs + ' fp=' + out.boot.schedState.fp + ' lastError=' + out.boot.schedState.lastError
      : 'no scheduler state (program=' + out.boot.program + ', waitedMs=' + out.boot.waitedMs + ')'));
    console.log('  RUN : reads=' + t.reads + ' distinct=' + t.distinctCount + ' ' + JSON.stringify(t.verdicts) + ' perRow=' + t.perRowUs + 'us coverage=' + t.coverage.pctOfAllRows + '%');
    console.log('  XCHK: agree=' + cc.agree + ' disagree=' + cc.disagree + ' of ' + cc.compared + ' (failOpen=' + cc.bodyFailOpen + ')');
    console.log('  BACK: slot=' + out.rollback.slotRestored + ' mirror=' + out.rollback.mirrorRestored + ' programStateRemoved=' + out.rollback.restore.programStateRemoved + ' textarea=' + out.rollback.textAreaRestored);
  }

  // ============================== the chain ==============================
  snapshotState();
  phaseGate(function () {
    phaseDom(function () {
      phaseOpenDialog(function () {
        phaseWriteTextArea(function () {
          phaseSaveUi(function () {
            phaseBoot(function () {
              phaseExecute(function () {
                phaseCrossCheck(function () { finish(); });
              });
            });
          });
        });
      });
    });
  });
})();
