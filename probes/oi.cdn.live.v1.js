/**
 * OI CDN live v1 — try exact same fetch as page (no credentials, same headers)
 * Run on main.tsetmc.com/InstInfo/624... — should get JSON with OI
 */
(async function(){
  var out={ tries:[], status:'unknown' };
  const urls=[
    'https://cdn.tsetmc.com/api/Instrument/GetInstrumentInfo/62444611500832644',
    'https://cdn.tsetmc.com/api/Instrument/GetInstrumentOptionByInstrumentID/IRO9AHRM0D71',
  ];
  for(let u of urls){
    let rec={ url:u, status:null, len:0, json:null };
    try{
      let r=await fetch(u, { method:'GET', headers:{'Accept':'application/json, text/plain, */*'} }); // no credentials
      rec.status=r.status;
      let t=await r.text();
      rec.len=t.length;
      rec.sample=t.slice(0,800).replace(/\s+/g,' ').slice(0,800);
      try{ let j=JSON.parse(t); rec.jsonKeys=Object.keys(j).slice(0,20); rec.json=j; }catch(e){ rec.parseError=e.message; }
    }catch(e){ rec.error=e.message; }
    out.tries.push(rec);
  }
  console.log('%c[OI CDN LIVE v1]','color:#0a7;font-weight:bold');
  console.table(out.tries.map(t=>({url:t.url.slice(-40), status:t.status, len:t.len})));
  console.log(JSON.stringify(out,null,2));
  return out;
})();
