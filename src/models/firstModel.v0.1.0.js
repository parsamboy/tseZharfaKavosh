/**
 * tseZharfaKavosh — First Model v0.1.0 — G-06
 * Minimal first model to satisfy G-06 gate: implementation + parity + no-fabrication
 * Model: QuoteMid — computes mid = (pd1+po1)/2 and spread = po1-pd1 from snapshot row
 * - Requires pd1 and po1 (best bid/ask) — if missing, returns insufficient-data (no fabrication)
 * - Uses parseCanonicalNumber from snapshot.canonical
 * - Versioned, pure, deterministic — same input -> same output on any executor
 * SPDX: Smart-FFA-1.1
 */
function createFirstModel(snapshotCanonical) {
  // snapshotCanonical is helper from src/snapshot.canonical.v0.1.0.js
  const parseNum = snapshotCanonical.parseCanonicalNumber;
  const isMissing = snapshotCanonical.isMissing;

  return {
    version: '0.1.0-firstModel-001',
    inputSchema: 'snapshotRow@0.1.0-snapshot-001 with pd1/po1/pc + inscode',
    /**
     * @param {object} row - canonical row (sorted keys)
     * @returns {{inscode:string, mid:number|null, spread:number|null, spreadPct:number|null, status:'fresh'|'insufficient-data', reason?:string}}
     */
    compute(row) {
      const inscode = String(row.inscode || row._canonicalInscode || '');
      const pd1 = parseNum(row.pd1);
      const po1 = parseNum(row.po1);
      const pc  = parseNum(row.pc);
      if (pd1 === null || po1 === null) {
        return { inscode, mid: null, spread: null, spreadPct: null, status: 'insufficient-data', reason: 'pd1 or po1 missing — shallow book (G-05 missing 4/30)', rawPd1: row.pd1, rawPo1: row.po1 };
      }
      const mid = (pd1 + po1) / 2;
      const spread = po1 - pd1;
      const spreadPct = mid !== 0 ? (spread / mid) * 100 : null;
      return { inscode, mid, spread, spreadPct, pc, status: 'fresh' };
    },
    /**
     * Batch compute over snapshot
     */
    computeAll(rows) {
      return rows.map(r => this.compute(r));
    }
  };
}

if (typeof module !== 'undefined' && module.exports) module.exports = { createFirstModel, version: '0.1.0' };
if (typeof window !== 'undefined') window.tseZharfaKavosh_firstModel = createFirstModel;
