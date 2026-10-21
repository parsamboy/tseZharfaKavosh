/**
 * tseZharfaKavosh — funnel config sweep over the whole live population v1 (G-29)
 *
 * WHY THIS EXISTS
 *   E-068 (probes/aRealProjection.live.v1.js) proved the A<->B chain with the fixed
 *   engine: A keeps 360, hides 5 and fails open on 1958 of the 2323 rows the site
 *   evaluates - exactly what the projection says. The mechanism is settled.
 *
 *   What is NOT settled is the product decision, because it has never been measured
 *   as a trade-off. Two facts from E-067/E-068 face each other:
 *     - the IV window barely bites: only 5 of 2323 evaluated rows are hidden, all of
 *       them with IV above the owner's ivMax 2.5;
 *     - the engine's reach is 11.6%: 2770 of 3135 rows fail open, and the dominant
 *       reason is the PRICE (598 of 1058 confirmed rows have no usable market price -
 *       389 one-sided book, 175 spread wider than maxSpreadPct 0.20, 34 outside the
 *       no-arbitrage band), plus 84 rows with dte 0 (expiry = today).
 *   So "narrow the window" and "widen the price guards" pull in opposite directions,
 *   and neither has been priced. This probe prices them.
 *
 * WHAT THIS MEASURES - one number per candidate config, over the WHOLE population
 *   For each of 14 candidate funnel configs it builds an engine with that config,
 *   builds the underlying map from mw.AllRows, and runs computeFunnel over EVERY row
 *   (not a sample). Per config it reports:
 *     - judged / kept / hidden / failOpen / errors, and kept+hidden === judged
 *     - failOpenReason histogram  (where the unreached rows actually stopped)
 *     - hiddenByIvStatus histogram (what a widened window would remove)
 *     - ivStats (n, min, p50, p90, max) over the judged rows
 *     - DELTA against the shipped defaults: newlyJudged, newlyHidden, newlyKept,
 *       lostFromKept, lostFromJudged, with samples of the rows each change adds
 *   The shipped-defaults variant runs FIRST and is checked against the E-067/E-068
 *   band; every variant is cross-checked by the identity
 *     judged[v] === judged[base] + newlyJudged - lostFromJudged
 *   so a sweep in which nothing moves reports `no-effect` rather than a vacuous pass.
 *
 *   READ-ONLY. No filter slot is written, no SaveParams, no RenderData, no storage,
 *   no network, no timer of its own. It only reads mw.AllRows and calls pure
 *   functions on a private engine per config.
 *
 * PREREQUISITE (one paste, once per page load)
 *   Paste src/engine/tseEngine.browser.v1.js first (window.TseBEngine / TseModels).
 *   TseLookup is NOT needed by this probe - nothing is registered.
 *
 * RUN HERE (always): old.tsetmc.com/Loader.aspx?ParTree=15131F  ->  Console (F12)
 *   tag: [کنسول] — paste the bundle, then this file, then WAIT ~3 seconds.
 *
 * SPDX-License-Identifier: Smart-FFA-1.1
 */
