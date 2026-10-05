/**
 * GARCH v1.1 — find any InstHistory with >=30 closes (since اهرم had 0 at this moment)
 * Run after waiting 10s for LoadInstHistory to fill
 */
(function g11garch11(){
  var out={ meta:{ test:'G11-GARCH-v1.1', host:location.host, now:new Date().toISOString()}, found:{}, samples:[], status:'' };
  function garchSimple(closes){
    const omega=1e-6, alpha=0.08, beta=0.88;
    if(!Array.isArray(closes)||closes.length<30) return {error:'insufficient-data', reason:'need >=30 closes got '+(closes?.length||0)};
    const rets=[]; for(let i=1;i<closes.length;i++) if(closes[i-1]>0&&closes[i]>0) rets.push(Math.log(closes[i]/closes[i-1]));
    if(rets.length<29) return {error:'insufficient-data'};
    const mean=rets.reduce((a,b)=>a+b,0)/rets.length; let var0=rets.reduce((a,b)=>a+(b-mean)*(b-mean),0)/rets.length; if(!isFinite(var0)||var0<=0) var0=1e-6; let sigma2=var0; for(let i=0;i<rets.length;i++){ const e2=(rets[i]-mean)*(rets[i]-mean); sigma2=omega+alpha*e2+beta*sigma2; } return {sigma:Math.sqrt(sigma2), annVol:Math.sqrt(sigma2)*Math.sqrt(252), n:closes.length};
  }
  try{
    var ih=window.mw && window.mw.InstHistory;
    var keys=ih?Object.keys(ih):[];
    out.found.totalKeys=keys.length;
    out.found.sampleKeys=keys.slice(0,5);
    // find first key with >=30 closes
    var found=null, foundKey=null, closes=[];
    for(let k of keys){
      var hist=ih[k];
      var cur=[];
      if(Array.isArray(hist)) cur=hist.map(function(d){return d.PClosing;}).filter(function(v){return isFinite(v)&&v>0;});
      else if(hist&&typeof hist==='object') cur=Object.values(hist).map(function(d){return d.PClosing;}).filter(isFinite);
      if(cur.length>=30){ found=cur; foundKey=k; break; }
    }
    out.found.foundKey=foundKey;
    out.found.foundLen=found?found.length:0;
    out.found.sampleCloses=found?found.slice(0,5):[];
    if(found){
      var res=garchSimple(found);
      // find l18 for foundKey
      var rows=window.mw.AllRows?Object.values(window.mw.AllRows):[];
      var row=rows.find(function(r){ return String(r.inscode)===foundKey; });
      var l18=row?String(row.l18):foundKey;
      out.samples.push({ l18:l18, inscode:foundKey, closesLen:found.length, garch:res });
      out.status=res.error?'needs-history':'candidate';
    } else {
      out.status='needs-history';
      out.samples.push({error:'no hist with >=30', totalKeys:keys.length});
    }
    // also test اهرم specifically for debug
    var rows2=window.mw.AllRows?Object.values(window.mw.AllRows):[];
    var اهرمRow=rows2.find(function(r){return String(r.l18).trim()==='اهرم';});
    var اهرمIns= اهرمRow?String( اهرمRow.inscode):null;
    var اهرمHist= اهرمIns?ih[ اهرمIns]:null;
    var اهرمCloses= اهرمHist? (Array.isArray( اهرمHist)? اهرمHist.map(function(d){return d.PClosing;}):[]):[];
    out.debugAhrom={ inscode: اهرمIns, histExists:!! اهرمHist, histLen: اهرمCloses? اهرمCloses.length:0 };
  }catch(e){ out.error=e.message; }
  console.log('%c[G11 GARCH v1.1]','color:#0a7;font-weight:bold');
  console.log('found',out.found,' samples',out.samples,' debugAhrom',out.debugAhrom);
  console.log(JSON.stringify(out,null,2));
  return out;
})();
