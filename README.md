# tseZharfaKavosh v0.1.0.0

Successor governance scaffold for the `tseOptionZharfa` lineage.

**Current status: governance and legal scaffold only — not a
shipping product, not production-ready, and not an executable
release.**

## Scope of this release

`v0.1.0.0` intentionally contains no product implementation.
It does not ship an adapter, core logic, UI, compiler, live
probe, or executable market-data integration. The release is
limited to:

- the Smart-FFA-1.1 license and optional-donation policy;
- the canonical-path governance register;
- the canonical Architecture Contract v6.0;
- the six-layer project scaffold and release metadata.

The owner has recorded authority over the upstream, fork, and
successor scopes in `docs/DECISIONS.md` as
`D-2026-10-04-001`, optional donation as `D-2026-10-04-002`, and
canonical v6.0 approval as `D-2026-10-04-003`.

## Contract status

`docs/ARCHITECTURE_CONTRACT_v6.0.md` is the canonical architecture
and governance contract. Its Approval Record is approved for
architecture/governance. The release itself remains governance-only:
open technical gates do not authorize shipping or production-ready
claims.

The previous upstream and historical artifacts retain their own
lineage and notices. Smart-FFA-1.1 applies to this successor scope
only; it does not silently rewrite historical upstream licenses.

## Planned technical order

The canonical contract is approved, and each technical step still requires its own gate approval. The order now starts with the data-source spec:

1. `contracts/01-data-source/spec.md` (the initial contract artifact);
2. an owner-approved `mw.AllRows` probe and its fixture;
3. evidence entry `E-011`;
4. subsequent snapshot, computation, projection, bridge, and release
   gates.

No live probe or product code may be produced or executed before
its approval and associated gates.

## Repository map

- `LICENSE` — Smart-FFA-1.1;
- `DONATION.md` — optional, untracked donation policy;
- `docs/DECISIONS.md` — versioned Class B decision register;
- `docs/PENDING.md` — unresolved decisions and open gates;
- `docs/EVIDENCE_LEDGER.md` — evidence and provenance ledger;
- `docs/V5_CLEANUP.md` — v5 cleanup register;
- `docs/ARCHITECTURE_CONTRACT_v6.0.md` — canonical architecture/governance contract;
- `contracts/` — six-layer scaffold, with no implementation;
- historical source artifacts are not part of the `v0.1.0.0` product scope; preserve them separately only if an archival copy is required.

## Attribution and lineage

Original author: <https://t.me/p75ad>

Project group: <https://t.me/SmartOptionTSE>

Lineage: `tseOption_ExoticFilter v0.0.4.6` → `tseOptionZharfa v0.0.4.1` → `tseZharfaKavosh v0.1.0.0`

Copyright: `© ۱۴۰۵ — حقوق مؤلف محفوظ است`

This software is analytical and informational only. It does not
guarantee profit and does not provide investment advice. Trading
and compliance decisions remain the user's responsibility.

## Development

The repository currently contains historical artifacts and
validation tools in addition to the new governance scaffold. Do
not treat an existing artifact as a v0.1.0.0 product feature
without a corresponding decision, evidence, and release gate.

Development dependencies are declared in `package.json`. No
runtime command is exposed by this governance-only release.
