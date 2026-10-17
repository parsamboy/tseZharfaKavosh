/**
 * tseZharfaKavosh — field semantics + IV diagnostic probe v0.1.0 [کنسول]
 * READ-ONLY on old.tsetmc.com (parTree 15131F). No FilterCode/SaveParams/network.
 *
 * Answers the "77% IV-at-cap" warning sign with data instead of assumption:
 *   Q1  What does `plc` actually mean? Tests plc == pl - pc and
 *       plp == (pl - pc)/pc*100 over ALL rows.
 *   Q2  Is the IV solver's result MEANINGFUL (interior solution) or merely
 *       pinned to a bound (no solution in [0.01, 3.0] => pricing mismatch)?
 *       Reports the converged sigma distribution, not just the iteration count.
 *   Q3  Compare the two input mappings on the SAME rows:
 *         G-11 mapping: S = underlying row's pc (via l30 underlying map),
 *                       marketPrice = (pd1+po1)/2, r = 0.30
 *         v9  mapping:  S = row.pl, marketPrice = row.plc, r = 0.2
 *       (probes/g11.greeks.limited-test.v1.1.js vs probe B-BSIV v9)
 *
 * Run: paste in console on the Bourse page, then report the PROBE_JSON line.
 * SPDX-License-Identifier: Smart-FFA-1.1
 */
'use strict';

// ---- verbatim src/models/greeks.v0.1.0.js (exports stripped) ----
function normCDF(x) {
  const a1=0.254829592, a2=-0.284496736, a3=1.421413741, a4=-1.453152027, a5=1.061405429, p=0.3275911;
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5*t + a4)*t) + a3)*t + a2)*t + a1)*t * Math.exp(-x*x);
  return 0.5 * (1.0 + sign * y);
}
function normPDF(x){ return Math.exp(-0.5*x*x)/Math.sqrt(2*Math.PI); }
function d1f(S,K,T,r,sigma){ return (Math.log(S/K)+(r+0.5*sigma*sigma)*T)/(sigma*Math.sqrt(T)); }
function d2f(S,K,T,r,sigma){ return d1f(S,K,T,r,sigma)-sigma*Math.sqrt(T); }
function bsGreeks(p){
  const S=p.S,K=p.K,T=p.T,r=p.r,sigma=p.sigma,kind=p.kind;
  if([S,K,T,r,sigma].some(v=> v==null || typeof v!=='number' || !isFinite(v))) return { error:'insufficient-data' };
  if(S<=0||K<=0||T<=0||sigma<=0) return { error:'insufficient-data' };
  if(kind!=='call' && kind!=='put') return { error:'invalid-kind' };
  const _d1=d1f(S,K,T,r,sigma), _d2=d2f(S,K,T,r,sigma);
  const Nd1=normCDF(_d1), Nd2=normCDF(_d2), Nmd1=normCDF(-_d1), Nmd2=normCDF(-_d2);
  const pdfd1=normPDF(_d1); const sqrtT=Math.sqrt(T);
  let price, delta, gamma;
  if(kind==='call'){ price=S*Nd1-K*Math.exp(-r*T)*Nd2; delta=Nd1; }
  else { price=K*Math.exp(-r*T)*Nmd2-S*Nmd1; delta=Nd1-1; }
  gamma=pdfd1/(S*sigma*sqrtT);
  return { price, delta, gamma };
}
function impliedVol(p){
  const S=p.S,K=p.K,T=p.T,r=p.r,kind=p.kind,marketPrice=p.marketPrice;
  if([S,K,T,r,marketPrice].some(v=> v==null || !isFinite(v))) return { error:'insufficient-data' };
  let low=0.01, high=3.0, mid, price, iter=0;
  let lowPrice=bsGreeks({S,K,T,r,sigma:low,kind}).price;
  let highPrice=bsGreeks({S,K,T,r,sigma:high,kind}).price;
  for(iter=0; iter<100; iter++){
    mid=(low+high)/2;
    price=bsGreeks({S,K,T,r,sigma:mid,kind}).price;
    if(Math.abs(price-marketPrice) < 1e-6) break;
    if(price > marketPrice) high=mid; else low=mid;
    if(high-low < 1e-7) break;
  }
  return { sigma:mid, iterations: iter, price: bsGreeks({S,K,T,r,sigma:mid,kind}).price,
           lowPrice: lowPrice, highPrice: highPrice };
}
// ---- end greeks ----

function num(v){ if(v===null||v===undefined||v==='') return null; const n=parseFloat(String(v).replace(/,/g,'')); return isFinite(n)?n:null; }

var __out = { probe:'fieldsem.ivdiagnostic.live.v1', tag:'کنسول', host: location.host, capturedAt: new Date().toISOString() };

