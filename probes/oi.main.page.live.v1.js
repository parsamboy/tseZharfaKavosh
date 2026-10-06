/**
 * OI main page live v1 — on main.tsetmc.com/InstInfo/62444... — parse OI from rendered bodyText
 * Run on main.tsetmc.com/InstInfo/62444611500832644 AFTER page shows موقعیت های باز
 */
(function(){
  var out={ meta:{ test:'OI-MAIN-PAGE-LIVE-v1', host:location.host, url:location.href, now:new Date().toISOString()}, parse:null, api:null, status:'unknown' };
  function parseOiFromBodyText(text, inscode){
    const oiMatch = text.match(/موقعیت\s*های\s*باز\s*([0-9,]+)/);
    const contractMatch = text.match(/اندازه\s*قرارداد\s*([0-9,]+)/);
    const oi = oiMatch ? parseInt(oiMatch[1].replace(/,/g,''),10) : null;
    const contractSize = contractMatch ? parseInt(contractMatch[1].replace(/,/g,''),10) : null;
    return { inscode, oi:isFinite(oi)?oi:null, contractSize:isFinite(contractSize)?contractSize:null, found:oi!=null, rawOi:oiMatch?oiMatch[1]:null, rawContract:contractMatch?contractMatch[1]:null };
  }
  try{
    let ins=(location.href.match(/\/(\d{12,20})/)||[])[1]||'62444611500832644';
    let text=document.body.innerText;
    out.parse=parseOiFromBodyText(text, ins);
    out.parse.textLength=text.length;
    out.parse.bodySnippet=text.slice(text.indexOf('موقعیت')-100, text.indexOf('موقعیت')+200).replace(/\s+/g,' ').slice(0,400);
    // also try CDN API that was in resourceEntries — use fetch with no-cors? try with credentials
    // We already know fetch to cdn fails due to CORS from JS, but we can try via the same origin that React uses (cdn.tsetmc.com allows cors for main)
    // Try again with mode cors
  }catch(e){ out.error=e.message; }
  out.status= out.parse && out.parse.found ? 'candidate' : 'not-found';
  out.recommendation= out.status==='candidate' ? 'Scrape from bodyText works — use for chain: visit each InstInfo page' : 'Not found — check rendering delay';
  console.log('%c[OI MAIN PAGE LIVE v1]','color:#0a7;font-weight:bold');
  console.log('parse',out.parse);
  console.log(JSON.stringify(out,null,2));
  return out;
})();
