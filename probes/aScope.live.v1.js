/**
 * tseZharfaKavosh — A scope live probe v1 (G-22)
 * Purpose: the LAST unknown before A can be registered for real. E-056 proved that
 *   PrepareFilterCode leaves the 430-byte body untouched and that `row` is in the filter's
 *   scope (the 61 rules are written against it), but nothing proves the body can see `mw` -
 *   and the body reads mw.__B_index / mw.__B_known / mw.__B_bitset. If `mw` is not visible
 *   from the filter context, B must publish the projection on window.__B_* instead.
 *
 *   Method: register an INSTRUMENTED body that (a) counts how many times it runs, (b)
 *   records what it can see (mw, mw.__B_index, row, row.inscode, window), and (c) returns
 *   true so nothing is hidden. The page re-renders on a timer (Settings.UpdateSpeed), so
 *   we poll the counters every 250ms for 4s and read them back at the end:
 *     runs > 0, firstRunAtMs  -> the registered code really is evaluated, and how often
 *     sawMw / sawIndex        -> whether `mw` and `mw.__B_index` are in scope
 *     sawRow / sawWindow      -> the rest of the context
 *     stillRegistered         -> whether the slot still holds our code after the wait
 *   Everything is rolled back (restore both copies + SaveParams) before printing.
 *
 * RUN HERE (always): old.tsetmc.com/Loader.aspx?ParTree=15131F  ->  Console (F12)
 *   tag: [کنسول] — paste, then WAIT ~5 seconds; the result is printed when the wait ends.
 *
 * Output contract: PROBE_JSON is the FIRST and ONLY json line (the paste channel is
 *   ~5000 chars; this one is ~1.5 KB).
 *
 * SPDX: Smart-FFA-1.1
 */
