/**
 * tseZharfaKavosh — A slot hygiene live probe v1
 *
 * Why this probe exists. The 2026-10-20 re-run of probes/aRegister.live.v1.js reported
 *   `slot.originalLen: 1409` with the preview `var FilterResult = true;\ntry {\n  var __g =
 *   (typeof window !=` - which is byte-for-byte the head of the INSTRUMENTED body used by
 *   probes/aTrigger.live.v1.js (E-058), not a body the owner wrote. So a probe body is
 *   sitting in the owner's live filter slot and it survived a page reload, i.e. it was
 *   persisted. Two things follow: (1) the owner's page must be inspected and, if they want,
 *   cleaned; (2) rollback of the in-memory object plus SaveParams did NOT guarantee a clean
 *   persisted copy, which is a governance finding about every rollback we have done so far.
 *
 * What it does - read-only unless the owner opts in.
 *   - every slot in mw.Settings.Filters: index, FilterName, code length, fnv1a, a
 *     classification (probe-body / real-A-body / site-dsl / empty / unknown) and the head.
 *   - mw.FilterCode (the mirror) and whether it matches the active slot.
 *   - the persisted copy: getData('MarketWatchSettings') length, and the same per-slot
 *     classification INSIDE the persisted JSON, so we can see whether storage still holds a
 *     probe body even when memory looks clean.
 *   - leftover marks on the page (window.__A_SCOPE_RUNS, __A_SCOPE, __A_SCOPE_ERR,
 *     __A_REAL_RESTORE, __B_index...).
 *   - CLEAN MODE, only when window.__A_CLEAN === true: clears ONLY the slots classified as
 *     probe-body (never a site-dsl or unknown slot), syncs the mirror, calls SaveParams,
 *     then re-reads the persisted copy to prove the storage is clean too. Default is a
 *     pure read - running this probe changes nothing.
 *
 * RUN HERE (always): old.tsetmc.com/Loader.aspx?ParTree=15131F  ->  Console (F12)
 *   tag: [کنسول] — paste; the result is printed immediately (no waiting).
 *   To clean as well, first type:  window.__A_CLEAN = true   and then paste again.
 *
 * SPDX: Smart-FFA-1.1
 */
