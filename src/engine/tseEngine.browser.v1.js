/**
 * tseZharfaKavosh — B engine + models, BROWSER BUNDLE v1 (generated)
 *
 * GENERATED FILE — do not edit by hand. Build with:
 *   node tools/buildBrowserBundle.v1.js
 * from these sources (verifiable, byte-for-byte apart from comments):
 *   src/models/jalaliCalendar.v0.1.0.js  -> module "jalaliCalendar"
 *   src/optionParser.v0.1.0.js  -> module "optionParser"
 *   src/models/greeks.v0.1.0.js  -> module "greeks"
 *   src/engine/aLookup.v0.1.0.js  -> module "aLookup"
 *   src/engine/bEngine.v0.1.0.js  -> module "bEngine"
 *
 * Paste this whole file in the page console ONCE, before any probe that
 * needs the real engine. It defines:
 *   window.TseBEngine  — { createBEngine, VERSION, DEFAULT_FUNNEL_CONFIG, ... }
 *   window.TseModels   — { optionParser, greeks, calendar }
 *   window.TseLookup   — { evaluateRow, buildFilterCodeBody, capacityCheck, ... }
 * No DOM, no network, no storage: the engine stays pure.
 * SPDX-License-Identifier: Smart-FFA-1.1
 */
(function (global) {
'use strict';
var __registry = {};
function __req(id) {
  var m = __registry[id];
  if (!m) throw new Error('tseEngine bundle: unknown module ' + id);
  return m.exports;
}
function __def(id, factory) {
  var module = { exports: {} };
  __registry[id] = module;
  factory(module, module.exports);
  return module.exports;
}

__def("jalaliCalendar", function (module) {
const J_MONTH_DAYS = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29];
const J_EPOCH_JDN = 2305527;
function gregToJDN(y, m, d) {
  const a = Math.floor((14 - m) / 12), y2 = y + 4800 - a, m2 = m + 12 * a - 3;
  return d + Math.floor((153 * m2 + 2) / 5) + 365 * y2 + Math.floor(y2 / 4) -
         Math.floor(y2 / 100) + Math.floor(y2 / 400) - 32045;
}
function jdnToGreg(j) {
  const a = j + 32044, b = Math.floor((4 * a + 3) / 146097), c = a - Math.floor(146097 * b / 4);
  const d = Math.floor((4 * c + 3) / 1461), e = c - Math.floor(1461 * d / 4);
  const m = Math.floor((5 * e + 2) / 153);
  return { y: 100 * b + d - 4800 + Math.floor(m / 10), m: m + 3 - 12 * Math.floor(m / 10),
           d: e - Math.floor((153 * m + 2) / 5) + 1 };
}
function jalaliToJDN(jy, jm, jd) {
  const jy1 = jy - 979;
  let j = 365 * jy1 + Math.floor(jy1 / 33) * 8 + Math.floor((jy1 % 33 + 3) / 4);
  for (let i = 0; i < jm - 1; i++) j += J_MONTH_DAYS[i];
  return J_EPOCH_JDN + j + jd - 1;
}
function jdnToJalali(j) {
  let jy = 979 + Math.floor((j - J_EPOCH_JDN) / 366);
  while (jalaliToJDN(jy, 1, 1) > j) jy--;
  while (jalaliToJDN(jy + 1, 1, 1) <= j) jy++;
  let days = j - jalaliToJDN(jy, 1, 1);
  let jm = 1;
  while (jm < 12 && days >= J_MONTH_DAYS[jm - 1]) { days -= J_MONTH_DAYS[jm - 1]; jm++; }
  return { jy: jy, jm: jm, jd: days + 1 };
}
function daysToExpiry(expiryStr, todayJDN) {
  const m = String(expiryStr || '').match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
  if (!m) return null;
  const jm = +m[2], jd = +m[3];
  if (jm < 1 || jm > 12 || jd < 1 || jd > 31) return null;
  return jalaliToJDN(+m[1], jm, jd) - todayJDN;
}
function localDateToJDN(d) {
  const t = d || new Date();
  return gregToJDN(t.getFullYear(), t.getMonth() + 1, t.getDate());
}
function createCalendar() {
  return function calendar(expiry, nowMs) {
    const todayJDN = localDateToJDN(nowMs ? new Date(nowMs) : new Date());
    return daysToExpiry(expiry, todayJDN);
  };
}
const VERSION = '0.1.0-jalaliCalendar-001';
module.exports = { gregToJDN, jdnToGreg, jalaliToJDN, jdnToJalali, daysToExpiry,
                   localDateToJDN, createCalendar, VERSION };
if (typeof window !== 'undefined') {
  window.TseCalendar = { gregToJDN, jdnToGreg, jalaliToJDN, jdnToJalali, daysToExpiry,
                         localDateToJDN, createCalendar, VERSION };
}
});

__def("optionParser", function (module) {
function parseOptionLabel(row) {
  if (!row || typeof row !== 'object') return { status: 'unknown', reason: 'row not object', raw: row };
  const l18 = String(row.l18 || '').trim();
  const l30 = String(row.l30 || '').trim();
  const inscode = String(row.inscode || row.InsCode || '');
  if (!l18 || !l30) return { status: 'unknown', reason: 'missing l18/l30', raw: { l18, l30 } };
  const first = l18.charAt(0);
  const isCallPrefix = first === 'ض';
  const isPutPrefix  = first === 'ط';
  if (!isCallPrefix && !isPutPrefix) {
    return { status: 'rejected', reason: 'l18 does not start with ض/ط', raw: { l18, l30 } };
  }
  const l30norm = l30.replace(/ي/g, 'ی').replace(/ك/g, 'ک');
  const hasEkhtiar = l30norm.indexOf('اختیار') !== -1 || l30.indexOf('اختيار') !== -1;
  if (!hasEkhtiar) {
    return { status: 'unknown', reason: 'l30 missing اختیار', raw: { l18, l30 } };
  }
  let kind = null;
  if (l30norm.indexOf('اختیارخ') !== -1 || l30.indexOf('اختيارخ') !== -1) kind = 'call';
  else if (l30norm.indexOf('اختیارف') !== -1 || l30.indexOf('اختيارف') !== -1) kind = 'put';
  else kind = isCallPrefix ? 'call' : 'put';
  let strike = null;
  let expiry = null;
  let underlying = null;
  const dashParts = l30.split('-');
  if (dashParts.length >= 2) {
    const last = dashParts[dashParts.length - 1].trim();
    const dateMatch = last.match(/^(\d{4}\/\d{2}\/\d{2}|\d{8})$/);
    if (dateMatch) {
      expiry = dateMatch[1];
      if (/^\d{8}$/.test(expiry)) expiry = expiry.slice(0,4)+'/'+expiry.slice(4,6)+'/'+expiry.slice(6,8);
      const strikeStr = dashParts[dashParts.length - 2].trim();
      const m = strikeStr.match(/(\d[\d,]*)/);
      if (m) strike = parseInt(m[1].replace(/,/g,''),10);
      const before = dashParts.slice(0, dashParts.length - 2).join('-');
      const undMatch = before.match(/اختیار[خف]\s+(.+)/) || before.match(/اختيار[خف]\s+(.+)/);
      if (undMatch) underlying = undMatch[1].trim();
      else {
        const tokens = before.trim().split(/\s+/);
        underlying = tokens[tokens.length - 1] || null;
      }
    }
  }
  if (strike !== null && expiry) {
    return { status: 'confirmed', kind, underlying, strike, expiry, raw: { l18, l30, inscode } };
  }
  return { status: 'candidate', kind, underlying: underlying || null, strike, expiry, raw: { l18, l30, inscode }, reason: 'strike/expiry parse incomplete — pattern fallback' };
}
if (typeof module !== 'undefined' && module.exports) module.exports = { parseOptionLabel, version: '0.1.0' };
if (typeof window !== 'undefined') window.tseZharfaKavosh_parseOptionLabel = parseOptionLabel;
});

__def("greeks", function (module) {
function normCDF(x) {
  const a1=0.254829592, a2=-0.284496736, a3=1.421413741, a4=-1.453152027, a5=1.061405429, p=0.3275911;
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5*t + a4)*t) + a3)*t + a2)*t + a1)*t * Math.exp(-x*x);
  return 0.5 * (1.0 + sign * y);
}
function normPDF(x){ return Math.exp(-0.5*x*x)/Math.sqrt(2*Math.PI); }
function d1(S,K,T,r,sigma){ return (Math.log(S/K)+(r+0.5*sigma*sigma)*T)/(sigma*Math.sqrt(T)); }
function d2(S,K,T,r,sigma){ return d1(S,K,T,r,sigma)-sigma*Math.sqrt(T); }
function bsGreeks(p){
  const {S,K,T,r,sigma,kind}=p;
  if([S,K,T,r,sigma].some(v=> v==null || typeof v!=='number' || !isFinite(v))) return { error:'insufficient-data', reason:'missing S/K/T/r/sigma' };
  if(S<=0||K<=0||T<=0||sigma<=0) return { error:'insufficient-data', reason:'non-positive S/K/T/sigma' };
  if(kind!=='call' && kind!=='put') return { error:'invalid-kind' };
  const _d1=d1(S,K,T,r,sigma), _d2=d2(S,K,T,r,sigma);
  const Nd1=normCDF(_d1), Nd2=normCDF(_d2), Nmd1=normCDF(-_d1), Nmd2=normCDF(-_d2);
  const pdfd1=normPDF(_d1);
  const sqrtT=Math.sqrt(T);
  let price, delta, gamma, vega, theta, rho;
  if(kind==='call'){
    price = S*Nd1 - K*Math.exp(-r*T)*Nd2;
    delta = Nd1;
    rho = K*T*Math.exp(-r*T)*Nd2/100; 
  } else {
    price = K*Math.exp(-r*T)*Nmd2 - S*Nmd1;
    delta = Nd1 - 1;
    rho = -K*T*Math.exp(-r*T)*Nmd2/100;
  }
  gamma = pdfd1/(S*sigma*sqrtT);
  vega = S*pdfd1*sqrtT/100; 
  const term1 = -(S*pdfd1*sigma)/(2*sqrtT);
  if(kind==='call'){
    theta = (term1 - r*K*Math.exp(-r*T)*Nd2)/365; 
  } else {
    theta = (term1 + r*K*Math.exp(-r*T)*Nmd2)/365;
  }
  return { price, delta, gamma, vega, theta, rho, d1:_d1, d2:_d2 };
}
function impliedVol(p){
  const {S,K,T,r,kind,marketPrice}=p;
  if([S,K,T,r,marketPrice].some(v=> v==null || !isFinite(v))) return { error:'insufficient-data' };
  let low=0.01, high=3.0, mid, price, iter=0;
  let lowPrice=bsGreeks({S,K,T,r,sigma:low,kind}).price;
  let highPrice=bsGreeks({S,K,T,r,sigma:high,kind}).price;
  if(marketPrice < Math.min(lowPrice,highPrice) || marketPrice > Math.max(lowPrice,highPrice)){
  }
  for(iter=0; iter<100; iter++){
    mid=(low+high)/2;
    price=bsGreeks({S,K,T,r,sigma:mid,kind}).price;
    if(Math.abs(price-marketPrice) < 1e-6) break;
    if(price > marketPrice) high=mid; else low=mid;
    if(high-low < 1e-7) break;
  }
  return { sigma:mid, iterations: iter, price: bsGreeks({S,K,T,r,sigma:mid,kind}).price };
}
const VERSION='0.1.0-greeks-001';
module.exports={ normCDF, normPDF, bsGreeks, impliedVol, VERSION };
if(typeof window!=='undefined') window.TseGreeks={ normCDF, normPDF, bsGreeks, impliedVol, VERSION };
});

