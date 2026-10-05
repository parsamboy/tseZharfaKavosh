# Data-source contract — layer 01

**Project:** `tseZharfaKavosh v0.1.0.0`
**Contract:** canonical v6.0
**Status:** approved contract scaffold; platform evidence pending
**Next evidence:** `E-011` after an approved `mw.AllRows` probe

## 1. Purpose

This document defines the data-source boundary before any market
data is consumed by the successor. It is a contract artifact,
not an adapter and not executable product code.

The source boundary must identify provenance, host, page/realm,
scope, schema, freshness, refresh behavior, and missing/unknown
semantics before downstream snapshot or computation work starts.

## 2. Non-claims

This document does not claim that any candidate object, endpoint,
field, or refresh behavior is available on every TSETMC page. In
particular:

- `mw.AllRows` is an architecture hypothesis until evidence is
  captured;
- `mw.FilterCode`, `mw.Settings.Filters`, and `mw.SaveParams` are
  not treated as confirmed APIs without their own evidence;
- absence in one capture is not proof of global absence;
- missing data must remain `unknown` or `missing`, never silently
  become a default or fabricated value;
- no live probe is authorized by this document alone.

## 3. Required source record

Every source candidate must have a versioned record containing:

| Field | Requirement |
|---|---|
| `sourceId` | Stable source identifier |
| `claim` | One precise, testable claim |
| `host` | Host and page URL/realm |
| `parTree` | TSETMC page context, when applicable |
| `capturedAt` | Timestamp with timezone |
| `method` | Reproducible capture/probe method |
| `scope` | Rows, instruments, fields, and page lifecycle |
| `schemaVersion` | Versioned field and type description |
| `freshness` | Observed timestamp/generation and limits |
| `refreshBehavior` | What changes on refresh/navigation |
| `fixtureHash` | Hash of the immutable raw fixture |
| `evidenceId` | Ledger reference, initially `E-011` for the first probe |
| `status` | `unknown`, `candidate`, `confirmed`, or `rejected` |

The record must distinguish `owner-observed`,
`contract-verified`, and `platform-verified` provenance.

## 4. First validation target

The first proposed target is a narrowly scoped `mw.AllRows`
probe. It must be approved before execution and must capture only
the evidence necessary to answer:

1. whether the object exists in the specified page/realm;
2. what row collection and field schema are observable;
3. whether the collection is complete for the claimed scope;
4. how refresh and lifecycle affect the collection;
5. which values are missing, unknown, stale, or malformed.

The probe must not modify filters, submit credentials, upload
market data, call an unapproved endpoint, or infer fields that
were not observed.

## 5. Acceptance gate for E-011

`E-011` may be registered only when all of the following exist:

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

A failed or partial probe remains evidence with its actual status;
it must not be converted into a positive source claim.

## 6. Downstream dependency

No canonical snapshot, computation model, exact projection, bridge,
or product runtime may depend on this source until its evidence
status and scope satisfy the corresponding gate in
`docs/PENDING.md`.
