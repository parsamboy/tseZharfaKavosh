/**
 * ===========================================================================
 *  RUN_ME.js  -  PASTE THIS WHOLE FILE INTO THE PAGE CONSOLE.
 *  https://old.tsetmc.com/Loader.aspx?ParTree=15131F  ->  F12 -> Console.
 *  Nothing else needs to be pasted first: the program is self-contained.
 *  Do NOT paste any *.harness.v1.js (those are node files) and do NOT paste
 *  src/engine/tseEngine.browser.v1.js (this file already contains it).
 * ===========================================================================
 */
/**
 * tseZharfaKavosh — run the SELF-CONTAINED program through the TEXTAREA, live  v1
 *
 * TEMPLATE. tools/buildProgramProbe.v1.js injects build/filterProgram.v1.js and writes
 * RUN_ME.js at the repository root - the ONLY file in this repo meant to be pasted into
 * the page. The template is not runnable on its own; the generated file is.
 *
 * WHY THIS EXISTS (owner, 2026-10-24, decision "self_contained")
 *   The owner asked for the whole program in ONE paste in the filter textarea: no console
 *   step, and it survives a reload. build/filterProgram.v1.js is that paste (51,720 bytes:
 *   the engine, the models, the UX settings layer and the per-row lookup). Everything
 *   proven about it so far is NODE-SIDE. This probe asks the only question that matters
 *   for the product: does that one paste actually work on the live page?
 *
 * THE SAFETY GATE — this is why the probe exists before anything else
 *   The site runs the pasted code through PrepareFilterCode(), its own DSL compiler with
 *   61 .replace() rules that map `(field)` shorthand to row["field"] (E-056). Only three
 *   of those 61 rules were ever recorded. If any of the other 58 has a target inside our
 *   51 KB body, the body is rewritten - and a rewrite inside a call expression is a syntax
 *   error, which the site turns into `FilterResult=false`, i.e. IT HIDES EVERY ROW.
 *   So the FIRST thing this probe does is run the site's own PrepareFilterCode over the
 *   whole body and compare it byte for byte. If it differs, the probe registers NOTHING,
 *   changes NOTHING, and says exactly where the first difference is.
 *
 * WHAT IT DOES, IN ORDER
 *   0. GATE: mw.PrepareFilterCode(BODY) === BODY ? If not: stop, report, touch nothing.
 *   1. recon: the filter DOM, which QueryWindow* functions exist, the textarea's maxLength
 *      and the size of the code already sitting in the owner's active slot.
 *   2. open the dialog through the ranked opener ladder (the E-073 path). If none works it
 *      STOPS - it never falls back to a console write.
 *   3. write the program into #InputFilterCode, dispatching input+change, and read it back.
 *   4. save through the UI: QueryWindowSaveFilter(), the save button, QueryWindowCheckFilter().
 *   5. read back what actually landed in the slot AND the mirror, byte for byte.
 *   6. boot: one RenderData, then wait for the program's own background tick to publish.
 *      The probe then DISARMS the tick (window.__TSE_SCHED.arm = noop) so that the
 *      measurement below cannot be disturbed by a re-publish, and snapshots the program's
 *      own state: ticks, runs, fingerprint, lastError.
 *   7. execute: install the tallying Proxy over the projection the PROGRAM published, run
 *      RenderData again, and read the verdicts the body actually produced per row - plus
 *      the first/last read timestamps, so the per-row cost is measured rather than assumed.
 *   8. cross-check: for every rendered row, compare the body's verdict against
 *      TseLookup.evaluateRow on the same projection. Two independent paths to the same
 *      answer, so a wiring mistake cannot pass.
 *   9. roll back everything: slot, mirror, FilterNo, the textarea's original value, the
 *      persisted storage, and the program's own page state.
 *
 * PREREQUISITE: none. The program is self-contained; that is the point of it.
 *
 * RUN HERE (always): old.tsetmc.com/Loader.aspx?ParTree=15131F  ->  Console (F12)
 *   tag: [کنسول] — this ONE file, nothing else. It opens the filter dialog itself.
 *   Send back the single PROBE_JSON line.
 *
 * SPDX-License-Identifier: Smart-FFA-1.1
 */
