/**
 * tseZharfaKavosh — UX funnel settings v0.1.0 (G-29)
 *
 * WHY THIS EXISTS
 *   Owner decision (2026-10-21, answering G-29): «همه متغیرها در تنظیمات UX قابل
 *   تغییر باشند» — EVERY funnel variable must be changeable from the UX settings,
 *   not a handful of them. Until now the engine's DEFAULT_FUNNEL_CONFIG was the
 *   only thing a caller could pass, and the live probes all shipped the defaults,
 *   so the product decision about the IV window and the price guards could not be
 *   made by the owner at runtime - it had to be made by editing source and
 *   rebuilding the bundle.
 *
 *   This module is that layer: the schema of every variable, its Persian label and
 *   help, its UI range, persistence, presets, a configHash that changes when ANY
 *   variable changes, and a validation that never invents a value.
 *
 * THE ONE RULE
 *   The engine is the single source of truth for VALUES and RANGES. This module
 *   never hard-codes a clamp of its own: normalizeSettings() delegates to the
 *   engine's own normalizeFunnelConfig(), so a range can only exist in one place.
 *   The ranges declared here are for the UI (sliders), and
 *   probes/uxSettings.parity.v1.js proves they match the engine by probing it -
 *   if the engine's clamp ever moves and this table does not, the parity suite
 *   fails instead of the UI silently accepting an out-of-range value.
 *
 * PURE. No DOM, no network, no storage: storage is INJECTED, so the same code runs
 * in node (tests) and in the page (localStorage).
 *
 * SPDX-License-Identifier: Smart-FFA-1.1
 */
'use strict';

const ENG = require('./../engine/bEngine.v0.1.0.js');

const VERSION = '0.1.0-funnelSettings-001';
const STORAGE_KEY = 'tseFunnelSettings.v1';

/**
 * Every variable the engine's funnel config has, with what a human needs.
 *
 * `min`/`max`/`step` are UI ranges (sliders). `choices` are UI lists. `default`
 * must equal the engine's DEFAULT_FUNNEL_CONFIG value - the parity suite asserts it.
 * `displayScale` is presentation only: T is stored in years (what the model wants)
 * and shown in days (what a human reads); the UI multiplies/divides, the stored
 * value never changes.
 */
