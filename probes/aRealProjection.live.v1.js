/**
 * tseZharfaKavosh — A + the REAL engine projection, live probe v1
 *
 * WHAT IS DIFFERENT FROM v1..v4
 *   v1..v4 registered the real A body against SYNTHETIC projections (all-fail,
 *   all-pass, empty). They proved that A runs, that it is fail-open, and that the
 *   registration path works (E-055/E-061/E-063, G-24/G-25 closed). None of them
 *   ever let the REAL engine compute a projection from the REAL page data.
 *   This probe does exactly that, and nothing else changes:
 *     - the projection is built by the repo's own engine (src/engine/bEngine.v0.1.0.js,
 *       with the repo's own optionParser + greeks + Jalali calendar), over mw.AllRows;
 *     - the A body is the repo's own generated body (TseLookup.buildFilterCodeBody()),
 *       NOT a hand-copied literal - so what is measured is what production would ship;
 *     - the verdict the body computes is read back through a tallying Proxy on
 *       __B_index/__B_known/__B_bitset, the only instrument that works on this page
 *       (E-062 retired DOM counting: the page re-renders on its own timer).
 *
 * THE THREE PHASES
 *   REAL      the engine's own projection, published and registered. The tally gives
 *             the verdict the body computed for every row the site actually evaluated:
 *             keep / hide / fail-open. This is the LIVE UX IMPACT of the engine.
 *   INVERTED  the same projection with the pass bits flipped. A must flip with it,
 *             row for row: this is the proof that A is a pure function of the
 *             published projection and holds no state of its own.
 *   CLEARED   the projection is dropped (__B_index = null). Zero index reads prove
 *             the body's own fail-open guard ran - i.e. the code being executed is
 *             the code we registered.
 *   then ROLLBACK (memory AND persisted storage - E-059/E-064).
 *
 * PREREQUISITE (one paste, once per page load)
 *   Paste src/engine/tseEngine.browser.v1.js first. It defines window.TseBEngine,
 *   window.TseModels and window.TseLookup. Without it this probe stops immediately
 *   with status 'needs-bundle' and changes nothing.
 *
 * RUN HERE (always): old.tsetmc.com/Loader.aspx?ParTree=15131F  ->  Console (F12)
 *   tag: [کنسول] — paste the bundle, then paste this probe, then WAIT ~12 seconds.
 *   window.__A_REAL_PROJ_RESTORE stays available for the whole run.
 *   Nothing is written until phase REAL, and ROLLBACK restores the slot, the mirror
 *   and the persisted storage to exactly what they were.
 *
 * SPDX-License-Identifier: Smart-FFA-1.1
 */
