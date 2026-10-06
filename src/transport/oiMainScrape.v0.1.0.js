/**
 * tseZharfaKavosh — OI Main Scrape v0.1.0 — OI is on the symbol's own page (main.tsetmc.com)
 * User confirmed: https://main.tsetmc.com/InstInfo/62444611500832644 shows موقعیت های باز 4,969 on page
 * resourceEntries proves React loads https://cdn.tsetmc.com/api/Instrument/GetInstrumentOptionByInstrumentID/IRO9AHRM0D71
 * This scraper works on main.tsetmc.com/InstInfo/* after React renders — parses body.innerText
 * SPDX: Smart-FFA-1.1
 */
const VERSION='0.1.0-oiMain-001';

function parseOiFromBodyText(text, inscode){
  if(!text || typeof text!=='string') return { error:'insufficient-data', inscode };
  // body sample: "موقعیت های باز\t4,969\tاندازه قرارداد\t1000"
  const oiMatch = text.match(/موقعیت\s*های\s*باز\s*([0-9,]+)/);
  const contractMatch = text.match(/اندازه\s*قرارداد\s*([0-9,]+)/);
  const oi = oiMatch ? parseInt(oiMatch[1].replace(/,/g,''),10) : null;
  const contractSize = contractMatch ? parseInt(contractMatch[1].replace(/,/g,''),10) : null;
  // also try to find best limits volume for Flow
  return {
    inscode,
    oi: isFinite(oi) ? oi : null,
    contractSize: isFinite(contractSize) ? contractSize : null,
    found: oi!=null,
    rawOi: oiMatch?oiMatch[1]:null,
    rawContract: contractMatch?contractMatch[1]:null
  };
}

// For chain: scrape each instrument page sequentially (rate-limited) or use CDN API if CORS allows
function oiMainUrl(inscode){
  return `https://main.tsetmc.com/InstInfo/${inscode}`;
}

// CDN API that React uses — try first, fallback to DOM scrape
function cdnOptionUrl(isin){
  // isin like IRO9AHRM0D71 for ضهرم7050 — from AllRows isin? Actually AllRows has InsCode, need mapping via GetInstrumentInfo
  return `https://cdn.tsetmc.com/api/Instrument/GetInstrumentOptionByInstrumentID/${isin}`;
}

module.exports={ parseOiFromBodyText, oiMainUrl, cdnOptionUrl, VERSION };
if(typeof window!=='undefined') window.TseOiMain={ parseOiFromBodyText, oiMainUrl, cdnOptionUrl, VERSION };
