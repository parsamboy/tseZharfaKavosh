/**
 * tseZharfaKavosh — G-05 LIMITED TEST v1 — snapshot / canonical serialization
 * Like G-03/G-04: read-only, copy-paste in TSETMC Console on old.tsetmc.com/Loader.aspx?ParTree=15131F
 * Goal: capture snapshot identity, canonical serialization, timezone, rounding, missing semantics for G-05
 * No network/storage/timer — only reads window.mw.AllRows
 *
 * SPDX: Smart-FFA-1.1
 */
(function g05_snapshot(){
  'use strict';
  var now=new Date(), iso=now.toISOString(), teh=iso;
  try{ teh=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tehran',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(now)+' Asia/Tehran'; }catch(e){}
  var out={
    meta:{ test:'G05-SNAPSHOT-v1', gate:'G-05', evidenceId:'E-013-draft', capturedAt:{utc:iso,tehran:teh,epochMs:now.getTime()}, host:null, href:null, parTree:null, isTop:null },
    snapshot:{ id:null, total:0, canonicalHashPreview:null, keysSortedSample:[], firstRowCanonical:null },
    canonical:{ serialization:'JSON with sorted keys (inscode asc) + sorted field keys', timezone:'Asia/Tehran', rounding:'none applied — raw strings preserved, numeric parsing deferred to computation gate', missingPolicy:'missing fields counted, not fabricated' },
    roundingCheck:{ sampleFields:['pc','pcc','pl','pf','tval','tvol'], sampleValues:{}, note:'check if _pc vs pc duplicate and whether numeric strings need parseInt' },
    missing:{ totalFields:113, rowsChecked:0, fieldsWithMissing:[], missingCounts:{} },
    modelVersion:{ snapshotVersion:'0.1.0-snapshot-001', note:'snapshotVersion will be bumped when schema changes' },
    limitations:[],
    status:'unknown'
  };
  try{ out.meta.host=location.host; out.meta.href=location.href; out.meta.parTree=new URL(location.href).searchParams.get('ParTree'); }catch(e){}
  try{ out.meta.isTop=(window===window.top); }catch(e){}
  var mw, rows, vals=[];
  try{ mw=window.mw; rows=mw.AllRows; }catch(e){ out.limitations.push('read error '+e.message); }
  if(rows && typeof rows==='object' && !Array.isArray(rows)){
    var keys=Object.keys(rows).sort(); // canonical order
    out.snapshot.total=keys.length;
    out.snapshot.keysSortedSample=keys.slice(0,5);
    vals=keys.map(function(k){ return rows[k]; });
    out.snapshot.id='snapshot-'+iso.slice(0,19).replace(/[:T]/g,'-')+'-Tehran-'+keys.length;
  } else if(Array.isArray(rows)){ out.snapshot.total=rows.length; vals=rows; out.snapshot.id='snapshot-array-'+iso; }
  else { out.limitations.push('AllRows not object/array'); out.status='not-found'; }

  if(vals.length){
    // canonical first row: sorted keys
    var first=vals[0];
    var sorted={};
    Object.keys(first).sort().forEach(function(k){ sorted[k]=first[k]; });
    out.snapshot.firstRowCanonical=sorted;
    // hash preview of canonical sorted keys list + first row (truncated)
    try{
      var canonStr=JSON.stringify({keys:out.snapshot.keysSortedSample, first:sorted});
      var h=0; for(var i=0;i<canonStr.length;i++) h=Math.imul(31,h)+canonStr.charCodeAt(i)|0;
      out.snapshot.canonicalHashPreview='fallback-'+(h>>>0).toString(16).padStart(8,'0')+'-len-'+canonStr.length+' (full SHA-256 on fixture)';
    }catch(e){}
    // rounding check: sample numeric-like fields
    var sampleFields=out.roundingCheck.sampleFields;
    var sv={};
    sampleFields.forEach(function(f){ sv[f]=first[f]!==undefined? {raw:first[f], type:typeof first[f], isNumericString:/^-?\d[\d,]*$/.test(String(first[f]))} : {missing:true}; });
    out.roundingCheck.sampleValues=sv;
    // missing across first 30 rows for the 6 fields + count all fields missing
    var missCounts={};
    var fieldsWithMissing=[];
    var allKeys=Object.keys(first);
    allKeys.forEach(function(k){ missCounts[k]=0; });
    var checkN=Math.min(30, vals.length);
    out.missing.rowsChecked=checkN;
    for(var r=0;r<checkN;r++){
      var row=vals[r];
      allKeys.forEach(function(k){ if(!(k in row) || row[k]===null || row[k]==='') missCounts[k]++; });
    }
    for(var k in missCounts){ if(missCounts[k]>0) fieldsWithMissing.push(k+':'+missCounts[k]+'/'+checkN); }
    out.missing.missingCounts=missCounts;
    out.missing.fieldsWithMissing=fieldsWithMissing.length? fieldsWithMissing.slice(0,10) : ['none in first 30 — 0 missing for all 113 (as in E-011)'];
    out.status='candidate';
  }
  out.limitations.push('Snapshot canonical is sorted keys — host old.tsetmc.com, ParTree 15131F — no universe completeness claim');
  out.limitations.push('Rounding not applied here — raw strings like \"1234\" preserved; computation gate will define parseInt/decimal');
  console.log('%c[tseZharfaKavosh] G-05 SNAPSHOT v1 — send SUMMARY back','font-weight:bold;color:#0a7;font-size:13px');
  console.log('Host',out.meta.host,' total',out.snapshot.total,' id',out.snapshot.id);
  console.log('Canonical sample keys',out.snapshot.keysSortedSample);
  console.log('FirstRow canonical (sorted):',out.snapshot.firstRowCanonical);
  console.log('RoundingCheck',out.roundingCheck.sampleValues);
  console.log('Missing',out.missing.fieldsWithMissing);
  console.log('%c=== COPY G05 SUMMARY BELOW AND SEND BACK ===','color:#a50;font-weight:bold');
  console.log(JSON.stringify(out,null,2));
  console.log('%c=== END G05 COPY BLOCK ===','color:#a50;font-weight:bold');
  return out;
})();
