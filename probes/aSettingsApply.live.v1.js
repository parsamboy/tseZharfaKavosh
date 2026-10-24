/**
 * tseZharfaKavosh — apply the UX settings to the live filter v1 (G-30)
 *
 * WHY THIS EXISTS
 *   E-070 proved the settings layer on the live page: all 16 variables are
 *   changeable, the configHash follows any edit, and the measurement moves (the
 *   wideReach preset recovered 51 of 1987 rows). But `filterNo` was -1 and this
 *   probe family registers nothing, so the panel changed the MEASUREMENT while the
 *   page still hid whatever the last registration said - i.e. nothing.
 *
 *   E-068 proved the other half: publish the projection, register the repo-generated
 *   A body through the proven path (two writes + SaveParams + RenderData), read the
 *   verdicts back through tallying Proxies, then roll back. What was missing is the
 *   JOIN: run B with the OWNER'S SETTINGS instead of the shipped defaults, so the
 *   page actually filters the way the panel says it will.
 *
 *   This probe is that join. It also fixes the guard: `configHash` is now
 *   `TseFunnelSettings.configHash(settings)`, not `configVersion + FilterCode.length`.
 *   With every variable user-changeable, the old input is blind to a settings edit -
 *   it cannot see ivMax move from 2.5 to 1.5, so B would keep publishing a stale
 *   projection until the page happened to re-render.
 *
 * WHICH SETTINGS IT USES (first match wins)
 *   1. window.__FUNNEL_SETTINGS_OVERRIDE = { ivMax: 1.5, ... }   set before running
 *   2. localStorage['tseFunnelSettings.v1']                      the panel's «ذخیره»
 *   3. the shipped defaults
 *   Either way the source, the hash and every changed variable are reported, so the
 *   verdict is never ambiguous about which config produced it.
 *
 * WHAT IT TOUCHES
 *   The proven registration path, and nothing else: one filter slot (the ACTIVE one,
 *   read at run time), its mirror mw.FilterCode, SaveParams, and RenderData. Rollback
 *   restores the slot, the mirror and the PERSISTED storage, and the run verifies the
 *   persisted bytes match what was there before (the E-059/E-064 lesson).
 *
 * PREREQUISITE (one paste, once per page load)
 *   Paste src/engine/tseEngine.browser.v1.js first (46,484 bytes; it now defines
 *   window.TseBEngine / TseModels / TseLookup / TseFunnelSettings).
 *
 * RUN HERE (always): old.tsetmc.com/Loader.aspx?ParTree=15131F  ->  Console (F12)
 *   tag: [کنسول] — paste the bundle, then this file, then WAIT ~4 seconds.
 *   Send the single PROBE_JSON line.
 *
 * SPDX-License-Identifier: Smart-FFA-1.1
 */
