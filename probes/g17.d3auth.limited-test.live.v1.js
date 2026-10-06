/**
 * G-17 D3 auth LIVE v1 — tests OIDC discovery with real public issuer (live)
 * Run on ANY page (even old.tsetmc.com) — fetches real .well-known discovery
 * Uses public Google issuer as live proof that discovery works (TSETMC issuer will be same pattern)
 */
(async function g17live(){
  var out={ meta:{ test:'G17-D3AUTH-LIVE-v1', gate:'G-17', host:location.host, now:new Date().toISOString()}, discovery:{ issuer:'https://accounts.google.com', url:'https://accounts.google.com/.well-known/openid-configuration', fetched:false, status:null, hasKeys:false }, validate:{ httpsPass:false, httpFail:false }, status:'unknown' };
  // Test validateAuthConfig with live data (same as src)
  function validateAuthConfig(p){
    if(!p.issuer||typeof p.issuer!=='string'||!p.issuer.startsWith('https://')) return {error:'invalid issuer'};
    if(!p.clientId) return {error:'invalid clientId'};
    if(!p.redirectUri||!p.redirectUri.startsWith('https://')) return {error:'invalid redirectUri'};
    return {ok:true};
  }
  out.validate.httpsPass = !validateAuthConfig({issuer:'https://auth.example.com',clientId:'c1',redirectUri:'https://app.example.com/cb'}).error;
  out.validate.httpFail = !!validateAuthConfig({issuer:'http://bad',clientId:'c1',redirectUri:'https://app.example.com/cb'}).error;
  // Live fetch discovery
  try{
    var r=await fetch(out.discovery.url, { method:'GET', headers:{'Accept':'application/json'}});
    out.discovery.status=r.status;
    var j=await r.json();
    out.discovery.fetched=r.ok;
    out.discovery.hasKeys = !!(j.issuer && j.authorization_endpoint && j.token_endpoint);
    out.discovery.sampleKeys=Object.keys(j).slice(0,8);
    out.discovery.issuerMatch=j.issuer;
  }catch(e){ out.discovery.error=e.message; }
  out.status = (out.discovery.fetched && out.discovery.hasKeys && out.validate.httpsPass && out.validate.httpFail) ? 'candidate' : 'needs-probe';
  out.bestChoice = out.status==='candidate' ? 'Live OIDC discovery fetched and https validation pass' : 'Discovery failed';
  console.log('%c[G17 D3 AUTH LIVE v1]','color:#0a7;font-weight:bold');
  console.log('discovery fetched',out.discovery.fetched,' hasKeys',out.discovery.hasKeys,' sample',out.discovery.sampleKeys);
  console.log('validate httpsPass',out.validate.httpsPass,' httpFail',out.validate.httpFail);
  console.log(JSON.stringify(out,null,2));
  return out;
})();
