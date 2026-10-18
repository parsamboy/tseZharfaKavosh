/**
 * tseZharfaKavosh — A registration live probe v1 (G-12 / A-slot)
 * Purpose: prove the GENERATED A body (not a dummy string) can be registered in the
 *   real TSETMC filter slot and comes back byte-for-byte unchanged. G-13 (E-026/E-053)
 *   already proved that a non-empty string round-trips; this probe is about the real
 *   artifact: 430 bytes, 11 newlines and a non-ASCII em dash in its header comment.
 *   A storage layer that strips newlines or mangles non-ASCII would break the body's
 *   byte accounting (and therefore the 4096-byte capacity check) without breaking JS.
 *
 * RUN HERE (always): old.tsetmc.com/Loader.aspx?ParTree=15131F  ->  Console (F12)
 *   tag: [کنسول]   — one paste, read-only except for the temporary FilterCode slot,
 *   which is restored to its original value before the probe returns.
 *
 * Optional first step for the authoritative body: paste the contents of
 *   src/engine/aLookup.v0.1.0.js into the same console. That registers
 *   window.TseALookup and the probe then uses the REAL module instead of its mirror.
 *   Either way the probe prints a hash so the body can be verified against the repo.
 *
 * Output contract: PROBE_JSON is the FIRST and ONLY json line (a 5000-char paste cap
 *   truncated three earlier probes). Verbose detail is opt-in via window.__A_FULL.
 *
 * SPDX: Smart-FFA-1.1
 */
