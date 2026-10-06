/**
 * tseZharfaKavosh — OI Scrape Provider v0.1.0 — Option 3
 * If api.tsetmc.com limited, scrape old.tsetmc.com/Loader.aspx?ParTree=15131M&i=inscode
 * HTML contains موقعیت باز (BuyOP/SellOP) — parse without API
 * SPDX: Smart-FFA-1.1
 */
const VERSION='0.1.0-oiScrape-001';

// pure parser — no fetch here, testable
function parseOIHtml(html, inscode){
  if(!html || typeof html!=='string') return { error:'insufficient-data', inscode };
  // look for BuyOP/SellOP/YesterdayOP patterns or موقعیت باز
  // common patterns in TSETMC option pages:
  // <td>موقعیت باز</td><td>123</td>  or  BuyOP: 100 / SellOP: 200
  // also ContractSize: اندازه قرارداد
  let buyOP=null, sellOP=null, yesterdayOP=null, contractSize=null;
  // try regex for numbers near keywords
  const buyMatch = html.match(/BuyOP[^0-9]*([0-9,]+)/i) || html.match(/موقعیت\s*خرید[^0-9]*([0-9,]+)/);
  const sellMatch = html.match(/SellOP[^0-9]*([0-9,]+)/i) || html.match(/موقعیت\s*فروش[^0-9]*([0-9,]+)/);
  const yesterdayMatch = html.match(/YesterdayOP[^0-9]*([0-9,]+)/i);
  const contractMatch = html.match(/ContractSize[^0-9]*([0-9,]+)/i) || html.match(/اندازه\s*قرارداد[^0-9]*([0-9,]+)/);
  // also generic: look for table with 3 numbers after instrument title
  if(buyMatch) buyOP=parseInt(buyMatch[1].replace(/,/g,''),10);
  if(sellMatch) sellOP=parseInt(sellMatch[1].replace(/,/g,''),10);
  if(yesterdayMatch) yesterdayOP=parseInt(yesterdayMatch[1].replace(/,/g,''),10);
  if(contractMatch) contractSize=parseInt(contractMatch[1].replace(/,/g,''),10);
  // fallback: find all numbers in page, heuristic if page is option page
  const hasOptionKeyword = /اختیار|اختيار|ضهرم|طهرم|موقعیت\s*باز/.test(html);
  return {
    inscode,
    buyOP: isFinite(buyOP)?buyOP:null,
    sellOP: isFinite(sellOP)?sellOP:null,
    yesterdayOP: isFinite(yesterdayOP)?yesterdayOP:null,
    contractSize: isFinite(contractSize)?contractSize:null,
    hasOptionKeyword,
    found: !!(buyOP!=null || sellOP!=null || contractSize!=null),
    rawLength: html.length
  };
}

function validateScrapeConfig(p){
  if(!p || typeof p.baseUrl!=='string' || !p.baseUrl.startsWith('https://')) return { error:'invalid baseUrl' };
  return { ok:true };
}

function oiScrapeUrl(baseUrl, inscode){
  // baseUrl e.g. https://old.tsetmc.com
  return `${baseUrl}/Loader.aspx?ParTree=15131M&i=${encodeURIComponent(inscode)}`;
}

module.exports={ parseOIHtml, validateScrapeConfig, oiScrapeUrl, VERSION };
if(typeof window!=='undefined') window.TseOiScrape={ parseOIHtml, validateScrapeConfig, oiScrapeUrl, VERSION };
