/**
 * tseZharfaKavosh — A real registration live probe v3 (G-25)
 *
 * Where we are. E-061 closed G-24: the live RenderData source is
 *     if (mw.FilterCode.length != 0) { var FilterResult;
 *       try { FilterResult = eval(mw.FilterCode) } catch (e) { FilterResult = false }
 *       if (!FilterResult) { if (document.getElementById(row.inscode) != null) { ...hide... } } }
 *   so the site evaluates THE MIRROR with eval, in a scope where row and mw are both visible,
 *   and it hides the row by looking up document.getElementById(row.inscode). The unchanged
 *   430-byte body was invoked 16 times over 12 distinct inscodes and every row it was
 *   invoked on got the correct verdict; dropping __B_index produced no reads at all
 *   (fail-open). What v2 could not show is coverage: it sampled the first 12 keys of
 *   mw.AllRows and 4 of them never reached the filter because RenderData's own pre-filters
 *   (the heven bounds, ViewMode, Market) excluded them first.
 *
 * What v3 does - the whole rendered population, through the correct DOM hook.
 *   1. Publish a projection over EVERY inscode in mw.AllRows (2896 keys -> 362 bytes of
 *      known/bitset, so there is no sampling at all).
 *   2. ALL-FAIL: known=1, bit=0 for every row -> register the unchanged body, SaveParams,
 *      RenderData -> count the rows still visible by id. Expect (nearly) zero: everything
 *      that survives the site's own pre-filters must be hidden by A.
 *   3. ALL-PASS: known=1, bit=1 -> RenderData -> the count must return to the baseline.
 *   4. FAIL-OPEN: __B_index = null -> RenderData -> the count must return to the baseline.
 *   5. Rollback: restore both FilterCode copies, delete mw.__B_*, SaveParams, RenderData,
 *      and verify the count is back and the slot is what it was.
 *   Visibility is measured with document.getElementById(inscode) - the site's own hook -
 *   and counted as visible only when the element exists and is not display:none /
 *   visibility:hidden / detached.
 *
 * RUN HERE (always): old.tsetmc.com/Loader.aspx?ParTree=15131F  ->  Console (F12)
 *   tag: [کنسول] — paste, then WAIT ~14 seconds; the result is printed at the end.
 *   window.__A_REAL_RESTORE stays available for the whole run.
 *
 * SPDX: Smart-FFA-1.1
 */
