/**
 * OI chain live v1 — on main.tsetmc.com/InstInfo/…  — fetch OI for all 36 اهرم chain
 * Uses CDN API GetInstrumentOptionByInstrumentID (found in resourceEntries) if CORS allows, else fallback to page scrape would be sequential
 * Run on main.tsetmc.com (where you already saw 4969) — LIVE
 */
(async function(){
  var out={ meta:{ test:'OI-CHAIN-LIVE-v1', host:location.host, now:new Date().toISOString()}, chain:{ underlying:'اهرم', expiry:'1405/07/29', count:0 }, results:[], status:'unknown' };
  // we need AllRows from old — but on main we don't have it, so we use a hard-coded chain from earlier 36 (18 strikes x2)
  // Instead, we will try to get chain via CDN: GetInstrumentOptionByInstrumentID needs isin, not inscode
  // Let's use the resourceEntry isin: IRO9AHRM0D71 for 20000 call — pattern is IRO9AHRM<...> — we can derive but easier: use inscode list from old probe
  // Hardcode the 36 inscodes we saw in earlier GEX v3 (from AllRows) — we will fetch OI for each via CDN API
  const chainIns = [
    '62444611500832644','62444611510832644', // 20000 call/put? actual from earlier sample, but we will discover via fetch
  ];
  // Better: fetch via main's own chain API if available — try GetInstrumentOptionByInstrumentID for اهرم itself
  // اهرم inscode is 58911243347132267? Actually S is اهرم with pc 72810 — its isin is IRO1AHRM0001?
  // Let's brute: use the CDN API that lists all options for اهرم: Try GetInstrumentOptionByInstrumentID with اهرم's isin
  let ahromIsin='IRO1AHRM0001'; // guess
  // Try to fetch chain via that endpoint first
  let chainUrl='https://cdn.tsetmc.com/api/Instrument/GetInstrumentOptionByInstrumentID/IRO9AHRM0D71';
  // Actually we saw dur 24 for IRO9AHRM0D71 — that is for 20000 call itself, not for اهرم
  // For اهرم underlying, the endpoint might be GetInstrumentOptionByInstrumentID with اهرم's isin
  // Let's try to discover: fetch GetInstrumentInfo for اهرم to get its isin
  try{
    // Step 1: try to get اهرم options via search — use main's search API
    // For now, fallback: use the 36 inscodes we already know from old.tsetmc.com probe (we hardcode from previous GEX v3 byStrike)
    // Let's use the tvolStats mapping: we know strikes 20000..100000 each has 2 inscodes, we can fetch each inscode's page via CDN API sequentially
    // We will try the CDN API that worked in resourceEntries: https://cdn.tsetmc.com/api/Instrument/GetInstrumentOptionByInstrumentID/<isin>
    // To get isin for each inscode, we need to call GetInstrumentInfo/<inscode> first
    let testIns='62444611500832644';
    let infoUrl='https://cdn.tsetmc.com/api/Instrument/GetInstrumentInfo/'+testIns;
    let r=await fetch(infoUrl, { credentials:'include' });
    let t=await r.text();
    out.infoTest={ url:infoUrl, status:r.status, len:t.length, sample:t.slice(0,600).replace(/\s+/g,' ').slice(0,600) };
    try{ let j=JSON.parse(t); out.infoTest.jsonKeys=Object.keys(j).slice(0,20); out.infoTest.hasIsin=!!(j.isin||j.Isin||j.instrumentID); }catch(e){}
    // Try Option API
    let optUrl='https://cdn.tsetmc.com/api/Instrument/GetInstrumentOptionByInstrumentID/IRO9AHRM0D71';
    let r2=await fetch(optUrl, { credentials:'include' });
    let t2=await r2.text();
    out.optTest={ url:optUrl, status:r2.status, len:t2.length, sample:t2.slice(0,800).replace(/\s+/g,' ').slice(0,800) };
    try{ let j2=JSON.parse(t2); out.optTest.jsonKeys=Object.keys(j2).slice(0,20); out.optTest.hasOI=/BuyOP|oi|position/i.test(JSON.stringify(j2)); }catch(e){}
    out.status='probe-done';
  }catch(e){ out.error=e.message; }
  console.log('%c[OI CHAIN LIVE v1]','color:#0a7;font-weight:bold');
  console.log(out.infoTest);
  console.log(out.optTest);
  console.log(JSON.stringify(out,null,2));
  return out;
})();