const SCHEMA = [
  { key: 'TMode', type: 'enum', choices: ['dte', 'fixed'], default: 'dte',
    label: 'حالت سررسید',
    help: 'dte = سررسید هرOption از تاریخ انقضای خودش (توصیه‌شده، E-051/E-052). fixed = یک T ثابت برای همه.' },
  { key: 'T', type: 'number', min: 0, max: 10, step: 1 / 365, default: 30 / 365,
    displayScale: 365, displayUnit: 'روز', displayMin: 0, displayMax: 3650, displayStep: 1,
    label: 'سررسید ثابت (روز)',
    help: 'فقط در حالت fixed استفاده می‌شود. ۳۰ روز مقدار پیش‌فرض.' },
  { key: 'r', type: 'number', min: 0, max: 5, step: 0.01, default: 0.30,
    label: 'نرخ بدون ریسک',
    help: 'سالانه. q4: قابل تغییر توسط کاربر؛ پیش‌فرض ۰.۳۰ از G-11.' },
  { key: 'ivMin', type: 'number', min: 0.01, max: 3.0, step: 0.01, default: 0.05,
    label: 'کف IV',
    help: 'زیر این مقدار IV رد می‌شود (زمان تقریباً صفر). محدود به بازهٔ حل‌کننده [0.01, 3.0].' },
  { key: 'ivMax', type: 'number', min: 0.01, max: 3.0, step: 0.05, default: 2.5,
    label: 'سقف IV',
    help: 'بالای این مقدار IV رد می‌شود. q7: 2.5 (نه 1.0 و نه 3.0).' },
  { key: 'deltaMin', type: 'number', min: 0, max: 1, step: 0.01, default: 0.3,
    label: 'کف |delta|',
    help: 'فقط وقتی «آستانهٔ delta/gamma» روشن است.' },
  { key: 'gammaMin', type: 'number', min: 0, max: 1, step: 0.0001, default: 1e-4,
    label: 'کف gamma',
    help: 'فقط وقتی «آستانهٔ delta/gamma» روشن است.' },
  { key: 'useDeltaGamma', type: 'bool', default: false,
    label: 'آستانهٔ delta/gamma',
    help: 'q5: خاموش. pass فقط IV داخل پنجره است.' },
  { key: 'ivFilterEnabled', type: 'bool', default: true,
    label: 'فیلتر IV فعال',
    help: 'خاموش = محاسبه و برچسب، ولی هیچ ردیفی پنهان نمی‌شود (مرجع تهی برای مقایسه).' },
  { key: 'marketPriceFrom', type: 'enum',
    choices: ['hybrid', 'pl', 'pc', 'plc', 'pcp', 'plp', 'pd1', 'bidAskMid'],
    default: 'hybrid',
    label: 'منبع قیمت بازار',
    help: 'hybrid (q8) = میانهٔ دفتر با گاردها، بعد pl وقتی امروز معامله شده، وگرنه هیچ. حالت‌های تک‌منبعی برای مقایسه‌اند.' },
  { key: 'underlyingFrom', type: 'enum', choices: ['underlyingMap', 'rowPl', 'none'],
    default: 'underlyingMap',
    label: 'منبع قیمت زیرمجموعه',
    help: 'underlyingMap = قیمت از ردیف سهام همان زیرمجموعه (G-11). rowPl = نگاشت v9. none = خاموش.' },
  { key: 'underlyingPriceField', type: 'enum', choices: ['pc', 'pl', 'pd1', 'po1', 'bidAskMid'],
    default: 'pc',
    label: 'فیلد قیمت زیرمجموعه',
    help: 'کدام فیلد ردیف سهام، قیمت S باشد.' },
  { key: 'legacyV9Mapping', type: 'bool', default: false,
    label: 'نگاشت v9 (برای مقایسه)',
    help: 'رفتار probe قدیمی v9 را بازتولید می‌کند تا دو مسیر قابل مقایسه باشند.' },
  { key: 'checkArbitrageBounds', type: 'bool', default: true,
    label: 'گارد باند بدون‌آربیتراژ',
    help: 'قیمتی بیرون از باند تئوری رد می‌شود. خاموش‌کردنش یعنی پذیرش قیمت‌های غیرممکن.' },
  { key: 'maxSpreadPct', type: 'number', min: 0, max: 1, step: 0.01, default: 0.20,
    displayUnit: '٪', displayScale: 100,
    label: 'حداکثر اسپرد دفتر',
    help: 'دفتری که اسپردش از این بیشتر باشد، میانه‌اش نویز است و رد می‌شود.' },
  { key: 'pinFailOpen', type: 'bool', default: true,
    label: 'pin دیده شود (q10)',
    help: 'ردیفی که هیچ راه‌حلی در بازهٔ حل‌کننده ندارد پنهان نمی‌شود؛ برچسب no-iv-solution می‌گیرد.' }
];

const SCHEMA_BY_KEY = {};
SCHEMA.forEach(function (f) { SCHEMA_BY_KEY[f.key] = f; });

/** The shipped defaults, read FROM the engine so the two cannot drift. */
const DEFAULTS = (function () {
  const d = ENG.DEFAULT_FUNNEL_CONFIG || {};
  const out = {};
  SCHEMA.forEach(function (f) { out[f.key] = d[f.key]; });
  return out;
})();

// ---------- small helpers ----------

function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    // h *= 16777619 with 32-bit wraparound
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return ('0000000' + h.toString(16)).slice(-8);
}

function isBoolish(v) { return v === true || v === false || v === 'true' || v === 'false' || v === '1' || v === '0' || v === 1 || v === 0; }

function coerceBool(v) {
  if (v === true || v === 'true' || v === 1 || v === '1') return true;
  if (v === false || v === 'false' || v === 0 || v === '0') return false;
  return null;
}

function inRange(n, min, max) { return typeof n === 'number' && isFinite(n) && n >= min && n <= max; }

/** One field, raw -> value. Returns {ok, value, reason}. Never invents a value. */
function coerceField(field, raw) {
  if (raw === undefined || raw === null || raw === '') {
    return { ok: false, value: field.default, reason: 'empty' };
  }
  if (field.type === 'bool') {
    if (!isBoolish(raw)) return { ok: false, value: field.default, reason: 'not-a-boolean' };
    const b = coerceBool(raw);
    if (b === null) return { ok: false, value: field.default, reason: 'not-a-boolean' };
    return { ok: true, value: b };
  }
  if (field.type === 'enum') {
    if (field.choices.indexOf(raw) < 0) {
      return { ok: false, value: field.default, reason: 'not-in-choices' };
    }
    return { ok: true, value: raw };
  }
  // number: accept a numeric string, because a <select>/<input type=text> gives one
  const n = (typeof raw === 'number') ? raw : parseFloat(String(raw).replace(/[,٬\s]/g, ''));
  if (!inRange(n, field.min, field.max)) {
    return { ok: false, value: field.default, reason: 'out-of-range' };
  }
  return { ok: true, value: n };
}

