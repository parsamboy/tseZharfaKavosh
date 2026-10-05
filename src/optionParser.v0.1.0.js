/**
 * tseZharfaKavosh — Option Parser v0.1.0 — G-04
 * Versioned, pure, no network/DOM/storage — read-only row -> parsed result
 * Based on live G-04 label samples 2026-10-05 10:58 Asia/Tehran
 *   total 3362, optionLike (heuristic ض) 800, stockLike 2562 (includes ط puts)
 *   Real finding: BOTH ض (call) and ط (put) are options, distinction via l30 اختیارخ/اختیارف
 *   l18 alone: ضهرم7050 (one run), l30: اختیارخ اهرم-20000-1405/07/29 (strike+expiry)
 * Grammar chosen as BEST after live test: use l18 prefix + l30 pattern
 *
 * SPDX-License-Identifier: Smart-FFA-1.1
 * © ۱۴۰۵ https://t.me/p75ad
 */

/**
 * @param {object} row - raw row from mw.AllRows (has l18, l30, inscode, iid)
 * @returns {{status: 'confirmed'|'candidate'|'unknown'|'rejected', kind?: 'call'|'put', underlying?: string, strike?: number, expiry?: string, raw: object, reason?: string}}
 */
function parseOptionLabel(row) {
  if (!row || typeof row !== 'object') return { status: 'unknown', reason: 'row not object', raw: row };
  const l18 = String(row.l18 || '').trim();
  const l30 = String(row.l30 || '').trim();
  const inscode = String(row.inscode || row.InsCode || '');
  if (!l18 || !l30) return { status: 'unknown', reason: 'missing l18/l30', raw: { l18, l30 } };

  const first = l18.charAt(0);
  const isCallPrefix = first === 'ض';
  const isPutPrefix  = first === 'ط';
  if (!isCallPrefix && !isPutPrefix) {
    // Not an option by Tehran convention — but could be stock with numeric runs (زعف0510)
    // Strict: must be ض or ط to be confirmed
    return { status: 'rejected', reason: 'l18 does not start with ض/ط', raw: { l18, l30 } };
  }

  // l30 must contain اختیار (with خ for call, ف for put)
  // Samples: "اختيارخ اهرم-20000-1405/07/29", "اختيارف بساما-9000-14050726"
  // Note: Arabic ي vs Persian ی — normalize both ک and ي
  const l30norm = l30.replace(/ي/g, 'ی').replace(/ك/g, 'ک');
  // Match اختیارخ or اختیارف (or اختيارخ/ف) at start
  const hasEkhtiar = l30norm.indexOf('اختیار') !== -1 || l30.indexOf('اختيار') !== -1;
  if (!hasEkhtiar) {
    return { status: 'unknown', reason: 'l30 missing اختیار', raw: { l18, l30 } };
  }

  // Determine kind: prefer l30 marker, fallback to prefix
  let kind = null;
  if (l30norm.indexOf('اختیارخ') !== -1 || l30.indexOf('اختيارخ') !== -1) kind = 'call';
  else if (l30norm.indexOf('اختیارف') !== -1 || l30.indexOf('اختيارف') !== -1) kind = 'put';
  else kind = isCallPrefix ? 'call' : 'put';

  // Extract expiry and strike from l30 — two patterns observed:
  // Pattern A: "...-20000-1405/07/29"  (with slashes, strike and date separated by -)
  // Pattern B: "...-9000-14050726"    (without slashes, date compact)
  // General: last '-' segment is date, previous '-' segment before it is strike
  let strike = null;
  let expiry = null;
  let underlying = null;

  // Try to split l30 by '-' and look for date at end
  // l30 examples: "اختيارخ اهرم-20000-1405/07/29" -> parts ["اختيارخ اهرم","20000","1405/07/29"]
  //                "اختيارف بساما-9000-14050726" -> ["اختيارف بساما","9000","14050726"]
  const dashParts = l30.split('-');
  if (dashParts.length >= 2) {
    const last = dashParts[dashParts.length - 1].trim();
    // last should be date: 1405/07/29 or 14050729 or 14050726
    const dateMatch = last.match(/^(\d{4}\/\d{2}\/\d{2}|\d{8})$/);
    if (dateMatch) {
      expiry = dateMatch[1];
      // Normalize compact date 14050729 -> 1405/07/29
      if (/^\d{8}$/.test(expiry)) expiry = expiry.slice(0,4)+'/'+expiry.slice(4,6)+'/'+expiry.slice(6,8);
      const strikeStr = dashParts[dashParts.length - 2].trim();
      // strike may contain commas or spaces — clean
      const m = strikeStr.match(/(\d[\d,]*)/);
      if (m) strike = parseInt(m[1].replace(/,/g,''),10);
      // underlying: first part after اختیارخ/ف
      const before = dashParts.slice(0, dashParts.length - 2).join('-');
      // Extract underlying name: after اختیارخ/ف and space
      const undMatch = before.match(/اختیار[خف]\s+(.+)/) || before.match(/اختيار[خف]\s+(.+)/);
      if (undMatch) underlying = undMatch[1].trim();
      else {
        // fallback: take last token
        const tokens = before.trim().split(/\s+/);
        underlying = tokens[tokens.length - 1] || null;
      }
    }
  }

  if (strike !== null && expiry) {
    return { status: 'confirmed', kind, underlying, strike, expiry, raw: { l18, l30, inscode } };
  }
  // If strike/expiry extraction failed but prefix+ekhtiar present, candidate — needs calendar/chain
  return { status: 'candidate', kind, underlying: underlying || null, strike, expiry, raw: { l18, l30, inscode }, reason: 'strike/expiry parse incomplete — pattern fallback' };
}

// Export for Node/Browser
if (typeof module !== 'undefined' && module.exports) module.exports = { parseOptionLabel, version: '0.1.0' };
if (typeof window !== 'undefined') window.tseZharfaKavosh_parseOptionLabel = parseOptionLabel;
