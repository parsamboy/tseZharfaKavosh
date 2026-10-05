/**
 * tseZharfaKavosh — G-08 LIMITED TEST v1 — calendar source / expiry and stale policy
 * Read-only, like G-03..G-07: paste in Console on old.tsetmc.com/Loader.aspx?ParTree=15131F
 * Goal: check expiry dates from optionRows (via parser) — are they future? How many expiries? Is stale handling needed?
 * No network, only reads window.mw.AllRows
 * SPDX: Smart-FFA-1.1
 */
(function g08_calendar(){
  'use strict';
  var now=new Date(), iso=now.toISOString(), teh=iso;
  try{ teh=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tehran',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(now)+' Asia/Tehran'; }catch(e){}
  var out={
    meta:{ test:'G08-CALENDAR-v1', gate:'G-08', evidenceId:'E-016-draft', capturedAt:{utc:iso,tehran:teh,epochMs:now.getTime()}, host:null, href:null, parTree:null, isTop:null },
    calendar:{ totalOptionRows:0, uniqueExpiries:[], expiryCounts:{}, underlyingCounts:{}, sampleByExpiry:{}, staleCheck:{ past:0, future:0, today:0, note:'Jalali dates 1405/.. vs Gregorian now' } },
    expirySamples:[],
    limitations:[],
    status:'unknown'
  };
  try{ out.meta.host=location.host; out.meta.href=location.href; out.meta.parTree=new URL(location.href).searchParams.get('ParTree'); }catch(e){}
  try{ out.meta.isTop=(window===window.top); }catch(e){}
  var mw, rows, vals=[];
  try{ mw=window.mw; rows=mw.AllRows; }catch(e){ out.limitations.push('read error '+e.message); }
  if(rows && typeof rows==='object' && !Array.isArray(rows)){ vals=Object.values(rows); }
  else if(Array.isArray(rows)) vals=rows;

  function parseExpiry(l30){
    var parts=l30.split('-');
    if(parts.length<3) return null;
    var last=parts[parts.length-1].trim();
    var m=last.match(/^(\d{4}\/\d{2}\/\d{2}|\d{8}|\d{2}\/\d{2}\/\d{2})$/);
    if(!m) return null;
    var raw=m[1];
    if(/^\d{8}$/.test(raw)) return raw.slice(0,4)+'/'+raw.slice(4,6)+'/'+raw.slice(6,8);
    if(/^\d{2}\/\d{2}\/\d{2}$/.test(raw)) return '14'+raw; // 05/09/04 -> 1405/09/04
    return raw;
  }
  function isOption(r){
    var l18=String(r.l18||'').trim(), l30=String(r.l30||'');
    var f=l18.charAt(0);
    return (f==='ض'||f==='ط') && (l30.indexOf('اختيار')!==-1 || l30.indexOf('اختیار')!==-1);
  }

  var expiries={}, undCounts={}, byExpiry={};
  var past=0, future=0;
  // Jalali today approx 1405/07/13? But we have 2026-10-05 Gregorian -> Jalali 1404/07/13? Actually now is 1404, expiries 1405 are future
  // Simple: compare as string, 1405 > 1404 => future
  var todayJalali='1404/07/13'; // approx for 2026-10-05

  var samples=[];
  vals.forEach(function(r){
    if(!isOption(r)) return;
    var exp=parseExpiry(String(r.l30||''));
    if(!exp) return;
    out.calendar.totalOptionRows++;
    expiries[exp]=(expiries[exp]||0)+1;
    var l30=String(r.l30||'');
    var m=l30.match(/اختیار[خف]\s+([^\-]+)/) || l30.match(/اختيار[خف]\s+([^\-]+)/);
    var und=m?m[1].trim().split(/\s+/)[0]:'unknown';
    undCounts[und]=(undCounts[und]||0)+1;
    if(!byExpiry[exp]) byExpiry[exp]=[];
    if(byExpiry[exp].length<3) byExpiry[exp].push({l18:r.l18, l30:r.l30, inscode:r.inscode});
    if(exp < todayJalali) past++; else if(exp===todayJalali) {} else future++;
  });

  out.calendar.uniqueExpiries=Object.keys(expiries).sort();
  out.calendar.expiryCounts=expiries;
  out.calendar.underlyingCounts=undCounts;
  out.calendar.sampleByExpiry=byExpiry;
  out.calendar.staleCheck.past=past;
  out.calendar.staleCheck.future=future;
  out.calendar.staleCheck.today=todayJalali;

  // Take 10 expiry samples
  out.expirySamples=Object.keys(expiries).slice(0,10).map(function(e){return {expiry:e, count:expiries[e], sample:byExpiry[e][0]};});

  out.status = Object.keys(expiries).length>0 ? 'candidate' : 'not-found';
  out.limitations.push('Expiry parsed from l30 — needs Jalali calendar validation vs Gregorian; 05/09/04 handled as 1405/09/04');
  out.limitations.push('Stale policy: past expiries should be marked stale/unknown, not eligible for GEX/IV');

  console.log('%c[tseZharfaKavosh] G-08 CALENDAR v1 — send SUMMARY back','font-weight:bold;color:#0a7;font-size:13px');
  console.log('Host',out.meta.host,' optionRows',out.calendar.totalOptionRows,' uniqueExpiries',out.calendar.uniqueExpiries.length);
  console.log('Expiries:',out.calendar.uniqueExpiries);
  console.log('Counts:',out.calendar.expiryCounts);
  console.log('Stale past/future:',past,'/',future,' todayJalali',todayJalali);
  console.table(out.expirySamples);
  console.log('%c=== COPY G08 SUMMARY BELOW AND SEND BACK ===','color:#a50;font-weight:bold');
  console.log(JSON.stringify(out,null,2));
  console.log('%c=== END G08 COPY BLOCK ===','color:#a50;font-weight:bold');
  return out;
})();
