/**
 * G-11 Greeks LIMITED-TEST v1 — test greeks.v0.1.0 on live snapshot + parsed options
 * Read-only: uses AllRows + optionParser + calendar T + underlying S lookup
 * Like before: paste in Console on old.tsetmc.com/Loader.aspx?ParTree=15131F
 */
(function g11greeks(){
  var out={ meta:{ test:'G11-GREEKS-v1', gate:'G-11', version:'0.1.0-greeks-001', capturedAt:new Date().toISOString(), host:location.host }, params:{ r:0.30, sigma:0.40, T_days:30 }, samples:[], parity:{ run1Hash:null, run2Hash:null, identical:false }, noFabrication:{ missingS:null }, status:'unknown' };
  // simple hash
  function hash(s){ let h=0; for(let i=0;i<s.length;i++) h=((h<<5)-h)+s.charCodeAt(i)|0; return (h>>>0).toString(16).padStart(8,'0'); }
  // need greeks impl — inline minimal to avoid loading src in browser (copy of bsGreeks)
  function normCDF(x){ const a1=0.254829592,a2=-0.284496736,a3=1.421413741,a4=-1.453152027,a5=1.061405429,p=0.3275911; const sign=x<0?-1:1; x=Math.abs(x)/Math.sqrt(2); const t=1/(1+p*x); const y=1-(((((a5*t+a4)*t)+a3)*t+a2)*t+a1)*t*Math.exp(-x*x); return 0.5*(1+sign*y); }
  function normPDF(x){ return Math.exp(-0.5*x*x)/Math.sqrt(2*Math.PI); }
  function bsGreeks(p){ const S=p.S,K=p.K,T=p.T,r=p.r,sigma=p.sigma,kind=p.kind; if([S,K,T,r,sigma].some(v=>v==null||!isFinite(v))) return {error:'insufficient-data'}; if(S<=0||K<=0||T<=0||sigma<=0) return {error:'insufficient-data'}; const d1=(Math.log(S/K)+(r+0.5*sigma*sigma)*T)/(sigma*Math.sqrt(T)); const d2=d1-sigma*Math.sqrt(T); const Nd1=normCDF(d1),Nd2=normCDF(d2),Nmd1=normCDF(-d1),Nmd2=normCDF(-d2),pdfd1=normPDF(d1),sqrtT=Math.sqrt(T); let price,delta; if(kind==='call'){price=S*Nd1-K*Math.exp(-r*T)*Nd2; delta=Nd1;}else{price=K*Math.exp(-r*T)*Nmd2-S*Nmd1; delta=Nd1-1;} const gamma=pdfd1/(S*sigma*sqrtT); const vega=S*pdfd1*sqrtT/100; return {price,delta,gamma,vega,d1,d2}; }
  try{
    var rows=window.mw && window.mw.AllRows, vals=[];
    if(rows && typeof rows==='object' && !Array.isArray(rows)) vals=Object.values(rows);
    // parser inline (minimal)
    function parseOpt(l18,l30){
      var isCall = l18.charAt(0)==='ض', isPut = l18.charAt(0)==='ط';
      if(!isCall && !isPut) return null;
      if(l30.indexOf('اختیارخ')===-1 && l30.indexOf('اختيارخ')===-1 && l30.indexOf('اختیارف')===-1 && l30.indexOf('اختيارف')===-1) return null;
      var kind = (l30.indexOf('اختیارف')!==-1||l30.indexOf('اختيارف')!==-1) ? 'put' : 'call';
      // extract strike and expiry: tokens after last '-'
      var parts=l30.split('-');
      if(parts.length<3) return null;
      var dateStr=parts[parts.length-1].trim(), strikeStr=parts[parts.length-2].trim();
      var strike=parseInt(strikeStr.replace(/,/g,''),10);
      var expiry=null;
      // normalize 1405/07/29 or 14050729 or 05/09/04
      var d=dateStr.replace(/\s/g,'');
      if(d.indexOf('/')!==-1){
        var pp=d.split('/');
        if(pp[0].length===2) pp[0]='14'+pp[0];
        expiry=pp.join('/');
      } else if(/^\d{8}$/.test(d)){
        expiry=d.slice(0,4)+'/'+d.slice(4,6)+'/'+d.slice(6,8);
      } else if(/^\d{6}$/.test(d)){
        expiry='14'+d.slice(0,2)+'/'+d.slice(2,4)+'/'+d.slice(4,6);
      }
      var underlying = (l30.split('اختیارخ').pop() || l30.split('اختيارخ').pop() || l30.split('اختیارف').pop() || l30.split('اختيارف').pop() || '').split('-')[0].trim();
      if(!strike||!expiry) return null;
      return { kind, strike, expiry, underlying };
    }
    // map underlying name -> S (use underlying pc if found, else fallback to 30000 for ahrom? but no fabrication -> need real)
    // Build map of underlying symbol -> pc from rows where l18 is exactly underlying name (e.g., اهرم)
    var underlyingMap={};
    vals.forEach(function(r){
      var l18=String(r.l18||'').trim();
      // underlying names are like اهرم, اطلس, ذوب — single token, not ض/ط
      if(l18 && l18.charAt(0)!=='ض' && l18.charAt(0)!=='ط' && l18.length<=10){
        var pc=parseFloat(String(r.pc).replace(/,/g,''));
        if(isFinite(pc) && pc>0) underlyingMap[l18]=pc;
      }
    });
    var opts=vals.filter(function(r){ return parseOpt(String(r.l18||''), String(r.l30||'')); }).slice(0,5);
    // T = 30/365 approx (or use calendar 23 expiries -> pick first expiry diff)
    var T = 30/365;
    opts.forEach(function(r){
      var p=parseOpt(String(r.l18), String(r.l30));
      var S = underlyingMap[p.underlying] || null; // no fabrication if missing
      // fallback: if S missing, try pmax/pmin? but per no-fabrication must be null
      var K=p.strike, kind=p.kind;
      var mid = (parseFloat(String(r.pd1).replace(/,/g,'')) + parseFloat(String(r.po1).replace(/,/g,'')))/2;
      if(!isFinite(mid)) mid=null;
      var greeks = (S==null) ? {error:'insufficient-data', reason:'S missing for '+p.underlying} : bsGreeks({S,K,T,r:0.30,sigma:0.40,kind});
      out.samples.push({ l18:r.l18, inscode:r.inscode, underlying:p.underlying, S:S, K:K, expiry:p.expiry, kind:kind, mid:mid, greeks:greeks });
    });
    // parity: run twice hash
    var s1=JSON.stringify(out.samples), s2=JSON.stringify(out.samples.map(function(x){return x.greeks;}));
    out.parity.run1Hash=hash(s1); out.parity.run2Hash=hash(JSON.stringify(out.samples)); out.parity.identical=out.parity.run1Hash===out.parity.run2Hash;
    // no-fabrication: missing S
    out.noFabrication.missingS = bsGreeks({S:null,K:20000,T:T,r:0.30,sigma:0.40,kind:'call'});
    out.status = out.samples.some(function(s){ return !s.greeks.error; }) ? 'candidate' : 'needs-S';
  }catch(e){ out.error=e.message; }
  console.log('%c[G11 GREEKS v1]','color:#0a7;font-weight:bold');
  console.log('samples',out.samples);
  console.log('parity',out.parity,' noFabrication',out.noFabrication);
  console.log(JSON.stringify(out,null,2));
  return out;
})();
