# Changelog

All notable changes to `tseZharfaKavosh` are recorded here.

## [Unreleased]

### Changed — owner decisions applied to the funnel config (2026-10-17)

- `ivFilterEnabled: false` — the 77% IV-at-cap warning is an **open bug**: no row is
  hidden on the basis of IV until the live diagnostic probe (`probes/fieldsem.ivdiagnostic.live.v1.js`)
  has run. IV is still solved and echoed (`iv`, `atBoundary`) so the published projection
  stays auditable; `reason` is `iv-filter-disabled-open-bug` and every confirmed option
  passes (fail-open).
- `marketPriceFrom: 'pl'` (owner q2) replaces `bidAskMid`; `resolveMarketPrice()` keeps
  `bidAskMid` available for comparison.
- `useDeltaGamma: false` (owner q5) — pass = "IV solved and inside (ivMin, ivMax)";
  `deltaMin`/`gammaMin` remain in the config but are not applied.
- Owner follow-up answers applied: q3 is CONFIRMED as `underlyingFrom:'underlyingMap'`
  (S from the underlying row via the l30-built map, price field `pc`); q4 is
  "user-configurable", so `r` (and `T`/thresholds) now come from the UX settings layer
  and pass through the new `normalizeFunnelConfig()`: range-checked, garbage falls back
  to the proven defaults (fail-closed), switches coerced to booleans, unknown sources
  rejected, `DEFAULT_FUNNEL_CONFIG` never mutated.
- Parity suite extended to **102 assertions**, all passing.

### Added — live field-semantics + IV diagnostic evidence and market-price guards (2026-10-18)

- The owner ran `probes/fieldsem.ivdiagnostic.live.v1.js` [console] on old.tsetmc.com
  (E-045): `plc == pl - pc` for only 37.2% of rows, and `pl == pc` in every sampled
  row with a non-zero `plc` — the last price is stale whenever the option has not traded.
- IV boundary pinning on live data: the owner's mapping (underlying `pc` + bid/ask mid,
  r=0.30) pins **13.3%** of rows at the interval bound, the v9 mapping **40%** — the
  input mapping, not a data signal, caused the original 77% at-cap warning.
- Those 13.3% are provably impossible prices: outside the no-arbitrage bounds (call
  S=70164, K=24000, r=0.30, T=30/365 -> lower bound 46749 vs a mid of 46000) or from a
  23-32% wide book whose mid needs a vol above 300%.
- New `marketPriceProblem()` guard: `price-outside-arbitrage-bounds` and
  `book-too-wide` now return `insufficient-data` (never computed, never published), so
  A fails open and the row stays visible instead of hiding behind a fabricated IV.
  Configurable via `checkArbitrageBounds` and `maxSpreadPct` (0.20, PROVISIONAL).
- A boundary pin is now reported as `no-iv-solution`, distinct from
  `fail-iv-range` (a valid IV outside the funnel window).
- Live median IV is 1.0522 (p90 2.1424), so the funnel's `ivMax=1.0` would reject about
  half of the live options — the IV window needs an owner decision before the filter
  can be enabled (see design doc §12, decisions q7/q8).
- Parity suite extended to **114 assertions**, all passing.

### Changed — owner decisions q7/q8: ivMax 3.0 + hybrid price hierarchy (2026-10-18)

- `ivMax: 1.0 -> 3.0` (owner q7, UX-configurable): the live median IV is 1.0522 and
  p90 is 2.1424, so the old window would have rejected about half of the live options.
  The price guard stays the primary layer; `ivMax` is a backup that only rejects 1-2%
  (an IV above 300% is an anomaly). 5.0 was rejected because it equals the solver's
  own cap, which would make the check meaningless.
- `marketPriceFrom: 'pl' -> 'hybrid'` (owner q8), a three-level hierarchy:
  1. the bid/ask mid, guarded by `marketPriceProblem()` (arbitrage bounds + spread);
  2. `pl` only when `tno > 0` (the row actually traded today) — the spread guard is
     skipped on this path because a real executed trade is evidence even when the
     surrounding quotes are wide;
  3. otherwise `insufficient-data`, so A fails open and the row stays visible.
