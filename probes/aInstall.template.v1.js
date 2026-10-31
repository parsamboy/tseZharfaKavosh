/**
 * tseZharfaKavosh — INSTALL the self-contained program through the TEXTAREA and show the UX  v1
 *
 * TEMPLATE. tools/buildInstallProbe.v1.js injects build/filterProgram.v1.js at
 * __TSE_PROGRAM_BODY__ and probes/aSettingsPanel.live.v1.js at __TSE_PANEL_PROBE__, then
 * writes INSTALL_ME.js at the repository root. The template is not runnable on its own.
 *
 * WHY THIS EXISTS (owner, 2026-10-31)
 *   «یک کد تمیز تا اینجا تهیه کن در تکست اریا ثبت بشود و حداقل UX را نمایش بدهد» — a CLEAN
 *   install: register the program through the filter textarea so it is live and survives a
 *   reload, and show the UX panel so the variables can be changed. Everything up to here is
 *   already proven; this is the delivery, not another measurement.
 *
 * WHAT IS PROVEN AND REUSED HERE, NOT RE-INVENTED
 *   - the textarea registration path and the UI save: E-073, then E-077/E-078/E-080 live.
 *   - the safety gate: the site's own PrepareFilterCode over the whole 51,719-byte body has
 *     returned it byte-identical on every live run (fnv1a 036ebf14 both sides, firstDiffAt
 *     -1), which is what makes a 46 KB engine safe to put through the site's DSL compiler.
 *   - the program's own tick re-publishing when the config changes: E-080, where the owner
 *     wrote localStorage['tseFunnelSettings.v1'] and hide went 4 -> 100 with cfgHash moving
 *     fs1-df750af0 -> fs1-f52463a4.
 *   - the UX panel built from the schema: E-070 / G-29.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO
 *   - IT DOES NOT ROLL BACK. RUN_ME.js is a probe: it measures and then restores the owner's
 *     slot, mirror, textarea and program page state. This is the opposite — the registration
 *     is the product, so nothing is undone. If the owner wants the page back, the removal
 *     instructions are printed at the end.
 *   - IT DOES NOT DISARM THE TICK. RUN_ME.js replaces window.__TSE_SCHED.arm with a no-op so
 *     a re-publish cannot blind its tallying Proxy. Here that would kill the very mechanism
 *     the UX panel needs: the program re-arms from the per-row code and re-publishes when the
 *     config hash changes, which is how a slider change reaches the rows.
 *   - IT DOES NOT INSTALL A PROXY. A tallying Proxy left on mw.__B_index/__B_known/__B_bitset
 *     would stay on the page forever and slow every row down.
 *
 * RUN HERE (always): old.tsetmc.com/Loader.aspx?ParTree=15131F  ->  Console (F12)
 *   tag: [کنسول] — ONE paste, nothing before it. The program is self-contained: it brings
 *   the engine, the models, the settings layer and the per-row lookup with it.
 *
 * SPDX-License-Identifier: Smart-FFA-1.1
 */
