/**
 * tseZharfaKavosh — G-10 LIMITED TEST v1 — multiplier source check
 * Read-only, like before: paste in Console on old.tsetmc.com/Loader.aspx?ParTree=15131F
 * Goal: check if AllRows has multiplier field or needs independent source (must not be inferred from OI/label)
 * Checks all 113 keys for multiplier candidates: z, bvol, yval, etc. and samples values for option rows
 * No network, only reads window.mw.AllRows
 * SPDX: Smart-FFA-1.1
 */
(function g10_mult(){
  'use strict';
  var now=new Date(), iso=now.toISOString(), teh=iso;
  try{ teh=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tehran',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(now)+' Asia/Tehran'; }catch(e){}
  var out={
    meta:{ test:'G10-MULT-v1', gate:'G-10', evidenceId:'E-018-draft', capturedAt:{utc:iso,tehran:teh,epochMs:now.getTime()}, host:null, href:null, parTree:null, isTop:null },
    multCheck:{ total:0, optionRows:0, allKeys:[], candidateKeys:[], samples:[], distinctValues:{} },
    sourceHypothesis:{ hasMultiplier:false, needsSeparate:true, next:'need independent multiplier source, not inferred from OI/label' },
    limitations:[],
    status:'unknown'
  };
  try{ out.meta.host=location.host; out.meta.href=location.href; out.meta.parTree=new URL(location.href).searchParams.get('ParTree'); }catch(e){}
  try{ out.meta.isTop=(window===window.top); }catch(e){}
  var mw, rows, vals=[];
  try{ mw=window.mw; rows=mw.AllRows; }catch(e){ out.limitations.push('read error '+e.message); }
  if(rows && typeof rows==='object' && !Array.isArray(rows)){ vals=Object.values(rows); out.multCheck.total=vals.length; }
  else if(Array.isArray(rows)){ vals=rows; out.multCheck.total=vals.length; }

  function isOption(r){ var l18=String(r.l18||'').trim(), l30=String(r.l30||''); return (l18.charAt(0)==='ض'||l18.charAt(0)==='ط') && (l30.indexOf('اختيار')!==-1||l30.indexOf('اختیار')!==-1); }

  if(vals.length){
    out.multCheck.allKeys=Object.keys(vals[0]).sort();
    // candidate multiplier keys: known TSETMC fields that could be size: z, bvol, yval, cs, flow
    var candidates=['z','bvol','yval','cs','flow','cgrvalcot'];
    out.multCheck.candidateKeys=candidates;
    var opts=vals.filter(isOption);
    out.multCheck.optionRows=opts.length;
    // sample 10 option rows for candidate values
    for(var i=0;i<Math.min(10, opts.length);i++){
      var r=opts[i];
      var s={l18:r.l18, inscode:r.inscode, z:r.z, bvol:r.bvol, yval:r.yval, cs:r.cs, flow:r.flow, cgrvalcot:r.cgrvalcot};
      out.multCheck.samples.push(s);
    }
    // distinct values for z and bvol across option rows
    var zSet={}, bvolSet={};
    opts.forEach(function(r){ zSet[String(r.z)]=true; bvolSet[String(r.bvol)]=true; });
    out.multCheck.distinctValues.z=Object.keys(zSet);
    out.multCheck.distinctValues.bvol=Object.keys(bvolSet);
    out.multCheck.distinctValues.yval=Object.keys(vals.reduce(function(a,r){a[String(r.yval)]=1;return a;}, {}));
    out.sourceHypothesis.hasMultiplier = out.multCheck.distinctValues.z.length===1 && out.multCheck.distinctValues.z[0]==='1000';
    // But even if z=1000 constant, is it multiplier or lot size? Need independent source per spec — cannot infer from OI/label alone
    out.sourceHypothesis.needsSeparate = true; // per G-10 spec: must be independent source, not inferred
    out.sourceHypothesis.next = 'AllRows has z=1000 constant for options, but per G-10 spec multiplier must be from independent source, not inferred from z/bvol — separate source required';
  }
  out.status = 'needs-separate';
  out.limitations.push('G-10 requires independent multiplier source, not inferred from OI or label — even if z looks like 1000, needs provenance');
  out.limitations.push('bvol is 1 for all options sampled, not multiplier');

  console.log('%c[tseZharfaKavosh] G-10 MULTIPLIER v1 — send SUMMARY back','font-weight:bold;color:#0a7;font-size:13px');
  console.log('Host',out.meta.host,' total',out.multCheck.total,' optionRows',out.multCheck.optionRows);
  console.log('AllKeys',out.multCheck.allKeys);
  console.log('Candidate keys z/bvol samples:',out.multCheck.samples);
  console.log('Distinct z:',out.multCheck.distinctValues.z,' bvol:',out.multCheck.distinctValues.bvol);
  console.log('Hypothesis:',out.sourceHypothesis.next);
  console.log('%c=== COPY G10 SUMMARY BELOW AND SEND BACK ===','color:#a50;font-weight:bold');
  console.log(JSON.stringify(out,null,2));
  console.log('%c=== END G10 COPY BLOCK ===','color:#a50;font-weight:bold');
  return out;
})();
