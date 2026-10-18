/**
 * tseZharfaKavosh — IV borderline probe v0.1.0 [کنسول]
 * READ-ONLY on the Bourse page (parTree 15131F). No FilterCode / SaveParams / network.
 * SPDX-License-Identifier: Smart-FFA-1.1
 *
 * Purpose — decide whether `ivFilterEnabled` can finally be turned ON (owner q1).
 *
 * The engine now has three layers in front of the IV solver:
 *   1. the hybrid price hierarchy (owner q8): bid/ask mid -> `pl` when tno > 0 -> none
 *   2. the market-price guards: no-arbitrage bounds + a 20% max book width
 *   3. ivMax = 3.0 as the backup layer (owner q7)
 *
 * The original 77% "IV at cap" warning came from a probe that counted ITERATIONS.
 * That metric is meaningless here: the price tolerance |price - marketPrice| < 1e-6
 * is unreachable at rial scales, so every row exits via the width criterion after
 * ~25 iterations. The meaningful metric is BOUNDARY PINNING: does the solved sigma
 * sit on the solver's floor (0.01) or ceiling (3.0), i.e. is there no solution?
 *
 * This probe measures that on live data, TWICE:
 *   RUN A — the engine's shipped config: T = 30/365 for every option
 *   RUN B — the correct maturity:      T = DTE/365 per option
 * The two are compared because the shipped T is a fixed approximation inherited
 * from probe G-11, and the live expiries can be days away (1405/07/29 == 2026-10-21).
 *
 * Decision rule (owner):
 *   borderline < 3%  -> ivFilterEnabled = true is safe
 *   3-8%             -> product decision: do we reject those rows?
 *   > 8%             -> still broken; look at the layer diagnostics below
 *
 * Everything below mirrors src/engine/bEngine.v0.1.0.js and src/models/greeks.v0.1.0.js
 * verbatim, so the probe measures the shipped path. If window.TseBEngine happens to
 * be loaded, a parity check against the real computeFunnel() is reported too.
 *
 * Run: paste in the console on the Bourse page, then report the PROBE_JSON line.
 */
'use strict';