(function aRegister(){
  'use strict';
  var out = {
    meta: { test: 'A-REGISTER-v1', gate: 'G-12', evidenceId: 'E-055',
            host: (typeof location !== 'undefined' ? location.host : 'unknown'),
            parTree: '15131F', capturedAt: new Date().toISOString(),
            method: 'generate A body -> capacity -> syntax -> register in the real FilterCode slot -> byte round-trip -> behavioural smoke test -> rollback' },
    slot: {}, capacity: {}, syntax: {}, register: {}, roundTrip: {}, settings: {},
    behaviour: {}, rollback: {}, status: 'unknown', verdict: ''
  };
  function j(o){ return JSON.stringify(o); }

  // ---------- mirror of aLookup.buildFilterCodeBody (used only if the module is absent) ----------
  var MIRROR_VERSION = '0.1.0-aLookup-001';
  function mirrorBody(){
    return [
      '// tseZharfaKavosh A lookup ' + MIRROR_VERSION + ' — reads only B published projection',
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
  }
  // FNV-1a 32-bit, so the body can be verified against the repo without a copy-paste diff
  function fnv1a(s){ var h = 0x811c9dc5, i; for (i = 0; i < s.length; i++){ h ^= s.charCodeAt(i) & 0xff; h = (h * 0x01000193) >>> 0; } return ('00000000' + h.toString(16)).slice(-8); }

  try {
    var mw = (typeof window !== 'undefined') ? window.mw : null;
    out.slot.hasMw = !!mw;
    out.slot.hasFilterCode = !!(mw && 'FilterCode' in mw);
    out.slot.saveParamsType = (mw && typeof mw.SaveParams) || 'undefined';

    // ---------- 1. the body: the real module if it is loaded, else the mirror ----------
    var A = (typeof window !== 'undefined') ? window.TseALookup : null;
    var art, body, source;
    if (A && typeof A.buildFilterCode === 'function') {
      art = A.buildFilterCode(); body = art.body; source = 'module';
    } else {
      body = mirrorBody(); source = 'mirror';
      art = { bytes: body.length, limit: 4096, fits: body.length <= 4096, version: MIRROR_VERSION };
    }
    out.capacity = { source: source, version: art.version, bytes: art.bytes, limit: art.limit,
                     fits: art.fits, fnv1a: fnv1a(body), lines: body.split('\n').length,
                     nonAscii: /[^\x00-\x7F]/.test(body),
                     head: body.slice(0, 46), tail: body.slice(-24) };

    // ---------- 2. syntax: the body must compile in the filter slot's signature ----------
    var compiled = null, compileErr = null;
    try { compiled = new Function('row', 'mw', body + '\nreturn FilterResult;'); }
    catch (e) { compileErr = String((e && e.message) || e); }
    out.syntax = { compiles: !!compiled, error: compileErr };

    // ---------- 3. register the REAL body in the real slot ----------
    var original = (mw && typeof mw.FilterCode !== 'undefined' && mw.FilterCode != null) ? String(mw.FilterCode) : '';
    out.slot.originalLen = original.length;
    out.slot.originalPreview = original.slice(0, 60);
    var persistErr = null;
    out.register.persisted = false;
    try {
      if (mw) mw.FilterCode = body;
      if (mw && typeof mw.SaveParams === 'function') { mw.SaveParams(); out.register.persisted = true; }
      else persistErr = 'SaveParams not a function';
    } catch (e) { persistErr = String((e && e.message) || e); }
    out.register.persistError = persistErr;

    // ---------- 4. byte-for-byte round-trip ----------
    var back = (mw && typeof mw.FilterCode !== 'undefined' && mw.FilterCode != null) ? String(mw.FilterCode) : '';
    var norm = function (s) { return s.replace(/\r\n?/g, '\n').replace(/[ \t]+/g, ' ').trim(); };
    out.roundTrip = {
      observedLen: back.length,
      identical: (back === body),
      normalizedIdentical: (norm(back) === norm(body)),
      newlinesIn: (body.match(/\n/g) || []).length,
      newlinesOut: (back.match(/\n/g) || []).length,
      fnv1aOut: fnv1a(back),
      firstDiffAt: (function () { var n = Math.min(back.length, body.length), i;
        for (i = 0; i < n; i++) if (back.charCodeAt(i) !== body.charCodeAt(i)) return i; return back.length === body.length ? -1 : n; })()
    };

    // ---------- 5. the persisted settings view ----------
    try {
      var st = mw ? mw.Settings : null;
      var fno = (st && typeof st.FilterNo !== 'undefined') ? st.FilterNo : null;
      var arr = (st && st.Filters) ? st.Filters : null;
      var entry = (arr && fno != null && arr[fno]) ? arr[fno] : null;
      out.settings = { filterNo: fno, filtersLen: arr ? arr.length : null,
                       entryCodeLen: entry ? String(entry.FilterCode || '').length : null,
                       entryMatches: !!(entry && String(entry.FilterCode || '') === body) };
    } catch (e) { out.settings.error = String((e && e.message) || e); }

    // ---------- 6. behavioural smoke test on the body that round-tripped ----------
    // The site cannot run the filter from here, so this proves the REGISTERED bytes are
    // functional: 8 rows, one published projection, fail-open on every missing piece.
    try {
      // positions must land in the same BYTE as the arrays above, otherwise the guard's
      // `__b < known.length` check fails open and the case proves nothing
      var mwMock = { __B_index: { 'A': 0, 'B': 9, 'C': 1 },
                     __B_known: new Uint8Array([0b00000011]),   // A and C known, B (byte 1) not
                     __B_bitset: new Uint8Array([0b00000001]) }; // A passes, C fails
      var fn = compiled || new Function('row', 'mw', back + '\nreturn FilterResult;');
      var cases = [];
      function t(row, mwLike, expect, label){
        var got; try { got = fn(row, mwLike); } catch (e) { got = 'throw:' + e.message; }
        cases.push({ label: label, got: got, expect: expect, ok: got === expect });
      }
      t({ inscode: 'A' }, mwMock, true, 'known+pass -> visible');
      t({ inscode: 'C' }, mwMock, false, 'known+fail -> hidden');
      t({ inscode: 'B' }, mwMock, true, 'known=0 -> fail-open');
      t({ inscode: 'Z' }, mwMock, true, 'not indexed -> fail-open');
      t({ inscode: 'A' }, {}, true, 'no projection -> fail-open');
      t(null, mwMock, true, 'no row -> fail-open');
      t({ inscode: 'A' }, { __B_index: mwMock.__B_index, __B_known: new Uint8Array([0]), __B_bitset: mwMock.__B_bitset }, true, 'empty known -> fail-open');
      out.behaviour = { ran: true, cases: cases, allOk: cases.every(function (c) { return c.ok; }) };
    } catch (e) { out.behaviour = { ran: false, error: String((e && e.message) || e) }; }

    // ---------- 7. rollback ----------
    out.rollback.restored = false; out.rollback.error = null;
    try {
      if (mw) mw.FilterCode = original;
      if (mw && typeof mw.SaveParams === 'function') mw.SaveParams();
      var after = (mw && typeof mw.FilterCode !== 'undefined' && mw.FilterCode != null) ? String(mw.FilterCode) : '';
      out.rollback.restored = (after === original);
      out.rollback.afterLen = after.length;
    } catch (e) { out.rollback.error = String((e && e.message) || e); }

    // ---------- verdict ----------
    var okSlot = out.slot.hasMw && out.slot.hasFilterCode && out.slot.saveParamsType === 'function';
    out.status = (okSlot && out.capacity.fits && out.syntax.compiles && out.register.persisted &&
                  out.roundTrip.identical && out.behaviour.allOk && out.rollback.restored)
      ? 'candidate-confirmed' : 'needs-investigation';
    out.verdict = out.status === 'candidate-confirmed'
      ? 'the generated A body registers and round-trips byte-for-byte, compiles, behaves fail-open, and rolls back'
      : 'one or more checks failed - see the failing field';
  } catch (e) {
    out.error = String((e && e.message) || e);
    out.status = 'error';
  }

  console.log('PROBE_JSON ' + j(out));
  console.log('A-REGISTER: ' + out.verdict + ' | body ' + out.capacity.bytes + 'B/' + out.capacity.limit +
              ' (' + out.capacity.source + ', fnv1a ' + out.capacity.fnv1a + ') | identical=' +
              out.roundTrip.identical + ' compiles=' + out.syntax.compiles +
              ' behaviour=' + (out.behaviour.allOk === true) + ' rollback=' + out.rollback.restored);
  if (typeof window !== 'undefined' && window.__A_FULL === true) console.log('A_REGISTER_FULL ' + j(out));
})();