__def("aLookup", function (module) {
const VERSION = '0.1.0-aLookup-001';
const FILTER_CODE_LIMIT = 4096;
function evaluateRow(row, published) {
  if (!published || !published.ok || !published.index || !published.bitset || !published.known) return true;
  if (!row) return true;
  const inscode = (row.inscode !== undefined && row.inscode !== null) ? String(row.inscode)
    : (row.InsCode !== undefined && row.InsCode !== null ? String(row.InsCode) : '');
  if (!inscode) return true;                       
  const pos = published.index[inscode];
  if (pos === undefined) return true;              
  const byteIdx = pos >> 3;                        
  const mask = 1 << (pos & 7);                     
  if (byteIdx < 0 || byteIdx >= published.known.length) return true; 
  if (!((published.known[byteIdx] & mask) !== 0 ? 1 : 0)) return true; 
  return ((published.bitset[byteIdx] & mask) !== 0);
}
function buildFilterCodeBody() {
  return [
    '// tseZharfaKavosh A lookup ' + VERSION + ' — reads only B published projection',
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
}
function buildFilterCode() {
  const body = buildFilterCodeBody();
  const bytes = body.length;
  return { body: body, bytes: bytes, limit: FILTER_CODE_LIMIT, fits: bytes <= FILTER_CODE_LIMIT, version: VERSION };
}
function capacityCheck(source, limit) {
  const lim = (typeof limit === 'number') ? limit : FILTER_CODE_LIMIT;
  const bytes = (typeof source === 'string') ? source.length : 0;
  return { limit: lim, bytes: bytes, fits: bytes > 0 && bytes <= lim };
}
function compileFilterCodeBody(body) {
  const src = (typeof body === 'string' && body.length) ? body : buildFilterCodeBody();
  return new Function('row', 'mw', src + '\nreturn FilterResult;');
}
module.exports = { evaluateRow, buildFilterCodeBody, buildFilterCode, capacityCheck, compileFilterCodeBody, VERSION, FILTER_CODE_LIMIT };
if (typeof window !== 'undefined') window.TseALookup = { evaluateRow, buildFilterCodeBody, buildFilterCode, capacityCheck, compileFilterCodeBody, VERSION, FILTER_CODE_LIMIT };
});

__def("bEngine", function (module) {
const VERSION = '0.1.0-bEngine-001';
const IV_SOLVER_MIN = 0.01;
const IV_SOLVER_MAX = 3.0;
const MARKET_PRICE_SOURCES = ['hybrid', 'pl', 'pc', 'plc', 'pcp', 'plp', 'pd1', 'bidAskMid'];
const UNDERLYING_SOURCES = ['underlyingMap', 'rowPl', 'none'];
const UNDERLYING_PRICE_FIELDS = ['pc', 'pl', 'pd1', 'po1', 'bidAskMid'];
const DIRTY_FIELDS = ['pl', 'plc', 'l18', 'l30', 'tvol', 'tno', 'pcp'];
const INDEX_SAMPLE = 16;
const CAL = __req('jalaliCalendar');
const DEFAULT_FUNNEL_CONFIG = {
  TMode: 'dte',               
  T: 30 / 365,                
  r: 0.30,                 
  ivMin: 0.05,               
  ivMax: 2.5,                
  deltaMin: 0.3,           
  gammaMin: 1e-4,          
  useDeltaGamma: false,
  ivFilterEnabled: true,
  marketPriceFrom: 'hybrid',        
  underlyingFrom: 'underlyingMap', 
  underlyingPriceField: 'pc',      
  legacyV9Mapping: false,
  checkArbitrageBounds: true,   
  maxSpreadPct: 0.20,           
  pinFailOpen: true             
};
const V9_FUNNEL_CONFIG = {
  r: 0.2,
  marketPriceFrom: 'plc',
  underlyingFrom: 'rowPl',
  legacyV9Mapping: true
};
function inscodeOf(row) {
  if (!row) return '';
  if (row.inscode !== undefined && row.inscode !== null && row.inscode !== '') return String(row.inscode);
  if (row.InsCode !== undefined && row.InsCode !== null && row.InsCode !== '') return String(row.InsCode);
  return '';
}
function toNum(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = parseFloat(v);
  return (typeof n === 'number' && isFinite(n)) ? n : null;
}
function setBit(bytes, pos, value) {
  const byteIdx = (pos / 8) | 0;
  const mask = 1 << (pos % 8);
  if (value) bytes[byteIdx] |= mask; else bytes[byteIdx] &= ~mask;
}
function getBit(bytes, pos) {
  return (bytes[(pos / 8) | 0] >> (pos % 8)) & 1;
}
function normalizeRows(rows) {
  if (!rows) return [];
  if (Array.isArray(rows)) return rows;
  if (typeof rows === 'object') {
    const out = [];
    for (const k in rows) if (Object.prototype.hasOwnProperty.call(rows, k)) out.push(rows[k]);
    return out;
  }
  return [];
}
function buildUnderlyingMap(list, field) {
  const priceField = field || 'pc';
  const map = Object.create(null);
  for (let i = 0; i < list.length; i++) {
    const r = list[i];
    if (!r) continue;
    const l18 = String(r.l18 || '').trim();
    if (!l18 || l18.length > 12) continue;
    const first = l18.charAt(0);
    if (first === '\u0636' || first === '\u0637') continue; 
    const price = toNum(r[priceField]);
    if (price !== null && price > 0 && map[l18] === undefined) map[l18] = price;
  }
  return map;
}
function createScheduler() {
  if (typeof requestIdleCallback === 'function') {
    return function (fn) {
      requestIdleCallback(function () { fn(); }, { timeout: 500 });
    };
  }
  if (typeof setTimeout === 'function') return function (fn) { setTimeout(fn, 0); };
  return function (fn) { fn(); };
}
function marketPriceProblem(row, S, K, T, r, kind, marketPrice, cfg, fromBook) {
  if (!cfg || cfg.checkArbitrageBounds !== false) {
    const disc = Math.exp(-r * T);
    let lo, hi;
    if (kind === 'put') { lo = Math.max(0, K * disc - S); hi = K * disc; }
    else { lo = Math.max(0, S - K * disc); hi = S; }
    if (marketPrice < lo - 1 || marketPrice > hi + 1) return 'price-outside-arbitrage-bounds';
  }
  const bid = toNum(row && row.pd1);
  const ask = toNum(row && row.po1);
  const maxSpread = (cfg && typeof cfg.maxSpreadPct === 'number') ? cfg.maxSpreadPct : 0.20;
  if (fromBook !== false && bid !== null && ask !== null && bid > 0 && ask > bid && maxSpread > 0) {
    const mid = (bid + ask) / 2;
    if (mid > 0 && (ask - bid) / mid > maxSpread) return 'book-too-wide';
  }
  return null;
}
function normalizeFunnelConfig(cfg) {
  const out = Object.assign({}, DEFAULT_FUNNEL_CONFIG);
  const c = cfg || {};
  const num = function (key, min, max) {
    const v = c[key];
    if (typeof v !== 'number' || !isFinite(v) || v < min || v > max) return out[key];
    return v;
  };
  const bool = function (key) {
    return c[key] === undefined ? out[key] : c[key] === true;
  };
  out.T = num('T', 0, 10);                 
  out.r = num('r', 0, 5);                  
  out.ivMin = num('ivMin', IV_SOLVER_MIN, IV_SOLVER_MAX);
  out.ivMax = num('ivMax', IV_SOLVER_MIN, IV_SOLVER_MAX);
  out.deltaMin = num('deltaMin', 0, 1);
  out.gammaMin = num('gammaMin', 0, 1);
  out.ivFilterEnabled = bool('ivFilterEnabled');
  out.useDeltaGamma = bool('useDeltaGamma');
  out.legacyV9Mapping = bool('legacyV9Mapping');
  out.checkArbitrageBounds = bool('checkArbitrageBounds');
  out.pinFailOpen = bool('pinFailOpen');
  out.TMode = (c.TMode === undefined) ? out.TMode : ((c.TMode === 'dte') ? 'dte' : 'fixed');
  out.maxSpreadPct = num('maxSpreadPct', 0, 1);
  if (!(out.ivMin < out.ivMax)) {
    out.ivMin = DEFAULT_FUNNEL_CONFIG.ivMin;
    out.ivMax = DEFAULT_FUNNEL_CONFIG.ivMax;
  }
  if (typeof c.marketPriceFrom === 'string' && MARKET_PRICE_SOURCES.indexOf(c.marketPriceFrom) >= 0) {
    out.marketPriceFrom = c.marketPriceFrom;
  }
  if (typeof c.underlyingFrom === 'string' && UNDERLYING_SOURCES.indexOf(c.underlyingFrom) >= 0) {
    out.underlyingFrom = c.underlyingFrom;
  }
  if (typeof c.underlyingPriceField === 'string' && UNDERLYING_PRICE_FIELDS.indexOf(c.underlyingPriceField) >= 0) {
    out.underlyingPriceField = c.underlyingPriceField;
  }
  return out;
}
function createBEngine(options) {
  const opts = options || {};
  const models = opts.models || {};
  const calendar = (typeof opts.calendar === 'function') ? opts.calendar : CAL.createCalendar();
  let funnel = normalizeFunnelConfig(opts.funnelConfig);
  if (opts.legacyV9Mapping === true || funnel.legacyV9Mapping === true) {
    funnel = Object.assign({}, funnel, V9_FUNNEL_CONFIG);
  }
  const dirtyFields = Array.isArray(opts.dirtyFields) && opts.dirtyFields.length ? opts.dirtyFields.slice() : DIRTY_FIELDS;
  const strictIndex = opts.strictIndex === true;
  const scheduler = opts.scheduler || createScheduler();
  const now = opts.now || (typeof performance !== 'undefined' && performance.now
    ? function () { return performance.now(); }
    : function () { return Date.now(); });
  const nowEpoch = (typeof opts.nowEpoch === 'function') ? opts.nowEpoch
    : (typeof Date.now === 'function' ? function () { return Date.now(); } : now);
  const state = {
    symbols: [],                 
    index: Object.create(null),  
    rowIndex: Object.create(null), 
    bitset: new Uint8Array(0),   
    known: new Uint8Array(0),    
    prevRows: Object.create(null), 
    underlyingMap: Object.create(null), 
    snapshotId: null,
    configHash: null,
    configVersion: 0,
    totalRuns: 0,
    indexRebuilds: 0,
    indexCacheHits: 0,
    lastDirtyCount: 0,
    lastComputed: 0,
    lastUnknown: 0,
    lastError: null,
    lastHookError: null,
    meta: null
  };
  function buildIndex(rows) {
    const list = normalizeRows(rows);
    const symbols = [];
    const index = Object.create(null);
    const rowIndex = Object.create(null);
    for (let i = 0; i < list.length; i++) {
      const inscode = inscodeOf(list[i]);
      if (!inscode || index[inscode] !== undefined) continue; 
      index[inscode] = symbols.length;
      rowIndex[inscode] = list[i];
      symbols.push(inscode);
    }
    let changed = false;
    if (symbols.length !== state.symbols.length) changed = true;
    else for (let i = 0; i < symbols.length; i++) if (symbols[i] !== state.symbols[i]) { changed = true; break; }
    state.symbols = symbols;
    state.index = index;
    state.rowIndex = rowIndex;
    state.indexRebuilds++;
    if (funnel.underlyingFrom === 'underlyingMap') state.underlyingMap = buildUnderlyingMap(list, funnel.underlyingPriceField);
    if (changed) {
      state.bitset = new Uint8Array(Math.ceil(symbols.length / 8));
      state.known = new Uint8Array(Math.ceil(symbols.length / 8));
      state.prevRows = Object.create(null);
    }
    return { changed: changed, count: symbols.length };
  }
  function indexStillValid(list) {
    if (list.length !== state.symbols.length) return false;
    const step = Math.max(1, Math.floor(list.length / INDEX_SAMPLE));
    for (let i = 0; i < list.length; i += step) {
      const inscode = inscodeOf(list[i]);
      if (!inscode || state.index[inscode] === undefined) return false;
    }
    return true;
  }
  function ensureIndex(rows) {
    const list = normalizeRows(rows);
    if (!strictIndex && state.symbols.length > 0 && indexStillValid(list)) {
      state.indexCacheHits++;
      return { changed: false, count: state.symbols.length, cached: true };
    }
    return buildIndex(list);
  }
  function detectDirty(rows) {
    const list = normalizeRows(rows);
    const dirty = [];
    const rowMap = Object.create(null);
    const prev = state.prevRows;
    for (let i = 0; i < list.length; i++) {
      const r = list[i];
      const inscode = inscodeOf(r);
      if (!inscode) continue;
      const p = prev[inscode];
      let isDirty = false;
      if (!p) isDirty = true;
      else {
        for (let f = 0; f < dirtyFields.length; f++) {
          if (p[dirtyFields[f]] !== r[dirtyFields[f]]) { isDirty = true; break; }
        }
      }
      if (isDirty) { dirty.push(inscode); rowMap[inscode] = r; }
    }
    return { dirty: dirty, rowMap: rowMap, count: dirty.length };
  }
  function commitDirty(rowMap) {
    const prev = state.prevRows;
    for (const k in rowMap) {
      if (!Object.prototype.hasOwnProperty.call(rowMap, k)) continue;
      const r = rowMap[k];
      const snap = {};
      for (let f = 0; f < dirtyFields.length; f++) snap[dirtyFields[f]] = r[dirtyFields[f]];
      prev[k] = snap;
    }
  }
  function needsRun(snapshotId, configHash) {
    if (state.snapshotId === null || state.configHash === null) return true; 
    if (snapshotId !== state.snapshotId) return true;
    if (configHash !== state.configHash) return true;
    return false;
  }
  function computeSnapshotId(mwLike) {
    const roundNo = mwLike && mwLike.RoundNo !== undefined ? mwLike.RoundNo : 0;
    const count = mwLike && mwLike.AllRows ? Object.keys(mwLike.AllRows).length : 0;
    return 'snap-' + roundNo + '-' + count;
  }
  function computeConfigHash(mwLike) {
    const version = (mwLike && mwLike.__B_configVersion !== undefined) ? mwLike.__B_configVersion : state.configVersion;
    const fc = mwLike && mwLike.FilterCode ? String(mwLike.FilterCode) : '';
    return version + '-' + fc.length;
  }
  function resolveMarketPrice(row, S, K, T, kind) {
    const src = funnel.marketPriceFrom;
    if (src !== 'hybrid') {
      let price = null;
      if (src === 'bidAskMid') {
        const bid = toNum(row.pd1), ask = toNum(row.po1);
        if (bid !== null && ask !== null && bid > 0 && ask > 0) price = (bid + ask) / 2;
      } else {
        price = toNum(row[src]);
      }
      if (price === null || price <= 0) return { ok: false, reason: 'missing market price' };
      const problem = marketPriceProblem(row, S, K, T, funnel.r, kind, price, funnel, true);
      if (problem) return { ok: false, reason: problem };
      return { ok: true, price: price, source: src };
    }
    let blocked = 'no usable market price';
    const bid = toNum(row.pd1), ask = toNum(row.po1);
    if (bid !== null && ask !== null && bid > 0 && ask > 0) {
      const mid = (bid + ask) / 2;
      const problem = marketPriceProblem(row, S, K, T, funnel.r, kind, mid, funnel, true);
      if (!problem) return { ok: true, price: mid, source: 'mid' };
      blocked = problem;
    }
    const trades = toNum(row.tno);
    const last = toNum(row.pl);
    if (trades !== null && trades > 0 && last !== null && last > 0) {
      const problem = marketPriceProblem(row, S, K, T, funnel.r, kind, last, funnel, false);
      if (!problem) return { ok: true, price: last, source: 'pl-traded' };
      return { ok: false, reason: problem };   
    }
    return { ok: false, reason: blocked };
  }
  function resolveUnderlying(row, parsed) {
    if (funnel.underlyingFrom === 'rowPl') return toNum(row.pl);       
    if (funnel.underlyingFrom === 'none') return null;
    const name = parsed && parsed.underlying ? String(parsed.underlying).trim() : '';
    if (!name) return null;
    const price = state.underlyingMap[name];
    return (price === undefined) ? null : price;
  }
  function resolveT(parsed) {
    if (funnel.TMode !== 'dte') return { ok: true, T: funnel.T };
    if (!calendar) return { ok: false, reason: 'no calendar available' };
    const expiry = parsed && parsed.expiry ? String(parsed.expiry) : '';
    if (!expiry) return { ok: false, reason: 'no expiry on the parsed label' };
    let dte = null;
    try { dte = calendar(expiry, nowEpoch()); } catch (e) { return { ok: false, reason: 'calendar failed' }; }
    if (dte === null || !isFinite(dte) || dte <= 0) return { ok: false, reason: 'no usable maturity' };
    return { ok: true, T: dte / 365 };
  }
  function computeFunnel(row, parsed) {
    try {
      if (!row || typeof row !== 'object') return { status: 'error', reason: 'row not object' };
      if (!parsed || parsed.status !== 'confirmed') return { status: 'insufficient-data', reason: 'not a confirmed option' };
      const S = resolveUnderlying(row, parsed);
      const K = toNum(parsed.strike);
      if (S === null || K === null) return { status: 'insufficient-data', reason: 'missing S/K' };
      const tRes = resolveT(parsed);
      if (!tRes.ok) return { status: 'insufficient-data', reason: tRes.reason };
      const T = tRes.T;
      const kind = (parsed.kind === 'put') ? 'put' : 'call';
      const resolved = resolveMarketPrice(row, S, K, T, kind);
      if (!resolved.ok) return { status: 'insufficient-data', reason: resolved.reason };
      const marketPrice = resolved.price;
      if (typeof models.impliedVol !== 'function' || typeof models.bsGreeks !== 'function') {
        return { status: 'error', reason: 'models not injected' };
      }
      const iv = models.impliedVol({ S: S, K: K, T: T, r: funnel.r, kind: kind, marketPrice: marketPrice });
      const inputs = { S: S, K: K, marketPrice: marketPrice, marketPriceSource: resolved.source, T: T, r: funnel.r, kind: kind };
      if (!funnel.ivFilterEnabled) {
        const ivOk = iv && !iv.error && iv.sigma !== undefined && iv.sigma !== null && isFinite(iv.sigma);
        return {
          status: 'ok', pass: true, reason: 'iv-filter-disabled-open-bug',
          ivStatus: 'iv-filter-disabled',
          iv: ivOk ? iv.sigma : null,
          atBoundary: ivOk ? (iv.sigma <= 0.0100001 || iv.sigma >= 2.9999999) : null,
          iterations: ivOk ? iv.iterations : null,
          inputs: inputs
        };
      }
      if (!iv || iv.error || iv.sigma === undefined || iv.sigma === null || !isFinite(iv.sigma)) {
        return { status: 'insufficient-data', reason: 'iv failed' };
      }
      const g = models.bsGreeks({ S: S, K: K, T: T, r: funnel.r, sigma: iv.sigma, kind: kind });
      if (!g || g.error) return { status: 'insufficient-data', reason: 'greeks failed' };
      const atBoundary = (iv.sigma <= 0.0100001 || iv.sigma >= IV_SOLVER_MAX - 1e-6);
      let pass = (iv.sigma > funnel.ivMin) && (iv.sigma < funnel.ivMax);
      if (pass && funnel.useDeltaGamma === true) {
        pass = (Math.abs(g.delta) > funnel.deltaMin) && (g.gamma > funnel.gammaMin);
      }
      let ivStatus;
      if (atBoundary) { ivStatus = 'no-iv-solution'; if (funnel.pinFailOpen) pass = true; }
      else if (pass) ivStatus = 'ok';
      else ivStatus = 'fail-iv-range';
      return {
        status: 'ok', pass: pass, delta: g.delta, gamma: g.gamma,
        iv: iv.sigma, iterations: iv.iterations, atBoundary: atBoundary,
        reason: ivStatus,
        ivStatus: ivStatus,
        inputs: inputs
      };
    } catch (e) {
      return { status: 'error', reason: String((e && e.message) || e) };
    }
  }
  function run(rows, snapshotId, configHash) {
    const t0 = now();
    if (!needsRun(snapshotId, configHash)) {
      return { published: false, reason: 'no-change', dirtyCount: 0, elapsedMs: now() - t0, runs: state.totalRuns };
    }
    const idx = ensureIndex(rows);
    const d = detectDirty(rows);
    state.lastDirtyCount = d.count;
    if (d.count === 0) {
      state.snapshotId = snapshotId;
      state.configHash = configHash;
      return { published: false, reason: 'no-dirty', dirtyCount: 0, elapsedMs: now() - t0, runs: state.totalRuns };
    }
    const bytes = state.bitset.length;
    const nextBitset = new Uint8Array(bytes);
    const nextKnown = new Uint8Array(bytes);
    for (let i = 0; i < bytes; i++) { nextBitset[i] = state.bitset[i]; nextKnown[i] = state.known[i]; }
    let computed = 0, unknown = 0, errors = 0, lastErr = null;
    for (let i = 0; i < d.dirty.length; i++) {
      const inscode = d.dirty[i];
      const pos = state.index[inscode];
      if (pos === undefined) continue;
      const row = d.rowMap[inscode]; 
      if (!row) continue;
      const parsed = (typeof models.parseOptionLabel === 'function') ? models.parseOptionLabel(row) : { status: 'unknown' };
      const res = computeFunnel(row, parsed);
      if (res.status === 'error') { errors++; if (!lastErr) lastErr = res.reason; continue; }
      if (res.status === 'ok') {
        setBit(nextBitset, pos, res.pass);
        setBit(nextKnown, pos, true);
        computed++;
      } else {
        setBit(nextKnown, pos, false); 
        unknown++;
      }
    }
    if (errors > 0) {
      state.lastError = 'funnel errors: ' + errors + ' (' + lastErr + ')';
      return {
        published: false, reason: 'error', error: state.lastError,
        dirtyCount: d.count, computed: computed, unknown: unknown,
        elapsedMs: now() - t0, runs: state.totalRuns
      };
    }
    state.bitset = nextBitset;
    state.known = nextKnown;
    state.snapshotId = snapshotId;
    state.configHash = configHash;
    state.totalRuns++;
    state.lastError = null;
    state.lastComputed = computed;
    state.lastUnknown = unknown;
    state.meta = {
      snapshotId: snapshotId,
      configHash: configHash,
      dirtyCount: d.count,
      computed: computed,
      unknown: unknown,
      totalSymbols: state.symbols.length,
      bitsetBytes: nextBitset.length,
      indexChanged: idx.changed,
      indexCached: idx.cached === true,
      version: VERSION
    };
    commitDirty(d.rowMap);
    return {
      published: true, dirtyCount: d.count, computed: computed, unknown: unknown,
      elapsedMs: now() - t0, runs: state.totalRuns, meta: state.meta
    };
  }
  function runAsync(rows, snapshotId, configHash, cb) {
    scheduler(function () {
      let report;
      try { report = run(rows, snapshotId, configHash); }
      catch (e) { report = { published: false, reason: 'error', error: String((e && e.message) || e) }; }
      if (typeof cb === 'function') cb(report);
    });
  }
  function publish(target) {
    if (!target || typeof target !== 'object') return { published: false, reason: 'no target' };
    target.__B_symbols = state.symbols;
    target.__B_index = state.index;
    target.__B_rowIndex = state.rowIndex;
    target.__B_bitset = state.bitset;
    target.__B_known = state.known;
    target.__B_snapshotId = state.snapshotId;
    target.__B_configHash = state.configHash;
    target.__B_configVersion = state.configVersion;
    target.__B_totalRuns = state.totalRuns;
    target.__B_meta = state.meta;
    target.__B_lastError = state.lastError;
    return { published: true, symbols: state.symbols.length, bitsetBytes: state.bitset.length };
  }
  function getPublished() {
    const ok = state.bitset.length > 0 && state.snapshotId !== null && state.configHash !== null;
    return {
      ok: ok,
      index: state.index,
      bitset: state.bitset,
      known: state.known,
      symbols: state.symbols,
      meta: state.meta,
      lastError: state.lastError
    };
  }
  function installHooks(mw, ctx) {
    if (!mw || typeof mw !== 'object') return { uninstall: function () {} };
    const context = ctx || (typeof window !== 'undefined' ? window : null);
    if (typeof mw.__B_configVersion !== 'number') mw.__B_configVersion = state.configVersion;
    const origSettings = mw.SaveSettings;
    const origParams = mw.SaveParams;
    mw.SaveSettings = function () {
      state.configVersion++;
      mw.__B_configVersion = state.configVersion;
      if (typeof origSettings === 'function') {
        try { return origSettings.apply(context, arguments); }
        catch (e) { state.lastHookError = 'SaveSettings: ' + String((e && e.message) || e); }
      }
      return undefined;
    };
    mw.SaveParams = function () {
      state.configVersion++;
      mw.__B_configVersion = state.configVersion;
      if (typeof origParams === 'function') {
        try { return origParams.apply(context, arguments); }
        catch (e) { state.lastHookError = 'SaveParams: ' + String((e && e.message) || e); }
      }
      return undefined;
    };
    return {
      uninstall: function () {
        mw.SaveSettings = origSettings;
        mw.SaveParams = origParams;
      }
    };
  }
  function reset() {
    state.symbols = [];
    state.index = Object.create(null);
    state.rowIndex = Object.create(null);
    state.bitset = new Uint8Array(0);
    state.known = new Uint8Array(0);
    state.prevRows = Object.create(null);
    state.underlyingMap = Object.create(null);
    state.snapshotId = null;
    state.configHash = null;
    state.configVersion = 0;
    state.totalRuns = 0;
    state.indexRebuilds = 0;
    state.indexCacheHits = 0;
    state.lastDirtyCount = 0;
    state.lastComputed = 0;
    state.lastUnknown = 0;
    state.lastError = null;
    state.lastHookError = null;
    state.meta = null;
  }
  return {
    VERSION: VERSION,
    DIRTY_FIELDS: DIRTY_FIELDS,
    dirtyFields: dirtyFields,
    funnelConfig: funnel,
    state: state,
    buildIndex: buildIndex,
    ensureIndex: ensureIndex,
    detectDirty: detectDirty,
    commitDirty: commitDirty,
    needsRun: needsRun,
    computeSnapshotId: computeSnapshotId,
    computeConfigHash: computeConfigHash,
    computeFunnel: computeFunnel,
    run: run,
    runAsync: runAsync,
    publish: publish,
    getPublished: getPublished,
    installHooks: installHooks,
    reset: reset,
    _setBit: setBit,
    _getBit: getBit,
    _toNum: toNum,
    _normalizeRows: normalizeRows,
    _inscodeOf: inscodeOf
  };
}
module.exports = {
  createBEngine, VERSION, DIRTY_FIELDS, DEFAULT_FUNNEL_CONFIG, V9_FUNNEL_CONFIG,
  INDEX_SAMPLE, createScheduler, buildUnderlyingMap, normalizeFunnelConfig,
  marketPriceProblem
};
if (typeof window !== 'undefined') window.TseBEngine = {
  createBEngine, VERSION, DIRTY_FIELDS, DEFAULT_FUNNEL_CONFIG, V9_FUNNEL_CONFIG,
  INDEX_SAMPLE, createScheduler, buildUnderlyingMap, normalizeFunnelConfig,
  marketPriceProblem
};
});

global.TseBEngine = __req("bEngine");
global.TseModels = { optionParser: __req('optionParser'), greeks: __req('greeks'), calendar: __req('jalaliCalendar') };
global.TseLookup = __req('aLookup');
})(typeof window !== 'undefined' ? window : globalThis);
