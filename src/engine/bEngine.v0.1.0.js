/**
 * tseZharfaKavosh — B engine v0.1.0 (A/B engine separation — G-12/G-13)
 *
 * B owns UX + settings + data + computation and runs INDEPENDENTLY, once per
 * snapshot. A (per-row, inside FilterCode) does ONLY a lookup of the immutable
 * projection B publishes (bitset + known-mask + reverse index).
 *
 * Rules implemented here (see docs/AB_ENGINE_SEPARATION_DESIGN.md):
 *   1. B runs only when snapshotId OR configHash changed (dual trigger guard).
 *   2. Dirty tracking lives in B, O(n) once per cycle (fields: tvol/pl/tno/pcp).
 *   3. Reverse index (inscode -> position) gives O(1) lookup for A.
 *   4. Bitset compression: 1 bit per symbol for pass/fail + 1 bit for "computed".
 *   5. Atomic swap: a new Uint8Array is built completely, then assigned in one
 *      statement. There is no reset-then-fill window, so A never reads a partial
 *      projection.
 *   6. B fail-closed: any funnel error aborts the cycle and NOTHING is published;
 *      the previous valid projection stays in place and the failed rows are
 *      retried on the next cycle (prevRows is not advanced).
 *   7. A fail-open (see aLookup): when a symbol was not computed (known bit 0)
 *      or no valid projection exists, A returns true — the user sees MORE, never
 *      an empty page.
 *   8. B is async-capable (runAsync via injected scheduler), never inside
 *      RenderData.
 *
 * Index caching: the reverse index is rebuilt only when the symbol set changes
 * (count + sampled inscodes). The page mutates row FIELDS in place, so the keys
 * are stable; rebuilding 3282 keys every cycle cost ~1.5ms for nothing.
 * Compute always reads the CURRENT row object (detectDirty returns a row map for
 * the dirty rows only), never a cached reference — see the stale-row test in
 * probes/engine.parity.v1.js.
 *
 * Purity: no DOM, no network, no storage, no direct mw access. The mw-like object
 * is injected (installHooks/publish), the models are injected (computeFunnel),
 * the scheduler and clock are injected. This keeps the module unit-testable and
 * parity-testable in node (G-14 convention).
 *
 * JIT note: the "new Function()" trick from the console probes was needed only
 * because functions defined inside eval() are JIT-blocked. This module is a real
 * script file, so plain function declarations are already module scope and
 * JIT-optimizable — no eval, no new Function() required here.
 *
 * SPDX: Smart-FFA-1.1
 */

const VERSION = '0.1.0-bEngine-001';

// Fields compared for dirty detection.
// Correctness fields (what the funnel actually reads): pl (S), plc (market price),
// l18/l30 (label -> strike + kind).
// Activity proxies (cheap extra signal, validated live in DIAG2/v9): tvol, tno, pcp.
// NOTE: the original 4-field set (tvol/pl/tno/pcp) missed `plc`, so a row whose only
// change was its market price was never recomputed and its bit went stale. That bug
// was caught by the stale-row test in probes/engine.parity.v1.js.
const DIRTY_FIELDS = ['pl', 'plc', 'l18', 'l30', 'tvol', 'tno', 'pcp'];

// How many inscodes are sampled to decide whether the cached index is still valid
const INDEX_SAMPLE = 16;

