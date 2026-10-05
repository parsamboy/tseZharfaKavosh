/**
 * tseZharfaKavosh — LIMITED TEST for mw.AllRows — v1
 * Purpose: safe, read-only, copy-paste test for TSETMC main site
 * Evidence target: E-011 / Gate G-03 — FINAL for this section after you send back results
 *
 * READ-ONLY GUARANTEES (audit before running):
 *  - Only reads window.mw and window.mw.AllRows — never writes
 *  - No SaveParams / FilterCode / Settings.Filters / localStorage / fetch / XHR / WebSocket / timer
 *  - No DOM write, no network, no credential, no upload
 *  - Missing stays missing — no fabricated defaults
 *
 * HOW TO RUN (2 minutes):
 *  1) Open TSETMC MarketWatch page: https://www.tsetmc.com/tsev2/data/MarketWatchPlus.aspx?ParTree=15131F
 *     Wait until page fully loads (loading spinners finish)
 *  2) Press F12 → Console tab → make sure you are in "top" (not iframe): type  window===window.top  → should be true
 *  3) Copy ENTIRE file content (Ctrl+A, Ctrl+C) → paste into Console → press Enter
 *  4) Console will print: SUMMARY (copy this), SAMPLE (first row keys), and RAW PREVIEW (first 2 rows)
 *  5) Copy the SUMMARY JSON block (from { to }) and send it here — no other action needed
 *
 * SPDX-License-Identifier: Smart-FFA-1.1 — © ۱۴۰۵ https://t.me/p75ad
 */
(function limitedTest_mwAllRows(){
  'use strict';
  var now = new Date();
  var isoUTC = now.toISOString();
  var tehran = isoUTC;
  try {
    tehran = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Tehran',
      year:'numeric', month:'2-digit', day:'2-digit',
      hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false
    }).format(now) + ' Asia/Tehran';
  } catch(e) {}

  var out = {
    meta: {
      test: 'LIMITED-TEST-v1',
      evidenceId: 'E-011-draft',
      capturedAt: { utc: isoUTC, tehran: tehran, epochMs: now.getTime() },
      host: null, href: null, parTree: null, isTop: null, userAgent: null
    },
    existence: { hasWindowMw: false, mwType: null, hasAllRows: false, allRowsType: null, isArray: false, length: null },
    schema: { keys: [], keyCount: 0, idCandidate: null, rowType: null },
    samplePreview: null,
    rawPreview: null,
    limitations: [],
    status: 'unknown',
    instructions: 'Copy this entire SUMMARY JSON and send back to agent. Do NOT edit filters or call any other function.'
  };

  try { out.meta.host = location.host; out.meta.href = location.href; out.meta.parTree = new URL(location.href).searchParams.get('ParTree'); } catch(e) {}
  try { out.meta.isTop = (window === window.top); } catch(e) { out.meta.isTop = 'error:'+e.message; }
  try { out.meta.userAgent = navigator.userAgent; } catch(e) {}

  var mw, rows;
  try {
    mw = window.mw;
    out.existence.hasWindowMw = (typeof mw !== 'undefined' && mw !== null);
    out.existence.mwType = (mw===null?'null': (Array.isArray(mw)?'array':typeof mw));
  } catch(e) { out.limitations.push('window.mw read error: '+e.message); }

  if (out.existence.hasWindowMw) {
    try {
      rows = mw.AllRows;
      out.existence.hasAllRows = (typeof rows !== 'undefined' && rows !== null);
      out.existence.allRowsType = (rows===null?'null': (Array.isArray(rows)?'array':typeof rows));
      out.existence.isArray = Array.isArray(rows);
      if (rows && typeof rows.length==='number') out.existence.length = rows.length;
    } catch(e) { out.limitations.push('mw.AllRows read error: '+e.message); }
  }

  if (Array.isArray(rows)) {
    out.status = rows.length>0 ? 'candidate' : 'empty-array';
    if (rows.length>0) {
      var first = rows[0];
      out.schema.rowType = (first===null?'null':typeof first);
      if (first && typeof first==='object') {
        var keys = Object.keys(first).sort();
        out.schema.keys = keys;
        out.schema.keyCount = keys.length;
        // id candidate heuristic
        var cands = ['inscode','InsCode','insCode','instrumentId','id','l18','l30'];
        for (var i=0;i<cands.length;i++) if (keys.indexOf(cands[i])!==-1) { out.schema.idCandidate = cands[i]; break; }
        if (!out.schema.idCandidate && keys.length) out.schema.idCandidate = keys[0];
        // preview first row with truncation
        var preview = {};
        keys.slice(0,30).forEach(function(k){ var v=first[k]; var t=(v===null?'null':typeof v); if(t==='string') preview[k]={type:'string', len:v.length, preview:v.slice(0,120)}; else if(t==='number') preview[k]={type:'number', value:v}; else if(t==='boolean') preview[k]={type:'boolean', value:v}; else preview[k]={type:t, preview:String(v).slice(0,120)}; });
        out.samplePreview = preview;
        // raw preview: first 2 rows stringified truncated to 3000 chars
        try { out.rawPreview = JSON.stringify(rows.slice(0,2), null, 2).slice(0,3000); } catch(e) { out.rawPreview='stringify error: '+e.message; }
        // quick stats: how many rows have idCandidate
        if (out.schema.idCandidate) {
          var cnt=0, dupCheck={}; var dups=0;
          for(var r=0;r<rows.length;r++){ var val=rows[r][out.schema.idCandidate]; if(val!==undefined && val!==null && val!==''){ cnt++; var s=String(val); if(dupCheck[s]) dups++; else dupCheck[s]=1; } }
          out.schema.rowsWithId = cnt;
          out.schema.duplicateIds = dups;
        }
      } else {
        out.limitations.push('First row is not object — type: '+out.schema.rowType);
      }
    } else {
      out.limitations.push('AllRows array is empty — may be before load completes; try again after 10 seconds');
    }
  } else if (out.existence.hasAllRows) {
    out.status = 'non-array';
    out.limitations.push('AllRows exists but is not array — type: '+out.existence.allRowsType);
    try { if(rows && typeof rows==='object') out.schema.keys = Object.keys(rows).slice(0,30); } catch(e){}
  } else {
    out.status = 'not-found';
    out.limitations.push('mw.AllRows not found on this host/realm/ParTree — this IS evidence (absence), not failure');
  }

  out.limitations.push('No universe completeness claimed — AllRows may be filtered view');
  out.limitations.push('Option-chain/multiplier/OI not derivable from AllRows alone');
  out.limitations.push('Missing stays missing — no defaults fabricated');

  // --- pretty console output ---
  console.log('%c[tseZharfaKavosh] LIMITED TEST v1 — mw.AllRows — send SUMMARY back', 'font-weight:bold;color:#0a7;font-size:13px');
  console.log('Host:', out.meta.host, ' ParTree:', out.meta.parTree, ' isTop:', out.meta.isTop);
  console.log('Existence:', out.existence);
  console.log('Schema:', out.schema);
  if (out.samplePreview) { console.log('SamplePreview (first row):'); console.table(out.samplePreview); }
  console.log('Status:', out.status, ' Length:', out.existence.length);
  if (out.limitations.length) console.log('Limitations:', out.limitations);
  console.log('%c=== COPY EVERYTHING BELOW THIS LINE AND SEND BACK ===', 'color:#a50;font-weight:bold');
  console.log(JSON.stringify(out, null, 2));
  console.log('%c=== END OF COPY BLOCK ===', 'color:#a50;font-weight:bold');
  console.log('If length is 0 or not-found, wait 10s and paste again — then send both results.');
  return out;
})();
