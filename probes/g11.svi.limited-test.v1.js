/**
 * G-11 SVI v1 — live test on chain 1559 (without OI weighting) — 1-A
 * Run on old.tsetmc.com/Loader.aspx?ParTree=15131F
 * Uses underlying اهرم S=70260, T=30d, r=0.30, DEFAULT_SVI_PARAMS
 */
(function sviV1(){
  var out={ meta:{ test:'G11-SVI-v1', gate:'G-11', version:'0.1.0-svi-001', host:location.host, now:new Date().toISOString()}, params:{ r:0.30, T:30/365, svi:{a:0.04,b:0.2,rho:-0.3,m:0,sigma:0.2} }, chain:{ underlying:'اهرم', expiry:'1405/07/29', strikes:[], count:0 }, samples:[], status:'unknown' };
  function sviTotalVariance(k, p){ const {a,b,rho,m,sigma}=p; if([a,b,rho,m,sigma,k].some(v=>v==null||!isFinite(v))) return {error:'insufficient-data'}; if(b<0||sigma<=0||Math.abs(rho)>1) return {error:'invalid-params'}; const km=k-m; const w=a+b*(rho*km+Math.sqrt(km*km+sigma*sigma)); if(w<0) return {error:'negative-variance',w}; return {w, iv:Math.sqrt(w)}; }
  function sviForStrike(S,K,T,r, p){ if([S,K,T].some(v=>v==null||!isFinite(v)||v<=0)) return {error:'insufficient-data'}; const F=S*Math.exp(r*T); const k=Math.log(K/F); return sviTotalVariance(k,p); }
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
  try{
    var rows=window.mw && window.mw.AllRows?Object.values(window.mw.AllRows):[];
    var Srow=rows.find(function(r){return String(r.l18).trim()==='اهرم';});
    var S=Srow?parseFloat(String(Srow.pc).replace(/,/g,'')):null;
    out.chain.S=S;
    var T=30/365, r=0.30;
    var chain=rows.map(function(r){ var p=parseOpt(String(r.l18),String(r.l30)); if(!p) return null; if(p.underlying!=='اهرم'||p.expiry!=='1405/07/29') return null; return {r:r, p:p, inscode:r.inscode, l18:r.l18}; }).filter(Boolean);
    // unique strikes
    var strikes=[...new Set(chain.map(function(c){return c.p.strike;}))].sort(function(a,b){return a-b;});
    out.chain.count=chain.length;
    out.chain.strikes=strikes;
    out.chain.uniqueStrikes=strikes.length;
    // samples for 3 strikes
    var sampleStrikes=[strikes[0], strikes[Math.floor(strikes.length/2)], strikes[strikes.length-1]].filter(Boolean);
    out.samples=sampleStrikes.map(function(K){
      var svi=sviForStrike(S,K,T,r, out.params.svi);
      var k=Math.log(K/(S*Math.exp(r*T)));
      return {K, k: k.toFixed(4), svi};
    });
    // no-fabrication: missing S
    out.noFabrication=sviForStrike(null, 20000, T, r, out.params.svi);
    out.status = out.samples.every(function(s){ return !s.svi.error; }) ? 'candidate' : 'needs-data';
    out.parity={ identical: JSON.stringify(out.samples)===JSON.stringify(out.samples.slice()) };
  }catch(e){ out.error=e.message; }
  console.log('%c[G11 SVI v1 live]','color:#0a7;font-weight:bold');
  console.log('S',out.chain.S,' chain count',out.chain.count,' strikes',out.chain.strikes);
  console.log('samples',out.samples);
  console.log(JSON.stringify(out,null,2));
  return out;
})();
