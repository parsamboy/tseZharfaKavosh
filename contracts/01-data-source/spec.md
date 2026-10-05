# Data-source contract — layer 01

**Project:** `tseZharfaKavosh v0.1.0.0 → v0.2.0 Full`
**Contract:** canonical v6.0 + D-2026-10-05-001 (Full) + D-2026-10-05-002 (Privacy A)
**Status:** approved contract scaffold; platform evidence G-03..G-10 captured, G-09/10 needs separate source
**Next evidence:** `E-019..E-022` for G-11..G-18, plus new `E-023` for OI/multiplier separate source

## 1. Purpose

This document defines the data-source boundary before any market
data is consumed by the successor. It is a contract artifact,
not an adapter and not executable product code.

The source boundary must identify provenance, host, page/realm,
scope, schema, freshness, refresh behavior, and missing/unknown
semantics before downstream snapshot or computation work starts.

With **Full scope (D-2026-10-05-001)**, the boundary now covers *all* option sources needed for Greeks/IV, SVI, GEX/DEX, Flow, GARCH — not just the quote fields in AllRows.

## 2. Non-claims

This document does not claim that any candidate object, endpoint,
field, or refresh behavior is available on every TSETMC page. In
particular:

- `mw.AllRows` is now **confirmed** on `old.tsetmc.com/Loader.aspx?ParTree=15131F` (E-011, 3378 total, 1564 options) — but only for that host/realm;
- `mw.FilterCode`, `mw.Settings.Filters`, and `mw.SaveParams` are
  not treated as confirmed APIs without their own evidence;
- absence in one capture is not proof of global absence;
- missing data must remain `unknown` or `missing`, never silently
  become a default or fabricated value;
- no live probe is authorized by this document alone;
- **`z`/`bvol`/`yval` are NOT multiplier evidence** — per G-10/E-018, multiplier must come from an independent source even though `z=1000` is constant.

## 3. Required source record

Every source candidate must have a versioned record containing:

| Field | Requirement |
|---|---|
| `sourceId` | Stable source identifier |
| `claim` | One precise, testable claim |
| `host` | Host and page URL/realm |
| `parTree` | TSETMC page context, when applicable |
| `capturedAt` | Timestamp with timezone (Asia/Tehran) |
| `method` | Reproducible capture/probe method |
| `scope` | Rows, instruments, fields, and page lifecycle |
| `schemaVersion` | Versioned field and type description |
| `freshness` | Observed timestamp/generation and limits |
| `refreshBehavior` | What changes on refresh/navigation |
| `fixtureHash` | Hash of the immutable raw fixture |
| `evidenceId` | Ledger reference (`E-011`..`E-018` done, `E-023` next) |
| `status` | `unknown`, `candidate`, `confirmed`, `needs-separate`, or `rejected` |

The record must distinguish `owner-observed`,
`contract-verified`, and `platform-verified` provenance.

## 4. First validation target — DONE (G-03..G-08)

The first proposed target was a narrowly scoped `mw.AllRows`
probe. It was approved, executed, and is now **platform-verified**:

1. object exists as `Map` keyed by inscode on `old.tsetmc.com` (not `tsetmc.com/mw/inst`) — E-011;
2. schema: 113 keys, option fields `l18` (label), `l30` (expiry/underlying), `pc`/`pcc`/`pd1`/`po1` etc. — E-012..E-014;
3. completeness: 1564 options * 3378 total — growth 3362→3378 proves live;
4. refresh: F5 `+2` rows in 6 min — E-011 supplemental;
5. missing/stale: `pc=-`, `l30 05/09/04` stale, etc. — explicit.

This target is **closed — candidate/confirmed**.

## 5. Acceptance gate for E-011

`E-011` was registered when all of the following existed:

- owner approval/reference for the probe;
- exact host, page, realm, and `parTree`;
- raw immutable fixture;
- capture timestamp and timezone;
- probe method and environment;
- schema and completeness statement;
- refresh/lifecycle observation;
- fixture hash;
- explicit limitations and unknown fields;
- link from the evidence ledger and the relevant PENDING gate.

Status: **✅ confirmed** — same criteria now apply to the next sources.

## 6. Downstream dependency

No canonical snapshot, computation model, exact projection, bridge,
or product runtime may depend on this source until its evidence
status and scope satisfy the corresponding gate in
`docs/PENDING.md`.

## 7. Independent sources for Full scope (G-09 / G-10) — NEW for v0.2.0

Per live tests 2026-10-05 (G-09: 3376 rows, 113 keys, oiLikeKeys []; G-10: 3378 rows, z=1000 constant):

| Gate | Claim that MUST be proven separately | Why AllRows is insufficient | What a new source must show |
|---|---|---|---|
| **G-09 OI** | Open Interest per option contract | `tvol` is trade volume, not OI; 0 OI-like keys in 113 | Field name, per-contract OI value, timestamp, host, `E-023a` fixture |
| **G-10 multiplier** | Contract multiplier (e.g. 1000) per option | `z=1000` *looks* like multiplier but per spec must not be inferred; `bvol=1`, `yval` varies 27 values | Independent field or reference, not derived from `z`/`bvol`/label, `E-023b` fixture |

**Privacy (D-2026-10-05-002 Option A) applies:** OI/multiplier probes are read-only, no upload, no credential, no filter mutation — same as AllRows.

**Next probe design:** `g09-oi-source` and `g10-multiplier-source` LIMITED-TEST v2 — must target a *different* TSETMC endpoint/page than `15131F` (or an official contract spec page) and capture raw fixture + host + ParTree.

## 8. Full-scope source matrix for v0.2.0

| Need | Source | Gate | Status |
|---|---|---|---|
| Quotes (`l18`/`l30`/`pc`/`pd1`/`po1`…) | `old.tsetmc.com/Loader.aspx?ParTree=15131F` AllRows | G-03..G-08 | ✅ candidate/confirmed |
| Expiry calendar (23) | same AllRows `l30` expiry part | G-08 | ✅ candidate |
| OI per contract | **separate — TBD** | G-09 | ⏳ needs-separate → E-023a |
| Multiplier per contract | **separate — TBD** | G-10 | ⏳ needs-separate → E-023b |
| History close (for GARCH) | **separate — TBD** | G-11 | ⏳ needs-separate |
| Chain completeness (all underlyings) | same AllRows but full 1564 universe | G-07 | ✅ candidate → expand |

Until G-09/G-10 have their own `E-023` platform-verified fixtures, **GEX/DEX, Flow, and full G-11 are blocked** — they must not fabricate 1000 or 0 for missing values.
