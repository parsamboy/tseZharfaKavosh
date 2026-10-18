/**
 * tseZharfaKavosh — A trigger live probe v1 (G-22 / G-23)
 *
 * Why this probe exists. E-055/E-056 established HOW to store a filter body
 *   (mw.Settings.Filters[FilterNo].FilterCode + mw.FilterCode + SaveParams), and E-057
 *   proved that storing is NOT enough: the body sat in the active slot for 4s at
 *   UpdateSpeed 1000 and was never executed (runs 0, stillRegistered true). So the site
 *   compiles/activates a filter through its own UI path, and we have to find that path
 *   before the real A body can be registered at all.
 *
 * What it does.
 *   PHASE A - read-only recon: every mw function whose source mentions FilterCode
 *     (name, argCount, first 260 chars), any mw property whose value contains a compiled
 *     body ('FilterResult'), the whole Filters array, and the filter DOM (textareas,
 *     text inputs, buttons, anything with filter in its id).
 *   PHASE B - four activation tests, each independently rolled back:
 *     T1  mw.SelectFilter(FilterNo)                 - the selector E-056 listed
 *     T2  the TextArea path: put the body in the TextArea, fire input/change,
 *         then mw.QueryWindowSaveFilter()
 *     T3  control: mirror + SaveParams (the E-056 path, already known not to run)
 *     T4  any zero-arg mw function named like Render/Update/Refresh/Apply/Load
 *   Each test clears the counters, applies, polls 1.6s, records runs / firstRunAtMs /
 *   sawMw / sawRow / sawInscode, then restores the exact state it found.
 *   PHASE C - full rollback (all Filters entries, FilterNo, every TextArea, SaveParams)
 *     and one JSON line.
 *
 * RUN HERE (always): old.tsetmc.com/Loader.aspx?ParTree=15131F  ->  Console (F12)
 *   tag: [کنسول] — paste, then WAIT ~15 seconds; the result is printed at the end.
 *   The probe never hides a row: the body always returns true (fail-open).
 *
 * SPDX: Smart-FFA-1.1
 */
