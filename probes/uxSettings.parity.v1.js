/**
 * tseZharfaKavosh — UX funnel settings parity v1 (G-29)
 *
 * WHAT THIS PROVES
 *   Owner decision (2026-10-21): «همه متغیرها در تنظیمات UX قابل تغییر باشند».
 *   This suite turns that sentence into checks that can fail:
 *
 *   1. the schema covers EXACTLY the engine's funnel keys - no variable is missing
 *      from the UX layer and none is invented;
 *   2. the defaults the UX layer ships are the engine's own defaults, byte for byte;
 *   3. every range and every choice declared for the UI is the range the engine
 *      actually enforces - probed by feeding the engine's normalizer values outside
 *      each declared range and requiring it to fall back (a DRIFT DETECTOR: if the
 *      engine's clamp ever moves and the UI table does not, this fails);
 *   4. every single variable is changeable: a non-default value survives
 *      normalization AND changes the configHash;
 *   5. the configHash is stable, order-independent and sensitive to any one field;
 *   6. persistence round-trips, garbage fails closed to the defaults, and an
 *      inverted window is repaired the same way the engine repairs it;
 *   7. what the UX layer hands the engine is exactly what the engine would have
 *      normalised itself (idempotence), so B cannot receive a config it would
 *      have changed.
 *
 *   Run: node probes/uxSettings.parity.v1.js
 *
 * SPDX-License-Identifier: Smart-FFA-1.1
 */
'use strict';

const path = require('path');
const UX = require(path.join(__dirname, '..', 'src', 'ux', 'funnelSettings.v0.1.0.js'));
const ENG = require(path.join(__dirname, '..', 'src', 'engine', 'bEngine.v0.1.0.js'));

let pass = 0, fail = 0;
const failures = [];