(function () {
  var __out = { probe: 'ivfilter.borderline.live.v1', tag: 'کنسول', host: location.host, capturedAt: new Date().toISOString() };
  try {

    // ---------- verbatim src/models/greeks.v0.1.0.js ----------
    function normCDF(x) {
      var a1=0.254829592, a2=-0.284496736, a3=1.421413741, a4=-1.453152027, a5=1.061405429, p=0.3275911;
      var sign = x < 0 ? -1 : 1;
      x = Math.abs(x) / Math.sqrt(2);
      var t = 1.0 / (1.0 + p * x);
      var y = 1.0 - (((((a5*t + a4)*t) + a3)*t + a2)*t + a1)*t * Math.exp(-x*x);
      return 0.5 * (1.0 + sign * y);
    }
    function normPDF(x){ return Math.exp(-0.5*x*x)/Math.sqrt(2*Math.PI); }
    function d1(S,K,T,r,sigma){ return (Math.log(S/K)+(r+0.5*sigma*sigma)*T)/(sigma*Math.sqrt(T)); }
    function bsGreeks(p){
      var S=p.S,K=p.K,T=p.T,r=p.r,sigma=p.sigma,kind=p.kind;
      if([S,K,T,r,sigma].some(function(v){return v==null||typeof v!=='number'||!isFinite(v);})) return {error:'insufficient-data'};
      if(S<=0||K<=0||T<=0||sigma<=0) return {error:'insufficient-data'};
      if(kind!=='call'&&kind!=='put') return {error:'invalid-kind'};
      var _d1=d1(S,K,T,r,sigma), _d2=_d1-sigma*Math.sqrt(T);
      var Nd1=normCDF(_d1), Nd2=normCDF(_d2), Nmd1=normCDF(-_d1), Nmd2=normCDF(-_d2);
      var sqrtT=Math.sqrt(T), price, delta;
      if(kind==='call'){ price=S*Nd1-K*Math.exp(-r*T)*Nd2; delta=Nd1; }
      else { price=K*Math.exp(-r*T)*Nmd2-S*Nmd1; delta=Nd1-1; }
      return { price:price, delta:delta, gamma:normPDF(_d1)/(S*sigma*sqrtT) };
    }
    function impliedVol(p){
      var S=p.S,K=p.K,T=p.T,r=p.r,kind=p.kind,marketPrice=p.marketPrice;
      if([S,K,T,r,marketPrice].some(function(v){return v==null||!isFinite(v);})) return {error:'insufficient-data'};
      var low=0.01, high=3.0, mid, price, iter=0, iters=0;
      var loP=bsGreeks({S:S,K:K,T:T,r:r,sigma:low,kind:kind}).price;
      var hiP=bsGreeks({S:S,K:K,T:T,r:r,sigma:high,kind:kind}).price;
      if(marketPrice < Math.min(loP,hiP) || marketPrice > Math.max(loP,hiP)) { /* still bisect */ }
      while(iter<50){
        mid=(low+high)/2; price=bsGreeks({S:S,K:K,T:T,r:r,sigma:mid,kind:kind}).price; iters++;
        if(Math.abs(price-marketPrice) < 1e-6 || (high-low) < 1e-7){ break; }
        if(price>marketPrice) high=mid; else low=mid;
        iter++;
      }
      return { sigma:mid, iterations:iters };
    }

    // ---------- verbatim src/optionParser.v0.1.0.js ----------
    function parseOptionLabel(row) {
      if (!row || typeof row !== 'object') return { status: 'unknown', reason: 'row not object' };
      var l18 = String(row.l18 || '').trim(), l30 = String(row.l30 || '').trim();
      if (!l18 || !l30) return { status: 'unknown', reason: 'missing l18/l30' };
      var first = l18.charAt(0);
      if (first !== 'ض' && first !== 'ط') return { status: 'rejected', reason: 'l18 does not start with ض/ط' };
      var l30norm = l30.replace(/ي/g, 'ی').replace(/ك/g, 'ک');
      if (l30norm.indexOf('اختیار') === -1 && l30.indexOf('اختيار') === -1) return { status: 'unknown', reason: 'l30 missing اختیار' };
      var kind = null;
      if (l30norm.indexOf('اختیارخ') !== -1 || l30.indexOf('اختيارخ') !== -1) kind = 'call';
      else if (l30norm.indexOf('اختیارف') !== -1 || l30.indexOf('اختيارف') !== -1) kind = 'put';
      else kind = first === 'ض' ? 'call' : 'put';
      var strike = null, expiry = null, underlying = null;
      var dashParts = l30.split('-');
      if (dashParts.length >= 2) {
        var last = dashParts[dashParts.length - 1].trim();
        var m = last.match(/^(\d{4}\/\d{2}\/\d{2}|\d{8})$/);
        if (m) {
          expiry = m[1];
          if (/^\d{8}$/.test(expiry)) expiry = expiry.slice(0,4)+'/'+expiry.slice(4,6)+'/'+expiry.slice(6,8);
          var sm = dashParts[dashParts.length - 2].trim().match(/(\d[\d,]*)/);
          if (sm) strike = parseInt(sm[1].replace(/,/g,''), 10);
          var before = dashParts.slice(0, dashParts.length - 2).join('-');
          var um = before.match(/اختیار[خف]\s+(.+)/) || before.match(/اختيار[خف]\s+(.+)/);
          if (um) underlying = um[1].trim();
          else { var tk = before.trim().split(/\s+/); underlying = tk[tk.length-1] || null; }
        }
      }
      if (strike !== null && expiry) return { status: 'confirmed', kind: kind, underlying: underlying, strike: strike, expiry: expiry };
      return { status: 'candidate', underlying: underlying, strike: strike, expiry: expiry };
    }

    // ---------- Jalali -> Gregorian (verified: 1405/01/01 == 2026-03-21) ----------
    var J_MONTH_DAYS = [31,31,31,31,31,31,30,30,30,30,30,29];
    var J_EPOCH_JDN = 2305527;               // JDN of 1 Farvardin 979
    function gregToJDN(y,m,d){ var a=Math.floor((14-m)/12), y2=y+4800-a, m2=m+12*a-3;
      return d+Math.floor((153*m2+2)/5)+365*y2+Math.floor(y2/4)-Math.floor(y2/100)+Math.floor(y2/400)-32045; }
    function jdnToGreg(j){ var a=j+32044, b=Math.floor((4*a+3)/146097), c=a-Math.floor(146097*b/4),
      d=Math.floor((4*c+3)/1461), e=c-Math.floor(1461*d/4), m=Math.floor((5*e+2)/153);
      return { y:100*b+d-4800+Math.floor(m/10), m:m+3-12*Math.floor(m/10), d:e-Math.floor((153*m+2)/5)+1 }; }
    function jalaliToJDN(jy,jm,jd){
      var jy1=jy-979, j=365*jy1+Math.floor(jy1/33)*8+Math.floor((jy1%33+3)/4);
      for(var i=0;i<jm-1;i++) j += J_MONTH_DAYS[i];
      return J_EPOCH_JDN + j + jd - 1;
    }
    function dteDays(expiryStr, todayJDN){
      var m = String(expiryStr||'').match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
      if (!m) return null;
      return jalaliToJDN(+m[1], +m[2], +m[3]) - todayJDN;
    }

    // ---------- mirror of bEngine: buildUnderlyingMap ----------
    function toNum(v){ if(v===''||v===null||v===undefined) return null; var n=Number(v); return isFinite(n)?n:null; }
    function buildUnderlyingMap(list){
      var map = Object.create(null);
      for (var i=0;i<list.length;i++){
        var r = list[i]; if(!r) continue;
        var l18 = String(r.l18||'').trim();
        if(!l18 || l18.length>12) continue;
        var first = l18.charAt(0);
        if(first==='ض'||first==='ط') continue;
        var price = toNum(r.pc);
        if(price!==null && price>0 && map[l18]===undefined) map[l18]=price;
      }
      return map;
    }

    // ---------- mirror of bEngine: marketPriceProblem (with the fromBook flag) ----------
    function marketPriceProblem(row, S, K, T, r, kind, marketPrice, cfg, fromBook){
      if(!cfg || cfg.checkArbitrageBounds !== false){
        var disc = Math.exp(-r*T), lo, hi;
        if(kind==='put'){ lo=Math.max(0, K*disc - S); hi=K*disc; }
        else { lo=Math.max(0, S - K*disc); hi=S; }
        if(marketPrice < lo-1 || marketPrice > hi+1) return 'price-outside-arbitrage-bounds';
      }
      var bid=toNum(row&&row.pd1), ask=toNum(row&&row.po1);
      var maxSpread = (cfg && typeof cfg.maxSpreadPct==='number') ? cfg.maxSpreadPct : 0.20;
      if(fromBook!==false && bid!==null && ask!==null && bid>0 && ask>bid && maxSpread>0){
        var mid=(bid+ask)/2;
        if(mid>0 && (ask-bid)/mid > maxSpread) return 'book-too-wide';
      }
      return null;
    }

    // ---------- mirror of bEngine: the hybrid hierarchy (owner q8) ----------
    function resolvePrice(row, S, K, T, r, kind, cfg){
      var blocked = 'no usable market price';
      var bid=toNum(row.pd1), ask=toNum(row.po1);
      if(bid!==null && ask!==null && bid>0 && ask>0){
        var mid=(bid+ask)/2;
        var prob=marketPriceProblem(row,S,K,T,r,kind,mid,cfg,true);
        if(!prob) return {ok:true, price:mid, source:'mid'};
        blocked = prob;
      }
      var trades=toNum(row.tno), last=toNum(row.pl);
      if(trades!==null && trades>0 && last!==null && last>0){
        var prob2=marketPriceProblem(row,S,K,T,r,kind,last,cfg,false);
        if(!prob2) return {ok:true, price:last, source:'pl-traded'};
        return {ok:false, reason:prob2};
      }
      return {ok:false, reason:blocked};
    }

    // ---------- data ----------
    var mw = window.mw;
    var AllRows = mw && mw.AllRows;
    if (!AllRows) { __out.error = 'mw.AllRows not found'; console.log('PROBE_JSON ' + JSON.stringify(__out)); return; }
    var keys = Object.keys(AllRows);
    var rows = [];
    for (var i=0;i<keys.length;i++){ var r=AllRows[keys[i]]; if(r) rows.push(r); }
    __out.totalSymbols = rows.length;

    var underMap = buildUnderlyingMap(rows);
    __out.underlyingMapSize = Object.keys(underMap).length;

    var today = new Date();
    var todayJDN = gregToJDN(today.getFullYear(), today.getMonth()+1, today.getDate());
    __out.today = today.toISOString().slice(0,10);

    // ---------- one measurement pass ----------
    // Tmode: 'fixed30' (engine default) or 'dte' (correct maturity)
    function measure(Tmode){
      var st = { total:0, srcMid:0, srcPlTraded:0, srcInsufficient:0,
                 guardArb:0, guardSpread:0, guardOther:0,
                 noS:0, noT:0, ivSolved:0, ivFailed:0, atLower:0, atUpper:0, normal:0,
                 dteHist:{}, tMin:null, tMax:null };
      var hist = { 'at_lower':0, '<0.05':0, '0.05-0.1':0, '0.1-0.2':0, '0.2-0.5':0,
                   '0.5-1':0, '1-1.5':0, '1.5-2':0, '2-2.9':0, 'at_upper':0 };
      var samples = [];
      var cfg = { checkArbitrageBounds:true, maxSpreadPct:0.20 };
      var EPS_LO = 0.011, EPS_HI = 2.99;
      for (var i=0;i<rows.length;i++){
        var row = rows[i];
        var parsed = parseOptionLabel(row);
        if (parsed.status !== 'confirmed') continue;
        st.total++;
        var K = parsed.strike, kind = parsed.kind;
        var S = underMap[parsed.underlying];
        if (S === undefined) { st.noS++; st.ivFailed++; st.guardOther++; continue; }
        var dte = dteDays(parsed.expiry, todayJDN);
        var T = (Tmode === 'dte') ? ((dte !== null && dte > 0) ? dte/365 : null) : 30/365;
        if (T === null) { st.noT++; st.ivFailed++; st.guardOther++; continue; }
        if (Tmode === 'dte') {
          var b = dte <= 0 ? 'expired' : (dte <= 7 ? '0-7d' : (dte <= 30 ? '8-30d' : (dte <= 90 ? '31-90d' : '>90d')));
          st.dteHist[b] = (st.dteHist[b]||0) + 1;
          if (st.tMin === null || T < st.tMin) st.tMin = T;
          if (st.tMax === null || T > st.tMax) st.tMax = T;
        }
        var pr = resolvePrice(row, S, K, T, 0.30, kind, cfg);
        if (!pr.ok) {
          st.srcInsufficient++;
          if (pr.reason === 'price-outside-arbitrage-bounds') st.guardArb++;
          else if (pr.reason === 'book-too-wide') st.guardSpread++;
          else st.guardOther++;
          st.ivFailed++;
          continue;
        }
        if (pr.source === 'mid') st.srcMid++; else st.srcPlTraded++;
        var iv = impliedVol({ S:S, K:K, T:T, r:0.30, kind:kind, marketPrice:pr.price });
        if (!iv || !iv.sigma || !isFinite(iv.sigma)) { st.ivFailed++; continue; }
        st.ivSolved++;
        var s = iv.sigma;
        if (s <= EPS_LO) { st.atLower++; hist['at_lower']++; }
        else if (s >= EPS_HI) { st.atUpper++; hist['at_upper']++; }
        else {
          st.normal++;
          hist[s<0.05?'<0.05':s<0.1?'0.05-0.1':s<0.2?'0.1-0.2':s<0.5?'0.2-0.5':s<1?'0.5-1':s<1.5?'1-1.5':s<2?'1.5-2':'2-2.9']++;
        }
        if ((s <= EPS_LO || s >= EPS_HI) && samples.length < 10) {
          samples.push({ l18:String(row.l18), base:parsed.underlying, S:Math.round(S), K:K,
            dte:dte, price:Math.round(pr.price), src:pr.source,
            bid:toNum(row.pd1), ask:toNum(row.po1), tno:toNum(row.tno),
            iv:Math.round(s*10000)/10000, side: s<=EPS_LO ? 'lower' : 'upper' });
        }
      }
      var solved = st.ivSolved || 1;
      st.borderline = st.atLower + st.atUpper;
      st.borderlinePct = +(st.borderline / solved * 100).toFixed(1);
      st.solveFailPct = +(st.ivFailed / (st.total||1) * 100).toFixed(1);
      st.midPct = +(st.srcMid / (st.total||1) * 100).toFixed(1);
      st.plPct = +(st.srcPlTraded / (st.total||1) * 100).toFixed(1);
      st.insufficientPct = +(st.srcInsufficient / (st.total||1) * 100).toFixed(1);
      st.guardHitPct = +((st.guardArb + st.guardSpread) / (st.total||1) * 100).toFixed(1);
      st.hist = hist;
      st.samples = samples;
      return st;
    }

    var A = measure('fixed30');
    var B = measure('dte');
    __out.runA_fixedT30 = A;
    __out.runB_realDTE = B;
    __out.dteHistogram = B.dteHist;
    __out.T_range_real = { min: B.tMin, max: B.tMax };

    // ---------- parity against the real engine, if it is loaded ----------
    __out.engineParity = 'skipped (window.TseBEngine not loaded)';
    if (window.TseBEngine && window.TseGreeks && window.tseZharfaKavosh_parseOptionLabel) {
      try {
        var eng = window.TseBEngine.createBEngine({
          models: { parseOptionLabel: window.tseZharfaKavosh_parseOptionLabel,
                    impliedVol: window.TseGreeks.impliedVol, bsGreeks: window.TseGreeks.bsGreeks },
          funnelConfig: { ivFilterEnabled: true, marketPriceFrom: 'hybrid', ivMax: 3.0 }
        });
        eng.run(rows, 'probe-parity', 'cfg-parity');
        var agree = 0, disagree = 0, checked = 0, firstDiff = null;
        for (var i=0;i<rows.length && checked<200;i++){
          var row = rows[i], parsed = parseOptionLabel(row);
          if (parsed.status !== 'confirmed') continue;
          checked++;
          var S = underMap[parsed.underlying];
          if (S === undefined) continue;
          var dte = dteDays(parsed.expiry, todayJDN);
          if (dte === null || dte <= 0) continue;
          // compare the price-resolution layer ONLY, at the engine's own T (30/365):
          // the arbitrage bounds depend on T, so comparing across different T values
          // would report legitimate differences as disagreements.
          var mine = resolvePrice(row, S, parsed.strike, 30/365, 0.30, parsed.kind, {checkArbitrageBounds:true, maxSpreadPct:0.20});
          var engineFr = eng.computeFunnel(row, parsed);
          var engineOk = (engineFr.status === 'ok');
          var same = (mine.ok === engineOk) && (!mine.ok || mine.source === engineFr.inputs.marketPriceSource);
          if (same) agree++; else { disagree++; if(!firstDiff) firstDiff = { l18:String(row.l18), mine:mine,
            engine:{ status:engineFr.status, reason:engineFr.reason, src:engineFr.inputs && engineFr.inputs.marketPriceSource } }; }
        }
        __out.engineParity = { checked:checked, agree:agree, disagree:disagree, firstDiff:firstDiff };
      } catch(e) { __out.engineParity = 'error: ' + String(e && e.message || e); }
    }

    // ---------- decision helper ----------
    var worst = Math.max(A.borderlinePct, B.borderlinePct);
    __out.decision = worst < 3 ? 'SAFE-TO-ENABLE (borderline ' + worst + '% < 3%)'
                  : worst <= 8 ? 'PRODUCT-DECISION (borderline ' + worst + '% in 3-8%)'
                  : 'STILL-BROKEN (borderline ' + worst + '% > 8%)';
    __out.layerDiagnosis = {
      guardHitPct: B.guardHitPct,
      insufficientPct: B.insufficientPct,
      solveFailPct: B.solveFailPct,
      atLower: B.atLower, atUpper: B.atUpper,
      note: 'guard>15% -> the price layer discards a lot (signal loss, not a bug); ' +
            'insufficient>15% -> too many rows have no valid price; ' +
            'ivFailed>20% -> the solver fails on data the guards let through (check S/T/K); ' +
            'atLower>atUpper -> floor pinning (deep ITM put / deep OTM call with a tiny mid); ' +
            'atUpper>atLower -> ceiling pinning (a large mid or a wide book that slipped through)'
    };

    // ---------- console report ----------
    function line(t){ console.log(t); }
    line('=== IV borderline probe (post q7+q8) ===');
    line('host=' + __out.host + '  symbols=' + __out.totalSymbols + '  underlyingMap=' + __out.underlyingMapSize + '  today=' + __out.today);
    line('--- DTE distribution (real maturities) ---');
    console.table(__out.dteHistogram);
    line('--- RUN A: engine config (T = 30/365 for every option) ---');
    console.table({ total:A.total, mid:A.srcMid, plTraded:A.srcPlTraded, insufficient:A.srcInsufficient,
      guardArb:A.guardArb, guardSpread:A.guardSpread, noS:A.noS, noT:A.noT,
      ivSolved:A.ivSolved, ivFailed:A.ivFailed, atLower:A.atLower, atUpper:A.atUpper, borderlinePct:A.borderlinePct });
    line('--- RUN B: correct maturity (T = DTE/365) ---');
    console.table({ total:B.total, mid:B.srcMid, plTraded:B.srcPlTraded, insufficient:B.srcInsufficient,
      guardArb:B.guardArb, guardSpread:B.guardSpread, noS:B.noS, noT:B.noT,
      ivSolved:B.ivSolved, ivFailed:B.ivFailed, atLower:B.atLower, atUpper:B.atUpper, borderlinePct:B.borderlinePct });
    line('--- price source (RUN B) --- mid=' + B.srcMid + ' (' + B.midPct + '%)  pl-traded=' + B.srcPlTraded +
         ' (' + B.plPct + '%)  insufficient=' + B.srcInsufficient + ' (' + B.insufficientPct + '%)');
    line('--- IV histogram (RUN B) ---');
    console.table(B.hist);
    line('--- borderline samples (RUN B, up to 10) ---');
    console.table(B.samples);
    line('--- layer diagnosis (RUN B) ---');
    console.table(__out.layerDiagnosis);
    line('DECISION: ' + __out.decision);
    if (__out.engineParity !== 'skipped (window.TseBEngine not loaded)') line('engineParity: ' + JSON.stringify(__out.engineParity));

  } catch (e) {
    __out.error = String(e && e.message || e) + ' @ ' + (e && e.stack || '').split('\n')[1];
  }
  console.log('PROBE_JSON ' + JSON.stringify(__out));
})();
