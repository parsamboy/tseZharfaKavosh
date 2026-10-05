/**
 * G-09 OI v4 — public endpoint brute-force (same-origin, no auth, no CORS issues)
 * Run on old.tsetmc.com/Loader.aspx?ParTree=15131F — tries same-host public data endpoints
 * If any returns OI-like JSON, that's a public separate source (no api.tsetmc.com needed)
 */
(async function g09v4(){
  var host=location.host, base='https://'+host;
  var candidates=[
    '/tsev2/data/Option.aspx',
    '/tsev2/data/InstOption.aspx',
    '/tsev2/data/OptionMarketWatch.aspx',
    '/tsev2/data/MarketWatchOption.aspx',
    '/tsev2/data/DerivativeOption.aspx',
    '/tsev2/data/ClientTypeAll.aspx?flow=3',
    '/tsev2/data/ClosingPriceAll.aspx',
    '/tsev2/data/MarketWatchInit.aspx?h=0&r=0',
    '/tsev2/data/MarketWatchPlus.aspx?h=122825&r='+Date.now(),
    '/api/Option',
    '/api/Derivative/Option'
  ];
  var out={ meta:{ test:'G09-OI-v4-public', host:host, now:new Date().toISOString()}, results:[], best:{ found:false, url:null, snippet:null } };
  for(let p of candidates){
    let url = p.startsWith('http')? p : base+p;
    try{
      let controller=new AbortController(); setTimeout(()=>controller.abort(),7000);
      let r=await fetch(url, { method:'GET', signal:controller.signal, credentials:'include', headers:{'Accept':'application/json,text/plain,*/*'}});
      let text=await r.text();
      let snippet=text.slice(0,1200).replace(/\s+/g,' ').slice(0,1200);
      let hasOI = /BuyOP|SellOP|YesterdayOP|ContractSize|OpenInterest|موقعیت/i.test(text);
      let isJson = r.headers.get('content-type') && r.headers.get('content-type').includes('json');
      out.results.push({ url: p, status: r.status, contentType: r.headers.get('content-type'), hasOI, snippet: snippet.slice(0,600), isJson });
      if(hasOI && r.status===200){ out.best.found=true; out.best.url=p; out.best.snippet=snippet; }
      console.log('[v4]',p,'->',r.status, hasOI?'HAS-OI':'no-oi', snippet.slice(0,120));
    }catch(e){
      out.results.push({ url:p, error:e.message, hasOI:false });
      console.log('[v4]',p,'error',e.message);
    }
  }
  // also try POST to TsePublicV2 Option with guest creds (common demo: demo/demo)
  try{
    let url2='http://service.tsetmc.com/WebService/TsePublicV2.asmx';
    let soap = `<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><Option xmlns="http://tsetmc.com/"><UserName>demo</UserName><Password>demo</Password></Option></soap:Body></soap:Envelope>`;
    let r=await fetch(url2, { method:'POST', headers:{'Content-Type':'text/xml; charset=utf-8','SOAPAction':'"http://tsetmc.com/Option"'}, body:soap });
    let t=await r.text();
    out.results.push({ url:'TsePublicV2 Option demo', status:r.status, hasOI: /BuyOP|OpenInterest/i.test(t), snippet:t.slice(0,600)});
    console.log('[v4] TsePublicV2 demo ->',r.status, t.slice(0,200));
  }catch(e){ out.results.push({ url:'TsePublicV2 Option demo', error:e.message }); }
  out.best.next = out.best.found ? 'Public OI endpoint found at '+out.best.url : 'No public OI endpoint responded — authenticated api.tsetmc.com remains only known source';
  console.log('%c[G09 v4] DONE','color:#0a7;font-weight:bold', JSON.stringify(out,null,2));
  return out;
})();
