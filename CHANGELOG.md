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
- `underlyingFrom` and `r` remain provisional (`underlyingMap`, `0.30`) because the
  owner's answers for those two questions were ambiguous; both are flagged
  OWNER-DECISION-PENDING in the design doc §12.
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
