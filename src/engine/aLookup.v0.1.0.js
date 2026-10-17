/**
 * tseZharfaKavosh — A lookup v0.1.0 (A/B engine separation — G-12/G-13)
 *
 * A is the per-row side of the separation. It does ONE thing: look up the row's
 * bit in the immutable projection B published. No computation, no dirty tracking,
 * no state, no timers — that is what keeps A pure and row-only (contract v6.0 §1.3).
 *
 * Fail-open rule (contradiction review 2026-10-17, docs/AB_ENGINE_SEPARATION_DESIGN.md §3):
 *   - no valid published projection          -> true (B has not run yet / first run)
 *   - symbol not in the index                -> true (unknown symbol)
 *   - symbol not computed (known bit = 0)    -> true (B had insufficient data)
 *   - otherwise                              -> the pass bit
 * The user therefore always sees MORE than the filter would allow, never an empty
 * page. B stays fail-closed (it never publishes a partial or broken projection).
 *
 * Purity: no DOM, no network, no storage, no timers, no globals of its own.
 * SPDX: Smart-FFA-1.1
 */

const VERSION = '0.1.0-aLookup-001';

// Artifact A capacity limit for the constrained filter slot (spec §8.14, ParTree=15131F)
const FILTER_CODE_LIMIT = 4096;

/**
 * Node/browser evaluation of one row against B's published projection.
 * @param {object} row - row from mw.AllRows (needs inscode)
 * @param {object} published - result of bEngine.getPublished()
 * @returns {boolean} FilterResult — fail-open true on any uncertainty
 */
function evaluateRow(row, published) {
  // fail-open: B has nothing valid published
  if (!published || !published.ok || !published.index || !published.bitset || !published.known) return true;
  if (!row) return true;
  const inscode = (row.inscode !== undefined && row.inscode !== null) ? String(row.inscode)
    : (row.InsCode !== undefined && row.InsCode !== null ? String(row.InsCode) : '');
  if (!inscode) return true;                       // fail-open: no identity
  const pos = published.index[inscode];
  if (pos === undefined) return true;              // fail-open: unknown symbol
  const byteIdx = pos >> 3;                        // pos / 8 (identical, cheaper)
  const mask = 1 << (pos & 7);                     // pos % 8 (identical, cheaper)
  if (byteIdx < 0 || byteIdx >= published.known.length) return true; // fail-open: out of range
  if (!((published.known[byteIdx] & mask) !== 0 ? 1 : 0)) return true; // not computed -> fail-open
  return ((published.bitset[byteIdx] & mask) !== 0);
}

/**
 * The A body that runs inside the filter slot. It reads ONLY the published
 * projection on the page object (mw.__B_*) — no computation, no state.
 * Every guard below is a fail-open exit: a missing/short projection can never
 * hide rows from the user.
 * Written as plain readable source: no mangling, no Terser/Uglify (contract §1.3).
 * @returns {string} source body assigning `FilterResult`
 */
function buildFilterCodeBody() {
  return [
    '// tseZharfaKavosh A lookup ' + VERSION + ' — reads only B published projection',
    'var FilterResult = true;',
    'var __i = mw.__B_index;',
    'if (__i && mw.__B_known && mw.__B_bitset && row) {',
    '  var __p = __i[row.inscode];',
    '  if (__p !== undefined) {',
    '    var __b = __p >> 3, __m = __p & 7;',
    '    if (__b >= 0 && __b < mw.__B_known.length && (mw.__B_known[__b] >> __m) & 1) {',
    '      FilterResult = !!((mw.__B_bitset[__b] >> __m) & 1);',
    '    }',
    '  }',
    '}'
  ].join('\n');
}

/**
 * Full artifact A descriptor with capacity check.
 * @returns {{body:string, bytes:number, limit:number, fits:boolean, version:string}}
 */
function buildFilterCode() {
  const body = buildFilterCodeBody();
  const bytes = body.length;
  return { body: body, bytes: bytes, limit: FILTER_CODE_LIMIT, fits: bytes <= FILTER_CODE_LIMIT, version: VERSION };
}

/** Capacity check against the constrained filter slot (spec §8.14). */
function capacityCheck(source, limit) {
  const lim = (typeof limit === 'number') ? limit : FILTER_CODE_LIMIT;
  const bytes = (typeof source === 'string') ? source.length : 0;
  return { limit: lim, bytes: bytes, fits: bytes > 0 && bytes <= lim };
}

/**
 * Parity harness: execute the generated body in an isolated function scope with
 * a mock page object and row, exactly as the filter slot would.
 * Signature mirrors evaluateRow(row, published) so the two cannot be confused.
 * @returns {function(row:object, mwLike:object):boolean}
 */
function compileFilterCodeBody(body) {
  const src = (typeof body === 'string' && body.length) ? body : buildFilterCodeBody();
  // eslint-disable-next-line no-new-func
  return new Function('row', 'mw', src + '\nreturn FilterResult;');
}

module.exports = { evaluateRow, buildFilterCodeBody, buildFilterCode, capacityCheck, compileFilterCodeBody, VERSION, FILTER_CODE_LIMIT };
if (typeof window !== 'undefined') window.TseALookup = { evaluateRow, buildFilterCodeBody, buildFilterCode, capacityCheck, compileFilterCodeBody, VERSION, FILTER_CODE_LIMIT };