(function aProgramLive() {
  'use strict';

  // E-058: RenderData is not synchronous with respect to the filter - the body starts
  // running about 1.25s after the call returns. Wait well past that.
  var RENDER_WAIT = 2600;
  var POLL_MS = 260;
  var BOOT_WAIT = 3000;
  // The owner can paste while the page is still building its toolbar, and every opener then
  // finds nothing to click. The same probe that had just succeeded reported
  // textarea-unavailable nine minutes later, so the ladder has to be able to WAIT and to
  // RETRY rather than conclude that the page has no filter editor.
  var TOOLBAR_WAIT = 4000;
  var out = {
    meta: {
      test: 'A-PROGRAM-LIVE-v1', gate: 'G-32', evidenceId: 'E-075',
      host: (typeof location !== 'undefined') ? location.host : 'unknown',
      parTree: '15131F', capturedAt: new Date().toISOString(),
      method: 'the site own PrepareFilterCode is run over the whole self-contained body FIRST and compared byte for byte (the safety gate), then the body is written into the filter editor textarea and saved through the UI path, the program is booted by one RenderData and its own background tick, the tick is disarmed, the per-row verdicts are read through a tallying Proxy and cross-checked against TseLookup.evaluateRow, and everything is rolled back'
    },
    preflight: {}, gate: {}, dom: {}, dialog: {}, textarea: {}, save: {}, identity: {},
    boot: {}, execute: {}, crossCheck: {}, body: {}, rollback: {},
    errors: [], status: 'unknown', verdict: '', path: null
  };

  var mw = (typeof window !== 'undefined') ? window.mw : null;
  if (!mw) {
    out.status = 'no-page-object';
    out.verdict = 'window.mw is not on this page - open the market watch (ParTree 15131F) and run this probe there. Nothing was changed.';
    say(out); return;
  }

  // ---------- the program, embedded verbatim by the builder ----------
  // tools/buildProgramProbe.v1.js replaces the single token below with the contents of
  // build/filterProgram.v1.js as a JSON string literal, so no escaping can go wrong.
  // The token is unique in this file; the build fails if it is not found exactly once.
  var BODY = "/*\n * tseZharfaKavosh - the whole program as one filter body (self-contained).\n *\n * Paste this into the site's filter textarea (the filter dialog's code field)\n * and save it. Nothing else is needed: no console step, and it re-arms itself\n * after every page reload because the code lives in the filter slot.\n *\n * How it works\n *   - the engine is built ONCE and cached on the page object; the body is\n *     eval'd once per row, so per-row work is a bitset lookup (~1-2 us).\n *   - a background tick runs the engine OUTSIDE RenderData and publishes the\n *     projection the per-row code reads. B never runs inside the render.\n *   - the engine is rebuilt whenever the UX configuration hash changes, because\n *     funnelConfig is captured when the engine is created; a settings change\n *     that only moved the hash would otherwise leave the old behaviour in place.\n *   - staleness is a fingerprint over the fields the funnel reads, because the\n *     engine's own snapshotId is RoundNo + symbol count and cannot see a price\n *     change that keeps the same rows.\n *   - every guard is fail-open: a missing or partial projection returns true,\n *     so a row is never hidden because of us. The body never throws, because\n *     the site is fail-CLOSED on exception.\n *\n * The verdict is the COMPLETION VALUE of this body: the site assigns\n *   FilterResult = eval(mw.FilterCode)\n * and hides the row when it is falsy. That is why the last statement is the\n * IIFE call itself and why the fail-open paths return true, not undefined\n * (E-074: the previous body hid every fail-open row for exactly that reason).\n *\n * UX settings (all 16 funnel variables) are read from the settings module's own\n * storage key on every tick, so changing a value takes effect on the next tick\n * with no re-paste. The settings module takes its storage as an ARGUMENT\n * (load(storage, key)) and does not auto-detect it, so the page's localStorage is\n * passed explicitly: calling load() with no argument silently returns the\n * defaults forever, which is the defect the first build of this program had.\n */\n(function () {\n  var W = (typeof window !== 'undefined') ? window : globalThis;\n  if (!W.__TSE_PROGRAM) {\n    W.__TSE_PROGRAM = (function (global) {\n\n'use strict';\nvar __registry = {};\nfunction __req(id) {\n  var m = __registry[id];\n  if (!m) throw new Error('tseEngine bundle: unknown module ' + id);\n  return m.exports;\n}\nfunction __def(id, factory) {\n  var module = { exports: {} };\n  __registry[id] = module;\n  factory(module, module.exports);\n  return module.exports;\n}\n\n__def(\"jalaliCalendar\", function (module) {\nconst J_MONTH_DAYS = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29];\nconst J_EPOCH_JDN = 2305527;\nfunction gregToJDN(y, m, d) {\n  const a = Math.floor((14 - m) / 12), y2 = y + 4800 - a, m2 = m + 12 * a - 3;\n  return d + Math.floor((153 * m2 + 2) / 5) + 365 * y2 + Math.floor(y2 / 4) -\n         Math.floor(y2 / 100) + Math.floor(y2 / 400) - 32045;\n}\nfunction jdnToGreg(j) {\n  const a = j + 32044, b = Math.floor((4 * a + 3) / 146097), c = a - Math.floor(146097 * b / 4);\n  const d = Math.floor((4 * c + 3) / 1461), e = c - Math.floor(1461 * d / 4);\n  const m = Math.floor((5 * e + 2) / 153);\n  return { y: 100 * b + d - 4800 + Math.floor(m / 10), m: m + 3 - 12 * Math.floor(m / 10),\n           d: e - Math.floor((153 * m + 2) / 5) + 1 };\n}\nfunction jalaliToJDN(jy, jm, jd) {\n  const jy1 = jy - 979;\n  let j = 365 * jy1 + Math.floor(jy1 / 33) * 8 + Math.floor((jy1 % 33 + 3) / 4);\n  for (let i = 0; i < jm - 1; i++) j += J_MONTH_DAYS[i];\n  return J_EPOCH_JDN + j + jd - 1;\n}\nfunction jdnToJalali(j) {\n  let jy = 979 + Math.floor((j - J_EPOCH_JDN) / 366);\n  while (jalaliToJDN(jy, 1, 1) > j) jy--;\n  while (jalaliToJDN(jy + 1, 1, 1) <= j) jy++;\n  let days = j - jalaliToJDN(jy, 1, 1);\n  let jm = 1;\n  while (jm < 12 && days >= J_MONTH_DAYS[jm - 1]) { days -= J_MONTH_DAYS[jm - 1]; jm++; }\n  return { jy: jy, jm: jm, jd: days + 1 };\n}\nfunction daysToExpiry(expiryStr, todayJDN) {\n  const m = String(expiryStr || '').match(/^(\\d{4})\\/(\\d{2})\\/(\\d{2})$/);\n  if (!m) return null;\n  const jm = +m[2], jd = +m[3];\n  if (jm < 1 || jm > 12 || jd < 1 || jd > 31) return null;\n  return jalaliToJDN(+m[1], jm, jd) - todayJDN;\n}\nfunction localDateToJDN(d) {\n  const t = d || new Date();\n  return gregToJDN(t.getFullYear(), t.getMonth() + 1, t.getDate());\n}\nfunction createCalendar() {\n  return function calendar(expiry, nowMs) {\n    const todayJDN = localDateToJDN(nowMs ? new Date(nowMs) : new Date());\n    return daysToExpiry(expiry, todayJDN);\n  };\n}\nconst VERSION = '0.1.0-jalaliCalendar-001';\nmodule.exports = { gregToJDN, jdnToGreg, jalaliToJDN, jdnToJalali, daysToExpiry,\n                   localDateToJDN, createCalendar, VERSION };\nif (typeof window !== 'undefined') {\n  window.TseCalendar = { gregToJDN, jdnToGreg, jalaliToJDN, jdnToJalali, daysToExpiry,\n                         localDateToJDN, createCalendar, VERSION };\n}\n});\n\n__def(\"optionParser\", function (module) {\nfunction parseOptionLabel(row) {\n  if (!row || typeof row !== 'object') return { status: 'unknown', reason: 'row not object', raw: row };\n  const l18 = String(row.l18 || '').trim();\n  const l30 = String(row.l30 || '').trim();\n  const inscode = String(row.inscode || row.InsCode || '');\n  if (!l18 || !l30) return { status: 'unknown', reason: 'missing l18/l30', raw: { l18, l30 } };\n  const first = l18.charAt(0);\n  const isCallPrefix = first === 'ض';\n  const isPutPrefix  = first === 'ط';\n  if (!isCallPrefix && !isPutPrefix) {\n    return { status: 'rejected', reason: 'l18 does not start with ض/ط', raw: { l18, l30 } };\n  }\n  const l30norm = l30.replace(/ي/g, 'ی').replace(/ك/g, 'ک');\n  const hasEkhtiar = l30norm.indexOf('اختیار') !== -1 || l30.indexOf('اختيار') !== -1;\n  if (!hasEkhtiar) {\n    return { status: 'unknown', reason: 'l30 missing اختیار', raw: { l18, l30 } };\n  }\n  let kind = null;\n  if (l30norm.indexOf('اختیارخ') !== -1 || l30.indexOf('اختيارخ') !== -1) kind = 'call';\n  else if (l30norm.indexOf('اختیارف') !== -1 || l30.indexOf('اختيارف') !== -1) kind = 'put';\n  else kind = isCallPrefix ? 'call' : 'put';\n  let strike = null;\n  let expiry = null;\n  let underlying = null;\n  const dashParts = l30.split('-');\n  if (dashParts.length >= 2) {\n    const last = dashParts[dashParts.length - 1].trim();\n    const dateMatch = last.match(/^(\\d{4}\\/\\d{2}\\/\\d{2}|\\d{8})$/);\n    if (dateMatch) {\n      expiry = dateMatch[1];\n      if (/^\\d{8}$/.test(expiry)) expiry = expiry.slice(0,4)+'/'+expiry.slice(4,6)+'/'+expiry.slice(6,8);\n      const strikeStr = dashParts[dashParts.length - 2].trim();\n      const m = strikeStr.match(/(\\d[\\d,]*)/);\n      if (m) strike = parseInt(m[1].replace(/,/g,''),10);\n      const before = dashParts.slice(0, dashParts.length - 2).join('-');\n      const undMatch = before.match(/اختیار[خف]\\s+(.+)/) || before.match(/اختيار[خف]\\s+(.+)/);\n      if (undMatch) underlying = undMatch[1].trim();\n      else {\n        const tokens = before.trim().split(/\\s+/);\n        underlying = tokens[tokens.length - 1] || null;\n      }\n    }\n  }\n  if (strike !== null && expiry) {\n    return { status: 'confirmed', kind, underlying, strike, expiry, raw: { l18, l30, inscode } };\n  }\n  return { status: 'candidate', kind, underlying: underlying || null, strike, expiry, raw: { l18, l30, inscode }, reason: 'strike/expiry parse incomplete — pattern fallback' };\n}\nif (typeof module !== 'undefined' && module.exports) module.exports = { parseOptionLabel, version: '0.1.0' };\nif (typeof window !== 'undefined') window.tseZharfaKavosh_parseOptionLabel = parseOptionLabel;\n});\n\n__def(\"greeks\", function (module) {\nfunction normCDF(x) {\n  const a1=0.254829592, a2=-0.284496736, a3=1.421413741, a4=-1.453152027, a5=1.061405429, p=0.3275911;\n  const sign = x < 0 ? -1 : 1;\n  x = Math.abs(x) / Math.sqrt(2);\n  const t = 1.0 / (1.0 + p * x);\n  const y = 1.0 - (((((a5*t + a4)*t) + a3)*t + a2)*t + a1)*t * Math.exp(-x*x);\n  return 0.5 * (1.0 + sign * y);\n}\nfunction normPDF(x){ return Math.exp(-0.5*x*x)/Math.sqrt(2*Math.PI); }\nfunction d1(S,K,T,r,sigma){ return (Math.log(S/K)+(r+0.5*sigma*sigma)*T)/(sigma*Math.sqrt(T)); }\nfunction d2(S,K,T,r,sigma){ return d1(S,K,T,r,sigma)-sigma*Math.sqrt(T); }\nfunction bsGreeks(p){\n  const {S,K,T,r,sigma,kind}=p;\n  if([S,K,T,r,sigma].some(v=> v==null || typeof v!=='number' || !isFinite(v))) return { error:'insufficient-data', reason:'missing S/K/T/r/sigma' };\n  if(S<=0||K<=0||T<=0||sigma<=0) return { error:'insufficient-data', reason:'non-positive S/K/T/sigma' };\n  if(kind!=='call' && kind!=='put') return { error:'invalid-kind' };\n  const _d1=d1(S,K,T,r,sigma), _d2=d2(S,K,T,r,sigma);\n  const Nd1=normCDF(_d1), Nd2=normCDF(_d2), Nmd1=normCDF(-_d1), Nmd2=normCDF(-_d2);\n  const pdfd1=normPDF(_d1);\n  const sqrtT=Math.sqrt(T);\n  let price, delta, gamma, vega, theta, rho;\n  if(kind==='call'){\n    price = S*Nd1 - K*Math.exp(-r*T)*Nd2;\n    delta = Nd1;\n    rho = K*T*Math.exp(-r*T)*Nd2/100; \n  } else {\n    price = K*Math.exp(-r*T)*Nmd2 - S*Nmd1;\n    delta = Nd1 - 1;\n    rho = -K*T*Math.exp(-r*T)*Nmd2/100;\n  }\n  gamma = pdfd1/(S*sigma*sqrtT);\n  vega = S*pdfd1*sqrtT/100; \n  const term1 = -(S*pdfd1*sigma)/(2*sqrtT);\n  if(kind==='call'){\n    theta = (term1 - r*K*Math.exp(-r*T)*Nd2)/365; \n  } else {\n    theta = (term1 + r*K*Math.exp(-r*T)*Nmd2)/365;\n  }\n  return { price, delta, gamma, vega, theta, rho, d1:_d1, d2:_d2 };\n}\nfunction impliedVol(p){\n  const {S,K,T,r,kind,marketPrice}=p;\n  if([S,K,T,r,marketPrice].some(v=> v==null || !isFinite(v))) return { error:'insufficient-data' };\n  let low=0.01, high=3.0, mid, price, iter=0;\n  let lowPrice=bsGreeks({S,K,T,r,sigma:low,kind}).price;\n  let highPrice=bsGreeks({S,K,T,r,sigma:high,kind}).price;\n  if(marketPrice < Math.min(lowPrice,highPrice) || marketPrice > Math.max(lowPrice,highPrice)){\n  }\n  for(iter=0; iter<100; iter++){\n    mid=(low+high)/2;\n    price=bsGreeks({S,K,T,r,sigma:mid,kind}).price;\n    if(Math.abs(price-marketPrice) < 1e-6) break;\n    if(price > marketPrice) high=mid; else low=mid;\n    if(high-low < 1e-7) break;\n  }\n  return { sigma:mid, iterations: iter, price: bsGreeks({S,K,T,r,sigma:mid,kind}).price };\n}\nconst VERSION='0.1.0-greeks-001';\nmodule.exports={ normCDF, normPDF, bsGreeks, impliedVol, VERSION };\nif(typeof window!=='undefined') window.TseGreeks={ normCDF, normPDF, bsGreeks, impliedVol, VERSION };\n});\n\n__def(\"aLookup\", function (module) {\nconst VERSION = '0.1.0-aLookup-001';\nconst FILTER_CODE_LIMIT = 4096;\nfunction evaluateRow(row, published) {\n  if (!published || !published.ok || !published.index || !published.bitset || !published.known) return true;\n  if (!row) return true;\n  const inscode = (row.inscode !== undefined && row.inscode !== null) ? String(row.inscode)\n    : (row.InsCode !== undefined && row.InsCode !== null ? String(row.InsCode) : '');\n  if (!inscode) return true;                       \n  const pos = published.index[inscode];\n  if (pos === undefined) return true;              \n  const byteIdx = pos >> 3;                        \n  const mask = 1 << (pos & 7);                     \n  if (byteIdx < 0 || byteIdx >= published.known.length) return true;\n  if (byteIdx >= published.bitset.length) return true;\n  if (!((published.known[byteIdx] & mask) !== 0 ? 1 : 0)) return true; \n  return ((published.bitset[byteIdx] & mask) !== 0);\n}\nfunction buildFilterCodeBody() {\n  return [\n    '// tseZharfaKavosh A lookup ' + VERSION + ' — reads only B published projection',\n    '// The site does FilterResult = eval(mw.FilterCode): the COMPLETION VALUE of this',\n    '// body IS the verdict. Every fail-open exit below must therefore evaluate to true,',\n    '// never to undefined - a script ending in an if that did not run its last',\n    '// assignment completes with undefined, and !undefined hides the row (E-074).',\n    'var FilterResult = true;',\n    'var __i = mw.__B_index;',\n    'if (__i && mw.__B_known && mw.__B_bitset && row) {',\n    '  var __p = __i[row.inscode];',\n    '  if (__p !== undefined) {',\n    '    var __b = __p >> 3, __m = __p & 7;',\n    '    if (__b >= 0 && __b < mw.__B_known.length && __b < mw.__B_bitset.length && (mw.__B_known[__b] >> __m) & 1) {',\n    '      FilterResult = !!((mw.__B_bitset[__b] >> __m) & 1);',\n    '    }',\n    '  }',\n    '}',\n    'FilterResult;'\n  ].join('\\n');\n}\nfunction buildFilterCode() {\n  const body = buildFilterCodeBody();\n  const bytes = body.length;\n  return { body: body, bytes: bytes, limit: FILTER_CODE_LIMIT, fits: bytes <= FILTER_CODE_LIMIT, version: VERSION };\n}\nfunction capacityCheck(source, limit) {\n  const lim = (typeof limit === 'number') ? limit : FILTER_CODE_LIMIT;\n  const bytes = (typeof source === 'string') ? source.length : 0;\n  return { limit: lim, bytes: bytes, fits: bytes > 0 && bytes <= lim };\n}\nfunction compileFilterCodeBody(body) {\n  const src = (typeof body === 'string' && body.length) ? body : buildFilterCodeBody();\n  return new Function('row', 'mw', src + '\\nreturn FilterResult;');\n}\nmodule.exports = { evaluateRow, buildFilterCodeBody, buildFilterCode, capacityCheck, compileFilterCodeBody, VERSION, FILTER_CODE_LIMIT };\nif (typeof window !== 'undefined') window.TseALookup = { evaluateRow, buildFilterCodeBody, buildFilterCode, capacityCheck, compileFilterCodeBody, VERSION, FILTER_CODE_LIMIT };\n});\n\n__def(\"bEngine\", function (module) {\nconst VERSION = '0.1.0-bEngine-001';\nconst IV_SOLVER_MIN = 0.01;\nconst IV_SOLVER_MAX = 3.0;\nconst MARKET_PRICE_SOURCES = ['hybrid', 'pl', 'pc', 'plc', 'pcp', 'plp', 'pd1', 'bidAskMid'];\nconst UNDERLYING_SOURCES = ['underlyingMap', 'rowPl', 'none'];\nconst UNDERLYING_PRICE_FIELDS = ['pc', 'pl', 'pd1', 'po1', 'bidAskMid'];\nconst DIRTY_FIELDS = ['pl', 'plc', 'l18', 'l30', 'tvol', 'tno', 'pcp'];\nconst INDEX_SAMPLE = 16;\nconst CAL = __req('jalaliCalendar');\nconst DEFAULT_FUNNEL_CONFIG = {\n  TMode: 'dte',               \n  T: 30 / 365,                \n  r: 0.30,                 \n  ivMin: 0.05,               \n  ivMax: 2.5,                \n  deltaMin: 0.3,           \n  gammaMin: 1e-4,          \n  useDeltaGamma: false,\n  ivFilterEnabled: true,\n  marketPriceFrom: 'hybrid',        \n  underlyingFrom: 'underlyingMap', \n  underlyingPriceField: 'pc',      \n  legacyV9Mapping: false,\n  checkArbitrageBounds: true,   \n  maxSpreadPct: 0.20,           \n  pinFailOpen: true             \n};\nconst V9_FUNNEL_CONFIG = {\n  r: 0.2,\n  marketPriceFrom: 'plc',\n  underlyingFrom: 'rowPl',\n  legacyV9Mapping: true\n};\nfunction inscodeOf(row) {\n  if (!row) return '';\n  if (row.inscode !== undefined && row.inscode !== null && row.inscode !== '') return String(row.inscode);\n  if (row.InsCode !== undefined && row.InsCode !== null && row.InsCode !== '') return String(row.InsCode);\n  return '';\n}\nfunction toNum(v) {\n  if (v === null || v === undefined || v === '') return null;\n  const n = parseFloat(v);\n  return (typeof n === 'number' && isFinite(n)) ? n : null;\n}\nfunction setBit(bytes, pos, value) {\n  const byteIdx = (pos / 8) | 0;\n  const mask = 1 << (pos % 8);\n  if (value) bytes[byteIdx] |= mask; else bytes[byteIdx] &= ~mask;\n}\nfunction getBit(bytes, pos) {\n  return (bytes[(pos / 8) | 0] >> (pos % 8)) & 1;\n}\nfunction normalizeRows(rows) {\n  if (!rows) return [];\n  if (Array.isArray(rows)) return rows;\n  if (typeof rows === 'object') {\n    const out = [];\n    for (const k in rows) if (Object.prototype.hasOwnProperty.call(rows, k)) out.push(rows[k]);\n    return out;\n  }\n  return [];\n}\nfunction buildUnderlyingMap(list, field) {\n  const priceField = field || 'pc';\n  const map = Object.create(null);\n  for (let i = 0; i < list.length; i++) {\n    const r = list[i];\n    if (!r) continue;\n    const l18 = String(r.l18 || '').trim();\n    if (!l18 || l18.length > 12) continue;\n    const first = l18.charAt(0);\n    if (first === '\\u0636' || first === '\\u0637') continue; \n    const price = toNum(r[priceField]);\n    if (price !== null && price > 0 && map[l18] === undefined) map[l18] = price;\n  }\n  return map;\n}\nfunction createScheduler() {\n  if (typeof requestIdleCallback === 'function') {\n    return function (fn) {\n      requestIdleCallback(function () { fn(); }, { timeout: 500 });\n    };\n  }\n  if (typeof setTimeout === 'function') return function (fn) { setTimeout(fn, 0); };\n  return function (fn) { fn(); };\n}\nfunction marketPriceProblem(row, S, K, T, r, kind, marketPrice, cfg, fromBook) {\n  if (!cfg || cfg.checkArbitrageBounds !== false) {\n    const disc = Math.exp(-r * T);\n    let lo, hi;\n    if (kind === 'put') { lo = Math.max(0, K * disc - S); hi = K * disc; }\n    else { lo = Math.max(0, S - K * disc); hi = S; }\n    if (marketPrice < lo - 1 || marketPrice > hi + 1) return 'price-outside-arbitrage-bounds';\n  }\n  const bid = toNum(row && row.pd1);\n  const ask = toNum(row && row.po1);\n  const maxSpread = (cfg && typeof cfg.maxSpreadPct === 'number') ? cfg.maxSpreadPct : 0.20;\n  if (fromBook !== false && bid !== null && ask !== null && bid > 0 && ask > bid && maxSpread > 0) {\n    const mid = (bid + ask) / 2;\n    if (mid > 0 && (ask - bid) / mid > maxSpread) return 'book-too-wide';\n  }\n  return null;\n}\nfunction normalizeFunnelConfig(cfg) {\n  const out = Object.assign({}, DEFAULT_FUNNEL_CONFIG);\n  const c = cfg || {};\n  const num = function (key, min, max) {\n    const v = c[key];\n    if (typeof v !== 'number' || !isFinite(v) || v < min || v > max) return out[key];\n    return v;\n  };\n  const bool = function (key) {\n    return c[key] === undefined ? out[key] : c[key] === true;\n  };\n  out.T = num('T', 0, 10);                 \n  out.r = num('r', 0, 5);                  \n  out.ivMin = num('ivMin', IV_SOLVER_MIN, IV_SOLVER_MAX);\n  out.ivMax = num('ivMax', IV_SOLVER_MIN, IV_SOLVER_MAX);\n  out.deltaMin = num('deltaMin', 0, 1);\n  out.gammaMin = num('gammaMin', 0, 1);\n  out.ivFilterEnabled = bool('ivFilterEnabled');\n  out.useDeltaGamma = bool('useDeltaGamma');\n  out.legacyV9Mapping = bool('legacyV9Mapping');\n  out.checkArbitrageBounds = bool('checkArbitrageBounds');\n  out.pinFailOpen = bool('pinFailOpen');\n  out.TMode = (c.TMode === 'dte' || c.TMode === 'fixed') ? c.TMode : out.TMode;\n  out.maxSpreadPct = num('maxSpreadPct', 0, 1);\n  if (!(out.ivMin < out.ivMax)) {\n    out.ivMin = DEFAULT_FUNNEL_CONFIG.ivMin;\n    out.ivMax = DEFAULT_FUNNEL_CONFIG.ivMax;\n  }\n  if (typeof c.marketPriceFrom === 'string' && MARKET_PRICE_SOURCES.indexOf(c.marketPriceFrom) >= 0) {\n    out.marketPriceFrom = c.marketPriceFrom;\n  }\n  if (typeof c.underlyingFrom === 'string' && UNDERLYING_SOURCES.indexOf(c.underlyingFrom) >= 0) {\n    out.underlyingFrom = c.underlyingFrom;\n  }\n  if (typeof c.underlyingPriceField === 'string' && UNDERLYING_PRICE_FIELDS.indexOf(c.underlyingPriceField) >= 0) {\n    out.underlyingPriceField = c.underlyingPriceField;\n  }\n  return out;\n}\nfunction createBEngine(options) {\n  const opts = options || {};\n  const models = opts.models || {};\n  const calendar = (typeof opts.calendar === 'function') ? opts.calendar : CAL.createCalendar();\n  let funnel = normalizeFunnelConfig(opts.funnelConfig);\n  if (opts.legacyV9Mapping === true || funnel.legacyV9Mapping === true) {\n    funnel = Object.assign({}, funnel, V9_FUNNEL_CONFIG);\n  }\n  const dirtyFields = Array.isArray(opts.dirtyFields) && opts.dirtyFields.length ? opts.dirtyFields.slice() : DIRTY_FIELDS;\n  const strictIndex = opts.strictIndex === true;\n  const scheduler = opts.scheduler || createScheduler();\n  const now = opts.now || (typeof performance !== 'undefined' && performance.now\n    ? function () { return performance.now(); }\n    : function () { return Date.now(); });\n  const nowEpoch = (typeof opts.nowEpoch === 'function') ? opts.nowEpoch\n    : (typeof Date.now === 'function' ? function () { return Date.now(); } : now);\n  const state = {\n    symbols: [],                 \n    index: Object.create(null),  \n    rowIndex: Object.create(null), \n    bitset: new Uint8Array(0),   \n    known: new Uint8Array(0),    \n    prevRows: Object.create(null), \n    underlyingMap: Object.create(null), \n    snapshotId: null,\n    configHash: null,\n    configVersion: 0,\n    totalRuns: 0,\n    indexRebuilds: 0,\n    indexCacheHits: 0,\n    lastDirtyCount: 0,\n    lastComputed: 0,\n    lastUnknown: 0,\n    lastError: null,\n    lastHookError: null,\n    meta: null\n  };\n  function buildIndex(rows) {\n    const list = normalizeRows(rows);\n    const symbols = [];\n    const index = Object.create(null);\n    const rowIndex = Object.create(null);\n    for (let i = 0; i < list.length; i++) {\n      const inscode = inscodeOf(list[i]);\n      if (!inscode || index[inscode] !== undefined) continue; \n      index[inscode] = symbols.length;\n      rowIndex[inscode] = list[i];\n      symbols.push( inscode );   \n    }\n    let changed = false;\n    if (symbols.length !== state.symbols.length) changed = true;\n    else for (let i = 0; i < symbols.length; i++) if (symbols[i] !== state.symbols[i]) { changed = true; break; }\n    state.symbols = symbols;\n    state.index = index;\n    state.rowIndex = rowIndex;\n    state.indexRebuilds++;\n    if (funnel.underlyingFrom === 'underlyingMap') state.underlyingMap = buildUnderlyingMap(list, funnel.underlyingPriceField);\n    if (changed) {\n      state.bitset = new Uint8Array(Math.ceil(symbols.length / 8));\n      state.known = new Uint8Array(Math.ceil(symbols.length / 8));\n      state.prevRows = Object.create(null);\n    }\n    return { changed: changed, count: symbols.length };\n  }\n  function indexStillValid(list) {\n    if (list.length !== state.symbols.length) return false;\n    const step = Math.max(1, Math.floor(list.length / INDEX_SAMPLE));\n    for (let i = 0; i < list.length; i += step) {\n      const inscode = inscodeOf(list[i]);\n      if (!inscode || state.index[inscode] === undefined) return false;\n    }\n    return true;\n  }\n  function ensureIndex(rows) {\n    const list = normalizeRows(rows);\n    if (!strictIndex && state.symbols.length > 0 && indexStillValid(list)) {\n      state.indexCacheHits++;\n      return { changed: false, count: state.symbols.length, cached: true };\n    }\n    return buildIndex(list);\n  }\n  function detectDirty(rows) {\n    const list = normalizeRows(rows);\n    const dirty = [];\n    const rowMap = Object.create(null);\n    const prev = state.prevRows;\n    for (let i = 0; i < list.length; i++) {\n      const r = list[i];\n      const inscode = inscodeOf(r);\n      if (!inscode) continue;\n      const p = prev[inscode];\n      let isDirty = false;\n      if (!p) isDirty = true;\n      else {\n        for (let f = 0; f < dirtyFields.length; f++) {\n          if (p[dirtyFields[f]] !== r[dirtyFields[f]]) { isDirty = true; break; }\n        }\n      }\n      if (isDirty) { dirty.push( inscode ); rowMap[inscode] = r; }   \n    }\n    return { dirty: dirty, rowMap: rowMap, count: dirty.length };\n  }\n  function commitDirty(rowMap) {\n    const prev = state.prevRows;\n    for (const k in rowMap) {\n      if (!Object.prototype.hasOwnProperty.call(rowMap, k)) continue;\n      const r = rowMap[k];\n      const snap = {};\n      for (let f = 0; f < dirtyFields.length; f++) snap[dirtyFields[f]] = r[dirtyFields[f]];\n      prev[k] = snap;\n    }\n  }\n  function needsRun(snapshotId, configHash) {\n    if (state.snapshotId === null || state.configHash === null) return true; \n    if (snapshotId !== state.snapshotId) return true;\n    if (configHash !== state.configHash) return true;\n    return false;\n  }\n  function computeSnapshotId(mwLike) {\n    const roundNo = mwLike && mwLike.RoundNo !== undefined ? mwLike.RoundNo : 0;\n    const count = mwLike && mwLike.AllRows ? Object.keys(mwLike.AllRows).length : 0;\n    return 'snap-' + roundNo + '-' + count;\n  }\n  function computeConfigHash(mwLike) {\n    const version = (mwLike && mwLike.__B_configVersion !== undefined) ? mwLike.__B_configVersion : state.configVersion;\n    const fc = mwLike && mwLike.FilterCode ? String(mwLike.FilterCode) : '';\n    return version + '-' + fc.length;\n  }\n  function resolveMarketPrice(row, S, K, T, kind) {\n    const src = funnel.marketPriceFrom;\n    if (src !== 'hybrid') {\n      let price = null;\n      if (src === 'bidAskMid') {\n        const bid = toNum(row.pd1), ask = toNum(row.po1);\n        if (bid !== null && ask !== null && bid > 0 && ask > 0) price = (bid + ask) / 2;\n      } else {\n        price = toNum(row[src]);\n      }\n      if (price === null || price <= 0) return { ok: false, reason: 'missing market price' };\n      const problem = marketPriceProblem(row, S, K, T, funnel.r, kind, price, funnel, true);\n      if (problem) return { ok: false, reason: problem };\n      return { ok: true, price: price, source: src };\n    }\n    let blocked = 'no usable market price';\n    const bid = toNum(row.pd1), ask = toNum(row.po1);\n    if (bid !== null && ask !== null && bid > 0 && ask > 0) {\n      const mid = (bid + ask) / 2;\n      const problem = marketPriceProblem(row, S, K, T, funnel.r, kind, mid, funnel, true);\n      if (!problem) return { ok: true, price: mid, source: 'mid' };\n      blocked = problem;\n    }\n    const trades = toNum(row.tno);\n    const last = toNum(row.pl);\n    if (trades !== null && trades > 0 && last !== null && last > 0) {\n      const problem = marketPriceProblem(row, S, K, T, funnel.r, kind, last, funnel, false);\n      if (!problem) return { ok: true, price: last, source: 'pl-traded' };\n      return { ok: false, reason: problem };   \n    }\n    return { ok: false, reason: blocked };\n  }\n  function resolveUnderlying(row, parsed) {\n    if (funnel.underlyingFrom === 'rowPl') return toNum(row.pl);       \n    if (funnel.underlyingFrom === 'none') return null;\n    const name = parsed && parsed.underlying ? String(parsed.underlying).trim() : '';\n    if (!name) return null;\n    const price = state.underlyingMap[name];\n    return (price === undefined) ? null : price;\n  }\n  function resolveT(parsed) {\n    if (funnel.TMode !== 'dte') return { ok: true, T: funnel.T };\n    if (!calendar) return { ok: false, reason: 'no calendar available' };\n    const expiry = parsed && parsed.expiry ? String(parsed.expiry) : '';\n    if (!expiry) return { ok: false, reason: 'no expiry on the parsed label' };\n    let dte = null;\n    try { dte = calendar(expiry, nowEpoch()); } catch (e) { return { ok: false, reason: 'calendar failed' }; }\n    if (dte === null || !isFinite(dte) || dte <= 0) return { ok: false, reason: 'no usable maturity' };\n    return { ok: true, T: dte / 365 };\n  }\n  function computeFunnel(row, parsed) {\n    try {\n      if (!row || typeof row !== 'object') return { status: 'error', reason: 'row not object' };\n      if (!parsed || parsed.status !== 'confirmed') return { status: 'insufficient-data', reason: 'not a confirmed option' };\n      const S = resolveUnderlying(row, parsed);\n      const K = toNum(parsed.strike);\n      if (S === null || K === null) return { status: 'insufficient-data', reason: 'missing S/K' };\n      const tRes = resolveT(parsed);\n      if (!tRes.ok) return { status: 'insufficient-data', reason: tRes.reason };\n      const T = tRes.T;\n      const kind = (parsed.kind === 'put') ? 'put' : 'call';\n      const resolved = resolveMarketPrice(row, S, K, T, kind);\n      if (!resolved.ok) return { status: 'insufficient-data', reason: resolved.reason };\n      const marketPrice = resolved.price;\n      if (typeof models.impliedVol !== 'function' || typeof models.bsGreeks !== 'function') {\n        return { status: 'error', reason: 'models not injected' };\n      }\n      const iv = models.impliedVol({ S: S, K: K, T: T, r: funnel.r, kind: kind, marketPrice: marketPrice });\n      const inputs = { S: S, K: K, marketPrice: marketPrice, marketPriceSource: resolved.source, T: T, r: funnel.r, kind: kind };\n      if (!funnel.ivFilterEnabled) {\n        const ivOk = iv && !iv.error && iv.sigma !== undefined && iv.sigma !== null && isFinite(iv.sigma);\n        return {\n          status: 'ok', pass: true, reason: 'iv-filter-disabled-open-bug',\n          ivStatus: 'iv-filter-disabled',\n          iv: ivOk ? iv.sigma : null,\n          atBoundary: ivOk ? (iv.sigma <= 0.0100001 || iv.sigma >= 2.9999999) : null,\n          iterations: ivOk ? iv.iterations : null,\n          inputs: inputs\n        };\n      }\n      if (!iv || iv.error || iv.sigma === undefined || iv.sigma === null || !isFinite(iv.sigma)) {\n        return { status: 'insufficient-data', reason: 'iv failed' };\n      }\n      const g = models.bsGreeks({ S: S, K: K, T: T, r: funnel.r, sigma: iv.sigma, kind: kind });\n      if (!g || g.error) return { status: 'insufficient-data', reason: 'greeks failed' };\n      const atBoundary = (iv.sigma <= 0.0100001 || iv.sigma >= IV_SOLVER_MAX - 1e-6);\n      let pass = (iv.sigma > funnel.ivMin) && (iv.sigma < funnel.ivMax);\n      if (pass && funnel.useDeltaGamma === true) {\n        pass = (Math.abs(g.delta) > funnel.deltaMin) && (g.gamma > funnel.gammaMin);\n      }\n      let ivStatus;\n      if (atBoundary) { ivStatus = 'no-iv-solution'; if (funnel.pinFailOpen) pass = true; }\n      else if (pass) ivStatus = 'ok';\n      else ivStatus = 'fail-iv-range';\n      return {\n        status: 'ok', pass: pass, delta: g.delta, gamma: g.gamma,\n        iv: iv.sigma, iterations: iv.iterations, atBoundary: atBoundary,\n        reason: ivStatus,\n        ivStatus: ivStatus,\n        inputs: inputs\n      };\n    } catch (e) {\n      return { status: 'error', reason: String((e && e.message) || e) };\n    }\n  }\n  function run(rows, snapshotId, configHash) {\n    const t0 = now();\n    if (!needsRun(snapshotId, configHash)) {\n      return { published: false, reason: 'no-change', dirtyCount: 0, elapsedMs: now() - t0, runs: state.totalRuns };\n    }\n    const idx = ensureIndex(rows);\n    const d = detectDirty(rows);\n    state.lastDirtyCount = d.count;\n    if (d.count === 0) {\n      state.snapshotId = snapshotId;\n      state.configHash = configHash;\n      return { published: false, reason: 'no-dirty', dirtyCount: 0, elapsedMs: now() - t0, runs: state.totalRuns };\n    }\n    const bytes = state.bitset.length;\n    const nextBitset = new Uint8Array(bytes);\n    const nextKnown = new Uint8Array(bytes);\n    for (let i = 0; i < bytes; i++) { nextBitset[i] = state.bitset[i]; nextKnown[i] = state.known[i]; }\n    let computed = 0, unknown = 0, errors = 0, lastErr = null;\n    for (let i = 0; i < d.dirty.length; i++) {\n      const inscode = d.dirty[i];\n      const pos = state.index[inscode];\n      if (pos === undefined) continue;\n      const row = d.rowMap[inscode]; \n      if (!row) continue;\n      const parsed = (typeof models.parseOptionLabel === 'function') ? models.parseOptionLabel(row) : { status: 'unknown' };\n      const res = computeFunnel(row, parsed);\n      if (res.status === 'error') { errors++; if (!lastErr) lastErr = res.reason; continue; }\n      if (res.status === 'ok') {\n        setBit(nextBitset, pos, res.pass);\n        setBit(nextKnown, pos, true);\n        computed++;\n      } else {\n        setBit(nextKnown, pos, false); \n        unknown++;\n      }\n    }\n    if (errors > 0) {\n      state.lastError = 'funnel errors: ' + errors + ' (' + lastErr + ')';\n      return {\n        published: false, reason: 'error', error: state.lastError,\n        dirtyCount: d.count, computed: computed, unknown: unknown,\n        elapsedMs: now() - t0, runs: state.totalRuns\n      };\n    }\n    state.bitset = nextBitset;\n    state.known = nextKnown;\n    state.snapshotId = snapshotId;\n    state.configHash = configHash;\n    state.totalRuns++;\n    state.lastError = null;\n    state.lastComputed = computed;\n    state.lastUnknown = unknown;\n    state.meta = {\n      snapshotId: snapshotId,\n      configHash: configHash,\n      dirtyCount: d.count,\n      computed: computed,\n      unknown: unknown,\n      totalSymbols: state.symbols.length,\n      bitsetBytes: nextBitset.length,\n      indexChanged: idx.changed,\n      indexCached: idx.cached === true,\n      version: VERSION\n    };\n    commitDirty(d.rowMap);\n    return {\n      published: true, dirtyCount: d.count, computed: computed, unknown: unknown,\n      elapsedMs: now() - t0, runs: state.totalRuns, meta: state.meta\n    };\n  }\n  function runAsync(rows, snapshotId, configHash, cb) {\n    scheduler(function () {\n      let report;\n      try { report = run(rows, snapshotId, configHash); }\n      catch (e) { report = { published: false, reason: 'error', error: String((e && e.message) || e) }; }\n      if (typeof cb === 'function') cb(report);\n    });\n  }\n  function publish(target) {\n    if (!target || typeof target !== 'object') return { published: false, reason: 'no target' };\n    target.__B_symbols = state.symbols;\n    target.__B_index = state.index;\n    target.__B_rowIndex = state.rowIndex;\n    target.__B_bitset = state.bitset;\n    target.__B_known = state.known;\n    target.__B_snapshotId = state.snapshotId;\n    target.__B_configHash = state.configHash;\n    target.__B_configVersion = state.configVersion;\n    target.__B_totalRuns = state.totalRuns;\n    target.__B_meta = state.meta;\n    target.__B_lastError = state.lastError;\n    return { published: true, symbols: state.symbols.length, bitsetBytes: state.bitset.length };\n  }\n  function getPublished() {\n    const ok = state.bitset.length > 0 && state.snapshotId !== null && state.configHash !== null;\n    return {\n      ok: ok,\n      index: state.index,\n      bitset: state.bitset,\n      known: state.known,\n      symbols: state.symbols,\n      meta: state.meta,\n      lastError: state.lastError\n    };\n  }\n  function installHooks(mw, ctx) {\n    if (!mw || typeof mw !== 'object') return { uninstall: function () {} };\n    const context = ctx || (typeof window !== 'undefined' ? window : null);\n    if (typeof mw.__B_configVersion !== 'number') mw.__B_configVersion = state.configVersion;\n    const origSettings = mw.SaveSettings;\n    const origParams = mw.SaveParams;\n    mw.SaveSettings = function () {\n      state.configVersion++;\n      mw.__B_configVersion = state.configVersion;\n      if (typeof origSettings === 'function') {\n        try { return origSettings.apply(context, arguments); }\n        catch (e) { state.lastHookError = 'SaveSettings: ' + String((e && e.message) || e); }\n      }\n      return undefined;\n    };\n    mw.SaveParams = function () {\n      state.configVersion++;\n      mw.__B_configVersion = state.configVersion;\n      if (typeof origParams === 'function') {\n        try { return origParams.apply(context, arguments); }\n        catch (e) { state.lastHookError = 'SaveParams: ' + String((e && e.message) || e); }\n      }\n      return undefined;\n    };\n    return {\n      uninstall: function () {\n        mw.SaveSettings = origSettings;\n        mw.SaveParams = origParams;\n      }\n    };\n  }\n  function reset() {\n    state.symbols = [];\n    state.index = Object.create(null);\n    state.rowIndex = Object.create(null);\n    state.bitset = new Uint8Array(0);\n    state.known = new Uint8Array(0);\n    state.prevRows = Object.create(null);\n    state.underlyingMap = Object.create(null);\n    state.snapshotId = null;\n    state.configHash = null;\n    state.configVersion = 0;\n    state.totalRuns = 0;\n    state.indexRebuilds = 0;\n    state.indexCacheHits = 0;\n    state.lastDirtyCount = 0;\n    state.lastComputed = 0;\n    state.lastUnknown = 0;\n    state.lastError = null;\n    state.lastHookError = null;\n    state.meta = null;\n  }\n  return {\n    VERSION: VERSION,\n    DIRTY_FIELDS: DIRTY_FIELDS,\n    dirtyFields: dirtyFields,\n    funnelConfig: funnel,\n    state: state,\n    buildIndex: buildIndex,\n    ensureIndex: ensureIndex,\n    detectDirty: detectDirty,\n    commitDirty: commitDirty,\n    needsRun: needsRun,\n    computeSnapshotId: computeSnapshotId,\n    computeConfigHash: computeConfigHash,\n    computeFunnel: computeFunnel,\n    run: run,\n    runAsync: runAsync,\n    publish: publish,\n    getPublished: getPublished,\n    installHooks: installHooks,\n    reset: reset,\n    _setBit: setBit,\n    _getBit: getBit,\n    _toNum: toNum,\n    _normalizeRows: normalizeRows,\n    _inscodeOf: inscodeOf\n  };\n}\nmodule.exports = {\n  createBEngine, VERSION, DIRTY_FIELDS, DEFAULT_FUNNEL_CONFIG, V9_FUNNEL_CONFIG,\n  INDEX_SAMPLE, createScheduler, buildUnderlyingMap, normalizeFunnelConfig,\n  marketPriceProblem\n};\nif (typeof window !== 'undefined') window.TseBEngine = {\n  createBEngine, VERSION, DIRTY_FIELDS, DEFAULT_FUNNEL_CONFIG, V9_FUNNEL_CONFIG,\n  INDEX_SAMPLE, createScheduler, buildUnderlyingMap, normalizeFunnelConfig,\n  marketPriceProblem\n};\n});\n\n__def(\"funnelSettings\", function (module) {\n'use strict';\nconst ENG = __req('bEngine');\nconst VERSION = '0.1.0-funnelSettings-001';\nconst STORAGE_KEY = 'tseFunnelSettings.v1';\nconst SCHEMA = [\n  { key: 'TMode', type: 'enum', choices: ['dte', 'fixed'], default: 'dte',\n    label: 'حالت سررسید',\n    help: 'dte = سررسید هرOption از تاریخ انقضای خودش (توصیه‌شده، E-051/E-052). fixed = یک T ثابت برای همه.' },\n  { key: 'T', type: 'number', min: 0, max: 10, step: 1 / 365, default: 30 / 365,\n    displayScale: 365, displayUnit: 'روز', displayMin: 0, displayMax: 3650, displayStep: 1,\n    label: 'سررسید ثابت (روز)',\n    help: 'فقط در حالت fixed استفاده می‌شود. ۳۰ روز مقدار پیش‌فرض.' },\n  { key: 'r', type: 'number', min: 0, max: 5, step: 0.01, default: 0.30,\n    label: 'نرخ بدون ریسک',\n    help: 'سالانه. q4: قابل تغییر توسط کاربر؛ پیش‌فرض ۰.۳۰ از G-11.' },\n  { key: 'ivMin', type: 'number', min: 0.01, max: 3.0, step: 0.01, default: 0.05,\n    label: 'کف IV',\n    help: 'زیر این مقدار IV رد می‌شود (زمان تقریباً صفر). محدود به بازهٔ حل‌کننده [0.01, 3.0].' },\n  { key: 'ivMax', type: 'number', min: 0.01, max: 3.0, step: 0.05, default: 2.5,\n    label: 'سقف IV',\n    help: 'بالای این مقدار IV رد می‌شود. q7: 2.5 (نه 1.0 و نه 3.0).' },\n  { key: 'deltaMin', type: 'number', min: 0, max: 1, step: 0.01, default: 0.3,\n    label: 'کف |delta|',\n    help: 'فقط وقتی «آستانهٔ delta/gamma» روشن است.' },\n  { key: 'gammaMin', type: 'number', min: 0, max: 1, step: 0.0001, default: 1e-4,\n    label: 'کف gamma',\n    help: 'فقط وقتی «آستانهٔ delta/gamma» روشن است.' },\n  { key: 'useDeltaGamma', type: 'bool', default: false,\n    label: 'آستانهٔ delta/gamma',\n    help: 'q5: خاموش. pass فقط IV داخل پنجره است.' },\n  { key: 'ivFilterEnabled', type: 'bool', default: true,\n    label: 'فیلتر IV فعال',\n    help: 'خاموش = محاسبه و برچسب، ولی هیچ ردیفی پنهان نمی‌شود (مرجع تهی برای مقایسه).' },\n  { key: 'marketPriceFrom', type: 'enum',\n    choices: ['hybrid', 'pl', 'pc', 'plc', 'pcp', 'plp', 'pd1', 'bidAskMid'],\n    default: 'hybrid',\n    label: 'منبع قیمت بازار',\n    help: 'hybrid (q8) = میانهٔ دفتر با گاردها، بعد pl وقتی امروز معامله شده، وگرنه هیچ. حالت‌های تک‌منبعی برای مقایسه‌اند.' },\n  { key: 'underlyingFrom', type: 'enum', choices: ['underlyingMap', 'rowPl', 'none'],\n    default: 'underlyingMap',\n    label: 'منبع قیمت زیرمجموعه',\n    help: 'underlyingMap = قیمت از ردیف سهام همان زیرمجموعه (G-11). rowPl = نگاشت v9. none = خاموش.' },\n  { key: 'underlyingPriceField', type: 'enum', choices: ['pc', 'pl', 'pd1', 'po1', 'bidAskMid'],\n    default: 'pc',\n    label: 'فیلد قیمت زیرمجموعه',\n    help: 'کدام فیلد ردیف سهام، قیمت S باشد.' },\n  { key: 'legacyV9Mapping', type: 'bool', default: false,\n    label: 'نگاشت v9 (برای مقایسه)',\n    help: 'رفتار probe قدیمی v9 را بازتولید می‌کند تا دو مسیر قابل مقایسه باشند.' },\n  { key: 'checkArbitrageBounds', type: 'bool', default: true,\n    label: 'گارد باند بدون‌آربیتراژ',\n    help: 'قیمتی بیرون از باند تئوری رد می‌شود. خاموش‌کردنش یعنی پذیرش قیمت‌های غیرممکن.' },\n  { key: 'maxSpreadPct', type: 'number', min: 0, max: 1, step: 0.01, default: 0.20,\n    displayUnit: '٪', displayScale: 100,\n    label: 'حداکثر اسپرد دفتر',\n    help: 'دفتری که اسپردش از این بیشتر باشد، میانه‌اش نویز است و رد می‌شود.' },\n  { key: 'pinFailOpen', type: 'bool', default: true,\n    label: 'pin دیده شود (q10)',\n    help: 'ردیفی که هیچ راه‌حلی در بازهٔ حل‌کننده ندارد پنهان نمی‌شود؛ برچسب no-iv-solution می‌گیرد.' }\n];\nconst SCHEMA_BY_KEY = {};\nSCHEMA.forEach(function (f) { SCHEMA_BY_KEY[f.key] = f; });\nconst DEFAULTS = (function () {\n  const d = ENG.DEFAULT_FUNNEL_CONFIG || {};\n  const out = {};\n  SCHEMA.forEach(function (f) { out[f.key] = d[f.key]; });\n  return out;\n})();\nfunction fnv1a(str) {\n  let h = 0x811c9dc5;\n  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i) & 0xff; h = (h * 0x01000193) >>> 0; }\n  return ('00000000' + h.toString(16)).slice(-8);\n}\nfunction isBoolish(v) { return v === true || v === false || v === 'true' || v === 'false' || v === '1' || v === '0' || v === 1 || v === 0; }\nfunction coerceBool(v) {\n  if (v === true || v === 'true' || v === 1 || v === '1') return true;\n  if (v === false || v === 'false' || v === 0 || v === '0') return false;\n  return null;\n}\nfunction inRange(n, min, max) { return typeof n === 'number' && isFinite(n) && n >= min && n <= max; }\nfunction coerceField(field, raw) {\n  if (raw === undefined || raw === null || raw === '') {\n    return { ok: false, value: field.default, reason: 'empty' };\n  }\n  if (field.type === 'bool') {\n    if (!isBoolish(raw)) return { ok: false, value: field.default, reason: 'not-a-boolean' };\n    const b = coerceBool(raw);\n    if (b === null) return { ok: false, value: field.default, reason: 'not-a-boolean' };\n    return { ok: true, value: b };\n  }\n  if (field.type === 'enum') {\n    if (field.choices.indexOf(raw) < 0) {\n      return { ok: false, value: field.default, reason: 'not-in-choices' };\n    }\n    return { ok: true, value: raw };\n  }\n  const n = (typeof raw === 'number') ? raw : parseFloat(String(raw).replace(/[,٬\\s]/g, ''));\n  if (!inRange(n, field.min, field.max)) {\n    return { ok: false, value: field.default, reason: 'out-of-range' };\n  }\n  return { ok: true, value: n };\n}\nfunction normalizeSettings(raw) {\n  const r = (raw && typeof raw === 'object') ? raw : {};\n  const warnings = [];\n  const settings = {};\n  const seen = {};\n  SCHEMA.forEach(function (f) {\n    const c = coerceField(f, r[f.key]);\n    settings[f.key] = c.value;\n    seen[f.key] = true;\n    if (!c.ok && r[f.key] !== undefined) {\n      warnings.push({ key: f.key, label: f.label, given: r[f.key], used: c.value, reason: c.reason });\n    }\n  });\n  Object.keys(r).forEach(function (k) {\n    if (!seen[k]) warnings.push({ key: k, given: r[k], used: undefined, reason: 'unknown-key' });\n  });\n  const rawMin = coerceField(SCHEMA_BY_KEY.ivMin, r.ivMin).value;\n  const rawMax = coerceField(SCHEMA_BY_KEY.ivMax, r.ivMax).value;\n  if (typeof rawMin === 'number' && typeof rawMax === 'number' && !(rawMin < rawMax)) {\n    const d = ENG.DEFAULT_FUNNEL_CONFIG;\n    settings.ivMin = d.ivMin;\n    settings.ivMax = d.ivMax;\n    warnings.push({\n      key: 'ivMin/ivMax', label: 'پنجرهٔ IV',\n      given: { ivMin: rawMin, ivMax: rawMax }, used: { ivMin: d.ivMin, ivMax: d.ivMax },\n      reason: 'inverted-window'\n    });\n  }\n  return { settings: settings, warnings: warnings };\n}\nfunction toFunnelConfig(settings) {\n  const s = normalizeSettings(settings).settings;\n  return ENG.normalizeFunnelConfig(s);\n}\nfunction configHash(settings) {\n  const s = normalizeSettings(settings).settings;\n  const parts = SCHEMA.map(function (f) { return f.key + '=' + String(s[f.key]); });\n  return 'fs1-' + fnv1a(parts.join('|'));\n}\nfunction applyChange(settings, key, value) {\n  const cur = normalizeSettings(settings).settings;\n  const next = {};\n  SCHEMA.forEach(function (f) { next[f.key] = cur[f.key]; });\n  if (SCHEMA_BY_KEY[key]) next[key] = value;\n  const res = normalizeSettings(next);\n  return { settings: res.settings, warnings: res.warnings };\n}\nfunction load(storage, key) {\n  const k = key || STORAGE_KEY;\n  if (!storage || typeof storage.getItem !== 'function') {\n    return { settings: normalizeSettings(null).settings, warnings: [{ reason: 'no-storage' }], source: 'defaults' };\n  }\n  let rawTxt = null;\n  try { rawTxt = storage.getItem(k); } catch (e) {\n    return { settings: normalizeSettings(null).settings, warnings: [{ reason: 'storage-read-failed', error: String((e && e.message) || e) }], source: 'defaults' };\n  }\n  if (rawTxt === null || rawTxt === undefined || rawTxt === '') {\n    return { settings: normalizeSettings(null).settings, warnings: [], source: 'defaults' };\n  }\n  let blob = null;\n  try { blob = JSON.parse(rawTxt); } catch (e) {\n    return { settings: normalizeSettings(null).settings, warnings: [{ reason: 'storage-garbage', error: String((e && e.message) || e) }], source: 'defaults' };\n  }\n  const raw = (blob && typeof blob === 'object' && blob.settings && typeof blob.settings === 'object') ? blob.settings : blob;\n  const res = normalizeSettings(raw);\n  return { settings: res.settings, warnings: res.warnings, source: 'storage', version: blob && blob.version };\n}\nfunction save(storage, key, settings) {\n  const k = key || STORAGE_KEY;\n  const res = normalizeSettings(settings);\n  const blob = { version: VERSION, savedAt: null, settings: res.settings };\n  if (!storage || typeof storage.setItem !== 'function') {\n    return { ok: false, reason: 'no-storage', settings: res.settings, bytes: 0 };\n  }\n  try {\n    storage.setItem(k, JSON.stringify(blob));\n    const txt = JSON.stringify(blob);\n    return { ok: true, key: k, bytes: txt.length, settings: res.settings };\n  } catch (e) {\n    return { ok: false, reason: 'storage-write-failed', error: String((e && e.message) || e), settings: res.settings, bytes: 0 };\n  }\n}\nconst PRESETS = {\n  shipped: { label: 'پیش‌فرض ارسال‌شده', overrides: {} },\n  narrow: { label: 'پنجرهٔ باریک', overrides: { ivMin: 0.10, ivMax: 1.5 } },\n  wideReach: { label: 'گاردهای قیمت آزاد', overrides: { maxSpreadPct: 0.50, checkArbitrageBounds: false } },\n  computeOnly: { label: 'فقط محاسبه (فیلتر خاموش)', overrides: { ivFilterEnabled: false } },\n  v9Compare: { label: 'نگاشت v9 (مقایسه)', overrides: { r: 0.2, marketPriceFrom: 'plc', underlyingFrom: 'rowPl', legacyV9Mapping: true } }\n};\nfunction applyPreset(settings, name) {\n  const p = PRESETS[name];\n  if (!p) return applyChange(settings, '__unknown__', undefined);\n  const cur = normalizeSettings(settings).settings;\n  const next = {};\n  SCHEMA.forEach(function (f) { next[f.key] = (p.overrides[f.key] !== undefined) ? p.overrides[f.key] : cur[f.key]; });\n  const res = normalizeSettings(next);\n  return { settings: res.settings, warnings: res.warnings, preset: name, label: p.label };\n}\nfunction fmt(v, field) {\n  if (field.type === 'number') {\n    const n = (typeof v === 'number') ? v : parseFloat(v);\n    if (!isFinite(n)) return String(v);\n    let s = String(Math.round(n * 100000) / 100000);\n    if (field.displayScale) s = String(Math.round(n * field.displayScale * 100) / 100) + (field.displayUnit || '');\n    else if (field.displayUnit) s = s + (field.displayUnit || '');\n    return s;\n  }\n  if (field.type === 'bool') return v ? 'روشن' : 'خاموش';\n  return String(v);\n}\nfunction describe(settings) {\n  const s = normalizeSettings(settings).settings;\n  const changed = [];\n  SCHEMA.forEach(function (f) {\n    if (s[f.key] !== DEFAULTS[f.key]) {\n      changed.push({ key: f.key, label: f.label, from: fmt(DEFAULTS[f.key], f), to: fmt(s[f.key], f) });\n    }\n  });\n  const parts = SCHEMA.map(function (f) { return f.label + '=' + fmt(s[f.key], f); });\n  return {\n    summary: parts.join('  |  '),\n    changed: changed,\n    changedCount: changed.length,\n    isDefault: changed.length === 0,\n    hash: configHash(s)\n  };\n}\nconst api = {\n  VERSION: VERSION, STORAGE_KEY: STORAGE_KEY, SCHEMA: SCHEMA, SCHEMA_BY_KEY: SCHEMA_BY_KEY,\n  DEFAULTS: DEFAULTS, PRESETS: PRESETS,\n  normalizeSettings: normalizeSettings, toFunnelConfig: toFunnelConfig,\n  configHash: configHash, applyChange: applyChange, applyPreset: applyPreset,\n  load: load, save: save, describe: describe\n};\nif (typeof module !== 'undefined' && module.exports) module.exports = api;\nif (typeof window !== 'undefined') window.TseFunnelSettings = api;\n});\n\nglobal.TseBEngine = __req(\"bEngine\");\nglobal.TseModels = { optionParser: __req('optionParser'), greeks: __req('greeks'), calendar: __req('jalaliCalendar') };\nglobal.TseLookup = __req('aLookup');\nglobal.TseFunnelSettings = __req('funnelSettings');\n      return {\n        B: global.TseBEngine,\n        M: global.TseModels,\n        S: global.TseFunnelSettings,\n        L: global.TseLookup\n      };\n    })(W);\n    W.__TSE_SCHED = (function (P) {\n      var S = { fp: null, cfgHash: null, engine: null, lastError: null, timer: 0, ticks: 0, runs: 0, lastPublished: null };\n      var FP_FIELDS = ['pl', 'plc', 'l18', 'l30', 'tvol', 'tno', 'pcp', 'pd1', 'po1', 'pc'];\n      function fpMix(h, v) {\n        if (v === undefined || v === null) { h = (h ^ 0x9e3779b9) >>> 0; return (h * 0x01000193) >>> 0; }\n        var s = String(v);\n        for (var i = 0; i < s.length; i++) { h = (h ^ s.charCodeAt(i)) >>> 0; h = (h * 0x01000193) >>> 0; }\n        return (h ^ 0x85ebca6b) >>> 0;\n      }\n      function fingerprint(rows) {\n        var h = 0x811c9dc5, n = 0;\n        for (var k in rows) {\n          var r = rows[k];\n          if (!r) continue;\n          n++;\n          for (var f = 0; f < FP_FIELDS.length; f++) { h = fpMix(h, r[FP_FIELDS[f]]); }\n        }\n        return 'fp-' + n + '-' + ('00000000' + h.toString(16)).slice(-8);\n      }\n      function pageStorage() {\n        try { return (typeof localStorage !== 'undefined') ? localStorage : null; } catch (e) { return null; }\n      }\n      function settingsNow() {\n        var loaded = null;\n        try { loaded = P.S.load(pageStorage()); } catch (e) { loaded = null; }\n        var norm = P.S.normalizeSettings(loaded && loaded.settings ? loaded.settings : null);\n        return { settings: norm.settings, config: P.S.toFunnelConfig(norm.settings), hash: P.S.configHash(norm.settings) };\n      }\n      function tick() {\n        S.timer = 0;\n        S.ticks++;\n        try {\n          var rows = (typeof mw !== 'undefined' && mw) ? mw.AllRows : null;\n          if (rows && P.B && P.M && P.S) {\n            var fp = fingerprint(rows);\n            var st = settingsNow();\n            if (fp !== S.fp || st.hash !== S.cfgHash) {\n              S.fp = fp;\n              var eng = S.engine;\n              if (!eng || S.cfgHash !== st.hash) {\n                eng = P.B.createBEngine({\n                  models: {\n                    parseOptionLabel: P.M.optionParser.parseOptionLabel,\n                    impliedVol: P.M.greeks.impliedVol,\n                    bsGreeks: P.M.greeks.bsGreeks\n                  },\n                  calendar: P.M.calendar,\n                  funnelConfig: st.config\n                });\n                S.engine = eng;\n                S.cfgHash = st.hash;\n              }\n              var rep = eng.run(rows, fp, st.hash);\n              if (rep && rep.published) {\n                eng.publish(mw);\n                S.runs++;\n                S.lastPublished = { snapshotId: rep.snapshotId, computed: rep.computed, unknown: rep.unknown, at: new Date().toISOString() };\n              }\n            }\n          }\n        } catch (e) {\n          S.lastError = String((e && e.message) || e);\n        }\n        arm();\n      }\n      function arm() {\n        if (S.timer) return;\n        if (typeof W.setTimeout !== 'function') return;\n        S.timer = W.setTimeout(tick, 400);\n      }\n      return { arm: arm, tick: tick, fingerprint: fingerprint, state: S };\n    })(W.__TSE_PROGRAM);\n  }\n  try {\n    var P = W.__TSE_PROGRAM;\n    var SC = W.__TSE_SCHED;\n    var verdict = true;\n    var idx = (typeof mw !== 'undefined' && mw) ? mw.__B_index : null;\n    var known = (typeof mw !== 'undefined' && mw) ? mw.__B_known : null;\n    var bits = (typeof mw !== 'undefined' && mw) ? mw.__B_bitset : null;\n    if (idx && known && bits && row && row.inscode !== undefined && row.inscode !== null) {\n      var pos = idx[row.inscode];\n      if (pos !== undefined) {\n        var b = pos >> 3, m = pos & 7;\n        if (b >= 0 && b < known.length && b < bits.length && (known[b] >> m) & 1) {\n          verdict = !!((bits[b] >> m) & 1);\n        }\n      }\n    }\n    if (SC && typeof SC.arm === 'function') SC.arm();\n    return verdict;\n  } catch (e) {\n    return true;\n  }\n})();";

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
  function jq(sel) {
    try { if (typeof window !== 'undefined' && window.jQuery) { var r = window.jQuery(sel); if (r && r.length) return r[0]; } } catch (e) {}
    return null;
  }
  function firstDiff(a, b) {
    var n = Math.min(a.length, b.length);
    for (var i = 0; i < n; i++) if (a.charCodeAt(i) !== b.charCodeAt(i)) return i;
    return a.length === b.length ? -1 : n;
  }

  out.preflight = {
    bundle: {
      engine: !!window.TseBEngine, models: !!window.TseModels,
      lookup: !!window.TseLookup, settings: !!window.TseFunnelSettings
    },
    programAlreadyOnPage: !!window.__TSE_PROGRAM,
    jquery: !!(typeof window !== 'undefined' && window.jQuery),
    prepareFilterCode: (typeof mw.PrepareFilterCode === 'function') ? 'fn/' + mw.PrepareFilterCode.length : 'absent'
  };

  if (typeof BODY !== 'string' || !BODY.length) {
    out.status = 'no-body';
    out.verdict = 'the program body was not injected into this probe - run tools/buildProgramProbe.v1.js first. Nothing was changed.';
    say(out); return;
  }

  // ==========================================================================
  // PHASE 0 — THE SAFETY GATE. Nothing is registered until this passes.
  // ==========================================================================
  function phaseGate(next) {
    if (typeof mw.PrepareFilterCode !== 'function') {
      out.gate = { ran: false, reason: 'PrepareFilterCode is not a function on this page' };
      out.status = 'gate-unavailable';
      out.verdict = 'mw.PrepareFilterCode is not available, so the site DSL compiler could not be ruled out. The probe did NOT register anything, because an unverified rewrite is exactly the failure that hides every row. Nothing was changed.';
      say(out); return;
    }
    var compiled = null, threw = null;
    try { compiled = mw.PrepareFilterCode(BODY); } catch (e) { threw = String((e && e.message) || e); }
    var ok = (typeof compiled === 'string') && (compiled === BODY);
    var d = (typeof compiled === 'string') ? firstDiff(BODY, compiled) : null;
    out.gate = {
      ran: true, threw: threw,
      inputBytes: BODY.length,
      outputBytes: (typeof compiled === 'string') ? compiled.length : null,
      outputFnv1a: (typeof compiled === 'string') ? fnv1a(compiled) : null,
      identical: ok,
      firstDiffAt: d,
      inputFnv1a: fnv1a(BODY)
    };
    if (!ok) {
      out.status = 'prepare-filter-code-changed';
      out.verdict = 'STOPPED BEFORE REGISTERING ANYTHING. The site own PrepareFilterCode rewrote the program body (' +
        out.gate.inputBytes + ' -> ' + out.gate.outputBytes + ' bytes, first difference at offset ' + d + '). ' +
        'The site hides EVERY row when the filter code throws (fail-closed, E-061), so registering a rewritten ' +
        'body would empty the owner market watch. Nothing was registered and nothing was changed. ' +
        'The fix is to make the body contain no site shorthand, then re-run.';
      say(out);
      console.log('A-PROGRAM-LIVE: ' + out.verdict);
      return;
    }
    next();
  }

  // ---------- rollback state ----------
  var savedFilters = [], savedFilterCode = '', savedFilterNo = null;
  var savedTextArea = null, savedTextAreaExisted = false, openedDialog = false;
  function snapshotState() {
    savedFilterNo = (mw && mw.Settings && typeof mw.Settings.FilterNo !== 'undefined') ? mw.Settings.FilterNo : null;
    savedFilters = [];
    if (mw && mw.Settings && mw.Settings.Filters) {
      for (var i = 0; i < mw.Settings.Filters.length; i++) {
        savedFilters.push(String((mw.Settings.Filters[i] && mw.Settings.Filters[i].FilterCode) || ''));
      }
    }
    savedFilterCode = (mw && mw.FilterCode !== undefined && mw.FilterCode !== null) ? String(mw.FilterCode) : '';
    var el = findCodeTextArea();
    savedTextAreaExisted = !!el;
    savedTextArea = el ? { id: el.id || null, value: String(el.value || '') } : null;
  }
  // Close the filter dialog the probe opened, so the page is left as it was found. The site
  // gives no QueryWindow*Close, so try the controls a real user would use, in order, and
  // report which one worked. Returns null when the dialog was not open in the first place.
  function closeDialog() {
    if (typeof document === 'undefined') return null;
    var ta = document.getElementById('InputFilterCode');
    if (!ta) return null;                       // the dialog is not open, nothing to do
    var tried = [];
    function attempt(label, el) {
      if (!el) return false;
      tried.push(label);
      try { el.click(); } catch (e) { return false; }
      return !document.getElementById('InputFilterCode');
    }
    // 1. a control whose text or class says it closes
    var closers = document.querySelectorAll(
      '#ModalWindowInner1 .close, #ModalWindowInner1 [data-dismiss], #ModalWindowInner1 button, #ModalWindowInner1 a, .close, [data-dismiss]');
    for (var i = 0; i < closers.length; i++) {
      var el = closers[i];
      var txt = String((el.textContent || '') + ' ' + (el.className || '') + ' ' + (el.getAttribute && el.getAttribute('aria-label') || ''));
      if (/بستن|انصراف|Cancel|close/i.test(txt)) {
        if (attempt('control:' + txt.trim().slice(0, 24), el)) return 'control:' + txt.trim().slice(0, 24);
      }
    }
    // 2. Escape, the way a user would dismiss a modal
    try {
      var target = document.getElementById('ModalWindowInner1') || ta;
      ['keydown', 'keyup'].forEach(function (type) {
        var ev = new KeyboardEvent(type, { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true });
        target.dispatchEvent(ev);
      });
      tried.push('escape');
      if (!document.getElementById('InputFilterCode')) return 'escape';
    } catch (e) {}
    // 3. the overlay the site uses to host the modal
    var outer = document.getElementById('ModalWindowOuter1');
    if (outer) {
      try {
        outer.style.display = 'none';
        outer.setAttribute('style', 'display:none');
        tried.push('overlay-hidden');
        if (!document.getElementById('InputFilterCode')) return 'overlay-hidden';
      } catch (e) {}
    }
    return null;
  }

  function restoreState() {
    try {
      if (mw && mw.Settings && mw.Settings.Filters) {
        for (var i = 0; i < mw.Settings.Filters.length; i++) {
          if (savedFilters[i] !== undefined && mw.Settings.Filters[i]) mw.Settings.Filters[i].FilterCode = savedFilters[i];
        }
        if (savedFilterNo !== null) mw.Settings.FilterNo = savedFilterNo;
      }
      mw.FilterCode = savedFilterCode;
      var ta = findCodeTextArea(), nameEl = findNameInput();
      if (ta) {
        ta.value = (savedTextAreaExisted && savedTextArea) ? savedTextArea.value : '';
        try { ta.dispatchEvent(new Event('input', { bubbles: true })); } catch (e) {}
        try { ta.dispatchEvent(new Event('change', { bubbles: true })); } catch (e) {}
      }
      if (nameEl) nameEl.value = '';
      // The probe opened this dialog itself, so leaving it open is a change to the owner's
      // page. E-077 left it open - everything else rolled back, but a probe that opens a
      // modal must close it again. Best effort: an explicit close control first, then Escape,
      // then the modal overlay the site uses.
      var closedBy = closeDialog();
      for (var k in mw) { if (mw.hasOwnProperty(k) && k.indexOf('__B_') === 0) delete mw[k]; }
      // the program's own page state must go too, or the owner keeps a half-live program
      try { delete window.__TSE_PROGRAM; } catch (e) {}
      try { delete window.__TSE_SCHED; } catch (e) {}
      if (mw && typeof mw.SaveParams === 'function') mw.SaveParams();
      return { restored: true, filterNo: savedFilterNo, filters: savedFilters.length,
        textAreaRestored: savedTextAreaExisted, textAreaCleared: !!ta && !savedTextAreaExisted,
        nameFieldCleared: !!nameEl, programStateRemoved: (!window.__TSE_PROGRAM && !window.__TSE_SCHED),
        dialogClosedBy: closedBy };
    } catch (e) { return { restored: false, error: String((e && e.message) || e) }; }
  }

  // ---------- the filter DOM ----------
  function findCodeTextArea() {
    if (typeof document === 'undefined') return null;
    var el = document.getElementById('InputFilterCode') || jq('#InputFilterCode');
    if (el && String(el.tagName).toUpperCase() === 'TEXTAREA') return el;
    var tas = document.getElementsByTagName('textarea');
    var activeLen = -1;
    if (mw && mw.Settings && mw.Settings.Filters && savedFilterNo !== null && mw.Settings.Filters[savedFilterNo]) {
      activeLen = String(mw.Settings.Filters[savedFilterNo].FilterCode || '').length;
    }
    var best = null, bestLen = -1;
    for (var i = 0; i < tas.length; i++) {
      var t = tas[i], len = String(t.value || '').length;
      if (len > 0 && len === activeLen) return t;
      if (len > bestLen) { bestLen = len; best = t; }
    }
    return best;
  }
  function findNameInput() {
    if (typeof document === 'undefined') return null;
    return document.getElementById('InputFilterName') || jq('#InputFilterName');
  }
  function describeDom() {
    var d = { textareas: [], hasInputFilterCode: false, hasInputFilterName: false };
    if (typeof document === 'undefined') { d.note = 'no document'; return d; }
    d.hasInputFilterCode = !!(document.getElementById('InputFilterCode') || jq('#InputFilterCode'));
    d.hasInputFilterName = !!(document.getElementById('InputFilterName') || jq('#InputFilterName'));
    var tas = document.getElementsByTagName('textarea');
    for (var t = 0; t < tas.length && d.textareas.length < 10; t++) {
      var e = tas[t];
      d.textareas.push({ id: e.id || null, name: e.name || null, valueLen: String(e.value || '').length,
        maxLength: (e.maxLength === undefined ? null : e.maxLength), visible: !!(e.offsetParent || e.offsetHeight) });
    }
    return d;
  }
  function clickMatching(must, also) {
    if (typeof document === 'undefined') return null;
    var els = document.querySelectorAll('a,button,input[type=button],input[type=submit],[onclick]');
    for (var i = 0; i < els.length; i++) {
      var e = els[i];
      var txt = ((e.textContent || '') + ' ' + (e.id || '') + ' ' + (e.name || '') + ' ' + (e.value || ''));
      if (!must.test(txt)) continue;
      if (also && !also.test(txt)) continue;
      try { if (typeof e.click === 'function') { e.click(); return (e.id || e.value || e.textContent || 'el').toString().trim().slice(0, 40); } } catch (x) {}
    }
    return null;
  }
  function queryWindowFns() {
    var names = ['QueryWindowNewFilter', 'QueryWindowEditFilter', 'QueryWindowSaveFilter',
      'QueryWindowCheckFilter', 'SelectFilter', 'PrepareFilterCode', 'SaveParams', 'RenderData'];
    var r = {};
    for (var i = 0; i < names.length; i++) r[names[i]] = (mw && typeof mw[names[i]] === 'function') ? 'fn/' + mw[names[i]].length : 'absent';
    return r;
  }

  // ==========================================================================
  // PHASES 1-5 — the proven textarea path (E-073), unchanged in shape
  // ==========================================================================
  function phaseDom(next) {
    out.dom = describeDom();
    out.dom.queryWindow = queryWindowFns();
    out.dom.ownerActiveSlot = (mw && mw.Settings && savedFilterNo !== null && mw.Settings.Filters[savedFilterNo])
      ? { slot: savedFilterNo, bytes: String(mw.Settings.Filters[savedFilterNo].FilterCode || '').length } : null;
    next();
  }

  // Does the page have anything that looks like a filter control yet? Used only to decide
  // whether it is worth running the opener ladder at all.
  function findFilterControl() {
    if (typeof document === 'undefined') return null;
    var els = document.querySelectorAll('button, a, li, td, span, div, input[type=button], [onclick]');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      var txt = String((el.textContent || '') + ' ' + (el.getAttribute && el.getAttribute('onclick') || ''));
      if (/filter|فیلتر/i.test(txt)) return el;
    }
    return null;
  }

  function phaseOpenDialog(next) {
    var openers = [
      { name: 'QueryWindowEditFilter()', run: function () { return { ok: mw.QueryWindowEditFilter() }; } },
      { name: 'QueryWindowNewFilter()', run: function () { return { ok: mw.QueryWindowNewFilter() }; } },
      { name: 'click an edit-filter control', run: function () { var c = clickMatching(/filter|فیلتر/i, /edit|ویرایش|تغییر/i); return { clicked: c }; } },
      { name: 'click any filter control', run: function () { var c = clickMatching(/filter|فیلتر/i, null); return { clicked: c }; } }
    ];
    var attempts = [], step = 0, round = 0;
    var ROUNDS = 3;
    function ladderDone() {
        out.dialog = { opened: false, attempts: attempts, textAreaFound: !!findCodeTextArea() };
        out.status = 'textarea-unavailable';
        out.verdict = 'no opener produced the filter editor textarea, so this probe did NOT run the UI path and did not change anything. Open the filter dialog by hand (the filter/edit control on the market-watch toolbar) and run this probe again. What was tried: ' +
          attempts.map(function (a) { return a.name + (a.error ? ' threw ' + a.error : (a.clicked ? ' clicked ' + a.clicked : ' no effect')); }).join('; ') + '.';
        say(out);
        console.log('A-PROGRAM-LIVE: ' + out.verdict);
        return;
    }
    function tryNext() {
      if (step >= openers.length) {
        // A modal can still be animating and the toolbar can render after the paste, so run
        // the whole ladder again before concluding the page has no filter editor.
        round++;
        if (round < ROUNDS) {
          step = 0;
          setTimeout(tryNext, 700);
          return;
        }
        ladderDone();
        return;
      }
      var o = openers[step], rec = { name: o.name };
      if (round === 0 && step === 0 && !findFilterControl()) {
        // nothing to click yet: the page is still building. Wait for it rather than burn all
        // four openers against an empty toolbar and report a false textarea-unavailable.
        var waitedToolbar = 0;
        (function waitToolbar() {
          if (findFilterControl() || findCodeTextArea()) { tryNext(); return; }
          waitedToolbar += 150;
          if (waitedToolbar > TOOLBAR_WAIT) {
            attempts.push({ name: 'wait for the market-watch toolbar',
              error: 'no filter control appeared within ' + TOOLBAR_WAIT + 'ms' });
            tryNext();
            return;
          }
          setTimeout(waitToolbar, 150);
        })();
        return;
      }
      try { var r = o.run(); if (r && r.clicked) rec.clicked = r.clicked; } catch (e) { rec.error = String((e && e.message) || e); }
      attempts.push(rec);
      setTimeout(function () {
        if (findCodeTextArea()) {
          openedDialog = true;
          out.dialog = { opened: true, by: o.name, attempts: attempts, textAreaFound: true };
          next(); return;
        }
        step++; tryNext();
      }, POLL_MS);
    }
    tryNext();
  }

  function phaseWriteTextArea(next) {
    var el = findCodeTextArea(), nameEl = findNameInput();
    if (!el) {
      out.status = 'textarea-lost';
      out.verdict = 'the textarea disappeared between opening the dialog and writing to it - nothing was registered. Re-run the probe.';
      say(out); return;
    }
    var before = String(el.value || '');
    el.value = BODY;
    var dispatched = [];
    ['input', 'change'].forEach(function (type) {
      try { el.dispatchEvent(new Event(type, { bubbles: true })); dispatched.push(type); }
      catch (e) {
        try { var ev2 = document.createEvent('HTMLEvents'); ev2.initEvent(type, true, true); el.dispatchEvent(ev2); dispatched.push(type + '/legacy'); } catch (e2) {}
      }
    });
    var afterImmediate = String(el.value || '');
    if (nameEl) { try { nameEl.value = 'tseZharfaKavosh-program'; } catch (e) { out.errors.push('name field: ' + String((e && e.message) || e)); } }
    out.textarea = {
      id: el.id || null, tag: String(el.tagName), maxLength: (el.maxLength === undefined ? null : el.maxLength),
      beforeLen: before.length, writtenLen: BODY.length, readBackLen: afterImmediate.length,
      pageRewroteIt: (afterImmediate !== BODY), eventsDispatched: dispatched,
      nameField: nameEl ? { id: nameEl.id || null, set: true } : null
    };
    next();
  }

  function phaseSaveUi(next) {
    var rec = { saveFilter: null, button: null, checkFilter: null };
    try { mw.QueryWindowSaveFilter(); rec.saveFilter = 'called'; }
    catch (e) { rec.saveFilter = 'threw: ' + String((e && e.message) || e); }
    try { rec.button = clickMatching(/save|ذخیره|ثبت|تایید/i, null); } catch (e) { rec.button = 'threw: ' + String((e && e.message) || e); }
    try { mw.QueryWindowCheckFilter(); rec.checkFilter = 'called'; }
    catch (e) { rec.checkFilter = 'threw: ' + String((e && e.message) || e); }
    var landed = [];
    if (mw && mw.Settings && mw.Settings.Filters) {
      for (var i = 0; i < mw.Settings.Filters.length; i++) {
        var c = String((mw.Settings.Filters[i] && mw.Settings.Filters[i].FilterCode) || '');
        if (c.length) landed.push({ slot: i, len: c.length, fnv1a: fnv1a(c), isBody: (c === BODY) });
      }
    }
    var mirror = String(mw.FilterCode || '');
    out.save = {
      calls: rec, slotsHoldingCode: landed,
      activeSlot: (mw && mw.Settings) ? mw.Settings.FilterNo : null,
      mirrorLen: mirror.length, mirrorFnv1a: fnv1a(mirror), mirrorIsBody: (mirror === BODY),
      anySlotHoldsGenerated: landed.some(function (x) { return x.isBody; })
    };
    next();
  }

  // ==========================================================================
  // PHASE 6 — boot the program and disarm its tick
  // ==========================================================================
  function phaseBoot(next) {
    doRender();
    var waited = 0;
    (function poll() {
      var st = window.__TSE_SCHED && window.__TSE_SCHED.state;
      if (st && st.runs >= 1) {
        // DISARM. The program re-arms its tick from inside the per-row code, so unless the
        // tick is stopped here it will re-publish the projection underneath the tallying
        // Proxy installed in the next phase and the measurement would be silently blind.
        try { window.__TSE_SCHED.arm = function () {}; } catch (e) { out.errors.push('disarm: ' + String((e && e.message) || e)); }
        out.boot = {
          waitedMs: waited,
          program: !!window.__TSE_PROGRAM,
          schedState: { ticks: st.ticks, runs: st.runs, fp: st.fp, cfgHash: st.cfgHash, lastError: st.lastError },
          published: {
            index: !!mw.__B_index, known: !!mw.__B_known, bitset: !!mw.__B_bitset,
            snapshotId: mw.__B_snapshotId, configHash: mw.__B_configHash, totalRuns: mw.__B_totalRuns
          },
          engineOnPage: { engine: !!window.TseBEngine, models: !!window.TseModels, lookup: !!window.TseLookup, settings: !!window.TseFunnelSettings },
          disarmed: (typeof window.__TSE_SCHED.arm === 'function')
        };
        next(); return;
      }
      waited += POLL_MS;
      if (waited > BOOT_WAIT) {
        var st2 = window.__TSE_SCHED && window.__TSE_SCHED.state;
        out.boot = { waitedMs: waited, timedOut: true, program: !!window.__TSE_PROGRAM,
          schedState: st2 ? { ticks: st2.ticks, runs: st2.runs, lastError: st2.lastError } : null };
        // DIAGNOSE, do not guess. window.__TSE_PROGRAM is unset, so the body did not install.
        // That is either because the site never evaluated the filter code after the UI save
        // (a trigger defect - E-073 proved it does evaluate) or because the 51,719-byte body
        // was evaluated and threw (a body defect - the site is fail-closed on exception, so
        // every row would be hidden). A three-line sentinel body separates them: it can
        // neither be size-related nor syntax-related. The owner's code is put back straight
        // after, and the rollback that follows restores the slot regardless.
        try {
          window.__TSE_SENTINEL_RAN = 0;
          var savedFilterCode = mw.FilterCode;
          mw.FilterCode = 'window.__TSE_SENTINEL_RAN++; true;';
          doRender();
          out.boot.sentinelRuns = window.__TSE_SENTINEL_RAN;
          mw.FilterCode = savedFilterCode;
          // and once more with the real body, to see whether the site evaluates it and what
          // a throw would look like: the site swallows the exception, so we cannot read it
          // directly - but a second sentinel AFTER the real body tells us whether the site
          // kept going.
          mw.FilterCode = BODY;
          doRender();
          out.boot.bodyThenSentinel = window.__TSE_SENTINEL_RAN;
          out.boot.bodyThrewEvidence = {
            programAfter: !!window.__TSE_PROGRAM,
            lastError: (window.__TSE_SCHED && window.__TSE_SCHED.state && window.__TSE_SCHED.state.lastError) || null
          };
        } catch (e) { out.errors.push('sentinel diagnosis: ' + String((e && e.message) || e)); }
        // ROLL BACK ANYWAY. The program is already sitting in the owner's slot and mirror
        // at this point, so bailing out here without restoring would leave code the owner
        // never chose registered on their page. The first version of this probe returned
        // straight after say(), which is exactly what the harness caught.
        finish();
        return;
      }
      setTimeout(poll, POLL_MS);
    })();
  }

  // ==========================================================================
  // PHASE 7 — the per-row verdicts, read the way the body reads them
  // ==========================================================================
  var T = null;
  function verdictOf(inscode, index, known, bits) {
    var pos = index[inscode];
    if (pos === undefined) return 'failOpen';
    var b = pos >> 3, m = pos & 7;
    if (b < 0 || b >= known.length) return 'failOpen';
    if (b >= bits.length) return 'failOpen';       // the E-074 short-bitset hole
    if (!((known[b] >> m) & 1)) return 'failOpen';
    return ((bits[b] >> m) & 1) ? 'keep' : 'hide';
  }
  var NOT_A_LOOKUP = { length: 1, name: 1, toString: 1, valueOf: 1, constructor: 1,
    prototype: 1, hasOwnProperty: 1, isPrototypeOf: 1, propertyIsEnumerable: 1,
    toLocaleString: 1, __proto__: 1, then: 1, catch: 1, inspect: 1, nodeType: 1,
    $$typeof: 1, undefined: 1 };
  function isLookup(k) { return (typeof k === 'string') && k.length > 0 && NOT_A_LOOKUP[k] !== 1; }
  function installTally() {
    var index = mw.__B_index, known = mw.__B_known, bits = mw.__B_bitset;
    var tally = { reads: 0, distinct: {}, perInscode: {}, sample: [], verdicts: { keep: 0, hide: 0, failOpen: 0 },
      byteReads: 0, firstReadAt: null, lastReadAt: null };
    function own(t, k) { return (typeof k === 'string') && Object.prototype.hasOwnProperty.call(t, k); }
    function isByte(t, k) {
      if (!own(t, k) || !/^\d+$/.test(k)) return false;
      var v = +k; return (v >= 0 && v < t.length);
    }
    var now = function () { return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now(); };
    var pIndex = new Proxy(index, {
      get: function (t, k) {
        if (isLookup(k)) {
          var code = String(k);
          tally.reads++;
          if (tally.firstReadAt === null) tally.firstReadAt = now();
          tally.lastReadAt = now();
          if (tally.distinct[code] === undefined) {
            tally.distinct[code] = true;
            var v = verdictOf(code, index, known, bits);
            tally.perInscode[code] = v;
            tally.verdicts[v]++;
            if (tally.sample.length < 12) tally.sample.push({ inscode: code, pos: t[k], verdict: v });
          }
        }
        return t[k];
      }
    });
    var pKnown = new Proxy(known, { get: function (t, k) { if (isByte(t, k)) tally.byteReads++; return t[k]; } });
    var pBits = new Proxy(bits, { get: function (t, k) { if (isByte(t, k)) tally.byteReads++; return t[k]; } });
    mw.__B_index = pIndex; mw.__B_known = pKnown; mw.__B_bitset = pBits;
    return tally;
  }
  function phaseExecute(next) {
    T = installTally();
    doRender();
    setTimeout(function () {
      var t = T;
      var span = (t.firstReadAt !== null && t.lastReadAt !== null) ? (t.lastReadAt - t.firstReadAt) : null;
      var perRowUs = (span !== null && Object.keys(t.distinct).length > 1)
        ? Math.round(1000 * span / Object.keys(t.distinct).length) / 1000 : null;
      out.execute = {
        renderCalled: true,
        reads: t.reads, distinctCount: Object.keys(t.distinct).length,
        verdicts: t.verdicts, byteReads: t.byteReads,
        sample: t.sample.slice(0, 8),
        firstReadAtMs: t.firstReadAt, lastReadAtMs: t.lastReadAt, spanMs: span,
        perRowUs: perRowUs,
        coverage: {
          allRows: (mw && mw.AllRows) ? Object.keys(mw.AllRows).length : null,
          evaluatedBySite: Object.keys(t.distinct).length,
          pctOfAllRows: (mw && mw.AllRows && Object.keys(t.distinct).length)
            ? Math.round(1000 * Object.keys(t.distinct).length / Object.keys(mw.AllRows).length) / 10 : null
        }
      };
      next();
    }, RENDER_WAIT);
  }

  // ==========================================================================
  // PHASE 8 — cross-check the body against the reference implementation
  // ==========================================================================
  function phaseCrossCheck(next) {
    var LOOKUP = window.TseLookup;
    if (!LOOKUP || typeof LOOKUP.evaluateRow !== 'function') {
      out.crossCheck = { ran: false, reason: 'TseLookup.evaluateRow is not on the page' };
      next(); return;
    }
    var index = mw.__B_index, known = mw.__B_known, bits = mw.__B_bitset;
    var raw = { index: index, known: known, bitset: bits };
    // unwrap the Proxy: evaluateRow wants the real arrays
    var pub = { index: raw.index, known: raw.known, bitset: raw.bitset, ok: true };
    // Compare the DECISION, not the class. evaluateRow returns a boolean, so it cannot
    // express "fail-open": a fail-open row returns true, exactly as a keep row does. The
    // first version of this check mapped true -> 'keep' and then compared classes, so all
    // 48 fail-open rows disagreed and the probe reported a finding on a correct program.
    // What the two paths must agree on is whether the row is HIDDEN.
    var agree = 0, disagree = 0, bodyFailOpen = 0, moduleFailOpen = 0, samples = [];
    var codes = Object.keys(T.distinct);
    for (var i = 0; i < codes.length; i++) {
      var code = codes[i];
      var cls = T.perInscode[code];
      var bodyHides = (cls === 'hide');
      var moduleVerdict = LOOKUP.evaluateRow({ inscode: code }, pub);
      var moduleHides = (moduleVerdict === false);
      if (cls === 'failOpen') bodyFailOpen++;
      if (moduleVerdict === true) moduleFailOpen++;
      if (bodyHides === moduleHides) agree++;
      else {
        disagree++;
        if (samples.length < 8) samples.push({ inscode: code, bodyClass: cls, bodyHides: bodyHides, moduleHides: moduleHides });
      }
    }
    out.crossCheck = {
      ran: true, compared: codes.length, agree: agree, disagree: disagree,
      bodyFailOpen: bodyFailOpen, samples: samples,
      note: 'the body and TseLookup.evaluateRow on the SAME published projection must agree on whether the row is HIDDEN (evaluateRow returns a boolean, so keep and fail-open are the same answer to it)'
    };
    next();
  }

  // ==========================================================================
  // PHASE 9 — rollback and verdict
  // ==========================================================================
  function finish() {
    // Defensive: the program-did-not-boot path reaches finish() without ever running
    // phaseExecute or phaseCrossCheck, so those objects are still the empty {} the probe
    // was initialised with. Reading them unconditionally would throw here - and an
    // exception in the rollback path is the one place a probe must never throw, because it
    // is the only thing standing between the owner and a filter they did not choose.
    if (!out.execute || typeof out.execute.distinctCount !== 'number') {
      out.execute = { renderCalled: false, distinctCount: 0, verdicts: { keep: 0, hide: 0, failOpen: 0 },
        reads: 0, byteReads: 0, sample: [], perRowUs: null, coverage: { allRows: null, evaluatedBySite: 0, pctOfAllRows: null } };
    }
    if (!out.crossCheck || typeof out.crossCheck.ran !== 'boolean') {
      out.crossCheck = { ran: false, reason: 'the program never booted, so there was nothing to cross-check' };
    }
    out.rollback.restore = restoreState();
    out.rollback.renderCalled = doRender();
    out.rollback.slotRestored = (mw && mw.Settings && mw.Settings.Filters && savedFilterNo !== null &&
      String((mw.Settings.Filters[savedFilterNo] && mw.Settings.Filters[savedFilterNo].FilterCode) || '') === (savedFilters[savedFilterNo] || ''));
    out.rollback.mirrorRestored = (String(mw.FilterCode || '') === savedFilterCode);
    out.rollback.textAreaRestored = savedTextAreaExisted;
    out.rollback.openedDialog = openedDialog;
    var closedBy = out.rollback.restore && out.rollback.restore.dialogClosedBy;
    out.rollback.dialogLeftOpen = openedDialog && !savedTextAreaExisted && !closedBy;
    out.rollback.dialogClosedBy = closedBy;
    out.rollback.editorFieldsEmptied = (out.rollback.restore && out.rollback.restore.textAreaCleared) || savedTextAreaExisted;
    out.identity = {
      generatedBytes: BODY.length, generatedFnv1a: fnv1a(BODY),
      textAreaReadBackLen: out.textarea.readBackLen, pageRewroteIt: out.textarea.pageRewroteIt,
      mirrorEqualsGenerated: out.save.mirrorIsBody,
      anySlotHoldsGenerated: out.save.anySlotHoldsGenerated,
      slotsHoldingGenerated: out.save.slotsHoldingCode.filter(function (x) { return x.isBody; }).map(function (x) { return x.slot; })
    };

    var t = out.execute, cc = out.crossCheck;
    var parts = [];
    parts.push('the site PrepareFilterCode left the whole ' + BODY.length + '-byte program byte-identical (the safety gate passed)');
    parts.push('the program reached the page through the TEXTAREA path (dialog opened by ' + out.dialog.by + ')');
    parts.push(out.identity.pageRewroteIt
      ? 'THE PAGE REWROTE THE CODE IN THE TEXTAREA (' + BODY.length + ' -> ' + t.textAreaReadBackLen + ' bytes)'
      : 'the textarea held the program unchanged');
    parts.push(out.identity.mirrorEqualsGenerated
      ? 'after the UI save, mw.FilterCode is byte-identical to the program'
      : 'after the UI save, mw.FilterCode is NOT the program (' + out.save.mirrorLen + ' bytes)');
    if (out.boot.timedOut) {
      parts.push('the program was registered through the textarea but its background tick never published a projection within ' + out.boot.waitedMs + 'ms' +
        (out.boot.schedState && out.boot.schedState.lastError ? ' (the tick recorded: ' + out.boot.schedState.lastError + ')' : ' (no tick error was recorded)'));
      parts.push('the page is therefore on the fail-open path - every row visible, which is safe but is not the program');
    } else {
      parts.push(t.distinctCount === 0
        ? 'on the page the program read ZERO rows, so nothing above is evidence it ran'
        : 'the program booted (ticks=' + out.boot.schedState.ticks + ', runs=' + out.boot.schedState.runs + ') and on the page read ' +
          t.distinctCount + ' distinct rows producing ' + t.verdicts.keep + ' keep / ' + t.verdicts.hide +
          ' hide / ' + t.verdicts.failOpen + ' fail-open, at ' + t.perRowUs + ' us/row');
    }
    if (cc.ran) parts.push('the body and TseLookup.evaluateRow agreed on whether the row is hidden for ' + cc.agree + ' of ' + cc.compared + ' rendered rows (disagreements: ' + cc.disagree + ', of which ' + cc.bodyFailOpen + ' were fail-open)');

    var reasons = [];
    if (!out.rollback.slotRestored || !out.rollback.mirrorRestored) reasons.push('the rollback did not restore the owner filter slot or mirror');
    if (!out.rollback.restore || !out.rollback.restore.programStateRemoved) reasons.push('the program page state was not removed');
    if (!out.identity.mirrorEqualsGenerated || !out.identity.anySlotHoldsGenerated) reasons.push('the UI save did not deliver the program to the slot and the mirror');
    if (out.boot.timedOut) reasons.push('the program never published a projection (the page is on the fail-open path)');
    if (t.distinctCount === 0) reasons.push('the program read zero rows on the page');
    if (cc.ran && cc.disagree > 0) reasons.push('the body and TseLookup.evaluateRow disagree on ' + cc.disagree + ' rows');
    if (out.execute.verdicts.hide > 0 && out.execute.verdicts.keep === 0) reasons.push('every judged row was hidden, which is the fail-closed signature');
    if (out.errors.length) reasons.push('probe errors: ' + out.errors.join('; '));

    // A pre-set root-cause status wins: 'program-did-not-boot' says what went wrong, while
    // 'program-live-with-findings' only says that something did. finish() must not flatten
    // the one into the other.
    out.status = out.boot.timedOut ? 'program-did-not-boot'
      : (reasons.length ? 'program-live-with-findings' : 'program-verified-live');
    out.path = 'textarea';
    out.verdict = parts.join('. ') + '.' + (reasons.length ? ' FINDINGS: ' + reasons.join('; ') + '.' : '');
    say(out);
    console.log('A-PROGRAM-LIVE: ' + out.verdict);
    console.log('  GATE: PrepareFilterCode identical=' + out.gate.identical + ' (' + out.gate.inputBytes + ' -> ' + out.gate.outputBytes + ' bytes, firstDiffAt=' + out.gate.firstDiffAt + ')');
    console.log('  SAVE: dialog=' + out.dialog.by + ' textarea=' + out.textarea.readBackLen + 'B mirror=' + out.save.mirrorLen + 'B(' + out.save.mirrorFnv1a + ') identical=' + out.identity.mirrorEqualsGenerated);
    // schedState is null whenever the program never booted, so this line must not assume it.
    console.log('  BOOT: ' + (out.boot.schedState
      ? 'ticks=' + out.boot.schedState.ticks + ' runs=' + out.boot.schedState.runs + ' fp=' + out.boot.schedState.fp + ' lastError=' + out.boot.schedState.lastError
      : 'no scheduler state (program=' + out.boot.program + ', waitedMs=' + out.boot.waitedMs + ')'));
    console.log('  RUN : reads=' + t.reads + ' distinct=' + t.distinctCount + ' ' + JSON.stringify(t.verdicts) + ' perRow=' + t.perRowUs + 'us coverage=' + t.coverage.pctOfAllRows + '%');
    console.log('  XCHK: agree=' + cc.agree + ' disagree=' + cc.disagree + ' of ' + cc.compared + ' (failOpen=' + cc.bodyFailOpen + ')');
    console.log('  BACK: slot=' + out.rollback.slotRestored + ' mirror=' + out.rollback.mirrorRestored + ' programStateRemoved=' + out.rollback.restore.programStateRemoved + ' textarea=' + out.rollback.textAreaRestored);
  }

  // ============================== the chain ==============================
  snapshotState();
  phaseGate(function () {
    phaseDom(function () {
      phaseOpenDialog(function () {
        phaseWriteTextArea(function () {
          phaseSaveUi(function () {
            phaseBoot(function () {
              phaseExecute(function () {
                phaseCrossCheck(function () { finish(); });
              });
            });
          });
        });
      });
    });
  });
})();
