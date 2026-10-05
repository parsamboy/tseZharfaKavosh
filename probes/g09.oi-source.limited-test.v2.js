/**
 * tseZharfaKavosh — G-09 LIMITED TEST v2 — OI separate source discovery
 * Read-only, like before: paste in Console on TSETMC pages (requires user to try 2 hosts)
 * v2 vs v1: v1 proved AllRows 113 has NO OI (oiLikeKeys []). v2 searches SEPARATE sources.
 * Per spec v0.2.0 §7: OI must be independent, not tvol/bvol.
 * No network mutation, only reads window.* and tries to discover candidate OI fields/pages.
 * SPDX: Smart-FFA-1.1
 *
 * HOW TO RUN (send back BOTH runs):
 * 1) Run on old.tsetmc.com/Loader.aspx?ParTree=15131F (same as v1) — confirms still no OI
 * 2) Run on tsetmc.com/Loader.aspx?ParTree=151318 or instrument detail page (e.g. TSETMC option inst page) — searches for OI there
 */
(function g09_oi_v2(){
  'use strict';
  var now=new Date(), iso=now.toISOString(), teh=iso;
  try{ teh=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tehran',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(now)+' Asia/Tehran'; }catch(e){}
  var out={
    meta:{ test:'G09-OI-v2', gate:'G-09', evidenceId:'E-023a-draft', capturedAt:{utc:iso,tehran:teh,epochMs:now.getTime()}, host:null, href:null, parTree:null, isTop:null },
    step1_allRows:{ total:0, optionRows:0, allKeys:[], oiLikeKeys:[], hasOI:false, sample:[] },
    step2_windowScan:{ scannedKeys:[], oiLikeWindowKeys:[], candidates:[] },
    step3_domScan:{ hasTable:false, tableHeaders:[], oiHeaderFound:false },
    hypothesis:{ needsSeparate:true, separateFound:false, next:'' },
    status:'unknown'
  };
  try{ out.meta.host=location.host; out.meta.href=location.href; out.meta.parTree=new URL(location.href).searchParams.get('ParTree'); }catch(e){}
  try{ out.meta.isTop=(window===window.top); }catch(e){}
  // STEP 1: same as v1 — confirm AllRows still has no OI
  try{
    var mw=window.mw, rows=mw && mw.AllRows, vals=[];
    if(rows && typeof rows==='object' && !Array.isArray(rows)) vals=Object.values(rows);
    else if(Array.isArray(rows)) vals=rows;
    function isOption(r){ var l18=String(r.l18||'').trim(), l30=String(r.l30||''); return (l18.charAt(0)==='ض'||l18.charAt(0)==='ط') && (l30.indexOf('اختيار')!==-1||l30.indexOf('اختیار')!==-1); }
    if(vals.length){
      var first=vals[0];
      out.step1_allRows.total=vals.length;
      out.step1_allRows.allKeys=Object.keys(first).sort();
      out.step1_allRows.oiLikeKeys=out.step1_allRows.allKeys.filter(function(k){ var low=k.toLowerCase(); return low.indexOf('oi')!==-1||low.indexOf('open')!==-1||low.indexOf('interest')!==-1||low==='avno'||low==='_av'; });
      out.step1_allRows.hasOI=out.step1_allRows.oiLikeKeys.length>0;
      var opts=vals.filter(isOption);
      out.step1_allRows.optionRows=opts.length;
      for(var i=0;i<Math.min(3,opts.length);i++){
        var r=opts[i];
        var oiVals={}; out.step1_allRows.oiLikeKeys.slice(0,3).forEach(function(k){ oiVals[k]=r[k]; });
        out.step1_allRows.sample.push({l18:r.l18, inscode:r.inscode, oiVals:oiVals, tvol:r.tvol});
      }
    }
  }catch(e){ out.step1_allRows.error=e.message; }
  // STEP 2: scan window for any object that might hold OI (read-only keys enumeration)
  try{
    var keys=Object.keys(window).slice(0,300);
    out.step2_windowScan.scannedKeys=keys;
    out.step2_windowScan.oiLikeWindowKeys=keys.filter(function(k){ var low=k.toLowerCase(); return low.indexOf('oi')!==-1||low.indexOf('openinterest')!==-1; });
    // also check window.mw sub-keys
    if(window.mw && typeof window.mw==='object'){
      var mwKeys=Object.keys(window.mw).slice(0,100);
      out.step2_windowScan.mwKeys=mwKeys;
      // peek at mw.InstHistory or similar if exists (without calling)
      ['InstHistory','OptionInfo','OptionOITable','OI','OpenInterest'].forEach(function(k){
        if(k in window.mw) out.step2_windowScan.candidates.push(k+': exists, typeof '+typeof window.mw[k]);
      });
    }
  }catch(e){ out.step2_windowScan.error=e.message; }
  // STEP 3: DOM scan for table header containing OI text (common in TSETMC detail pages)
  try{
    var headers=Array.from(document.querySelectorAll('th, .header, [class*=\"header\"]')).slice(0,50).map(function(el){ return (el.textContent||'').trim().slice(0,40); }).filter(Boolean);
    out.step3_domScan.tableHeaders=headers.slice(0,15);
    out.step3_domScan.hasTable=document.querySelector('table')!==null;
    var bodyText=(document.body.innerText||'').slice(0,5000);
    out.step3_domScan.bodyHasOI= bodyText.indexOf('OI')!==-1 || bodyText.indexOf('open interest')!==-1 || bodyText.indexOf('موقعیت باز')!==-1 || bodyText.indexOf('قرارداد باز')!==-1;
    out.step3_domScan.oiHeaderFound= headers.some(function(h){ var low=h.toLowerCase(); return low.indexOf('oi')!==-1||h.indexOf('موقعیت')!==-1||h.indexOf('باز')!==-1; });
  }catch(e){ out.step3_domScan.error=e.message; }
  out.hypothesis.separateFound = out.step2_windowScan.oiLikeWindowKeys.length>0 || out.step2_windowScan.candidates.length>0 || out.step3_domScan.oiHeaderFound || out.step3_domScan.bodyHasOI;
  out.hypothesis.needsSeparate = !out.step1_allRows.hasOI;
  out.hypothesis.next = out.step1_allRows.hasOI ? 'OI found in AllRows — check provenance' : (out.hypothesis.separateFound ? 'Possible separate OI hint found — need raw fixture from that source' : 'No OI hint on this page — try other ParTree/inst detail page as separate source');
  out.status = out.step1_allRows.hasOI ? 'candidate' : (out.hypothesis.separateFound ? 'hint-found' : 'needs-separate');
  console.log('%c[tseZharfaKavosh] G-09 OI v2 — send SUMMARY back (BOTH hosts)','font-weight:bold;color:#0a7;font-size:13px');
  console.log('Host',out.meta.host,' ParTree',out.meta.parTree,' total',out.step1_allRows.total);
  console.log('Step1 AllRows OI-like:',out.step1_allRows.oiLikeKeys, 'hasOI',out.step1_allRows.hasOI);
  console.log('Step2 window OI-like:',out.step2_windowScan.oiLikeWindowKeys, 'candidates',out.step2_windowScan.candidates);
  console.log('Step3 DOM hasTable',out.step3_domScan.hasTable,' oiHeader',out.step3_domScan.oiHeaderFound,' bodyHasOI',out.step3_domScan.bodyHasOI);
  console.log('Hypothesis:',out.hypothesis.next);
  console.log('%c=== COPY G09v2 SUMMARY BELOW ===','color:#a50;font-weight:bold');
  console.log(JSON.stringify(out,null,2));
  console.log('%c=== END G09v2 ===','color:#a50;font-weight:bold');
  return out;
})();