// Provisional funnel thresholds — origin: probe B-BSIV v9 (live 2026-10-17).
// NOT owner-approved product behavior: they decide which rows pass, so they are
// configuration (part of configHash) and must be reviewed before any release.
//
// INPUT MAPPING (open decision, see AB_ENGINE_SEPARATION_DESIGN.md §12):
// The v9 probe fed impliedVol with S = row.pl (the OPTION's own price) and
// marketPrice = row.plc. Neither is verified: E-011 records all 113 field names
// but explicitly leaves "_* vs non-* duplicate fields semantics unknown", and no
// evidence in this repo documents `plc` as a price. The repo's OWN G-11 greeks
// probe (probes/g11.greeks.limited-test.v1.1.js) instead used
//   S           = underlying row's `pc` (via an underlying map built from l30)
//   marketPrice = the option's bid/ask mid (pd1+po1)/2
//   r           = 0.30,  T = 30/365
// The v9 mapping produced a 77% IV-at-cap rate (perf.funnel.live.v1) — consistent
// with feeding the solver an unrelated S and a non-price marketPrice. The
// defaults below follow the G-11 probe (the best-evidenced mapping in this repo)
// and are still PROVISIONAL until the owner decides.
const DEFAULT_FUNNEL_CONFIG = {
  T: 30 / 365,             // ~1 month (G-11 probe value; v9 used 0.082 - same)
  r: 0.30,                 // risk-free (G-11 probe; v9 used 0.2) - OWNER DECISION PENDING
  ivMin: 0.01,             // implied vol lower bound
  ivMax: 1.0,              // implied vol upper bound
  deltaMin: 0.3,           // |delta| lower bound (only used when useDeltaGamma)
  gammaMin: 1e-4,          // gamma lower bound (only used when useDeltaGamma)
  // OWNER DECISION 2026-10-17 (q5): pass = IV solved and inside the valid range.
  // delta/gamma thresholds are kept in config but NOT applied until re-enabled.
  useDeltaGamma: false,
  // OWNER DECISION 2026-10-17 (q1): the "77% IV at cap" signal is an OPEN BUG.
  // Until the live diagnostic probe shows how many live rows are boundary-pinned,
  // no IV-based filtering happens: every confirmed option is computed and passes,
  // which is exactly the fail-open behaviour the owner asked for. The IV is still
  // solved and echoed (with an atBoundary flag) so the live probe can read it.
  ivFilterEnabled: false,
  // OWNER DECISION 2026-10-17 (q2): the option's market price is `pl` (last trade).
  marketPriceFrom: 'pl',           // 'pl' | 'pc' | 'plc' | 'pcp' | 'bidAskMid'
  // S source: PROVISIONAL - the round-trip test proves the underlying-map mapping
  // is correct, but the owner's answer here was ambiguous, so this stays a
  // documented default until confirmed. 'none' disables S entirely.
  underlyingFrom: 'underlyingMap', // 'underlyingMap' | 'rowPl' | 'none'
  // which field of the underlying row is its price (G-11 used pc)
  underlyingPriceField: 'pc',      // 'pc' | 'pl'
  // reproduce the v9 probe mapping for comparison
  legacyV9Mapping: false
};

// Legacy mapping from probe B-BSIV v9 — kept ONLY so the two can be compared
// live. Selecting it reproduces the 77% IV-at-cap behaviour.
const V9_FUNNEL_CONFIG = {
  r: 0.2,
  marketPriceFrom: 'plc',
  underlyingFrom: 'rowPl',
  legacyV9Mapping: true
};

// ---------- small helpers (module scope = JIT friendly) ----------

function inscodeOf(row) {
  if (!row) return '';
  if (row.inscode !== undefined && row.inscode !== null && row.inscode !== '') return String(row.inscode);
  if (row.InsCode !== undefined && row.InsCode !== null && row.InsCode !== '') return String(row.InsCode);
  return '';
}

function toNum(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = parseFloat(v);
  return (typeof n === 'number' && isFinite(n)) ? n : null;
}

function setBit(bytes, pos, value) {
  const byteIdx = (pos / 8) | 0;
  const mask = 1 << (pos % 8);
  if (value) bytes[byteIdx] |= mask; else bytes[byteIdx] &= ~mask;
}

function getBit(bytes, pos) {
  return (bytes[(pos / 8) | 0] >> (pos % 8)) & 1;
}

// mw.AllRows is an object keyed by inscode on the live page; accept both shapes.
function normalizeRows(rows) {
  if (!rows) return [];
  if (Array.isArray(rows)) return rows;
  if (typeof rows === 'object') {
    const out = [];
    for (const k in rows) if (Object.prototype.hasOwnProperty.call(rows, k)) out.push(rows[k]);
    return out;
  }
  return [];
}

/**
 * Underlying map in the G-11 style: rows whose l18 is NOT an option label carry
 * the underlying's own price. l30 gives the option's underlying NAME, which is
 * matched against these l18 keys (E-012: the relation is sample-only until the
 * chain/calendar gates G-07..G-10 close, so a miss must degrade to
 * insufficient-data, never to a fabricated S).
 */
function buildUnderlyingMap(list, field) {
  const priceField = field || 'pc';
  const map = Object.create(null);
  for (let i = 0; i < list.length; i++) {
    const r = list[i];
    if (!r) continue;
    const l18 = String(r.l18 || '').trim();
    if (!l18 || l18.length > 12) continue;
    const first = l18.charAt(0);
    if (first === '\u0636' || first === '\u0637') continue; // option prefix
    const price = toNum(r[priceField]);
    if (price !== null && price > 0 && map[l18] === undefined) map[l18] = price;
  }
  return map;
}

