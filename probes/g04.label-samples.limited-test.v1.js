/**
 * tseZharfaKavosh — G-04 LIMITED TEST v1 — label samples for option/parser
 * Like previous LIMITED-TEST v2: read-only, copy-paste in TSETMC Console
 * Goal: extract raw l18/l30 samples to choose best grammar for option detection
 * No network/storage/timer/FilterCode — only reads window.mw.AllRows object-map
 *
 * HOW TO RUN (same as before, 90 sec):
 *  1) Same page: https://old.tsetmc.com/Loader.aspx?ParTree=15131F# (after F5 is fine)
 *  2) F12 -> Console -> ensure window===window.top is true
 *  3) Copy ENTIRE file -> paste -> Enter
 *  4) Copy SUMMARY JSON between markers and send back
 *
 * SPDX: Smart-FFA-1.1
 */
(function g04_labelSamples(){
  'use strict';
  var now=new Date(), iso=now.toISOString(), teh=iso;
  try{ teh=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tehran',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(now)+' Asia/Tehran'; }catch(e){}
  var out={
    meta:{ test:'G04-LABEL-SAMPLES-v1', gate:'G-04', evidenceId:'E-012-draft', capturedAt:{utc:iso,tehran:teh,epochMs:now.getTime()}, host:null, href:null, parTree:null, isTop:null },
    counts:{ total:0, with_l18:0, with_l30:0, optionLike:0, stockLike:0 },
    // Heuristic for optionLike: l18 starts with 'ض' or contains 'اختيار' or l30 contains pattern with '-' and number
    heuristic: "optionLike = l18.trim().startsWith('ض') || l18.includes('اختيار') || /\\d{3,}/.test(l18) && l18.includes('-')",
    samples:{ optionLike: [], stockLike: [], numericRuns: [] },
    numericRunStats:{ oneRun:0, twoRuns:0, threePlus:0 },
    relationHints:{ cfieldSamples:[], iidSamples:[], csSamples:[] },
    limitations:[],
    status:'unknown'
  };
  try{ out.meta.host=location.host; out.meta.href=location.href; out.meta.parTree=new URL(location.href).searchParams.get('ParTree'); }catch(e){}
  try{ out.meta.isTop=(window===window.top); }catch(e){ out.meta.isTop='err:'+e.message; }
  var mw, rows, vals=[];
  try{ mw=window.mw; rows=mw.AllRows; }catch(e){ out.limitations.push('read error: '+e.message); }
  if(rows && typeof rows==='object' && !Array.isArray(rows)){
    vals=Object.values(rows);
    out.counts.total=vals.length;
  } else if(Array.isArray(rows)){ vals=rows; out.counts.total=vals.length; }
  else { out.limitations.push('AllRows not object/array — type '+(rows===null?'null':typeof rows)); }

  var opt=[], stock=[], nums=[];
  var cfieldSet=new Set(), iidSet=new Set(), csSet=new Set();
  for(var i=0;i<vals.length;i++){
    var r=vals[i];
    if(!r || typeof r!=='object') continue;
    var l18 = (r.l18||'').toString();
    var l30 = (r.l30||'').toString();
    if(l18) out.counts.with_l18++;
    if(l30) out.counts.with_l30++;
    var isOpt = false;
    // heuristic: starts with ض or contains اختیار
    if(l18 && (l18.trim().charAt(0)==='ض' || l18.indexOf('اختيار')!==-1 || l18.indexOf('اختیار')!==-1)) isOpt=true;
    else if(l18 && l18.indexOf('-')!==-1){
      var m=l18.match(/\d+/g);
      if(m && m.length>=2) isOpt=true; // two numeric runs suggests strike+expiry
    }
    // collect relation hints
    if(r.cfield0!==undefined) { var cf=String(r.cfield0).slice(0,60); if(cfieldSet.size<10) cfieldSet.add(cf); }
    if(r.iid!==undefined && iidSet.size<5) iidSet.add(String(r.iid));
    if(r.cs!==undefined && csSet.size<5) csSet.add(String(r.cs));
    // numeric runs in l18
    if(l18){
      var runs=l18.match(/\d+/g);
      var n=runs?runs.length:0;
      if(n===1) out.numericRunStats.oneRun++;
      else if(n===2) out.numericRunStats.twoRuns++;
      else if(n>=3) out.numericRunStats.threePlus++;
      if(n>=2 && nums.length<5) nums.push({l18:l18, l30:l30, runs:runs});
    }
    if(isOpt){
      out.counts.optionLike++;
      if(opt.length<20) opt.push({l18:l18, l30:l30, inscode:r.inscode||'', iid:r.iid||''});
    } else {
      out.counts.stockLike++;
      if(stock.length<10) stock.push({l18:l18, l30:l30, inscode:r.inscode||''});
    }
  }
  out.samples.optionLike=opt;
  out.samples.stockLike=stock;
  out.samples.numericRuns=nums;
  out.relationHints.cfieldSamples=Array.from(cfieldSet);
  out.relationHints.iidSamples=Array.from(iidSet);
  out.relationHints.csSamples=Array.from(csSet);
  out.status = out.counts.optionLike>0 ? 'has-option-like' : 'no-option-like-found';
  out.limitations.push('Heuristic only — not final parser. Need your JSON to choose grammar.');
  out.limitations.push('cfield/iid/cs samples are hints for underlying relation — may need deeper check');
  console.log('%c[tseZharfaKavosh] G-04 LABEL SAMPLES v1 — send SUMMARY back','font-weight:bold;color:#0a7;font-size:13px');
  console.log('Host',out.meta.host,' ParTree',out.meta.parTree,' total',out.counts.total,' optionLike',out.counts.optionLike,' stockLike',out.counts.stockLike);
  console.log('NumericRuns',out.numericRunStats);
  console.log('OptionLike samples (20):'); console.table(opt);
  console.log('StockLike samples (10):'); console.table(stock);
  console.log('NumericRuns samples (two+ runs):',nums);
  console.log('Relation hints cfield:',out.relationHints.cfieldSamples);
  console.log('%c=== COPY G04 SUMMARY BELOW AND SEND BACK ===','color:#a50;font-weight:bold');
  console.log(JSON.stringify(out,null,2));
  console.log('%c=== END G04 COPY BLOCK ===','color:#a50;font-weight:bold');
  return out;
})();