(function aTrigger(){
  'use strict';
  var TEST_MS = 1600, POLL_MS = 200, RECON_SRC = 260;
  var out = {
    meta: { test: 'A-TRIGGER-v1', gates: 'G-22+G-23', evidenceId: 'E-058',
            host: (typeof location !== 'undefined') ? location.host : 'unknown',
            parTree: '15131F', capturedAt: new Date().toISOString(),
            method: 'read-only recon of every FilterCode-touching function + the filter DOM, then four independently-rolled-back activation tests' },
    recon: {}, dom: {}, tests: [], errors: [], rollback: {},
    status: 'unknown', verdict: ''
  };
  var mw = (typeof window !== 'undefined') ? window.mw : null;

  // ---------- the instrumented body: identical to E-057 so the numbers compare ----------
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
  function pollFor(ms, cb) {
    var t0 = Date.now(), first = -1, max = 0;
    var iv = setInterval(function () {
      var s = readMarks();
      if (s.runs > 0 && first < 0) first = Date.now() - t0;
      if (s.runs > max) max = s.runs;
    }, POLL_MS);
    setTimeout(function () {
      clearInterval(iv);
      var s = readMarks();
      cb({ runs: Math.max(max, s.runs), firstRunAtMs: (first >= 0 ? first : (s.runs > 0 ? 0 : -1)),
           scope: s.scope, error: s.error });
    }, ms);
  }
  function snapshot() {
    var fno = (mw && mw.Settings && typeof mw.Settings.FilterNo !== 'undefined') ? mw.Settings.FilterNo : null;
    var filters = [];
    if (mw && mw.Settings && mw.Settings.Filters) {
      for (var i = 0; i < mw.Settings.Filters.length; i++) {
        var f = mw.Settings.Filters[i] || {};
        filters.push({ FilterName: (f.FilterName === undefined ? null : f.FilterName),
                       FilterCode: (f.FilterCode === undefined ? null : String(f.FilterCode)) });
      }
    }
    var tas = [];
    if (typeof document !== 'undefined') {
      var list = document.getElementsByTagName('textarea');
      for (var j = 0; j < list.length; j++) tas.push({ i: j, value: list[j].value });
    }
    return { filterNo: fno, filters: filters, textareas: tas };
  }
  function restore(snap, cb) {
    try {
      if (mw && mw.Settings && mw.Settings.Filters && snap.filters) {
        for (var i = 0; i < snap.filters.length; i++) {
          var t = mw.Settings.Filters[i];
          if (!t) continue;
          if (snap.filters[i].FilterName !== null && t.FilterName !== snap.filters[i].FilterName) t.FilterName = snap.filters[i].FilterName;
          if (snap.filters[i].FilterCode !== null && String(t.FilterCode || '') !== snap.filters[i].FilterCode) t.FilterCode = snap.filters[i].FilterCode;
        }
      }
      if (mw && mw.Settings && snap.filterNo !== null && mw.Settings.FilterNo !== snap.filterNo) mw.Settings.FilterNo = snap.filterNo;
      if (mw && mw.FilterCode !== undefined) {
        var fno = (mw && mw.Settings) ? mw.Settings.FilterNo : null;
        var want = (fno !== null && mw.Settings.Filters[fno]) ? String(mw.Settings.Filters[fno].FilterCode || '') : '';
        if (String(mw.FilterCode || '') !== want) mw.FilterCode = want;
      }
      if (typeof document !== 'undefined' && snap.textareas) {
        var list = document.getElementsByTagName('textarea');
        for (var j = 0; j < snap.textareas.length && j < list.length; j++) {
          if (list[j].value !== snap.textareas[j].value) list[j].value = snap.textareas[j].value;
        }
      }
      if (mw && typeof mw.SaveParams === 'function') mw.SaveParams();
    } catch (e) { out.errors.push('restore: ' + String((e && e.message) || e)); }
    setTimeout(cb || function () {}, 120);
  }

  // ============================== PHASE A: recon ==============================
  function recon() {
    var r = {};
    r.hasMw = !!mw;
    r.mwKeyCount = mw ? Object.keys(mw).length : 0;
    r.settingsKeys = (mw && mw.Settings) ? Object.keys(mw.Settings) : [];
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
    r.setData = (typeof window !== 'undefined' && typeof window.setData !== 'undefined') ? typeof window.setData : 'absent';
    r.getData = (typeof window !== 'undefined' && typeof window.getData !== 'undefined') ? typeof window.getData : 'absent';
    r.persistedLen = null;
    try {
      if (typeof window !== 'undefined' && typeof window.getData === 'function') {
        var d = window.getData('MarketWatchSettings');
        r.persistedLen = (d === undefined || d === null) ? -1 : String(d).length;
      }
    } catch (e) { r.persistedErr = String((e && e.message) || e); }

    // every mw function whose source mentions FilterCode -> the compile path lives here
    r.filterCodeFns = [];
    // any mw property whose value already contains a compiled body (string or function)
    r.compiledProps = [];
    r.compiledFns = [];
    if (mw) {
      var keys = Object.keys(mw), n = 0;
      for (var k = 0; k < keys.length && n < 40; k++) {
        var key = keys[k], v;
        try { v = mw[key]; } catch (e) { continue; }
        if (typeof v === 'function') {
          var src = '';
          try { src = String(v); } catch (e2) { continue; }
          if (src.indexOf('FilterCode') >= 0) {
            n++;
            r.filterCodeFns.push({ name: key, argCount: v.length, src: src.slice(0, RECON_SRC) });
          }
        } else if (typeof v === 'string' && v.indexOf('FilterResult') >= 0) {
          r.compiledProps.push({ name: key, len: v.length, head: v.slice(0, 60) });
        } else if (typeof v === 'function') {
          var s2 = '';
          try { s2 = String(v); } catch (e3) {}
          if (s2.indexOf('FilterResult') >= 0) {
            r.compiledFns.push({ name: key, argCount: v.length, head: s2.slice(0, 80) });
          }
        }
      }
      r.filterApi = {};
      var api = ['SelectFilter', 'QueryWindowSaveFilter', 'QueryWindowNewFilter', 'QueryWindowCheckFilter',
                 'QueryWindowConfirmDeleteFilter', 'QueryWindowFilterNames', 'QueryWindowEditFilter',
                 'PrepareFilterCode', 'SaveParams', 'RenderData', 'Render', 'UpdateData', 'RefreshData',
                 'ApplyFilter', 'SetFilter', 'LoadSettings', 'GetSettings', 'Filter'];
      for (var a = 0; a < api.length; a++) {
        r.filterApi[api[a]] = (typeof mw[api[a]] === 'function') ? ('fn/' + mw[api[a]].length) : 'absent';
      }
    }
    out.recon = r;

    // ---------- the filter DOM ----------
    var d = { textareas: [], textInputs: [], filterButtons: [], filterIds: [], opened: null };
    if (typeof document !== 'undefined') {
      var tas = document.getElementsByTagName('textarea');
      for (var t = 0; t < tas.length; t++) {
        var el = tas[t];
        d.textareas.push({ i: t, id: el.id || null, name: el.name || null, cls: (el.className || '').toString().slice(0, 40),
                           maxLength: el.maxLength, valueLen: el.value.length,
                           head: el.value.slice(0, 50), visible: !!(el.offsetParent) });
      }
      var ins = document.getElementsByTagName('input');
      for (var q = 0; q < ins.length && d.textInputs.length < 25; q++) {
        var ie = ins[q], ty = (ie.type || '').toLowerCase();
        if (ty === 'text' || ty === 'button' || ty === 'submit') {
          d.textInputs.push({ tag: 'input', type: ty, id: ie.id || null, name: ie.name || null,
                              value: (ie.value || '').slice(0, 40), maxLength: ie.maxLength });
        }
      }
      var all = document.querySelectorAll('[id],[name]');
      for (var z = 0; z < all.length && d.filterIds.length < 30; z++) {
        var idn = (all[z].id || '') + ' ' + (all[z].name || '');
        if (/filter/i.test(idn)) {
          d.filterIds.push({ tag: all[z].tagName, id: all[z].id || null, name: all[z].name || null,
                             type: all[z].type || null, text: (all[z].textContent || '').trim().slice(0, 30) });
        }
      }
    }
    out.dom = d;
  }

  // ============================== PHASE B: tests ==============================
  function pickTextArea() {
    if (typeof document === 'undefined') return null;
    var tas = document.getElementsByTagName('textarea');
    if (!tas.length) return null;
    var best = null, bestLen = -1;
    for (var i = 0; i < tas.length; i++) {
      var el = tas[i];
      var len = el.value.length;
      var codeLen = (mw && mw.Settings && mw.Settings.Filters && mw.Settings.Filters[mw.Settings.FilterNo])
        ? String(mw.Settings.Filters[mw.Settings.FilterNo].FilterCode || '').length : -1;
      if (len > 0 && len === codeLen) return el;          // the live filter editor
      if (len > bestLen) { bestLen = len; best = el; }
    }
    return best;
  }
  function setTextArea(el, value) {
    if (!el) return false;
    el.value = value;
    try { el.dispatchEvent(new Event('input', { bubbles: true })); } catch (e) {
      try { var ev = document.createEvent('HTMLEvents'); ev.initEvent('input', true, true); el.dispatchEvent(ev); } catch (e2) {}
    }
    try { el.dispatchEvent(new Event('change', { bubbles: true })); } catch (e3) {
      try { var ev2 = document.createEvent('HTMLEvents'); ev2.initEvent('change', true, true); el.dispatchEvent(ev2); } catch (e4) {}
    }
    return true;
  }
  function clickFilterSave() {
    if (typeof document === 'undefined') return null;
    var els = document.querySelectorAll('input[type=button],input[type=submit],button,a');
    for (var i = 0; i < els.length; i++) {
      var e = els[i];
      var txt = ((e.value || '') + ' ' + (e.textContent || '') + ' ' + (e.id || '') + ' ' + (e.name || ''));
      if (/filter|فیلتر/i.test(txt) && /save|ذخیره|ثبت/i.test(txt)) {
        try { if (typeof e.click === 'function') e.click(); return (e.id || e.value || e.textContent || 'btn').toString().slice(0, 30); } catch (x) {}
      }
    }
    return null;
  }
  function writeSlot(code) {
    var fno = (mw && mw.Settings) ? mw.Settings.FilterNo : null;
    if (mw && mw.Settings && mw.Settings.Filters && fno !== null && mw.Settings.Filters[fno]) {
      mw.Settings.Filters[fno].FilterCode = code;
    }
    if (mw) mw.FilterCode = code;
  }

  var tests = [
    { name: 'T1-SelectFilter', run: function (res, done) {
        var snap = snapshot(); clearMarks(); writeSlot(BODY);
        try { mw.SelectFilter(mw.Settings.FilterNo); res.called = 'SelectFilter(' + mw.Settings.FilterNo + ')'; }
        catch (e) { res.callError = String((e && e.message) || e); }
        pollFor(TEST_MS, function (p) { res.runs = p.runs; res.firstRunAtMs = p.firstRunAtMs; res.evaluated = p.runs > 0; if (p.scope) res.scope = p.scope; if (p.error) res.bodyError = p.error; restore(snap, done); });
      } },
    { name: 'T2-TextArea-SaveFilter', run: function (res, done) {
        var snap = snapshot(); clearMarks();
        var el = pickTextArea();
        res.textArea = el ? { id: el.id || null, name: el.name || null, before: el.value.length, after: BODY.length } : null;
        if (el) { setTextArea(el, BODY); writeSlot(BODY); }
        res.clicked = clickFilterSave();
        try { mw.QueryWindowSaveFilter(); res.called = 'QueryWindowSaveFilter()' + (res.clicked ? ' + click ' + res.clicked : ''); }
        catch (e) { res.callError = String((e && e.message) || e); }
        if (!el) { res.skipped = 'no textarea in the DOM'; restore(snap, done); return; }
        pollFor(TEST_MS, function (p) { res.runs = p.runs; res.firstRunAtMs = p.firstRunAtMs; res.evaluated = p.runs > 0; if (p.scope) res.scope = p.scope; if (p.error) res.bodyError = p.error; restore(snap, done); });
      } },
    { name: 'T3-mirror-SaveParams-control', run: function (res, done) {
        var snap = snapshot(); clearMarks(); writeSlot(BODY);
        try { mw.SaveParams(); res.called = 'SaveParams()'; } catch (e) { res.callError = String((e && e.message) || e); }
        pollFor(TEST_MS, function (p) { res.runs = p.runs; res.firstRunAtMs = p.firstRunAtMs; res.evaluated = p.runs > 0; if (p.scope) res.scope = p.scope; if (p.error) res.bodyError = p.error; restore(snap, done); });
      } },
    { name: 'T4-render-functions', run: function (res, done) {
        var snap = snapshot(); clearMarks(); writeSlot(BODY);
        var names = ['RenderData', 'Render', 'UpdateData', 'RefreshData', 'ApplyFilter', 'SetFilter', 'LoadSettings'];
        var tried = [];
        for (var i = 0; i < names.length; i++) {
          var f = mw[names[i]];
          if (typeof f === 'function' && f.length === 0) {
            try { f.call(mw); tried.push(names[i] + '()'); } catch (e) { tried.push(names[i] + '!err'); }
          }
        }
        res.called = tried.join(',') || 'none';
        pollFor(TEST_MS, function (p) { res.runs = p.runs; res.firstRunAtMs = p.firstRunAtMs; res.evaluated = p.runs > 0; if (p.scope) res.scope = p.scope; if (p.error) res.bodyError = p.error; restore(snap, done); });
      } }
  ];

  var idx = 0;
  function runNext() {
    if (idx >= tests.length) { finish(); return; }
    var t = tests[idx++], res = { name: t.name }, finished = false;
    var guard = setTimeout(function () { if (!finished) { finished = true; res.timeout = true; push(res); } }, TEST_MS + 4000);
    function done(patch) {
      if (finished) return; finished = true; clearTimeout(guard);
      if (patch) for (var k in patch) res[k] = patch[k];
      push(res);
    }
    function push(r) { out.tests.push(r); setTimeout(runNext, 60); }
    try { t.run(res, done); } catch (e) { res.error = String((e && e.message) || e); done({}); }
  }

  function finish() {
    var winners = [], firstWinner = null;
    for (var i = 0; i < out.tests.length; i++) if (out.tests[i].evaluated) {
      winners.push(out.tests[i].name);
      if (firstWinner === null) firstWinner = out.tests[i].name;
    }
    out.firstWinner = firstWinner;
    out.rollback = { restoredFilters: out.recon.filters, note: 'all Filters entries, FilterNo, every TextArea and mw.FilterCode restored, then SaveParams' };
    clearMarks();
    out.status = winners.length ? 'activated' : 'no-activation-found';
    out.verdict = winners.length
      ? ('the body IS executed - trigger: ' + firstWinner + ' (later tests inherit the compiled body: ' + winners.join(',') + ') - the scope question (G-22) is answered by that test')
      : 'storing the body never triggers execution: the site compiles the filter somewhere else (server-side, or a variable this probe did not touch) - the next probe must follow the compiled body, not the settings object';
    console.log('PROBE_JSON ' + JSON.stringify(out));
    console.log('A-TRIGGER: ' + out.verdict);
    for (var j = 0; j < out.tests.length; j++) {
      var r = out.tests[j];
      console.log('  ' + r.name + ' runs=' + r.runs + ' firstRunAt=' + r.firstRunAtMs +
                  'ms sawMw=' + (r.scope ? !!r.scope.sawMw : 'n/a') +
                  ' sawRow=' + (r.scope ? !!r.scope.sawRow : 'n/a') +
                  ' called=' + r.called + (r.callError ? ' ERR=' + r.callError : '') + (r.skipped ? ' SKIP=' + r.skipped : ''));
    }
    console.log('  recon: filterCodeFns=' + out.recon.filterCodeFns.length +
                ' compiledProps=' + out.recon.compiledProps.length +
                ' compiledFns=' + out.recon.compiledFns.length +
                ' textareas=' + out.dom.textareas.length + ' filterNo=' + out.recon.filterNo);
    if (typeof window !== 'undefined' && window.__A_FULL === true) console.log('A_TRIGGER_FULL ' + JSON.stringify(out));
  }

  try {
    recon();
    if (!mw) { out.status = 'no-mw'; out.verdict = 'mw is not on this page'; console.log('PROBE_JSON ' + JSON.stringify(out)); return; }
    setTimeout(runNext, 50);
  } catch (e) {
    out.errors.push(String((e && e.message) || e));
    out.status = 'error';
    console.log('PROBE_JSON ' + JSON.stringify(out));
  }
})();
