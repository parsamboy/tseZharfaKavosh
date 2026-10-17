/**
 * tseZharfaKavosh — live computeFunnel timing probe v0.1.0 [کنسول]
 * READ-ONLY. Inlines the REAL repo code (optionParser + greeks) and times it on
 * live mw.AllRows rows (old.tsetmc.com, parTree 15131F).
 *
 * Answers (contradiction review 2026-10-17):
 *   1) per-symbol cost of the REAL BS+IV funnel on live data — is 40ms/3282 real?
 *   2) impliedVol iteration distribution on live market prices (cap is 25)
 *   3) cold single-shot cost (B runs once per snapshot)
 *   4) detectDirty vs compute breakdown — is "0.8ms incremental" inclusive?
 *
 * Run: paste in console on the Bourse page, then report the PROBE_JSON line.
 * No FilterCode change, no SaveParams, no network — timing only.
 * SPDX-License-Identifier: Smart-FFA-1.1
 */
'use strict';

// ---- BEGIN verbatim src/optionParser.v0.1.0.js (exports stripped) ----
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
// ---- END optionParser ----

// ---- BEGIN verbatim src/models/greeks.v0.1.0.js (exports stripped) ----
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
  if(kind==='call') theta = (term1 - r*K*Math.exp(-r*T)*Nd2)/365;
  else theta = (term1 + r*K*Math.exp(-r*T)*Nmd2)/365;
  return { price, delta, gamma, vega, theta, rho, d1:_d1, d2:_d2 };
}

function impliedVol(p){
  const {S,K,T,r,kind,marketPrice}=p;
  if([S,K,T,r,marketPrice].some(v=> v==null || !isFinite(v))) return { error:'insufficient-data' };
  let low=0.01, high=3.0, mid, price, iter=0;
  let lowPrice=bsGreeks({S,K,T,r,sigma:low,kind}).price;
  let highPrice=bsGreeks({S,K,T,r,sigma:high,kind}).price;
  if(marketPrice < Math.min(lowPrice,highPrice) || marketPrice > Math.max(lowPrice,highPrice)){
    // still try bisection but may not converge
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
// ---- END greeks ----

// ============ timing harness ============
var __out = { probe: 'perf.funnel.live.v1', tag: 'کنسول', host: location.host, capturedAt: new Date().toISOString() };
function __ms(fn) { var a = performance.now(); fn(); return performance.now() - a; }

try {
  var __rows = []; for (var __k in mw.AllRows) { if (mw.AllRows.hasOwnProperty(__k)) __rows.push(mw.AllRows[__k]); }
  var __opt = [];
  for (var __i = 0; __i < __rows.length; __i++) {
    var __p = parseOptionLabel(__rows[__i]);
    if (__p.status === 'confirmed') { __p._row = __rows[__i]; __opt.push(__p); }
  }
  __out.totalSymbols = __rows.length;
  __out.optionRows = __opt.length;
  __out.parseAllMs = +__ms(function () { for (var __i = 0; __i < __rows.length; __i++) parseOptionLabel(__rows[__i]); }).toFixed(2);

  var __iters = [], __errs = 0;
  __out.funnelOptionMs = +__ms(function () {
    for (var __i = 0; __i < __opt.length; __i++) {
      var __r = __opt[__i]._row, __kind = __opt[__i].kind, __K = __opt[__i].strike;
      var __v = impliedVol({ S: parseFloat(__r.pl), K: __K, T: 0.082, r: 0.2, kind: __kind, marketPrice: parseFloat(__r.plc) });
      __iters.push(__v.iterations);
      if (__v.error) { __errs++; continue; }
      bsGreeks({ S: parseFloat(__r.pl), K: __K, T: 0.082, r: 0.2, sigma: __v.sigma, kind: __kind });
    }
  }).toFixed(2);
  __out.impliedVolErrs = __errs;
  __iters.sort(function (a, b) { return a - b; });
  __out.impliedVolIters = { min: __iters[0], p50: __iters[Math.floor(__iters.length / 2)], max: __iters[__iters.length - 1], atCap24plus: __iters.filter(function (x) { return x >= 24; }).length };
  __out.perOptionRowUs = +((__out.funnelOptionMs * 1000) / Math.max(1, __opt.length)).toFixed(2);
  __out.extrapolatedAllSymbolsMs = +((__out.perOptionRowUs * __rows.length) / 1000).toFixed(1);

  // cold single-shot (new Function, first call) x5
  var __cold = [];
  for (var __c = 0; __c < 5; __c++) {
    var __ivFn = new Function('bsGreeks', 'return function(S,K,T,r,mp){let low=0.01,high=3.0,mid,price,iter=0;let lp=bsGreeks({S,K,T,r,sigma:low,kind:"call"}).price;let hp=bsGreeks({S,K,T,r,sigma:high,kind:"call"}).price;for(iter=0;iter<100;iter++){mid=(low+high)/2;price=bsGreeks({S,K,T,r,sigma:mid,kind:"call"}).price;if(Math.abs(price-mp)<1e-6)break;if(price>mp)high=mid;else low=mid;if(high-low<1e-7)break;}return mid;};')(bsGreeks);
    var __o = __opt[__c % __opt.length];
    var __t0 = performance.now(); __ivFn(parseFloat(__o._row.pl), __o.strike, 0.082, 0.2, parseFloat(__o._row.plc)); __cold.push(+(performance.now() - __t0).toFixed(3));
  }
  __out.coldSingleShotMs = __cold;

  // detectDirty vs compute breakdown (simulated B cycle)
  var __prev = {};
  for (var __i2 = 0; __i2 < __rows.length; __i2++) { __prev[__rows[__i2].inscode] = { tvol: __rows[__i2].tvol, pl: __rows[__i2].pl, tno: __rows[__i2].tno, pcp: __rows[__i2].pcp }; }
  var __dirtyCount = 0;
  __out.detectDirtyMs = +__ms(function () {
    __dirtyCount = 0;
    for (var __i2 = 0; __i2 < __rows.length; __i2++) {
      var __r2 = __rows[__i2], __p2 = __prev[__r2.inscode];
      if (!__p2 || __p2.tvol !== __r2.tvol || __p2.pl !== __r2.pl || __p2.tno !== __r2.tno || __p2.pcp !== __r2.pcp) __dirtyCount++;
    }
  }).toFixed(2);
  __out.dirtyCount = __dirtyCount;
  __out.incrementalHypothesis2pctMs = +((__out.perOptionRowUs * __rows.length * 0.02) / 1000).toFixed(2);
  __out.fullRecomputeEstimateMs = +(__out.detectDirtyMs + (__out.perOptionRowUs * __opt.length) / 1000).toFixed(1);
  __out.verdict = (__out.fullRecomputeEstimateMs < 60) ? 'PLAUSIBLE-40ms' : 'CLAIM-TOO-OPTIMISTIC';
} catch (e) { __out.error = String(e && e.message || e); }
console.log('PROBE_JSON ' + JSON.stringify(__out));
