/**
 * tseZharfaKavosh — filter-slot discovery live probe v1 (G-21)
 * Purpose: E-055 proved the generated A body round-trips through mw.FilterCode
 *   byte-for-byte, but NOT that it is persisted: after SaveParams() the entry still read
 *   Settings.Filters[1].FilterCode len 0. E-026 records SaveParams as
 *   setData("MarketWatchSettings", JSON.stringify(mw.Settings)) - persistence goes through
 *   mw.Settings, so mw.FilterCode may be a write-only mirror. This probe finds out:
 *     1. what filter-related functions/properties the page actually exposes, with their
 *        real source (so PrepareFilterCode's signature is finally recorded in the repo);
 *     2. whether FilterCode is an accessor (get/set) or a plain data property;
 *     3. whether writing mw.FilterCode writes through to Settings.Filters[FilterNo];
 *     4. whether writing Settings.Filters[FilterNo].FilterCode shows up in mw.FilterCode;
 *     5. what PrepareFilterCode does to the generated body (the 61 .replace() rules).
 *
 * RUN HERE (always): old.tsetmc.com/Loader.aspx?ParTree=15131F  ->  Console (F12)
 *   tag: [کنسول] — read-mostly. Every value it touches is saved and restored, and the
 *   original FilterCode is put back before the probe returns.
 *
 * Output contract: PROBE_JSON is the FIRST and ONLY json line (measured 5000-char paste
 *   cap truncated three earlier probes). Verbose detail via window.__G_FULL.
 *
 * SPDX: Smart-FFA-1.1
 */
