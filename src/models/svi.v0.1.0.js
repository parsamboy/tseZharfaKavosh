/**
 * tseZharfaKavosh — SVI v0.1.0 partial (without OI weighting) — 1-A
 * Raw SVI: w(k) = a + b*(rho*(k-m) + sqrt((k-m)^2 + sigma^2))
 * k = log(K/F), F = forward (here S*exp(rT) approx S), w = total variance = sigma^2 * T
 * Fitting deferred to v0.2.1-beta with OI weighting; v0.1.0 provides evaluation + no-fabrication
 * SPDX: Smart-FFA-1.1
 */
const VERSION='0.1.0-svi-001';

function sviTotalVariance(k, params){
  const {a,b,rho,m,sigma}=params;
  if([a,b,rho,m,sigma,k].some(v=> v==null || !isFinite(v))) return { error:'insufficient-data' };
  if(b<0 || sigma<=0 || Math.abs(rho)>1) return { error:'invalid-params' };
  const km=k-m;
  const w = a + b*(rho*km + Math.sqrt(km*km + sigma*sigma));
  if(w<0) return { error:'negative-variance', w };
  return { w, iv: Math.sqrt(w) }; // w = iv^2 * T, but here w is total variance for given T
}

/**
 * Tot variance for strike K given S, T, sviParams
 * k = ln(K/S) - rT? simplified to ln(K/F) where F=S*exp(rT)
 */
function sviForStrike(S,K,T,r, sviParams){
  if([S,K,T].some(v=> v==null||!isFinite(v)||v<=0)) return {error:'insufficient-data'};
  const F=S*Math.exp(r*T);
  const k=Math.log(K/F);
  return sviTotalVariance(k, sviParams);
}

// Example default params (for اهرم, not calibrated — placeholder, real fit needs chain+IV)
const DEFAULT_SVI_PARAMS={ a:0.04, b:0.2, rho:-0.3, m:0.0, sigma:0.2 };

module.exports={ sviTotalVariance, sviForStrike, DEFAULT_SVI_PARAMS, VERSION };
if(typeof window!=='undefined') window.TseSvi={ sviTotalVariance, sviForStrike, DEFAULT_SVI_PARAMS, VERSION };
