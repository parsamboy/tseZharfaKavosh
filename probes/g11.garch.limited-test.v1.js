/**
 * G-11 GARCH v1 — uses public InstHistory (PClosing) — no credential
 * Run on old.tsetmc.com/Loader.aspx?ParTree=15131F — reads mw.InstHistory
 */
(function garchV1(){
  var out={ meta:{ test:'G11-GARCH-v1', gate:'G-11', version:'0.1.0-garch-001', host:location.host, now:new Date().toISOString()}, samples:[], status:'unknown' };
  function garchSimple(closes){
    const omega=1e-6, alpha=0.08, beta=0.88;
    if(!Array.isArray(closes) || closes.length<30) return {error:'insufficient-data', reason:'need >=30 closes'};
    const rets=[];
    for(let i=1;i<closes.length;i++) if(closes[i-1]>0&&closes[i]>0) rets.push(Math.log(closes[i]/closes[i-1]));
    if(rets.length<29) return {error:'insufficient-data'};
    const mean=rets.reduce((a,b)=>a+b,0)/rets.length;
    let var0=rets.reduce((a,b)=>a+(b-mean)*(b-mean),0)/rets.length; if(!isFinite(var0)||var0<=0) var0=1e-6;
    let sigma2=var0;
    for(let i=0;i<rets.length;i++){ const e2=(rets[i]-mean)*(rets[i]-mean); sigma2=omega+alpha*e2+beta*sigma2; }
    return {sigma:Math.sqrt(sigma2), annVol:Math.sqrt(sigma2)*Math.sqrt(252), sigma2, n:closes.length};
  }
  try{
    var ih=window.mw && window.mw.InstHistory;
    if(!ih || typeof ih!=='object'){ out.error='no InstHistory'; console.log(JSON.stringify(out,null,2)); return out; }
    var keys=Object.keys(ih).slice(0,3);
    // pick an underlying with enough history, e.g., اهرم's inscode? Find via l18 map
    var rows=window.mw.AllRows ? Object.values(window.mw.AllRows) : [];
    var underlyingRow = rows.find(function(r){ return String(r.l18).trim()==='اهرم'; });
    var underlyingInsCode = underlyingRow ? String(underlyingRow.inscode) : keys[0];
    // try underlying inscode first, else first key
    var hist = ih[underlyingInsCode] || ih[keys[0]];
    var closes=[];
    if(Array.isArray(hist)){
      // hist is array of {PClosing...} per v2.3
      closes=hist.map(function(d){ return d.PClosing; }).filter(function(v){ return isFinite(v)&&v>0; });
    } else if(hist && typeof hist==='object'){
      closes=Object.values(hist).map(function(d){ return d.PClosing||d.pClosing; }).filter(isFinite);
    }
    out.debug={ underlyingInsCode, histLen: closes.length, sampleCloses: closes.slice(0,5) };
    var res=garchSimple(closes);
    out.samples.push({ underlying:'اهرم', inscode:underlyingInsCode, closesLen:closes.length, garch:res });
    // also test with too-short series for no-fabrication
    out.noFabrication=garchSimple([1,2,3]);
    out.parity={ run1: garchSimple(closes), run2: garchSimple(closes.slice()), identical: JSON.stringify(garchSimple(closes))===JSON.stringify(garchSimple(closes.slice())) };
    out.status = res.error ? 'needs-history' : 'candidate';
  }catch(e){ out.error=e.message; }
  console.log('%c[G11 GARCH v1]','color:#0a7;font-weight:bold');
  console.log('debug',out.debug,' samples',out.samples,' parity',out.parity);
  console.log(JSON.stringify(out,null,2));
  return out;
})();
