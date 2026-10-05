/**
 * tseZharfaKavosh — LIMITED TEST v2 for mw.AllRows — OBJECT MAP HANDLER
 * Based on v1 result 2026-10-05 10:43 Tehran:
 *   host=old.tsetmc.com, href=Loader.aspx?ParTree=15131F, isTop=true
 *   AllRows exists, type=object, NOT array, keys=30 numeric inscodes
 * This v2 correctly handles object-map form: keys are inscodes, values are row objects
 *
 * READ-ONLY, no SaveParams/FilterCode/fetch/storage/timer
 * HOW TO RUN: same as v1 — paste entire file in Console on same page, copy SUMMARY
 * SPDX: Smart-FFA-1.1
 */
(function limitedTest_v2(){
  'use strict';
  var now=new Date(), isoUTC=now.toISOString(), tehran=isoUTC;
  try{ tehran=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tehran',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(now)+' Asia/Tehran'; }catch(e){}
  var out={
    meta:{ test:'LIMITED-TEST-v2', evidenceId:'E-011-draft-v2', capturedAt:{utc:isoUTC,tehran:tehran,epochMs:now.getTime()}, host:null, href:null, parTree:null, isTop:null, userAgent:null, note:'v2 handles object-map AllRows (v1 showed object with 30 keys)' },
    existence:{ hasWindowMw:false, mwType:null, hasAllRows:false, allRowsType:null, isArray:false, length:null, keyCount:null },
    mapInfo:{ host:'old.tsetmc.com (observed)', type:'object-map', mapKeysSample:null, mapKeyCount:null, valueType:null },
    schema:{ keys:[], keyCount:0, idCandidate:null, rowType:null, rowsWithId:null, duplicateIds:null, fieldTypes:{} },
    samplePreview:null,
    rawPreview:null,
    limitations:[],
    status:'unknown'
  };
  try{ out.meta.host=location.host; out.meta.href=location.href; out.meta.parTree=new URL(location.href).searchParams.get('ParTree'); }catch(e){}
  try{ out.meta.isTop=(window===window.top); }catch(e){ out.meta.isTop='error:'+e.message; }
  try{ out.meta.userAgent=navigator.userAgent; }catch(e){}
  var mw, rows;
  try{ mw=window.mw; out.existence.hasWindowMw=(typeof mw!=='undefined'&&mw!==null); out.existence.mwType=(mw===null?'null':(Array.isArray(mw)?'array':typeof mw)); }catch(e){ out.limitations.push('window.mw read error: '+e.message); }
  if(out.existence.hasWindowMw){
    try{ rows=mw.AllRows; out.existence.hasAllRows=(typeof rows!=='undefined'&&rows!==null); out.existence.allRowsType=(rows===null?'null':(Array.isArray(rows)?'array':typeof rows)); out.existence.isArray=Array.isArray(rows); if(rows&&typeof rows.length==='number') out.existence.length=rows.length; }catch(e){ out.limitations.push('mw.AllRows read error: '+e.message); }
  }
  // Handle object-map case (v1 result)
  if(rows && typeof rows==='object' && !Array.isArray(rows)){
    var mapKeys=Object.keys(rows);
    out.mapInfo.mapKeyCount=mapKeys.length;
    out.mapInfo.mapKeysSample=mapKeys.slice(0,5);
    out.existence.keyCount=mapKeys.length;
    out.existence.length=mapKeys.length; // for object, length = key count
    // inspect values
    var values=Object.values(rows);
    out.mapInfo.valueType = values.length? (values[0]===null?'null':typeof values[0]) : 'empty';
    if(values.length>0 && values[0] && typeof values[0]==='object'){
      var first=values[0];
      var keys=Object.keys(first).sort();
      out.schema.keys=keys;
      out.schema.keyCount=keys.length;
      out.schema.rowType=typeof first;
      // id candidate: map key is likely inscode, but check if field also contains it
      var cands=['inscode','InsCode','insCode','instrumentId','id','l18','l30'];
      for(var i=0;i<cands.length;i++) if(keys.indexOf(cands[i])!==-1){ out.schema.idCandidate=cands[i]; break; }
      if(!out.schema.idCandidate) out.schema.idCandidate='(map key is inscode)';
      // preview first row
      var preview={};
      keys.slice(0,30).forEach(function(k){ var v=first[k]; var t=(v===null?'null':typeof v); if(t==='string') preview[k]={type:'string',len:v.length,preview:v.slice(0,120)}; else if(t==='number') preview[k]={type:'number',value:v}; else if(t==='boolean') preview[k]={type:'boolean',value:v}; else preview[k]={type:t,preview:String(v).slice(0,120)}; });
      out.samplePreview=preview;
      // fieldTypes stats across all values (sample full 30)
      var stats={};
      keys.forEach(function(k){ stats[k]={string:0,number:0,boolean:0,null:0,undef:0,other:0,missing:0}; });
      var seen={}; var dups=0; var withId=0;
      for(var r=0;r<values.length;r++){
        var row=values[r];
        if(row===null||typeof row!=='object'){ out.limitations.push('value['+r+'] not object: '+typeof row); continue; }
        keys.forEach(function(k){ if(!(k in row)) stats[k].missing++; else { var v=row[k]; if(v===null) stats[k].null++; else if(typeof v==='string') stats[k].string++; else if(typeof v==='number') stats[k].number++; else if(typeof v==='boolean') stats[k].boolean++; else if(typeof v==='undefined') stats[k].undef++; else stats[k].other++; } });
        // check duplicate via map key (should be unique) and via id field
        var mapKey=mapKeys[r];
        if(seen[mapKey]) dups++; else seen[mapKey]=1;
        if(out.schema.idCandidate && out.schema.idCandidate!=='(map key is inscode)'){
          var fid=row[out.schema.idCandidate]; if(fid!==undefined&&fid!==null&&fid!=='') withId++;
        } else { withId=mapKeys.length; }
      }
      out.schema.fieldTypes=stats;
      out.schema.rowsWithId=withId;
      out.schema.duplicateIds=dups;
      out.status='candidate-object-map';
      try{ out.rawPreview=JSON.stringify(values.slice(0,2),null,2).slice(0,4000); }catch(e){ out.rawPreview='stringify error: '+e.message; }
    } else {
      out.limitations.push('AllRows values are not objects — first value type: '+out.mapInfo.valueType);
      out.status='object-values-not-object';
    }
  } else if(Array.isArray(rows)){
    out.status='candidate-array (unexpected — v1 showed object)';
    out.limitations.push('AllRows is array here, but v1 showed object — possible different page load state');
    out.existence.length=rows.length;
  } else if(out.existence.hasAllRows){
    out.status='unknown-type';
    out.limitations.push('AllRows exists but not object/array — type: '+out.existence.allRowsType);
  } else {
    out.status='not-found';
    out.limitations.push('mw.AllRows not found');
  }
  out.limitations.push('Host observed: old.tsetmc.com (Loader.aspx) — differs from www proposal; provenance must record old.tsetmc.com');
  out.limitations.push('No universe completeness claimed');
  out.limitations.push('Missing stays missing');
  console.log('%c[tseZharfaKavosh] LIMITED TEST v2 — object-map handler', 'font-weight:bold;color:#0a7;font-size:13px');
  console.log('Host:',out.meta.host,' ParTree:',out.meta.parTree,' isTop:',out.meta.isTop);
  console.log('Existence:',out.existence,' MapInfo:',out.mapInfo);
  console.log('Schema:',out.schema);
  if(out.samplePreview){ console.log('SamplePreview (first value row):'); console.table(out.samplePreview); }
  console.log('Status:',out.status,' keyCount:',out.existence.keyCount);
  if(out.limitations.length) console.log('Limitations:',out.limitations);
  console.log('%c=== COPY EVERYTHING BELOW THIS LINE (v2) AND SEND BACK ===','color:#a50;font-weight:bold');
  console.log(JSON.stringify(out,null,2));
  console.log('%c=== END OF COPY BLOCK v2 ===','color:#a50;font-weight:bold');
  console.log('Also note: run again after F5 to capture refreshBehavior later.');
  return out;
})();