try {
  var rows=[]; for (var k in mw.AllRows) if (mw.AllRows.hasOwnProperty(k)) rows.push(mw.AllRows[k]);
  __out.totalSymbols = rows.length;

  // ---------- Q1: field semantics ----------
  var agreePlc=0, testablePlc=0, agreePlp=0, testablePlp=0, samples=[];
  for (var i=0;i<rows.length;i++){
    var r=rows[i];
    var pl=num(r.pl), pc=num(r.pc), plc=num(r.plc), plp=num(r.plp);
    if(pl!==null && pc!==null && plc!==null){ testablePlc++; if(Math.abs(plc-(pl-pc))<0.51) agreePlc++; }
    if(pl!==null && pc!==null && plp!==null && pc>0){ testablePlp++;
      if(Math.abs(plp-((pl-pc)/pc*100))<0.51) agreePlp++; }
    if(samples.length<6 && r.l18 && r.l30 && /^[ضط]/.test(String(r.l18))){
      samples.push({ l18:r.l18, l30:r.l30, pl:r.pl, pc:r.pc, plc:r.plc, pcp:r.pcp, plp:r.plp, pd1:r.pd1, po1:r.po1 });
    }
  }
  __out.fieldSemantics = {
    plc_equals_pl_minus_pc: agreePlc + '/' + testablePlc + ' (' + (100*agreePlc/Math.max(1,testablePlc)).toFixed(1) + '%)',
    plp_equals_pct_change: agreePlp + '/' + testablePlp + ' (' + (100*agreePlp/Math.max(1,testablePlp)).toFixed(1) + '%)',
    samples: samples
  };

  // ---------- underlying map (G-11 style) ----------
  var umap={};
  for (var j=0;j<rows.length;j++){
    var sr=rows[j], l18=String(sr.l18||'').trim();
    if(!l18 || l18.length>12) continue;
    var c=l18.charAt(0); if(c==='ض'||c==='ط') continue;
    var pcU=num(sr.pc); if(pcU!==null && pcU>0 && umap[l18]===undefined) umap[l18]=pcU;
  }
  __out.underlyingMapSize = Object.keys(umap).length;
  __out.underlyingMapSample = Object.keys(umap).slice(0,10);

  // ---------- Q2/Q3: IV under both mappings ----------
  function parseOpt(l18,l30){
    var first=String(l18||'').charAt(0);
    if(first!=='ض' && first!=='ط') return null;
    var parts=String(l30||'').split('-');
    if(parts.length<2) return null;
    var last=parts[parts.length-1].trim();
    if(!/^(\d{4}\/\d{2}\/\d{2}|\d{8})$/.test(last)) return null;
    var strike=parseInt(String(parts[parts.length-2]).replace(/[^\d]/g,''),10);
    if(!isFinite(strike)) return null;
    var before=parts.slice(0,parts.length-2).join('-');
    var m=before.match(/اختیار[خف]\s+(.+)/)||before.match(/اختيار[خف]\s+(.+)/);
    var underlying=m?m[1].trim():null;
    var kind = /اختیارخ|اختيارخ/.test(String(l30)) ? 'call' : 'put';
    return { strike:strike, underlying:underlying, kind:kind };
  }
  function diag(row, p, mapping){
    var S, mp, r;
    if(mapping==='g11'){
      S = (p.underlying && umap[p.underlying]!==undefined) ? umap[p.underlying] : null;
      var bid=num(row.pd1), ask=num(row.po1);
      mp = (bid!==null && ask!==null && bid>0 && ask>0) ? (bid+ask)/2 : null;
      r = 0.30;
    } else {
      S = num(row.pl); mp = num(row.plc); r = 0.2;
    }
    if(S===null || mp===null) return { status:'insufficient-data', reason:'S or marketPrice missing', S:S, marketPrice:mp };
    var v = impliedVol({ S:S, K:p.strike, T:30/365, r:r, kind:p.kind, marketPrice:mp });
    if(v.error) return { status:'insufficient-data', reason:v.error };
    var atBound = (v.sigma<=0.0100001 || v.sigma>=2.9999999);
    var outOfRange = (mp < Math.min(v.lowPrice,v.highPrice)-1) || (mp > Math.max(v.lowPrice,v.highPrice)+1);
    return { status:'ok', S:S, K:p.strike, marketPrice:mp, r:r, iv:+v.sigma.toFixed(6),
             iterations:v.iterations, atBoundary:atBound, priceOutOfRange:outOfRange,
             bsPriceAtIv:+v.price.toFixed(2) };
  }
  var opts=[]; for (var q=0;q<rows.length;q++){ var pp=parseOpt(rows[q].l18, rows[q].l30); if(pp) opts.push({row:rows[q], p:pp}); }
  __out.optionRows = opts.length;
  var g11=[], v9=[];
  for (var w=0; w<opts.length && w<120; w++){
    g11.push(diag(opts[w].row, opts[w].p, 'g11'));
    v9.push(diag(opts[w].row, opts[w].p, 'v9'));
  }
  function summarize(list, name){
    var ok=list.filter(function(x){return x.status==='ok';});
    var ivs=ok.map(function(x){return x.iv;}).sort(function(a,b){return a-b;});
    var bounds=ok.filter(function(x){return x.atBoundary;}).length;
    var oor=ok.filter(function(x){return x.priceOutOfRange;}).length;
    var ins=ok.filter(function(x){return x.iv>0.01 && x.iv<1.0 && !x.atBoundary;}).length;
    var s={ name:name, n:list.length, ok:ok.length,
      iv_p10: ivs.length? +ivs[Math.floor(ivs.length*0.1)].toFixed(4):null,
      iv_p50: ivs.length? +ivs[Math.floor(ivs.length*0.5)].toFixed(4):null,
      iv_p90: ivs.length? +ivs[Math.floor(ivs.length*0.9)].toFixed(4):null,
      atBoundary: bounds, marketPriceOutOfRange: oor, saneInterior: ins };
    return s;
  }
  __out.ivG11 = summarize(g11, 'G-11 mapping (underlying pc + bidAskMid, r=0.30)');
  __out.ivV9  = summarize(v9,  'v9 mapping (row.pl + row.plc, r=0.2)');
  __out.samplesDiag = g11.slice(0,6);
} catch(e) { __out.error = String(e && e.message || e); }
console.log('PROBE_JSON ' + JSON.stringify(__out));
