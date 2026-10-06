/**
 * Debug bsGreeks directly
 */
(function(){
  var S=72798, K=20000, T=30/365, r=0.30, sigma=0.40, kind='call';
  console.log('inputs', {S,K,T,r,sigma, kind});
  console.log('isFinite checks', [S,K,T,r,sigma].map(v=>({v, isFinite: isFinite(v), isNull: v==null, type: typeof v})));
  function normCDF(x){ const a1=0.254829592,a2=-0.284496736,a3=1.421413741,a4=-1.453152027,a5=1.061405429,p=0.3275911; const s=x<0?-1:1; x=Math.abs(x)/Math.sqrt(2); const t=1/(1+p*x); const y=1-(((((a5*t+a4)*t)+a3)*t+a2)*t+a1)*t*Math.exp(-x*x); return 0.5*(1+s*y); }
  function normPDF(x){ return Math.exp(-0.5*x*x)/Math.sqrt(2*Math.PI); }
  function bsGreeks(S,K,T,r,sigma,kind){
    console.log('inside bsGreeks', {S,K,T,r,sigma,kind});
    if([S,K,T,r,sigma].some(v=>v==null||!isFinite(v))) return {error:'insufficient-data', vals:[S,K,T,r,sigma]};
    const d1=(Math.log(S/K)+(r+0.5*sigma*sigma)*T)/(sigma*Math.sqrt(T));
    console.log('d1',d1);
    const pdfd1=normPDF(d1);
    const gamma=pdfd1/(S*sigma*Math.sqrt(T));
    const Nd1=normCDF(d1);
    const delta=kind==='call'?Nd1:Nd1-1;
    return {gamma, delta, d1};
  }
  console.log(bsGreeks(S,K,T,r,sigma,kind));
  // also test with window values
  var rows=window.mw&&window.mw.AllRows?Object.values(window.mw.AllRows):[];
  var Srow=rows.find(function(r){return String(r.l18).trim()==='اهرم';});
  var S2=Srow?parseFloat(String(Srow.pc).replace(/,/g,'')):null;
  console.log('S2 from page', S2, typeof S2);
  console.log('test with S2', bsGreeks(S2,20000,T,r,sigma,'call'));
})();