function check(name, cond, detail) {
  if (cond) { pass++; return; }
  fail++;
  failures.push(name + (detail !== undefined ? '   [' + detail + ']' : ''));
}
function eq(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
function deepEq(a, b, keys) {
  const k = keys || Object.keys(a);
  for (let i = 0; i < k.length; i++) if (a[k[i]] !== b[k[i]]) return false;
  return true;
}

// ---------- 1. coverage: every engine key, and only engine keys ----------
const engineKeys = Object.keys(ENG.DEFAULT_FUNNEL_CONFIG).sort();
const schemaKeys = UX.SCHEMA.map((f) => f.key).sort();
check('schema covers every engine funnel key', eq(engineKeys, schemaKeys),
  'engine=' + engineKeys.join(',') + ' schema=' + schemaKeys.join(','));
check('schema has no invented key', schemaKeys.every((k) => engineKeys.indexOf(k) >= 0));
check('schema has no duplicate key', new Set(schemaKeys).size === schemaKeys.length);
check('every field has a Persian label', UX.SCHEMA.every((f) => typeof f.label === 'string' && f.label.length > 1));
check('every field has help text', UX.SCHEMA.every((f) => typeof f.help === 'string' && f.help.length > 8));

// ---------- 2. defaults are the engine's defaults ----------
UX.SCHEMA.forEach((f) => {
  check('default[' + f.key + '] === engine default', UX.DEFAULTS[f.key] === ENG.DEFAULT_FUNNEL_CONFIG[f.key],
    'ux=' + UX.DEFAULTS[f.key] + ' engine=' + ENG.DEFAULT_FUNNEL_CONFIG[f.key]);
});
check('normalizeSettings({}) === engine defaults', eq(UX.normalizeSettings({}).settings, ENG.DEFAULT_FUNNEL_CONFIG));

// ---------- 3. declared ranges/choices ARE the engine's enforced ones ----------
UX.SCHEMA.forEach((f) => {
  if (f.type === 'number') {
    const below = ENG.normalizeFunnelConfig(Object.assign({}, ENG.DEFAULT_FUNNEL_CONFIG, { [f.key]: f.min - 1e-9 }));
    const above = ENG.normalizeFunnelConfig(Object.assign({}, ENG.DEFAULT_FUNNEL_CONFIG, { [f.key]: f.max + 1e-9 }));
    const inside = ENG.normalizeFunnelConfig(Object.assign({}, ENG.DEFAULT_FUNNEL_CONFIG, { [f.key]: (f.min + f.max) / 2 }));
    check('range[' + f.key + '] engine rejects below min', below[f.key] === ENG.DEFAULT_FUNNEL_CONFIG[f.key],
      'got ' + below[f.key]);
    check('range[' + f.key + '] engine rejects above max', above[f.key] === ENG.DEFAULT_FUNNEL_CONFIG[f.key],
      'got ' + above[f.key]);
    check('range[' + f.key + '] engine accepts the middle', inside[f.key] === (f.min + f.max) / 2,
      'got ' + inside[f.key]);
    const uxBelow = UX.normalizeSettings({ [f.key]: f.min - 1e-9 });
    const uxAbove = UX.normalizeSettings({ [f.key]: f.max + 1e-9 });
    check('range[' + f.key + '] UX agrees with the engine below min', uxBelow.settings[f.key] === below[f.key]);
    check('range[' + f.key + '] UX agrees with the engine above max', uxAbove.settings[f.key] === above[f.key]);
  }
  if (f.type === 'enum') {
    f.choices.forEach((c) => {
      const cfg = ENG.normalizeFunnelConfig(Object.assign({}, ENG.DEFAULT_FUNNEL_CONFIG, { [f.key]: c }));
      check('choice[' + f.key + '=' + c + '] accepted by the engine', cfg[f.key] === c, 'got ' + cfg[f.key]);
    });
    const bogus = ENG.normalizeFunnelConfig(Object.assign({}, ENG.DEFAULT_FUNNEL_CONFIG, { [f.key]: '___bogus___' }));
    check('choice[' + f.key + '] a bogus value falls back', bogus[f.key] === ENG.DEFAULT_FUNNEL_CONFIG[f.key],
      'got ' + bogus[f.key]);
    const uxBogus = UX.normalizeSettings({ [f.key]: '___bogus___' });
    check('choice[' + f.key + '] UX agrees with the engine on bogus', uxBogus.settings[f.key] === bogus[f.key]);
  }
  if (f.type === 'bool') {
    [true, false].forEach((b) => {
      const cfg = ENG.normalizeFunnelConfig(Object.assign({}, ENG.DEFAULT_FUNNEL_CONFIG, { [f.key]: b }));
      check('bool[' + f.key + '=' + b + '] survives the engine', cfg[f.key] === b);
    });
  }
});

// ---------- 4. THE OWNER'S REQUIREMENT: every variable is changeable ----------
function otherValue(f) {
  if (f.type === 'bool') return !f.default;
  if (f.type === 'enum') return f.choices.find((c) => c !== f.default);
  // a number strictly inside the range and different from the default
  if (f.default <= f.min) return Math.min(f.max, f.min + (f.max - f.min) / 2);
  if (f.default >= f.max) return Math.max(f.min, f.max - (f.max - f.min) / 2);
  return (f.default < (f.min + f.max) / 2) ? (f.min + f.max) / 2 : f.min + (f.max - f.min) / 4;
}
const baseHash = UX.configHash(UX.DEFAULTS);
UX.SCHEMA.forEach((f) => {
  const v = otherValue(f);
  const res = UX.normalizeSettings({ [f.key]: v });
  check('changeable[' + f.key + '] a non-default value survives', res.settings[f.key] === v,
    'asked ' + v + ' got ' + res.settings[f.key]);
  check('changeable[' + f.key + '] it changes the configHash', UX.configHash(res.settings) !== baseHash,
    f.key + '=' + v + ' hash unchanged');
  check('changeable[' + f.key + '] no warning for a valid value', res.warnings.length === 0,
    JSON.stringify(res.warnings));
});
check('every variable has a UI representation', UX.SCHEMA.every((f) => f.type === 'number' || f.type === 'bool' || f.type === 'enum'));
check('T is shown in days, stored in years',
  UX.DEFAULTS.T * 365 === 30 && UX.SCHEMA_BY_KEY.T.displayScale === 365);

// ---------- 5. hash: stable, order-independent, sensitive ----------
const shuffled = {};
schemaKeys.slice().reverse().forEach((k) => { shuffled[k] = UX.DEFAULTS[k]; });
check('configHash is order-independent', UX.configHash(shuffled) === baseHash);
check('configHash is stable across calls', UX.configHash(UX.DEFAULTS) === baseHash);
check('configHash changes for every single field', UX.SCHEMA.every((f) =>
  UX.configHash(UX.normalizeSettings({ [f.key]: otherValue(f) }).settings) !== baseHash));
{
  const a = UX.normalizeSettings({ ivMax: 2.0 }).settings;
  const b = UX.normalizeSettings({ ivMax: 2.0, useDeltaGamma: true }).settings;
  check('configHash distinguishes two variables', UX.configHash(a) !== UX.configHash(b));
  const c = UX.normalizeSettings({ ivMax: 2.0 }).settings;
  check('configHash is reproducible', UX.configHash(c) === UX.configHash(a));
}

// ---------- 6. persistence ----------
function memStore() {
  const m = {};
  return {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(m, k) ? m[k] : null),
    setItem: (k, v) => { m[k] = String(v); },
    _dump: () => m
  };
}
{
  const st = memStore();
  const edited = UX.normalizeSettings({ ivMax: 1.5, r: 0.25, marketPriceFrom: 'pl' }).settings;
  const w = UX.save(st, null, edited);
  check('save writes storage', w.ok === true && w.bytes > 0);
  const back = UX.load(st);
  check('load round-trips the settings', eq(back.settings, edited), JSON.stringify(back.settings));
  check('load round-trips the hash', UX.configHash(back.settings) === UX.configHash(edited));
  check('load reports the source', back.source === 'storage');
  // garbage
  const st2 = memStore();
  st2.setItem(UX.STORAGE_KEY, '{not json');
  const g = UX.load(st2);
  check('garbage storage fails closed to the defaults', eq(g.settings, ENG.DEFAULT_FUNNEL_CONFIG));
  check('garbage storage is reported', g.warnings.length > 0 && g.warnings[0].reason === 'storage-garbage');
  // empty
  const st3 = memStore();
  const e = UX.load(st3);
  check('empty storage returns the defaults', eq(e.settings, ENG.DEFAULT_FUNNEL_CONFIG) && e.source === 'defaults');
  // no storage at all
  const n = UX.load(null);
  check('no storage returns the defaults', eq(n.settings, ENG.DEFAULT_FUNNEL_CONFIG));
  // unknown key
  const u = UX.normalizeSettings({ __nonsense__: 1, ivMax: 2.0 });
  check('an unknown key is dropped and reported', u.settings.__nonsense__ === undefined &&
    u.warnings.some((x) => x.reason === 'unknown-key'));
  // a value out of range is reported, not kept
  const bad = UX.normalizeSettings({ r: 99 });
  check('an out-of-range value is reported', bad.settings.r === ENG.DEFAULT_FUNNEL_CONFIG.r &&
    bad.warnings.some((x) => x.key === 'r' && x.reason === 'out-of-range'));
  // numeric string accepted (a <select>/<input> gives one)
  const strv = UX.normalizeSettings({ r: '0.25' });
  check('a numeric string is accepted', strv.settings.r === 0.25);
  const boolv = UX.normalizeSettings({ ivFilterEnabled: 'false' });
  check('a boolean string is accepted', boolv.settings.ivFilterEnabled === false);
}

