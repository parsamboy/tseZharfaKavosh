/**
 * tseZharfaKavosh — UX funnel settings panel v1 (G-29)
 *
 * WHY THIS EXISTS
 *   Owner decision (2026-10-21, answering G-29): «همه متغیرها در تنظیمات UX قابل
 *   تغییر باشند» — EVERY funnel variable must be changeable from the UX settings.
 *   E-068 settled the mechanism (A reads the projection, B publishes it); the open
 *   product question was WHICH config to ship, and until now the only way to change
 *   a variable was to edit src/engine/bEngine.v0.1.0.js and rebuild the bundle.
 *
 *   src/ux/funnelSettings.v0.1.0.js is that layer (schema, labels, ranges,
 *   persistence, presets, configHash) and it is now part of the browser bundle, so
 *   window.TseFunnelSettings is on the page after the usual one paste.
 *
 *   This probe is the UI: a floating RTL panel with a control for EVERY one of the 16
 *   variables, built from the schema (never a hand-written list), that recomputes the
 *   projection live as you change a value and reports the delta against the shipped
 *   defaults. It also works headless: with no `document` it runs the same measurement
 *   and prints the same PROBE_JSON, which is how probes/ (and the node harness) test it.
 *
 * WHAT IT DOES / DOES NOT TOUCH
 *   READ-ONLY with respect to the site: no filter slot, no mw.SaveParams, no
 *   RenderData, no navigation. It reads mw.AllRows and runs pure functions on private
 *   engines. The only thing it writes is its OWN localStorage key
 *   (`tseFunnelSettings.v1`) when you press «ذخیره», and
 *   window.__FUNNEL_SETTINGS_CLEANUP() removes the panel and that key.
 *
 * PREREQUISITE (one paste, once per page load)
 *   Paste src/engine/tseEngine.browser.v1.js first. It now defines
 *   window.TseBEngine / TseModels / TseLookup / TseFunnelSettings.
 *
 * RUN HERE (always): old.tsetmc.com/Loader.aspx?ParTree=15131F  ->  Console (F12)
 *   tag: [کنسول] — paste the bundle, then this file, then WAIT ~3 seconds.
 *   A panel appears bottom-left. Every change logs a PROBE_JSON line; send the first one.
 *
 * SPDX-License-Identifier: Smart-FFA-1.1
 */
