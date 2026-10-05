/**
 * tseZharfaKavosh — G-11 LIMITED TEST v1 — other models dependency check
 * Read-only local check: does snapshot support remaining models? (Greeks/IV, GARCH, Spread, SVI, GEX/DEX, Flow, Surface)
 * No TSETMC needed — checks current fixtures and parser
 * SPDX: Smart-FFA-1.1
 */
(function g11(){
  var out={
    meta:{ test:'G11-OTHER-MODELS-v1', gate:'G-11', evidenceId:'E-019-draft', now:new Date().toISOString() },
    models:{
      'Greeks/IV': { needs:['optionParser','pc','strike','expiry','underlying'], has:true, note:'pc and strike/expiry from G-04/G-05 available — IV needs calendar (G-08 done)' },
      'GARCH': { needs:['history close'], has:false, note:'history TSETMC not in AllRows 113 — needs separate source (G-11)' },
      'Spread': { needs:['pd1','po1'], has:true, note:'pd1/po1 available — firstModel already computes spread (G-06) ✅' },
      'SVI': { needs:['chain full','IV'], has:false, note:'chain partial (G-07 34) but OI missing (G-09) — needs G-09/10' },
      'GEX/DEX': { needs:['chain','OI','multiplier'], has:false, note:'chain 34, OI none, multiplier needs separate — needs G-09/10' },
      'Flow': { needs:['trade history'], has:false, note:'tno/tval are aggregate, not history — needs separate' },
      'VolSurface': { needs:['chain','IV'], has:false, note:'needs SVI first' }
    },
    status:'needs-separate',
    bestChoice:'G-11 requires per-model dependency matrix — Spread is ready (G-06), others need G-07..G-10 separate sources — gate stays open but Spread candidate'
  };
  var ready=Object.keys(out.models).filter(function(k){return out.models[k].has;});
  var notReady=Object.keys(out.models).filter(function(k){return !out.models[k].has;});
  console.log('%c[tseZharfaKavosh] G-11 OTHER MODELS v1','font-weight:bold;color:#0a7');
  console.log('Ready:',ready, 'NotReady:',notReady);
  console.log('Best choice:',out.bestChoice);
  console.log(JSON.stringify(out,null,2));
  return out;
})();
if(typeof module!=='undefined'&&module.exports) module.exports={};
