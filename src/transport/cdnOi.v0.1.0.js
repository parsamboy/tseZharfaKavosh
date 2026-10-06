/**
 * tseZharfaKavosh — CDN OI Provider v0.1.0 — found via main.tsetmc.com Network
 * User confirmed OI on page is 4,969 and CDN GetInstrumentOptionByInstrumentID returns buyOP 4972
 * This is the fallback when api.tsetmc.com limited — uses cdn.tsetmc.com/api/Instrument
 * SPDX: Smart-FFA-1.1
 */
const VERSION='0.1.0-cdnOi-001';

async function fetchCdnOi(inscode, fetchFn=fetch){
  // Step 1: get instrumentID via GetInstrumentInfo
  const infoUrl=`https://cdn.tsetmc.com/api/Instrument/GetInstrumentInfo/${inscode}`;
  const r1=await fetchFn(infoUrl, { headers:{'Accept':'application/json'} });
  if(!r1.ok) return { error:'instrumentInfo failed', inscode, status:r1.status };
  const j1=await r1.json();
  const instrumentID=j1?.instrumentInfo?.instrumentID || j1?.instrumentID;
  if(!instrumentID) return { error:'no instrumentID', inscode, j1Keys:Object.keys(j1) };
  // Step 2: get OI via GetInstrumentOptionByInstrumentID
  const optUrl=`https://cdn.tsetmc.com/api/Instrument/GetInstrumentOptionByInstrumentID/${instrumentID}`;
  const r2=await fetchFn(optUrl, { headers:{'Accept':'application/json'} });
  if(!r2.ok) return { error:'optionInfo failed', inscode, instrumentID, status:r2.status };
  const j2=await r2.json();
  const opt=j2?.instrumentOption || j2;
  if(!opt || opt.buyOP==null) return { error:'no buyOP', inscode, instrumentID, j2Keys:Object.keys(j2) };
  return {
    inscode,
    instrumentID,
    buyOP: opt.buyOP,
    sellOP: opt.sellOP,
    contractSize: opt.contractSize ?? j1.instrumentInfo?.contractSize,
    strikePrice: opt.strikePrice,
    uaInsCode: opt.uaInsCode,
    source: 'cdn.tsetmc.com/api/Instrument'
  };
}

module.exports={ fetchCdnOi, VERSION };
if(typeof window!=='undefined') window.TseCdnOi={ fetchCdnOi, VERSION };