/**
 * Normalize a raw settings blob into a complete, valid settings object.
 *
 * Delegates the VALUES to the engine's own normalizer (see the one rule at the top)
 * and only adds warnings. Fail-CLOSED on garbage: a bad value becomes the default
 * and is reported, never silently kept and never "helpfully" guessed.
 *
 * @returns {{settings:object, warnings:object[], rawKeys:number}}
 */
function normalizeSettings(raw) {
  const r = (raw && typeof raw === 'object') ? raw : {};
  const warnings = [];
  const settings = {};
  const seen = {};

  SCHEMA.forEach(function (f) {
    const c = coerceField(f, r[f.key]);
    settings[f.key] = c.value;
    seen[f.key] = true;
    if (!c.ok && r[f.key] !== undefined) {
      warnings.push({ key: f.key, label: f.label, given: r[f.key], used: c.value, reason: c.reason });
    }
  });

  Object.keys(r).forEach(function (k) {
    if (!seen[k]) warnings.push({ key: k, given: r[k], used: undefined, reason: 'unknown-key' });
  });

  // The engine resets BOTH window bounds to its defaults when ivMin >= ivMax
  // (normalizeFunnelConfig). Mirror that here and say so, instead of letting the
  // UI show a window the engine will silently throw away.
  const rawMin = coerceField(SCHEMA_BY_KEY.ivMin, r.ivMin).value;
  const rawMax = coerceField(SCHEMA_BY_KEY.ivMax, r.ivMax).value;
  if (typeof rawMin === 'number' && typeof rawMax === 'number' && !(rawMin < rawMax)) {
    const d = ENG.DEFAULT_FUNNEL_CONFIG;
    settings.ivMin = d.ivMin;
    settings.ivMax = d.ivMax;
    warnings.push({
      key: 'ivMin/ivMax', label: 'پنجرهٔ IV',
      given: { ivMin: rawMin, ivMax: rawMax }, used: { ivMin: d.ivMin, ivMax: d.ivMax },
      reason: 'inverted-window'
    });
  }

  return { settings: settings, warnings: warnings };
}

/**
 * The object to hand the engine. This IS the engine's own normalizer, so the engine
 * cannot receive something it would have normalised differently.
 */
function toFunnelConfig(settings) {
  const s = normalizeSettings(settings).settings;
  return ENG.normalizeFunnelConfig(s);
}

/**
 * A stable hash of the EFFECTIVE config. Order-independent (fields are emitted in
 * schema order), and it changes when any single variable changes.
 *
 * This is what B's guard must use: by the A/B design the configHash is owned by UX,
 * and with every variable user-changeable a hash of FilterCode.length cannot see a
 * settings edit at all.
 */
function configHash(settings) {
  const s = normalizeSettings(settings).settings;
  const parts = SCHEMA.map(function (f) { return f.key + '=' + String(s[f.key]); });
  return 'fs1-' + fnv1a(parts.join('|'));
}

/** Immutable edit: returns a NEW settings object plus the warnings for that edit. */
function applyChange(settings, key, value) {
  const cur = normalizeSettings(settings).settings;
  const next = {};
  SCHEMA.forEach(function (f) { next[f.key] = cur[f.key]; });
  if (SCHEMA_BY_KEY[key]) next[key] = value;
  const res = normalizeSettings(next);
  return { settings: res.settings, warnings: res.warnings };
}

// ---------- persistence (storage is injected) ----------

function load(storage, key) {
  const k = key || STORAGE_KEY;
  if (!storage || typeof storage.getItem !== 'function') {
    return { settings: normalizeSettings(null).settings, warnings: [{ reason: 'no-storage' }], source: 'defaults' };
  }
  let rawTxt = null;
  try { rawTxt = storage.getItem(k); } catch (e) {
    return { settings: normalizeSettings(null).settings, warnings: [{ reason: 'storage-read-failed', error: String((e && e.message) || e) }], source: 'defaults' };
  }
  if (rawTxt === null || rawTxt === undefined || rawTxt === '') {
    return { settings: normalizeSettings(null).settings, warnings: [], source: 'defaults' };
  }
  let blob = null;
  try { blob = JSON.parse(rawTxt); } catch (e) {
    return { settings: normalizeSettings(null).settings, warnings: [{ reason: 'storage-garbage', error: String((e && e.message) || e) }], source: 'defaults' };
  }
  const raw = (blob && typeof blob === 'object' && blob.settings && typeof blob.settings === 'object') ? blob.settings : blob;
  const res = normalizeSettings(raw);
  return { settings: res.settings, warnings: res.warnings, source: 'storage', version: blob && blob.version };
}

