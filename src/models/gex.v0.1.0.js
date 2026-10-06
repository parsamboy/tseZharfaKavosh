/**
 * tseZharfaKavosh — GEX/DEX v0.1.0 without OI (approx) — for live worth test
 * GEX = sum(gamma * OI * ContractSize * S) — without OI we use tvol or 1 as proxy to test shape
 * This is APPROX for worth test only — not exact per spec, must be marked approx
 * SPDX: Smart-FFA-1.1
 */
const VERSION='0.1.0-gex-approx-001';

function gexForChain(chain, S, greeksMap, opts={}){
  // chain: [{strike, kind, gamma, inscode, tvol}]
  // opts: { useOI:'tvol'|'one'|'zero', contractSize:1000 }
  const cs = opts.contractSize ?? 1000;
  const useOI = opts.useOI ?? 'tvol';
  let gex=0, dex=0, count=0;
  for(let c of chain){
    let oi;
    if(useOI==='tvol') oi=c.tvol;
    else if(useOI==='one') oi=1;
    else if(useOI==='zero') oi=0;
    else oi=c.tvol;
    if(!isFinite(oi) || oi<=0) oi=1; // fallback to 1 if tvol 0, to avoid zero GEX
    if(!isFinite(c.gamma)) continue;
    const gammaOI = c.gamma * oi * cs * S;
    // For GEX, call gamma positive contributes +, put gamma positive but need sign? simplified: use gamma * OI * S
    // DEX = delta * OI * cs * S
    gex += gammaOI;
    dex += (c.delta ?? 0) * oi * cs * S;
    count++;
  }
  return { gex, dex, count, approx: useOI!=='exact', contractSize:cs, useOI };
}

module.exports={ gexForChain, VERSION };
if(typeof window!=='undefined') window.TseGex={ gexForChain, VERSION };