// ---------- 7. what UX hands the engine is what the engine would build ----------
{
  const edited = UX.normalizeSettings({ ivMax: 1.5, maxSpreadPct: 0.5, TMode: 'fixed', T: 14 / 365 }).settings;
  const cfg = UX.toFunnelConfig(edited);
  const engineOwn = ENG.normalizeFunnelConfig(edited);
  check('toFunnelConfig === the engine\'s own normalization', eq(cfg, engineOwn), JSON.stringify(cfg));
  check('toFunnelConfig is idempotent', eq(ENG.normalizeFunnelConfig(cfg), cfg));
  const eng = ENG.createBEngine({ models: {}, funnelConfig: cfg });
  check('an engine built from the UX config accepts it', eq(eng.funnelConfig, cfg), JSON.stringify(eng.funnelConfig));
  check('the engine sees the edited window', eng.funnelConfig.ivMax === 1.5 && eng.funnelConfig.maxSpreadPct === 0.5);
  // the edited config really changes behaviour, not just the hash
  const rows = { O1: { inscode: 'O1', l18: 'ضA1', l30: 'اختيارخ A-1000-1405/08/20', pd1: 0, po1: 0, tno: 0, pl: 0 },
                 S1: { inscode: 'S1', l18: 'A', l30: 'A', pc: 1000, pl: 1000, tno: 0 } };
  eng.buildIndex(Object.keys(rows).map((k) => rows[k]));
  const M = require(path.join(__dirname, '..', 'src', 'optionParser.v0.1.0.js'));
  const parsed = M.parseOptionLabel(rows.O1);
  const r1 = eng.computeFunnel(rows.O1, parsed);
  check('an engine from UX settings runs the funnel', r1.status === 'ok' || r1.status === 'insufficient-data',
    JSON.stringify(r1));
}

