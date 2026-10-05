/**
 * tseZharfaKavosh — mw.AllRows probe (read-only, no side-effects)
 * Evidence target: E-011 / Gate G-03
 * Contract: docs/ARCHITECTURE_CONTRACT_v6.0.md §9 + contracts/01-data-source/spec.md
 * Status: DESIGN — requires owner approval before live execution
 *
 * USAGE (after approval, in TSETMC MarketWatch page console):
 *   1. Open https://www.tsetmc.com/... with ParTree=15131F (or the exact page specified in approval)
 *   2. Open DevTools → Console (ensure you are in the top page realm, not an iframe)
 *   3. Paste the entire content of this file and press Enter
 *   4. The probe prints a JSON summary and offers a downloadable raw fixture (Blob)
 *   5. Save the fixture file as fixtures/raw/mwAllRows.<ISO8601>.json (immutable)
 *   6. DO NOT modify filters, DO NOT call SaveParams/FilterCode, DO NOT upload data
 *
 * GUARANTEES:
 *   - Read-only: only reads window.mw and window.mw.AllRows, never writes
 *   - No DOM mutation, no network, no storage, no timer, no credential use
 *   - Absence is recorded as evidence, not converted to a success claim
 *   - Raw fixture is immutable; hash is SHA-256 hex (SubtleCrypto if available, else fallback)
 *
 * SPDX-License-Identifier: Smart-FFA-1.1
 * Copyright: © ۱۴۰۵ — https://t.me/p75ad / https://t.me/SmartOptionTSE
 */