(function aConfigSweep() {
  'use strict';

  var out = {
    meta: {
      test: 'A-CONFIG-SWEEP-v1', gate: 'G-29', evidenceId: 'E-069',
      host: (typeof location !== 'undefined') ? location.host : 'unknown',
      parTree: '15131F', capturedAt: new Date().toISOString(),
      method: 'read-only: for each candidate funnel config, build an engine with that config, build the underlying map from mw.AllRows and run computeFunnel over every row; report judged / kept / hidden / fail-open, the reason histograms, the IV distribution and the delta against the shipped defaults'
    },
    preflight: {}, recon: {}, shipped: {}, variants: [], sanity: {},
    errors: [], status: 'unknown', verdict: ''
  };

  var mw = (typeof window !== 'undefined') ? window.mw : null;
  var ENG = (typeof window !== 'undefined') ? window.TseBEngine : null;
  var MODELS = (typeof window !== 'undefined') ? window.TseModels : null;

  function say(o) { console.log('PROBE_JSON ' + JSON.stringify(o)); }
  function bump(h, k) {
    if (k === undefined || k === null || k === '') k = '(none)';
    h[k] = (h[k] || 0) + 1;
  }
  function nowMs() {
    return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  }

  // ---------- the candidate configs ----------
  // `shipped` is first and is the reference for every delta. The rest are labelled
  // with what they are FOR, including the ones that exist only to be rejected.
  var VARIANTS = [
    { name: 'shipped', overrides: {}, note: 'the shipped defaults: window (0.05, 2.5), maxSpreadPct 0.20, arbitrage check on, hybrid price' },
    { name: 'ivMax-2.0', overrides: { ivMax: 2.0 }, note: 'tighten the upper bound' },
    { name: 'ivMax-1.5', overrides: { ivMax: 1.5 }, note: 'tighten the upper bound further' },
    { name: 'ivMax-1.0', overrides: { ivMax: 1.0 }, note: 'q1 REJECTED this (it removes about half the live options) - measured only to size the cost' },
    { name: 'ivMin-0.10', overrides: { ivMin: 0.1 }, note: 'raise the floor' },
    { name: 'ivMin-0.20', overrides: { ivMin: 0.2 }, note: 'raise the floor further' },
    { name: 'window-1.5', overrides: { ivMin: 0.1, ivMax: 1.5 }, note: 'a coherent narrow window: floor 0.10 AND ceiling 1.5' },
    { name: 'spread-0.35', overrides: { maxSpreadPct: 0.35 }, note: 'widen the spread guard - recovers wide-book rows' },
    { name: 'spread-0.50', overrides: { maxSpreadPct: 0.5 }, note: 'widen the spread guard further' },
    { name: 'no-arb-off', overrides: { checkArbitrageBounds: false }, note: 'drop the no-arbitrage guard' },
    { name: 'spread-0.50-no-arb-off', overrides: { maxSpreadPct: 0.5, checkArbitrageBounds: false }, note: 'both price guards relaxed, hybrid price kept' },
    { name: 'price-pl', overrides: { marketPriceFrom: 'pl' }, note: 'DIAGNOSTIC ONLY, NOT a proposal: SINGLE-SOURCE mode - it prices from pl and IGNORES THE BOOK ENTIRELY. Read it as "how many rows carry a non-zero pl at all" (that is what judged counts) and as "what the book is worth" (that is what lostFromKept counts). Do not read judged as a reach' },
    { name: 'max-reach', overrides: { marketPriceFrom: 'pl', maxSpreadPct: 0.5, checkArbitrageBounds: false }, note: 'pl-only price + both guards relaxed: the widest reach the engine can reach WITHOUT new code - but it discards the book, so every row priced from mid is LOST. judged here is a count of rows with a usable pl, not of reach' },
    { name: 'iv-off', overrides: { ivFilterEnabled: false }, note: 'null reference: the IV filter does nothing at all, every judged row passes' }
  ];

  // ---------- preflight ----------
  out.preflight = { bundle: { engine: !!ENG, models: !!MODELS }, engineVersion: ENG ? ENG.VERSION : null };
  if (!ENG || !MODELS) {
    out.status = 'needs-bundle';
    out.verdict = 'window.TseBEngine/TseModels are not on this page - paste src/engine/tseEngine.browser.v1.js in the console first, then run this probe again. Nothing was changed.';
    say(out);
    console.log('A-CONFIG-SWEEP: ' + out.verdict);
    return;
  }

  try {
    // ---------- recon (read-only) ----------
    var settings = (mw && mw.Settings) ? mw.Settings : null;
    out.recon = {
      filterNo: (settings && settings.FilterNo !== undefined) ? settings.FilterNo : null,
      filterCount: (settings && settings.Filters && settings.Filters.length !== undefined) ? settings.Filters.length : null,
      roundNo: (mw && mw.RoundNo !== undefined) ? mw.RoundNo : null,
      updateSpeed: (mw && mw.UpdateSpeed !== undefined) ? mw.UpdateSpeed : null,
      rowCount: (mw && mw.AllRows) ? Object.keys(mw.AllRows).length : 0
    };

    // ---------- the population, parsed ONCE (parse does not depend on config) ----------
    var keys = Object.keys(mw.AllRows || {});
    var rowsArr = [], codes = [], parsed = [];
    var i;
    for (i = 0; i < keys.length; i++) {
      var row = mw.AllRows[keys[i]];
      rowsArr.push(row);
      codes.push(keys[i]);
      parsed.push(MODELS.optionParser.parseOptionLabel(row));
    }

    var modelInjection = {
      parseOptionLabel: MODELS.optionParser.parseOptionLabel,
      impliedVol: MODELS.greeks.impliedVol,
      bsGreeks: MODELS.greeks.bsGreeks
    };

    function diagRow(engine, idx) {
      var res;
      try { res = engine.computeFunnel(rowsArr[idx], parsed[idx]); }
      catch (e) { res = { status: 'error', reason: String((e && e.message) || e) }; }
      var r = rowsArr[idx] || {};
      return {
        inscode: codes[idx],
        label: (r.l30 === undefined ? null : String(r.l30).slice(0, 46)),
        parsed: (parsed[idx] && parsed[idx].status) ? parsed[idx].status : null,
        engine: (res && res.status) ? res.status : null,
        ivStatus: (res && res.ivStatus !== undefined) ? res.ivStatus : null,
        iv: (res && typeof res.iv === 'number' && isFinite(res.iv)) ? Math.round(res.iv * 1000) / 1000 : null,
        priceSource: (res && res.inputs && res.inputs.marketPriceSource) ? res.inputs.marketPriceSource : null,
        reason: (res && res.reason) ? res.reason : null
      };
    }

    function ivStatsOf(ivs) {
      if (!ivs.length) return null;
      var s = ivs.slice().sort(function (a, b) { return a - b; });
      function pct(p) { return s[Math.floor(p * (s.length - 1))]; }
      return { n: s.length, min: s[0], p50: pct(0.5), p90: pct(0.9), max: s[s.length - 1] };
    }

    // ---------- the sweep ----------
    var baseVerdicts = null, baseRec = null, totalMs = 0;
    for (var v = 0; v < VARIANTS.length; v++) {
      var spec = VARIANTS[v];
      var t0 = nowMs();
      var engine = ENG.createBEngine({ models: modelInjection, funnelConfig: spec.overrides });
      engine.buildIndex(rowsArr);
      var rec = {
        name: spec.name, note: spec.note, overrides: spec.overrides,
        config: engine.funnelConfig,
        judged: 0, kept: 0, hidden: 0, failOpen: 0, errors: 0,
        ivStatus: {}, failOpenReason: {}, hiddenByIvStatus: {},
        newlyJudged: null, newlyHidden: null, newlyKept: null,
        lostFromKept: null, lostFromJudged: null,
        newlyHiddenSample: [], newlyJudgedSample: [],
        elapsedMs: 0
      };
      var verdicts = [], ivs = [];
      for (i = 0; i < rowsArr.length; i++) {
        var res;
        try { res = engine.computeFunnel(rowsArr[i], parsed[i]); }
        catch (e) { res = { status: 'error', reason: String((e && e.message) || e) }; }
        if (res.status === 'error') {
          verdicts.push('error'); rec.errors++; bump(rec.failOpenReason, res.reason); continue;
        }
        if (res.status !== 'ok') {
          verdicts.push('failOpen'); rec.failOpen++; bump(rec.failOpenReason, res.reason); continue;
        }
        rec.judged++;
        bump(rec.ivStatus, res.ivStatus);
        if (typeof res.iv === 'number' && isFinite(res.iv)) ivs.push(res.iv);
        if (res.pass) { verdicts.push('keep'); rec.kept++; }
        else {
          verdicts.push('hide'); rec.hidden++;
          bump(rec.hiddenByIvStatus, res.ivStatus || res.reason);
        }
      }
      rec.ivStats = ivStatsOf(ivs);
      rec.elapsedMs = Math.round((nowMs() - t0) * 100) / 100;
      totalMs += rec.elapsedMs;

      // ---------- delta against the shipped defaults ----------
      if (baseVerdicts) {
        rec.newlyJudged = 0; rec.newlyHidden = 0; rec.newlyKept = 0;
        rec.lostFromKept = 0; rec.lostFromJudged = 0;
        for (i = 0; i < rowsArr.length; i++) {
          var b = baseVerdicts[i], x = verdicts[i];
          if (b === 'failOpen' && x !== 'failOpen' && x !== 'error') {
            rec.newlyJudged++;
            if (rec.newlyJudgedSample.length < 6) rec.newlyJudgedSample.push(diagRow(engine, i));
          }
          if (x === 'hide' && b !== 'hide') {
            rec.newlyHidden++;
            if (rec.newlyHiddenSample.length < 6) rec.newlyHiddenSample.push(diagRow(engine, i));
          }
          if (x === 'keep' && b !== 'keep') rec.newlyKept++;
          if (b === 'keep' && x !== 'keep') rec.lostFromKept++;
          if (b !== 'failOpen' && b !== 'error' && x === 'failOpen') rec.lostFromJudged++;
        }
      }

      if (v === 0) {
        baseVerdicts = verdicts;
        baseRec = rec;
        out.shipped = { config: rec.config, judged: rec.judged, kept: rec.kept, hidden: rec.hidden, failOpen: rec.failOpen, errors: rec.errors, ivStatus: rec.ivStatus, failOpenReason: rec.failOpenReason, ivStats: rec.ivStats, elapsedMs: rec.elapsedMs };
      }
      out.variants.push(rec);
    }

    // ---------- sanity: a sweep that proves nothing must SAY so ----------
    var consistent = true, identityHolds = true, anyEffect = false;
    for (v = 0; v < out.variants.length; v++) {
      var r = out.variants[v];
      if (r.judged + r.failOpen + r.errors !== rowsArr.length) consistent = false;
      if (r.kept + r.hidden !== r.judged) consistent = false;
      if (r.newlyJudged !== null && r.judged !== baseRec.judged + r.newlyJudged - r.lostFromJudged) identityHolds = false;
      if (r.newlyJudged > 0 || r.newlyHidden > 0 || r.lostFromKept > 0) anyEffect = true;
    }
    out.sanity = {
      rows: rowsArr.length,
      perVariantConsistent: consistent,
      identityHolds: identityHolds,
      anyVariantMovesAnything: anyEffect,
      baselineJudged: baseRec.judged,
      judgedRatio: Math.round((10000 * baseRec.judged) / rowsArr.length) / 100,
      // E-066's bug produced 14 judged of 3075 rows (0.46%); the fixed engine
      // produces 353/3121 (11.3%) and 365/3135 (11.6%). A ratio far below 5% means
      // the bug is back or the bundle is stale, and every number below it is
      // worthless. The absolute floor stops a tiny fixture passing vacuously.
      baselinePlausible: (baseRec.judged >= 20 && (baseRec.judged / rowsArr.length) >= 0.05),
      e067Reference: { rows: 3121, computed: 353, kept: 351, hidden: 2 },
      e068Reference: { rows: 3135, computed: 365, kept: 360, hidden: 5, failOpen: 2770 },
      totalElapsedMs: Math.round(totalMs * 100) / 100
    };

    // ---------- verdict ----------
    var parts = [];
    parts.push('shipped defaults judge ' + baseRec.judged + ' of ' + rowsArr.length +
      ' rows (' + (100 * baseRec.judged / rowsArr.length).toFixed(1) + '%): ' +
      baseRec.kept + ' kept, ' + baseRec.hidden + ' hidden, ' + baseRec.failOpen + ' fail-open.');
    for (v = 1; v < out.variants.length; v++) {
      var r2 = out.variants[v];
      if (r2.newlyJudged || r2.newlyHidden || r2.lostFromKept) {
        parts.push(r2.name + ': judged ' + r2.judged + ' (' +
          (r2.newlyJudged > 0 ? '+' : '') + r2.newlyJudged + ' judged, ' +
          r2.hidden + ' hidden (' + (r2.newlyHidden > 0 ? '+' : '') + r2.newlyHidden + ')' +
          (r2.lostFromKept > 0 ? ', ' + r2.lostFromKept + ' lost from kept' : '') + ')');
      }
    }
    var plRec = null;
    for (v = 0; v < out.variants.length; v++) if (out.variants[v].name === 'price-pl') plRec = out.variants[v];
    if (plRec) {
      parts.push('price-pl is a SINGLE-SOURCE mode (pl only, the book is ignored): it judges ' + plRec.judged +
        ' rows - those with a non-zero pl - and LOSES ' + plRec.lostFromKept + ' rows the book was pricing, so read it as ' +
        '"how many rows carry a pl at all", NOT as a reach.');
    }
    out.verdict = parts.join(' ');

    if (!consistent) {
      out.status = 'inconsistent';
      out.verdict = 'INTERNAL INCONSISTENCY: ' + out.verdict;
    } else if (!identityHolds) {
      out.status = 'identity-broken';
      out.verdict = 'IDENTITY BROKEN: ' + out.verdict;
    } else if (!out.sanity.baselinePlausible) {
      out.status = 'suspicious-baseline';
      out.verdict = 'SUSPICIOUS BASELINE: the shipped defaults judged only ' + baseRec.judged +
        ' of ' + rowsArr.length + ' rows (' + out.sanity.judgedRatio + '%), far below the E-067/E-068 ' +
        'level (11.3% / 11.6%). Every number below is worthless until this is explained ' +
        '(stale bundle? the E-066 clock bug back?). ' + out.verdict;
    } else if (!anyEffect) {
      out.status = 'no-effect';
      out.verdict = 'NO-EFFECT: every candidate config produced exactly the shipped verdicts - ' + out.verdict;
    } else {
      out.status = 'swept';
    }

    console.log('A-CONFIG-SWEEP: ' + out.verdict);
    console.log('  rows=' + rowsArr.length + ' shipped: judged=' + baseRec.judged + ' kept=' + baseRec.kept +
      ' hidden=' + baseRec.hidden + ' failOpen=' + baseRec.failOpen);
    for (v = 0; v < out.variants.length; v++) {
      var r3 = out.variants[v];
      console.log('  ' + r3.name.padEnd(24) + ' judged=' + String(r3.judged).padStart(4) +
        ' kept=' + String(r3.kept).padStart(4) + ' hidden=' + String(r3.hidden).padStart(4) +
        ' failOpen=' + String(r3.failOpen).padStart(4) + (r3.newlyJudged !== null ?
        ('  delta=+' + r3.newlyJudged + 'j +' + r3.newlyHidden + 'h -' + r3.lostFromKept + 'k') : '  (reference)'));
    }
    console.log('  sanity=' + JSON.stringify(out.sanity));
    say(out);
  } catch (e) {
    out.errors.push(String((e && e.message) || e));
    out.status = 'error';
    say(out);
    console.log('A-CONFIG-SWEEP error: ' + String((e && e.message) || e));
  }
})();
