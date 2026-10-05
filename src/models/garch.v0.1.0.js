/**
 * tseZharfaKavosh — GARCH(1,1) v0.1.0 — for underlying history (ClosingPriceAll)
 * Uses PClosing series from mw.InstHistory (public, no auth)
 * Pure, no fabrication — needs at least 30 returns, else insufficient-data
 * SPDX: Smart-FFA-1.1
 */
const VERSION='0.1.0-garch-001';

/**
 * Compute log returns from PClosing series
 * @param {number[]} closes - PClosing array
 */
function logReturns(closes){
  const rets=[];
  for(let i=1;i<closes.length;i++){
    if(closes[i-1]<=0 || closes[i]<=0) continue;
    rets.push(Math.log(closes[i]/closes[i-1]));
  }
  return rets;
}

/**
 * Simple GARCH(1,1) via iterative estimation (not full MLE, but deterministic)
 * omega, alpha, beta fixed to typical values for demo; sigma2 forecast = omega + alpha*e^2 + beta*sigma2
 * For v0.1.0 we use fixed params and compute sigma forecast; full MLE deferred to v0.2.1-beta
 * @param {number[]} closes
 * @param {object} params { omega, alpha, beta } optional
 */
function garch11(closes, params={}){
  const omega=params.omega ?? 1e-6, alpha=params.alpha ?? 0.08, beta=params.beta ?? 0.88;
  if(!Array.isArray(closes) || closes.length < 30) return { error:'insufficient-data', reason:'need >=30 closes, got '+(closes?.length||0) };
  const rets=logReturns(closes);
  if(rets.length < 29) return { error:'insufficient-data', reason:'need >=29 returns' };
  // initial variance = sample variance of returns
  const mean=rets.reduce((a,b)=>a+b,0)/rets.length;
  let var0=rets.reduce((a,b)=>a+(b-mean)*(b-mean),0)/rets.length;
  if(!isFinite(var0) || var0<=0) var0=1e-6;
  let sigma2=var0;
  // iterate over returns to get final sigma2 forecast
  for(let i=0;i<rets.length;i++){
    const e2=(rets[i]-mean)*(rets[i]-mean);
    sigma2 = omega + alpha*e2 + beta*sigma2;
  }
  const sigma=Math.sqrt(sigma2);
  // annualized vol: daily sigma * sqrt(252)
  const annVol = sigma * Math.sqrt(252);
  return { sigma, annVol, sigma2, omega, alpha, beta, n: closes.length, returns: rets.length, lastClose: closes[closes.length-1] };
}

module.exports={ garch11, logReturns, VERSION };
if(typeof window!=='undefined') window.TseGarch={ garch11, logReturns, VERSION };
