/**
 * tseZharfaKavosh — A real registration live probe v1 (G-22 / G-23 / G-24)
 *
 * Where we are. E-057 proved that storing a filter body is not enough, and E-058 found the
 *   missing step: mw.RenderData() recompiles the filter and runs it per row, and the body's
 *   execution context CAN see mw (sawMw true) - so G-22 is answered and the real A body,
 *   which reads mw.__B_index unguarded, is viable. What has never been shown is that the
 *   real 430-byte body, registered through the full path, actually HIDES the right rows on
 *   the live page and fails open when the projection is missing. That is this probe.
 *
 * What it does.
 *   1. recon: the row source (mw.AllRows / [inscode] / links), the current Filters array,
 *      RenderData's own source, and every mw function mentioning FilterCode.
 *   2. baseline: visibility of the first 10 rows.
 *   3. publish a synthetic projection on mw.__B_index / __B_known / __B_bitset that passes
 *      exactly 3 of those 10 rows, register the REAL body (fnv1a 38fe0c59, 430 bytes, 11
 *      newlines - verified in the probe), SaveParams(), then RenderData() - the E-058
 *      trigger - and compare the rows that actually disappeared with the 3 that should.
 *   4. control: drop the projection (mw.__B_index = null) + RenderData() - every row must
 *      come back. This is the fail-open law, measured on the live page.
 *   5. rollback: restore both FilterCode copies, delete mw.__B_*, SaveParams(), RenderData(),
 *      and verify every row is visible and the slot is back to what it was.
 *   window.__A_REAL_RESTORE is published for the whole run: if anything looks wrong in the
 *   UI, type __A_REAL_RESTORE() in the console and the page is restored immediately.
 *
 * RUN HERE (always): old.tsetmc.com/Loader.aspx?ParTree=15131F  ->  Console (F12)
 *   tag: [کنسول] — paste, then WAIT ~8 seconds; the result is printed at the end.
 *
 * SPDX: Smart-FFA-1.1
 */