(function aSettingsPanel() {
  'use strict';

  var out = {
    meta: {
      test: 'A-SETTINGS-PANEL-v1', gate: 'G-29', evidenceId: 'E-070',
      host: (typeof location !== 'undefined') ? location.host : 'unknown',
      parTree: '15131F', capturedAt: new Date().toISOString(),
      method: 'the repo settings layer (src/ux/funnelSettings) exposes all 16 funnel variables; this probe builds a control for each from the schema, recomputes the engine over mw.AllRows on every change and reports the delta against the shipped defaults'
    },
    preflight: {}, recon: {}, settings: {}, measurement: {}, panel: {},
    errors: [], status: 'unknown', verdict: ''
  };

  var mw = (typeof window !== 'undefined') ? window.mw : null;
  var ENG = (typeof window !== 'undefined') ? window.TseBEngine : null;
  var MODELS = (typeof window !== 'undefined') ? window.TseModels : null;
  var UX = (typeof window !== 'undefined') ? window.TseFunnelSettings : null;
  var HAS_DOC = (typeof document !== 'undefined' && document && document.createElement);

  function say(o) { console.log('PROBE_JSON ' + JSON.stringify(o)); }
  function bump(h, k) {
    if (k === undefined || k === null || k === '') k = '(none)';
    h[k] = (h[k] || 0) + 1;
  }
  function nowMs() {
    return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  }

  out.preflight = {
    bundle: { engine: !!ENG, models: !!MODELS, lookup: !!(typeof window !== 'undefined' && window.TseLookup), settings: !!UX },
    engineVersion: ENG ? ENG.VERSION : null,
    settingsVersion: UX ? UX.VERSION : null,
    hasDocument: HAS_DOC
  };
  if (!ENG || !MODELS || !UX) {
    out.status = 'needs-bundle';
    out.verdict = 'window.TseBEngine/TseModels/TseFunnelSettings are not on this page - paste src/engine/tseEngine.browser.v1.js in the console first (it now includes the settings layer), then run this probe again. Nothing was changed.';
    say(out);
    console.log('A-SETTINGS-PANEL: ' + out.verdict);
    return;
  }

  // ---------- the population, parsed once ----------
  var rowsArr = [], codes = [], parsed = [];
  var settings = (mw && mw.AllRows) ? Object.keys(mw.AllRows) : [];

  function loadPopulation() {
    rowsArr = []; codes = []; parsed = [];
    var keys = Object.keys(mw.AllRows || {});
    for (var i = 0; i < keys.length; i++) {
      var row = mw.AllRows[keys[i]];
      rowsArr.push(row);
      codes.push(keys[i]);
      parsed.push(MODELS.optionParser.parseOptionLabel(row));
    }
    return keys.length;
  }

  // ---------- one measurement: settings -> engine -> verdicts ----------
  function measure(settingsObj) {
    var t0 = nowMs();
    var cfg = UX.toFunnelConfig(settingsObj);
    var engine = ENG.createBEngine({
      models: {
        parseOptionLabel: MODELS.optionParser.parseOptionLabel,
        impliedVol: MODELS.greeks.impliedVol,
        bsGreeks: MODELS.greeks.bsGreeks
      },
      funnelConfig: cfg
    });
    engine.buildIndex(rowsArr);
    var verdicts = [], ivs = [];
    var judged = 0, kept = 0, hidden = 0, failOpen = 0, errors = 0;
    var failOpenReason = {}, hiddenByIvStatus = {}, ivStatus = {};
    for (var i = 0; i < rowsArr.length; i++) {
      var res;
      try { res = engine.computeFunnel(rowsArr[i], parsed[i]); }
      catch (e) { res = { status: 'error', reason: String((e && e.message) || e) }; }
      if (res.status === 'error') { verdicts.push('error'); errors++; bump(failOpenReason, res.reason); continue; }
      if (res.status !== 'ok') { verdicts.push('failOpen'); failOpen++; bump(failOpenReason, res.reason); continue; }
      judged++;
      bump(ivStatus, res.ivStatus);
      if (typeof res.iv === 'number' && isFinite(res.iv)) ivs.push(res.iv);
      if (res.pass) { verdicts.push('keep'); kept++; }
      else { verdicts.push('hide'); hidden++; bump(hiddenByIvStatus, res.ivStatus || res.reason); }
    }
    ivs.sort(function (a, b) { return a - b; });
    function pct(p) { return ivs.length ? ivs[Math.floor(p * (ivs.length - 1))] : null; }
    return {
      config: cfg, verdicts: verdicts,
      rows: rowsArr.length, judged: judged, kept: kept, hidden: hidden, failOpen: failOpen, errors: errors,
      failOpenReason: failOpenReason, hiddenByIvStatus: hiddenByIvStatus, ivStatus: ivStatus,
      ivStats: ivs.length ? { n: ivs.length, min: ivs[0], p50: pct(0.5), p90: pct(0.9), max: ivs[ivs.length - 1] } : null,
      elapsedMs: Math.round((nowMs() - t0) * 100) / 100
    };
  }

  function deltaVs(base, cur) {
    var newlyJudged = 0, newlyHidden = 0, newlyKept = 0, lostFromKept = 0, lostFromJudged = 0;
    var newlyHiddenSample = [], newlyJudgedSample = [];
    for (var i = 0; i < base.verdicts.length; i++) {
      var b = base.verdicts[i], x = cur.verdicts[i];
      if (b === 'failOpen' && x !== 'failOpen' && x !== 'error') newlyJudged++;
      if (x === 'hide' && b !== 'hide') { newlyHidden++; if (newlyHiddenSample.length < 5) newlyHiddenSample.push(rowDigest(i, cur)); }
      if (x === 'keep' && b !== 'keep') newlyKept++;
      if (b === 'keep' && x !== 'keep') lostFromKept++;
      if (b !== 'failOpen' && b !== 'error' && x === 'failOpen') lostFromJudged++;
    }
    return {
      judged: cur.judged - base.judged, kept: cur.kept - base.kept, hidden: cur.hidden - base.hidden,
      failOpen: cur.failOpen - base.failOpen,
      newlyJudged: newlyJudged, newlyHidden: newlyHidden, newlyKept: newlyKept,
      lostFromKept: lostFromKept, lostFromJudged: lostFromJudged,
      identityHolds: (cur.judged === base.judged + newlyJudged - lostFromJudged),
      newlyHiddenSample: newlyHiddenSample, newlyJudgedSample: newlyJudgedSample
    };
  }

  function rowDigest(i, m) {
    var row = rowsArr[i] || {};
    return {
      inscode: codes[i], label: (row.l30 === undefined ? null : String(row.l30).slice(0, 46)),
      verdict: m.verdicts[i]
    };
  }

  // ---------- settings report ----------
  function settingsReport(settingsObj, source, loadWarnings) {
    var norm = UX.normalizeSettings(settingsObj);
    var d = UX.describe(norm.settings);
    var fields = UX.SCHEMA.map(function (f) {
      var v = norm.settings[f.key];
      var disp = v;
      if (f.type === 'number' && f.displayScale) disp = Math.round(v * f.displayScale * 100) / 100;
      return {
        key: f.key, label: f.label, type: f.type, help: f.help,
        value: v, display: disp, displayUnit: f.displayUnit || null, displayScale: f.displayScale || null,
        min: f.min, max: f.max, step: f.step, choices: f.choices || null,
        default: UX.DEFAULTS[f.key], changed: (v !== UX.DEFAULTS[f.key])
      };
    });
    return {
      source: source, version: UX.VERSION, storageKey: UX.STORAGE_KEY,
      hash: d.hash, summary: d.summary, changed: d.changed, changedCount: d.changedCount, isDefault: d.isDefault,
      warnings: norm.warnings, loadWarnings: loadWarnings || [], fields: fields,
      presets: Object.keys(UX.PRESETS).map(function (n) { return { name: n, label: UX.PRESETS[n].label }; })
    };
  }

  // ---------- state ----------
  var loaded = UX.load((typeof localStorage !== 'undefined') ? localStorage : null);
  var current = loaded.settings;
  var base = null, cur = null;

  try {
    var n = loadPopulation();
    out.recon = {
      filterNo: (mw.Settings && mw.Settings.FilterNo !== undefined) ? mw.Settings.FilterNo : null,
      roundNo: (mw && mw.RoundNo !== undefined) ? mw.RoundNo : null,
      rowCount: n,
      settingsSource: loaded.source,
      settingsWarningsOnLoad: loaded.warnings.length
    };

    base = measure(UX.DEFAULTS);
    cur = measure(current);
    var delta = deltaVs(base, cur);

    out.settings = settingsReport(current, loaded.source, loaded.warnings);
    out.measurement = {
      config: cur.config,
      rows: cur.rows, judged: cur.judged, kept: cur.kept, hidden: cur.hidden,
      failOpen: cur.failOpen, errors: cur.errors,
      ivStatus: cur.ivStatus, hiddenByIvStatus: cur.hiddenByIvStatus, failOpenReason: cur.failOpenReason,
      ivStats: cur.ivStats, elapsedMs: cur.elapsedMs,
      baseline: { judged: base.judged, kept: base.kept, hidden: base.hidden, failOpen: base.failOpen, elapsedMs: base.elapsedMs },
      deltaVsDefaults: delta
    };

    // ---------- the panel ----------
    if (HAS_DOC) { out.panel = buildPanel(); }
    else { out.panel = { built: false, reason: 'no document (headless run: the measurement above is the whole probe)' }; }

    // ---------- verdict ----------
    out.sanity = {
      rows: n,
      perVariantConsistent: (cur.judged + cur.failOpen + cur.errors === n) && (cur.kept + cur.hidden === cur.judged),
      identityHolds: delta.identityHolds,
      baselinePlausible: (base.judged >= 20 && base.judged / n >= 0.05),
      judgedRatio: Math.round((10000 * base.judged) / n) / 100
    };

    var parts = [];
    parts.push('all ' + UX.SCHEMA.length + ' funnel variables are exposed and changeable (source: ' + loaded.source + ', hash ' + out.settings.hash + ').');
    parts.push('shipped defaults judge ' + base.judged + ' of ' + n + ' rows (' + out.sanity.judgedRatio + '%): ' +
      base.kept + ' kept, ' + base.hidden + ' hidden, ' + base.failOpen + ' fail-open.');
    if (loaded.source === 'storage' && out.settings.changedCount > 0) {
      parts.push('the stored settings differ in ' + out.settings.changedCount + ' variable(s) (' +
        out.settings.changed.map(function (c) { return c.label + ': ' + c.from + ' -> ' + c.to; }).join(', ') +
        '), which now judges ' + cur.judged + ' rows: ' + cur.kept + ' kept, ' + cur.hidden + ' hidden' +
        ' (delta vs defaults: ' + (delta.judged >= 0 ? '+' : '') + delta.judged + ' judged, ' +
        (delta.hidden >= 0 ? '+' : '') + delta.hidden + ' hidden).');
    } else {
      parts.push('no stored settings yet (or they equal the defaults), so the live measurement is the shipped config: ' +
        cur.kept + ' kept, ' + cur.hidden + ' hidden, ' + cur.failOpen + ' fail-open.');
    }

    if (out.settings.loadWarnings.length) {
      parts.push('هشدار بارگذاری ذخیره: ' + out.settings.loadWarnings.map(function (w) {
        return w.reason + (w.key ? ' (' + w.key + ')' : '') + (w.error ? ' ' + w.error : '');
      }).join(' | '));
    }

    if (!out.sanity.perVariantConsistent) {
      out.status = 'inconsistent';
      parts.unshift('INTERNAL INCONSISTENCY:');
    } else if (!out.sanity.identityHolds) {
      out.status = 'identity-broken';
      parts.unshift('IDENTITY BROKEN:');
    } else if (!out.sanity.baselinePlausible) {
      out.status = 'suspicious-baseline';
      parts.unshift('SUSPICIOUS BASELINE (the shipped defaults judge ' + base.judged + ' of ' + n + '):');
    } else if (out.panel.built) {
      out.status = 'panel-live';
    } else {
      out.status = 'settings-live';
    }
    out.verdict = parts.join(' ');

    console.log('A-SETTINGS-PANEL: ' + out.verdict);
    console.log('  variables=' + UX.SCHEMA.length + ' source=' + loaded.source + ' hash=' + out.settings.hash + ' changed=' + out.settings.changedCount);
    console.log('  shipped: judged=' + base.judged + ' kept=' + base.kept + ' hidden=' + base.hidden + ' failOpen=' + base.failOpen + ' elapsedMs=' + base.elapsedMs);
    console.log('  current: judged=' + cur.judged + ' kept=' + cur.kept + ' hidden=' + cur.hidden + ' failOpen=' + cur.failOpen + ' elapsedMs=' + cur.elapsedMs);
    say(out);
  } catch (e) {
    out.errors.push(String((e && e.message) || e));
    out.status = 'error';
    say(out);
    console.log('A-SETTINGS-PANEL error: ' + String((e && e.message) || e));
  }

  // =====================================================================
  // the panel itself (only when there is a document)
  // =====================================================================
  function buildPanel() {
    var host = document.getElementById('tseFunnelSettingsPanel');
    if (host) { host.parentNode.removeChild(host); }
    host = document.createElement('div');
    host.id = 'tseFunnelSettingsPanel';
    host.dir = 'rtl';
    host.setAttribute('style', [
      'position:fixed', 'bottom:14px', 'left:14px', 'z-index:999999',
      'width:430px', 'max-height:82vh', 'overflow:auto',
      'background:#0f1a3af7', 'color:#e8ecff', 'border:1px solid #33406e',
      'border-radius:14px', 'box-shadow:0 12px 40px #00000066',
      'font:12px/1.7 Vazirmatn,Tahoma,system-ui,sans-serif',
      'direction:rtl', 'text-align:right', 'padding:10px 12px'
    ].join(';'));

    var head = document.createElement('div');
    head.setAttribute('style', 'display:flex;align-items:center;gap:8px;margin-bottom:6px');
    var title = document.createElement('b');
    title.textContent = 'تنظیمات فیلتر — همهٔ ' + UX.SCHEMA.length + ' متغیر';
    var close = document.createElement('button');
    close.textContent = '×';
    close.setAttribute('style', 'margin-inline-start:auto;background:#1a254f;color:#e8ecff;border:1px solid #33406e;border-radius:8px;cursor:pointer;width:26px;height:26px');
    close.onclick = function () { host.style.display = 'none'; };
    head.appendChild(title); head.appendChild(close);
    host.appendChild(head);

    var state = document.createElement('div');
    state.setAttribute('style', 'font-size:11px;color:#9fb0e0;margin-bottom:8px');
    host.appendChild(state);

    var presets = document.createElement('div');
    presets.setAttribute('style', 'display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px');
    Object.keys(UX.PRESETS).forEach(function (name) {
      var b = document.createElement('button');
      b.textContent = UX.PRESETS[name].label;
      b.setAttribute('style', 'background:#1a254f;color:#e8ecff;border:1px solid #33406e;border-radius:8px;padding:4px 8px;cursor:pointer;font-size:11px');
      b.onclick = function () {
        var r = UX.applyPreset(current, name);
        current = r.settings; refresh(r.warnings);
      };
      presets.appendChild(b);
    });
    host.appendChild(presets);

    var grid = document.createElement('div');
    grid.setAttribute('style', 'display:grid;grid-template-columns:1fr 118px;gap:4px 8px;align-items:center');
    host.appendChild(grid);

    var inputs = {};
    UX.SCHEMA.forEach(function (f) {
      var lab = document.createElement('label');
      lab.textContent = f.label;
      lab.title = f.help;
      lab.setAttribute('style', 'font-size:11px');
      grid.appendChild(lab);

      var el;
      if (f.type === 'bool') {
        el = document.createElement('input');
        el.type = 'checkbox';
        el.checked = !!current[f.key];
        el.setAttribute('style', 'width:18px;height:18px;justify-self:start');
        el.onchange = function () { setValue(f, el.checked); };
      } else if (f.type === 'enum') {
        el = document.createElement('select');
        el.setAttribute('style', 'width:100%;background:#0b1330;color:#e8ecff;border:1px solid #33406e;border-radius:6px;padding:2px 4px;font-size:11px');
        f.choices.forEach(function (c) {
          var o = document.createElement('option');
          o.value = c; o.textContent = c;
          el.appendChild(o);
        });
        el.value = current[f.key];
        el.onchange = function () { setValue(f, el.value); };
      } else {
        el = document.createElement('input');
        el.type = 'number';
        el.setAttribute('style', 'width:100%;background:#0b1330;color:#e8ecff;border:1px solid #33406e;border-radius:6px;padding:2px 4px;font-size:11px');
        el.min = String(f.displayScale ? (f.displayMin !== undefined ? f.displayMin : f.min * f.displayScale) : f.min);
        el.max = String(f.displayScale ? (f.displayMax !== undefined ? f.displayMax : f.max * f.displayScale) : f.max);
        el.step = String(f.displayScale ? (f.displayStep !== undefined ? f.displayStep : f.step * f.displayScale) : f.step);
        el.value = String(f.displayScale ? Math.round(current[f.key] * f.displayScale * 1000) / 1000 : current[f.key]);
        el.onchange = function () {
          var raw = el.value;
          var v = f.displayScale ? (parseFloat(raw) / f.displayScale) : raw;
          setValue(f, v);
        };
      }
      el.title = f.help;
      inputs[f.key] = el;
      grid.appendChild(el);
    });

    var foot = document.createElement('div');
    foot.setAttribute('style', 'margin-top:8px;display:flex;gap:6px;flex-wrap:wrap;align-items:center');
    var save = document.createElement('button');
    save.textContent = 'ذخیره';
    var reset = document.createElement('button');
    reset.textContent = 'پیش‌فرض';
    var clearStore = document.createElement('button');
    clearStore.textContent = 'پاک کردن ذخیره';
    [save, reset, clearStore].forEach(function (b) {
      b.setAttribute('style', 'background:#1a254f;color:#e8ecff;border:1px solid #33406e;border-radius:8px;padding:4px 10px;cursor:pointer;font-size:11px');
      foot.appendChild(b);
    });
    save.onclick = function () {
      var w = UX.save((typeof localStorage !== 'undefined') ? localStorage : null, null, current);
      paintState(w.ok ? 'ذخیره شد (' + w.bytes + ' بایت)' : 'ذخیره نشد: ' + (w.reason || w.error));
    };
    reset.onclick = function () { current = UX.normalizeSettings(null).settings; refresh([]); };
    clearStore.onclick = function () {
      try { if (typeof localStorage !== 'undefined') localStorage.removeItem(UX.STORAGE_KEY); } catch (e) { /* ignore */ }
      current = UX.normalizeSettings(null).settings; refresh([]);
      paintState('ذخیره پاک شد');
    };
    host.appendChild(foot);

    var results = document.createElement('div');
    results.setAttribute('style', 'margin-top:8px;border-top:1px solid #33406e;padding-top:6px;font-size:11px');
    host.appendChild(results);

    document.body.appendChild(host);

    function setValue(f, v) {
      var r = UX.applyChange(current, f.key, v);
      current = r.settings;
      refresh(r.warnings);
    }

    function paintState(msg) {
      var d = UX.describe(current);
      state.textContent = (msg ? msg + ' — ' : '') + 'تغییریافته: ' + d.changedCount + ' — hash ' + d.hash;
    }

    function refresh(warnings) {
      UX.SCHEMA.forEach(function (f) {
        var el = inputs[f.key];
        if (!el) return;
        if (f.type === 'bool') el.checked = !!current[f.key];
        else if (f.type === 'enum') el.value = current[f.key];
        else el.value = String(f.displayScale ? Math.round(current[f.key] * f.displayScale * 1000) / 1000 : current[f.key]);
      });
      var m = measure(current);
      var d = deltaVs(base, m);
      var w = (warnings && warnings.length) ? (' هشدار: ' + warnings.map(function (x) { return x.key + '=' + String(x.given) + ' -> ' + String(x.used); }).join(' | ')) : '';
      results.innerHTML = '';
      results.appendChild(line('پیکربندی فعلی: ' + m.judged + ' قضاوت، ' + m.kept + ' نگه‌داشته، ' + m.hidden + ' پنهان، ' + m.failOpen + ' دیده‌نشده — ' + m.elapsedMs + ' ms'));
      results.appendChild(line('نسبت به پیش‌فرض ارسال‌شده: ' + (d.judged >= 0 ? '+' : '') + d.judged + ' قضاوت، ' + (d.hidden >= 0 ? '+' : '') + d.hidden + ' پنهان، ' + (d.lostFromKept ? d.lostFromKept + ' از نگه‌داشته‌ها از دست رفت' : 'هیچ نگه‌داشته‌ای از دست نرفت')));
      if (d.newlyHidden) results.appendChild(line('پنهان‌های تازه: ' + d.newlyHidden + ' → ' + d.newlyHiddenSample.map(function (s) { return s.label; }).slice(0, 3).join(' , ')));
      if (w) results.appendChild(line(w));
      paintState('');
      console.log('SETTINGS_JSON ' + JSON.stringify({
        settings: settingsReport(current, 'panel', []),
        measurement: {
          judged: m.judged, kept: m.kept, hidden: m.hidden, failOpen: m.failOpen,
          deltaVsDefaults: { judged: d.judged, hidden: d.hidden, newlyJudged: d.newlyJudged, newlyHidden: d.newlyHidden, lostFromKept: d.lostFromKept },
          identityHolds: d.identityHolds
        }
      }));
    }

    function line(t) {
      var d = document.createElement('div');
      d.textContent = t;
      return d;
    }

    refresh(loaded.warnings);

    window.__FUNNEL_SETTINGS_CLEANUP = function () {
      try {
        if (host && host.parentNode) host.parentNode.removeChild(host);
        if (typeof localStorage !== 'undefined') localStorage.removeItem(UX.STORAGE_KEY);
        delete window.__FUNNEL_SETTINGS_CLEANUP;
        return { removed: true };
      } catch (e) { return { removed: false, error: String((e && e.message) || e) }; }
    };

    return {
      built: true, nodeId: host.id, variables: UX.SCHEMA.length,
      presetButtons: Object.keys(UX.PRESETS).length,
      note: 'every change logs a SETTINGS_JSON line; __FUNNEL_SETTINGS_CLEANUP() removes the panel and the storage key'
    };
  }
})();
