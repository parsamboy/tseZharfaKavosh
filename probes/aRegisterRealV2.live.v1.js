/**
 * tseZharfaKavosh — A real registration live probe v2 (G-24)
 *
 * What v1 got wrong. E-060 ran probes/aRegisterReal.live.v1.js: the registration path itself
 *   executed cleanly (compiledIdentical true, compiledLen 430, written true, renderCalled
 *   true, rollback slotRestored/mirrorRestored/cleaned all true), but the MEASUREMENT was
 *   invalid. The probe took its inscodes from Object.keys(mw.AllRows) and then looked for
 *   them in the DOM as [inscode="..."]. Every one of the 10 read 'absent' at BASELINE, before
 *   anything was registered - so match:false and allVisible:false said nothing about the
 *   filter. The live RenderData source also shows why: it iterates
 *   `for (var key in mw.AllRows) { var row = mw.AllRows[key]; ... row.inscode ... }`, i.e.
 *   AllRows is keyed by something else and the inscode lives on the row.
 *
 * How v2 measures, without touching the body and without the DOM.
 *   The real A body reads mw.__B_index, mw.__B_known and mw.__B_bitset. v2 publishes those
 *   three as PROXIES that log every read:
 *     - __B_index lookups  -> exactly which inscodes the body was invoked with, and in what
 *       order, i.e. proof that the registered body really runs per row.
 *     - __B_known reads    -> which byte was consulted (the byte index encodes the row).
 *     - __B_bitset reads   -> the byte the verdict came from, so the verdict itself is
 *       observable: (value >> (pos & 7)) & 1 IS the row's FilterResult as the body computed it.
 *   The 430-byte body is registered UNCHANGED; only the projection it reads is instrumented.
 *   As a second, independent signal the probe also records document.body.innerHTML.length
 *   and counts for a set of candidate row selectors before and after each phase, so a real
 *   change in the rendered table is visible even without knowing its markup.
 *
 * RUN HERE (always): old.tsetmc.com/Loader.aspx?ParTree=15131F  ->  Console (F12)
 *   tag: [کنسول] — paste, then WAIT ~10 seconds; the result is printed at the end.
 *   window.__A_REAL_RESTORE is available for the whole run.
 *
 * SPDX: Smart-FFA-1.1
 */
