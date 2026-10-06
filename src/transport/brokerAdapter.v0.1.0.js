/**
 * tseZharfaKavosh — Broker OI Adapter v0.1.0 — fallback when api.tsetmc.com limited
 * Generic pluggable OI/ContractSize provider for when TSETMC api is restricted
 * Same interface as TsetmcOptionApi: getOI(inscode) -> {buyOP, sellOP, contractSize}
 * Supports Mofid/Agah/Dara or any broker that exposes OI
 * SPDX: Smart-FFA-1.1
 */
const VERSION='0.1.0-broker-001';

// Config for broker — all https, validate before use
function validateBrokerConfig(p){
  if(!p || typeof p.baseUrl!=='string' || !p.baseUrl.startsWith('https://')) return { error:'invalid baseUrl' };
  if(!p.apiKey || typeof p.apiKey!=='string' || p.apiKey.length<8) return { error:'invalid apiKey' };
  // provider name for provenance
  if(!p.provider || typeof p.provider!=='string') return { error:'invalid provider' };
  return { ok:true };
}

// Build fetch spec — broker-specific mapping is injected via config
function brokerOiRequest(baseUrl, inscode, apiKey, extraParams={}){
  // Example: https://api.emofid.com/option/oi?inscode=62444...
  // We keep it generic — actual path is provider-specific and versioned in config
  const path = extraParams.path || '/option/oi';
  const url = `${baseUrl}${path}?inscode=${encodeURIComponent(inscode)}`;
  return {
    url,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Accept': 'application/json'
    }
  };
}

// Parse broker response — normalized to same shape as TSETMC BuyOP/SellOP
function parseBrokerOiResponse(json, inscode){
  if(!json || typeof json!=='object') return { error:'insufficient-data', inscode };
  // try common field names across brokers
  const buy = json.buyOP ?? json.BuyOP ?? json.openInterestBuy ?? json.oiBuy ?? json.positionBuy ?? null;
  const sell = json.sellOP ?? json.SellOP ?? json.openInterestSell ?? json.oiSell ?? json.positionSell ?? null;
  const contractSize = json.contractSize ?? json.ContractSize ?? json.contract_size ?? json.lotSize ?? null;
  if(buy==null && sell==null && contractSize==null) return { error:'insufficient-data', inscode, raw: Object.keys(json).slice(0,8) };
  return {
    inscode,
    buyOP: buy!=null ? parseInt(String(buy).replace(/,/g,''),10) : null,
    sellOP: sell!=null ? parseInt(String(sell).replace(/,/g,''),10) : null,
    contractSize: contractSize!=null ? parseInt(String(contractSize).replace(/,/g,''),10) : null,
    provider: json.provider || 'broker',
    rawKeys: Object.keys(json).slice(0,12)
  };
}

// Factory — choose provider based on availability
function chooseOiProvider(providers){
  // providers: [{name:'tsetmc', ok:true}, {name:'scrape', ok:false}, {name:'broker', ok:true}]
  for(let p of providers) if(p.ok) return p.name;
  return null;
}

module.exports={ validateBrokerConfig, brokerOiRequest, parseBrokerOiResponse, chooseOiProvider, VERSION };
if(typeof window!=='undefined') window.TseBrokerAdapter={ validateBrokerConfig, brokerOiRequest, parseBrokerOiResponse, chooseOiProvider, VERSION };