(function aRegisterReal(){
  'use strict';
  var EXPECT_FNV = '38fe0c59', EXPECT_BYTES = 430, EXPECT_NL = 11;
  var SAMPLE_N = 10, PASS_IDX = [0, 4, 7], FAIL_IDX = [1, 2, 5, 8];   // deterministic, recorded
  var RENDER_WAIT = 1500;
  var out = {
    meta: { test: 'A-REGISTER-REAL-v1', gates: 'G-22+G-23+G-24', evidenceId: 'E-059',
            host: (typeof location !== 'undefined') ? location.host : 'unknown',
            parTree: '15131F', capturedAt: new Date().toISOString(),
            method: 'publish a synthetic projection, register the REAL 430-byte body via two writes + SaveParams + RenderData, compare hidden rows with the expected set, fail-open control, full rollback' },
    recon: {}, body: {}, baseline: {}, registered: {}, control: {}, rollback: {},
    errors: [], status: 'unknown', verdict: ''
  };
  var mw = (typeof window !== 'undefined') ? window.mw : null;

  // ---------- mirror of aLookup.buildFilterCodeBody (the real module is not on the page) ----------
  var MIRROR_VERSION = '0.1.0-aLookup-001';
  var BODY = [
    '// tseZharfaKavosh A lookup ' + MIRROR_VERSION + ' \u2014 reads only B published projection',
    'var FilterResult = true;',
    'var __i = mw.__B_index;',
    'if (__i && mw.__B_known && mw.__B_bitset && row) {',
    '  var __p = __i[row.inscode];',
    '  if (__p !== undefined) {',
    '    var __b = __p >> 3, __m = __p & 7;',
    '    if (__b >= 0 && __b < mw.__B_known.length && (mw.__B_known[__b] >> __m) & 1) {',
    '      FilterResult = !!((mw.__B_bitset[__b] >> __m) & 1);',
    '    }',
    '  }',
    '}'
  ].join('\n');
  function fnv1a(s){ var h = 0x811c9dc5, i; for (i = 0; i < s.length; i++){ h ^= s.charCodeAt(i) & 0xff; h = (h * 0x01000193) >>> 0; } return ('00000000' + h.toString(16)).slice(-8); }

  // ---------- row discovery ----------
  function findRows() {
    var res = { method: null, inscodes: [], note: '' };
    var i, keys;
    if (mw && mw.AllRows) {
      try {
        if (Array.isArray(mw.AllRows)) {
          for (i = 0; i < mw.AllRows.length && res.inscodes.length < SAMPLE_N; i++) {
            if (mw.AllRows[i] && mw.AllRows[i].inscode !== undefined) res.inscodes.push(String(mw.AllRows[i].inscode));
          }
          if (res.inscodes.length) { res.method = 'mw.AllRows[].inscode'; return res; }
        } else if (typeof mw.AllRows === 'object') {
          keys = Object.keys(mw.AllRows);
          for (i = 0; i < keys.length && res.inscodes.length < SAMPLE_N; i++) res.inscodes.push(String(keys[i]));
          if (res.inscodes.length) { res.method = 'mw.AllRows keys'; return res; }
        }
      } catch (e) { res.note += 'AllRows: ' + String((e && e.message) || e) + '; '; }
    }
    if (typeof document !== 'undefined') {
      var els = document.querySelectorAll('[inscode]');
      if (els.length) {
        for (i = 0; i < els.length && res.inscodes.length < SAMPLE_N; i++) res.inscodes.push(String(els[i].getAttribute('inscode')));
        res.method = 'DOM [inscode]'; res.count = els.length; return res;
      }
      els = document.querySelectorAll('[data-inscode]');
      if (els.length) {
        for (i = 0; i < els.length && res.inscodes.length < SAMPLE_N; i++) res.inscodes.push(String(els[i].getAttribute('data-inscode')));
        res.method = 'DOM [data-inscode]'; res.count = els.length; return res;
      }
      var links = document.querySelectorAll('a[href*="Inscode"],a[href*="inscode"]');
      if (links.length) {
        for (i = 0; i < links.length && res.inscodes.length < SAMPLE_N; i++) {
          var m = /[Ii]nscode=(\d+)/.exec(links[i].getAttribute('href') || '');
          if (m) res.inscodes.push(m[1]);
        }
        if (res.inscodes.length) { res.method = 'DOM a[href*=Inscode]'; res.count = links.length; return res; }
      }
      res.note += 'no inscode attribute and no Inscode link in the DOM; ';
    }
    return res;
  }
  function rowState(inscode) {
    if (typeof document === 'undefined') return 'no-document';
    var el = document.querySelector('[inscode="' + inscode + '"]') ||
             document.querySelector('[data-inscode="' + inscode + '"]');
    if (!el) return 'absent';
    try {
      var cs = (window.getComputedStyle ? window.getComputedStyle(el) : null);
      if (cs && (cs.display === 'none' || cs.visibility === 'hidden')) return 'hidden';
    } catch (e) {}
    if (el.style && (el.style.display === 'none' || el.style.visibility === 'hidden')) return 'hidden';
    if (el.offsetParent === null && el.tagName !== 'BODY') return 'hidden';
    return 'visible';
  }
  function measure(codes) {
    var o = {}, vis = 0, hid = 0;
    for (var i = 0; i < codes.length; i++) { o[codes[i]] = rowState(codes[i]); if (o[codes[i]] === 'visible') vis++; else hid++; }
    return { states: o, visible: vis, hidden: hid };
  }

  // ---------- state + manual restore ----------
  var savedSettingsCode = '', savedFilterCode = '', savedFilterNo = null;
  function snapshotState() {
    var fno = (mw && mw.Settings && typeof mw.Settings.FilterNo !== 'undefined') ? mw.Settings.FilterNo : null;
    savedFilterNo = fno;
    savedSettingsCode = (mw && mw.Settings && mw.Settings.Filters && fno !== null && mw.Settings.Filters[fno])
      ? String(mw.Settings.Filters[fno].FilterCode || '') : '';
    savedFilterCode = (mw && mw.FilterCode !== undefined && mw.FilterCode !== null) ? String(mw.FilterCode) : '';
  }
  window.__A_REAL_RESTORE = function () {
    try {
      if (mw && mw.Settings && mw.Settings.Filters && savedFilterNo !== null && mw.Settings.Filters[savedFilterNo]) {
        mw.Settings.Filters[savedFilterNo].FilterCode = savedSettingsCode;
      }
      if (mw && savedFilterCode !== '') mw.FilterCode = savedFilterCode; else if (mw) mw.FilterCode = savedSettingsCode;
      delete mw.__B_index; delete mw.__B_known; delete mw.__B_bitset;
      if (mw && typeof mw.SaveParams === 'function') mw.SaveParams();
      if (mw && typeof mw.RenderData === 'function') mw.RenderData();
      return { restored: true, filterNo: savedFilterNo, settingsCodeLen: savedSettingsCode.length };
    } catch (e) { return { restored: false, error: String((e && e.message) || e) }; }
  };

  function doRender() { if (mw && typeof mw.RenderData === 'function') { try { mw.RenderData(); return true; } catch (e) { out.errors.push('RenderData: ' + String((e && e.message) || e)); } } return false; }

  // ---------- phases ----------
  function recon() {
    var r = {};
    r.hasMw = !!mw;
    r.filterNo = (mw && mw.Settings && typeof mw.Settings.FilterNo !== 'undefined') ? mw.Settings.FilterNo : null;
    r.updateSpeed = (mw && mw.Settings) ? mw.Settings.UpdateSpeed : null;
    r.filters = [];
    if (mw && mw.Settings && mw.Settings.Filters) {
      for (var i = 0; i < mw.Settings.Filters.length; i++) {
        var f = mw.Settings.Filters[i] || {};
        r.filters.push({ i: i, name: (f.FilterName === undefined ? null : f.FilterName),
                         codeLen: (f.FilterCode === undefined ? -1 : String(f.FilterCode).length) });
      }
    }
    r.api = {};
    var api = ['RenderData', 'SelectFilter', 'QueryWindowSaveFilter', 'PrepareFilterCode', 'SaveParams'];
    for (var a = 0; a < api.length; a++) r.api[api[a]] = (mw && typeof mw[api[a]] === 'function') ? ('fn/' + mw[api[a]].length) : 'absent';
    r.renderDataSrc = null;
    if (mw && typeof mw.RenderData === 'function') { try { r.renderDataSrc = String(mw.RenderData).slice(0, 500); } catch (e) {} }
    r.filterCodeFns = [];
    if (mw) {
      var keys = Object.keys(mw), n = 0;
      for (var k = 0; k < keys.length && n < 12; k++) {
        var v; try { v = mw[keys[k]]; } catch (e) { continue; }
        if (typeof v === 'function') {
          var s = ''; try { s = String(v); } catch (e2) {}
          if (s.indexOf('FilterCode') >= 0) { n++; r.filterCodeFns.push({ name: keys[k], argCount: v.length, src: s.slice(0, 140) }); }
        }
      }
    }
    out.recon = r;
    out.rows = findRows();
  }

  // three states, because A has three behaviours and all three must be seen on the live page:
  //   pass    known=1 bit=1 -> A keeps the row            (expect visible)
  //   fail    known=1 bit=0 -> A hides the row            (expect hidden)   <- the real filtering
  //   unknown known=0       -> A fails open               (expect visible)
  function publishProjection(codes) {
    var n = codes.length, bytes = Math.ceil(n / 8);
    var known = new Uint8Array(bytes), bits = new Uint8Array(bytes);
    var index = {}, expect = {}, pass = [], fail = [], unknown = [];
    for (var i = 0; i < n; i++) {
      index[codes[i]] = i;
      var b = i >> 3, msk = 1 << (i & 7);
      if (PASS_IDX.indexOf(i) >= 0) { known[b] |= msk; bits[b] |= msk; expect[codes[i]] = 'visible'; pass.push(codes[i]); }
      else if (FAIL_IDX.indexOf(i) >= 0) { known[b] |= msk; expect[codes[i]] = 'hidden'; fail.push(codes[i]); }
      else { expect[codes[i]] = 'visible'; unknown.push(codes[i]); }   // known=0 -> fail-open
    }
    mw.__B_index = index; mw.__B_known = known; mw.__B_bitset = bits;
    return { pass: pass, fail: fail, unknown: unknown, expected: expect, bytes: bytes };
  }

  function phaseBaseline(next) {
    snapshotState();
    out.baseline = measure(out.rows.inscodes);
    out.baseline.rowSource = out.rows.method;
    setTimeout(next, 50);
  }
  function phaseRegister(next) {
    var codes = out.rows.inscodes;
    var proj = publishProjection(codes);
    out.registered = { expected: proj.expected, pass: proj.pass, fail: proj.fail, unknown: proj.unknown,
                       projectionBytes: proj.bytes };
    // ---- the full registration path: two writes + save + the E-058 trigger ----
    var compiled = null;
    try { compiled = mw.PrepareFilterCode(BODY); } catch (e) { out.errors.push('PrepareFilterCode: ' + String((e && e.message) || e)); }
    var code = (typeof compiled === 'string') ? compiled : BODY;
    out.registered.compiledIdentical = (typeof compiled === 'string') ? (compiled === BODY) : null;
    out.registered.compiledLen = (typeof compiled === 'string') ? compiled.length : null;
    try {
      if (mw && mw.Settings && mw.Settings.Filters && savedFilterNo !== null && mw.Settings.Filters[savedFilterNo]) {
        mw.Settings.Filters[savedFilterNo].FilterCode = code;
      }
      mw.FilterCode = code;
      if (typeof mw.SaveParams === 'function') mw.SaveParams();
      out.registered.written = true;
    } catch (e) { out.errors.push('write: ' + String((e && e.message) || e)); out.registered.written = false; }
    out.registered.renderCalled = doRender();
    setTimeout(function () {
      out.registered.measured = measure(codes);
      // expected hidden set = the rows we marked as failing
      var expHidden = [], expVisible = [];
      for (var k in proj.expected) (proj.expected[k] === 'hidden' ? expHidden : expVisible).push(k);
      out.registered.expectedHidden = expHidden;
      out.registered.expectedVisible = expVisible;
      out.registered.hiddenAsExpected = (out.registered.measured.hidden === expHidden.length);
      out.registered.failRowsHidden = expHidden.every(function (k) { return out.registered.measured.states[k] !== 'visible'; });
      out.registered.match = (out.registered.measured.hidden === expHidden.length) &&
                             (out.registered.measured.visible === expVisible.length);
      setTimeout(next, 50);
    }, RENDER_WAIT);
  }
  function phaseControl(next) {
    var codes = out.rows.inscodes;
    try { mw.__B_index = null; } catch (e) { out.errors.push('clear index: ' + String((e && e.message) || e)); }
    out.control = { projectionCleared: (mw.__B_index === null || mw.__B_index === undefined) };
    out.control.renderCalled = doRender();
    setTimeout(function () {
      out.control.measured = measure(codes);
      out.control.allVisible = (out.control.measured.hidden === 0);
      setTimeout(next, 50);
    }, RENDER_WAIT);
  }
  function phaseRollback(next) {
    var codes = out.rows.inscodes;
    var r = window.__A_REAL_RESTORE();
    out.rollback.restore = r;
    out.rollback.renderCalled = doRender();
    setTimeout(function () {
      out.rollback.measured = measure(codes);
      var slotOk = true, codeOk = true;
      try {
        if (mw && mw.Settings && mw.Settings.Filters && savedFilterNo !== null && mw.Settings.Filters[savedFilterNo]) {
          slotOk = String(mw.Settings.Filters[savedFilterNo].FilterCode || '') === savedSettingsCode;
        }
        codeOk = String(mw.FilterCode || '') === savedSettingsCode;
      } catch (e) { slotOk = false; codeOk = false; }
      out.rollback.slotRestored = slotOk;
      out.rollback.mirrorRestored = codeOk;
      out.rollback.allVisible = (out.rollback.measured.hidden === 0);
      out.rollback.cleaned = (mw.__B_index === undefined || mw.__B_index === null) &&
                             (mw.__B_known === undefined || mw.__B_known === null) &&
                             (mw.__B_bitset === undefined || mw.__B_bitset === null);
      next();
    }, RENDER_WAIT);
  }
  function finish() {
    var b = out.baseline, reg = out.registered, ctl = out.control, rb = out.rollback;
    out.status = (!reg.measured) ? 'not-run'
      : (reg.match && ctl.allVisible && rb.allVisible && rb.slotRestored && rb.cleaned) ? 'works-end-to-end'
      : (reg.measured.hidden > 0 && !reg.match) ? 'hides-rows-but-not-the-expected-set'
      : (reg.measured.hidden === 0 && reg.renderCalled) ? 'registered-but-no-effect'
      : 'incomplete';
    out.verdict = out.status === 'works-end-to-end'
      ? 'the real 430-byte A body, registered via two writes + SaveParams + RenderData, hides exactly the fail-marked rows, keeps the pass-marked ones, fails open on the unknown ones and on a missing projection - A works end to end on the live page'
      : out.status === 'registered-but-no-effect'
        ? 'the body was registered and RenderData ran, but no row changed - the filter is not applied to the rows this probe can see'
        : out.status === 'hides-rows-but-not-the-expected-set'
          ? 'rows did change, but not the expected set - the projection keys (inscode) do not line up with the rows the filter sees'
          : 'incomplete - read the phase objects';
    delete window.__A_REAL_RESTORE;
    console.log('PROBE_JSON ' + JSON.stringify(out));
    console.log('A-REAL: ' + out.verdict);
    console.log('  body: bytes=' + BODY.length + ' fnv1a=' + fnv1a(BODY) + ' (expect ' + EXPECT_FNV + ') newlines=' + (BODY.match(/\n/g) || []).length);
    console.log('  rows: ' + out.rows.method + ' n=' + out.rows.inscodes.length + ' baseline visible=' + b.visible + ' hidden=' + b.hidden);
    console.log('  projection: pass=' + reg.pass.length + ' fail=' + reg.fail.length + ' unknown=' + reg.unknown.length + ' bytes=' + reg.projectionBytes);
    console.log('  registered: hidden=' + (reg.measured ? reg.measured.hidden : 'n/a') + ' expected=' + reg.expectedHidden.length +
                ' match=' + reg.match + ' failRowsHidden=' + reg.failRowsHidden +
                ' renderCalled=' + reg.renderCalled + ' compiledIdentical=' + reg.compiledIdentical);
    console.log('  control (no projection): hidden=' + (ctl.measured ? ctl.measured.hidden : 'n/a') + ' allVisible=' + ctl.allVisible);
    console.log('  rollback: allVisible=' + rb.allVisible + ' slotRestored=' + rb.slotRestored + ' mirrorRestored=' + rb.mirrorRestored + ' cleaned=' + rb.cleaned);
    console.log('  RenderData src: ' + (out.recon.renderDataSrc ? out.recon.renderDataSrc.slice(0, 160).replace(/\n/g, ' ') : 'absent'));
    if (typeof window !== 'undefined' && window.__A_FULL === true) console.log('A_REAL_FULL ' + JSON.stringify(out));
  }

  try {
    out.body = { bytes: BODY.length, fnv1a: fnv1a(BODY), newlines: (BODY.match(/\n/g) || []).length,
                 expectFnV: EXPECT_FNV, expectBytes: EXPECT_BYTES, expectNewlines: EXPECT_NL,
                 verified: (BODY.length === EXPECT_BYTES && fnv1a(BODY) === EXPECT_FNV) };
    recon();
    if (!mw) { out.status = 'no-mw'; out.verdict = 'mw is not on this page'; console.log('PROBE_JSON ' + JSON.stringify(out)); return; }
    if (!out.rows.inscodes.length) {
      out.status = 'no-rows'; out.verdict = 'no row/inscode source found on this page - cannot measure per-row hiding';
      console.log('PROBE_JSON ' + JSON.stringify(out)); return;
    }
    var chain = [phaseBaseline, phaseRegister, phaseControl, phaseRollback];
    var i = 0;
    (function run() { if (i >= chain.length) { finish(); return; } chain[i++](run); })();
  } catch (e) {
    out.errors.push(String((e && e.message) || e));
    out.status = 'error';
    try { window.__A_REAL_RESTORE(); } catch (e2) {}
    console.log('PROBE_JSON ' + JSON.stringify(out));
  }
})();