(function slotDiscovery(){
  'use strict';
  var out = {
    meta: { test: 'SLOT-DISCOVERY-v1', gate: 'G-21', evidenceId: 'E-056',
            host: (typeof location !== 'undefined' ? location.host : 'unknown'),
            parTree: '15131F', capturedAt: new Date().toISOString(),
            method: 'enumerate the filter API -> accessor check -> FilterCode->Settings write-through -> Settings->FilterCode write-through -> PrepareFilterCode behaviour -> rollback' },
    api: [], accessor: {}, state0: {}, writeThrough: {}, reverse: {}, prepare: {},
    rollback: {}, status: 'unknown', verdict: ''
  };

  // the generated A body, byte-identical to aLookup.buildFilterCodeBody (fnv1a 38fe0c59)
  var BODY = [
    '// tseZharfaKavosh A lookup 0.1.0-aLookup-001 — reads only B published projection',
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
  var MARK = 'SLOTDISCOVERY-' + Date.now();

  function activeEntry(mw) {
    try {
      var st = mw.Settings;
      if (!st || !st.Filters) return null;
      var fno = (typeof st.FilterNo !== 'undefined') ? st.FilterNo : null;
      if (fno == null || !st.Filters[fno]) return null;
      return { filterNo: fno, code: String(st.Filters[fno].FilterCode || '') };
    } catch (e) { return null; }
  }

  try {
    var mw = (typeof window !== 'undefined') ? window.mw : null;
    out.state0.hasMw = !!mw;
    var e0 = mw ? activeEntry(mw) : null;
    out.state0.active = e0;
    out.state0.filterCode = mw && mw.FilterCode != null ? String(mw.FilterCode).slice(0, 40) : null;
    out.state0.saveParamsType = (mw && typeof mw.SaveParams) || 'undefined';

    // ---------- 1. enumerate the filter-related API, with real source ----------
    if (mw) {
      var KEYS = ['FilterCode', 'FilterNo', 'SaveParams', 'Settings', 'PrepareFilterCode',
                  'RenderData', 'ApplyFilter', 'SetFilter', 'LoadSettings', 'GetSettings',
                  'SaveSettings', 'Filter', 'Filters', 'MarketWatch', 'SetData', 'GetData'];
      KEYS.forEach(function (k) {
        var present = (k in mw);
        var rec = { key: k, present: present };
        if (present) {
          var v = mw[k];
          rec.type = typeof v;
          if (typeof v === 'function') {
            var src = String(v);
            rec.source = src.slice(0, 240);
            rec.argCount = v.length;
          } else if (v && typeof v === 'object') {
            rec.keys = Object.keys(v).slice(0, 12);
          } else {
            rec.value = String(v).slice(0, 60);
          }
        }
        out.api.push(rec);
      });
      // anything else on mw that mentions filter, case-insensitively
      var extra = [];
      try {
        Object.keys(mw).forEach(function (k) {
          if (/filter/i.test(k) && KEYS.indexOf(k) < 0) extra.push(k);
        });
      } catch (e) {}
      out.api.push({ key: '(other filter-ish keys)', present: extra.length > 0, keys: extra.slice(0, 20) });
    }

    // ---------- 2. is FilterCode an accessor? ----------
    try {
      var d = Object.getOwnPropertyDescriptor(mw, 'FilterCode');
      out.accessor = {
        own: !!d,
        hasGet: !!(d && d.get), hasSet: !!(d && d.set),
        writable: d ? d.writable : null,
        enumerable: d ? d.enumerable : null,
        onPrototype: !d ? !!Object.getOwnPropertyDescriptor(Object.getPrototypeOf(mw), 'FilterCode') : false
      };
    } catch (e) { out.accessor.error = String((e && e.message) || e); }

    // ---------- 3. does writing mw.FilterCode reach Settings.Filters[FilterNo]? ----------
    var beforeEntry = mw ? activeEntry(mw) : null;
    var savedFC = (mw && mw.FilterCode != null) ? String(mw.FilterCode) : '';
    var savedEntry = beforeEntry ? beforeEntry.code : '';
    try {
      if (mw) mw.FilterCode = MARK;
      var afterAssign = mw ? activeEntry(mw) : null;          // before SaveParams
      var spErr = null;
      try { if (mw && typeof mw.SaveParams === 'function') mw.SaveParams(); } catch (e) { spErr = String((e && e.message) || e); }
      var afterSave = mw ? activeEntry(mw) : null;            // after SaveParams
      out.writeThrough = {
        mark: MARK,
        entryBeforeAssign: beforeEntry ? beforeEntry.code.slice(0, 40) : null,
        entryAfterAssign: afterAssign ? afterAssign.code.slice(0, 40) : null,
        entryAfterSave: afterSave ? afterSave.code.slice(0, 40) : null,
        filterCodeNow: mw && mw.FilterCode != null ? String(mw.FilterCode).slice(0, 40) : null,
        reachedSettings: !!(afterSave && afterSave.code === MARK),
        saveParamsError: spErr
      };
    } catch (e) { out.writeThrough.error = String((e && e.message) || e); }

    // ---------- 4. the reverse: does Settings.Filters[FilterNo] drive mw.FilterCode? ----------
    try {
      var st = mw ? mw.Settings : null;
      var fno = (st && typeof st.FilterNo !== 'undefined') ? st.FilterNo : null;
      if (st && st.Filters && fno != null && st.Filters[fno]) {
        st.Filters[fno].FilterCode = MARK + '-REV';
        var afterRevAssign = (mw && mw.FilterCode != null) ? String(mw.FilterCode).slice(0, 40) : null;
        try { if (typeof mw.SaveParams === 'function') mw.SaveParams(); } catch (e) {}
        var afterRevSave = (mw && mw.FilterCode != null) ? String(mw.FilterCode).slice(0, 40) : null;
        out.reverse = { wrote: MARK + '-REV', filterCodeAfterAssign: afterRevAssign,
                        filterCodeAfterSave: afterRevSave,
                        reachedFilterCode: (afterRevSave === MARK + '-REV') };
      } else {
        out.reverse = { skipped: 'no Settings.Filters[FilterNo]' };
      }
    } catch (e) { out.reverse.error = String((e && e.message) || e); }

    // ---------- 5. PrepareFilterCode: what does it do to the real body? ----------
    try {
      var pfc = mw ? mw.PrepareFilterCode : null;
      if (typeof pfc !== 'function') {
        out.prepare = { present: false, note: 'mw.PrepareFilterCode is not a function - the design doc never recorded its signature' };
      } else {
        var src = String(pfc);
        var res = null, err = null;
        try { res = pfc.call(mw, BODY); } catch (e) { err = String((e && e.message) || e); }
        out.prepare = {
          present: true, argCount: pfc.length, sourceHead: src.slice(0, 200),
          replaceRules: (src.match(/\.replace\(/g) || []).length,
          usesEval: /eval|new Function/.test(src),
          returned: (res === undefined) ? 'undefined' : (typeof res),
          resultIsString: typeof res === 'string',
          resultLen: (typeof res === 'string') ? res.length : null,
          resultIdentical: (typeof res === 'string') ? (res === BODY) : null,
          resultHead: (typeof res === 'string') ? res.slice(0, 60) : null,
          error: err
        };
      }
    } catch (e) { out.prepare.error = String((e && e.message) || e); }

    // ---------- 6. rollback everything ----------
    out.rollback.restored = false; out.rollback.error = null;
    try {
      var st2 = mw ? mw.Settings : null;
      var fno2 = (st2 && typeof st2.FilterNo !== 'undefined') ? st2.FilterNo : null;
      if (st2 && st2.Filters && fno2 != null && st2.Filters[fno2]) st2.Filters[fno2].FilterCode = savedEntry;
      if (mw) mw.FilterCode = savedFC;
      if (mw && typeof mw.SaveParams === 'function') mw.SaveParams();
      var eNow = mw ? activeEntry(mw) : null;
      out.rollback.restored = (!!eNow && eNow.code === savedEntry) &&
                             ((mw && String(mw.FilterCode)) === savedFC);
      out.rollback.entryNow = eNow ? eNow.code.slice(0, 40) : null;
    } catch (e) { out.rollback.error = String((e && e.message) || e); }

    // ---------- verdict ----------
    var wt = out.writeThrough || {};
    out.status = (out.state0.hasMw && wt.reachedSettings && out.rollback.restored)
      ? 'persistence-proven'
      : (out.state0.hasMw && wt.reachedSettings === false ? 'mirror-only' : 'needs-investigation');
    out.verdict = out.status === 'persistence-proven'
      ? 'mw.FilterCode writes through to Settings.Filters[FilterNo] and SaveParams persists it'
      : (out.status === 'mirror-only'
        ? 'mw.FilterCode does NOT reach Settings.Filters[FilterNo] - registration must go through Settings, or via PrepareFilterCode'
        : 'one or more checks failed - see the failing field');
  } catch (e) {
    out.error = String((e && e.message) || e);
    out.status = 'error';
  }

  console.log('PROBE_JSON ' + JSON.stringify(out));
  console.log('SLOT-DISCOVERY: ' + out.verdict);
  console.log('  FilterCode accessor: ' + JSON.stringify(out.accessor));
  console.log('  write-through: ' + JSON.stringify(out.writeThrough));
  console.log('  reverse: ' + JSON.stringify(out.reverse));
  console.log('  PrepareFilterCode: ' + JSON.stringify(out.prepare));
  if (typeof window !== 'undefined' && window.__G_FULL === true) console.log('SLOT_DISCOVERY_FULL ' + JSON.stringify(out));
})();
