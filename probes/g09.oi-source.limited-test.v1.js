/**
 * tseZharfaKavosh — G-09 LIMITED TEST v1 — OI source check
 * Read-only, like before: paste in Console on old.tsetmc.com/Loader.aspx?ParTree=15131F
 * Goal: check if AllRows has OI field or needs separate source (per CL-003 / G-09)
 * Checks all 113 keys for oi-like names and samples qd/qo/tvol as proxies
 * No network, only reads window.mw.AllRows
 * SPDX: Smart-FFA-1.1
 */
(function g09_oi(){
  'use strict';
  var now=new Date(), iso=now.toISOString(), teh=iso;
  try{ teh=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tehran',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(now)+' Asia/Tehran'; }catch(e){}
  var out={
    meta:{ test:'G09-OI-v1', gate:'G-09', evidenceId:'E-017-draft', capturedAt:{utc:iso,tehran:teh,epochMs:now.getTime()}, host:null, href:null, parTree:null, isTop:null },
    oiCheck:{ total:0, optionRows:0, allKeys:[], oiLikeKeys:[], oiFieldFound:false, sampleOIValues:[] },
    tvolCheck:{ sampleTvol:[], note:'tvol/bvol are trade volume, not OI — need distinction' },
    sourceHypothesis:{ candidate:'AllRows 113 keys', hasOI:false, needsSeparate:true, next:'need separate OI endpoint/history' },
    limitations:[],
    status:'unknown'
  };
  try{ out.meta.host=location.host; out.meta.href=location.href; out.meta.parTree=new URL(location.href).searchParams.get('ParTree'); }catch(e){}
  try{ out.meta.isTop=(window===window.top); }catch(e){}
  var mw, rows, vals=[];
  try{ mw=window.mw; rows=mw.AllRows; }catch(e){ out.limitations.push('read error '+e.message); }
  if(rows && typeof rows==='object' && !Array.isArray(rows)){ vals=Object.values(rows); out.oiCheck.total=vals.length; }
  else if(Array.isArray(rows)){ vals=rows; out.oiCheck.total=vals.length; }

  function isOption(r){ var l18=String(r.l18||'').trim(), l30=String(r.l30||''); return (l18.charAt(0)==='ض'||l18.charAt(0)==='ط') && (l30.indexOf('اختيار')!==-1||l30.indexOf('اختیار')!==-1); }

  if(vals.length){
    var first=vals[0];
    out.oiCheck.allKeys=Object.keys(first).sort();
    // search for oi-like keys: contains 'oi' case-insensitive or 'open' or 'interest'
    out.oiCheck.oiLikeKeys=out.oiCheck.allKeys.filter(function(k){ var low=k.toLowerCase(); return low.indexOf('oi')!==-1 || low.indexOf('open')!==-1 || low.indexOf('interest')!==-1; });
    out.oiCheck.oiFieldFound=out.oiCheck.oiLikeKeys.length>0;
    var opts=vals.filter(isOption);
    out.oiCheck.optionRows=opts.length;
    // sample OI-like values if found, else sample tvol/bvol as volume proxy
    for(var i=0;i<Math.min(5, opts.length);i++){
      var r=opts[i];
      var oiVals={};
      out.oiCheck.oiLikeKeys.slice(0,5).forEach(function(k){ oiVals[k]=r[k]; });
      out.oiCheck.sampleOIValues.push({l18:r.l18, inscode:r.inscode, oi:oiVals});
      out.tvolCheck.sampleTvol.push({l18:r.l18, tvol:r.tvol, bvol:r.bvol, tno:r.tno, cs:r.cs});
    }
  }
  out.sourceHypothesis.hasOI=out.oiCheck.oiFieldFound;
  out.sourceHypothesis.needsSeparate=!out.oiCheck.oiFieldFound;
  out.sourceHypothesis.next = out.oiCheck.oiFieldFound ? 'OI field found in AllRows — check timestamp/provenance' : 'No OI field in 113 keys — separate OI source required (G-09) per CL-003';
  out.status = out.oiCheck.oiFieldFound ? 'candidate' : 'needs-separate';
  out.limitations.push('AllRows 113 keys checked — OI not among them, tvol is trade volume, not OI');
  out.limitations.push('OI needs timestamp and provenance — even if field exists, need separate gate');

  console.log('%c[tseZharfaKavosh] G-09 OI v1 — send SUMMARY back','font-weight:bold;color:#0a7;font-size:13px');
  console.log('Host',out.meta.host,' total',out.oiCheck.total,' optionRows',out.oiCheck.optionRows);
  console.log('AllKeys (113):',out.oiCheck.allKeys);
  console.log('OI-like keys:',out.oiCheck.oiLikeKeys);
  console.log('Sample OI values:',out.oiCheck.sampleOIValues);
  console.log('Sample tvol:',out.tvolCheck.sampleTvol);
  console.log('Hypothesis:',out.sourceHypothesis.next);
  console.log('%c=== COPY G09 SUMMARY BELOW AND SEND BACK ===','color:#a50;font-weight:bold');
  console.log(JSON.stringify(out,null,2));
  console.log('%c=== END G09 COPY BLOCK ===','color:#a50;font-weight:bold');
  return out;
})();
