# Roadmap — v0.2.1 (GEX/DEX, Flow, SVI/Surface, GARCH) — OI-dependent

**Status:** **SUSPENDED for credential path per owner 2026-10-05** — `api.tsetmc.com` with TSETMC_USERNAME/PASSWORD مسکوت
**Base:** v0.2.0-alpha (E-028, tag v0.2.0-alpha)
**Decision:** Owner: “TSETMC_USERNAME/PASSWORD این ممکن نیست این روش دسترسی را فعلا مسکوت بگذار”

## 1. Why v0.2.1 credential path is suspended

v0.2.0 E-023 proved authenticated `api.tsetmc.com/Derivative/Option` is the ONLY documented OI source (11 public endpoints exhaustive hasOI false, CORS blocked, Arena timeout).
Owner cannot provide credentials now → `E-023a/b` stays `pending-credential` but **not blocking** v0.2.0-alpha (spec §7 needs-separate is valid).

Per privacy Option A, no credential will be requested again until owner explicitly re-enables.

## 2. Revised v0.2.1 — without credential (what CAN be done)

| Gate | Can do without OI? | How | Next evidence |
|---|---|---|---|
| **G-11e GARCH** | ✅ Yes | `ClosingPriceAll` history already found via `LoadInstHistory` (PClosing etc) — public, no auth, already in v2.3 | E-033 with public history probe |
| **G-11d SVI/Surface** | ✅ Partial without OI (1-A) — upgrade to full with OI in memory | Needs chain + IV (Greeks done) — can build SVI on quote chain 1559 without OI (OI only for weighting, not for fit) | E-032 partial |
| **G-11b GEX/DEX** | ❌ No | Requires OI + multiplier — without ContractSize/BuyOP cannot compute GEX — **deferred to v0.3.0** | suspended |
| **G-11c Flow** | ❌ No | Requires OI change — **deferred to v0.3.0** | suspended |
| **G-09/G-10** | ⏸️ Suspended | Keep `candidate separate` status, no fabrication | E-023 stays |

## 3. New order (credential-free)

```
v0.2.1-alpha: GARCH + SVI partial (1-A, upgrade to full with OI remembered) (public history) + SVI partial (without OI weighting)
v0.2.1-beta:  polish SVI/Surface
v0.3.0:       GEX/Flow when credential re-enabled or public alternative found (no ETA — not laziness)
```

## 4. What is NOT done

- No `z=1000` fabrication for multiplier
- No `tvol` as OI
- No request for TSETMC credentials until owner says so

## 5. Immediate next (no credential needed)

1. Probe `ClosingPriceAll` history for GARCH (public)
2. SVI skeleton on top of Greeks + chain 1559

