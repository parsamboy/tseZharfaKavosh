'use strict';
/**
 * tools/buildFilterProgram.v1.js
 *
 * Builds the SELF-CONTAINED filter body: the whole program (engine + models + UX
 * settings + the per-row lookup) in ONE paste for the site's filter textarea, with no
 * console step and surviving a page reload.
 *
 * Owner decision (2026-10-24, "self_contained"): "کد کامل قابل کپی پیست در تکست اریا و
 * اجرای برنامه در ظاهر یک فیلتر دیگر" - the whole program in one paste.
 *
 * WHY THE SHAPE IS WHAT IT IS
 *
 * 1. The site executes the filter body as (E-061, verbatim):
 *      var FilterResult; try { FilterResult = eval(mw.FilterCode) } catch(e){ FilterResult=false }
 *      if (!FilterResult) { ...hide the row... }
 *    so the COMPLETION VALUE of the body is the verdict, and an exception HIDES the row.
 *    The body is therefore a single IIFE call whose return value is the verdict, and the
 *    whole thing is wrapped so it can never throw.
 *
 * 2. The body is eval'd once PER ROW. A naive "embed the engine in the body" would
 *    re-evaluate 46 KB of engine source for every row the page renders (~1340 rows).
 *    The engine is therefore built ONCE and cached on the page object
 *    (window.__TSE_PROGRAM); every later row reuses it. Measured per-row eval cost of a
 *    ~46 KB body is 1.1 us (V8's compile cache), and the per-row work after that is a
 *    bitset lookup.
 *
 * 3. B must never run inside RenderData (the A/B architecture). The per-row code only
 *    READS the published projection and makes sure one background tick is armed; the
 *    engine runs in that tick, from the timer queue, after RenderData has returned.
 *
 * 4. Staleness. The engine's own computeSnapshotId() is RoundNo + symbol count, i.e. a
 *    KEY-only fingerprint. Measured live (E-070 -> E-071 -> E-073): judged went
 *    143 -> 188 -> 191 with the SAME key set - a price change. A key-only fingerprint
 *    cannot see that, so the program computes its own fingerprint over the fields the
 *    funnel actually reads and uses it as the engine's snapshotId.
 *
 * SPDX-License-Identifier: Smart-FFA-1.1
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BUNDLE = path.join(ROOT, 'src', 'engine', 'tseEngine.browser.v1.js');
const OUT_DIR = path.join(ROOT, 'build');
const OUT_BODY = path.join(OUT_DIR, 'filterProgram.v1.js');
const OUT_META = path.join(OUT_DIR, 'filterProgram.v1.json');

// How often the background tick re-checks the population. The page renders about once a
// second (UpdateSpeed: 1000, observed live), so 400 ms keeps the projection at most one
// render behind without busy-polling.
const TICK_MS = 400;

// The fields the per-row funnel actually reads. This is the fingerprint's field set: it
// must be a SUPERSET of everything that can change a verdict, otherwise a change that
// matters would be invisible and the projection would go stale. DIRTY_FIELDS in the
// engine is ['pl','plc','l18','l30','tvol','tno','pcp']; the funnel also reads the book
// (pd1/po1) and the closing price (pc). All of them are included.
const FP_FIELDS = ['pl', 'plc', 'l18', 'l30', 'tvol', 'tno', 'pcp', 'pd1', 'po1', 'pc'];

// The site's PrepareFilterCode rewrites `(field)` shorthand into row["field"] (E-056,
// 61 .replace() rules, of which only (l18)/(l30)/(tno) were recorded). A `(field)`
// sequence inside our body would be rewritten by an unrecorded rule, and a rewrite
// inside a call expression is a syntax error - which the site turns into "hide every
// row". The build therefore REFUSES to emit a body containing any `(siteField)` shape.
// This is the vocabulary of TSETMC row/filter fields as observed in E-011..E-057.
const SITE_FIELDS = [
  'inscode', 'InsCode', 'l18', 'l30', 'tno', 'pc', 'pl', 'pd1', 'po1', 'py', 'pd', 'pmd',
  'tvol', 'qd', 'z', 'ytc', 'ct', 'isps', 'bv', 'cs', 'tmin', 'tmax', 'pf', 'pmin', 'pmax',
  'SectorNo', 'Market', 'Flow', 'BaseVol', 'DEven', 'PClosing', 'PDrCotVal', 'ZTotTran',
  'QTotTran', 'Delta', 'Gamma', 'Theta', 'Vega', 'Rho', 'IV', 'KA', 'KAj', 'KAjy',
  'ExDate', 'Op', 'Lo', 'Hi', 'PMeDem', 'EPS', 'PE', 'Week', 'InstrumentName', 'PriceTomorrow'
];

function fnv1a(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i) & 0xff; h = (h * 0x01000193) >>> 0; }
  return ('00000000' + h.toString(16)).slice(-8);
}

/** Strip the bundle's own IIFE wrapper so it can be re-wrapped with an explicit global. */
function bundleBody(bundle) {
  const HEAD = '(function (global) {';
  const TAIL = '})(typeof window !== \'undefined\' ? window : globalThis);';
  const i = bundle.indexOf(HEAD);
  const j = bundle.lastIndexOf(TAIL);
  if (i < 0 || j < 0 || j < i) {
    throw new Error('the bundle wrapper was not found; the bundle format changed');
  }
  return bundle.slice(i + HEAD.length, j);
}