(function aInstall() {
  'use strict';

  var BODY = '__TSE_PROGRAM_BODY__';
  var PANEL_SRC = '__TSE_PANEL_PROBE__';

  var POLL_MS = 200;
  var BOOT_WAIT = 4000;
  var TOOLBAR_WAIT = 4000;
  var ROUNDS = 3;

  var mw = window.mw || window.parent && window.parent.mw;
  var out = {
    phase: 'start', steps: [], errors: [],
    gate: {}, dom: {}, dialog: {}, textarea: {}, save: {}, identity: {}, boot: {}, panel: {}
  };
  function step(name, ok, detail) { out.steps.push({ name: name, ok: ok, detail: detail === undefined ? null : detail }); return ok; }
  function fail(msg) { out.errors.push(msg); }

  // The same fnv1a as the live probe, the builder and the program builder - one function, so
  // the hash printed here is comparable with the one every live run reported (036ebf14).
  function fnv1a(s) {
    var h = 0x811c9dc5, i;
    for (i = 0; i < s.length; i++) { h ^= s.charCodeAt(i) & 0xff; h = (h * 0x01000193) >>> 0; }
    return ('00000000' + h.toString(16)).slice(-8);
  }
  function doRender() {
    if (mw && typeof mw.RenderData === 'function') {
      try { mw.RenderData(); return true; } catch (e) { fail('RenderData: ' + String((e && e.message) || e)); }
    }
    return false;
  }

  // ---------------------------------------------------------------- the filter DOM
  function findCodeTextArea() {
    if (typeof document === 'undefined') return null;
    var el = document.getElementById('InputFilterCode');
    if (el && String(el.tagName).toUpperCase() === 'TEXTAREA') return el;
    var tas = document.getElementsByTagName('textarea');
    for (var i = 0; i < tas.length; i++) if (String(tas[i].id) === 'InputFilterCode') return tas[i];
    return null;
  }
  function findNameInput() {
    if (typeof document === 'undefined') return null;
    return document.getElementById('InputFilterName');
  }
  function fire(el, type) { try { el.dispatchEvent(new Event(type, { bubbles: true })); } catch (e) {} }
  function findFilterControl() {
    if (typeof document === 'undefined') return null;
    var els = document.querySelectorAll('button, a, li, td, span, div, input[type=button], [onclick]');
    for (var i = 0; i < els.length; i++) {
      var t = String((els[i].textContent || '') + ' ' + (els[i].getAttribute && els[i].getAttribute('onclick') || ''));
      if (/filter|فیلتر/i.test(t)) return els[i];
    }
    return null;
  }
  function clickMatching(inc, exc) {
    if (typeof document === 'undefined') return null;
    var els = document.querySelectorAll('button, a, li, td, span, div, input[type=button], [onclick]');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      var t = String((el.textContent || '') + ' ' + (el.getAttribute && el.getAttribute('onclick') || ''));
      if (!inc.test(t)) continue;
      if (exc && exc.test(t)) continue;
      try { el.click(); } catch (e) { continue; }
      return t.trim().slice(0, 40) || 'an unnamed control';
    }
    return null;
  }

  // ================================================================ PHASE 1 — the gate
  // The site's DSL compiler has 61 .replace() rules and only three were ever recorded. A
  // rewrite inside a call expression is a syntax error, and the site is fail-CLOSED on
  // exception, so registering a rewritten body would empty the owner's market watch. Run the
  // site's own compiler over the whole body FIRST and refuse to register anything unless it
  // comes back byte-identical. It has, on every live run so far.
  function phaseGate(next) {
    out.phase = 'gate';
    if (!mw || typeof mw.PrepareFilterCode !== 'function') {
      fail('mw.PrepareFilterCode is not available on this page');
      return finish();
    }
    var compiled = null, threw = null;
    try { compiled = String(mw.PrepareFilterCode(BODY)); } catch (e) { threw = String((e && e.message) || e); }
    var identical = !threw && compiled === BODY;
    var firstDiff = -1;
    if (!threw && !identical) {
      var n = Math.min(compiled.length, BODY.length);
      for (var i = 0; i < n; i++) if (compiled.charCodeAt(i) !== BODY.charCodeAt(i)) { firstDiff = i; break; }
      if (firstDiff === -1 && compiled.length !== BODY.length) firstDiff = n;
    }
    out.gate = { ran: true, threw: threw, inputBytes: BODY.length, outputBytes: threw ? null : compiled.length,
      inputFnv1a: fnv1a(BODY), outputFnv1a: threw ? null : fnv1a(compiled), identical: identical, firstDiffAt: firstDiff };
    step('the safety gate passed', identical, threw ? ('threw ' + threw)
      : (BODY.length + ' -> ' + compiled.length + ' bytes, firstDiffAt=' + firstDiff));
    if (!identical) {
      out.verdict = 'REFUSED TO INSTALL. The site PrepareFilterCode did not return the program ' +
        'byte-identical, so registering it could have produced a syntax error and, because the ' +
        'site is fail-closed on exception, hidden every row. Nothing was written. firstDiffAt=' +
        firstDiff + (threw ? ', threw ' + threw : '') + '.';
      return finish();
    }
    next();
  }

  // ================================================================ PHASE 2 — the dialog
  function phaseDialog(next) {
    out.phase = 'dialog';
    if (findCodeTextArea()) { out.dialog = { opened: true, by: 'already open', attempts: [] }; return next(); }
    var openers = [
      { name: 'QueryWindowEditFilter()', run: function () { mw.QueryWindowEditFilter(); } },
      { name: 'QueryWindowNewFilter()', run: function () { mw.QueryWindowNewFilter(); } },
      { name: 'click an edit-filter control', run: function () { return clickMatching(/filter|فیلتر/i, /edit|ویرایش|تغییر/i); } },
      { name: 'click any filter control', run: function () { return clickMatching(/filter|فیلتر/i, null); } }
    ];
    var attempts = [], stepI = 0, round = 0;
    function tryNext() {
      if (stepI >= openers.length) {
        round++;
        if (round < ROUNDS) { stepI = 0; setTimeout(tryNext, 700); return; }
        out.dialog = { opened: false, attempts: attempts };
        out.verdict = 'The filter editor could not be opened, so nothing was registered. ' +
          'Open the filter dialog by hand (the filter/edit control on the market-watch toolbar) ' +
          'and run this again. Tried: ' + attempts.map(function (a) { return a.name; }).join('; ') + '.';
        step('the filter editor opened', false, attempts.map(function (a) { return a.name; }).join('; '));
        return finish();
      }
      var o = openers[stepI], rec = { name: o.name };
      if (round === 0 && stepI === 0 && !findFilterControl()) {
        // the toolbar is still building: wait for it instead of burning all four openers
        var waited = 0;
        (function waitToolbar() {
          if (findFilterControl() || findCodeTextArea()) { tryNext(); return; }
          waited += 150;
          if (waited > TOOLBAR_WAIT) { tryNext(); return; }
          setTimeout(waitToolbar, 150);
        })();
        return;
      }
      try { var c = o.run(); if (c) rec.clicked = c; } catch (e) { rec.error = String((e && e.message) || e); }
      attempts.push(rec);
      setTimeout(function () {
        if (findCodeTextArea()) {
          out.dialog = { opened: true, by: o.name, attempts: attempts };
          step('the filter editor opened', true, o.name);
          next();
          return;
        }
        stepI++; tryNext();
      }, 250);
    }
    tryNext();
  }

  // ================================================================ PHASE 3 — write + save
  function phaseWrite(next) {
    out.phase = 'write';
    var ta = findCodeTextArea(), nm = findNameInput();
    if (!ta) { fail('the textarea disappeared before the write'); return finish(); }
    var before = String(ta.value || '').length;
    ta.value = BODY;
    fire(ta, 'input'); fire(ta, 'change');
    var after = String(ta.value || '').length;
    if (nm) { nm.value = 'TSE funnel'; fire(nm, 'input'); fire(nm, 'change'); }
    out.textarea = { id: ta.id, maxLength: ta.maxLength, beforeLen: before, writtenLen: BODY.length,
      readBackLen: after, pageRewroteIt: after !== BODY.length, nameFieldSet: !!nm };
    step('the textarea holds the whole program', after === BODY.length && !out.textarea.pageRewroteIt,
      before + ' -> ' + after + ' bytes');

    var rec = {};
    try { mw.QueryWindowSaveFilter(); rec.saveFilter = 'called'; } catch (e) { rec.saveFilter = 'threw ' + String((e && e.message) || e); }
    // the site's own save button: E-073 found it by its Persian label
    var btns = document.querySelectorAll('button, input[type=button], a');
    for (var i = 0; i < btns.length; i++) {
      var t = String(btns[i].textContent || btns[i].value || '');
      if (/ثبت|ذخیره|save/i.test(t)) { try { btns[i].click(); rec.button = t.trim(); } catch (e) {} break; }
    }
    try { mw.QueryWindowCheckFilter(); rec.checkFilter = 'called'; } catch (e) {}
    try { mw.SaveParams(); } catch (e) {}
    out.save = rec;

    // identity: the program must be in a slot AND in the mirror, byte for byte
    var want = fnv1a(BODY), slots = [], activeSlot = null;
    if (mw && mw.Settings && mw.Settings.Filters) {
      for (var s = 0; s < mw.Settings.Filters.length; s++) {
        var code = String((mw.Settings.Filters[s] || {}).FilterCode || '');
        if (code.length) slots.push({ slot: s, len: code.length, fnv1a: fnv1a(code), isBody: code === BODY });
        if (code === BODY) activeSlot = s;
      }
    }
    var mirror = String(mw.FilterCode || '');
    out.save.slots = slots;
    out.save.activeSlot = activeSlot;
    out.save.mirrorLen = mirror.length;
    out.save.mirrorFnv1a = fnv1a(mirror);
    out.identity = { generatedBytes: BODY.length, generatedFnv1a: want,
      mirrorEqualsGenerated: mirror === BODY, anySlotHoldsGenerated: activeSlot !== null,
      slotsHoldingGenerated: slots.filter(function (x) { return x.isBody; }).map(function (x) { return x.slot; }) };
    step('the UI save delivered the program to a slot and the mirror',
      out.identity.mirrorEqualsGenerated && out.identity.anySlotHoldsGenerated,
      'slot ' + activeSlot + ', mirror ' + mirror.length + 'B/' + fnv1a(mirror));
    next();
  }

  // ================================================================ PHASE 4 — boot
  // One RenderData evaluates the filter for every row, which is what installs the program and
  // arms its tick. The tick then publishes the projection the per-row code reads. The tick is
  // NOT disarmed here — see the header.
  function phaseBoot(next) {
    out.phase = 'boot';
    doRender();
    var waited = 0;
    (function poll() {
      var st = window.__TSE_SCHED && window.__TSE_SCHED.state;
      if (st && st.runs >= 1) {
        out.boot = { waitedMs: waited, program: !!window.__TSE_PROGRAM, schedState: st,
          published: { index: !!mw.__B_index, known: !!mw.__B_known, bitset: !!mw.__B_bitset,
            snapshotId: mw.__B_snapshotId, configHash: mw.__B_configHash, totalRuns: mw.__B_totalRuns },
          engineOnPage: { engine: !!window.TseBEngine, models: !!window.TseModels,
            lookup: !!window.TseLookup, settings: !!window.TseFunnelSettings } };
        step('the program booted and published a projection', !!window.__TSE_PROGRAM && !!mw.__B_index,
          'ticks=' + st.ticks + ' runs=' + st.runs + ' cfgHash=' + st.cfgHash);
        next();
        return;
      }
      waited += POLL_MS;
      if (waited > BOOT_WAIT) {
        out.boot = { waitedMs: waited, timedOut: true, program: !!window.__TSE_PROGRAM,
          schedState: (window.__TSE_SCHED && window.__TSE_SCHED.state) || null };
        step('the program booted', !!window.__TSE_PROGRAM,
          'no projection after ' + waited + 'ms — the page is on the fail-open path, every row visible');
        next();
        return;
      }
      setTimeout(poll, POLL_MS);
    })();
  }

  // ================================================================ PHASE 5 — the UX panel
  // The panel is the E-070/G-29 code, embedded verbatim so there is nothing to paste first.
  // It reads the schema from window.TseFunnelSettings, which the program has just installed,
  // and writes its own localStorage key — the very key the program's tick watches, so a
  // slider change reaches the rows without any further paste.
  function phasePanel(next) {
    out.phase = 'panel';
    if (!window.TseFunnelSettings) {
      out.panel = { built: false, reason: 'window.TseFunnelSettings is not on the page — the program did not install its modules' };
      step('the UX panel was built', false, 'no TseFunnelSettings on the page');
      return next();
    }
    try {
      // indirect eval, so the panel's own 'use strict' IIFE runs in global scope exactly as it
      // does when pasted on its own
      (0, eval)(PANEL_SRC);
      out.panel = { built: true,
        variables: window.TseFunnelSettings.SCHEMA.length,
        presets: Object.keys(window.TseFunnelSettings.PRESETS).length,
        storageKey: window.TseFunnelSettings.STORAGE_KEY,
        cleanup: typeof window.__FUNNEL_SETTINGS_CLEANUP === 'function' };
      step('the UX panel was built', true,
        window.TseFunnelSettings.SCHEMA.length + ' variables, ' +
        Object.keys(window.TseFunnelSettings.PRESETS).length + ' presets');
    } catch (e) {
      out.panel = { built: false, error: String((e && e.message) || e) };
      step('the UX panel was built', false, String((e && e.message) || e));
    }
    next();
  }

  // ================================================================ the report
  function finish() {
    out.phase = 'done';
    var bad = out.steps.filter(function (s) { return !s.ok; });
    out.ok = bad.length === 0 && out.errors.length === 0;
    out.status = !out.gate.ran ? 'refused'
      : (!out.gate.identical ? 'refused-the-site-would-rewrite-the-body'
      : (!out.dialog.opened ? 'editor-unavailable'
      : (!out.identity.anySlotHoldsGenerated || !out.identity.mirrorEqualsGenerated ? 'registered-but-not-identical'
      : (!out.boot.program || !out.boot.published || !out.boot.published.index ? 'registered-but-not-running'
      : (!out.panel.built ? 'running-without-ux' : 'installed')))));
    out.summary = out.steps.map(function (s) { return (s.ok ? '[ok] ' : '[!!] ') + s.name + (s.detail ? ' — ' + s.detail : ''); });
    out.howToChange = out.panel.built
      ? 'use the panel bottom-left of the market watch: move a slider and press «ذخیره»; the program re-publishes on its next tick and the rows are re-judged. The config hash changes with every edit, which is how you can see the change took effect.'
      : 'the panel did not build, so the variables can still be changed by writing localStorage["' + (window.TseFunnelSettings ? window.TseFunnelSettings.STORAGE_KEY : 'tseFunnelSettings.v1') + '"] with {version:1,savedAt:null,settings:{...}} and calling mw.RenderData().';
    out.howToRemove = 'to take the program off the page: open the filter dialog, clear #InputFilterCode, save, then delete localStorage["' + (window.TseFunnelSettings ? window.TseFunnelSettings.STORAGE_KEY : 'tseFunnelSettings.v1') + '"] and call mw.RenderData().';
    console.log('INSTALL_JSON ' + JSON.stringify(out));
    console.log('');
    console.log('INSTALL: ' + out.status);
    out.summary.forEach(function (l) { console.log('  ' + l); });
    console.log('  cfgHash now: ' + (out.boot.schedState && out.boot.schedState.cfgHash));
    console.log('  ' + out.howToChange);
    console.log('  ' + out.howToRemove);
  }

  // ================================================================ the chain
  phaseGate(function () {
    phaseDialog(function () {
      phaseWrite(function () {
        phaseBoot(function () {
          phasePanel(function () { finish(); });
        });
      });
    });
  });
})();
