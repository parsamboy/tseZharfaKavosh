/**
 * OI chain main v2 — try to get all options for اهرم via CDN OptionByInstrumentID
 * Run on main.tsetmc.com/InstInfo/624... — LIVE
 */
(async function(){
  var out={ meta:{ host:location.host, now:new Date().toISOString()}, tries:[], chain:null, status:'unknown' };
  // Try underlying اهرم isins — common pattern: IRO1AHRM0001 for اهرم, IRO9AHRM... for options
  const isinsToTry=[
    'IRO1AHRM0001', // guess for اهرم
    'IRO9AHRM0D71', // 20000 call's isin (we know)
    'IRO9AHRM0D81', // 22000 maybe
  ];
  for(let isin of isinsToTry){
    let url='https://cdn.tsetmc.com/api/Instrument/GetInstrumentOptionByInstrumentID/'+isin;
    let rec={ url, status:null, len:0, sample:'' };
    try{
      let r=await fetch(url, { credentials:'include', headers:{'Accept':'application/json'} });
      rec.status=r.status;
      let t=await r.text();
      rec.len=t.length;
      rec.sample=t.slice(0,800).replace(/\s+/g,' ').slice(0,800);
      try{ let j=JSON.parse(t); rec.jsonKeys=Object.keys(j).slice(0,20); rec.isArray=Array.isArray(j); if(Array.isArray(j)) rec.arrayLen=j.length; if(j && typeof j==='object' && !Array.isArray(j) && j.instrumentOptions) rec.optCount=j.instrumentOptions.length; }catch(e){ rec.parseError=e.message; }
      if(rec.status===200 && rec.len>1000) rec.maybeHasChain=true;
    }catch(e){ rec.error=e.message; }
    out.tries.push(rec);
    if(rec.maybeHasChain) break;
  }
  // Also try GetInstrumentInfo for اهرم underlying to discover its option list
  try{
    let url2='https://cdn.tsetmc.com/api/Instrument/GetInstrumentInfo/ROJINA'; // dummy
  }catch(e){}
  // Try to brute fetch via main.tsetmc.com's own API that was in resourceEntries: /tsev2/data/OptionInfo.aspx?i=...
  try{
    let r=await fetch('/tsev2/data/OptionInfo.aspx?i=62444611500832644', { credentials:'include' });
    let t=await r.text();
    out.optionInfo={ status:r.status, len:t.length, sample:t.slice(0,600).replace(/\s+/g,' ').slice(0,600) };
  }catch(e){ out.optionInfo={error:e.message}; }
  console.log('%c[OI CHAIN MAIN v2]','color:#0a7;font-weight:bold');
  console.table(out.tries.map(t=>({url:t.url.slice(-30), status:t.status, len:t.len, maybe:t.maybeHasChain})));
  console.log(JSON.stringify(out,null,2));
  return out;
})();