(function aHygiene(){
  'use strict';
  var out = {
    meta: { test: 'A-SLOT-HYGIENE-v1', evidenceId: 'E-059',
            host: (typeof location !== 'undefined') ? location.host : 'unknown',
            parTree: '15131F', capturedAt: new Date().toISOString(),
            mode: (typeof window !== 'undefined' && window.__A_CLEAN === true) ? 'clean' : 'read-only',
            method: 'classify every filter slot + the mirror + the persisted storage; clean only probe bodies, and only when window.__A_CLEAN === true' },
    slots: [], mirror: {}, persisted: {}, marks: {}, cleaned: [],
    status: 'unknown', verdict: ''
  };
  var mw = (typeof window !== 'undefined') ? window.mw : null;

  function fnv1a(s){ var h = 0x811c9dc5, i; for (i = 0; i < s.length; i++){ h ^= s.charCodeAt(i) & 0xff; h = (h * 0x01000193) >>> 0; } return ('00000000' + h.toString(16)).slice(-8); }
  function classify(code) {
    if (!code) return 'empty';
    if (/__A_SCOPE_RUNS|__A_SCOPE|__A_TRIGGER/.test(code)) return 'probe-body';
    if (/tseZharfaKavosh A lookup/.test(code)) return 'real-A-body';
    if (/FilterResult/.test(code) && /row\[/.test(code)) return 'site-dsl-compiled';
    if (/FilterResult/.test(code)) return 'js-unknown';
    return 'unknown';
  }
  function describe(code) {
    return { len: code.length, fnv1a: fnv1a(code), cls: classify(code), head: code.slice(0, 70) };
  }
  function readPersisted() {
    var r = { available: false, len: null, slots: [], note: '' };
    if (typeof window === 'undefined' || typeof window.getData !== 'function') { r.note = 'window.getData is not a function'; return r; }
    try {
      var raw = window.getData('MarketWatchSettings');
      if (raw === undefined || raw === null || raw === '') { r.available = true; r.note = 'no persisted MarketWatchSettings'; return r; }
      r.available = true; r.len = String(raw).length;
      var obj = JSON.parse(String(raw));
      if (obj && obj.Filters) {
        for (var i = 0; i < obj.Filters.length; i++) {
          var f = obj.Filters[i] || {};
          r.slots.push({ i: i, name: (f.FilterName === undefined ? null : f.FilterName),
                         len: (f.FilterCode === undefined ? -1 : String(f.FilterCode).length),
                         cls: classify(String(f.FilterCode || '')) });
        }
      } else r.note += 'persisted JSON has no Filters array; keys=' + Object.keys(obj || {}).join(',') + '; ';
      if (obj && typeof obj.FilterNo !== 'undefined') r.filterNo = obj.FilterNo;
    } catch (e) { r.note += 'read/parse error: ' + String((e && e.message) || e); }
    return r;
  }

  try {
    if (!mw) { out.status = 'no-mw'; out.verdict = 'mw is not on this page'; console.log('PROBE_JSON ' + JSON.stringify(out)); return; }
    var fno = (mw && mw.Settings && typeof mw.Settings.FilterNo !== 'undefined') ? mw.Settings.FilterNo : null;
    out.activeFilterNo = fno;
    out.updateSpeed = (mw && mw.Settings) ? mw.Settings.UpdateSpeed : null;

    // ---------- memory: every slot ----------
    if (mw && mw.Settings && mw.Settings.Filters) {
      for (var i = 0; i < mw.Settings.Filters.length; i++) {
        var f = mw.Settings.Filters[i] || {};
        out.slots.push({ i: i, active: (i === fno),
                         name: (f.FilterName === undefined ? null : f.FilterName),
                         code: describe(String(f.FilterCode || '')) });
      }
    }
    // ---------- the mirror ----------
    out.mirror = { present: (mw.FilterCode !== undefined),
                   len: (mw.FilterCode === undefined || mw.FilterCode === null) ? -1 : String(mw.FilterCode).length,
                   fnv1a: (mw.FilterCode === undefined || mw.FilterCode === null) ? null : fnv1a(String(mw.FilterCode)),
                   cls: (mw.FilterCode === undefined || mw.FilterCode === null) ? 'absent' : classify(String(mw.FilterCode)) };
    if (fno !== null && mw.Settings.Filters[fno]) {
      var active = String(mw.Settings.Filters[fno].FilterCode || '');
      out.mirror.matchesActiveSlot = (String(mw.FilterCode || '') === active);
    }
    // ---------- persisted ----------
    out.persisted = readPersisted();
    // ---------- leftover marks ----------
    out.marks = { __A_SCOPE_RUNS: (typeof window.__A_SCOPE_RUNS !== 'undefined') ? window.__A_SCOPE_RUNS : null,
                  __A_SCOPE: (typeof window.__A_SCOPE !== 'undefined'),
                  __A_SCOPE_ERR: (typeof window.__A_SCOPE_ERR !== 'undefined') ? String(window.__A_SCOPE_ERR).slice(0, 60) : null,
                  __A_REAL_RESTORE: (typeof window.__A_REAL_RESTORE === 'function'),
                  __B_index: (mw.__B_index !== undefined && mw.__B_index !== null),
                  __B_known: (mw.__B_known !== undefined && mw.__B_known !== null),
                  __B_bitset: (mw.__B_bitset !== undefined && mw.__B_bitset !== null),
                  TseBEngine: (typeof window.TseBEngine) };

    // ---------- clean mode (opt-in only) ----------
    if (out.meta.mode === 'clean') {
      var toClear = [];
      for (var k = 0; k < out.slots.length; k++) if (out.slots[k].code.cls === 'probe-body') toClear.push(out.slots[k].i);
      for (var c = 0; c < toClear.length; c++) {
        var idx = toClear[c];
        try {
          mw.Settings.Filters[idx].FilterCode = '';
          out.cleaned.push({ i: idx, cleared: true });
        } catch (e) { out.cleaned.push({ i: idx, cleared: false, error: String((e && e.message) || e) }); }
      }
      // the mirror follows the active slot
      try {
        if (fno !== null && mw.Settings.Filters[fno]) mw.FilterCode = String(mw.Settings.Filters[fno].FilterCode || '');
      } catch (e2) { out.cleaned.push({ mirror: false, error: String((e2 && e2.message) || e2) }); }
      // leftover marks from the probes
      try {
        delete window.__A_SCOPE_RUNS; delete window.__A_SCOPE; delete window.__A_SCOPE_ERR;
        delete window.__A_REAL_RESTORE; delete window.__A_CLEAN;
      } catch (e3) {}
      try { if (typeof mw.SaveParams === 'function') mw.SaveParams(); } catch (e4) {}
      try { if (typeof mw.RenderData === 'function') mw.RenderData(); } catch (e5) {}
      out.persistedAfter = readPersisted();
      out.slotsAfter = [];
      for (var q = 0; q < mw.Settings.Filters.length; q++) {
        var fq = mw.Settings.Filters[q] || {};
        out.slotsAfter.push({ i: q, len: String(fq.FilterCode || '').length, cls: classify(String(fq.FilterCode || '')) });
      }
    }

    // ---------- verdict ----------
    var probeSlots = out.slots.filter(function (s) { return s.code.cls === 'probe-body'; }).length;
    var persistedProbe = (out.persisted.slots || []).filter(function (s) { return s.cls === 'probe-body'; }).length;
    if (out.meta.mode === 'clean') {
      // in clean mode the verdict must read the AFTER state, not the before snapshot
      var afterMem = (out.slotsAfter || []).filter(function (s) { return s.cls === 'probe-body'; }).length;
      var afterPer = (out.persistedAfter && out.persistedAfter.slots) ? out.persistedAfter.slots.filter(function (s) { return s.cls === 'probe-body'; }).length : -1;
      out.status = (afterMem === 0 && afterPer === 0) ? 'cleaned' : 'clean-incomplete';
      out.afterCounts = { memory: afterMem, persisted: afterPer, cleanedSlots: out.cleaned.length };
    } else {
      out.status = (probeSlots > 0) ? 'probe-body-present' : 'clean';
    }
    out.verdict = out.status === 'probe-body-present'
      ? 'a probe body is still in ' + probeSlots + ' of the owner\'s filter slots (active slot ' + fno + ') - re-run with window.__A_CLEAN = true to clear only those'
      : out.status === 'cleaned'
        ? 'probe bodies cleared from memory and from the persisted copy; the owner\'s own filters were not touched'
        : out.status === 'clean-incomplete'
          ? 'clean mode ran but a probe body is still somewhere - read slots/persisted/persistedAfter'
          : 'no probe body in any filter slot and none in the persisted copy';

    console.log('PROBE_JSON ' + JSON.stringify(out));
    console.log('A-HYGIENE [' + out.meta.mode + ']: ' + out.verdict);
    for (var p = 0; p < out.slots.length; p++) {
      var sl = out.slots[p];
      console.log('  slot ' + sl.i + (sl.active ? ' (active)' : '        ') + ' ' + sl.code.cls +
                  ' len=' + sl.code.len + ' fnv1a=' + sl.code.fnv1a + ' name=' + sl.name);
    }
    console.log('  mirror: cls=' + out.mirror.cls + ' len=' + out.mirror.len + ' matchesActiveSlot=' + out.mirror.matchesActiveSlot);
    console.log('  persisted: len=' + out.persisted.len + ' slots=' + JSON.stringify(out.persisted.slots || []) + (out.persisted.note ? ' note=' + out.persisted.note : ''));
    console.log('  marks: ' + JSON.stringify(out.marks));
    if (out.cleaned.length) console.log('  cleaned: ' + JSON.stringify(out.cleaned));
    if (typeof window !== 'undefined' && window.__A_FULL === true) console.log('A_HYGIENE_FULL ' + JSON.stringify(out));
  } catch (e) {
    out.error = String((e && e.message) || e);
    out.status = 'error';
    console.log('PROBE_JSON ' + JSON.stringify(out));
  }
})();