(function aRegisterRealV3(){
  'use strict';
  var RENDER_WAIT = 2200;
  var out = {
    meta: { test: 'A-REGISTER-REAL-v3', gate: 'G-25', evidenceId: 'E-062',
            host: (typeof location !== 'undefined') ? location.host : 'unknown',
            parTree: '15131F', capturedAt: new Date().toISOString(),
            method: 'publish a projection over EVERY AllRows inscode, then all-fail / all-pass / fail-open / rollback, counting visible rows by document.getElementById(inscode)' },
    recon: {}, body: {}, baseline: {}, allFail: {}, allPass: {}, failOpen: {}, rollback: {},
    errors: [], status: 'unknown', verdict: ''
  };
  var mw = (typeof window !== 'undefined') ? window.mw : null;

  var BODY = [
    '// tseZharfaKavosh A lookup 0.1.0-aLookup-001 \u2014 reads only B published projection',
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

  // ---------- every inscode on the page ----------
  function allInscodes() {
    var codes = [], keys = [];
    if (mw && mw.AllRows) {
      var ks = Object.keys(mw.AllRows);
      for (var i = 0; i < ks.length; i++) {
        var row = mw.AllRows[ks[i]];
        if (row && row.inscode !== undefined) codes.push(String(row.inscode)); else codes.push(String(ks[i]));
        keys.push(String(ks[i]));
      }
    }
    return { codes: codes, keys: keys };
  }
  // the site's own visibility hook: the row element's id IS the inscode
  function visibleByInscode(codes) {
    if (typeof document === 'undefined' || typeof document.getElementById !== 'function') return { n: -1, present: -1, hidden: -1, absent: -1 };
    var n = 0, present = 0, hidden = 0, absent = 0;
    for (var i = 0; i < codes.length; i++) {
      var el = document.getElementById(codes[i]);
      if (el === null) { absent++; continue; }
      present++;
      var h = false;
      try {
        var cs = (window.getComputedStyle ? window.getComputedStyle(el) : null);
        if (cs && (cs.display === 'none' || cs.visibility === 'hidden')) h = true;
      } catch (e) {}
      if (el.style && (el.style.display === 'none' || el.style.visibility === 'hidden')) h = true;
      if (!h && el.offsetParent === null && el.tagName !== 'BODY') h = true;
      if (h) hidden++; else n++;
    }
    return { n: n, present: present, hidden: hidden, absent: absent };
  }

  // ---------- projection over the whole population ----------
  function publishAll(mode) {           // 'fail' | 'pass'
    var r = allInscodes(), n = r.codes.length, bytes = Math.ceil(n / 8) || 1;
    var known = new Uint8Array(bytes), bits = new Uint8Array(bytes);
    var index = {};
    for (var i = 0; i < n; i++) {
      index[r.codes[i]] = i;
      var b = i >> 3, m = 1 << (i & 7);
      known[b] |= m;                       // every row is "known"
      if (mode === 'pass') bits[b] |= m;   // pass -> keep, fail -> hide
    }
    mw.__B_index = index; mw.__B_known = known; mw.__B_bitset = bits;
    return { rows: n, bytes: bytes, mode: mode, inscodes: r.codes, keyIsInscode: (r.keys.length > 0 && r.keys[0] === r.codes[0]) };
  }

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
      if (mw) mw.FilterCode = (savedFilterCode !== '') ? savedFilterCode : savedSettingsCode;
      delete mw.__B_index; delete mw.__B_known; delete mw.__B_bitset;
      if (mw && typeof mw.SaveParams === 'function') mw.SaveParams();
      if (mw && typeof mw.RenderData === 'function') mw.RenderData();
      return { restored: true, filterNo: savedFilterNo, settingsCodeLen: savedSettingsCode.length };
    } catch (e) { return { restored: false, error: String((e && e.message) || e) }; }
  };
  function doRender() {
    if (mw && typeof mw.RenderData === 'function') { try { mw.RenderData(); return true; } catch (e) { out.errors.push('RenderData: ' + String((e && e.message) || e)); } }
    return false;
  }
  function register() {
    var compiled = null;
    try { compiled = mw.PrepareFilterCode(BODY); } catch (e) { out.errors.push('PrepareFilterCode: ' + String((e && e.message) || e)); }
    var code = (typeof compiled === 'string') ? compiled : BODY;
    if (mw && mw.Settings && mw.Settings.Filters && savedFilterNo !== null && mw.Settings.Filters[savedFilterNo]) {
      mw.Settings.Filters[savedFilterNo].FilterCode = code;
    }
    mw.FilterCode = code;
    if (typeof mw.SaveParams === 'function') mw.SaveParams();
    return { compiledIdentical: (typeof compiled === 'string') ? (compiled === BODY) : null,
             compiledLen: (typeof compiled === 'string') ? compiled.length : null };
  }

  // ---------- phases ----------
  function phaseBaseline(next) {
    snapshotState();
    var r = allInscodes();
    out.recon = { filterNo: savedFilterNo, viewMode: (mw && mw.Settings) ? mw.Settings.ViewMode : null,
                  market: (mw && mw.Settings) ? mw.Settings.Market : null,
                  rowCount: r.codes.length, keyIsInscode: (r.keys.length > 0 && r.keys[0] === r.codes[0]),
                  filters: [] };
    if (mw && mw.Settings && mw.Settings.Filters) {
      for (var i = 0; i < mw.Settings.Filters.length; i++) {
        var f = mw.Settings.Filters[i] || {};
        out.recon.filters.push({ i: i, name: (f.FilterName === undefined ? null : f.FilterName),
                                 codeLen: (f.FilterCode === undefined ? -1 : String(f.FilterCode).length) });
      }
    }
    out.body = { bytes: BODY.length, fnv1a: fnv1a(BODY), newlines: (BODY.match(/\n/g) || []).length,
                 verified: (BODY.length === 430 && fnv1a(BODY) === '38fe0c59') };
    // the baseline is taken with NO filter registered, so every site-passing row is visible
    var reg = register();
    out.baseline = { register: reg, renderCalled: doRender() };
    setTimeout(function () {
      out.baseline.visible = visibleByInscode(r.codes);
      out.baseline.rowCount = r.codes.length;
      setTimeout(next, 60);
    }, RENDER_WAIT);
  }
  function phaseAllFail(next) {
    var p = publishAll('fail');
    out.allFail = { rows: p.rows, projectionBytes: p.bytes, mode: 'known=1,bit=0 for every row',
                    keyIsInscode: p.keyIsInscode };
    out.allFail.renderCalled = doRender();
    setTimeout(function () {
      out.allFail.visible = visibleByInscode(p.inscodes);
      out.allFail.hiddenByA = out.baseline.visible.n - out.allFail.visible.n;
      out.allFail.ok = (out.allFail.visible.n === 0);
      setTimeout(next, 60);
    }, RENDER_WAIT);
  }
  function phaseAllPass(next) {
    var p = publishAll('pass');
    out.allPass = { rows: p.rows, projectionBytes: p.bytes, mode: 'known=1,bit=1 for every row' };
    out.allPass.renderCalled = doRender();
    setTimeout(function () {
      out.allPass.visible = visibleByInscode(p.inscodes);
      out.allPass.backToBaseline = (out.allPass.visible.n === out.baseline.visible.n);
      setTimeout(next, 60);
    }, RENDER_WAIT);
  }
  function phaseFailOpen(next) {
    try { mw.__B_index = null; } catch (e) { out.errors.push('clear: ' + String((e && e.message) || e)); }
    out.failOpen = { projectionCleared: (mw.__B_index === null || mw.__B_index === undefined), renderCalled: doRender() };
    setTimeout(function () {
      var r = allInscodes();
      out.failOpen.visible = visibleByInscode(r.codes);
      out.failOpen.backToBaseline = (out.failOpen.visible.n === out.baseline.visible.n);
      setTimeout(next, 60);
    }, RENDER_WAIT);
  }
  function phaseRollback(next) {
    var r = allInscodes();
    out.rollback = { restore: window.__A_REAL_RESTORE(), renderCalled: doRender() };
    setTimeout(function () {
      out.rollback.visible = visibleByInscode(r.codes);
      var slotOk = true, codeOk = true;
      try {
        if (mw && mw.Settings && mw.Settings.Filters && savedFilterNo !== null && mw.Settings.Filters[savedFilterNo]) {
          slotOk = String(mw.Settings.Filters[savedFilterNo].FilterCode || '') === savedSettingsCode;
        }
        codeOk = String(mw.FilterCode || '') === savedSettingsCode;
      } catch (e) { slotOk = false; codeOk = false; }
      out.rollback.slotRestored = slotOk;
      out.rollback.mirrorRestored = codeOk;
      out.rollback.backToBaseline = (out.rollback.visible.n === out.baseline.visible.n);
      out.rollback.cleaned = (mw.__B_index === undefined || mw.__B_index === null) &&
                             (mw.__B_known === undefined || mw.__B_known === null) &&
                             (mw.__B_bitset === undefined || mw.__B_bitset === null);
      next();
    }, RENDER_WAIT);
  }
  function finish() {
    var b = out.baseline, f = out.allFail, p = out.allPass, o = out.failOpen, r = out.rollback;
    out.status = (f.ok && p.backToBaseline && o.backToBaseline && r.backToBaseline && r.slotRestored && r.cleaned)
      ? 'works-on-the-whole-population'
      : (f.visible.n > 0 && f.visible.n < b.visible.n) ? 'partial-hiding'
      : (f.visible.n === b.visible.n) ? 'no-effect'
      : 'incomplete';
    out.verdict = out.status === 'works-on-the-whole-population'
      ? 'over all ' + b.rowCount + ' rows, all-fail hid every visible row (' + b.visible.n + ' -> ' + f.visible.n + '), all-pass and fail-open both restored all ' + b.visible.n + ', and the rollback restored the slot - A works on the whole population'
      : out.status === 'partial-hiding'
        ? 'all-fail hid ' + f.hiddenByA + ' of ' + b.visible.n + ' visible rows - some rows the site renders are not being hidden by A; check whether the site re-renders asynchronously'
        : out.status === 'no-effect'
          ? 'all-fail changed nothing - the registered body is not the code being executed'
          : 'incomplete - read the phase objects';
    delete window.__A_REAL_RESTORE;
    console.log('PROBE_JSON ' + JSON.stringify(out));
    console.log('A-REAL-v3: ' + out.verdict);
    console.log('  body: bytes=' + BODY.length + ' fnv1a=' + fnv1a(BODY) + ' verified=' + out.body.verified);
    console.log('  population: rows=' + out.recon.rowCount + ' keyIsInscode=' + out.recon.keyIsInscode +
                ' filterNo=' + out.recon.filterNo + ' viewMode=' + out.recon.viewMode + ' market=' + out.recon.market);
    console.log('  baseline visible: n=' + b.visible.n + ' present=' + b.visible.present + ' hidden=' + b.visible.hidden + ' absent=' + b.visible.absent);
    console.log('  all-fail   visible: n=' + f.visible.n + ' hiddenByA=' + f.hiddenByA + ' ok=' + f.ok);
    console.log('  all-pass   visible: n=' + p.visible.n + ' backToBaseline=' + p.backToBaseline);
    console.log('  fail-open  visible: n=' + o.visible.n + ' backToBaseline=' + o.backToBaseline);
    console.log('  rollback   visible: n=' + r.visible.n + ' backToBaseline=' + r.backToBaseline +
                ' slotRestored=' + r.slotRestored + ' mirrorRestored=' + r.mirrorRestored + ' cleaned=' + r.cleaned);
    if (typeof window !== 'undefined' && window.__A_FULL === true) console.log('A_REAL_V3_FULL ' + JSON.stringify(out));
  }

  try {
    if (!mw) { out.status = 'no-mw'; out.verdict = 'mw is not on this page'; console.log('PROBE_JSON ' + JSON.stringify(out)); return; }
    if (typeof mw.RenderData !== 'function') { out.status = 'no-renderdata'; out.verdict = 'mw.RenderData is not a function on this page'; console.log('PROBE_JSON ' + JSON.stringify(out)); return; }
    if (typeof document === 'undefined' || typeof document.getElementById !== 'function') {
      out.status = 'no-dom'; out.verdict = 'document.getElementById is unavailable'; console.log('PROBE_JSON ' + JSON.stringify(out)); return;
    }
    if (!allInscodes().codes.length) { out.status = 'no-rows'; out.verdict = 'mw.AllRows is empty'; console.log('PROBE_JSON ' + JSON.stringify(out)); return; }
    var chain = [phaseBaseline, phaseAllFail, phaseAllPass, phaseFailOpen, phaseRollback], i = 0;
    (function run() { if (i >= chain.length) { finish(); return; } chain[i++](run); })();
  } catch (e) {
    out.errors.push(String((e && e.message) || e));
    out.status = 'error';
    try { window.__A_REAL_RESTORE(); } catch (e2) {}
    console.log('PROBE_JSON ' + JSON.stringify(out));
  }
})();
