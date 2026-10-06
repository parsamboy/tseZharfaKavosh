/**
 * OI main CDN brute — on main.tsetmc.com/InstInfo/624... — try CDN APIs that React uses
 * Run on main.tsetmc.com/InstInfo/62444611500832644
 */
(async function(){
  var out={ meta:{ host:location.host, url:location.href, now:new Date().toISOString()}, inscode:'62444611500832644', tries:[], found:null, pageHasOI:false };
  // extract inscode from URL
  let m=location.href.match(/\/(\d{12,20})/);
  let ins=m?m[1]:'62444611500832644';
  out.inscode=ins;
  let urls=[
    'https://cdn.tsetmc.com/api/Instrument/GetInstrumentInfo/'+ins,
    'https://cdn.tsetmc.com/api/Instrument/GetInstrumentInfo?inscode='+ins,
    'https://cdn.tsetmc.com/api/Option/GetOptionInfo?inscode='+ins,
    'https://cdn.tsetmc.com/api/Derivative/GetOptionInfo?inscode='+ins,
    'https://api.tsetmc.com/Derivative/Option?inscode='+ins,
    'https://api.tsetmc.com/Derivative/Option?i='+ins,
    'https://old.tsetmc.com/tsev2/data/InstrumentInfo.aspx?i='+ins,
    'https://main.tsetmc.com/api/Instrument/GetInstrumentInfo/'+ins,
    '/api/Instrument/GetInstrumentInfo/'+ins,
    '/api/Option/GetOptionInfo?inscode='+ins,
  ];
  for(let u of urls){
    let rec={ url:u, status:null, len:0, hasOI:false, sample:'' };
    try{
      let r=await fetch(u, { credentials:'include', headers:{'Accept':'application/json, text/plain, */*'} });
      rec.status=r.status;
      let t=await r.text();
      rec.len=t.length;
      rec.sample=t.slice(0,700).replace(/\s+/g,' ').slice(0,700);
      if(/BuyOP|SellOP|YesterdayOP|ContractSize|موقعیت\s*باز/.test(t)) rec.hasOI=true;
      try{ let j=JSON.parse(t); rec.jsonKeys=Object.keys(j).slice(0,15); if(j.buyOP||j.BuyOP||j.contractSize) rec.hasOI=true; }catch(e){}
      if(rec.hasOI) out.found=rec;
    }catch(e){ rec.error=e.message; }
    out.tries.push(rec);
    if(rec.hasOI) break;
  }
  // also check current page's rendered HTML (React has already fetched)
  try{
    let html=document.documentElement.innerHTML;
    out.pageHasOI=/موقعیت\s*باز/.test(html);
    if(out.pageHasOI){
      let idx=html.indexOf('موقعیت');
      out.pageSample=html.slice(idx-500, idx+1000).replace(/\s+/g,' ').slice(0,1200);
    } else {
      // check all text content
      let txt=document.body.innerText;
      out.bodyTextHasOI=/موقعیت/.test(txt);
      if(out.bodyTextHasOI){
        let idx=txt.indexOf('موقعیت');
        out.bodySample=txt.slice(idx-300, idx+600);
      }
    }
    // check performance entries for XHRs that contain inscode or Option
    try{
      let entries=performance.getEntriesByType('resource').filter(e=>/Option|Instrument|Derivative/i.test(e.name)).slice(0,10);
      out.resourceEntries=entries.map(e=>({name:e.name, dur:e.duration.toFixed(0)}));
    }catch(e){}
    // check window
    out.windowKeys=Object.keys(window).filter(k=>/inst|option|buyop/i.test(k)).slice(0,20);
  }catch(e){ out.pageError=e.message; }
  console.log('%c[OI MAIN CDN BRUTE]','color:#0a7;font-weight:bold');
  console.table(out.tries.map(t=>({url:t.url.slice(0,60), status:t.status, len:t.len, hasOI:t.hasOI})));
  console.log('pageHasOI',out.pageHasOI,'bodyTextHasOI',out.bodyTextHasOI);
  if(out.pageSample) console.log('pageSample',out.pageSample.slice(0,600));
  if(out.bodySample) console.log('bodySample',out.bodySample.slice(0,600));
  console.log('found',out.found);
  console.log(JSON.stringify(out,null,2));
  return out;
})();