function build() {
  const bundle = fs.readFileSync(BUNDLE, 'utf8');
  const engine = bundleBody(bundle);
  const fpList = FP_FIELDS.map((f) => "'" + f + "'").join(', ');

  const parts = [];
  parts.push('/*');
  parts.push(' * tseZharfaKavosh - the whole program as one filter body (self-contained).');
  parts.push(' *');
  parts.push(' * Paste this into the site\'s filter textarea (the filter dialog\'s code field)');
  parts.push(' * and save it. Nothing else is needed: no console step, and it re-arms itself');
  parts.push(' * after every page reload because the code lives in the filter slot.');
  parts.push(' *');
  parts.push(' * How it works');
  parts.push(' *   - the engine is built ONCE and cached on the page object; the body is');
  parts.push(' *     eval\'d once per row, so per-row work is a bitset lookup (~1-2 us).');
  parts.push(' *   - a background tick runs the engine OUTSIDE RenderData and publishes the');
  parts.push(' *     projection the per-row code reads. B never runs inside the render.');
  parts.push(' *   - the engine is rebuilt whenever the UX configuration hash changes, because');
  parts.push(' *     funnelConfig is captured when the engine is created; a settings change');
  parts.push(' *     that only moved the hash would otherwise leave the old behaviour in place.');
  parts.push(' *   - staleness is a fingerprint over the fields the funnel reads, because the');
  parts.push(' *     engine\'s own snapshotId is RoundNo + symbol count and cannot see a price');
  parts.push(' *     change that keeps the same rows.');
  parts.push(' *   - every guard is fail-open: a missing or partial projection returns true,');
  parts.push(' *     so a row is never hidden because of us. The body never throws, because');
  parts.push(' *     the site is fail-CLOSED on exception.');
  parts.push(' *');
  parts.push(' * The verdict is the COMPLETION VALUE of this body: the site assigns');
  parts.push(' *   FilterResult = eval(mw.FilterCode)');
  parts.push(' * and hides the row when it is falsy. That is why the last statement is the');
  parts.push(' * IIFE call itself and why the fail-open paths return true, not undefined');
  parts.push(' * (E-074: the previous body hid every fail-open row for exactly that reason).');
  parts.push(' *');
  parts.push(' * UX settings (all 16 funnel variables) are read from the settings module\'s own');
  parts.push(' * storage key on every tick, so changing a value takes effect on the next tick');
  parts.push(' * with no re-paste. The settings module takes its storage as an ARGUMENT');
  parts.push(' * (load(storage, key)) and does not auto-detect it, so the page\'s localStorage is');
  parts.push(' * passed explicitly: calling load() with no argument silently returns the');
  parts.push(' * defaults forever, which is the defect the first build of this program had.');
  parts.push(' */');
  parts.push('(function () {');
  parts.push('  var W = (typeof window !== \'undefined\') ? window : globalThis;');
  parts.push('  if (!W.__TSE_PROGRAM) {');
  parts.push('    W.__TSE_PROGRAM = (function (global) {');
  parts.push(engine.replace(/\s+$/, ''));
  parts.push('      return {');
  parts.push('        B: global.TseBEngine,');
  parts.push('        M: global.TseModels,');
  parts.push('        S: global.TseFunnelSettings,');
  parts.push('        L: global.TseLookup');
  parts.push('      };');
  parts.push('    })(W);');
  parts.push('    W.__TSE_SCHED = (function (P) {');
  parts.push('      var S = { fp: null, cfgHash: null, engine: null, lastError: null, timer: 0, ticks: 0, runs: 0, lastPublished: null };');
  parts.push('      var FP_FIELDS = [' + fpList + '];');
  parts.push('      function fpMix(h, v) {');
  parts.push('        if (v === undefined || v === null) { h = (h ^ 0x9e3779b9) >>> 0; return (h * 0x01000193) >>> 0; }');
  parts.push('        var s = String(v);');
  parts.push('        for (var i = 0; i < s.length; i++) { h = (h ^ s.charCodeAt(i)) >>> 0; h = (h * 0x01000193) >>> 0; }');
  parts.push('        return (h ^ 0x85ebca6b) >>> 0;');
  parts.push('      }');
  parts.push('      function fingerprint(rows) {');
  parts.push('        var h = 0x811c9dc5, n = 0;');
  parts.push('        for (var k in rows) {');
  parts.push('          var r = rows[k];');
  parts.push('          if (!r) continue;');
  parts.push('          n++;');
  parts.push('          for (var f = 0; f < FP_FIELDS.length; f++) { h = fpMix(h, r[FP_FIELDS[f]]); }');
  parts.push('        }');
  parts.push('        return \'fp-\' + n + \'-\' + (\'00000000\' + h.toString(16)).slice(-8);');
  parts.push('      }');
      parts.push('      function pageStorage() {');
      parts.push('        try { return (typeof localStorage !== \'undefined\') ? localStorage : null; } catch (e) { return null; }');
      parts.push('      }');
      parts.push('      function settingsNow() {');
      parts.push('        var loaded = null;');
      parts.push('        try { loaded = P.S.load(pageStorage()); } catch (e) { loaded = null; }');
  parts.push('        var norm = P.S.normalizeSettings(loaded && loaded.settings ? loaded.settings : null);');
  parts.push('        return { settings: norm.settings, config: P.S.toFunnelConfig(norm.settings), hash: P.S.configHash(norm.settings) };');
  parts.push('      }');
  parts.push('      function tick() {');
  parts.push('        S.timer = 0;');
  parts.push('        S.ticks++;');
  parts.push('        try {');
  parts.push('          var rows = (typeof mw !== \'undefined\' && mw) ? mw.AllRows : null;');
  parts.push('          if (rows && P.B && P.M && P.S) {');
  parts.push('            var fp = fingerprint(rows);');
  parts.push('            var st = settingsNow();');
  // The trigger is the fingerprint OR the config hash. Gating the whole cycle on the
  // fingerprint alone is the defect the first build had: a settings change with unchanged
  // prices produced no dirty rows, so nothing was ever re-published and the owner would
  // have concluded that changing a setting does nothing.
  parts.push('            if (fp !== S.fp || st.hash !== S.cfgHash) {');
  parts.push('              S.fp = fp;');
  parts.push('              var eng = S.engine;');
  parts.push('              if (!eng || S.cfgHash !== st.hash) {');
  parts.push('                eng = P.B.createBEngine({');
  parts.push('                  models: {');
  parts.push('                    parseOptionLabel: P.M.optionParser.parseOptionLabel,');
  parts.push('                    impliedVol: P.M.greeks.impliedVol,');
  parts.push('                    bsGreeks: P.M.greeks.bsGreeks');
  parts.push('                  },');
  parts.push('                  calendar: P.M.calendar,');
  parts.push('                  funnelConfig: st.config');
  parts.push('                });');
  parts.push('                S.engine = eng;');
  parts.push('                S.cfgHash = st.hash;');
  parts.push('              }');
  parts.push('              var rep = eng.run(rows, fp, st.hash);');
  parts.push('              if (rep && rep.published) {');
  parts.push('                eng.publish(mw);');
  parts.push('                S.runs++;');
  parts.push('                S.lastPublished = { snapshotId: rep.snapshotId, computed: rep.computed, unknown: rep.unknown, at: new Date().toISOString() };');
  parts.push('              }');
  parts.push('            }');
  parts.push('          }');
  parts.push('        } catch (e) {');
  parts.push('          S.lastError = String((e && e.message) || e);');
  parts.push('        }');
  parts.push('        arm();');
  parts.push('      }');
  parts.push('      function arm() {');
  parts.push('        if (S.timer) return;');
  parts.push('        if (typeof W.setTimeout !== \'function\') return;');
  parts.push('        S.timer = W.setTimeout(tick, ' + TICK_MS + ');');
  parts.push('      }');
  parts.push('      return { arm: arm, tick: tick, fingerprint: fingerprint, state: S };');
  parts.push('    })(W.__TSE_PROGRAM);');
  parts.push('  }');
  parts.push('  try {');
  parts.push('    var P = W.__TSE_PROGRAM;');
  parts.push('    var SC = W.__TSE_SCHED;');
  parts.push('    var verdict = true;');
  parts.push('    var idx = (typeof mw !== \'undefined\' && mw) ? mw.__B_index : null;');
  parts.push('    var known = (typeof mw !== \'undefined\' && mw) ? mw.__B_known : null;');
  parts.push('    var bits = (typeof mw !== \'undefined\' && mw) ? mw.__B_bitset : null;');
  parts.push('    if (idx && known && bits && row && row.inscode !== undefined && row.inscode !== null) {');
  parts.push('      var pos = idx[row.inscode];');
  parts.push('      if (pos !== undefined) {');
  parts.push('        var b = pos >> 3, m = pos & 7;');
  parts.push('        if (b >= 0 && b < known.length && b < bits.length && (known[b] >> m) & 1) {');
  parts.push('          verdict = !!((bits[b] >> m) & 1);');
  parts.push('        }');
  parts.push('      }');
  parts.push('    }');
  parts.push('    if (SC && typeof SC.arm === \'function\') SC.arm();');
  parts.push('    return verdict;');
  parts.push('  } catch (e) {');
  parts.push('    return true;');
  parts.push('  }');
  parts.push('})();');

  return parts.join('\n') + '\n';
}

