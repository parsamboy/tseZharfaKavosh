# Changelog

All notable changes to `tseZharfaKavosh` are recorded here.

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