(function aRealProjection() {
  'use strict';
  var RENDER_WAIT = 2200;
  var out = {
    meta: {
      test: 'A-REAL-PROJECTION-v1', gate: 'G-26', evidenceId: 'E-065',
      host: (typeof location !== 'undefined') ? location.host : 'unknown',
      parTree: '15131F', capturedAt: new Date().toISOString(),
      method: 'the repo engine computes the projection from mw.AllRows and publishes it; the repo generated A body reads it; the verdict is read back through tallying Proxies on __B_index/__B_known/__B_bitset; real / inverted / cleared phases, then rollback'
    },
    preflight: {}, recon: {}, engine: {}, projection: {}, body: {}, register: {},
    real: {}, inverted: {}, cleared: {}, rollback: {},
    errors: [], status: 'unknown', verdict: ''
  };
  var mw = (typeof window !== 'undefined') ? window.mw : null;
  var ENG = (typeof window !== 'undefined') ? window.TseBEngine : null;
  var MODELS = (typeof window !== 'undefined') ? window.TseModels : null;
  var LOOKUP = (typeof window !== 'undefined') ? window.TseLookup : null;

  function fnv1a(s) {
    var h = 0x811c9dc5, i;
    for (i = 0; i < s.length; i++) { h ^= s.charCodeAt(i) & 0xff; h = (h * 0x01000193) >>> 0; }
    return ('00000000' + h.toString(16)).slice(-8);
  }
  function say(o) { console.log('PROBE_JSON ' + JSON.stringify(o)); }

  // ---------- the population, and the projection the engine builds ----------
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

  // engine state, filled in phaseCompute
  var P = null;   // { index, known, bits, symbols, tally, perInscode }
  function verdictOf(inscode, index, known, bits) {
    // NOTE: the key names below must match the keys of the verdicts counter object
    // exactly ('failOpen', not 'fail-open') - a mismatch silently counts fail-open
    // rows under a stray key and reports zero of them.
    var pos = index[inscode];
    if (pos === undefined) return 'failOpen';             // unknown symbol -> A keeps it
    var b = pos >> 3, m = pos & 7;
    if (b < 0 || b >= known.length) return 'failOpen';
    if (!((known[b] >> m) & 1)) return 'failOpen';        // not computed -> A keeps it
    return ((bits[b] >> m) & 1) ? 'keep' : 'hide';
  }

  // ---------- the tally: what the body read, and what it decided ----------
  function install(index, known, bits, label) {
    var tally = {
      reads: 0, distinct: {}, perInscode: {}, sample: [],
      verdicts: { keep: 0, hide: 0, failOpen: 0 },
      byteReads: 0, bytesSeen: {}, label: label
    };
    function own(t, k) { return (typeof k === 'string') && Object.prototype.hasOwnProperty.call(t, k); }
    function isByte(t, k) {
      if (!own(t, k) || !/^\d+$/.test(k)) return false;
      var v = +k; return (v >= 0 && v < t.length);
    }
    // A lookup is a string key that is not one of the incidental names the engine or
    // the debugger may touch. Counting an ABSENT key matters: a symbol that is not in
    // B's projection (it arrived after publication, or B never saw it) is fail-open in
    // A, and without this it would be invisible to the tally and the fail-open mass
    // would be understated.
    var NOT_A_LOOKUP = { length: 1, name: 1, toString: 1, valueOf: 1, constructor: 1,
      prototype: 1, hasOwnProperty: 1, isPrototypeOf: 1, propertyIsEnumerable: 1,
      toLocaleString: 1, __proto__: 1, then: 1, catch: 1, inspect: 1, nodeType: 1,
      $$typeof: 1, undefined: 1 };
    function isLookup(k) { return (typeof k === 'string') && k.length > 0 && NOT_A_LOOKUP[k] !== 1; }
    var pIndex = new Proxy(index, {
      get: function (t, k) {
        if (isLookup(k)) {
          var code = String(k), pos = t[k];
          tally.reads++;
          if (tally.distinct[code] === undefined) {
            tally.distinct[code] = true;
            var v = verdictOf(code, index, known, bits);
            tally.perInscode[code] = v;
            tally.verdicts[v]++;
            if (tally.sample.length < 12) {
              tally.sample.push({ inscode: code, inProjection: (pos !== undefined), pos: pos, verdict: v });
            }
          }
        }
        return t[k];
      }
    });
    var pKnown = new Proxy(known, {
      get: function (t, k) { if (isByte(t, k)) { tally.byteReads++; tally.bytesSeen['k' + (+k)] = t[k]; } return t[k]; }
    });
    var pBits = new Proxy(bits, {
      get: function (t, k) { if (isByte(t, k)) { tally.byteReads++; tally.bytesSeen['b' + (+k)] = t[k]; } return t[k]; }
    });
    // the real B publishes every one of these; A reads three of them.
    mw.__B_index = pIndex; mw.__B_known = pKnown; mw.__B_bitset = pBits;
    mw.__B_symbols = P.symbols;
    mw.__B_snapshotId = P.snapshotId; mw.__B_configHash = P.configHash;
    mw.__B_configVersion = P.configVersion; mw.__B_totalRuns = P.totalRuns;
    mw.__B_meta = P.meta; mw.__B_lastError = P.lastError;
    P.tally = tally;
    return tally;
  }
  function resetTally() {
    if (!P || !P.tally) return;
    P.tally.reads = 0; P.tally.distinct = {}; P.tally.perInscode = {}; P.tally.sample = [];
    P.tally.verdicts = { keep: 0, hide: 0, failOpen: 0 };
    P.tally.byteReads = 0; P.tally.bytesSeen = {};
  }
  function tallyReport(t) {
    var seen = Object.keys(t.bytesSeen), sample = [];
    for (var i = 0; i < seen.length && i < 8; i++) sample.push({ key: seen[i], value: t.bytesSeen[seen[i]] });
    var allKnown255 = true, allBitsZero = true, allBits255 = true;
    for (var k in t.bytesSeen) {
      if (!t.bytesSeen.hasOwnProperty(k)) continue;
      if (k.charAt(0) === 'b') {
        if (t.bytesSeen[k] !== 0) allBitsZero = false;
        if (t.bytesSeen[k] !== 255) allBits255 = false;
      } else if (t.bytesSeen[k] !== 255) allKnown255 = false;
    }
    return {
      reads: t.reads, distinctCount: Object.keys(t.distinct).length, verdicts: t.verdicts,
      byteReads: t.byteReads, distinctBytesRead: seen.length, byteSample: sample,
      byteValues: { allKnown255: allKnown255, allBitsZero: allBitsZero, allBits255: allBits255 },
      sample: t.sample.slice(0, 8)
    };
  }

  // ---------- rollback: memory AND persisted storage (E-059 / E-064) ----------
  var savedSettingsCode = '', savedFilterCode = '', savedFilterNo = null;
  function readPersisted() {
    var r = { available: false, len: null, activeSlotLen: null, filterNo: null, note: '' };
    if (typeof window === 'undefined' || typeof window.getData !== 'function') { r.note = 'window.getData is not a function'; return r; }
    try {
      var raw = window.getData('MarketWatchSettings');
      if (raw === undefined || raw === null || raw === '') { r.available = true; r.note = 'no persisted MarketWatchSettings'; return r; }
      r.available = true; r.len = String(raw).length;
      var obj = JSON.parse(String(raw));
      if (obj && obj.Filters) {
        if (typeof obj.FilterNo !== 'undefined') r.filterNo = obj.FilterNo;
        var f = obj.Filters[r.filterNo];
        if (f) r.activeSlotLen = (f.FilterCode === undefined ? -1 : String(f.FilterCode).length);
      } else r.note += 'persisted JSON has no Filters array; keys=' + Object.keys(obj || {}).join(',') + '; ';
    } catch (e) { r.note += 'read/parse error: ' + String((e && e.message) || e); }
    return r;
  }
  function snapshotState() {
    savedFilterNo = (mw && mw.Settings && typeof mw.Settings.FilterNo !== 'undefined') ? mw.Settings.FilterNo : null;
    savedSettingsCode = (mw && mw.Settings && mw.Settings.Filters && savedFilterNo !== null && mw.Settings.Filters[savedFilterNo])
      ? String(mw.Settings.Filters[savedFilterNo].FilterCode || '') : '';
    savedFilterCode = (mw && mw.FilterCode !== undefined && mw.FilterCode !== null) ? String(mw.FilterCode) : '';
  }
  window.__A_REAL_PROJ_RESTORE = function () {
    try {
      if (mw && mw.Settings && mw.Settings.Filters && savedFilterNo !== null && mw.Settings.Filters[savedFilterNo]) {
        mw.Settings.Filters[savedFilterNo].FilterCode = savedSettingsCode;
      }
      mw.FilterCode = (savedFilterCode !== '') ? savedFilterCode : savedSettingsCode;
      var i;
      for (i in mw) { if (mw.hasOwnProperty(i) && i.indexOf('__B_') === 0) delete mw[i]; }
      if (mw && typeof mw.SaveParams === 'function') mw.SaveParams();
      if (mw && typeof mw.RenderData === 'function') mw.RenderData();
      return { restored: true, filterNo: savedFilterNo, settingsCodeLen: savedSettingsCode.length };
    } catch (e) { return { restored: false, error: String((e && e.message) || e) }; }
  };
  function doRender() {
    if (mw && typeof mw.RenderData === 'function') {
      try { mw.RenderData(); return true; } catch (e) { out.errors.push('RenderData: ' + String((e && e.message) || e)); }
    }
    return false;
  }

  // ---------- why the engine hid a row, for a sample of them ----------
  function diagnose(codes, verdict, limit) {
    var list = [];
    for (var i = 0; i < codes.length && list.length < limit; i++) {
      if (P.tally.perInscode[codes[i]] !== verdict) continue;
      var row = mw.AllRows[codes[i]] || {};
      var parsed = MODELS.optionParser.parseOptionLabel(row);
      var fr = null;
      try { fr = P.engine.computeFunnel(row, parsed); } catch (e) { fr = { status: 'error', reason: String((e && e.message) || e) }; }
      var item = {
        inscode: codes[i], label: (row.l30 === undefined ? null : String(row.l30).slice(0, 46)),
        parsed: (parsed && parsed.status) ? parsed.status : null,
        engine: (fr && fr.status) ? fr.status : null,
        ivStatus: (fr && fr.ivStatus !== undefined) ? fr.ivStatus : null,
        iv: (fr && fr.iv !== undefined && fr.iv !== null) ? Math.round(fr.iv * 1000) / 1000 : null,
        priceSource: (fr && fr.inputs && fr.inputs.marketPriceSource) ? fr.inputs.marketPriceSource : null,
        reason: (fr && fr.reason) ? fr.reason : null
      };
      if (!parsed || parsed.status !== 'confirmed') { item.reason = item.reason || 'not a confirmed option label'; }
      list.push(item);
    }
    return list;
  }

  // ---------- phases ----------
  function phasePreflight(next) {
    out.preflight = {
      bundle: { engine: !!ENG, models: !!MODELS, lookup: !!LOOKUP },
      engineVersion: ENG ? ENG.VERSION : null,
      lookupVersion: LOOKUP ? LOOKUP.VERSION : null,
      filterCodeLimit: LOOKUP ? LOOKUP.FILTER_CODE_LIMIT : null
    };
    if (!ENG || !MODELS || !LOOKUP) {
      out.status = 'needs-bundle';
      out.verdict = 'window.TseBEngine/TseModels/TseLookup are not on this page - paste src/engine/tseEngine.browser.v1.js in the console first, then run this probe again. Nothing was changed.';
      say(out);
      console.log('A-REAL-PROJ: ' + out.verdict);
      return;
    }
    next();
  }

  function phaseRecon(next) {
    snapshotState();
    var pop = population();
    out.recon = {
      filterNo: savedFilterNo, viewMode: (mw && mw.Settings) ? mw.Settings.ViewMode : null,
      market: (mw && mw.Settings) ? mw.Settings.Market : null,
      updateSpeed: (mw && mw.Settings) ? mw.Settings.UpdateSpeed : null,
      roundNo: (mw && mw.RoundNo !== undefined) ? mw.RoundNo : null,
      rowCount: pop.codes.length, keyIsInscode: (pop.keys.length > 0 && pop.keys[0] === pop.codes[0]),
      savedSlotCodeLen: savedSettingsCode.length, savedMirrorLen: savedFilterCode.length,
      filters: []
    };
    if (mw && mw.Settings && mw.Settings.Filters) {
      for (var i = 0; i < mw.Settings.Filters.length; i++) {
        var f = mw.Settings.Filters[i] || {};
        out.recon.filters.push({
          i: i, active: (i === savedFilterNo),
          name: (f.FilterName === undefined ? null : f.FilterName),
          codeLen: (f.FilterCode === undefined ? -1 : String(f.FilterCode).length)
        });
      }
    }
    out.recon.persistedBefore = readPersisted();
    next();
  }

  function phaseCompute(next) {
    var rows = mw.AllRows;
    var engine = ENG.createBEngine({
      models: {
        parseOptionLabel: MODELS.optionParser.parseOptionLabel,
        impliedVol: MODELS.greeks.impliedVol,
        bsGreeks: MODELS.greeks.bsGreeks
      }
      // calendar and now are the engine's own defaults: createCalendar() and Date.now,
      // which is what the page uses for its own ticks.
    });
    var snapId = engine.computeSnapshotId(mw);
    var cfgHash = engine.computeConfigHash(mw);
    var t0 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    var res = engine.run(rows, snapId, cfgHash);
    var t1 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    var guard = engine.run(rows, snapId, cfgHash);   // same snapshot + config -> must not re-run

    var pub = {};
    engine.publish(pub);
    P = {
      engine: engine, index: pub.__B_index, known: pub.__B_known, bits: pub.__B_bitset,
      symbols: pub.__B_symbols, snapshotId: pub.__B_snapshotId, configHash: pub.__B_configHash,
      configVersion: pub.__B_configVersion, totalRuns: pub.__B_totalRuns,
      meta: pub.__B_meta, lastError: pub.__B_lastError,
      origBits: pub.__B_bitset, origKnown: pub.__B_known, origIndex: pub.__B_index,
      invertedBits: null, tally: null
    };
    // the engine's own answer over the WHOLE population, independent of A
    var n = P.symbols.length, computed = 0, kept = 0, hidden = 0;
    for (var i = 0; i < P.known.length; i++) {
      for (var bit = 0; bit < 8; bit++) {
        var pos = i * 8 + bit;
        if (pos >= n) break;
        if ((P.known[i] >> bit) & 1) {
          computed++;
          if ((P.bits[i] >> bit) & 1) kept++; else hidden++;
        }
      }
    }
    out.engine = {
      version: ENG.VERSION,
      funnelConfig: engine.funnelConfig,
      run: res, guardReRun: { published: guard.published, reason: guard.reason },
      elapsedMs: Math.round((t1 - t0) * 100) / 100,
      snapshotId: snapId, configHash: cfgHash
    };
    out.projection = {
      symbols: n, bitsetBytes: P.bits.length,
      engineVerdicts: { total: n, computed: computed, kept: kept, hidden: hidden, failOpen: n - computed }
    };
    // a size sanity check: the projection must be what a real B would publish
    var expectBytes = Math.ceil(n / 8);
    out.projection.bitsetBytesCorrect = (P.bits.length === expectBytes && P.known.length === expectBytes);
    // never serialise the projection itself: the index has one entry per symbol
    out.projection.indexEntries = Object.keys(pub.__B_index).length;
    next();
  }

  function phaseRegister(next) {
    var built = LOOKUP.buildFilterCode();
    var BODY = built.body;
    var code = null;
    try { code = mw.PrepareFilterCode(BODY); } catch (e) { out.errors.push('PrepareFilterCode: ' + String((e && e.message) || e)); }
    var finalCode = (typeof code === 'string') ? code : BODY;
    if (mw && mw.Settings && mw.Settings.Filters && savedFilterNo !== null && mw.Settings.Filters[savedFilterNo]) {
      mw.Settings.Filters[savedFilterNo].FilterCode = finalCode;
    }
    mw.FilterCode = finalCode;
    if (typeof mw.SaveParams === 'function') mw.SaveParams();
    out.body = {
      source: 'TseLookup.buildFilterCode()  (the repo generator, not a literal)',
      bytes: built.bytes, limit: built.limit, fits: built.fits, version: built.version,
      fnv1a: fnv1a(BODY),
      compiledIdentical: (typeof code === 'string') ? (code === BODY) : null,
      compiledLen: (typeof code === 'string') ? code.length : null
    };
    out.register = { renderCalled: doRender() };
    setTimeout(next, 400);
  }

  function phaseReal(next) {
    install(P.origIndex, P.origKnown, P.origBits, 'real');
    resetTally();
    out.real.renderCalled = doRender();
    setTimeout(function () {
      var t = tallyReport(P.tally);
      out.real.tally = t;
      var pop = population();
      // the engine's answer restricted to the rows the SITE actually evaluated
      var exp = { keep: 0, hide: 0, failOpen: 0 }, onlyReal = [];
      for (var i = 0; i < pop.codes.length; i++) {
        var c = pop.codes[i];
        if (P.tally.perInscode[c] === undefined) continue;
        var v = verdictOf(c, P.origIndex, P.origKnown, P.origBits);
        exp[v]++;
      }
      out.real.expectedVerdicts = exp;
      out.real.verdictsMatchProjection = (t.verdicts.keep === exp.keep &&
        t.verdicts.hide === exp.hide && t.verdicts.failOpen === exp.failOpen);
      // coverage: how much of the page's own population reached the filter
      out.real.coverage = {
        engineSymbols: P.symbols.length,
        evaluatedBySite: t.distinctCount,
        pctOfEngineSymbols: Math.round(1000 * t.distinctCount / P.symbols.length) / 10,
        pctOfAllRows: Math.round(1000 * t.distinctCount / out.recon.rowCount) / 10
      };
      // the LIVE UX IMPACT: of the rows the site renders, how many disappear
      out.real.uxImpact = {
        hiddenByEngine: t.verdicts.hide,
        keptByEngine: t.verdicts.keep,
        failOpenVisible: t.verdicts.failOpen,
        visibleAfter: t.verdicts.keep + t.verdicts.failOpen,
        hiddenPctOfEvaluated: t.distinctCount ? Math.round(1000 * t.verdicts.hide / t.distinctCount) / 10 : null
      };
      out.real.hiddenSample = diagnose(pop.codes, 'hide', 8);
      out.real.failOpenSample = diagnose(pop.codes, 'failOpen', 6);
      out.real.reranByPage = (t.reads > t.distinctCount)
        ? { reads: t.reads, extraRuns: Math.round(t.reads / Math.max(1, t.distinctCount)) }
        : { reads: t.reads, extraRuns: 1 };
      // keep the REAL phase's per-inscode verdicts for the per-row inverted comparison
      P.tallyReal = P.tally.perInscode;
      next();
    }, RENDER_WAIT);
  }

  function phaseInverted(next) {
    // the SAME projection with every pass bit flipped: known rows invert, and the
    // unknown rows stay unknown (their verdict cannot invert - it is a fail-open).
    var n = P.symbols.length;
    var inv = new Uint8Array(P.origBits.length);
    for (var i = 0; i < P.origBits.length; i++) {
      inv[i] = 0;
      for (var bit = 0; bit < 8; bit++) {
        var pos = i * 8 + bit;
        if (pos >= n) break;
        if (((P.origBits[i] >> bit) & 1) === 0 && ((P.origKnown[i] >> bit) & 1)) inv[i] |= (1 << bit);
      }
    }
    P.invertedBits = inv;
    install(P.origIndex, P.origKnown, inv, 'inverted');
    resetTally();
    out.inverted.renderCalled = doRender();
    setTimeout(function () {
      var t = tallyReport(P.tally);
      out.inverted.tally = t;
      // per-row comparison against the REAL phase, over the intersection only
      var real = P.tallyReal, invMap = P.tally.perInscode;
      var both = 0, onlyReal = 0, onlyInverted = 0, flipped = 0, mism = [];
      for (var k in real) {
        if (!real.hasOwnProperty(k)) continue;
        if (invMap[k] === undefined) { onlyReal++; continue; }
        both++;
        var a = real[k], b = invMap[k];
        if (a === 'failOpen' || b === 'failOpen') { if (a === b) { /* both fail-open, fine */ } }
        else if (a !== b) flipped++;
        else if (mism.length < 5) mism.push({ inscode: k, real: a, inverted: b });
      }
      for (var k2 in invMap) { if (invMap.hasOwnProperty(k2) && real[k2] === undefined) onlyInverted++; }
      out.inverted.compare = {
        bothPhases: both, onlyInReal: onlyReal, onlyInInverted: onlyInverted,
        flippedWithProjection: flipped, mismatches: mism.length, mismatchSample: mism,
        note: 'a fail-open row stays fail-open when the bits flip - it has no bit to flip'
      };
      out.inverted.flipsExactly = (mism.length === 0);
      next();
    }, RENDER_WAIT);
  }

  function phaseCleared(next) {
    resetTally();
    try { mw.__B_index = null; mw.__B_known = null; mw.__B_bitset = null; }
    catch (e) { out.errors.push('clear: ' + String((e && e.message) || e)); }
    out.cleared.projectionCleared = (mw.__B_index === null || mw.__B_index === undefined);
    out.cleared.renderCalled = doRender();
    setTimeout(function () {
      out.cleared.tally = tallyReport(P.tally);
      out.cleared.noReads = (out.cleared.tally.reads === 0);
      next();
    }, RENDER_WAIT);
  }

  function phaseRollback(next) {
    out.rollback.restore = window.__A_REAL_PROJ_RESTORE();
    out.rollback.renderCalled = doRender();
    setTimeout(function () {
      var slotOk = true, codeOk = true, cleaned = true;
      try {
        if (mw && mw.Settings && mw.Settings.Filters && savedFilterNo !== null && mw.Settings.Filters[savedFilterNo]) {
          slotOk = String(mw.Settings.Filters[savedFilterNo].FilterCode || '') === savedSettingsCode;
        }
        codeOk = String(mw.FilterCode || '') === savedSettingsCode;
        for (var k in mw) { if (mw.hasOwnProperty(k) && k.indexOf('__B_') === 0) cleaned = false; }
      } catch (e) { slotOk = false; codeOk = false; }
      out.rollback.slotRestored = slotOk;
      out.rollback.mirrorRestored = codeOk;
      out.rollback.cleaned = cleaned;
      out.rollback.persistedAfter = readPersisted();
      out.rollback.persistedMatchesSaved = (out.rollback.persistedAfter.activeSlotLen === savedSettingsCode.length);
      next();
    }, RENDER_WAIT);
  }

  function finish() {
    var r = out.real, v = out.inverted, c = out.cleared, b = out.rollback;
    // The success test MUST require that the body actually ran. With distinct=0 every
    // sub-condition is vacuously true (0 === 0 everywhere), so without this guard a
    // page that never evaluates the mirror would still report success.
    out.status =
      (r.tally.distinctCount > 0 && r.verdictsMatchProjection && v.flipsExactly &&
       c.noReads && b.slotRestored && b.cleaned)
        ? 'real-engine-projection-works-live'
        : (r.tally.distinctCount === 0) ? 'body-never-ran'
          : (r.verdictsMatchProjection && !v.flipsExactly) ? 'verdicts-correct-but-do-not-flip'
            : (r.verdictsMatchProjection && !c.noReads) ? 'verdicts-correct-but-cleared-still-reads'
              : (!r.verdictsMatchProjection) ? 'verdicts-disagree-with-the-projection'
                : (!b.slotRestored || !b.cleaned) ? 'measurement-ok-but-rollback-incomplete'
                  : 'incomplete';
    out.verdict =
      out.status === 'real-engine-projection-works-live'
        ? 'the real engine computed a projection of ' + out.projection.symbols + ' symbols (' +
          out.projection.bitsetBytes + ' bytes) from ' + out.recon.rowCount + ' live rows: ' +
          out.projection.engineVerdicts.computed + ' judged (' +
          out.projection.engineVerdicts.kept + ' pass / ' + out.projection.engineVerdicts.hidden +
          ' fail the IV window), ' + out.projection.engineVerdicts.failOpen +
          ' fail-open. Of the ' + r.tally.distinctCount +
          ' rows the site actually ran through the filter, A kept ' + r.uxImpact.keptByEngine +
          ', hid ' + r.uxImpact.hiddenByEngine + ' (' + r.uxImpact.hiddenPctOfEvaluated + '%) and failed open on ' +
          r.uxImpact.failOpenVisible + ' - exactly what the projection says. Flipping the pass bits flipped every verdict (' +
          v.compare.flippedWithProjection + ' of ' + v.compare.bothPhases + '), and clearing the projection produced zero reads. Rollback restored the slot, the mirror and storage.'
        : out.status === 'verdicts-disagree-with-the-projection'
          ? 'A ran and read the projection, but its verdicts do not match the projection it read (real=' +
            JSON.stringify(r.tally.verdicts) + ' expected=' + JSON.stringify(r.expectedVerdicts) + ')'
          : out.status === 'body-never-ran'
            ? 'the body was registered and RenderData ran, but the projection was never read'
            : 'incomplete - read the phase objects: real=' + JSON.stringify(r.tally.verdicts) +
              ' inverted=' + JSON.stringify(v.tally.verdicts) + ' cleared.reads=' + c.tally.reads;

    console.log('A-REAL-PROJ: ' + out.verdict);
    console.log('  engine: ' + out.engine.version + ' config=' + JSON.stringify(out.engine.funnelConfig));
    console.log('  projection: symbols=' + out.projection.symbols + ' bytes=' + out.projection.bitsetBytes +
                ' engineVerdicts=' + JSON.stringify(out.projection.engineVerdicts));
    console.log('  body: bytes=' + out.body.bytes + '/' + out.body.limit + ' fnv1a=' + out.body.fnv1a +
                ' identical=' + out.body.compiledIdentical + ' verified=' + out.body.fits);
    console.log('  REAL: reads=' + r.tally.reads + ' distinct=' + r.tally.distinctCount +
                ' verdicts=' + JSON.stringify(r.tally.verdicts) +
                ' expected=' + JSON.stringify(r.expectedVerdicts) + ' match=' + r.verdictsMatchProjection);
    console.log('        coverage=' + JSON.stringify(r.coverage) + ' uxImpact=' + JSON.stringify(r.uxImpact));
    console.log('  INVERTED: verdicts=' + JSON.stringify(v.tally.verdicts) + ' compare=' + JSON.stringify(v.compare));
    console.log('  CLEARED: reads=' + c.tally.reads + ' noReads=' + c.noReads);
    console.log('  ROLLBACK: slot=' + b.slotRestored + ' mirror=' + b.mirrorRestored + ' cleaned=' + b.cleaned +
                ' persistedMatches=' + b.persistedMatchesSaved);
    delete window.__A_REAL_PROJ_RESTORE;
    say(out);
  }

  // ---------- run ----------
  try {
    if (!mw) { out.status = 'no-mw'; out.verdict = 'mw is not on this page'; say(out); return; }
    if (typeof mw.RenderData !== 'function') { out.status = 'no-renderdata'; out.verdict = 'mw.RenderData is not a function'; say(out); return; }
    var chain = [phasePreflight, phaseRecon, phaseCompute, phaseRegister, phaseReal, phaseInverted, phaseCleared, phaseRollback], i = 0;
    (function run() { if (i >= chain.length) { finish(); return; } chain[i++](run); })();
  } catch (e) {
    out.errors.push(String((e && e.message) || e));
    out.status = 'error';
    try { if (typeof window.__A_REAL_PROJ_RESTORE === 'function') window.__A_REAL_PROJ_RESTORE(); } catch (e2) {}
    say(out);
  }
})();