- Every rejection now carries its reason (`missing market price`,
  `price-outside-arbitrage-bounds`, `book-too-wide`), and the chosen source is echoed
  as `inputs.marketPriceSource` (`mid` | `pl-traded` | the explicit source name).
- Backlog: `plc == pl - pc` for only 37.2% of live rows, so `plc` is not the price
  change (most likely `plc = pl - py`) — recorded as gate G-18; no decision may be
  built on `plc` until it is settled (the q8 hierarchy uses `tno > 0`, not `plc`).
- The IV window is now clamped to the solver's own bisection range
  (`IV_SOLVER_MIN = 0.01`, `IV_SOLVER_MAX = 3.0`): an `ivMax` above 3.0 could never
  reject anything (the solver cannot return more), and an `ivMin` below 0.01 would
  let a floor-pinned IV pass. Both are footguns, so `normalizeFunnelConfig` clamps
  them instead of trusting a meaningless setting.
- Parity suite extended to **130 assertions**, all passing.

### Added — per-option maturity capability (q9), off by default; probe measures the real engine (2026-10-18)

- `TMode: 'fixed' | 'dte'` in the funnel config. `'fixed'` (the shipped default) keeps
  `T = 30/365`; `'dte'` computes the maturity per option from the parsed expiry through
  an **injected** calendar (`opts.calendar`), so the Jalali<->Gregorian conversion stays
  outside the engine (gate G-08's job). Without a calendar, `'dte'` returns
  insufficient-data rather than silently modelling the wrong maturity.
- The market-price guards and the IV solver now use the per-row maturity, because the
  arbitrage bounds depend on `T`: a price that is valid at 30 days can be below the
  bound at 3 days. `inputs.T` echoes the maturity actually used.
- `probes/ivfilter.borderline.live.v1.js` now measures RUN B through the real engine
  (`TMode: 'dte'`) instead of a local re-implementation, and reports the engine's own
  counts. Validated in node: the engine's RUN B matches the probe's local RUN B exactly
  (total 33, ok 22, atUpper 2, borderlinePct 9.1%) and the price-resolution parity check
  against `computeFunnel` stays 33/33.
- Three real bugs found and fixed while wiring this: `resolveMarketPrice` did not
  receive `T`; `normalizeFunnelConfig` could never write `'dte'`; two parity tests
  referenced a block-scoped engine from another scope.
- The probe now measures a **2x2 factorial** (maturity x guards), which isolates what
  the guards actually rescue: the same rows are measured with the guards on and off, in
  both T modes. On synthetic data the guards cut the boundary rate from 6.3% to 0% at the
  shipped T (they rescue everything, as the owner predicted), but only from 37.5% to 9.1%
  at the correct maturity — they cannot finish the job there. This is the direct test of
  the owner's "all boundary rows are rescued" claim.
- The probe also reports **boundary concentration per underlying** (`byBase`, top 8), so a
  single chain cannot hide inside an average.

### Verified — LIVE borderline measurement (E-051, owner, old.tsetmc.com 2026-10-18T07:18Z)

The owner ran the probe live: 2983 symbols, 1049 option rows, 1710-entry underlying map.

| | guards ON | guards OFF | guards rescue |
|---|---|---|---|
| **A: T = 30/365 (shipped)** | **1.8%** (8/442) | 17.3% (124/715) | 116 of 124 (93.5%) |
| **B: T = DTE/365 (correct)** | **7.3%** (30/411) | 11.9% (73/615) | 43 of 73 (59%) |

- The shipped maturity **flatters the result**: 1.8% would have looked "safe to enable",
  but it is produced by modelling 3-day options as 30 days. Live maturities span 3 to 87
  days (0-7d 91, 8-30d 265, 31-90d 556 rows).
- At the correct maturity the guards are much less effective (59% vs 93.5% rescue), so
  **the q9 (maturity) decision must precede the q1 (filter) decision**.
- 10 of the 29 ceiling pins at RUN B are a **single chain** (one underlying, 3 days to
  expiry, K=20000..46000). Verified arithmetically that this chain has no Black-Scholes
  solution at all: even at sigma=3.0 the model produces only ~334 rial of time value for
  K=46000 while the market shows 1080 - the price is 2-3x the model's maximum.
- 47.8% of live option rows have **no usable price** (17 no underlying, 120 no usable
  maturity, 297 with neither a valid book nor a trade), so under fail-open they bypass the
  filter entirely - that caps the filter's real coverage regardless of the decision.
- Verdict: **PRODUCT-DECISION** (7.3% is inside the owner's 3-8% band). `ivFilterEnabled`
  stays `false` until the owner decides what a no-solution row should do.
- Parity suite extended to **140 assertions**, all passing. The shipped default is
  unchanged (`TMode: 'fixed'`, `T = 30/365`).

### Added — IV borderline probe (live, [console]) + the fixed-T defect it exposes (2026-10-18)

- `probes/ivfilter.borderline.live.v1.js` [console] decides whether `ivFilterEnabled`
  can be enabled. It mirrors bEngine/greeks/optionParser verbatim, measures the real
  engine path, and reports every field the owner's decision table needs: the price
  source split (mid / pl-traded / insufficient), guard hits (arbitrage vs spread),
  noS/noT, ivSolved/ivFailed, atLower/atUpper, a 10-bucket IV histogram, up to 10
  borderline samples, and a single DECISION line applying the <3% / 3-8% / >8% rule.
- The probe runs the measurement TWICE — RUN A with the shipped `T = 30/365` and
  RUN B with the correct `T = DTE/365` — because the shipped T is a fixed
  approximation inherited from probe G-11.
- Validated in node against a fake live page: the probe runs end-to-end and its
  price-resolution layer agrees with the real engine's `computeFunnel` on 33/33 rows.
  A parity bug in the first draft (comparing across different T values, while the
  arbitrage bounds depend on T) was found and fixed.
- On synthetic data RUN A reports 0% borderline while RUN B reports 9.1% — the fixed
  T hides the problem. Gate **G-19** opened: the live expiry 1405/07/29 is
  2026-10-21, i.e. 3 days away, so the real T is 10x smaller than the modelled one.
  Decision q9 (per-option T via an injected calendar, or keep 30/365) is with the owner.
- A verified Jalali->Gregorian conversion (1405/01/01 == 2026-03-21) is inlined in the

### Fixed — `plc` semantics PROVEN (G-18 closed) (2026-10-18)

Comparing the 05:55Z and 06:55Z live snapshots of the same six option rows proves,
to two decimals on all six (6/6):

```
plc = pl - prevClose          (yesterday's close, NOT pc)
pc  = today's price
pcp = (pc - prevClose)/prevClose * 100
plp = (pl - prevClose)/prevClose * 100
```

This is why `plc == pl - pc` held for only 36.1% of rows (800/2219): `pc` is not the
previous close. It also explains the 05:55Z anomaly where `plc` was 0 while `pl != pc`
— at that moment `pl` equalled the previous close, so the change was genuinely zero.

Derived consequence for the engine: **`prevClose = pl - plc` is computable from the row
itself**, so price staleness is detectable without relying on `tno`. The q8 hierarchy
(`tno > 0`) remains correct, but `plc != 0` is a cheaper corroborating signal.

Second live IV run under the owner's mapping (T=30/365): atBoundary 13/120 (10.8%),
saneInterior 33 (27.5%); the v9 mapping pins 65/120 (54.2%). This is RUN-A data —
the decision measurement needs `probes/ivfilter.borderline.live.v1.js`.
  probe so DTE can be computed from the parsed `expiry`.
- Parity suite extended to **94 assertions** (`probes/engine.parity.v1.js`), all passing:
  synthetic option rows now carry realistic price fields (`pl` = the option's own last
  price), the round-trip test runs under the owner mapping (mean IV 0.3456 vs true 0.35,
  boundary pins 1/40), and the v9 mapping on the same data pins 36/40 (90%).


### Added — A/B engine separation v0.1.0 (G-12/G-13)

- `src/engine/bEngine.v0.1.0.js` — B engine: reverse index with caching, dirty
  detection (7 fields, O(n), no mutation), dual-trigger guard (snapshotId +
  configHash), per-row funnel with injected models, atomic swap, fail-closed
  publish, SaveSettings/SaveParams hooks (`this=window`), async runner.
- `src/engine/aLookup.v0.1.0.js` — A per-row lookup: `evaluateRow` (fail-open),
  generated 435-byte FilterCode body, capacity check (4096 limit), parity harness.
- `probes/engine.parity.v1.js` — 69 assertions: unit + parity + timing.
- `docs/AB_ENGINE_SEPARATION_DESIGN.md` — design, contradiction review (§11),
  performance budget (§4), implementation status (§12).

### Fixed (found by the parity suite)

- `plc` was missing from `DIRTY_FIELDS` although `impliedVol` reads it, so a
  market-price-only change never recomputed and the published bit went stale.
  `DIRTY_FIELDS` is now `[pl, plc, l18, l30, tvol, tno, pcp]`.
- `compileFilterCodeBody` had signature `(mw, row)` while `evaluateRow` is
  `(row, published)`; the signature now matches so the two cannot be confused.

### Evidence

- E-037 A/B architecture, E-038 configHash dual trigger, E-039 BS+IV timing,
  E-040 contradiction review + local benchmark, E-041 live funnel timing
  (18.4ms full / 16.16us per option row / detectDirty 2.3ms live),
  E-042 implementation + 69/69 parity + node --check 73/73.

### Changed — gap verification round 2 (2026-10-17)

- `src/engine/aLookup.v0.1.0.js` — bit extraction micro-optimised (`>> 3` / `& 7`);
  doc section 3 now shows the implemented guarded body instead of the old snippet.
- `src/engine/bEngine.v0.1.0.js` —
  - funnel input mapping is now explicit config (`marketPriceFrom`,
    `underlyingFrom`, `underlyingPriceField`, `r`) with a `legacyV9Mapping` switch;
  - default follows the repo's own G-11 probe (underlying map + bid/ask mid, r=0.30);
  - `createScheduler()` prefers `requestIdleCallback({timeout:500})` over `setTimeout(0)`;
  - `installHooks` initialises `mw.__B_configVersion` at install time;
  - funnel echoes its inputs (`S`, `K`, `marketPrice`, `T`, `r`, `kind`) for audit.
- `docs/AB_ENGINE_SEPARATION_DESIGN.md` — new section 11.1 (TextArea registration:
  what is confirmed vs what is open), measured memory numbers (~0.7-0.9 MB total),
  async section rewritten, IV-at-cap reframed (stopping criterion, not a data signal).
- `probes/engine.parity.v1.js` — 89 assertions, including an IV round-trip proof:
  the G-11 mapping recovers a synthesized true IV exactly (mean 0.3500, 0/984
  boundary pins) while the v9 mapping is biased (0.3557) and pins 28/984.
- `probes/fieldsem.ivdiagnostic.live.v1.js` — new live probe: settles what `plc`
  means (`plc = pl - pc`?) and whether live IVs are interior or boundary-pinned.

### Evidence

- E-042 implementation + parity; E-043 gap verification + IV round-trip proof.

## [0.1.0.0] — 2026-10-04

### Added

- Smart-FFA-1.1 license with attribution and optional donation;
- `DONATION.md` with a non-tracking, no-feature-unlock policy;
- canonical governance paths under `docs/`;
- successor authority decision `D-2026-10-04-001`;
- optional donation decision `D-2026-10-04-002`;
- canonical contract approval `D-2026-10-04-003`;
- initial data-source contract `contracts/01-data-source/spec.md`;
- six-layer governance scaffold;
- package and release metadata for `tseZharfaKavosh v0.1.0.0`.

### Deliberately not included

- no adapter;
- no core logic;
- no UI or panel;
- no compiler;
- no LEGAL runtime module or executable donation footer;
- no live probe;
- no market-data transfer or product runtime.

### Status

This is a governance-only initial release. The architecture contract is now canonical v6.0 for governance.
The v0.1.0.0 product release remains blocked by its open technical
gates and is not production-ready. This release is not product
shipping.

## [0.2.0-alpha] — 2026-10-05

### Added

- Full scope approved `D-2026-10-05-001` (D1+D2+D3 + all models) and privacy `D-2026-10-05-002 Option A strict`;
- data-source spec v0.2.0 §7-8 — OI/multiplier separate source (api.tsetmc.com) exhaustive public test;
- Greeks/IV Black-Scholes v0.1.0 (`S=70260 اهرم`) with parity `2fbf90ec` — E-024;
- exact A projection v0.1.0 — B predicate 420 fits for 1559 live (E-025);
- bridge v0.1.0 — FilterCode authoritative + SaveParams, trace valid (E-026);
- source/min/release 33/33 `node --check` + acorn (E-027);
- live platform-verified E-011..E-027 with fixtures (3425→1559 live).

### Scope note

`v0.2.0-alpha` is **product Alpha** (not governance-only): QuoteMid + Greeks/IV + snapshot/projection/bridge are candidate; GEX/DEX/Flow/SVI/GARCH requiring OI/history remain `candidate separate` via E-023 and move to `v0.2.1` with credential. This is **not laziness** but spec §7 `needs-separate is valid` — no fabrication of `z` or `tvol`.

### Evidence

E-011..E-027, fixtures with SHA, 11 public OI endpoints tested hasOI false, CORS+timeout proves credential probe must be Node from Tehran.

## [0.2.1-alpha] — 2026-10-06

### Added

- GARCH(1,1) v0.1.0 — 60 closes اهرم 72550..48294 sigma 0.032 annVol 0.51 (public ClosingPriceAll via InstHistory 4006 keys) — E-029;
- SVI v0.1.0 partial without OI (1-A) — chain 36 (18 strikes 20000..100000) S 72788 T 0.082 w 0.38/0.17/0.09 iv 0.62/0.41/0.30 — E-030 candidate, upgrade to full with OI weighting remembered per DEFERRED_REVIEW.

### Scope note

`v0.2.1-alpha` extends `v0.2.0-alpha` with GARCH + SVI partial **without credential** (public data only). GEX/DEX/Flow and SVI full remain deferred to `v0.3.0` via `E-023` (api.tsetmc.com suspended per owner). This is 1-A with upgrade remembered.

### Evidence

E-029 (GARCH 60 closes) + E-030 (SVI 36 chain), fixtures SHA fe490f7..ef89a5c.

## [0.2.2-alpha] — 2026-10-06

### Added

- CDN OI Provider v0.1.0 — `cdn.tsetmc.com/api/Instrument/GetInstrumentInfo` → `GetInstrumentOptionByInstrumentID` — 36/36 OI for اهرم 1405/07/29 (4972..475644, sum 3,343,767, retry 56981594284253648 141805) — no credential, matches page موقعیت باز 4,969 — E-035 candidate live via CDN;
- GEX real via CDN OI — `gex real 2.996e9 vs tvol 9.517e8 ratio 3.14` per-strike 0.56..73.8 (62000 4.43, 74000 3.59) — proves E-033 tvol proxy misleading, now candidate — E-036;
- SSE fallback live — onerror expected + polling count 4 trace valid — E-031 candidate live;
- D3 OIDC discovery live — 200 hasKeys — E-032 candidate live;
- OI alternatives live — 5 TSETMC alt hasOI false + scrape 5254 shell — E-034, justifies CDN as correct fallback when api.tsetmc.com limited;
- OI Main Scrape v0.1.0 — bodyText parse موقعیت های باز 4,969 (main.tsetmc.com) — proven live.

### Scope note

`v0.2.2-alpha` extends `v0.2.1-alpha`: OI/multiplier no longer blocked by `api.tsetmc.com` credential — CDN gives live OI 36/36 without credential per user hint “OI is on symbol page”. G-09/G-10 now candidate live via CDN, G-11 GEX real candidate via CDN. SVI full with OI weighting and Flow/SVI full remain for `v0.3.0`.

### Evidence

E-031 (SSE) + E-032 (D3) + E-033 (GEX misleading) + E-034 (alt fail) + E-035 (CDN 36/36) + E-036 (GEX real), fixtures SHA 26a80c5..eabc75b, 531b3df.

## [Unreleased]

The canonical contract is approved, but each implementation step
still requires its relevant owner approval, Class B decisions,
evidence, and gate closure. The data-source contract is present;
the next runtime-facing artifact is an approved `mw.AllRows` probe
and evidence entry `E-011`.
