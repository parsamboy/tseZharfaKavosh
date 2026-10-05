#!/usr/bin/env node
/**
 * G-09/G-10 v3 Node — bypass CORS (run locally, not in browser)
 * حالت 1 بدون CORS: از ترمینال لوکال اجرا کن
 *   node probes/g09.oi-source.limited-test.v3.node.js
 * سپس username/password را وارد کن (token فقط در حافظه)
 * نیاز: Node 18+ (fetch built-in) — روی تهران اجرا کن، روی Arena تایم‌اوت می‌خورد
 * SPDX: Smart-FFA-1.1
 */
const https = require('https');
const readline = require('readline');

function ask(q){ return new Promise(res=>{
  const rl=readline.createInterface({input:process.stdin, output:process.stdout});
  rl.question(q, ans=>{ rl.close(); res(ans.trim()); });
});}

function postJson(host, path, body, headers={}){
  return new Promise((resolve, reject)=>{
    const data = JSON.stringify(body);
    const opts = {
      hostname: host,
      path: path,
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'Accept':'application/json', 'Content-Length': Buffer.byteLength(data), ...headers },
      timeout: 15000
    };
    const req = https.request(opts, res=>{
      let chunks='';
      res.on('data', d=> chunks+=d);
      res.on('end', ()=> {
        let json;
        try{ json=JSON.parse(chunks); }catch(e){ json={ raw: chunks.slice(0,3000) }; }
        resolve({ status: res.statusCode, headers: res.headers, body: json, raw: chunks.slice(0,3000) });
      });
    });
    req.on('error', reject);
    req.on('timeout', ()=>{ req.destroy(new Error('timeout')); });
    req.write(data);
    req.end();
  });
}

(async()=>{
  console.log('[G09 v3 Node] api.tsetmc.com login -> Derivative/Option (bypass CORS)');
  const u = await ask('TSETMC_USERNAME: ');
  if(!u){ console.log('no username'); process.exit(1); }
  const p = await ask('TSETMC_PASSWORD: ');
  if(!p){ console.log('no password'); process.exit(1); }
  const baseHost='api.tsetmc.com';
  console.log('-> POST https://'+baseHost+'/Account/Login');
  let r1;
  try{ r1 = await postJson(baseHost, '/Account/Login', {Username:u, Password:p}); }catch(e){ console.error('login fetch failed', e.message); process.exit(1); }
  console.log('login status', r1.status);
  console.log('login body', JSON.stringify(r1.body,null,2).slice(0,2000));
  let token = r1.body && (r1.body.data && (r1.body.data.token||r1.body.data.Token) || r1.body.token||r1.body.Token || (r1.body.Data && (r1.body.Data.token||r1.body.Data.Token)));
  if(!token && r1.body && typeof r1.body==='object'){
    for(let k in r1.body){ if(k.toLowerCase()==='token' && r1.body[k]) token=r1.body[k]; if(r1.body[k] && typeof r1.body[k]==='object' && (r1.body[k].token||r1.body[k].Token)) token=r1.body[k].token||r1.body[k].Token; }
  }
  if(!token){ console.log('no token — check credentials, body above'); process.exit(1); }
  console.log('token ok', token.slice(0,20)+'...');
  console.log('-> POST https://'+baseHost+'/Derivative/Option');
  let r2;
  try{
    r2 = await postJson(baseHost, '/Derivative/Option', {}, { 'Authorization':'Bearer '+token });
    if(r2.status!==200 || !r2.body || (Array.isArray(r2.body) && !r2.body.length)){
      // retry with flow:3
      const r2b = await postJson(baseHost, '/Derivative/Option', {flow:3}, { 'Authorization':'Bearer '+token });
      if(r2b.status===200) r2=r2b;
    }
  }catch(e){ console.error('option fetch failed', e.message); process.exit(1); }
  console.log('option status', r2.status);
  console.log('option body snippet', JSON.stringify(r2.body,null,2).slice(0,5000));
  let data = r2.body.data || r2.body.Data || r2.body.result || r2.body.Result || r2.body;
  if(Array.isArray(data)) data=data;
  else if(data && Array.isArray(data.Option)) data=data.Option;
  let arr = Array.isArray(data) ? data : (Array.isArray(r2.body)? r2.body : []);
  if(!arr.length && data && typeof data==='object'){ const vals=Object.values(data); if(vals.length && typeof vals[0]==='object') arr=vals; }
  console.log('option total', arr.length);
  if(arr.length){
    console.log('sample keys', Object.keys(arr[0]).slice(0,25));
    const samp = arr.slice(0,2).map(o=>({InsCode:o.InsCode||o.insCode, BuyOP:o.BuyOP, SellOP:o.SellOP, YesterdayOP:o.YesterdayOP, ContractSize:o.ContractSize, StrikePrice:o.StrikePrice}));
    console.log('samples', JSON.stringify(samp,null,2));
    console.log('distinct ContractSize (first 20)', [...new Set(arr.slice(0,20).map(o=>o.ContractSize))]);
  }
  console.log('[privacy] token not saved — copy output above as E-023a/b');
})();
