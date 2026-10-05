/**
 * GARCH v1.3 — inspect اهرم's closes specifically (now that histLen 60)
 */
(function(){
  var ih=window.mw.InstHistory;
  var rows=window.mw.AllRows?Object.values(window.mw.AllRows):[];
  var اهرمRow=rows.find(function(r){return String(r.l18).trim()==='اهرم';});
  var ins= اهرمRow?String( اهرمRow.inscode):'17914401175772326';
  var hist=ih[ins];
  var closes=[];
  if(Array.isArray(hist)) closes=hist.map(function(d){return d.PClosing;});
  console.log('اهرم ins',ins,' hist type',typeof hist,' len',hist?hist.length:0);
  console.log('first 10 closes', closes.slice(0,10));
  console.log('last 10 closes', closes.slice(-10));
  console.log('filtered >1000', closes.filter(function(v){return v>1000;}).slice(0,10), ' count', closes.filter(function(v){return v>1000;}).length);
  // try garch on filtered >1000
  function garchSimple(closes){
    const omega=1e-6, alpha=0.08, beta=0.88;
    if(!Array.isArray(closes)||closes.length<30) return {error:'insufficient-data'};
    const rets=[]; for(let i=1;i<closes.length;i++) if(closes[i-1]>0&&closes[i]>0) rets.push(Math.log(closes[i]/closes[i-1]));
    if(rets.length<29) return {error:'insufficient-data'};
    const mean=rets.reduce((a,b)=>a+b,0)/rets.length; let var0=rets.reduce((a,b)=>a+(b-mean)*(b-mean),0)/rets.length; if(!isFinite(var0)||var0<=0) var0=1e-6; let sigma2=var0; for(let i=0;i<rets.length;i++){ const e2=(rets[i]-mean)*(rets[i]-mean); sigma2=omega+alpha*e2+beta*sigma2; } return {sigma:Math.sqrt(sigma2), annVol:Math.sqrt(sigma2)*Math.sqrt(252), n:closes.length};
  }
  var filtered=closes.filter(function(v){return v>1000;});
  console.log('garch raw (incl 1s)', garchSimple(closes));
  console.log('garch filtered >1000', garchSimple(filtered));
  return {ins, closesLen:closes.length, filteredLen:filtered.length, garchRaw:garchSimple(closes), garchFiltered:garchSimple(filtered)};
})();
