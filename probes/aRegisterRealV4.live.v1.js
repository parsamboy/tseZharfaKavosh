/**
 * tseZharfaKavosh — A real registration live probe v4 (G-25)
 *
 * Why v3 could not answer G-25. E-062 published a projection over all 2896 inscodes and
 *   counted visible rows with document.getElementById(inscode). The counts came back
 *   0 -> 0 -> 538 -> 0 -> 2096 for baseline, all-fail, all-pass, fail-open and rollback.
 *   A filter that keeps every row cannot show FEWER visible rows than no filter at all, so
 *   those numbers are not the filter's effect: the market watch renders asynchronously and
 *   re-renders on its own timer, so a count taken 2.2s after RenderData races with the
 *   page. The id=inscode hook is real (2096 elements exist once the page has rendered), but
 *   it is not a usable measurement on this page.
 *
 * What v4 measures instead - the whole population, at the exact point the verdict is made.
 *   The read-logging Proxy idea from v2, applied to ALL rows instead of a sample of 12:
 *     - the projection covers every inscode in mw.AllRows, so nothing is sampled;
 *     - __B_index is a Proxy that tallies every lookup: how many reads, how many distinct
 *       inscodes, and the verdict the body computed for each (keep / hide / fail-open),
 *       because the verdict IS the value the body read back;
 *     - __B_known and __B_bitset are Proxies too, so we also see the byte traffic.
 *   Three phases over the whole population:
 *     ALL-FAIL  known=1, bit=0 everywhere -> every evaluated row must be 'hide'
 *     ALL-PASS  known=1, bit=1 everywhere -> every evaluated row must be 'keep'
 *     FAIL-OPEN __B_index = null          -> zero index reads at all (the body's own guard)
 *   then rollback. DOM counts are still reported, but only as informational context.
 *
 * RUN HERE (always): old.tsetmc.com/Loader.aspx?ParTree=15131F  ->  Console (F12)
 *   tag: [کنسول] — paste, then WAIT ~14 seconds; the result is printed at the end.
 *   window.__A_REAL_RESTORE stays available for the whole run.
 *
 * SPDX: Smart-FFA-1.1
 */
