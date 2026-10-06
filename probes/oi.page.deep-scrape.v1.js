/**
 * OI page deep scrape v1 — user says OI is on the option's own page
 * Try all known ParTrees and also parse the loader shell to find real data URL
 * Run on old.tsetmc.com/Loader.aspx?ParTree=15131F — LIVE
 */
(async function deep(){
  var out={ meta:{ test:'OI-DEEP-SCRAPE-v1', now:new Date().toISOString(), host:location.host }, target:null, tries:[], found:null, status:'unknown' };
  try{
    var rows=window.mw&&window.mw.AllRows?Object.values(window.mw.AllRows):[];
    var opt=rows.find(r=> String(r.l18)==='ضهرم7050' ) || rows.find(r=> String(r.l18).charAt(0)==='ض');
    out.target={ l18: opt.l18, inscode: opt.inscode, l30: opt.l30 };
    var ins=opt.inscode;
    // list of candidate URLs that historically held option OI on the instrument page
    var urls=[
      '/Loader.aspx?ParTree=15131M&i='+ins,
      '/Loader.aspx?ParTree=15131A&i='+ins,
      '/Loader.aspx?ParTree=15131F&i='+ins,
      'https://www.tsetmc.com/Loader.aspx?ParTree=15131M&i='+ins,
      'https://cdn.tsetmc.com/Loader.aspx?ParTree=15131M&i='+ins,
      '/tsev2/data/InstrumentInfo.aspx?i='+ins,
      '/tsev2/data/InstInfo.aspx?i='+ins,
      '/tsev2/data/OptionInfo.aspx?i='+ins,
      '/tsev2/data/MarketWatchPlus.aspx?i='+ins,
      '/tsev2/data/ClientType.aspx?i='+ins+'&c=57', // sometimes 57 is option
    ];
    for(let u of urls){
      let rec={ url:u, status:null, len:0, hasOI:false, sample:'' };
      try{
        let r=await fetch(u, { credentials:'include' });
        rec.status=r.status;
        let t=await r.text();
        rec.len=t.length;
        rec.sample=t.slice(0,700).replace(/\s+/g,' ').slice(0,700);
        // check OI keywords — user says it's on page itself (موقعیت باز)
        if(/موقعیت\s*باز|BuyOP|SellOP|ContractSize|اندازه\s*قرارداد/.test(t)) rec.hasOI=true;
        // also check if it's HTML shell with loader
        rec.isShell = t.indexOf('LongRunnigPagesSite')!==-1;
        // try to extract any embedded JSON with OI numbers
        let m=t.match(/[0-9]{5,}\s*,\s*[0-9]{5,}/);
        rec.hasNumbers=!!m;
        if(rec.hasOI) out.found=rec;
      }catch(e){ rec.error=e.message; }
      out.tries.push(rec);
      if(rec.hasOI) break;
    }
    // if shell, try to follow its loader — extract tsev2/res URL
    let shell=out.tries.find(t=>t.isShell);
    if(shell && !out.found){
      out.shellFollow={ note:'shell found, trying to fetch its data via cdn' };
      try{
        let r=await fetch('/tsev2/data/MarketWatchPlus.aspx?h=0&r='+Date.now(), { credentials:'include' });
        let t=await r.text();
        out.shellFollow.marketWatchSample=t.slice(0,400);
      }catch(e){ out.shellFollow.error=e.message; }
    }
    out.status= out.found ? 'found' : 'not-found';
    out.recommendation= out.found ? 'Use '+out.found.url+' for OI scrape' : 'No ParTree had OI — need to inspect network tab on option page to find XHR that loads موقعیت باز';
  }catch(e){ out.error=e.message; }
  console.log('%c[OI DEEP SCRAPE v1]','color:#0a7;font-weight:bold');
  console.table(out.tries.map(t=>({url:t.url.slice(0,55), status:t.status, len:t.len, hasOI:t.hasOI, isShell:t.isShell})));
  console.log('found',out.found);
  console.log(JSON.stringify(out,null,2));
  return out;
})();
