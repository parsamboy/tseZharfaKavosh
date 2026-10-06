/**
 * GEX/Flow LIVE v3 — fix shadowing bug (r variable) — without OI worth test
 * Run on old.tsetmc.com/Loader.aspx?ParTree=15131F
 */
(async function gexLive3(){
  var out={ meta:{ test:'G11-GEX-LIVE-v3', gate:'G-11', version:'0.1.0-gex-approx-001', host:location.host, now:new Date().toISOString()}, chain:{ underlying:'اهرم', expiry:'1405/07/29', count:0, strikes:[] }, results:[], worth:{}, status:'unknown' };
  function normCDF(x){ const a1=0.254829592,a2=-0.284496736,a3=1.421413741,a4=-1.453152027,a5=1.061405429,p=0.3275911; const s=x<0?-1:1; x=Math.abs(x)/Math.sqrt(2); const t=1/(1+p*x); const y=1-(((((a5*t+a4)*t)+a3)*t+a2)*t+a1)*t*Math.exp(-x*x); return 0.5*(1+s*y); }
  function normPDF(x){ return Math.exp(-0.5*x*x)/Math.sqrt(2*Math.PI); }
  function bsGreeks(S,K,T,rate,sigma,kind){
    if([S,K,T,rate,sigma].some(v=>v==null||!isFinite(v))) return {error:'insufficient-data'};
    const d1=(Math.log(S/K)+(rate+0.5*sigma*sigma)*T)/(sigma*Math.sqrt(T));
    const pdfd1=normPDF(d1);
    const gamma=pdfd1/(S*sigma*Math.sqrt(T));
    const Nd1=normCDF(d1);
    const delta=kind==='call'?Nd1:Nd1-1;
    return {gamma, delta, d1};
  }
  function parseOpt(l18,l30){
    if(l18.charAt(0)!=='ض'&&l18.charAt(0)!=='ط') return null;
    if(l30.indexOf('اختیار')===-1&&l30.indexOf('اختيار')===-1) return null;
    var parts=l30.split('-'); if(parts.length<3) return null;
    var strike=parseInt(parts[parts.length-2].replace(/,/g,''),10);
    var dateStr=parts[parts.length-1].trim().replace(/\s/g,'');
    var expiry; if(dateStr.indexOf('/')!==-1){ var pp=dateStr.split('/'); if(pp[0].length===2) pp[0]='14'+pp[0]; expiry=pp.join('/'); } else if(/^\d{8}$/.test(dateStr)) expiry=dateStr.slice(0,4)+'/'+dateStr.slice(4,6)+'/'+dateStr.slice(6,8);
    var first=parts[0].replace(/.*اختیارخ\s*/,'').replace(/.*اختيارخ\s*/,'').replace(/.*اختیارف\s*/,'').replace(/.*اختيارف\s*/,'').trim();
    var underlying=first.split(' ')[0].trim();
    var kind=(l30.indexOf('اختیارف')!==-1||l30.indexOf('اختيارف')!==-1)?'put':'call';
    if(!strike||!expiry||!underlying) return null;
    return {underlying, strike, expiry, kind};
  }
  for(let i=0;i<10;i++){ let n=window.mw&&window.mw.AllRows?Object.keys(window.mw.AllRows).length:0; if(n>1000) break; await new Promise(r=>setTimeout(r,500)); }
  try{
    var rows=window.mw&&window.mw.AllRows?Object.values(window.mw.AllRows):[];
    var Srow=rows.find(function(row){return String(row.l18).trim()==='اهرم';});
    var S=Srow?parseFloat(String(Srow.pc).replace(/,/g,'')):null;
    out.chain.S=S; out.chain.allRows=rows.length;
    var T=30/365, rate=0.30, sigma=0.40;
    var chain=rows.map(function(row){ var p=parseOpt(String(row.l18),String(row.l30)); if(!p) return null; if(p.underlying!=='اهرم'||p.expiry!=='1405/07/29') return null; var greeks=bsGreeks(S,p.strike,T,rate,sigma,p.kind); if(greeks.error) return null; var tvol=parseInt(String(row.tvol).replace(/,/g,''),10); if(!isFinite(tvol)) tvol=0; return {strike:p.strike, kind:p.kind, gamma:greeks.gamma, delta:greeks.delta, tvol:tvol, inscode:row.inscode, l18:row.l18}; }).filter(Boolean);
    chain.sort(function(a,b){return a.strike-b.strike;});
    out.chain.count=chain.length;
    out.chain.strikes=[...new Set(chain.map(function(c){return c.strike;}))];
    out.chain.sample=chain.slice(0,3).map(function(c){return {l18:c.l18, strike:c.strike, kind:c.kind, gamma:c.gamma.toExponential(2), delta:c.delta.toFixed(4), tvol:c.tvol};});
    out.chain.tvolStats={ sum: chain.reduce((s,c)=>s+c.tvol,0), min: chain.length?Math.min(...chain.map(c=>c.tvol)):null, max: chain.length?Math.max(...chain.map(c=>c.tvol)):null, zeros: chain.filter(c=>c.tvol===0).length, nonZero: chain.filter(c=>c.tvol>0).length };
    function gexFor(chain,S,useOI){ let gex=0, dex=0; for(let c of chain){ let oi=useOI==='tvol'?c.tvol:(useOI==='one'?1:0); if(useOI==='tvol'){ if(!isFinite(oi)||oi<=0) continue; } else { if(!isFinite(oi)||oi<=0) oi=1; } // for tvol, skip zeros to see real volume-weighted
      gex+=c.gamma*oi*1000*S; dex+=(c.delta||0)*oi*1000*S; } return {gex,dex}; }
    // also compute with zeros as 0 for tvol to see raw
    function gexForAll(chain,S,useOI){ let gex=0; for(let c of chain){ let oi=useOI==='tvol'?c.tvol:1; gex+=c.gamma*oi*1000*S; } return gex; }
    var modes=['tvol','one'];
    out.results=modes.map(function(m){ var res=gexFor(chain,S,m); var resAll=gexForAll(chain,S,m); return {useOI:m, gex:res.gex, dex:res.dex, gexFormatted: res.gex.toExponential(3), dexFormatted: res.dex.toExponential(3), gexAll: resAll.toExponential(3)}; });
    var gexTvol=out.results.find(function(r){return r.useOI==='tvol';}).gex;
    var gexOne=out.results.find(function(r){return r.useOI==='one';}).gex;
    var ratio = gexOne!==0 ? gexTvol/gexOne : null;
    out.worth={ gexTvol, gexOne, ratio, ratioFormatted: ratio!=null? ratio.toFixed(3):null, tvolMatters: ratio!=null && Math.abs(ratio-1)>0.1, note: ratio!=null ? (Math.abs(ratio-1)>0.5 ? 'tvol changes GEX a lot — approx without OI is misleading' : Math.abs(ratio-1)>0.1 ? 'tvol has some effect — approx is rough' : 'tvol barely changes GEX — approx with 1 is similar') : 'no ratio', nonZeroCount: out.chain.tvolStats.nonZero + '/' + chain.length + ' have tvol>0' };
    out.worth.approxNote='Without real OI, GEX is approx only — tvol zeros skipped';
    var byStrike={};
    chain.forEach(function(c){ if(!byStrike[c.strike]) byStrike[c.strike]={tvol:0, one:0, count:0, tvolSum:0}; if(c.tvol>0) byStrike[c.strike].tvol+=c.gamma*c.tvol*1000*S; byStrike[c.strike].one+=c.gamma*1*1000*S; byStrike[c.strike].count++; byStrike[c.strike].tvolSum+=c.tvol; });
    out.chain.byStrike=Object.keys(byStrike).sort((a,b)=>a-b).map(function(k){ return {strike:parseInt(k), count:byStrike[k].count, tvolSum: byStrike[k].tvolSum, gex_tvol: byStrike[k].tvol.toExponential(2), gex_one: byStrike[k].one.toExponential(2), ratio: (byStrike[k].one!==0? (byStrike[k].tvol/byStrike[k].one).toFixed(2):null)};});
    // Flow worth: compare volume-weighted gamma vs equal-weighted
    out.flow={ worth: out.worth.note, tvolZeros: out.chain.tvolStats.zeros + ' of ' + chain.length + ' zeros — Flow without OI = tvol only, so zeros mean no flow' };
    out.status= chain.length>0 ? 'approx' : 'no-data';
  }catch(e){ out.error=e.message; console.error(e); }
  console.log('%c[G11 GEX LIVE v3 without OI — FIXED]','color:#0a7;font-weight:bold');
  console.log('S',out.chain.S,' allRows',out.chain.allRows,' count',out.chain.count,' strikes',out.chain.strikes);
  console.log('tvolStats',out.chain.tvolStats);
  console.log('sample',out.chain.sample);
  console.log('results',out.results);
  console.log('worth',out.worth);
  console.log('byStrike',out.chain.byStrike);
  console.log('flow',out.flow);
  console.log(JSON.stringify(out,null,2));
  return out;
})();