(function mwAllRowsProbe() {
  'use strict';

  // --- helpers: safe, side-effect-free ---
  const now = new Date();
  const nowIso = now.toISOString(); // UTC
  // Tehran time for contract (Asia/Tehran)
  let tehranIso = nowIso;
  try {
    tehranIso = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Tehran',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false
    }).format(now) + ' Asia/Tehran';
  } catch (_) {}

  function safeGet(obj, key) {
    try { return obj[key]; } catch (e) { return { __error: String(e) }; }
  }

  function typeOf(v) {
    if (v === null) return 'null';
    if (Array.isArray(v)) return 'array';
    return typeof v;
  }

  function sampleKeys(rows, sampleCount) {
    if (!Array.isArray(rows) || rows.length === 0) return { keys: [], sample: null, dups: 0 };
    const first = rows[0];
    const keys = first && typeof first === 'object' ? Object.keys(first).sort() : [];
    const sample = rows.slice(0, Math.min(sampleCount, rows.length)).map((r, i) => {
      if (r === null || typeof r !== 'object') return { __index: i, __type: typeOf(r), __value: String(r).slice(0, 500) };
      const out = { __index: i };
      keys.forEach(k => {
        const v = r[k];
        const t = typeOf(v);
        // do not fabricate: record raw type and truncated preview
        if (t === 'string') out[k] = { type: 'string', len: v.length, preview: v.slice(0, 200) };
        else if (t === 'number') out[k] = { type: 'number', value: v, isFinite: isFinite(v) };
        else if (t === 'boolean') out[k] = { type: 'boolean', value: v };
        else if (v === null) out[k] = { type: 'null' };
        else if (t === 'undefined') out[k] = { type: 'undefined' };
        else out[k] = { type: t, preview: String(v).slice(0, 200) };
      });
      return out;
    });
    return { keys, sample };
  }

  function detectIdField(rows, keys) {
    const candidates = ['inscode', 'InsCode', 'insCode', 'id', 'instrumentId', 'Isin', 'l18', 'l30', 'symbol'];
    for (const c of candidates) if (keys.includes(c)) return c;
    // heuristic: first field that looks unique
    return keys[0] || null;
  }

  function hashHexFallback(str) {
    // Simple deterministic fallback (NOT cryptographic) — native SHA-256 will be used if available
    let h = 0; for (let i = 0; i < str.length; i++) h = Math.imul(31, h) + str.charCodeAt(i) | 0;
    return 'fallback-' + (h >>> 0).toString(16).padStart(8, '0') + '-len-' + str.length;
  }

  async function sha256Hex(str) {
    try {
      if (typeof crypto !== 'undefined' && crypto.subtle && crypto.subtle.digest) {
        const enc = new TextEncoder().encode(str);
        const buf = await crypto.subtle.digest('SHA-256', enc);
        return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
      }
    } catch (_) {}
    return hashHexFallback(str);
  }

  // --- capture ---
  const result = {
    meta: {
      evidenceId: 'E-011',
      relatedGate: 'G-03',
      probeVersion: '0.1.0.0-probe-001',
      sourceId: 'mw.AllRows@TSETMC',
      claim: 'mw.AllRows exists as readable row collection in MarketWatch page realm',
      host: null,
      href: null,
      parTree: null,
      realm: 'window (top)',
      capturedAt: { utc: nowIso, tehran: tehranIso, epochMs: now.getTime() },
      method: 'manual console paste — read-only inspection of window.mw.AllRows (no DOM write, no network, no storage, no FilterCode/SaveParams call)',
      scope: null,
      schemaVersion: '0.1.0.0-mwAllRows-schema-001',
      provenance: 'platform-verified (if captured live) / otherwise unverified',
      userAgent: null,
      contractRef: 'ARCHITECTURE_CONTRACT_v6.0 §9 + contracts/01-data-source/spec.md §4-5'
    },
    existence: {
      hasWindowMw: false,
      mwType: null,
      hasAllRows: false,
      allRowsType: null,
      allRowsIsArray: false,
      allRowsLength: null
    },
    schema: {
      keys: [],
      keyCount: 0,
      idFieldCandidate: null,
      sample: null,
      fieldTypes: {},
      completeness: {
        totalRows: null,
        rowsWithIdField: null,
        nullOrMissingStats: {},
        duplicateIdCount: null
      }
    },
    freshness: {
      // mw.AllRows itself likely has no timestamp; these are probe-captured, not invented market timestamps
      observedAt: nowIso,
      generation: null,
      note: 'mw.AllRows does not expose a generation/timestamp per §9; freshness must be derived from snapshot/scheduler, not fabricated here'
    },
    refreshBehavior: {
      // to be filled by second capture after refresh — initial probe records only initial state
      initialCapture: nowIso,
      afterRefresh: null,
      note: 'Run probe again after page refresh/navigation and compare length/keys/sample to assess lifecycle. Do not automate.'
    },
    limitations: [],
    rawFixtureRef: null,
    fixtureHash: null,
    status: 'unknown' // to be set to candidate/confirmed/rejected after analysis
  };

  try { result.meta.host = typeof location !== 'undefined' ? location.host : null; } catch (_) {}
  try { result.meta.href = typeof location !== 'undefined' ? location.href : null; } catch (_) {}
  try {
    const url = typeof location !== 'undefined' ? new URL(location.href) : null;
    result.meta.parTree = url ? url.searchParams.get('ParTree') : null;
  } catch (_) {}
  try { result.meta.userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : null; } catch (_) {}

  // --- inspect window.mw ---
  let mw, allRows;
  try {
    mw = typeof window !== 'undefined' ? window.mw : undefined;
    result.existence.hasWindowMw = typeof mw !== 'undefined' && mw !== null;
    result.existence.mwType = typeOf(mw);
  } catch (e) {
    result.limitations.push('window.mw access threw: ' + String(e));
  }

  if (result.existence.hasWindowMw) {
    try {
      allRows = safeGet(mw, 'AllRows');
      result.existence.hasAllRows = typeof allRows !== 'undefined' && allRows !== null;
      result.existence.allRowsType = typeOf(allRows);
      result.existence.allRowsIsArray = Array.isArray(allRows);
      if (Array.isArray(allRows)) result.existence.allRowsLength = allRows.length;
      else if (allRows && typeof allRows === 'object' && typeof allRows.length === 'number') result.existence.allRowsLength = allRows.length;
    } catch (e) {
      result.limitations.push('mw.AllRows access threw: ' + String(e));
    }
  }

  // --- schema extraction if array ---
  if (Array.isArray(allRows) && allRows.length >= 0) {
    const { keys, sample } = sampleKeys(allRows, 3);
    result.schema.keys = keys;
    result.schema.keyCount = keys.length;
    result.schema.sample = sample;
    result.schema.idFieldCandidate = detectIdField(allRows, keys);
    result.meta.scope = `AllRows array length=${allRows.length} — scope definition pending (is this the full MarketWatch snapshot universe or a filtered view?)`;

    // field type stats
    const stats = {};
    keys.forEach(k => stats[k] = { string: 0, number: 0, boolean: 0, null: 0, undefined: 0, other: 0, missing: 0 });
    let rowsWithId = 0;
    const idField = result.schema.idFieldCandidate;
    const seenIds = new Set();
    let dupCount = 0;
    for (let i = 0; i < allRows.length; i++) {
      const r = allRows[i];
      if (r === null || typeof r !== 'object') {
        result.limitations.push(`row[${i}] is not an object but ${typeOf(r)}`);
        continue;
      }
      keys.forEach(k => {
        if (!(k in r)) stats[k].missing++;
        else {
          const t = typeOf(r[k]);
          if (t === 'string') stats[k].string++;
          else if (t === 'number') stats[k].number++;
          else if (t === 'boolean') stats[k].boolean++;
          else if (r[k] === null) stats[k].null++;
          else if (t === 'undefined') stats[k].undefined++;
          else stats[k].other++;
        }
      });
      if (idField && r[idField] !== undefined && r[idField] !== null && r[idField] !== '') {
        rowsWithId++;
        const idStr = String(r[idField]);
        if (seenIds.has(idStr)) dupCount++;
        else seenIds.add(idStr);
      }
    }
    result.schema.fieldTypes = stats;
    result.schema.completeness.totalRows = allRows.length;
    result.schema.completeness.rowsWithIdField = rowsWithId;
    result.schema.completeness.nullOrMissingStats = stats;
    result.schema.completeness.duplicateIdCount = dupCount;

    if (allRows.length === 0) result.limitations.push('AllRows is empty — may be pre-load, error, or genuinely no rows; compare after page fully loads');
    if (keys.length === 0) result.limitations.push('No keys extracted — first row may be non-object or empty');
    if (dupCount > 0) result.limitations.push(`Duplicate idField values detected: ${dupCount} duplicates for candidate id="${idField}"`);
    result.status = allRows.length > 0 && keys.length > 0 ? 'candidate' : 'unknown';
  } else if (result.existence.hasAllRows) {
    result.meta.scope = `AllRows exists but is not a plain array (type=${result.existence.allRowsType}) — object/map-like collection?`;
    result.status = 'unknown';
    result.limitations.push('AllRows is not an array; further inspection of its structure required (keys, iteration protocol)');
    try {
      if (allRows && typeof allRows === 'object') {
        const k = Object.keys(allRows).slice(0, 50);
        result.schema.keys = k;
        result.limitations.push('AllRows object keys (first 50): ' + k.join(', '));
      }
    } catch (_) {}
  } else {
    result.limitations.push('mw.AllRows not present — may be absent on this host/realm/ParTree, loaded lazily, or renamed. This is evidence, not proof of global absence.');
    result.status = 'unknown';
  }

  // general limitations template
  result.limitations.push('This probe does NOT prove universe completeness (U_snapshot vs full market) — see contract §10');
  result.limitations.push('Option-chain, multiplier, OI, calendar, IV, Greeks are NOT derivable from AllRows alone — separate source gates required');
  result.limitations.push('Missing values are recorded as unknown/missing, never fabricated to defaults');

  // --- raw fixture construction (immutable) ---
  const rawFixture = {
    _fixtureMeta: {
      evidenceId: 'E-011',
      probeVersion: result.meta.probeVersion,
      capturedAt: result.meta.capturedAt,
      host: result.meta.host,
      href: result.meta.href,
      parTree: result.meta.parTree,
      userAgent: result.meta.userAgent,
      method: result.meta.method,
      schemaVersion: result.meta.schemaVersion
    },
    // Keep raw AllRows truncated to avoid huge clipboard: first 5 rows full, then length only
    // Full preservation: if AllRows is small (<1000 rows) keep all; else user should save via Blob
    _note: 'For full preservation, use the Blob download below — clipboard copy is truncated for safety',
    allRowsLength: Array.isArray(allRows) ? allRows.length : null,
    allRowsSampleRaw: Array.isArray(allRows) ? allRows.slice(0, 5) : (allRows || null),
    summary: result
  };

  // For hash reproducibility: canonical JSON (sorted keys) of the truncated fixture header only
  // The Blob for full raw will be hashed separately if user downloads
  const canonicalForHash = JSON.stringify(rawFixture, Object.keys(rawFixture).sort());

  // --- output ---
  (async () => {
    const fixtureHash = await sha256Hex(canonicalForHash);
    result.fixtureHash = fixtureHash;
    rawFixture._fixtureMeta.fixtureHashPreview = fixtureHash;
    rawFixture._fixtureMeta.fixtureHashNote = 'Preview hash of truncated fixture header; full AllRows SHA-256 should be computed on the downloaded Blob file via: shasum -a 256 fixtures/raw/mwAllRows.<timestamp>.json';

    // Human-readable console output
    console.log('%c[tseZharfaKavosh] mw.AllRows probe — E-011 / G-03', 'font-weight:bold; color:#0a7; font-size:14px');
    console.log('Meta:', result.meta);
    console.log('Existence:', result.existence);
    console.log('Schema:', result.schema);
    console.log('Freshness:', result.freshness);
    console.log('Limitations:', result.limitations);
    console.log('Status:', result.status, ' — raw length:', result.existence.allRowsLength);
    console.log('Fixture hash (preview, truncated):', fixtureHash);
    console.table(result.schema.fieldTypes || {});

    // Prepare downloadable raw fixture if AllRows exists
    try {
      if (typeof Blob !== 'undefined' && typeof URL !== 'undefined' && Array.isArray(allRows)) {
        const fullRaw = {
          _fixtureMeta: rawFixture._fixtureMeta,
          allRows: allRows // full preservation — may be large, user confirms
        };
        const blob = new Blob([JSON.stringify(fullRaw, null, 2)], { type: 'application/json; charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const ts = nowIso.replace(/[:.]/g, '-');
        const filename = `mwAllRows.${ts}.json`;
        console.log('%c↓ Raw fixture ready for download', 'color:#07a; font-weight:bold');
        console.log('Filename suggestion:', filename, ' — size ~', (blob.size / 1024).toFixed(1), 'KB');
        console.log('Download via: click the link below or run: copy(summaryJSON)');
        // Create a temporary link element if document is available
        if (typeof document !== 'undefined' && document.body) {
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          a.textContent = '⬇ Download mwAllRows raw fixture (' + filename + ')';
          a.style.cssText = 'display:inline-block; padding:8px 12px; background:#0a7; color:#fff; border-radius:6px; text-decoration:none; font-family:sans-serif; margin:8px 0';
          // Do not auto-insert if not in a visible page; just log
          console.log(a);
          console.log('To trigger download programmatically (paste in console):');
          console.log(`var a=document.createElement('a'); a.href="${url}"; a.download="${filename}"; document.body.appendChild(a); a.click(); setTimeout(()=>URL.revokeObjectURL("${url}"), 60000);`);
        } else {
          console.log('Blob URL (copy and open in browser):', url);
        }
      } else {
        console.log('Raw fixture (truncated, for copy):', JSON.stringify(rawFixture, null, 2).slice(0, 8000) + (JSON.stringify(rawFixture).length > 8000 ? '\n...[truncated]' : ''));
      }
    } catch (e) {
      console.warn('Blob download preparation failed:', e);
      console.log('Raw fixture (truncated):', JSON.stringify(rawFixture, null, 2).slice(0, 8000));
    }

    // Copy-friendly summary for pasting into evidence ledger
    console.log('%cEvidence summary (copy for ledger)', 'color:#a50; font-weight:bold');
    console.log(JSON.stringify(result, null, 2));

    // Return value for programmatic capture
    return result;
  })();

  // Synchronous return for immediate inspection (hash will be filled async)
  return result;
})();
