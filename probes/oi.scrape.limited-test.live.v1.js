/**
 * OI Scrape LIVE v1 — Option 3 — scrape old.tsetmc.com option instrument page
 * Run on old.tsetmc.com/Loader.aspx?ParTree=15131F — fetch one real option's page (اهرم 20000 call) and look for OI
 * Read-only LIVE
 */
(async function oiScrapeLive(){
  var out={ meta:{ test:'OI-SCRAPE-LIVE-v1', host:location.host, now:new Date().toISOString()}, target:null, fetch:{ status:null, length:0, found:false }, parse:{}, status:'unknown' };
  function parseOIHtml(html, inscode){
    let buyOP=null, sellOP=null, yesterdayOP=null, contractSize=null;
    const buyMatch = html.match(/BuyOP[^0-9]*([0-9,]+)/i) || html.match(/موقعیت\s*خرید[^0-9]*([0-9,]+)/);
    const sellMatch = html.match(/SellOP[^0-9]*([0-9,]+)/i) || html.match(/موقعیت\s*فروش[^0-9]*([0-9,]+)/);
    const yesterdayMatch = html.match(/YesterdayOP[^0-9]*([0-9,]+)/i);
    const contractMatch = html.match(/ContractSize[^0-9]*([0-9,]+)/i) || html.match(/اندازه\s*قرارداد[^0-9]*([0-9,]+)/);
    if(buyMatch) buyOP=parseInt(buyMatch[1].replace(/,/g,''),10);
    if(sellMatch) sellOP=parseInt(sellMatch[1].replace(/,/g,''),10);
    if(yesterdayMatch) yesterdayOP=parseInt(yesterdayMatch[1].replace(/,/g,''),10);
    if(contractMatch) contractSize=parseInt(contractMatch[1].replace(/,/g,''),10);
    const hasOptionKeyword = /اختیار|اختيار|ضهرم|طهرم|موقعیت\s*باز/.test(html);
    return { inscode, buyOP:isFinite(buyOP)?buyOP:null, sellOP:isFinite(sellOP)?sellOP:null, yesterdayOP:isFinite(yesterdayOP)?yesterdayOP:null, contractSize:isFinite(contractSize)?contractSize:null, hasOptionKeyword, found:!!(buyOP!=null||sellOP!=null||contractSize!=null), rawLength:html.length };
  }
  try{
    var rows=window.mw&&window.mw.AllRows?Object.values(window.mw.AllRows):[];
    var optRow=rows.find(function(r){ return String(r.l18).charAt(0)==='ض' && String(r.l30).indexOf('اهرم-20000-1405/07/29')!==-1; });
    if(!optRow) optRow=rows.find(function(r){ return String(r.l18).charAt(0)==='ض'; });
    out.target={ l18: optRow?optRow.l18:null, l30: optRow?optRow.l30:null, inscode: optRow?optRow.inscode:null };
    var url='/Loader.aspx?ParTree=15131M&i='+encodeURIComponent(out.target.inscode);
    out.fetch.url=url;
    var r=await fetch(url, { credentials:'include' });
    out.fetch.status=r.status;
    var html=await r.text();
    out.fetch.length=html.length;
    out.fetch.sample=html.slice(0,800).replace(/\s+/g,' ').slice(0,800);
    out.parse=parseOIHtml(html, out.target.inscode);
    out.fetch.found=out.parse.found;
    // also check for generic numbers table
    out.fetch.hasTable = html.indexOf('<table')!==-1;
    out.fetch.hasPositionWord = /موقعیت/.test(html);
    out.status= out.parse.found ? 'candidate' : (out.fetch.hasPositionWord ? 'needs-parse-fix' : 'no-OI-in-html');
    out.recommendation= out.status==='candidate' ? 'Scrape works — use as fallback' : out.status==='needs-parse-fix' ? 'Page has موقعیت word but regex missed — fix parse' : 'No OI in this instrument page — try Cdn or Broker';
  }catch(e){ out.error=e.message; console.error(e); }
  console.log('%c[OI SCRAPE LIVE v1 — Option 3]','color:#0a7;font-weight:bold');
  console.log('target',out.target);
  console.log('fetch',out.fetch.status,out.fetch.length,'hasPositionWord',out.fetch.hasPositionWord,'found',out.fetch.found);
  console.log('sample',out.fetch.sample.slice(0,400));
  console.log('parse',out.parse);
  console.log(JSON.stringify(out,null,2));
  return out;
})();