(function aSettingsApply() {
  'use strict';

  var RENDER_WAIT = 700;
  var out = {
    meta: {
      test: 'A-SETTINGS-APPLY-v1', gate: 'G-30', evidenceId: 'E-071',
      host: (typeof location !== 'undefined') ? location.host : 'unknown',
      parTree: '15131F', capturedAt: new Date().toISOString(),
      method: 'the owner settings (override > storage > defaults) are normalised by src/ux/funnelSettings, B runs with them and publishes, the repo-generated A body is registered through the proven path, the verdicts are read back through tallying Proxies in real / inverted / cleared phases, then everything is rolled back - and the verdicts are compared against a second engine run with the shipped defaults'
    },
    preflight: {}, recon: {}, settings: {}, engine: {}, projection: {},
    baseline: {}, body: {}, register: {},
    real: {}, inverted: {}, cleared: {}, rollback: {},
    errors: [], status: 'unknown', verdict: ''
  };

  var mw = (typeof window !== 'undefined') ? window.mw : null;
  var ENG = (typeof window !== 'undefined') ? window.TseBEngine : null;
  var MODELS = (typeof window !== 'undefined') ? window.TseModels : null;
  var LOOKUP = (typeof window !== 'undefined') ? window.TseLookup : null;
  var UX = (typeof window !== 'undefined') ? window.TseFunnelSettings : null;

  function fnv1a(s) {
    var h = 0x811c9dc5, i;
    for (i = 0; i < s.length; i++) { h ^= s.charCodeAt(i) & 0xff; h = (h * 0x01000193) >>> 0; }
    return ('00000000' + h.toString(16)).slice(-8);
  }
  function say(o) { console.log('PROBE_JSON ' + JSON.stringify(o)); }
  function doRender() {
    if (mw && typeof mw.RenderData === 'function') {
      try { mw.RenderData(); return true; } catch (e) { out.errors.push('RenderData: ' + String((e && e.message) || e)); }
    }
    return false;
  }

  out.preflight = {
    bundle: { engine: !!ENG, models: !!MODELS, lookup: !!LOOKUP, settings: !!UX },
    engineVersion: ENG ? ENG.VERSION : null,
    settingsVersion: UX ? UX.VERSION : null,
    filterCodeLimit: LOOKUP ? LOOKUP.FILTER_CODE_LIMIT : null
  };
  if (!ENG || !MODELS || !LOOKUP || !UX) {
    out.status = 'needs-bundle';
    out.verdict = 'window.TseBEngine/TseModels/TseLookup/TseFunnelSettings are not all on this page - paste src/engine/tseEngine.browser.v1.js in the console first (46,484 bytes, it now includes the settings layer), then run this probe again. Nothing was changed.';
    say(out);
    console.log('A-SETTINGS-APPLY: ' + out.verdict);
    return;
  }

  // ---------- rollback state (E-059 / E-064: memory AND persisted storage) ----------
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
      } else r.note += 'persisted JSON has no Filters array; ';
    } catch (e) { r.note += 'read/parse error: ' + String((e && e.message) || e); }
    return r;
  }
  function snapshotState() {
    savedFilterNo = (mw && mw.Settings && typeof mw.Settings.FilterNo !== 'undefined') ? mw.Settings.FilterNo : null;
    savedSettingsCode = (mw && mw.Settings && mw.Settings.Filters && savedFilterNo !== null && mw.Settings.Filters[savedFilterNo])
      ? String(mw.Settings.Filters[savedFilterNo].FilterCode || '') : '';
    savedFilterCode = (mw && mw.FilterCode !== undefined && mw.FilterCode !== null) ? String(mw.FilterCode) : '';
  }
  function restoreState() {
    try {
      if (mw && mw.Settings && mw.Settings.Filters && savedFilterNo !== null && mw.Settings.Filters[savedFilterNo]) {
        mw.Settings.Filters[savedFilterNo].FilterCode = savedSettingsCode;
      }
      mw.FilterCode = (savedFilterCode !== '') ? savedFilterCode : savedSettingsCode;
      var i;
      for (i in mw) { if (mw.hasOwnProperty(i) && i.indexOf('__B_') === 0) delete mw[i]; }
      if (mw && typeof mw.SaveParams === 'function') mw.SaveParams();
      return { restored: true, filterNo: savedFilterNo, settingsCodeLen: savedSettingsCode.length };
    } catch (e) { return { restored: false, error: String((e && e.message) || e) }; }
  }

  // ---------- population + projection ----------
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

  var P = null;
  function verdictOf(inscode, index, known, bits) {
    var pos = index[inscode];
    if (pos === undefined) return 'failOpen';
    var b = pos >> 3, m = pos & 7;
    if (b < 0 || b >= known.length) return 'failOpen';
    if (!((known[b] >> m) & 1)) return 'failOpen';
    return ((bits[b] >> m) & 1) ? 'keep' : 'hide';
  }

  // ---------- the tally (the proven Proxy: absent keys count as fail-open) ----------
  var NOT_A_LOOKUP = { length: 1, name: 1, toString: 1, valueOf: 1, constructor: 1,
    prototype: 1, hasOwnProperty: 1, isPrototypeOf: 1, propertyIsEnumerable: 1,
    toLocaleString: 1, __proto__: 1, then: 1, catch: 1, inspect: 1, nodeType: 1,
    $$typeof: 1, undefined: 1 };
  function isLookup(k) { return (typeof k === 'string') && k.length > 0 && NOT_A_LOOKUP[k] !== 1; }
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
            if (tally.sample.length < 12) tally.sample.push({ inscode: code, inProjection: (pos !== undefined), pos: pos, verdict: v });
          }
        }
        return t[k];
      }
    });
    var pKnown = new Proxy(known, { get: function (t, k) { if (isByte(t, k)) { tally.byteReads++; tally.bytesSeen['k' + (+k)] = t[k]; } return t[k]; } });
    var pBits = new Proxy(bits, { get: function (t, k) { if (isByte(t, k)) { tally.byteReads++; tally.bytesSeen['b' + (+k)] = t[k]; } return t[k]; } });
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
    return {
      reads: t.reads, distinctCount: Object.keys(t.distinct).length, verdicts: t.verdicts,
      byteReads: t.byteReads, distinctBytesRead: seen.length, byteSample: sample,
      sample: t.sample.slice(0, 8)
    };
  }

  function diagnose(codes, verdict, limit) {
    var list = [];
    for (var i = 0; i < codes.length && list.length < limit; i++) {
      if (P.tally.perInscode[codes[i]] !== verdict) continue;
      var row = mw.AllRows[codes[i]] || {};
      var parsed = MODELS.optionParser.parseOptionLabel(row);
      var fr = null;
      try { fr = P.engine.computeFunnel(row, parsed); } catch (e) { fr = { status: 'error', reason: String((e && e.message) || e) }; }
      list.push({
        inscode: codes[i], label: (row.l30 === undefined ? null : String(row.l30).slice(0, 46)),
        parsed: (parsed && parsed.status) ? parsed.status : null,
        engine: (fr && fr.status) ? fr.status : null,
        ivStatus: (fr && fr.ivStatus !== undefined) ? fr.ivStatus : null,
        iv: (fr && typeof fr.iv === 'number') ? Math.round(fr.iv * 1000) / 1000 : null,
        priceSource: (fr && fr.inputs && fr.inputs.marketPriceSource) ? fr.inputs.marketPriceSource : null,
        reason: (fr && fr.reason) ? fr.reason : null
      });
    }
    return list;
  }

  // ---------- the settings: override > storage > defaults ----------
  function pickSettings() {
    var override = (typeof window !== 'undefined') ? window.__FUNNEL_SETTINGS_OVERRIDE : null;
    if (override && typeof override === 'object') {
      var o = UX.normalizeSettings(override);
      return { settings: o.settings, warnings: o.warnings, source: 'override' };
    }
    var loaded = UX.load((typeof localStorage !== 'undefined') ? localStorage : null);
    if (loaded.source === 'storage' && loaded.warnings.filter(function (w) { return w.reason === 'storage-garbage'; }).length === 0) {
      return { settings: loaded.settings, warnings: loaded.warnings, source: 'storage' };
    }
    return { settings: UX.normalizeSettings(null).settings, warnings: loaded.warnings, source: 'defaults' };
  }

  // Every valid alternative for one schema field, in preference order. The normalizer
  // may legitimately REPAIR a candidate back to the current value (ivMax 0.01 is below
  // ivMin 0.05, so the inverted-window repair restores 2.5), which would make a naive
  // probe report a blind hash. So the caller tries them in order and keeps the first
  // candidate that actually survives normalization.
  function alternatives(f, current) {
    var list = [];
    if (f.type === 'bool') list.push(!current);
    else if (f.type === 'enum') f.choices.forEach(function (c) { if (c !== current) list.push(c); });
    else if (f.type === 'number') {
      var span = f.max - f.min;
      [f.default, f.min + span / 2, f.min + span * 0.25, f.min + span * 0.75, f.min, f.max]
        .forEach(function (v) { if (typeof v === 'number' && isFinite(v)) list.push(v); });
    }
    return list.filter(function (v, i) { return list.indexOf(v) === i; });
  }

  // For every schema field: move it alone, re-normalise, re-hash, and require a change.
  function hashSensitivity(settingsObj, chosenHash) {
    var r = { fields: UX.SCHEMA.length, seen: 0, blind: [], probe: {} };
    UX.SCHEMA.forEach(function (f) {
      var list = alternatives(f, settingsObj[f.key]);
      var tried = [];
      var landed = null;
      for (var i = 0; i < list.length; i++) {
        var patch = {};
        patch[f.key] = list[i];
        var norm = UX.normalizeSettings(Object.assign({}, settingsObj, patch)).settings;
        tried.push(list[i]);
        if (norm[f.key] !== settingsObj[f.key]) { landed = { asked: list[i], got: norm[f.key] }; break; }
      }
      if (!landed) {
        r.blind.push(f.key + ':no-surviving-alternative');
        r.probe[f.key] = { from: settingsObj[f.key], tried: tried, hash: null, seen: false };
        return;
      }
      var patch2 = {};
      patch2[f.key] = landed.asked;
      var h = UX.configHash(UX.normalizeSettings(Object.assign({}, settingsObj, patch2)).settings);
      r.probe[f.key] = { from: settingsObj[f.key], to: landed.asked, got: landed.got, hash: h, seen: (h !== chosenHash) };
      if (h === chosenHash) r.blind.push(f.key); else r.seen++;
    });
    return r;
  }

  // ---------- one engine run over the whole population (no publishing) ----------
  function engineRun(settingsObj, label) {
    var t0 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    var cfg = UX.toFunnelConfig(settingsObj);
    var engine = ENG.createBEngine({
      models: {
        parseOptionLabel: MODELS.optionParser.parseOptionLabel,
        impliedVol: MODELS.greeks.impliedVol,
        bsGreeks: MODELS.greeks.bsGreeks
      },
      funnelConfig: cfg
    });
    var rows = mw.AllRows;
    var idx = engine.buildIndex(rows);
    var snapId = engine.computeSnapshotId(mw);
    var cfgHash = UX.configHash(settingsObj);
    var res = engine.run(rows, snapId, cfgHash);
    var pub = {};
    engine.publish(pub);
    var n = pub.__B_symbols.length, computed = 0, kept = 0, hidden = 0;
    for (var i = 0; i < pub.__B_known.length; i++) {
      for (var bit = 0; bit < 8; bit++) {
        var pos = i * 8 + bit;
        if (pos >= n) break;
        if ((pub.__B_known[i] >> bit) & 1) {
          computed++;
          if ((pub.__B_bitset[i] >> bit) & 1) kept++; else hidden++;
        }
      }
    }
    return {
      label: label, engine: engine, pub: pub, config: cfg, report: res,
      snapshotId: snapId, configHash: cfgHash, indexChanged: idx.changed,
      symbols: n, bitsetBytes: pub.__B_bitset.length,
      computed: computed, kept: kept, hidden: hidden, failOpen: n - computed,
      elapsedMs: Math.round(((typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now()) - t0)
    };
  }

  // ---------- phases ----------
  function phasePreflight(next) {
    var s = mw.Settings || {};
    out.recon.filters = [];
    if (mw && mw.Settings && mw.Settings.Filters) {
      for (var i = 0; i < mw.Settings.Filters.length; i++) {
        var f = mw.Settings.Filters[i] || {};
        out.recon.filters.push({ i: i, active: (i === savedFilterNo), name: (f.FilterName === undefined ? null : f.FilterName), codeLen: (f.FilterCode === undefined ? -1 : String(f.FilterCode).length) });
      }
    }
    out.recon = {
      filterNo: (typeof s.FilterNo !== 'undefined') ? s.FilterNo : null,
      viewMode: (mw && mw.ViewMode !== undefined) ? mw.ViewMode : null,
      updateSpeed: (mw && mw.UpdateSpeed !== undefined) ? mw.UpdateSpeed : null,
      roundNo: (mw && mw.RoundNo !== undefined) ? mw.RoundNo : null,
      rowCount: (mw && mw.AllRows) ? Object.keys(mw.AllRows).length : 0,
      filters: out.recon.filters,
      persistedBefore: readPersisted()
    };
    next();
  }

  function phaseCompute(next) {
    var picked = pickSettings();
    var d = UX.describe(picked.settings);
    out.settings = {
      source: picked.source, hash: d.hash, changedCount: d.changedCount, isDefault: d.isDefault,
      changed: d.changed, warnings: picked.warnings, storageKey: UX.STORAGE_KEY
    };
    if (picked.source === 'defaults' && picked.warnings.length) {
      out.status = 'settings-warning';
      out.verdict = 'the stored settings could not be used (' + picked.warnings.map(function (w) { return w.reason; }).join(', ') +
        '), so this run applies the SHIPPED DEFAULTS. Fix the settings or set window.__FUNNEL_SETTINGS_OVERRIDE before re-running. Nothing was registered.';
      say(out);
      console.log('A-SETTINGS-APPLY: ' + out.verdict);
      return;
    }

    // B with the owner's settings, published and registered
    P = engineRun(picked.settings, 'chosen');
    // the dual-trigger guard: the same snapshotId + the same settings hash must NOT re-run
    var guard = P.engine.run(mw.AllRows, P.snapshotId, P.configHash);
    out.engine = {
      version: ENG.VERSION,
      settingsSource: picked.source,
      funnelConfig: P.config,
      run: P.report,
      guardReRun: { published: guard.published, reason: guard.reason },
      elapsedMs: P.elapsedMs, snapshotId: P.snapshotId, configHash: P.configHash,
      configHashSource: 'TseFunnelSettings.configHash(settings) - NOT configVersion + FilterCode.length'
    };
    // the same population under the shipped defaults, for the delta
    var base = engineRun(UX.normalizeSettings(null).settings, 'shipped-defaults');
    out.baseline = {
      funnelConfig: base.config, computed: base.computed, kept: base.kept, hidden: base.hidden,
      failOpen: base.failOpen, symbols: base.symbols, elapsedMs: base.elapsedMs,
      deltaVsChosen: { judged: P.computed - base.computed, kept: P.kept - base.kept, hidden: P.hidden - base.hidden }
    };

    var n = P.symbols;
    out.projection = {
      symbols: n, bitsetBytes: P.bitset, indexEntries: Object.keys(P.pub.__B_index).length,
      engineVerdicts: { total: n, computed: P.computed, kept: P.kept, hidden: P.hidden, failOpen: P.failOpen },
      bitsetBytesCorrect: (P.pub.__B_bitset.length === Math.ceil(n / 8) && P.pub.__B_known.length === Math.ceil(n / 8))
    };
    // The guard must see a SETTINGS edit. Probing with one hard-coded value is BLIND
    // when the owner already chose that value (scenario D picks ivMax 1.5 and the probe
    // also asked for 1.5 -> identical hash -> "THE GUARD IS BLIND TO SETTINGS", a false
    // alarm produced by the instrument, not by the code). So move EVERY variable to a
    // different valid value of its own kind and require the hash to change each time:
    // G-29 says every variable is user-editable, so the hash must be blind to none.
    out.projection.hashProbe = hashSensitivity(picked.settings, P.configHash);
    out.projection.hashSeesSettingsChange = (out.projection.hashProbe.blind.length === 0 &&
      out.projection.hashProbe.seen === out.projection.hashProbe.fields);
    next();
  }

  function phaseRegister(next) {
    var built = LOOKUP.buildFilterCode();
    var BODY = built.body;
    var code = null;
    try { code = mw.PrepareFilterCode(BODY); } catch (e) { out.errors.push('PrepareFilterCode: ' + String((e && e.message) || e)); }
    var finalCode = (typeof code === 'string') ? code : BODY;
    var slotWritten = false;
    if (mw && mw.Settings && mw.Settings.Filters && savedFilterNo !== null && mw.Settings.Filters[savedFilterNo]) {
      mw.Settings.Filters[savedFilterNo].FilterCode = finalCode;
      slotWritten = true;
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
    // E-070 found filterNo = -1 on the live page: no slot was active, so a registration
    // that only writes the slot would silently do nothing. Report which slot was used and
    // whether it was actually written, so the verdict can never be ambiguous about it.
    out.register = {
      slot: savedFilterNo, slotWritten: slotWritten,
      mirrorWritten: (mw.FilterCode === finalCode),
      renderCalled: doRender()
    };
    setTimeout(next, 400);
  }

  function phaseReal(next) {
    install(P.pub.__B_index, P.pub.__B_known, P.pub.__B_bitset, 'real');
    resetTally();
    out.real.renderCalled = doRender();
    setTimeout(function () {
      var t = tallyReport(P.tally);
      out.real.tally = t;
      var pop = population();
      var exp = { keep: 0, hide: 0, failOpen: 0 };
      for (var i = 0; i < pop.codes.length; i++) {
        var c = pop.codes[i];
        if (P.tally.perInscode[c] === undefined) continue;
        exp[verdictOf(c, P.pub.__B_index, P.pub.__B_known, P.pub.__B_bitset)]++;
      }
      out.real.expectedVerdicts = exp;
      out.real.verdictsMatchProjection = (t.verdicts.keep === exp.keep && t.verdicts.hide === exp.hide && t.verdicts.failOpen === exp.failOpen);
      out.real.coverage = {
        engineSymbols: P.symbols, evaluatedBySite: t.distinctCount,
        pctOfEngineSymbols: Math.round(1000 * t.distinctCount / P.symbols.length) / 10,
        pctOfAllRows: Math.round(1000 * t.distinctCount / out.recon.rowCount) / 10
      };
      // the LIVE UX IMPACT of the CHOSEN settings
      out.real.uxImpact = {
        hiddenByEngine: t.verdicts.hide, keptByEngine: t.verdicts.keep,
        failOpenVisible: t.verdicts.failOpen,
        visibleAfter: t.verdicts.keep + t.verdicts.failOpen,
        hiddenPctOfEvaluated: t.distinctCount ? Math.round(1000 * t.verdicts.hide / t.distinctCount) / 10 : null,
        note: 'this is what the owner settings do to the rows the site actually renders'
      };
      out.real.hiddenSample = diagnose(pop.codes, 'hide', 8);
      out.real.failOpenSample = diagnose(pop.codes, 'failOpen', 6);
      out.real.reranByPage = (t.reads > t.distinctCount)
        ? { reads: t.reads, extraRuns: Math.round(t.reads / Math.max(1, t.distinctCount)) }
        : { reads: t.reads, extraRuns: 1 };
      P.tallyReal = P.tally.perInscode;
      next();
    }, RENDER_WAIT);
  }

  function phaseInverted(next) {
    var n = P.symbols;
    var inv = new Uint8Array(P.pub.__B_bitset.length);
    for (var i = 0; i < P.pub.__B_bitset.length; i++) {
      inv[i] = 0;
      for (var bit = 0; bit < 8; bit++) {
        var pos = i * 8 + bit;
        if (pos >= n) break;
        if (((P.pub.__B_bitset[i] >> bit) & 1) === 0 && ((P.pub.__B_known[i] >> bit) & 1)) inv[i] |= (1 << bit);
      }
    }
    install(P.pub.__B_index, P.pub.__B_known, inv, 'inverted');
    resetTally();
    out.inverted.renderCalled = doRender();
    setTimeout(function () {
      var t = tallyReport(P.tally);
      out.inverted.tally = t;
      var real = P.tallyReal, invMap = P.tally.perInscode;
      var both = 0, onlyReal = 0, onlyInverted = 0, flipped = 0, mism = [];
      for (var k in real) {
        if (!real.hasOwnProperty(k)) continue;
        if (invMap[k] === undefined) { onlyReal++; continue; }
        both++;
        var a = real[k], b = invMap[k];
        if (a === 'failOpen' || b === 'failOpen') { /* no bit to flip */ }
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
    try { mw.__B_index = null; mw.__B_known = null; mw.__B_bitset = null; } catch (e) { out.errors.push('clear: ' + String((e && e.message) || e)); }
    out.cleared.projectionCleared = (mw.__B_index === null || mw.__B_index === undefined);
    out.cleared.renderCalled = doRender();
    setTimeout(function () {
      out.cleared.tally = tallyReport(P.tally);
      out.cleared.noReads = (out.cleared.tally.reads === 0);
      next();
    }, RENDER_WAIT);
  }

  function phaseRollback(next) {
    out.rollback.restore = restoreState();
    out.rollback.renderCalled = doRender();
    out.rollback.persistedAfter = readPersisted();
    out.rollback.persistedMatchesSaved = (out.rollback.persistedAfter.len === out.recon.persistedBefore.len &&
      out.rollback.persistedAfter.activeSlotLen === out.recon.persistedBefore.activeSlotLen);
    out.rollback.slotRestored = (mw.Settings && mw.Settings.Filters && savedFilterNo !== null &&
      String(mw.Settings.Filters[savedFilterNo].FilterCode || '') === savedSettingsCode);
    out.rollback.mirrorRestored = (String(mw.FilterCode || '') === savedFilterCode);
    out.rollback.cleaned = true;
    var i;
    for (i in mw) { if (mw.hasOwnProperty(i) && i.indexOf('__B_') === 0) { out.rollback.cleaned = false; break; } }
    next();
  }

  function finish() {
    var r = out.real, inv = out.inverted, cl = out.cleared, rb = out.rollback;
    out.sanity = {
      rows: out.recon.rowCount,
      perVariantConsistent: ((r.expectedVerdicts.keep + r.expectedVerdicts.hide + r.expectedVerdicts.failOpen) === r.tally.distinctCount),
      hashSeesSettingsChange: out.projection.hashSeesSettingsChange,
      baselineJudged: out.baseline.computed,
      baselinePlausible: (out.baseline.computed >= 20 && out.baseline.computed / out.recon.rowCount >= 0.05),
      judgedRatio: Math.round((10000 * out.baseline.computed) / out.recon.rowCount) / 100
    };
    var parts = [];
    parts.push('the settings from ' + out.settings.source + ' (hash ' + out.settings.hash + ', ' +
      out.settings.changedCount + ' variable(s) changed) were applied and published: ' +
      P.computed + ' judged of ' + P.symbols + ' symbols, ' + P.kept + ' kept, ' + P.hidden + ' hidden, ' + P.failOpen + ' fail-open.');
    parts.push('against the shipped defaults (' + out.baseline.computed + ' judged, ' + out.baseline.hidden + ' hidden): ' +
      (out.baseline.deltaVsChosen.judged >= 0 ? '+' : '') + out.baseline.deltaVsChosen.judged + ' judged, ' +
      (out.baseline.deltaVsChosen.hidden >= 0 ? '+' : '') + out.baseline.deltaVsChosen.hidden + ' hidden.');
    parts.push('on the live page A ' + (r.verdictsMatchProjection ? 'matched the projection exactly' : 'DID NOT MATCH') +
      ' (' + r.tally.verdicts.keep + ' keep / ' + r.tally.verdicts.hide + ' hide / ' + r.tally.verdicts.failOpen + ' fail-open of ' +
      r.tally.distinctCount + ' evaluated), the inverted phase flipped ' + inv.compare.flippedWithProjection +
      ' rows with ' + inv.compare.mismatches + ' mismatches, and clearing produced ' + cl.tally.reads + ' reads.');
    if (!out.sanity.hashSeesSettingsChange) parts.unshift('THE GUARD IS BLIND TO SETTINGS:');
    else if (!r.verdictsMatchProjection) parts.unshift('A DID NOT MATCH THE PROJECTION:');
    else if (!inv.flipsExactly) parts.unshift('THE INVERTED PHASE DID NOT FLIP EXACTLY:');
    else if (!cl.noReads) parts.unshift('CLEARING STILL PRODUCED READS:');
    else if (!rb.slotRestored || !rb.mirrorRestored || !rb.cleaned || !rb.persistedMatchesSaved) parts.unshift('ROLLBACK INCOMPLETE:');
    else if (!out.sanity.baselinePlausible) parts.unshift('SUSPICIOUS BASELINE:');
    else out.status = 'settings-applied-live';
    out.verdict = parts.join(' ');
    if (out.status !== 'settings-applied-live') out.status = 'failed-check';
    console.log('A-SETTINGS-APPLY: ' + out.verdict);
    console.log('  settings=' + out.settings.source + ' hash=' + out.settings.hash + ' changed=' + out.settings.changedCount +
      ' hashSeesSettingsChange=' + out.sanity.hashSeesSettingsChange);
    console.log('  chosen: judged=' + P.computed + ' kept=' + P.kept + ' hidden=' + P.hidden + ' failOpen=' + P.failOpen);
    console.log('  defaults: judged=' + out.baseline.computed + ' kept=' + out.baseline.kept + ' hidden=' + out.baseline.hidden);
    console.log('  REAL: reads=' + r.tally.reads + ' distinct=' + r.tally.distinctCount + ' verdicts=' + JSON.stringify(r.tally.verdicts) +
      ' match=' + r.verdictsMatchProjection);
    console.log('  INVERTED: flipped=' + inv.compare.flippedWithProjection + ' mismatches=' + inv.compare.mismatches);
    console.log('  CLEARED: reads=' + cl.tally.reads);
    console.log('  ROLLBACK: slot=' + rb.slotRestored + ' mirror=' + rb.mirrorRestored + ' cleaned=' + rb.cleaned +
      ' persistedMatches=' + rb.persistedMatchesSaved);
    say(out);
  }

  // ---------- the chain ----------
  snapshotState();
  phasePreflight(function () {
    phaseCompute(function () {
      if (out.status === 'settings-warning') return;
      phaseRegister(function () {
        phaseReal(function () {
          phaseInverted(function () {
            phaseCleared(function () {
              phaseRollback(function () { finish(); });
            });
          });
        });
      });
    });
  });
})();
