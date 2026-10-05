/**
 * tseZharfaKavosh — Snapshot Canonical v0.1.0 — G-05
 * Based on live G-05 snapshot 2026-10-05 11:01 Tehran (old.tsetmc.com, 3363 entries)
 * Best choices after testing:
 *  - serialization: sorted inscode asc + sorted field keys
 *  - timezone: Asia/Tehran for capturedAt, raw pc/pl etc are market strings
 *  - rounding: preserve raw string, computation parses via Number; pcc is number already, pc is string — canonical parse handles both
 *  - missing: explicit null/undefined, not 0 — predtran 26/30, buyop 19/30, level 2-5 queues 4/30
 * SPDX: Smart-FFA-1.1
 */

/**
 * Create canonical snapshot from raw AllRows object-map
 * @param {object} allRows - window.mw.AllRows object-map
 * @param {object} opts - {capturedAt: Date}
 * @returns {{id: string, capturedAt: string, total: number, rows: Array, hashPreview: string}}
 */
function createCanonicalSnapshot(allRows, opts) {
  opts = opts || {};
  var now = opts.capturedAt || new Date();
  var iso = now.toISOString();
  var tehran = iso;
  try { tehran = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tehran',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(now)+' Asia/Tehran'; } catch(e){}
  var keys = Object.keys(allRows).sort(); // canonical inscode order
  var rows = keys.map(function(k){
    var r = allRows[k];
    var sorted = {};
    Object.keys(r).sort().forEach(function(f){ sorted[f] = r[f]; });
    // Add canonical id field for trace
    sorted._canonicalInscode = k;
    return sorted;
  });
  var id = 'snapshot-'+iso.slice(0,19).replace(/[:T]/g,'-')+'-Tehran-'+keys.length;
  // hash preview (fallback)
  var canonStr = JSON.stringify({id:id, keys:keys.slice(0,5), first:rows[0]});
  var h=0; for(var i=0;i<canonStr.length;i++) h=Math.imul(31,h)+canonStr.charCodeAt(i)|0;
  var hash='fallback-'+(h>>>0).toString(16).padStart(8,'0');
  return { id:id, capturedAt:{utc:iso, tehran:tehran}, total:keys.length, rows:rows, hashPreview:hash, version:'0.1.0-snapshot-001' };
}

/**
 * Missing policy helper — returns true if field is missing/empty
 */
function isMissing(v){ return v===undefined || v===null || v==='' ; }

/**
 * Parse numeric field canonically — handles string "14786" and number -1551
 * Returns number or null if missing
 */
function parseCanonicalNumber(v){
  if(isMissing(v)) return null;
  if(typeof v==='number') return Number.isFinite(v)? v : null;
  // string like "14786" or "-9.49" or "1,234"
  var s=String(v).replace(/,/g,'').trim();
  if(s==='') return null;
  var n=Number(s);
  return Number.isFinite(n)? n : null;
}

if(typeof module!=='undefined' && module.exports) module.exports={createCanonicalSnapshot, parseCanonicalNumber, isMissing, version:'0.1.0'};
if(typeof window!=='undefined') window.tseZharfaKavosh_snapshot={createCanonicalSnapshot, parseCanonicalNumber, isMissing};
