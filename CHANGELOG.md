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

## [Unreleased]

The canonical contract is approved, but each implementation step
still requires its relevant owner approval, Class B decisions,
evidence, and gate closure. The data-source contract is present;
the next runtime-facing artifact is an approved `mw.AllRows` probe
and evidence entry `E-011`.