(function aScope(){
  'use strict';
  var WINDOW_MS = 4000, POLL_MS = 250;
  var out = {
    meta: { test: 'A-SCOPE-v1', gate: 'G-22', evidenceId: 'E-057',
            host: (typeof location !== 'undefined') ? location.host : 'unknown',
            parTree: '15131F', capturedAt: new Date().toISOString(),
            method: 'register an instrumented body via the E-056 path -> poll its counters 4s -> rollback -> print' },
    registration: {}, instrumented: {}, scope: {}, timing: {}, rollback: {},
    status: 'unknown', verdict: ''
  };

  // the instrumented body: same shape as the real one (same guards, same mw.__B_* reads)
  // but it also records what it could see and counts its own runs
  var BODY = [
    'var FilterResult = true;',
    'try {',
    '  var __g = (typeof window !== "undefined") ? window : this;',
    '  if (__g) {',
    '    __g.__A_SCOPE_RUNS = (__g.__A_SCOPE_RUNS || 0) + 1;',
    '    if (__g.__A_SCOPE_RUNS === 1) {',
    '      __g.__A_SCOPE = { sawMw: (typeof mw !== "undefined" && !!mw),',
    '                        sawIndex: (typeof mw !== "undefined" && !!mw.__B_index),',
    '                        sawKnown: (typeof mw !== "undefined" && !!mw.__B_known),',
    '                        sawBitset: (typeof mw !== "undefined" && !!mw.__B_bitset),',
    '                        sawRow: (typeof row !== "undefined" && !!row),',
    '                        sawInscode: (typeof row !== "undefined" && row && row.inscode !== undefined) ? String(row.inscode) : null,',
    '                        sawWindow: (typeof window !== "undefined"),',
    '                        sawFilterResult: (typeof FilterResult !== "undefined"),',
    '                        rowKeys: (typeof row !== "undefined" && row) ? Object.keys(row).slice(0, 8) : null };',
    '    }',
    '  }',
    '} catch (e) { try { window.__A_SCOPE_ERR = String(e && e.message || e); } catch (e2) {} }',
    'var __i = (typeof mw !== "undefined") ? mw.__B_index : null;',
    'if (__i && typeof mw !== "undefined" && mw.__B_known && mw.__B_bitset && typeof row !== "undefined" && row) {',
    '  var __p = __i[row.inscode];',
    '  if (__p !== undefined) {',
    '    var __b = __p >> 3, __m = __p & 7;',
    '    if (__b >= 0 && __b < mw.__B_known.length && (mw.__B_known[__b] >> __m) & 1) {',
    '      FilterResult = !!((mw.__B_bitset[__b] >> __m) & 1);',
    '    }',
    '  }',
    '}'
  ].join('\n');

  function readMarks() {
    return { runs: (typeof window !== 'undefined' && window.__A_SCOPE_RUNS) || 0,
             scope: (typeof window !== 'undefined' && window.__A_SCOPE) || null,
             error: (typeof window !== 'undefined' && window.__A_SCOPE_ERR) || null };
  }
  function clearMarks() {
    if (typeof window === 'undefined') return;
    delete window.__A_SCOPE_RUNS; delete window.__A_SCOPE; delete window.__A_SCOPE_ERR;
  }

  try {
    var mw = (typeof window !== 'undefined') ? window.mw : null;
    out.registration.hasMw = !!mw;
    var fno = (mw && mw.Settings && typeof mw.Settings.FilterNo !== 'undefined') ? mw.Settings.FilterNo : null;
    out.registration.filterNo = fno;
    out.registration.hasPrepare = !!(mw && typeof mw.PrepareFilterCode === 'function');
    var savedSettingsCode = '', savedFilterCode = '';
    if (mw && mw.Settings && mw.Settings.Filters && fno != null && mw.Settings.Filters[fno]) {
      savedSettingsCode = String(mw.Settings.Filters[fno].FilterCode || '');
    }
    if (mw && mw.FilterCode != null) savedFilterCode = String(mw.FilterCode);
    out.registration.savedLen = savedSettingsCode.length;

    // ---------- register via the E-056 path: two writes + save ----------
    var compiled = null, prepErr = null;
    try { compiled = mw.PrepareFilterCode(BODY); } catch (e) { prepErr = String((e && e.message) || e); }
    out.registration.prepareError = prepErr;
    out.registration.compiledLen = (typeof compiled === 'string') ? compiled.length : null;
    out.registration.compiledIdentical = (typeof compiled === 'string') ? (compiled === BODY) : null;
    out.registration.compiledHead = (typeof compiled === 'string') ? compiled.slice(0, 32) : null;
    out.instrumented.bytes = BODY.length;

    clearMarks();
    try {
      if (mw && mw.Settings && mw.Settings.Filters && fno != null && mw.Settings.Filters[fno]) {
        mw.Settings.Filters[fno].FilterCode = (typeof compiled === 'string') ? compiled : BODY;
      }
      if (mw) mw.FilterCode = (typeof compiled === 'string') ? compiled : BODY;
      if (mw && typeof mw.SaveParams === 'function') mw.SaveParams();
      out.registration.registered = true;
    } catch (e) { out.registration.registered = false; out.registration.error = String((e && e.message) || e); }

    // ---------- poll the counters while the page renders ----------
    var started = Date.now(), firstRunAtMs = -1, maxRuns = 0, last = null;
    var poll = setInterval(function () {
      var s = readMarks();
      last = s;
      if (s.runs > 0 && firstRunAtMs < 0) firstRunAtMs = Date.now() - started;
      if (s.runs > maxRuns) maxRuns = s.runs;
    }, POLL_MS);

    setTimeout(function () {
      clearInterval(poll);
      var s = readMarks(); last = s || last;
      var sc = (s && s.scope) || (last && last.scope) || null;
      out.timing = { waitedMs: WINDOW_MS, pollMs: POLL_MS, firstRunAtMs: firstRunAtMs,
                     updateSpeed: (mw && mw.Settings) ? mw.Settings.UpdateSpeed : null };
      out.scope = sc || {};
      out.instrumented = { bytes: BODY.length, runs: maxRuns, evaluated: (maxRuns > 0),
                           error: (s && s.error) || null,
                           sawMw: !!(sc && sc.sawMw), sawIndex: !!(sc && sc.sawIndex),
                           sawKnown: !!(sc && sc.sawKnown), sawBitset: !!(sc && sc.sawBitset),
                           sawRow: !!(sc && sc.sawRow), sawWindow: !!(sc && sc.sawWindow) };
      if (sc) out.scope = sc;

      // ---------- rollback: put the page back exactly as it was found ----------
      out.rollback.restored = false; out.rollback.error = null;
      try {
        var nowCode = '';
        if (mw && mw.Settings && mw.Settings.Filters && fno != null && mw.Settings.Filters[fno]) {
          nowCode = String(mw.Settings.Filters[fno].FilterCode || '');
          mw.Settings.Filters[fno].FilterCode = savedSettingsCode;
        }
        if (mw) mw.FilterCode = savedFilterCode;
        if (mw && typeof mw.SaveParams === 'function') mw.SaveParams();
        var okSettings = true, okCode = true;
        if (mw && mw.Settings && mw.Settings.Filters && fno != null && mw.Settings.Filters[fno]) {
          okSettings = String(mw.Settings.Filters[fno].FilterCode || '') === savedSettingsCode;
        }
        if (mw) okCode = String(mw.FilterCode || '') === savedFilterCode;
        out.rollback.restored = okSettings && okCode;
        out.rollback.stillRegisteredAtEnd = (nowCode === ((typeof compiled === 'string') ? compiled : BODY));
      } catch (e) { out.rollback.error = String((e && e.message) || e); }
      clearMarks();

      // ---------- verdict. G-22 asks about the SCOPE only: can the body see `mw`.
      // mw.__B_index is reported separately as informational - publishing it is B's job. ----------
      out.status = (!out.instrumented.evaluated) ? 'not-evaluated'
        : (out.instrumented.sawMw) ? 'scope-ok'
        : 'scope-blocked';
      out.verdict = out.status === 'scope-ok'
        ? 'the registered code IS evaluated per row and mw IS visible from the filter context - A can read mw.__B_index directly'
        : (out.status === 'scope-blocked'
          ? 'the code runs but cannot see mw - B must publish the projection on window.__B_* instead of mw.__B_*'
          : 'the registered code was never evaluated - the filter code is stored but not executed; the registration path or the render trigger needs another probe');
      console.log('PROBE_JSON ' + JSON.stringify(out));
      console.log('A-SCOPE: ' + out.verdict);
      console.log('  runs=' + out.instrumented.runs + ' firstRunAt=' + out.timing.firstRunAtMs +
                  'ms sawMw=' + out.instrumented.sawMw + ' sawIndex=' + out.instrumented.sawIndex +
                  ' sawRow=' + out.instrumented.sawRow + ' updateSpeed=' + out.timing.updateSpeed +
                  ' stillRegistered=' + out.rollback.stillRegisteredAtEnd + ' rollback=' + out.rollback.restored);
      if (typeof window !== 'undefined' && window.__A_FULL === true) console.log('A_SCOPE_FULL ' + JSON.stringify(out));
    }, WINDOW_MS);
  } catch (e) {
    out.error = String((e && e.message) || e);
    out.status = 'error';
    console.log('PROBE_JSON ' + JSON.stringify(out));
  }
})();
