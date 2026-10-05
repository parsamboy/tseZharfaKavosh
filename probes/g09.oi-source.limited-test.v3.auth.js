/**
 * G-09/G-10 OI + multiplier — v3 AUTH probe for api.tsetmc.com
 * حالت اول: تست با احراز هویت (read-only)
 * Run in Browser Console on ANY page (or Node) — will POST to https://api.tsetmc.com
 * You will be prompted for TSETMC_USERNAME / PASSWORD (official web-service credentials)
 * No data is uploaded to project server — Bearer token stays in memory, only summary is printed
 * SPDX: Smart-FFA-1.1
 */
(async function g09v3auth(){
  'use strict';
  var out={ meta:{ test:'G09-OI-v3-auth', gates:['G-09','G-10'], evidenceId:'E-023a/b-draft', now:new Date().toISOString() }, login:{ ok:false, status:null, bodySnippet:'' }, option:{ ok:false, status:null, sampleKeys:[], sampleValues:[], contractSizeValues:[], oiValues:[] }, error:null };
  var base='https://api.tsetmc.com';
  // Prompt for credentials (if not already in localStorage for convenience)
  var u=prompt('TSETMC_USERNAME (api.tsetmc.com) را وارد کن:');
  if(!u){ out.error='no username'; console.log(JSON.stringify(out,null,2)); return out; }
  var p=prompt('TSETMC_PASSWORD را وارد کن:');
  if(!p){ out.error='no password'; console.log(JSON.stringify(out,null,2)); return out; }
  function jdump(o,n){ try{ return JSON.stringify(o,null,2).slice(0,n||2000); }catch(e){ return String(o).slice(0,n||2000);} }
  try{
    console.log('%c[G09 v3] logging in to '+base+'/Account/Login ...','color:#0a7;font-weight:bold');
    var r=await fetch(base+'/Account/Login', { method:'POST', headers:{'Content-Type':'application/json','Accept':'application/json'}, body: JSON.stringify({Username:u, Password:p}) });
    out.login.status=r.status;
    var b=await r.json().catch(async()=>({text:await r.text()}));
    out.login.bodySnippet=jdump(b,1200);
    var token = (b && (b.data && (b.data.token||b.data.Token)) || b.token || b.Token || (b.Data && (b.Data.token||b.Data.Token))) || null;
    // also try lower-case
    if(!token && b && typeof b==='object'){ for(var k in b){ if(k.toLowerCase()==='token' && b[k]) token=b[k]; if(b[k] && typeof b[k]==='object' && (b[k].token||b[k].Token)) token=b[k].token||b[k].Token; } }
    // try parsing via helper-like structure
    if(b && b.Data) token = b.Data.token || b.Data.Token || token;
    if(b && b.data) token = b.data.token || b.data.Token || token;
    out.login.ok = !!token;
    out.login.tokenSnippet = token ? token.slice(0,20)+'...' : null;
    if(!token){ out.error='login failed — no token in response (check username/password)'; console.log(JSON.stringify(out,null,2)); return out; }
    console.log('%c[G09 v3] login ok, fetching /Derivative/Option flow=3 ...','color:#0a7;font-weight:bold');
    var r2=await fetch(base+'/Derivative/Option', { method:'POST', headers:{'Content-Type':'application/json','Accept':'application/json','Authorization':'Bearer '+token}, body: JSON.stringify({}) });
    // also try with flow param
    if(r2.status!==200){
      // retry with flow:3
      r2=await fetch(base+'/Derivative/Option', { method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+token}, body: JSON.stringify({flow:3}) });
    }
    out.option.status=r2.status;
    var b2=await r2.json().catch(async()=>({text:await r2.text()}));
    var data = b2.data || b2.Data || b2.result || b2.Result || b2;
    if(Array.isArray(data)) data=data;
    else if(data && Array.isArray(data.Option)) data=data.Option;
    else if(data && Array.isArray(data.options)) data=data.options;
    // normalize to array
    var arr = Array.isArray(data) ? data : (Array.isArray(b2) ? b2 : []);
    // if data is object with numeric keys, convert
    if(!arr.length && data && typeof data==='object' && !Array.isArray(data)){
      var vals=Object.values(data);
      if(vals.length && typeof vals[0]==='object') arr=vals;
    }
    out.option.ok = r2.ok && arr.length>0;
    if(arr.length){
      out.option.total=arr.length;
      out.option.sampleKeys=Object.keys(arr[0]).slice(0,25);
      // sample 2 rows: search for ضهرم7050 if present, else first 2
      var target = arr.find(function(x){ return String(x.InsCode||x.insCode||x.InstrumentID||'').indexOf('62444611500832644')!==-1 || String(x.Symbol||x.l18||'').indexOf('ضهرم7050')!==-1; });
      var samples = target ? [target, arr[0]] : arr.slice(0,2);
      out.option.sampleValues=samples.map(function(o){ return { InsCode:o.InsCode||o.insCode, Symbol:o.Symbol||o.InstrumentID||o.l18, BuyOP:o.BuyOP, SellOP:o.SellOP, YesterdayOP:o.YesterdayOP, ContractSize:o.ContractSize, StrikePrice:o.StrikePrice, UAInsCode:o.UAInsCode, BeginDate:o.BeginDate, EndDate:o.EndDate }; });
      out.option.oiValues=samples.map(function(o){ return { BuyOP:o.BuyOP, SellOP:o.SellOP, YesterdayOP:o.YesterdayOP }; });
      out.option.contractSizeValues=[...new Set(arr.slice(0,20).map(function(o){return o.ContractSize;}))];
      out.option.distinctContractSizes = out.option.contractSizeValues;
    } else {
      out.option.bodySnippet=jdump(b2,2000);
    }
  }catch(e){
    out.error=e.message;
    console.error(e);
  }
  console.log('%c[G09 v3] DONE — copy SUMMARY','color:#0a7;font-weight:bold');
  console.log(JSON.stringify(out,null,2));
  // extra: clear password from memory hint
  console.log('%c[privacy] password/token not stored — only summary above leaves browser','color:#888');
  return out;
})();
