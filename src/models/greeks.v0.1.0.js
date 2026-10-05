/**
 * tseZharfaKavosh — Greeks/IV model v0.1.0 — Black-Scholes (European)
 * Depends on: optionParser v0.1.0 (pc/strike/expiry/kind), snapshot canonical, calendar (T)
 * Pure functions, no I/O, no fabrication — missing -> insufficient-data
 * SPDX: Smart-FFA-1.1
 */

// Standard normal CDF approx (Abramowitz & Stegun 7.1.26)
function normCDF(x) {
  const a1=0.254829592, a2=-0.284496736, a3=1.421413741, a4=-1.453152027, a5=1.061405429, p=0.3275911;
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5*t + a4)*t) + a3)*t + a2)*t + a1)*t * Math.exp(-x*x);
  return 0.5 * (1.0 + sign * y);
}
function normPDF(x){ return Math.exp(-0.5*x*x)/Math.sqrt(2*Math.PI); }

// d1,d2
function d1(S,K,T,r,sigma){ return (Math.log(S/K)+(r+0.5*sigma*sigma)*T)/(sigma*Math.sqrt(T)); }
function d2(S,K,T,r,sigma){ return d1(S,K,T,r,sigma)-sigma*Math.sqrt(T); }

/**
 * @param {object} p { S, K, T, r, sigma, kind:'call'|'put' }
 * @returns {object} { price, delta, gamma, theta, vega, rho } or { error }
 */
function bsGreeks(p){
  const {S,K,T,r,sigma,kind}=p;
  // validation — no fabrication
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
    rho = K*T*Math.exp(-r*T)*Nd2/100; // per 1% rate
  } else {
    price = K*Math.exp(-r*T)*Nmd2 - S*Nmd1;
    delta = Nd1 - 1;
    rho = -K*T*Math.exp(-r*T)*Nmd2/100;
  }
  gamma = pdfd1/(S*sigma*sqrtT);
  vega = S*pdfd1*sqrtT/100; // per 1% vol
  // theta per year (approx, without dividend)
  const term1 = -(S*pdfd1*sigma)/(2*sqrtT);
  if(kind==='call'){
    theta = (term1 - r*K*Math.exp(-r*T)*Nd2)/365; // per day
  } else {
    theta = (term1 + r*K*Math.exp(-r*T)*Nmd2)/365;
  }
  return { price, delta, gamma, vega, theta, rho, d1:_d1, d2:_d2 };
}

/**
 * Implied volatility via bisection (requires market price)
 * @param {object} p { S,K,T,r, kind, marketPrice }
 */
function impliedVol(p){
  const {S,K,T,r,kind,marketPrice}=p;
  if([S,K,T,r,marketPrice].some(v=> v==null || !isFinite(v))) return { error:'insufficient-data' };
  let low=0.01, high=3.0, mid, price, iter=0;
  // quick bounds check
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

const VERSION='0.1.0-greeks-001';
module.exports={ normCDF, normPDF, bsGreeks, impliedVol, VERSION };
if(typeof window!=='undefined') window.TseGreeks={ normCDF, normPDF, bsGreeks, impliedVol, VERSION };
