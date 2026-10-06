/**
 * OI chain CDN live v1 — get OI for all 36 اهرم 1405/07/29 via cdn.tsetmc.com (no credential)
 * Run on old.tsetmc.com/Loader.aspx?ParTree=15131F — has AllRows with 36 inscodes, fetch cdn for each
 * LIVE — will fetch 72 requests (2 per option) — takes ~20s
 */
(async function(){
  var out={ meta:{ test:'OI-CHAIN-CDN-LIVE-v1', host:location.host, now:new Date().toISOString()}, chain:{ underlying:'اهرم', expiry:'1405/07/29', count:0, strikes:[] }, results:[], status:'unknown' };
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
  async function fetchCdnOi(inscode){
    let infoUrl='https://cdn.tsetmc.com/api/Instrument/GetInstrumentInfo/'+inscode;
    let r1=await fetch(infoUrl, { headers:{'Accept':'application/json'} });
    if(!r1.ok) throw new Error('info '+r1.status);
    let j1=await r1.json();
    let instrumentID=j1.instrumentInfo.instrumentID;
    let optUrl='https://cdn.tsetmc.com/api/Instrument/GetInstrumentOptionByInstrumentID/'+instrumentID;
    let r2=await fetch(optUrl, { headers:{'Accept':'application/json'} });
    if(!r2.ok) throw new Error('opt '+r2.status);
    let j2=await r2.json();
    let opt=j2.instrumentOption;
    return { inscode, instrumentID, buyOP:opt.buyOP, sellOP:opt.sellOP, contractSize:opt.contractSize, strikePrice:opt.strikePrice };
  }
  try{
    var rows=window.mw&&window.mw.AllRows?Object.values(window.mw.AllRows):[];
    var chainRows=rows.map(function(r){ var p=parseOpt(String(r.l18),String(r.l30)); if(!p) return null; if(p.underlying!=='اهرم'||p.expiry!=='1405/07/29') return null; return { inscode:r.inscode, l18:r.l18, strike:p.strike, kind:p.kind }; }).filter(Boolean);
    chainRows.sort(function(a,b){ return a.strike-b.strike; });
    out.chain.count=chainRows.length;
    out.chain.strikes=[...new Set(chainRows.map(c=>c.strike))];
    out.chain.sample=chainRows.slice(0,3);
    console.log('fetching OI for',chainRows.length,'options via cdn (no credential)...');
    let results=[];
    for(let i=0;i<chainRows.length;i++){
      let c=chainRows[i];
      try{
        let oi=await fetchCdnOi(c.inscode);
        results.push({ inscode:c.inscode, l18:c.l18, strike:c.strike, kind:c.kind, oi: oi.buyOP, sellOP: oi.sellOP, contractSize: oi.contractSize, instrumentID: oi.instrumentID });
        console.log(`[${i+1}/${chainRows.length}] ${c.l18} ${c.strike} OI ${oi.buyOP}`);
      }catch(e){
        results.push({ inscode:c.inscode, l18:c.l18, strike:c.strike, kind:c.kind, error:e.message });
        console.log(`[${i+1}/${chainRows.length}] ${c.l18} error ${e.message}`);
      }
      // be nice to cdn — 200ms delay
      await new Promise(r=>setTimeout(r,200));
    }
    out.results=results;
    out.chain.oiStats={ total: results.filter(r=>r.oi!=null).length, sum: results.reduce((s,r)=>s+(r.oi||0),0), zeros: results.filter(r=>r.oi===0).length, min: Math.min(...results.filter(r=>r.oi!=null).map(r=>r.oi)), max: Math.max(...results.filter(r=>r.oi!=null).map(r=>r.oi)) };
    // For GEX comparison, compute same as before but with real OI
    out.status= out.chain.oiStats.total>0 ? 'candidate' : 'no-oi';
    out.recommendation= out.status==='candidate' ? 'CDN OI works — can compute real GEX now' : 'no OI';
  }catch(e){ out.error=e.message; console.error(e); }
  console.log('%c[OI CHAIN CDN LIVE v1]','color:#0a7;font-weight:bold');
  console.log('chain',out.chain.count,'strikes',out.chain.strikes);
  console.log('oiStats',out.chain.oiStats);
  console.log('sample',out.results.slice(0,5));
  console.log(JSON.stringify(out,null,2));
  return out;
})();
