/**
 * tseZharfaKavosh — G-07 LIMITED TEST v1 — option-chain source check
 * Read-only, like G-03..G-06: paste in Console on old.tsetmc.com/Loader.aspx?ParTree=15131F
 * Goal: check if AllRows already contains chain fields or needs separate source (per CL-003)
 * Checks: do option rows (ض/ط) have chain-related fields? Are strike/expiry already parsed but chain depth missing?
 * No network — only reads window.mw.AllRows object-map
 * SPDX: Smart-FFA-1.1
 */
(function g07_chain(){
  'use strict';
  var now=new Date(), iso=now.toISOString(), teh=iso;
  try{ teh=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tehran',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(now)+' Asia/Tehran'; }catch(e){}
  var out={
    meta:{ test:'G07-CHAIN-v1', gate:'G-07', evidenceId:'E-015-draft', capturedAt:{utc:iso,tehran:teh,epochMs:now.getTime()}, host:null, href:null, parTree:null, isTop:null },
    chainCheck:{ total:0, optionRows:0, optionRowsSample:[], fieldsPresent:{}, missingChainFields:[], note:'Chain needs full strike ladder per underlying per expiry — does AllRows have it or need separate endpoint?' },
    sampleChain:{ underlying:'اهرم', expiry:'1405/07/29', strikes:[], count:0 },
    sourceHypothesis:{ candidate:'mw.AllRows object-map', hasChain:false, needsSeparate:false, nextProbe:'check TSETMC chain endpoint or history chain' },
    limitations:[],
    status:'unknown'
  };
  try{ out.meta.host=location.host; out.meta.href=location.href; out.meta.parTree=new URL(location.href).searchParams.get('ParTree'); }catch(e){}
  try{ out.meta.isTop=(window===window.top); }catch(e){}
  var mw, rows, vals=[];
  try{ mw=window.mw; rows=mw.AllRows; }catch(e){ out.limitations.push('read error '+e.message); }
  if(rows && typeof rows==='object' && !Array.isArray(rows)){ var keys=Object.keys(rows).sort(); out.chainCheck.total=keys.length; vals=keys.map(function(k){return rows[k];}); }
  else if(Array.isArray(rows)){ vals=rows; out.chainCheck.total=vals.length; }

  // reuse parser logic inline (ض/ط + اختیار)
  function isOption(r){
    var l18=String(r.l18||'').trim(), l30=String(r.l30||'');
    var first=l18.charAt(0);
    if(first!=='ض' && first!=='ط') return false;
    if(l30.indexOf('اختيار')===-1 && l30.indexOf('اختیار')===-1) return false;
    return true;
  }
  function parseL30(l30){
    var parts=l30.split('-');
    if(parts.length<3) return null;
    var last=parts[parts.length-1].trim();
    if(!/^(\d{4}\/\d{2}\/\d{2}|\d{8})$/.test(last)) return null;
    var expiry= /^\d{8}$/.test(last)? last.slice(0,4)+'/'+last.slice(4,6)+'/'+last.slice(6,8) : last;
    var strikeStr=parts[parts.length-2].trim().replace(/,/g,'');
    var strike=parseInt(strikeStr,10);
    if(!isFinite(strike)) return null;
    var before=parts.slice(0, parts.length-2).join('-');
    var m=before.match(/اختیار[خف]\s+(.+)/) || before.match(/اختيار[خف]\s+(.+)/);
    var und=m?m[1].trim():null;
    return {underlying:und, strike:strike, expiry:expiry};
  }

  var optRows=vals.filter(isOption);
  out.chainCheck.optionRows=optRows.length;
  // sample 10 option rows with parsed chain fields
  for(var i=0;i<Math.min(10, optRows.length);i++){
    var r=optRows[i];
    var p=parseL30(String(r.l30||''));
    out.chainCheck.optionRowsSample.push({l18:r.l18, l30:r.l30, inscode:r.inscode, parsed:p, pd1:r.pd1, po1:r.po1, tno:r.tno});
  }
  // Check chain depth for one underlying+expiry: اهرم 1405/07/29
  var targetUnderlying='اهرم', targetExpiry='1405/07/29';
  var chain=[];
  optRows.forEach(function(r){
    var p=parseL30(String(r.l30||''));
    if(p && p.underlying===targetUnderlying && p.expiry===targetExpiry) chain.push({strike:p.strike, inscode:r.inscode, l18:r.l18});
  });
  chain.sort(function(a,b){return a.strike-b.strike;});
  out.sampleChain.underlying=targetUnderlying;
  out.sampleChain.expiry=targetExpiry;
  out.sampleChain.strikes=chain.map(function(c){return c.strike;}).slice(0,20);
  out.sampleChain.count=chain.length;
  // Check which chain fields are present in AllRows row
  var fields=['inscode','l18','l30','pd1','po1','qd1','qo1','tno','tval','pmax','pmin'];
  var present={};
  if(optRows[0]) fields.forEach(function(f){ present[f]= optRows[0][f]!==undefined && optRows[0][f]!==''; });
  out.chainCheck.fieldsPresent=present;
  // Missing chain fields: need OI, multiplier, history chain?
  var missing=[];
  if(!optRows[0] || optRows[0].bvol===undefined) missing.push('bvol (multiplier hint?) missing');
  if(!optRows[0] || optRows[0].eps===undefined) missing.push('eps missing in many');
  out.chainCheck.missingChainFields=missing.length?missing:['OI/multiplier not in AllRows — needs separate source (CL-003)'];

  out.sourceHypothesis.hasChain = chain.length>=3;
  out.sourceHypothesis.needsSeparate = chain.length<10; // if only few strikes, chain incomplete
  out.sourceHypothesis.nextProbe = out.sourceHypothesis.hasChain ? 'AllRows has partial chain for اهرم 1405/07/29 ('+chain.length+' strikes) — but full chain needs endpoint' : 'No chain in AllRows — separate endpoint required';

  out.status = optRows.length>0 ? 'candidate' : 'not-found';
  out.limitations.push('Chain check is on AllRows object-map only — does not call endpoint, so incomplete is expected');
  out.limitations.push('OI/multiplier need G-09/G-10 separate sources, not in this probe');

  console.log('%c[tseZharfaKavosh] G-07 CHAIN v1 — send SUMMARY back','font-weight:bold;color:#0a7;font-size:13px');
  console.log('Host',out.meta.host,' total',out.chainCheck.total,' optionRows',out.chainCheck.optionRows);
  console.log('Sample chain for اهرم 1405/07/29:',out.sampleChain.strikes, 'count',out.sampleChain.count);
  console.log('OptionRows sample (10):'); console.table(out.chainCheck.optionRowsSample);
  console.log('Hypothesis:',out.sourceHypothesis.nextProbe);
  console.log('%c=== COPY G07 SUMMARY BELOW AND SEND BACK ===','color:#a50;font-weight:bold');
  console.log(JSON.stringify(out,null,2));
  console.log('%c=== END G07 COPY BLOCK ===','color:#a50;font-weight:bold');
  return out;
})();
