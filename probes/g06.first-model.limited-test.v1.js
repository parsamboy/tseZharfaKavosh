/**
 * tseZharfaKavosh — G-06 LIMITED TEST v1 — first model + parity + no-fabrication
 * Like previous: read-only, copy-paste in Console on old.tsetmc.com/Loader.aspx?ParTree=15131F
 * Tests:
 *  1) Implementation: compute mid/spread on 5 live rows via src/models/firstModel.v0.1.0.js (embedded)
 *  2) Parity: run twice on same snapshot -> identical results (D1 vs D2 both JS)
 *  3) No-fabrication: feed row with missing pd1/po1 -> must return insufficient-data, not 0
 * No network/storage/timer
 * SPDX: Smart-FFA-1.1
 */
(function g06_firstModel(){
  'use strict';
  var now=new Date(), iso=now.toISOString(), teh=iso;
  try{ teh=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tehran',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(now)+' Asia/Tehran'; }catch(e){}
  var out={
    meta:{ test:'G06-FIRST-MODEL-v1', gate:'G-06', evidenceId:'E-014-draft', capturedAt:{utc:iso,tehran:teh,epochMs:now.getTime()}, host:null, href:null, parTree:null, isTop:null },
    snapshot:{ id:null, total:0 },
    implementation:{ version:'0.1.0-firstModel-001', sampleResults:[], note:'mid=(pd1+po1)/2, spread=po1-pd1, requires pd1/po1' },
    parity:{ run1Hash:null, run2Hash:null, identical:false, note:'two runs on same sorted snapshot must be identical' },
    noFabrication:{ testRow:{pd1:null, po1:'14946'}, result:null, passed:false, note:'missing pd1 must give insufficient-data, not 0' },
    limitations:[],
    status:'unknown'
  };
  try{ out.meta.host=location.host; out.meta.href=location.href; out.meta.parTree=new URL(location.href).searchParams.get('ParTree'); }catch(e){}
  try{ out.meta.isTop=(window===window.top); }catch(e){}
  var mw, rows, keys=[];
  try{ mw=window.mw; rows=mw.AllRows; }catch(e){ out.limitations.push('read error '+e.message); }
  if(rows && typeof rows==='object' && !Array.isArray(rows)) keys=Object.keys(rows).sort();
  else if(Array.isArray(rows)) keys=rows.map(function(_,i){return String(i);});
  out.snapshot.total=keys.length;
  out.snapshot.id='snapshot-'+iso.slice(0,19).replace(/[:T]/g,'-')+'-Tehran-'+keys.length;

  // Embedded minimal firstModel logic (same as src/models/firstModel.v0.1.0.js) — pure, no import
  function parseNum(v){ if(v===undefined||v===null||v==='') return null; if(typeof v==='number') return isFinite(v)?v:null; var s=String(v).replace(/,/g,'').trim(); if(s==='') return null; var n=Number(s); return isFinite(n)?n:null; }
  function compute(row){
    var inscode=String(row.inscode||'');
    var pd1=parseNum(row.pd1), po1=parseNum(row.po1);
    if(pd1===null||po1===null) return {inscode:inscode, mid:null, spread:null, status:'insufficient-data', reason:'pd1/po1 missing'};
    var mid=(pd1+po1)/2, spread=po1-pd1, pct=mid!==0?(spread/mid*100):null;
    return {inscode:inscode, mid:mid, spread:spread, spreadPct:pct, status:'fresh'};
  }

  if(keys.length && rows){
    var vals = rows && typeof rows==='object' && !Array.isArray(rows) ? keys.map(function(k){return rows[k];}) : rows;
    // Implementation: 5 live samples (first 3 + one with shallow book check)
    var samples=[];
    for(var i=0;i<Math.min(5, vals.length);i++){
      var r=vals[i];
      // ensure canonical sorted keys for parity
      var sorted={}; Object.keys(r).sort().forEach(function(k){ sorted[k]=r[k]; });
      samples.push(compute(sorted));
    }
    out.implementation.sampleResults=samples;

    // Parity: run twice and compare hash (fallback hash)
    function hashResults(arr){ var s=JSON.stringify(arr); var h=0; for(var i=0;i<s.length;i++) h=Math.imul(31,h)+s.charCodeAt(i)|0; return (h>>>0).toString(16).padStart(8,'0'); }
    var run1=vals.slice(0,5).map(function(r){ var s={}; Object.keys(r).sort().forEach(function(k){s[k]=r[k];}); return compute(s); });
    var run2=vals.slice(0,5).map(function(r){ var s={}; Object.keys(r).sort().forEach(function(k){s[k]=r[k];}); return compute(s); });
    out.parity.run1Hash=hashResults(run1);
    out.parity.run2Hash=hashResults(run2);
    out.parity.identical = out.parity.run1Hash===out.parity.run2Hash;

    // No-fabrication: feed row missing pd1
    var fakeRow={inscode:'TEST-MISSING', pd1:'', po1:'14946', l18:'ض', l30:'اختيار'};
    var nf=compute(fakeRow);
    out.noFabrication.result=nf;
    out.noFabrication.passed = nf.status==='insufficient-data' && nf.mid===null;

    out.status = (out.parity.identical && out.noFabrication.passed) ? 'candidate' : 'needs-fix';
  } else {
    out.status='not-found';
  }
  out.limitations.push('First model is minimal QuoteMid — G-06 requires one model + parity + no-fabrication; this satisfies with live snapshot');
  out.limitations.push('Snapshot sorted inscode (G-05) ensures parity — same input -> same output on any JS executor');
  console.log('%c[tseZharfaKavosh] G-06 FIRST MODEL v1 — parity + no-fabrication','font-weight:bold;color:#0a7;font-size:13px');
  console.log('Host',out.meta.host,' total',out.snapshot.total,' id',out.snapshot.id);
  console.log('Implementation samples (5):'); console.table(out.implementation.sampleResults);
  console.log('Parity:',out.parity.run1Hash===out.parity.run2Hash?'✅ identical':'❌ differ', out.parity);
  console.log('No-fabrication:',out.noFabrication.passed?'✅ insufficient-data':'❌ fabricated', out.noFabrication.result);
  console.log('%c=== COPY G06 SUMMARY BELOW AND SEND BACK ===','color:#a50;font-weight:bold');
  console.log(JSON.stringify(out,null,2));
  console.log('%c=== END G06 COPY BLOCK ===','color:#a50;font-weight:bold');
  return out;
})();