/**
 * Default async scheduler for B: requestIdleCallback({timeout:500}) when the page
 * offers it, otherwise setTimeout(0). Never runs B synchronously inside
 * RenderData — that would block the render tick for 20-40ms.
 */
function createScheduler() {
  if (typeof requestIdleCallback === 'function') {
    return function (fn) {
      requestIdleCallback(function () { fn(); }, { timeout: 500 });
    };
  }
  if (typeof setTimeout === 'function') return function (fn) { setTimeout(fn, 0); };
  return function (fn) { fn(); };
}

/**
 * Create a B engine instance.
 * @param {object} [options]
 * @param {object} [options.models] { parseOptionLabel, impliedVol, bsGreeks } — injected
 * @param {object} [options.funnelConfig] overrides for DEFAULT_FUNNEL_CONFIG
 * @param {string[]} [options.dirtyFields] overrides for DIRTY_FIELDS
 * @param {function} [options.scheduler] async scheduler (fn) — default setTimeout(0)
 * @param {function} [options.now] clock in ms — default performance.now/Date.now
 * @param {boolean} [options.strictIndex] force a full index rebuild every cycle
 */
function createBEngine(options) {
  const opts = options || {};
  const models = opts.models || {};
  let funnel = Object.assign({}, DEFAULT_FUNNEL_CONFIG, opts.funnelConfig || {});
  if (opts.legacyV9Mapping === true || funnel.legacyV9Mapping === true) {
    funnel = Object.assign({}, funnel, V9_FUNNEL_CONFIG);
  }
  const dirtyFields = Array.isArray(opts.dirtyFields) && opts.dirtyFields.length ? opts.dirtyFields.slice() : DIRTY_FIELDS;
  const strictIndex = opts.strictIndex === true;
  // Async scheduler. The page calls RenderData ~1/sec and a full B cycle is
  // ~20-40ms, so setTimeout(0) alone does not separate B from the render tick.
  // requestIdleCallback with a timeout runs B in the idle gap; setTimeout(0) is
  // the fallback. Both are injected for testability.
  const scheduler = opts.scheduler || createScheduler();
  const now = opts.now || (typeof performance !== 'undefined' && performance.now
    ? function () { return performance.now(); }
    : function () { return Date.now(); });

  const state = {
    symbols: [],                 // [inscode, ...] ordered
    index: Object.create(null),  // inscode -> position
    rowIndex: Object.create(null), // inscode -> row (refreshed on full rebuild; debug/A aid)
    bitset: new Uint8Array(0),   // 1 bit per symbol: pass/fail
    known: new Uint8Array(0),    // 1 bit per symbol: computed? (0 => A fails open)
    prevRows: Object.create(null), // inscode -> {tvol,pl,tno,pcp}
    underlyingMap: Object.create(null), // underlying name -> price (G-11 style)
    snapshotId: null,
    configHash: null,
    configVersion: 0,
    totalRuns: 0,
    indexRebuilds: 0,
    indexCacheHits: 0,
    lastDirtyCount: 0,
    lastComputed: 0,
    lastUnknown: 0,
    lastError: null,
    lastHookError: null,
    meta: null
  };

  // ---------- index ----------

  /**
   * Full rebuild of the reverse index. If the symbol set changed, the previous
   * projection is invalidated (positions move) and a full recompute is forced.
   * @returns {{changed:boolean, count:number}}
   */
  function buildIndex(rows) {
    const list = normalizeRows(rows);
    const symbols = [];
    const index = Object.create(null);
    const rowIndex = Object.create(null);
    for (let i = 0; i < list.length; i++) {
      const inscode = inscodeOf(list[i]);
      if (!inscode || index[inscode] !== undefined) continue; // dedupe, keep first
      index[inscode] = symbols.length;
      rowIndex[inscode] = list[i];
      symbols.push(inscode);
    }
    let changed = false;
    if (symbols.length !== state.symbols.length) changed = true;
    else for (let i = 0; i < symbols.length; i++) if (symbols[i] !== state.symbols[i]) { changed = true; break; }

    state.symbols = symbols;
    state.index = index;
    state.rowIndex = rowIndex;
    state.indexRebuilds++;
    if (funnel.underlyingFrom === 'underlyingMap') state.underlyingMap = buildUnderlyingMap(list, funnel.underlyingPriceField);
    if (changed) {
      // symbol set changed -> old positions are meaningless, start clean
      state.bitset = new Uint8Array(Math.ceil(symbols.length / 8));
      state.known = new Uint8Array(Math.ceil(symbols.length / 8));
      state.prevRows = Object.create(null);
    }
    return { changed: changed, count: symbols.length };
  }

  /**
   * Cheap validity check for the cached index: same count plus INDEX_SAMPLE
   * inscodes spread over the list. The page mutates row fields in place, so this
   * is enough to notice added/removed symbols without paying a full rebuild.
   */
  function indexStillValid(list) {
    if (list.length !== state.symbols.length) return false;
    const step = Math.max(1, Math.floor(list.length / INDEX_SAMPLE));
    for (let i = 0; i < list.length; i += step) {
      const inscode = inscodeOf(list[i]);
      if (!inscode || state.index[inscode] === undefined) return false;
    }
    return true;
  }

  /** Rebuild the index only when the symbol set changed. */
  function ensureIndex(rows) {
    const list = normalizeRows(rows);
    if (!strictIndex && state.symbols.length > 0 && indexStillValid(list)) {
      state.indexCacheHits++;
      return { changed: false, count: state.symbols.length, cached: true };
    }
    return buildIndex(list);
  }

  // ---------- dirty detection (O(n) once per cycle, no mutation) ----------

  /**
   * @returns {{dirty:string[], rowMap:object, count:number}} — rowMap holds the
   *          CURRENT row object for each dirty inscode (compute must never read a
   *          cached row). prevRows is NOT mutated: commitDirty() runs only after
   *          a successful cycle.
   */
  function detectDirty(rows) {
    const list = normalizeRows(rows);
    const dirty = [];
    const rowMap = Object.create(null);
    const prev = state.prevRows;
    for (let i = 0; i < list.length; i++) {
      const r = list[i];
      const inscode = inscodeOf(r);
      if (!inscode) continue;
      const p = prev[inscode];
      let isDirty = false;
      if (!p) isDirty = true;
      else {
        for (let f = 0; f < dirtyFields.length; f++) {
          if (p[dirtyFields[f]] !== r[dirtyFields[f]]) { isDirty = true; break; }
        }
      }
      if (isDirty) { dirty.push(inscode); rowMap[inscode] = r; }
    }
    return { dirty: dirty, rowMap: rowMap, count: dirty.length };
  }

  /** Record the dirty fields of the given rows (called only after success). */
  function commitDirty(rowMap) {
    const prev = state.prevRows;
    for (const k in rowMap) {
      if (!Object.prototype.hasOwnProperty.call(rowMap, k)) continue;
      const r = rowMap[k];
      const snap = {};
      for (let f = 0; f < dirtyFields.length; f++) snap[dirtyFields[f]] = r[dirtyFields[f]];
      prev[k] = snap;
    }
  }

  // ---------- guard ----------

  function needsRun(snapshotId, configHash) {
    if (state.snapshotId === null || state.configHash === null) return true; // first run
    if (snapshotId !== state.snapshotId) return true;
    if (configHash !== state.configHash) return true;
    return false;
  }

  /** snapshotId from the page: RoundNo + symbol count (hook-owned). */
  function computeSnapshotId(mwLike) {
    const roundNo = mwLike && mwLike.RoundNo !== undefined ? mwLike.RoundNo : 0;
    const count = mwLike && mwLike.AllRows ? Object.keys(mwLike.AllRows).length : 0;
    return 'snap-' + roundNo + '-' + count;
  }

  /** configHash is owned by UX: configVersion (hook counter) + FilterCode length. */
  function computeConfigHash(mwLike) {
    const version = (mwLike && mwLike.__B_configVersion !== undefined) ? mwLike.__B_configVersion : state.configVersion;
    const fc = mwLike && mwLike.FilterCode ? String(mwLike.FilterCode) : '';
    return version + '-' + fc.length;
  }

  // ---------- per-row funnel (injected models; no fabrication) ----------

  /**
   * @returns {{status:'ok'|'insufficient-data'|'error', pass?:boolean, delta?, gamma?, iv?, iterations?}}
   *   status 'insufficient-data' -> symbol stays unknown (A fails open for it)
   *   status 'error'              -> cycle aborts, nothing published (B fail-closed)
   */
  /**
   * Resolve the option's market price per the configured source.
   * 'bidAskMid' follows the G-11 probe ((pd1+po1)/2) and degrades to
   * insufficient-data when the book is shallow (G-05: missing 4/30) — never to a
   * fabricated price.
   */
  function resolveMarketPrice(row) {
    const src = funnel.marketPriceFrom;
    if (src === 'bidAskMid') {
      const bid = toNum(row.pd1), ask = toNum(row.po1);
      if (bid === null || ask === null || bid <= 0 || ask <= 0) return null;
      return (bid + ask) / 2;
    }
    return toNum(row[src]);
  }

  /** Resolve the underlying price S per the configured source. */
  function resolveUnderlying(row, parsed) {
    if (funnel.underlyingFrom === 'rowPl') return toNum(row.pl);       // v9 probe
    if (funnel.underlyingFrom === 'none') return null;
    const name = parsed && parsed.underlying ? String(parsed.underlying).trim() : '';
    if (!name) return null;
    const price = state.underlyingMap[name];
    return (price === undefined) ? null : price;
  }

  function computeFunnel(row, parsed) {
    try {
      if (!row || typeof row !== 'object') return { status: 'error', reason: 'row not object' };
      if (!parsed || parsed.status !== 'confirmed') return { status: 'insufficient-data', reason: 'not a confirmed option' };
      const S = resolveUnderlying(row, parsed);
      const K = toNum(parsed.strike);
      const marketPrice = resolveMarketPrice(row);
      if (S === null || K === null) return { status: 'insufficient-data', reason: 'missing S/K' };
      if (marketPrice === null) return { status: 'insufficient-data', reason: 'missing market price' };
      const kind = (parsed.kind === 'put') ? 'put' : 'call';
      if (typeof models.impliedVol !== 'function' || typeof models.bsGreeks !== 'function') {
        return { status: 'error', reason: 'models not injected' };
      }
      const iv = models.impliedVol({ S: S, K: K, T: funnel.T, r: funnel.r, kind: kind, marketPrice: marketPrice });
      const inputs = { S: S, K: K, marketPrice: marketPrice, T: funnel.T, r: funnel.r, kind: kind };

      // ---- IV filter disabled (owner decision q1: 77% at-cap is an OPEN BUG) ----
      // The IV is still solved and echoed for diagnostics, but it cannot hide a
      // row until the live probe says how many rows are boundary-pinned.
      if (!funnel.ivFilterEnabled) {
        const ivOk = iv && !iv.error && iv.sigma !== undefined && iv.sigma !== null && isFinite(iv.sigma);
        return {
          status: 'ok', pass: true, reason: 'iv-filter-disabled-open-bug',
          iv: ivOk ? iv.sigma : null,
          atBoundary: ivOk ? (iv.sigma <= 0.0100001 || iv.sigma >= 2.9999999) : null,
          iterations: ivOk ? iv.iterations : null,
          inputs: inputs
        };
      }

      if (!iv || iv.error || iv.sigma === undefined || iv.sigma === null || !isFinite(iv.sigma)) {
        return { status: 'insufficient-data', reason: 'iv failed' };
      }
      const g = models.bsGreeks({ S: S, K: K, T: funnel.T, r: funnel.r, sigma: iv.sigma, kind: kind });
      if (!g || g.error) return { status: 'insufficient-data', reason: 'greeks failed' };
      const atBoundary = (iv.sigma <= 0.0100001 || iv.sigma >= 2.9999999);
      // owner decision q5: IV range only. delta/gamma are opt-in again.
      let pass = (iv.sigma > funnel.ivMin) && (iv.sigma < funnel.ivMax);
      if (pass && funnel.useDeltaGamma === true) {
        pass = (Math.abs(g.delta) > funnel.deltaMin) && (g.gamma > funnel.gammaMin);
      }
      return {
        status: 'ok', pass: pass, delta: g.delta, gamma: g.gamma,
        iv: iv.sigma, iterations: iv.iterations, atBoundary: atBoundary,
        reason: pass ? 'pass' : 'fail-iv-range',
        inputs: inputs
      };
    } catch (e) {
      return { status: 'error', reason: String((e && e.message) || e) };
    }
  }

  // ---------- one B cycle ----------

  /**
   * Run one B cycle: guard -> index -> dirty -> compute -> atomic swap.
   * @returns {object} report {published, reason?, dirtyCount, computed?, unknown?, elapsedMs, runs}
   */
  function run(rows, snapshotId, configHash) {
    const t0 = now();
    if (!needsRun(snapshotId, configHash)) {
      return { published: false, reason: 'no-change', dirtyCount: 0, elapsedMs: now() - t0, runs: state.totalRuns };
    }
    const idx = ensureIndex(rows);
    const d = detectDirty(rows);
    state.lastDirtyCount = d.count;

    if (d.count === 0) {
      // nothing changed: mark the snapshot as processed so we do not re-run
      state.snapshotId = snapshotId;
      state.configHash = configHash;
      return { published: false, reason: 'no-dirty', dirtyCount: 0, elapsedMs: now() - t0, runs: state.totalRuns };
    }

    // Build the next projection completely BEFORE any swap (fail-closed).
    const bytes = state.bitset.length;
    const nextBitset = new Uint8Array(bytes);
    const nextKnown = new Uint8Array(bytes);
    for (let i = 0; i < bytes; i++) { nextBitset[i] = state.bitset[i]; nextKnown[i] = state.known[i]; }

    let computed = 0, unknown = 0, errors = 0, lastErr = null;
    for (let i = 0; i < d.dirty.length; i++) {
      const inscode = d.dirty[i];
      const pos = state.index[inscode];
      if (pos === undefined) continue;
      const row = d.rowMap[inscode]; // CURRENT row, never a cached reference
      if (!row) continue;
      const parsed = (typeof models.parseOptionLabel === 'function') ? models.parseOptionLabel(row) : { status: 'unknown' };
      const res = computeFunnel(row, parsed);
      if (res.status === 'error') { errors++; if (!lastErr) lastErr = res.reason; continue; }
      if (res.status === 'ok') {
        setBit(nextBitset, pos, res.pass);
        setBit(nextKnown, pos, true);
        computed++;
      } else {
        setBit(nextKnown, pos, false); // unknown -> A fails open for this symbol
        unknown++;
      }
    }

    if (errors > 0) {
      // B FAIL-CLOSED: publish nothing, keep the previous projection, do not
      // advance prevRows so these rows are retried on the next cycle.
      state.lastError = 'funnel errors: ' + errors + ' (' + lastErr + ')';
      return {
        published: false, reason: 'error', error: state.lastError,
        dirtyCount: d.count, computed: computed, unknown: unknown,
        elapsedMs: now() - t0, runs: state.totalRuns
      };
    }

    // ATOMIC SWAP — one reference assignment per array
    state.bitset = nextBitset;
    state.known = nextKnown;
    state.snapshotId = snapshotId;
    state.configHash = configHash;
    state.totalRuns++;
    state.lastError = null;
    state.lastComputed = computed;
    state.lastUnknown = unknown;
    state.meta = {
      snapshotId: snapshotId,
      configHash: configHash,
      dirtyCount: d.count,
      computed: computed,
      unknown: unknown,
      totalSymbols: state.symbols.length,
      bitsetBytes: nextBitset.length,
      indexChanged: idx.changed,
      indexCached: idx.cached === true,
      version: VERSION
    };
    commitDirty(d.rowMap);
    return {
      published: true, dirtyCount: d.count, computed: computed, unknown: unknown,
      elapsedMs: now() - t0, runs: state.totalRuns, meta: state.meta
    };
  }

  /** Async variant — B never runs inside RenderData. */
  function runAsync(rows, snapshotId, configHash, cb) {
    scheduler(function () {
      let report;
      try { report = run(rows, snapshotId, configHash); }
      catch (e) { report = { published: false, reason: 'error', error: String((e && e.message) || e) }; }
      if (typeof cb === 'function') cb(report);
    });
  }

  // ---------- publish (the only thing A ever reads) ----------

  /**
   * Write the immutable projection onto a target (the page's mw object).
   * Called only after a successful cycle; a single assignment per array means A
   * observes either the old or the new projection, never a partial one.
   */
  function publish(target) {
    if (!target || typeof target !== 'object') return { published: false, reason: 'no target' };
    target.__B_symbols = state.symbols;
    target.__B_index = state.index;
    target.__B_rowIndex = state.rowIndex;
    target.__B_bitset = state.bitset;
    target.__B_known = state.known;
    target.__B_snapshotId = state.snapshotId;
    target.__B_configHash = state.configHash;
    target.__B_configVersion = state.configVersion;
    target.__B_totalRuns = state.totalRuns;
    target.__B_meta = state.meta;
    target.__B_lastError = state.lastError;
    return { published: true, symbols: state.symbols.length, bitsetBytes: state.bitset.length };
  }

  /** Read-only view handed to A (never mutated after publish). */
  function getPublished() {
    const ok = state.bitset.length > 0 && state.snapshotId !== null && state.configHash !== null;
    return {
      ok: ok,
      index: state.index,
      bitset: state.bitset,
      known: state.known,
      symbols: state.symbols,
      meta: state.meta,
      lastError: state.lastError
    };
  }

  // ---------- hooks: configVersion (owned by UX) ----------

  /**
   * Wrap mw.SaveSettings / mw.SaveParams so every UX settings write bumps
   * configVersion, which feeds configHash (dual trigger).
   * Validated live: `this` must be the page context (window), NOT mw.
   * @returns {{uninstall:function}}
   */
  function installHooks(mw, ctx) {
    if (!mw || typeof mw !== 'object') return { uninstall: function () {} };
    const context = ctx || (typeof window !== 'undefined' ? window : null);
    // Make the counter observable from the first moment: without this it stays
    // undefined until the first hook fires, and anything reading mw.__B_configVersion
    // before that sees undefined (configHash guards with `|| 0`, but the published
    // projection should never carry an undefined).
    if (typeof mw.__B_configVersion !== 'number') mw.__B_configVersion = state.configVersion;
    const origSettings = mw.SaveSettings;
    const origParams = mw.SaveParams;

    mw.SaveSettings = function () {
      state.configVersion++;
      mw.__B_configVersion = state.configVersion;
      if (typeof origSettings === 'function') {
        try { return origSettings.apply(context, arguments); }
        catch (e) { state.lastHookError = 'SaveSettings: ' + String((e && e.message) || e); }
      }
      return undefined;
    };
    mw.SaveParams = function () {
      state.configVersion++;
      mw.__B_configVersion = state.configVersion;
      if (typeof origParams === 'function') {
        try { return origParams.apply(context, arguments); }
        catch (e) { state.lastHookError = 'SaveParams: ' + String((e && e.message) || e); }
      }
      return undefined;
    };

    return {
      uninstall: function () {
        mw.SaveSettings = origSettings;
        mw.SaveParams = origParams;
      }
    };
  }

  function reset() {
    state.symbols = [];
    state.index = Object.create(null);
    state.rowIndex = Object.create(null);
    state.bitset = new Uint8Array(0);
    state.known = new Uint8Array(0);
    state.prevRows = Object.create(null);
    state.underlyingMap = Object.create(null);
    state.snapshotId = null;
    state.configHash = null;
    state.configVersion = 0;
    state.totalRuns = 0;
    state.indexRebuilds = 0;
    state.indexCacheHits = 0;
    state.lastDirtyCount = 0;
    state.lastComputed = 0;
    state.lastUnknown = 0;
    state.lastError = null;
    state.lastHookError = null;
    state.meta = null;
  }

  return {
    VERSION: VERSION,
    DIRTY_FIELDS: DIRTY_FIELDS,
    dirtyFields: dirtyFields,
    funnelConfig: funnel,
    state: state,
    buildIndex: buildIndex,
    ensureIndex: ensureIndex,
    detectDirty: detectDirty,
    commitDirty: commitDirty,
    needsRun: needsRun,
    computeSnapshotId: computeSnapshotId,
    computeConfigHash: computeConfigHash,
    computeFunnel: computeFunnel,
    run: run,
    runAsync: runAsync,
    publish: publish,
    getPublished: getPublished,
    installHooks: installHooks,
    reset: reset,
    // exposed for tests/parity
    _setBit: setBit,
    _getBit: getBit,
    _toNum: toNum,
    _normalizeRows: normalizeRows,
    _inscodeOf: inscodeOf
  };
}

module.exports = {
  createBEngine, VERSION, DIRTY_FIELDS, DEFAULT_FUNNEL_CONFIG, V9_FUNNEL_CONFIG,
  INDEX_SAMPLE, createScheduler, buildUnderlyingMap
};
if (typeof window !== 'undefined') window.TseBEngine = {
  createBEngine, VERSION, DIRTY_FIELDS, DEFAULT_FUNNEL_CONFIG, V9_FUNNEL_CONFIG,
  INDEX_SAMPLE, createScheduler, buildUnderlyingMap
};
