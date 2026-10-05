/**
 * G-15..G-18 — remaining governance gates (local, no TSETMC needed)
 * G-15 product release approval, G-16 SSE fallback, G-17 D3 auth, G-18 Alpha scope
 */
(function g15_18(){
  var out={
    'G-15': { gate:'G-15 product release approval', status:'open', bestChoice:'Release approval requires all technical gates G-03..G-14 candidate/confirmed — currently G-03 confirmed, G-04..G-08 candidate, G-09/10 needs-separate — not yet release-ready per §20 order' },
    'G-16': { gate:'G-16 SSE fallback policy', status:'candidate', bestChoice:'SSE fallback maxAttempts/pollInterval/maxFallbackDuration already defined in PART U §13 — D2 HTTP/JSON+SSE, needs config versioned + trace — gate candidate pending transport config' },
    'G-17': { gate:'G-17 D3 auth/discovery', status:'candidate', bestChoice:'D3 Managed Container + OAuth2/OIDC discovery per D-2026-10-03-003 — provider not yet chosen, but topology fixed — gate candidate' },
    'G-18': { gate:'G-18 Alpha scope approval', status:'open', bestChoice:'Alpha scope (P-DEC-001) still needs explicit owner approval for phased D3/GEX/Flow — G-18 stays open, matches P-DEC-001' },
    'P-DEC-001': { status:'open', note:'Alpha scope phased release — D1/D2 + Greeks/IV + part SVI, D3/GEX/Flow/Surface deferred — needs owner sign' },
    'P-DEC-002': { status:'open', note:'Privacy/data-transfer policy — D1 no-upload, D2 local-first, D3 opt-in — needs Class B' },
  };
  console.log('%c[G-15..G-18 + P-DEC]','color:#0a7;font-weight:bold');
  console.log(JSON.stringify(out,null,2));
  return out;
})();
if(typeof module!=='undefined'&&module.exports) module.exports={};
