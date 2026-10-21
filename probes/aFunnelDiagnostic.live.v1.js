/**
 * tseZharfaKavosh — funnel diagnostic over the whole live population v1 (G-27)
 *
 * WHY THIS EXISTS
 *   E-065 (probes/aRealProjection.live.v1.js) proved the A<->B contract end to end
 *   with REAL engine output on REAL page data: verdicts matched the projection row for
 *   row, flipped exactly with the pass bits, and cleared to zero reads. The chain works.
 *
 *   It also produced a number that needs explaining: the engine JUDGED 11 of 2753 rows.
 *   2742 were insufficient-data, so A failed open on all of them and the filter hid
 *   nothing. E-045 and E-046 ran live on the same page and counted 605 and 1049 option
 *   rows (with 1505- and 1710-entry underlying maps), and E-046 solved 411-615 of them.
 *   11 is not in that range, so something inside the funnel rejects nearly everything.
 *
 *   The v1 probe cannot say what, because its fail-open sample is drawn from the head of
 *   the population - and the head of mw.AllRows is stocks and funds, which the parser
 *   correctly rejects as "not a confirmed option". A sample of non-option rows cannot
 *   diagnose the option rows. (This is the E-060 lesson again: a verdict must not be
 *   trusted when its own baseline is blind.)
 *
 * WHAT THIS MEASURES - the whole population, bucketed by WHY
 *   For every row in mw.AllRows:
 *     - l18 prefix (ض / ط / other)                      -> how many rows even look like options
 *     - parseOptionLabel status                         -> confirmed / candidate / rejected / unknown
 *     - computeFunnel status+reason                     -> the engine's own verdict histogram
 *   For every CONFIRMED row, the step at which it stopped:
 *     - S: is parsed.underlying in the underlying map?  (G-11/G-12 relation, "sample-only" since E-012)
 *     - T: does the Jalali calendar resolve the expiry? (dte histogram)
 *     - price: which hybrid priority applies, and if none, WHY
 *            (no book / book too wide / price outside the no-arbitrage band / no trade)
 *   Plus the underlying map itself: its size, and every option underlying that MISSES it,
 *   with the evidence for the miss (does a stock row with that l18 exist, and what is its pc?).
 *
 *   READ-ONLY. No filter slot is written, no SaveParams, no RenderData, no storage, no
 *   network, no timer of its own. It only reads mw.AllRows and calls pure functions.
 *
 * PREREQUISITE (one paste, once per page load)
 *   Paste src/engine/tseEngine.browser.v1.js first (window.TseBEngine / TseModels / TseLookup).
 *
 * RUN HERE (always): old.tsetmc.com/Loader.aspx?ParTree=15131F  ->  Console (F12)
 *   tag: [کنسول] — paste the bundle, then this file, then WAIT ~3 seconds.
 *
 * SPDX-License-Identifier: Smart-FFA-1.1
 */