function save(storage, key, settings) {
  const k = key || STORAGE_KEY;
  const res = normalizeSettings(settings);
  const blob = { version: VERSION, savedAt: null, settings: res.settings };
  if (!storage || typeof storage.setItem !== 'function') {
    return { ok: false, reason: 'no-storage', settings: res.settings, bytes: 0 };
  }
  try {
    storage.setItem(k, JSON.stringify(blob));
    const txt = JSON.stringify(blob);
    return { ok: true, key: k, bytes: txt.length, settings: res.settings };
  } catch (e) {
    return { ok: false, reason: 'storage-write-failed', error: String((e && e.message) || e), settings: res.settings, bytes: 0 };
  }
}

// ---------- presets ----------

const PRESETS = {
  shipped: { label: 'پیش‌فرض ارسال‌شده', overrides: {} },
  narrow: { label: 'پنجرهٔ باریک', overrides: { ivMin: 0.10, ivMax: 1.5 } },
  wideReach: { label: 'گاردهای قیمت آزاد', overrides: { maxSpreadPct: 0.50, checkArbitrageBounds: false } },
  computeOnly: { label: 'فقط محاسبه (فیلتر خاموش)', overrides: { ivFilterEnabled: false } },
  v9Compare: { label: 'نگاشت v9 (مقایسه)', overrides: { r: 0.2, marketPriceFrom: 'plc', underlyingFrom: 'rowPl', legacyV9Mapping: true } }
};

function applyPreset(settings, name) {
  const p = PRESETS[name];
  if (!p) return applyChange(settings, '__unknown__', undefined);
  const cur = normalizeSettings(settings).settings;
  const next = {};
  SCHEMA.forEach(function (f) { next[f.key] = (p.overrides[f.key] !== undefined) ? p.overrides[f.key] : cur[f.key]; });
  const res = normalizeSettings(next);
  return { settings: res.settings, warnings: res.warnings, preset: name, label: p.label };
}

// ---------- description for the UI ----------

function fmt(v, field) {
  if (field.type === 'number') {
    const n = (typeof v === 'number') ? v : parseFloat(v);
    if (!isFinite(n)) return String(v);
    let s = String(Math.round(n * 100000) / 100000);
    if (field.displayScale) s = String(Math.round(n * field.displayScale * 100) / 100) + (field.displayUnit || '');
    else if (field.displayUnit) s = s + (field.displayUnit || '');
    return s;
  }
  if (field.type === 'bool') return v ? 'روشن' : 'خاموش';
  return String(v);
}

/** Persian summary + the list of variables that differ from the shipped defaults. */
function describe(settings) {
  const s = normalizeSettings(settings).settings;
  const changed = [];
  SCHEMA.forEach(function (f) {
    if (s[f.key] !== DEFAULTS[f.key]) {
      changed.push({ key: f.key, label: f.label, from: fmt(DEFAULTS[f.key], f), to: fmt(s[f.key], f) });
    }
  });
  const parts = SCHEMA.map(function (f) { return f.label + '=' + fmt(s[f.key], f); });
  return {
    summary: parts.join('  |  '),
    changed: changed,
    changedCount: changed.length,
    isDefault: changed.length === 0,
    hash: configHash(s)
  };
}

const api = {
  VERSION: VERSION, STORAGE_KEY: STORAGE_KEY, SCHEMA: SCHEMA, SCHEMA_BY_KEY: SCHEMA_BY_KEY,
  DEFAULTS: DEFAULTS, PRESETS: PRESETS,
  normalizeSettings: normalizeSettings, toFunnelConfig: toFunnelConfig,
  configHash: configHash, applyChange: applyChange, applyPreset: applyPreset,
  load: load, save: save, describe: describe
};

if (typeof module !== 'undefined' && module.exports) module.exports = api;
if (typeof window !== 'undefined') window.TseFunnelSettings = api;
