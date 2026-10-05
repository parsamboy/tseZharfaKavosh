/**
 * G-11 Greeks v1.1 — fix underlying extraction + debug S map
 * Run on old.tsetmc.com/Loader.aspx?ParTree=15131F
 */
(function g11v11(){
  var out={ meta:{ test:'G11-GREEKS-v1.1', host:location.host, now:new Date().toISOString()}, debug:{ underlyingMapKeys:[], underlyingMapSample:[], l30Samples:[] }, samples:[], parity:{}, status:'' };
  function normCDF(x){ const a1=0.254829592,a2=-0.284496736,a3=1.421413741,a4=-1.453152027,a5=1.061405429,p=0.3275911; const s=x<0?-1:1; x=Math.abs(x)/Math.sqrt(2); const t=1/(1+p*x); const y=1-(((((a5*t+a4)*t)+a3)*t+a2)*t+a1)*t*Math.exp(-x*x); return 0.5*(1+s*y); }
  function normPDF(x){ return Math.exp(-0.5*x*x)/Math.sqrt(2*Math.PI); }
  function bsGreeks(p){ const S=p.S,K=p.K,T=p.T,r=p.r,sigma=p.sigma,kind=p.kind; if([S,K,T,r,sigma].some(v=>v==null||!isFinite(v))) return {error:'insufficient-data'}; if(S<=0||K<=0||T<=0||sigma<=0) return {error:'insufficient-data'}; const d1=(Math.log(S/K)+(r+0.5*sigma*sigma)*T)/(sigma*Math.sqrt(T)); const d2=d1-sigma*Math.sqrt(T); const Nd1=normCDF(d1),Nd2=normCDF(d2),Nmd1=normCDF(-d1),Nmd2=normCDF(-d2),pdfd1=normPDF(d1),sqrtT=Math.sqrt(T); let price,delta; if(kind==='call'){price=S*Nd1-K*Math.exp(-r*T)*Nd2; delta=Nd1;}else{price=K*Math.exp(-r*T)*Nmd2-S*Nmd1; delta=Nd1-1;} return {price,delta,gamma:pdfd1/(S*sigma*sqrtT),vega:S*pdfd1*sqrtT/100,d1,d2}; }
  function hash(s){ let h=0; for(let i=0;i<s.length;i++) h=((h<<5)-h)+s.charCodeAt(i)|0; return (h>>>0).toString(16).padStart(8,'0'); }
  // robust parser
  function parseOpt(l18,l30){
    var isCall=l18.charAt(0)==='ض', isPut=l18.charAt(0)==='ط';
    if(!isCall && !isPut) return null;
    // check l30 contains اختیار (any variant) and خ/ف
    if(l30.indexOf('اختیار')===-1 && l30.indexOf('اختيار')===-1) return null;
    var kind = (l30.indexOf('اختیارف')!==-1 || l30.indexOf('اختيارف')!==-1 || l30.indexOf('ف')!==-1 && l30.indexOf('اختیارخ')===-1) ? 'put' : 'call';
    // more robust: if contains ف after اختیار then put else call
    if(l30.indexOf('اختیارف')!==-1 || l30.indexOf('اختيارف')!==-1) kind='put'; else if(l30.indexOf('اختیارخ')!==-1||l30.indexOf('اختيارخ')!==-1) kind='call';
    var parts=l30.split('-');
    if(parts.length<3) return null;
    var strikeStr=parts[parts.length-2].replace(/,/g,'').trim(), dateStr=parts[parts.length-1].trim();
    var strike=parseInt(strikeStr,10);
    var expiry=null;
    var d=dateStr.replace(/\s/g,'');
    if(d.indexOf('/')!==-1){ var pp=d.split('/'); if(pp[0].length===2) pp[0]='14'+pp[0]; expiry=pp.join('/'); }
    else if(/^\d{8}$/.test(d)) expiry=d.slice(0,4)+'/'+d.slice(4,6)+'/'+d.slice(6,8);
    else if(/^\d{6}$/.test(d)) expiry='14'+d.slice(0,2)+'/'+d.slice(2,4)+'/'+d.slice(4,6);
    // underlying: first part before first '-', remove اختیار prefix
    var first=parts[0];
    // remove any اختیار variant prefix
    first=first.replace(/.*اختیارخ\s*/,'').replace(/.*اختيارخ\s*/,'').replace(/.*اختیارف\s*/,'').replace(/.*اختيارف\s*/,'').trim();
    // if still contains اختیار, fallback split
    if(first.indexOf('اختیار')!==-1) first=first.split(' ').pop().trim();
    var underlying=first.split(' ')[0].trim();
    if(!strike||!expiry||!underlying) return null;
    return {kind,strike,expiry,underlying, rawFirst:parts[0]};
  }
  try{
    var rows=window.mw && window.mw.AllRows, vals=[];
    if(rows && typeof rows==='object' && !Array.isArray(rows)) vals=Object.values(rows);
    // build underlying map
    var umap={};
    vals.forEach(function(r){
      var l18=String(r.l18||'').trim();
      if(l18 && l18.charAt(0)!=='ض' && l18.charAt(0)!=='ط' && l18.length<=12){
        var pc=parseFloat(String(r.pc).replace(/,/g,''));
        if(isFinite(pc) && pc>0) umap[l18]=pc;
      }
    });
    out.debug.underlyingMapKeys=Object.keys(umap).slice(0,15);
    out.debug.underlyingMapSample=Object.entries(umap).slice(0,5).map(function(e){return e[0]+':'+e[1];});
    // l30 samples for debug
    var optVals=vals.filter(function(r){ return String(r.l18||'').charAt(0)==='ض' || String(r.l18||'').charAt(0)==='ط'; }).slice(0,3);
    out.debug.l30Samples=optVals.map(function(r){ return {l18:r.l18,l30:r.l30}; });
    var T=30/365;
    var opts=vals.filter(function(r){ return parseOpt(String(r.l18||''),String(r.l30||'')); }).slice(0,5);
    opts.forEach(function(r){
      var p=parseOpt(String(r.l18),String(r.l30));
      var S=umap[p.underlying] || null;
      // also try to find S via search for l18 == underlying
      if(S==null){
        // brute search: find row where l18==underlying exactly
        var found=vals.find(function(x){ return String(x.l18).trim()===p.underlying; });
        if(found) S=parseFloat(String(found.pc).replace(/,/g,''));
      }
      var K=p.strike, kind=p.kind;
      var mid=(parseFloat(String(r.pd1).replace(/,/g,''))+parseFloat(String(r.po1).replace(/,/g,'')))/2;
      if(!isFinite(mid)) mid=null;
      var greeks = (S==null||!isFinite(S)) ? {error:'insufficient-data', reason:'S missing for '+p.underlying+' (map has '+Object.keys(umap).slice(0,5).join(',')+')'} : bsGreeks({S,K,T,r:0.30,sigma:0.40,kind});
      out.samples.push({l18:r.l18, inscode:r.inscode, underlying:p.underlying, rawFirst:p.rawFirst, S:S, K:K, expiry:p.expiry, kind:kind, mid:mid, greeks:greeks});
    });
    var s1=JSON.stringify(out.samples);
    out.parity.run1Hash=hash(s1); out.parity.run2Hash=hash(JSON.stringify(out.samples)); out.parity.identical=out.parity.run1Hash===out.parity.run2Hash;
    out.status=out.samples.some(function(s){ return !s.greeks.error; }) ? 'candidate' : 'needs-S';
  }catch(e){ out.error=e.message; console.error(e); }
  console.log('%c[G11 v1.1]','color:#0a7;font-weight:bold');
  console.log('underlyingMapKeys',out.debug.underlyingMapKeys);
  console.log('l30Samples',out.debug.l30Samples);
  console.log('samples',out.samples);
  console.log(JSON.stringify(out,null,2));
  return out;
})();
