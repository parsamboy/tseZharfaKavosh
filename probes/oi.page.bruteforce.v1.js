/**
 * OI brute force v1 — try 25 endpoints that could carry OI on the instrument page
 * Run twice: once on 15131F (marketwatch) and once on the option's own instrument page
 */
(async function brute(){
  var out={ meta:{ test:'OI-BRUTE-v1', now:new Date().toISOString(), host:location.host, url: location.href }, target:{ inscode:null }, tries:[], found:null };
  try{
    // if on marketwatch, find ضهرم7050, else on instrument page parse i from URL
    let ins=null;
    let m=location.href.match(/[?&]i=([0-9]+)/);
    if(m) ins=m[1];
    else {
      let rows=window.mw&&window.mw.AllRows?Object.values(window.mw.AllRows):[];
      let r=rows.find(x=>String(x.l18)==='ضهرم7050');
      ins=r?r.inscode:'62444611500832644';
    }
    out.target.inscode=ins;
    const baseIns=ins;
    const urls=[
      '/tsev2/data/MarketWatchPlus.aspx?i='+baseIns,
      '/tsev2/data/MarketWatch.aspx?i='+baseIns+'&h=0',
      '/tsev2/data/ClosingPrice.aspx?i='+baseIns,
      '/tsev2/data/InstTradeHistory.aspx?i='+baseIns,
      '/tsev2/data/TradeOneDay.aspx?i='+baseIns,
      '/tsev2/data/BestLimits.aspx?i='+baseIns,
      '/tsev2/data/ClientType.aspx?i='+baseIns,
      '/tsev2/data/ShareHolder.aspx?i='+baseIns,
      '/tsev2/data/InstrumentInfo.aspx?i='+baseIns,
      '/tsev2/data/InstInfo.aspx?i='+baseIns,
      '/tsev2/data/OptionInfo.aspx?i='+baseIns,
      '/tsev2/data/OptionMarketWatch.aspx?i='+baseIns,
      '/tsev2/data/SupHistory.aspx?i='+baseIns,
      '/tsev2/data/CComplementaryInfo.aspx?i='+baseIns+'&c=57',
      '/tsev2/data/ClosingPriceInfo.aspx?i='+baseIns,
      '/tsev2/data/MarketWatchPlus.aspx?h=0&r='+Date.now(),
      '/api/Derivative/Option?i='+baseIns,
      '/Derivative/Option?i='+baseIns,
      '/tsev2/data/InstHistory.aspx?i='+baseIns+'&c=57',
      'https://cdn.tsetmc.com/tsev2/data/MarketWatchPlus.aspx?i='+baseIns,
      'https://service.tsetmc.com/tsev2/data/MarketWatchPlus.aspx?i='+baseIns,
    ];
    for(let u of urls){
      let rec={ url:u.slice(0,80), status:null, len:0, hasOI:false, sample:'' };
      try{
        let r=await fetch(u, { credentials:'include' });
        rec.status=r.status;
        let t=await r.text();
        rec.len=t.length;
        rec.sample=t.slice(0,600).replace(/\s+/g,' ').slice(0,600);
        if(/موقعیت\s*باز|BuyOP|SellOP|YesterdayOP|ContractSize|اندازه\s*قرارداد/.test(t)) rec.hasOI=true;
        // also log if it has numbers that look like OI (3 consecutive ints)
        rec.isShell = t.indexOf('LongRunnigPagesSite')!==-1;
        if(rec.hasOI && !rec.isShell) out.found=rec;
      }catch(e){ rec.error=e.message; rec.status='fetch-error'; }
      out.tries.push(rec);
      if(rec.hasOI && !rec.isShell) break;
    }
    // also check current page's HTML after load — user says OI is on page itself
    try{
      let html=document.documentElement.innerHTML;
      out.pageHasOI = /موقعیت\s*باز|BuyOP|SellOP/.test(html);
      out.pageSample = html.slice(html.indexOf('موقعیت')-200, html.indexOf('موقعیت')+600).replace(/\s+/g,' ').slice(0,800) || html.slice(0,800).replace(/\s+/g,' ').slice(0,800);
      // check all window props that might hold OI
      let keys=Object.keys(window).filter(k=>/mw|AllRows|Inst|Option/i.test(k));
      out.windowKeys=keys.slice(0,20);
      if(window.mw) out.mwKeys=Object.keys(window.mw).slice(0,20);
      // try to find any global with BuyOP
      let foundGlobal=null;
      for(let k of Object.keys(window)){
        try{ let v=window[k]; if(v && typeof v==='object' && JSON.stringify(v).indexOf('BuyOP')!==-1) foundGlobal=k; }catch(e){}
      }
      out.foundGlobal=foundGlobal;
    }catch(e){ out.pageError=e.message; }
    out.status= out.found ? 'found' : (out.pageHasOI ? 'found-on-page-html' : 'not-found');
  }catch(e){ out.error=e.message; }
  console.log('%c[OI BRUTE v1]','color:#0a7;font-weight:bold');
  console.table(out.tries.map(t=>({url:t.url, status:t.status, len:t.len, hasOI:t.hasOI, isShell:t.isShell})));
  console.log('pageHasOI',out.pageHasOI, 'found',out.found);
  console.log('pageSample',out.pageSample&&out.pageSample.slice(0,500));
  console.log(JSON.stringify(out,null,2));
  return out;
})();