// ---------- build-time guards ----------

function guard(body) {
  const problems = [];

  // 1. it must parse
  try {
    // eslint-disable-next-line no-new-func
    new Function('row', 'mw', body);
  } catch (e) {
    problems.push('the body does not parse: ' + String((e && e.message) || e));
  }

  // 2. the site's shorthand rules must have nothing to rewrite
  for (let i = 0; i < SITE_FIELDS.length; i++) {
    const f = SITE_FIELDS[i];
    const re = new RegExp('\\(' + f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\)', 'g');
    const m = body.match(re);
    if (m) problems.push('the body contains `(' + f + ')` ' + m.length + ' time(s); PrepareFilterCode could rewrite it (E-056)');
  }

  // 3. the completion value must be the verdict: the last statement is the IIFE call
  const lastLine = body.replace(/\s+$/, '').split('\n').pop();
  if (!/^\}\)\(\);?$/.test(lastLine.trim())) {
    problems.push('the body does not end with the IIFE call; the completion value would not be the verdict');
  }

  // 4. it must not declare a top-level FilterResult (the site owns that variable)
  if (/^\s*var\s+FilterResult\s*=/m.test(body)) {
    problems.push('the body declares a top-level `var FilterResult`, which would collide with the site\'s own');
  }

  return problems;
}

