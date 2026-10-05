/**
 * tseZharfaKavosh — exact A projection v0.1.0 (G-12)
 * Artifact A: ParTree=15131F row-only pure predicate (no DOM/timer/network)
 * Verdict E_k: set of inscodes from B snapshot (e.g., filtered 1564 options)
 * Projection: row => row.inscode in E_k OR predicate from B
 * No scalar fallback, no Bloom — exact per spec §8.14
 * SPDX: Smart-FFA-1.1
 */

const VERSION='0.1.0-exactA-001';

/**
 * Build exact predicate from verdict set
 * @param {Set<string>|string[]} verdictInsCodes - set of inscodes in E_k
 * @returns {(row:object)=>boolean}
 */
function buildExactPredicate(verdictInsCodes){
  const set = verdictInsCodes instanceof Set ? verdictInsCodes : new Set(verdictInsCodes);
  // exact, not approximate — use Set.has
  return function exactPredicate(row){
    if(!row || typeof row.inscode!=='string') return false;
    return set.has(row.inscode);
  };
}

/**
 * Alternative: predicate from B (e.g., filtered by expiry/strike/underlying)
 * This is row predicate that can be evaluated row-local without storing full set
 * @param {object} bPredicate - e.g., { underlying:'اهرم', expiry:'1405/07/29', kind:'call', minStrike:20000 }
 * @returns {(row:object, parsed:object)=>boolean}
 */
function buildBsPredicate(bPredicate){
  // This is illustrative — real B predicate comes from spec, not hardcoded
  return function bExactPredicate(row, parsed){
    if(!parsed || parsed.error) return false;
    if(bPredicate.underlying && parsed.underlying!==bPredicate.underlying) return false;
    if(bPredicate.expiry && parsed.expiry!==bPredicate.expiry) return false;
    if(bPredicate.kind && parsed.kind!==bPredicate.kind) return false;
    if(bPredicate.minStrike && parsed.strike < bPredicate.minStrike) return false;
    if(bPredicate.maxStrike && parsed.strike > bPredicate.maxStrike) return false;
    return true;
  };
}

/**
 * Capacity estimate for A (15131F textarea limit ~4KB)
 * @param {number} verdictSize - number of inscodes in E_k
 * @param {number} predicateSourceSize - bytes of predicate source (if using B predicate)
 */
function capacityCheck(verdictSize, predicateSourceSize){
  const LIMIT=4096; // per spec §8.14 ParTree=15131F
  // Exact Set approach: ~11 chars per inscode (11 digit inscode + 2 quotes/comma) ~13 bytes
  const setCost = verdictSize * 13;
  // B predicate approach: source size is code size (e.g., 200-500 bytes)
  const cost = predicateSourceSize !=null ? predicateSourceSize : setCost;
  return { limit: LIMIT, cost, fits: cost <= LIMIT, verdictSize, setCost, predicateCost: predicateSourceSize };
}

module.exports={ buildExactPredicate, buildBsPredicate, capacityCheck, VERSION };
if(typeof window!=='undefined') window.TseExactA={ buildExactPredicate, buildBsPredicate, capacityCheck, VERSION };
