/**
 * OI alternative live v1 — if api.tsetmc.com limited, test other TSETMC endpoints
 * Run on old.tsetmc.com/Loader.aspx?ParTree=15131F — tries 5 alternative URLs that historically carried OI
 * All are read-only LIVE
 */
(async function oiAlt(){
  var out={ meta:{ test:'OI-ALT-LIVE-v1', now:new Date().toISOString(), host:location.host }, candidates:[], best:null, status:'unknown' };
  var urls=[
    { name:'OptionMarketWatch', url:'/tsev2/data/OptionMarketWatch.aspx?h=0&r='+Date.now() },
    { name:'MarketWatchPlus_opt', url:'/tsev2/data/MarketWatchPlus.aspx?h=122825&r='+Date.now() },
    { name:'InstHistory_sample', url:'/tsev2/data/InstHistory.aspx?i=58911243347132267&t=1&r='+Date.now() }, // اهرم history
    { name:'ClientType', url:'/tsev2/data/ClientType.aspx?i=58911243347132267&r='+Date.now() },
    { name:'BestLimit', url:'/tsev2/data/BestLimits.aspx?i=58911243347132267&r='+Date.now() },
  ];
  for(let u of urls){
    let rec={ name:u.name, url:u.url, status:null, length:0, hasOI:false, sample:'' };
    try{
      let r=await fetch(u.url, { credentials:'include' });
      rec.status=r.status;
      let t=await r.text();
      rec.length=t.length;
      rec.sample=t.slice(0,600).replace(/\s+/g,' ').slice(0,600);
      // look for OI keywords
      let lower=t.toLowerCase();
      rec.hasOI = /buyop|sellop|yesterdayop|contractsize|position|موقعیت/.test(lower) || /\,[0-9]+\,[0-9]+\,[0-9]+\,/.test(t) && t.split(',').length>10;
      rec.keys=t.slice(0,200);
    }catch(e){ rec.error=e.message; }
    out.candidates.push(rec);
  }
  // also try api.tsetmc.com directly to confirm it's limited (CORS will block from old.tsetmc.com, but we test)
  try{
    let r=await fetch('https://api.tsetmc.com/Derivative/Option?i=58911243347132267', { method:'GET' });
    out.apiDirect={ status:r.status, ok:r.ok, sample:(await r.text()).slice(0,400) };
  }catch(e){ out.apiDirect={ error:e.message, note:'CORS blocks from old.tsetmc.com — expected; needs server-side test' };}
  out.best=out.candidates.find(c=>c.hasOI) || null;
  out.status= out.best ? 'candidate-alt' : 'no-alt-found';
  out.recommendation= out.best ? 'Alternative '+out.best.name+' has OI-like data — worth deeper parse' : 'No TSETMC alt has OI in this quick scan — need broker API or keep deferred (no fabricate)';
  console.log('%c[OI ALT LIVE v1]','color:#0a7;font-weight:bold');
  console.table(out.candidates.map(c=>({name:c.name,status:c.status,len:c.length,hasOI:c.hasOI})));
  console.log('best',out.best);
  console.log('apiDirect',out.apiDirect);
  console.log(JSON.stringify(out,null,2));
  return out;
})();