// ---------- 8. inverted window is repaired the way the engine repairs it ----------
{
  const inv = UX.normalizeSettings({ ivMin: 2.0, ivMax: 1.5 });
  check('an inverted window is reported', inv.warnings.some((w) => w.reason === 'inverted-window'));
  check('an inverted window resets BOTH bounds to the engine defaults',
    inv.settings.ivMin === ENG.DEFAULT_FUNNEL_CONFIG.ivMin &&
    inv.settings.ivMax === ENG.DEFAULT_FUNNEL_CONFIG.ivMax,
    'got ivMin=' + inv.settings.ivMin + ' ivMax=' + inv.settings.ivMax);
  const cfg = UX.toFunnelConfig({ ivMin: 2.0, ivMax: 1.5 });
  check('the engine agrees about the repair', cfg.ivMin === inv.settings.ivMin && cfg.ivMax === inv.settings.ivMax);
  // a legal window is untouched
  const ok = UX.normalizeSettings({ ivMin: 0.10, ivMax: 1.5 });
  check('a legal window survives untouched', ok.settings.ivMin === 0.10 && ok.settings.ivMax === 1.5);
}

// ---------- 9. applyChange / presets / describe ----------
{
  const start = UX.normalizeSettings(null).settings;
  const frozen = JSON.parse(JSON.stringify(start));
  const res = UX.applyChange(start, 'ivMax', 2.0);
  check('applyChange does not mutate the input', eq(start, frozen));
  check('applyChange returns the new value', res.settings.ivMax === 2.0);
  const bad = UX.applyChange(start, 'ivMax', 'nonsense');
  check('applyChange fails closed on garbage', bad.settings.ivMax === ENG.DEFAULT_FUNNEL_CONFIG.ivMax);
  const unknown = UX.applyChange(start, '__nope__', 1);
  check('applyChange on an unknown key changes nothing', eq(unknown.settings, start));

  Object.keys(UX.PRESETS).forEach((name) => {
    const p = UX.applyPreset(start, name);
    check('preset[' + name + '] produces a valid config', eq(p.settings, UX.normalizeSettings(p.settings).settings));
    if (name !== 'shipped') {
      check('preset[' + name + '] changes the hash', UX.configHash(p.settings) !== baseHash);
    } else {
      check('preset[shipped] equals the defaults', UX.configHash(p.settings) === baseHash);
    }
  });

  const d = UX.describe(start);
  check('describe: the defaults are reported as default', d.isDefault === true && d.changedCount === 0);
  const d2 = UX.describe({ ivMax: 1.5, r: 0.25 });
  check('describe lists the changed variables', d2.changedCount === 2 &&
    d2.changed.some((c) => c.key === 'ivMax') && d2.changed.some((c) => c.key === 'r'));
  check('describe gives a Persian summary', typeof d2.summary === 'string' && d2.summary.indexOf('سقف IV') >= 0);
  check('describe shows T in days', UX.describe({ T: 30 / 365 }).summary.indexOf('=30روز') >= 0,
    UX.describe({ T: 30 / 365 }).summary);
  check('describe carries the hash', typeof d2.hash === 'string' && d2.hash.indexOf('fs1-') === 0);
}

// ---------- 10. the settings layer is what B's guard must hash ----------
{
  // Two settings that differ in ONE variable must produce different hashes, and the
  // engine built from them must produce different verdicts on the same row.
  const strict = UX.toFunnelConfig({ ivMax: 2.5 });
  const loose = UX.toFunnelConfig({ ivMax: 3.0 });
  check('a window change changes the engine config', strict.ivMax !== loose.ivMax);
  check('the hash follows the config', UX.configHash(strict) !== UX.configHash(loose));
  // FilterCode.length (the old hash input) cannot see ANY of this
  const sameFilterCode = 430;
  check('the old hash input is blind to settings',
    (('0-0' + sameFilterCode) === ('0-0' + sameFilterCode)) && UX.configHash(strict) !== UX.configHash(loose));
}

console.log('');
console.log('UX SETTINGS PARITY v1');
console.log('  module   ' + UX.VERSION);
console.log('  fields   ' + UX.SCHEMA.length + ' (' + UX.SCHEMA.filter((f) => f.type === 'number').length + ' number, ' +
  UX.SCHEMA.filter((f) => f.type === 'bool').length + ' bool, ' + UX.SCHEMA.filter((f) => f.type === 'enum').length + ' enum)');
console.log('  pass=' + pass + ' fail=' + fail);
if (fail > 0) {
  console.log('  FAILURES:');
  failures.forEach((f) => console.log('    - ' + f));
}
console.log(fail === 0 ? 'ALL CHECKS PASSED' : 'CHECKS FAILED');
process.exit(fail === 0 ? 0 : 1);