(function aRegisterRealV2(){
  'use strict';
  var SAMPLE_N = 12, PASS_IDX = [0, 4, 7, 10], FAIL_IDX = [1, 2, 5, 8];
  var RENDER_WAIT = 2000;
  var SELECTORS = ['tr', 'tbody tr', 'table tr', '#BodyHTML tr', '.row', '[inscode]', 'div[inscode]', 'td', 'li'];
  var out = {
    meta: { test: 'A-REGISTER-REAL-v2', gates: 'G-24', evidenceId: 'E-061',
            host: (typeof location !== 'undefined') ? location.host : 'unknown',
            parTree: '15131F', capturedAt: new Date().toISOString(),
            method: 'publish the projection as read-logging Proxies, register the UNCHANGED 430-byte body via two writes + SaveParams + RenderData, read back the verdicts the body computed' },
    recon: {}, body: {}, projection: {}, baseline: {}, registered: {}, control: {}, rollback: {},
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

  // ---------- the projection, instrumented with Proxies ----------
  var P = null;
  function buildProjection(codes) {
    var n = codes.length, bytes = Math.ceil(n / 8);
    var known = new Uint8Array(bytes), bits = new Uint8Array(bytes);
    var index = {}, expect = {}, pass = [], fail = [], unknown = [];
    for (var i = 0; i < n; i++) {
      index[codes[i]] = i;
      var b = i >> 3, m = 1 << (i & 7);
      if (PASS_IDX.indexOf(i) >= 0) { known[b] |= m; bits[b] |= m; expect[codes[i]] = 'visible'; pass.push(codes[i]); }
      else if (FAIL_IDX.indexOf(i) >= 0) { known[b] |= m; expect[codes[i]] = 'hidden'; fail.push(codes[i]); }
      else { expect[codes[i]] = 'visible'; unknown.push(codes[i]); }
    }
    var reads = { index: [], known: [], bits: [], order: [] };
    // A key is a real lookup when it is an OWN property of the target. For the plain index
    // object that is the inscode (any string, digits or not); for the Uint8Arrays it must
    // also be a canonical byte index, so 'length' and prototype keys are never logged.
    function own(t, k) { return (typeof k === 'string') && Object.prototype.hasOwnProperty.call(t, k); }
    function isByte(t, k) {
      if (!own(t, k)) return false;
      if (!/^\d+$/.test(k)) return false;
      var v = +k;
      return (v >= 0 && v < t.length);
    }
    var pIndex = new Proxy(index, {
      get: function (t, k) { if (own(t, k)) { reads.index.push({ inscode: String(k), pos: t[k] }); reads.order.push(String(k)); } return t[k]; }
    });
    var pKnown = new Proxy(known, {
      get: function (t, k) { if (isByte(t, k)) reads.known.push({ byte: +k, value: t[k] }); return t[k]; }
    });
    var pBits = new Proxy(bits, {
      get: function (t, k) { if (isByte(t, k)) reads.bits.push({ byte: +k, value: t[k] }); return t[k]; }
    });
    return { index: pIndex, known: pKnown, bits: pBits, reads: reads, bytes: bytes,
             expected: expect, pass: pass, fail: fail, unknown: unknown, plain: { known: known, bits: bits } };
  }
  // reconstruct the verdict the body computed, purely from the logged reads
  function verdictsFromReads(proj, codes) {
    var seen = {}, verdict = {};
    for (var i = 0; i < proj.reads.index.length; i++) {
      var r = proj.reads.index[i];
      if (r.pos === undefined) continue;
      var b = r.pos >> 3, m = r.pos & 7;
      var knownByte = null, bitsByte = null;
      for (var a = 0; a < proj.reads.known.length; a++) if (proj.reads.known[a].byte === b) { knownByte = proj.reads.known[a].value; break; }
      for (var c = 0; c < proj.reads.bits.length; c++) if (proj.reads.bits[c].byte === b) { bitsByte = proj.reads.bits[c].value; break; }
      if (knownByte === null) { verdict[r.inscode] = 'no-known-read'; continue; }
      if (!((knownByte >> m) & 1)) { verdict[r.inscode] = 'fail-open(known=0)'; continue; }
      if (bitsByte === null) { verdict[r.inscode] = 'no-bits-read'; continue; }
      verdict[r.inscode] = ((bitsByte >> m) & 1) ? 'keep' : 'hide';
      seen[r.inscode] = true;
    }
    return { verdict: verdict, evaluated: Object.keys(seen).length };
  }
  function domSnapshot() {
    var o = { htmlLen: (typeof document !== 'undefined' && document.body) ? document.body.innerHTML.length : -1, counts: {} };
    if (typeof document === 'undefined') return o;
    for (var i = 0; i < SELECTORS.length; i++) {
      try { o.counts[SELECTORS[i]] = document.querySelectorAll(SELECTORS[i]).length; } catch (e) { o.counts[SELECTORS[i]] = 'err'; }
    }
    return o;
  }

  // ---------- row source: inscode lives ON the row, not in the key ----------
  function findRows() {
    var res = { method: null, inscodes: [], keys: [], keyIsInscode: null, note: '' };
    if (mw && mw.AllRows) {
      var keys = Object.keys(mw.AllRows);
      res.keyCount = keys.length;
      for (var i = 0; i < keys.length && res.inscodes.length < SAMPLE_N; i++) {
        var row = mw.AllRows[keys[i]];
        if (row && row.inscode !== undefined) { res.inscodes.push(String(row.inscode)); res.keys.push(String(keys[i])); }
      }
      if (res.inscodes.length) {
        res.method = 'mw.AllRows[*].inscode';
        res.keyIsInscode = (res.keys.length > 0 && res.keys[0] === res.inscodes[0]);
        return res;
      }
      res.note += 'AllRows has ' + keys.length + ' keys but no row.inscode; ';
    }
    if (typeof document !== 'undefined') {
      var els = document.querySelectorAll('[inscode]');
      if (els.length) {
        for (var q = 0; q < els.length && res.inscodes.length < SAMPLE_N; q++) res.inscodes.push(String(els[q].getAttribute('inscode')));
        res.method = 'DOM [inscode]'; res.count = els.length; return res;
      }
    }
    res.note += 'no row.inscode and no [inscode] in the DOM';
    return res;
  }

  // ---------- state ----------
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
  function resetReads() { if (P) { P.reads.index = []; P.reads.known = []; P.reads.bits = []; P.reads.order = []; } }
  function publish() {
    P = buildProjection(out.rows.inscodes);
    mw.__B_index = P.index; mw.__B_known = P.known; mw.__B_bitset = P.bits;
    return P;
  }

  // ---------- phases ----------
  function recon() {
    var r = {};
    r.hasMw = !!mw;
    r.filterNo = (mw && mw.Settings && typeof mw.Settings.FilterNo !== 'undefined') ? mw.Settings.FilterNo : null;
    r.updateSpeed = (mw && mw.Settings) ? mw.Settings.UpdateSpeed : null;
    r.viewMode = (mw && mw.Settings) ? mw.Settings.ViewMode : null;
    r.market = (mw && mw.Settings) ? mw.Settings.Market : null;
    r.filters = [];
    if (mw && mw.Settings && mw.Settings.Filters) {
      for (var i = 0; i < mw.Settings.Filters.length; i++) {
        var f = mw.Settings.Filters[i] || {};
        r.filters.push({ i: i, name: (f.FilterName === undefined ? null : f.FilterName),
                         codeLen: (f.FilterCode === undefined ? -1 : String(f.FilterCode).length) });
      }
    }
    r.api = {};
    var api = ['RenderData', 'SelectFilter', 'QueryWindowSaveFilter', 'QueryWindowCheckFilter',
               'PrepareFilterCode', 'SaveParams', 'UpdateMarketWatch', 'RenderExcelData'];
    for (var a = 0; a < api.length; a++) r.api[api[a]] = (mw && typeof mw[api[a]] === 'function') ? ('fn/' + mw[api[a]].length) : 'absent';
    r.renderDataLen = (mw && typeof mw.RenderData === 'function') ? String(mw.RenderData).length : null;
    // the exact call site of the filter inside RenderData
    r.renderDataFilterSite = null;
    if (mw && typeof mw.RenderData === 'function') {
      var src = String(mw.RenderData);
      var m = /(FilterCode|FilterResult|new Function|eval\()/.exec(src);
      if (m) {
        var s = Math.max(0, m.index - 200), e = Math.min(src.length, m.index + 400);
        r.renderDataFilterSite = src.slice(s, e);
      }
    }
    out.recon = r;
    out.rows = findRows();
  }

  function phaseBaseline(next) {
    snapshotState();
    out.baseline = { dom: domSnapshot() };
    resetReads();
    out.baseline.renderCalled = doRender();
    setTimeout(function () { out.baseline.readsAfterRender = { index: P ? P.reads.index.length : 0 }; setTimeout(next, 60); }, 400);
  }
  function phaseRegister(next) {
    var proj = publish();
    out.projection = { bytes: proj.bytes, pass: proj.pass, fail: proj.fail, unknown: proj.unknown,
                       expected: proj.expected, plainKnown: Array.prototype.slice.call(proj.plain.known),
                       plainBits: Array.prototype.slice.call(proj.plain.bits) };
    var compiled = null;
    try { compiled = mw.PrepareFilterCode(BODY); } catch (e) { out.errors.push('PrepareFilterCode: ' + String((e && e.message) || e)); }
    var code = (typeof compiled === 'string') ? compiled : BODY;
    out.registered = { compiledIdentical: (typeof compiled === 'string') ? (compiled === BODY) : null,
                       compiledLen: (typeof compiled === 'string') ? compiled.length : null };
    resetReads();
    try {
      if (mw && mw.Settings && mw.Settings.Filters && savedFilterNo !== null && mw.Settings.Filters[savedFilterNo]) {
        mw.Settings.Filters[savedFilterNo].FilterCode = code;
      }
      mw.FilterCode = code;
      if (typeof mw.SaveParams === 'function') mw.SaveParams();
      out.registered.written = true;
    } catch (e) { out.errors.push('write: ' + String((e && e.message) || e)); out.registered.written = false; }
    out.registered.renderCalled = doRender();
    out.registered.domBefore = domSnapshot();
    setTimeout(function () {
      var v = verdictsFromReads(proj, out.rows.inscodes);
      out.registered.reads = { indexCount: proj.reads.index.length,
                               indexSample: proj.reads.index.slice(0, 12),
                               knownSample: proj.reads.known.slice(0, 8),
                               bitsSample: proj.reads.bits.slice(0, 8) };
      out.registered.verdicts = v.verdict;
      out.registered.evaluatedRows = v.evaluated;
      out.registered.domAfter = domSnapshot();
      // compare with the expectation, row by row
      var ok = 0, bad = [];
      for (var k in proj.expected) {
        var got = v.verdict[k];
        var want = (proj.expected[k] === 'hidden') ? 'hide' : 'keep';
        var gotN = (got === 'hide') ? 'hide' : (got === 'keep' ? 'keep' : 'fail-open');
        if (gotN === want || (want === 'keep' && gotN === 'fail-open')) ok++;
        else bad.push({ inscode: k, want: want, got: got });
      }
      out.registered.rowsOk = ok;
      out.registered.rowsBad = bad;
      out.registered.match = (bad.length === 0 && v.evaluated > 0);
      setTimeout(next, 60);
    }, RENDER_WAIT);
  }
  function phaseControl(next) {
    resetReads();
    try { mw.__B_index = null; } catch (e) { out.errors.push('clear: ' + String((e && e.message) || e)); }
    out.control = { projectionCleared: (mw.__B_index === null || mw.__B_index === undefined) };
    out.control.renderCalled = doRender();
    out.control.domBefore = domSnapshot();
    setTimeout(function () {
      out.control.reads = { indexCount: P ? P.reads.index.length : 0 };
      out.control.domAfter = domSnapshot();
      setTimeout(next, 60);
    }, RENDER_WAIT);
  }
  function phaseRollback(next) {
    var r = window.__A_REAL_RESTORE();
    out.rollback = { restore: r, renderCalled: doRender() };
    setTimeout(function () {
      out.rollback.domAfter = domSnapshot();
      var slotOk = true, codeOk = true;
      try {
        if (mw && mw.Settings && mw.Settings.Filters && savedFilterNo !== null && mw.Settings.Filters[savedFilterNo]) {
          slotOk = String(mw.Settings.Filters[savedFilterNo].FilterCode || '') === savedSettingsCode;
        }
        codeOk = String(mw.FilterCode || '') === savedSettingsCode;
      } catch (e) { slotOk = false; codeOk = false; }
      out.rollback.slotRestored = slotOk;
      out.rollback.mirrorRestored = codeOk;
      out.rollback.cleaned = (mw.__B_index === undefined || mw.__B_index === null) &&
                             (mw.__B_known === undefined || mw.__B_known === null) &&
                             (mw.__B_bitset === undefined || mw.__B_bitset === null);
      next();
    }, RENDER_WAIT);
  }
  function finish() {
    var reg = out.registered, ctl = out.control, rb = out.rollback;
    out.status = (reg.evaluatedRows > 0 && reg.match && ctl.projectionCleared && rb.slotRestored && rb.cleaned)
      ? 'works-end-to-end'
      : (reg.evaluatedRows > 0 && !reg.match) ? 'runs-but-wrong-verdicts'
      : (reg.evaluatedRows === 0 && reg.renderCalled) ? 'registered-but-body-never-ran'
      : 'incomplete';
    out.verdict = out.status === 'works-end-to-end'
      ? 'the registered 430-byte body really ran per row (index reads ' + reg.reads.indexCount + ') and produced exactly the expected verdicts: hide on the fail-marked rows, keep on the pass-marked ones, fail-open on the unknown ones, and no reads at all once the projection was dropped'
      : out.status === 'runs-but-wrong-verdicts'
        ? 'the body ran ' + reg.reads.indexCount + ' times but ' + reg.rowsBad.length + ' rows got the wrong verdict - see registered.rowsBad'
        : out.status === 'registered-but-body-never-ran'
          ? 'the body was registered and RenderData ran, but the body never read the projection - the registered code is not the code being executed'
          : 'incomplete - read the phase objects';
    delete window.__A_REAL_RESTORE;
    console.log('PROBE_JSON ' + JSON.stringify(out));
    console.log('A-REAL-v2: ' + out.verdict);
    console.log('  body: bytes=' + BODY.length + ' fnv1a=' + fnv1a(BODY) + ' verified=' + out.body.verified);
    console.log('  rows: ' + out.rows.method + ' n=' + out.rows.inscodes.length + ' keyIsInscode=' + out.rows.keyIsInscode + ' keyCount=' + out.rows.keyCount);
    console.log('  projection: pass=' + out.projection.pass.length + ' fail=' + out.projection.fail.length + ' unknown=' + out.projection.unknown.length + ' bytes=' + out.projection.bytes);
    console.log('  registered: indexReads=' + reg.reads.indexCount + ' evaluatedRows=' + reg.evaluatedRows +
                ' rowsOk=' + reg.rowsOk + ' rowsBad=' + reg.rowsBad.length + ' match=' + reg.match);
    console.log('  control (no projection): indexReads=' + ctl.reads.indexCount + ' projectionCleared=' + ctl.projectionCleared);
    console.log('  rollback: slotRestored=' + rb.slotRestored + ' mirrorRestored=' + rb.mirrorRestored + ' cleaned=' + rb.cleaned);
    console.log('  dom: baseline htmlLen=' + out.baseline.dom.htmlLen + ' afterRegister=' + reg.domAfter.htmlLen +
                ' afterControl=' + ctl.domAfter.htmlLen + ' afterRollback=' + rb.domAfter.htmlLen);
    console.log('  RenderData: len=' + out.recon.renderDataLen + ' filterSite=' + (out.recon.renderDataFilterSite ? out.recon.renderDataFilterSite.slice(0, 200).replace(/\n/g, ' ') : 'not found'));
    if (typeof window !== 'undefined' && window.__A_FULL === true) console.log('A_REAL_V2_FULL ' + JSON.stringify(out));
  }

  try {
    out.body = { bytes: BODY.length, fnv1a: fnv1a(BODY), newlines: (BODY.match(/\n/g) || []).length,
                 verified: (BODY.length === 430 && fnv1a(BODY) === '38fe0c59') };
    recon();
    if (!mw) { out.status = 'no-mw'; out.verdict = 'mw is not on this page'; console.log('PROBE_JSON ' + JSON.stringify(out)); return; }
    if (!out.rows.inscodes.length) { out.status = 'no-rows'; out.verdict = 'no row.inscode source found: ' + out.rows.note; console.log('PROBE_JSON ' + JSON.stringify(out)); return; }
    var chain = [phaseBaseline, phaseRegister, phaseControl, phaseRollback], i = 0;
    (function run() { if (i >= chain.length) { finish(); return; } chain[i++](run); })();
  } catch (e) {
    out.errors.push(String((e && e.message) || e));
    out.status = 'error';
    try { window.__A_REAL_RESTORE(); } catch (e2) {}
    console.log('PROBE_JSON ' + JSON.stringify(out));
  }
})();
