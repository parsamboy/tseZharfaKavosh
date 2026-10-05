# Roadmap — v0.2.1 (GEX/DEX, Flow, SVI/Surface, GARCH) — OI-dependent

**Status:** planning — depends on E-023a/b credential probe
**Base:** v0.2.0-alpha (E-028, tag v0.2.0-alpha) — G-03..G-14 candidate, G-15 Alpha approved
**Goal:** close remaining Full scope that was deferred as spec-valid `needs-separate` (not laziness)

## 1. Why v0.2.1 exists

v0.2.0-alpha shipped Greeks/IV + QuoteMid + snapshot/projection/bridge **without fabricating OI**.
Per spec v0.2.0 §7 and E-023 (+ v4 11 endpoints exhaustive hasOI false), OI/multiplier require authenticated `api.tsetmc.com/Derivative/Option` (BuyOP/SellOP/YesterdayOP + ContractSize). Browser CORS blocked + Arena timeout proves credential must be Node from Tehran.

v0.2.1 will fill that.

## 2. Gates to close in v0.2.1

| Gate | What | Source | Evidence next |
|---|---|---|---|
| **G-09a** | OI per contract | `api.tsetmc.com/Derivative/Option` BuyOP/SellOP/YesterdayOP | E-023a fixture (Node v3: `node probes/g09.oi-source.limited-test.v3.node.js`) |
| **G-10a** | multiplier per contract | same endpoint ContractSize | E-023b fixture |
| **G-07b** | chain canonical with OI/multiplier | AllRows 1559 + OI/multiplier join | E-029 |
| **G-11b** | GEX/DEX | requires chain+OI+multiplier | E-030 + src/models/gex.v0.1.0.js |
| **G-11c** | Flow (money flow) | ClientTypeAll flow=3 already 200 csv, but need per-option flow | E-031 |
| **G-11d** | SVI + VolSurface | requires chain+IV (Greeks done) | E-032 + src/models/svi.v0.1.0.js |
| **G-11e** | GARCH | requires ClosingPriceAll history (InstHistory) | E-033 + history probe v2.3 was PClosing not OI |

## 3. Order (dependency-driven)

```
E-023a/b (credential) 
  -> G-07b chain canonical 
    -> G-11b GEX/DEX + G-11c Flow (both need OI)
      -> G-11d SVI/Surface (needs GEX chain + IV)
  -> G-11e GARCH (needs ClosingPriceAll history — already found endpoint, separate)
```

No step may fabricate `z=1000` or `tvol` for OI.

## 4. Immediate next probes (ready, need Tehran network + credentials)

1. `node probes/g09.oi-source.limited-test.v3.node.js` — capture 2 samples (ضهرم7050) BuyOP/SellOP/ContractSize → fixtures/g09.oi.fixture.2026-10-05.credential.json + fixtures/g10.multiplier.fixture.credential.json
2. `src/models/gex.v0.1.0.js` skeleton (already can be drafted without data, but parity needs live OI)
3. `src/models/svi.v0.1.0.js` skeleton

## 5. Privacy

Per D-2026-10-05-002 Option A strict: OI fetch is local-first, Bearer token in memory only, no upload, per-job opt-in for any cloud.

## 6. Release plan

- v0.2.1-alpha (GEX/Flow) — after E-023a/b
- v0.2.1-beta (SVI/Surface) — after E-032
- v0.2.1 (final) — GARCH + full Full scope closed, then G-15 re-approved for v0.2.1

Owner to provide TSETMC_USERNAME/PASSWORD when ready — until then v0.2.0-alpha remains current Alpha.