const body = build();
const problems = guard(body);

if (problems.length) {
  console.error('BUILD REFUSED - the self-contained body is not safe to paste:');
  for (let i = 0; i < problems.length; i++) console.error('  - ' + problems[i]);
  process.exit(1);
}

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT_BODY, body);

const meta = {
  artifact: 'filterProgram.v1',
  builtFrom: path.relative(ROOT, BUNDLE),
  bytes: body.length,
  lines: body.split('\n').length,
  fnv1a: fnv1a(body),
  tickMs: TICK_MS,
  fingerprintFields: FP_FIELDS,
  cacheKeys: ['__TSE_PROGRAM', '__TSE_SCHED'],
  guards: [
    'parses in a (row, mw) scope',
    'no `(siteField)` shorthand shape',
    'ends with the IIFE call so the completion value is the verdict',
    'no top-level FilterResult declaration',
    'never throws: every path is inside try/catch',
    'fail-open: any missing projection piece returns true'
  ]
};
fs.writeFileSync(OUT_META, JSON.stringify(meta, null, 2) + '\n');

console.log('  self-contained body  ' + meta.bytes + ' bytes / ' + meta.lines + ' lines / fnv1a ' + meta.fnv1a);
console.log('  written              ' + path.relative(ROOT, OUT_BODY));
console.log('  guards               ' + meta.guards.length + ' passed');