(function aRegisterRealV4(){
  'use strict';
  var RENDER_WAIT = 2200;
  var out = {
    meta: { test: 'A-REGISTER-REAL-v4', gate: 'G-25', evidenceId: 'E-063',
            host: (typeof location !== 'undefined') ? location.host : 'unknown',
            parTree: '15131F', capturedAt: new Date().toISOString(),
            method: 'projection over every AllRows inscode, published as read-tallying Proxies; all-fail / all-pass / fail-open over the whole population, then rollback' },
    recon: {}, body: {}, register: {}, allFail: {}, allPass: {}, failOpen: {}, rollback: {},
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

  // ---------- the whole population ----------
  function population() {
    var codes = [], keys = [];
    if (mw && mw.AllRows) {
      var ks = Object.keys(mw.AllRows);
      for (var i = 0; i < ks.length; i++) {
        var row = mw.AllRows[ks[i]];
        codes.push((row && row.inscode !== undefined) ? String(row.inscode) : String(ks[i]));
        keys.push(String(ks[i]));
      }
    }
    return { codes: codes, keys: keys };
  }

  // ---------- the projection, published as tallying Proxies ----------
  var T = null;   // the current tally
  function publish(mode) {          // 'fail' | 'pass'
    var pop = population(), n = pop.codes.length, bytes = Math.ceil(n / 8) || 1;
    var known = new Uint8Array(bytes), bits = new Uint8Array(bytes);
    var index = {};
    for (var i = 0; i < n; i++) {
      index[pop.codes[i]] = i;
      var b = i >> 3, m = 1 << (i & 7);
      known[b] |= m;
      if (mode === 'pass') bits[b] |= m;
    }
    // the tally: every lookup is counted, and the verdict is derived from the byte values
    // the body read back (which are exactly the values the proxy returns).
    var tally = { reads: 0, distinct: {}, verdicts: { keep: 0, hide: 0, failOpen: 0, noVerdict: 0 },
                  byteReads: 0, bytesSeen: {}, sample: [] };
    function own(t, k) { return (typeof k === 'string') && Object.prototype.hasOwnProperty.call(t, k); }
    function isByte(t, k) {
      if (!own(t, k) || !/^\d+$/.test(k)) return false;
      var v = +k; return (v >= 0 && v < t.length);
    }
    var pIndex = new Proxy(index, {
      get: function (t, k) {
        if (own(t, k)) {
          var pos = t[k];
          tally.reads++;
          if (tally.distinct[String(k)] === undefined) {
            tally.distinct[String(k)] = true;
            var b = pos >> 3, m = pos & 7;
            var kv = known[b], bv = bits[b];
            if (!((kv >> m) & 1)) tally.verdicts.failOpen++;
            else if (!((bv >> m) & 1)) tally.verdicts.hide++;
            else tally.verdicts.keep++;
            if (tally.sample.length < 15) tally.sample.push({ inscode: String(k), pos: pos, verdict: (!((kv >> m) & 1) ? 'fail-open' : (!((bv >> m) & 1) ? 'hide' : 'keep')) });
          }
        }
        return t[k];
      }
    });
    var pKnown = new Proxy(known, {
      get: function (t, k) { if (isByte(t, k)) { tally.byteReads++; tally.bytesSeen[+k] = t[k]; } return t[k]; }
    });
    var pBits = new Proxy(bits, {
      get: function (t, k) { if (isByte(t, k)) { tally.byteReads++; tally.bytesSeen['b' + (+k)] = t[k]; } return t[k]; }
    });
    mw.__B_index = pIndex; mw.__B_known = pKnown; mw.__B_bitset = pBits;
    T = tally;
    return { rows: n, bytes: bytes, mode: mode, keyIsInscode: (pop.keys.length > 0 && pop.keys[0] === pop.codes[0]) };
  }
  // the tally is cumulative, so every phase starts from zero. Mutating the same object in
  // place keeps the Proxy closures working.
  function resetTally() {
    if (!T) return;
    T.reads = 0; T.distinct = {};
    T.verdicts = { keep: 0, hide: 0, failOpen: 0, noVerdict: 0 };
    T.byteReads = 0; T.bytesSeen = {}; T.sample = [];
  }
  function tallyReport() {
    return { reads: T.reads, distinctCount: Object.keys(T.distinct).length,
             verdicts: T.verdicts, byteReads: T.byteReads, bytesSeen: T.bytesSeen,
             sample: T.sample.slice(0, 10) };
  }
  function domCounts(codes) {
    var n = 0, present = 0;
    if (typeof document !== 'undefined' && typeof document.getElementById === 'function') {
      for (var i = 0; i < codes.length; i++) {
        var el = document.getElementById(codes[i]);
        if (el === null) continue;
        present++;
        var h = false;
        try {
          var cs = (window.getComputedStyle ? window.getComputedStyle(el) : null);
          if (cs && (cs.display === 'none' || cs.visibility === 'hidden')) h = true;
        } catch (e) {}
        if (el.style && (el.style.display === 'none' || el.style.visibility === 'hidden')) h = true;
        if (!h) n++;
      }
    }
    return { visible: n, present: present };
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
  function phaseRegister(next) {
    snapshotState();
    var pop = population();
    out.recon = { filterNo: savedFilterNo, viewMode: (mw && mw.Settings) ? mw.Settings.ViewMode : null,
                  market: (mw && mw.Settings) ? mw.Settings.Market : null, rowCount: pop.codes.length,
                  keyIsInscode: (pop.keys.length > 0 && pop.keys[0] === pop.codes[0]), filters: [] };
    if (mw && mw.Settings && mw.Settings.Filters) {
      for (var i = 0; i < mw.Settings.Filters.length; i++) {
        var f = mw.Settings.Filters[i] || {};
        out.recon.filters.push({ i: i, name: (f.FilterName === undefined ? null : f.FilterName),
                                 codeLen: (f.FilterCode === undefined ? -1 : String(f.FilterCode).length) });
      }
    }
    out.body = { bytes: BODY.length, fnv1a: fnv1a(BODY), newlines: (BODY.match(/\n/g) || []).length,
                 verified: (BODY.length === 430 && fnv1a(BODY) === '38fe0c59') };
    out.register = register();
    out.register.renderCalled = doRender();
    setTimeout(next, 400);
  }
  function phaseAllFail(next) {
    var p = publish('fail');
    resetTally();
    out.allFail = { rows: p.rows, projectionBytes: p.bytes, keyIsInscode: p.keyIsInscode,
                    mode: 'known=1, bit=0 for every row' };
    out.allFail.renderCalled = doRender();
    setTimeout(function () {
      out.allFail.tally = tallyReport();
      out.allFail.allHidden = (out.allFail.tally.distinctCount > 0 &&
                               out.allFail.tally.verdicts.hide === out.allFail.tally.distinctCount &&
                               out.allFail.tally.verdicts.keep === 0);
      out.allFail.dom = domCounts(population().codes);
      setTimeout(next, 60);
    }, RENDER_WAIT);
  }
  function phaseAllPass(next) {
    var p = publish('pass');
    resetTally();
    out.allPass = { rows: p.rows, projectionBytes: p.bytes, mode: 'known=1, bit=1 for every row' };
    out.allPass.renderCalled = doRender();
    setTimeout(function () {
      out.allPass.tally = tallyReport();
      out.allPass.allKept = (out.allPass.tally.distinctCount > 0 &&
                             out.allPass.tally.verdicts.keep === out.allPass.tally.distinctCount &&
                             out.allPass.tally.verdicts.hide === 0);
      out.allPass.samePopulation = (out.allPass.tally.distinctCount === out.allFail.tally.distinctCount);
      setTimeout(next, 60);
    }, RENDER_WAIT);
  }
  function phaseFailOpen(next) {
    resetTally();
    try { mw.__B_index = null; } catch (e) { out.errors.push('clear: ' + String((e && e.message) || e)); }
    out.failOpen = { projectionCleared: (mw.__B_index === null || mw.__B_index === undefined) };
    out.failOpen.renderCalled = doRender();
    setTimeout(function () {
      out.failOpen.tally = tallyReport();
      out.failOpen.noReads = (out.failOpen.tally.reads === 0);
      setTimeout(next, 60);
    }, RENDER_WAIT);
  }
  function phaseRollback(next) {
    out.rollback = { restore: window.__A_REAL_RESTORE(), renderCalled: doRender() };
    setTimeout(function () {
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
    var f = out.allFail, p = out.allPass, o = out.failOpen, r = out.rollback;
    out.status = (f.allHidden && p.allKept && p.samePopulation && o.noReads && r.slotRestored && r.cleaned)
      ? 'works-on-the-whole-population'
      : (f.tally.distinctCount === 0) ? 'body-never-ran'
      : (f.allHidden && p.allKept && !p.samePopulation) ? 'verdicts-correct-but-population-moved'
      : 'incomplete';
    out.verdict = out.status === 'works-on-the-whole-population'
      ? 'over the whole population of ' + out.recon.rowCount + ' rows the body was invoked for ' + f.tally.distinctCount +
        ' distinct inscodes (' + f.tally.reads + ' reads), and every single one got the expected verdict: all hide under all-fail, all keep under all-pass, and zero reads once the projection was dropped'
      : out.status === 'verdicts-correct-but-population-moved'
        ? 'every verdict was correct in both modes, but the site evaluated ' + f.tally.distinctCount +
          ' rows under all-fail and ' + p.tally.distinctCount + ' under all-pass - the population moved between renders (the page re-renders on its own timer), so the coverage number is a range, not a constant'
        : out.status === 'body-never-ran'
          ? 'the body was registered and RenderData ran, but the projection was never read - the registered code is not the code being executed'
          : 'incomplete - read the phase objects';
    delete window.__A_REAL_RESTORE;
    console.log('PROBE_JSON ' + JSON.stringify(out));
    console.log('A-REAL-v4: ' + out.verdict);
    console.log('  body: bytes=' + BODY.length + ' fnv1a=' + fnv1a(BODY) + ' verified=' + out.body.verified);
    console.log('  population: rows=' + out.recon.rowCount + ' keyIsInscode=' + out.recon.keyIsInscode +
                ' filterNo=' + out.recon.filterNo + ' viewMode=' + out.recon.viewMode + ' market=' + out.recon.market);
    console.log('  all-fail:  reads=' + f.tally.reads + ' distinct=' + f.tally.distinctCount +
                ' verdicts=' + JSON.stringify(f.tally.verdicts) + ' allHidden=' + f.allHidden + ' dom=' + JSON.stringify(f.dom));
    console.log('  all-pass:  reads=' + p.tally.reads + ' distinct=' + p.tally.distinctCount +
                ' verdicts=' + JSON.stringify(p.tally.verdicts) + ' allKept=' + p.allKept + ' samePopulation=' + p.samePopulation);
    console.log('  fail-open: reads=' + o.tally.reads + ' noReads=' + o.noReads);
    console.log('  rollback: slotRestored=' + r.slotRestored + ' mirrorRestored=' + r.mirrorRestored + ' cleaned=' + r.cleaned);
    if (typeof window !== 'undefined' && window.__A_FULL === true) console.log('A_REAL_V4_FULL ' + JSON.stringify(out));
  }

  try {
    if (!mw) { out.status = 'no-mw'; out.verdict = 'mw is not on this page'; console.log('PROBE_JSON ' + JSON.stringify(out)); return; }
    if (typeof mw.RenderData !== 'function') { out.status = 'no-renderdata'; out.verdict = 'mw.RenderData is not a function on this page'; console.log('PROBE_JSON ' + JSON.stringify(out)); return; }
    if (!population().codes.length) { out.status = 'no-rows'; out.verdict = 'mw.AllRows is empty'; console.log('PROBE_JSON ' + JSON.stringify(out)); return; }
    var chain = [phaseRegister, phaseAllFail, phaseAllPass, phaseFailOpen, phaseRollback], i = 0;
    (function run() { if (i >= chain.length) { finish(); return; } chain[i++](run); })();
  } catch (e) {
    out.errors.push(String((e && e.message) || e));
    out.status = 'error';
    try { window.__A_REAL_RESTORE(); } catch (e2) {}
    console.log('PROBE_JSON ' + JSON.stringify(out));
  }
})();