(function aFunnelDiagnostic() {
  'use strict';
  var out = {
    meta: {
      test: 'A-FUNNEL-DIAGNOSTIC-v1', gate: 'G-27', evidenceId: 'E-066',
      host: (typeof location !== 'undefined') ? location.host : 'unknown',
      parTree: '15131F', capturedAt: new Date().toISOString(),
      method: 'read-only: bucket every AllRows row by parse status and by the funnel reason that stopped it, attributing the market price to its hybrid priority and checking the underlying map for every confirmed option'
    },
    preflight: {}, recon: {}, histograms: {}, underlying: {}, samples: {},
    errors: [], status: 'unknown', verdict: ''
  };
  var mw = (typeof window !== 'undefined') ? window.mw : null;
  var ENG = (typeof window !== 'undefined') ? window.TseBEngine : null;
  var MODELS = (typeof window !== 'undefined') ? window.TseModels : null;
  function say(o) { console.log('PROBE_JSON ' + JSON.stringify(o)); }
  function bucket(obj, key) { obj[key] = (obj[key] || 0) + 1; }
  function sample(map, key, item, limit) {
    if (!map[key]) map[key] = [];
    if (map[key].length < (limit || 5)) map[key].push(item);
  }
  function rowLabel(row) {
    return { l18: (row && row.l18 !== undefined) ? String(row.l18) : null,
      l30: (row && row.l30 !== undefined) ? String(row.l30).slice(0, 60) : null };
  }

  try {
    out.preflight = { bundle: { engine: !!ENG, models: !!MODELS },
      engineVersion: ENG ? ENG.VERSION : null };
    if (!ENG || !MODELS) {
      out.status = 'needs-bundle';
      out.verdict = 'window.TseBEngine / TseModels are not on this page - paste src/engine/tseEngine.browser.v1.js first. Nothing was changed.';
      say(out); console.log('A-FUNNEL-DIAG: ' + out.verdict); return;
    }
    if (!mw || !mw.AllRows) { out.status = 'no-rows'; out.verdict = 'mw.AllRows is not available'; say(out); return; }

    var engine = ENG.createBEngine({
      models: {
        parseOptionLabel: MODELS.optionParser.parseOptionLabel,
        impliedVol: MODELS.greeks.impliedVol,
        bsGreeks: MODELS.greeks.bsGreeks
      }
    });
    var rows = mw.AllRows;
    var t0 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    engine.run(rows, 'diag-' + (mw.RoundNo || 0) + '-' + Object.keys(rows).length, 'diag-0');
    var elapsed = Math.round((((typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now()) - t0) * 100) / 100;

    var cfg = engine.funnelConfig;
    var toNum = engine._toNum;
    var map = engine.state.underlyingMap || {};
    var mapKeys = Object.keys(map);
    var calendar = MODELS.calendar.createCalendar();

    var H = {
      l18Prefix: {}, parseStatus: {}, funnelReason: {},
      confirmedStep: {}, priceAttribution: {}, dteHistogram: {},
      ivStatus: {}, ivBuckets: {}
    };
    var missing = {};          // underlying name -> {count, hasStockRow, stockPc, sample}
    var confirmedUnderlyings = {};   // every distinct underlying among confirmed rows
    var seenOptionPrefix = 0, seenConfirmed = 0, seenOk = 0;
    var ivs = [];
    var keys = Object.keys(rows);

    for (var i = 0; i < keys.length; i++) {
      var row = rows[keys[i]];
      var l18 = String(row.l18 || '');
      var first = l18.charAt(0);
      bucket(H.l18Prefix, (first === '\u0636') ? 'dhad-call' : (first === '\u0637') ? 'tad-put' : 'other');

      var parsed = MODELS.optionParser.parseOptionLabel(row);
      bucket(H.parseStatus, parsed && parsed.status ? parsed.status : 'none');

      var fr = engine.computeFunnel(row, parsed);
      var reason = (fr.status === 'ok') ? 'ok' : (fr.status === 'error' ? 'error' : fr.reason);
      bucket(H.funnelReason, reason);
      if (fr.status === 'ok') seenOk++;

      if (parsed && parsed.status === 'confirmed') {
        seenConfirmed++;
        var name = String(parsed.underlying || '').trim();
        confirmedUnderlyings[name] = (confirmedUnderlyings[name] || 0) + 1;
        var S = map[name];
        if (S === undefined) {
          bucket(H.confirmedStep, 'S-missing');
          if (!missing[name]) missing[name] = { count: 0, sample: [] };
          missing[name].count++;
          // is there a stock row whose l18 equals this underlying name?
          var stockPc = null, hasStock = false;
          for (var j = 0; j < keys.length; j++) {
            var r2 = rows[keys[j]];
            if (String(r2.l18 || '').trim() !== name) continue;
            var f2 = String(r2.l18 || '').charAt(0);
            if (f2 === '\u0636' || f2 === '\u0637') continue;   // an option row, not the underlying
            hasStock = true;
            var p2 = toNum(r2[cfg.underlyingPriceField]);
            if (p2 !== null && p2 > 0) { stockPc = p2; break; }
          }
          missing[name].hasStockRow = hasStock;
          missing[name].stockPc = stockPc;
          if (missing[name].sample.length < 2) missing[name].sample.push(rowLabel(row));
          sample(out.samples, 'S-missing', { inscode: keys[i], underlying: name, hasStockRow: hasStock,
            stockPc: stockPc, label: String(row.l30 || '').slice(0, 50) });
          continue;
        }
        bucket(H.confirmedStep, 'S-resolved');

        // ---- T ----
        var K = toNum(parsed.strike);
        var dte = null;
        try { dte = calendar(String(parsed.expiry), Date.now()); } catch (e) { dte = null; }
        if (dte === null || !isFinite(dte) || dte <= 0) {
          bucket(H.confirmedStep, 'T-unresolved');
          sample(out.samples, 'T-unresolved', { inscode: keys[i], expiry: parsed.expiry, dte: dte, label: String(row.l30 || '').slice(0, 50) });
          continue;
        }
        bucket(H.confirmedStep, 'T-resolved');
        var T = dte / 365;
        bucket(H.dteHistogram, dte <= 7 ? '0-7d' : dte <= 30 ? '8-30d' : dte <= 90 ? '31-90d' : '90d+');

        // ---- market price: which hybrid priority, and if none, why ----
        var kind = (parsed.kind === 'put') ? 'put' : 'call';
        var bid = toNum(row.pd1), ask = toNum(row.po1);
        var price = null, psrc = null, blocked = 'no usable market price';
        if (bid !== null && ask !== null && bid > 0 && ask > 0) {
          var mid = (bid + ask) / 2;
          var p1 = ENG.marketPriceProblem(row, S, K, T, cfg.r, kind, mid, cfg, true);
          if (!p1) { price = mid; psrc = 'mid'; }
          else blocked = p1;
        }
        if (price === null) {
          var trades = toNum(row.tno), last = toNum(row.pl);
          if (trades !== null && trades > 0 && last !== null && last > 0) {
            var p2 = ENG.marketPriceProblem(row, S, K, T, cfg.r, kind, last, cfg, false);
            if (!p2) { price = last; psrc = 'pl-traded'; }
            else blocked = p2;
          } else if (bid === null || ask === null || bid <= 0 || ask <= 0) {
            blocked = (trades === null || trades <= 0) ? 'no-book-and-no-trade' : 'no-book';
          }
        }
        if (price === null) {
          bucket(H.confirmedStep, 'price-unresolved');
          bucket(H.priceAttribution, blocked);
          sample(out.samples, 'price-unresolved', { inscode: keys[i], blocked: blocked,
            pd1: row.pd1, po1: row.po1, pl: row.pl, tno: row.tno, label: String(row.l30 || '').slice(0, 50) });
          continue;
        }
        bucket(H.confirmedStep, 'price-resolved');
        bucket(H.priceAttribution, psrc);

        // ---- IV + greeks (the engine already did this; just record the shape) ----
        if (fr.status === 'ok') {
          bucket(H.ivStatus, fr.ivStatus || 'none');
          if (fr.iv !== null && fr.iv !== undefined) {
            ivs.push(fr.iv);
            bucket(H.ivBuckets, fr.iv <= cfg.ivMin ? 'below-ivMin' : fr.iv >= cfg.ivMax ? 'at-or-above-ivMax'
              : fr.iv >= 2.0 ? '2.0-2.5' : fr.iv >= 1.0 ? '1.0-2.0' : fr.iv >= 0.3 ? '0.3-1.0' : 'ivMin-0.3');
          }
        } else {
          bucket(H.confirmedStep, 'iv-or-greeks-failed');
          bucket(H.ivStatus, fr.reason || 'none');
        }
      }
    }

    // ---------- the underlying map ----------
    var missingNames = Object.keys(missing);
    var missingTotal = 0;
    for (var m = 0; m < missingNames.length; m++) missingTotal += missing[missingNames[m]].count;
    var missingNoStock = 0, missingStockNoPrice = 0;
    var missingSample = [];
    missingNames.sort(function (a, b) { return missing[b].count - missing[a].count; });
    for (var m2 = 0; m2 < missingNames.length; m2++) {
      var e = missing[missingNames[m2]];
      if (!e.hasStockRow) missingNoStock++; else if (e.stockPc === null) missingStockNoPrice++;
      if (missingSample.length < 12) {
        missingSample.push({ underlying: missingNames[m2], rows: e.count,
          hasStockRow: e.hasStockRow, stockPc: e.stockPc });
      }
    }
    out.underlying = {
      mapEntries: mapKeys.length, mapSample: mapKeys.slice(0, 12),
      distinctOptionUnderlyings: Object.keys(confirmedUnderlyings).length,
      optionUnderlyingsMissingFromMap: missingNames.length,
      confirmedRowsOnMissingUnderlying: missingTotal,
      missingWithNoStockRow: missingNoStock,
      missingWithStockRowButNoPrice: missingStockNoPrice,
      missingTop: missingSample
    };

    // ---------- iv shape ----------
    ivs.sort(function (a, b) { return a - b; });
    var ivStats = null;
    if (ivs.length) {
      ivStats = { n: ivs.length, min: ivs[0], p50: ivs[Math.floor(ivs.length / 2)],
        p90: ivs[Math.floor(ivs.length * 0.9)], max: ivs[ivs.length - 1] };
    }

    out.recon = { filterNo: (mw.Settings && mw.Settings.FilterNo !== undefined) ? mw.Settings.FilterNo : null,
      viewMode: (mw.Settings) ? mw.Settings.ViewMode : null, market: (mw.Settings) ? mw.Settings.Market : null,
      roundNo: (mw.RoundNo !== undefined) ? mw.RoundNo : null, rowCount: keys.length,
      underlyingPriceField: cfg.underlyingPriceField, marketPriceFrom: cfg.marketPriceFrom,
      ivWindow: [cfg.ivMin, cfg.ivMax], TMode: cfg.TMode, pinFailOpen: cfg.pinFailOpen,
      engineElapsedMs: elapsed, computed: engine.state.lastComputed, unknown: engine.state.lastUnknown,
      bitsetBytes: engine.state.bitset.length };
    out.histograms = H;
    out.ivStats = ivStats;
    out.totals = { rows: keys.length, optionPrefixRows: (H.l18Prefix['dhad-call'] || 0) + (H.l18Prefix['tad-put'] || 0),
      confirmed: seenConfirmed, ok: seenOk };

    // ---------- verdict ----------
    var t = out.totals;
    var topReason = null, topN = 0;
    for (var rk in H.funnelReason) { if (H.funnelReason.hasOwnProperty(rk) && H.funnelReason[rk] > topN) { topN = H.funnelReason[rk]; topReason = rk; } }
    out.status = 'diagnosed';
    out.verdict = 'of ' + t.rows + ' rows, ' + t.optionPrefixRows + ' carry an option prefix (ض/ط) and ' +
      t.confirmed + ' parse as a confirmed option; the engine judged ' + t.ok + ' of them. ' +
      'The funnel stopped the confirmed rows at: ' + JSON.stringify(H.confirmedStep) + '. ' +
      'Market price attribution: ' + JSON.stringify(H.priceAttribution) + '. ' +
      'Underlying map has ' + out.underlying.mapEntries + ' entries and ' +
      out.underlying.optionUnderlyingsMissingFromMap + ' of the option underlyings are NOT in it (' +
      out.underlying.confirmedRowsOnMissingUnderlying + ' rows; ' + out.underlying.missingWithNoStockRow +
      ' have no stock row at all, ' + out.underlying.missingWithStockRowButNoPrice + ' have one with no usable ' +
      cfg.underlyingPriceField + '). Parse status histogram: ' + JSON.stringify(H.parseStatus) + '.';

    console.log('A-FUNNEL-DIAG: ' + out.verdict);
    console.log('  rows=' + t.rows + ' optionPrefix=' + t.optionPrefixRows + ' confirmed=' + t.confirmed + ' ok=' + t.ok);
    console.log('  parseStatus=' + JSON.stringify(H.parseStatus));
    console.log('  funnelReason=' + JSON.stringify(H.funnelReason));
    console.log('  confirmedStep=' + JSON.stringify(H.confirmedStep));
    console.log('  priceAttribution=' + JSON.stringify(H.priceAttribution));
    console.log('  dteHistogram=' + JSON.stringify(H.dteHistogram));
    console.log('  ivStatus=' + JSON.stringify(H.ivStatus) + ' ivBuckets=' + JSON.stringify(H.ivBuckets));
    console.log('  ivStats=' + JSON.stringify(ivStats));
    console.log('  underlying=' + JSON.stringify(out.underlying));
    console.log('  engine elapsedMs=' + elapsed + ' computed=' + engine.state.lastComputed + ' unknown=' + engine.state.lastUnknown);
    say(out);
  } catch (e) {
    out.errors.push(String((e && e.message) || e));
    out.status = 'error';
    say(out);
    console.log('A-FUNNEL-DIAG error: ' + String((e && e.message) || e));
  }
})();
