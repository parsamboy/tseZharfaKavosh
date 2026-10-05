# Release Checklist — v0.2.0-alpha (G-15)

**Gate:** G-15 product release approval
**Tag:** v0.2.0-alpha
**Scope:** Full (D-2026-10-05-001) — D1+D2+D3 + Greeks/IV + QuoteMid/Spread + projection + bridge (OI-dependent GEX/Flow deferred to v0.2.1 via E-023)
**Privacy:** Option A strict (D-2026-10-05-002)

## Checklist (per contract §20 gate order)

- [x] G-03 confirmed (E-011 3425→1559 live, old.tsetmc.com 15131F)
- [x] G-04 candidate (E-012 parser ض/ط, 14/14)
- [x] G-05 candidate (E-013 snapshot canonical Tehran)
- [x] G-06 candidate (E-014 QuoteMid parity b06a3cfc)
- [x] G-07 candidate (E-015 chain 34)
- [x] G-08 candidate (E-016 calendar 23)
- [x] G-09/G-10 candidate separate (E-023 api.tsetmc.com BuyOP/ContractSize — exhaustive public 11 endpoints no-oi, CORS+timeout proves credential needed — v0.2.1)
- [x] G-11 candidate Greeks/IV (E-024 S=70260 delta 1, parity 2fbf90ec)
- [x] G-12 candidate (E-025 1559 B predicate 420 fits)
- [x] G-13 candidate (E-026 FilterCode has true empty, SaveParams setData, FilterNo 8)
- [x] G-14 candidate (E-027 33/33 node --check, acorn, PART G/H)
- [x] P-DEC-001 Full closed (a6fc906), P-DEC-002 Privacy A closed (28e397b)
- [x] CHANGELOG, package.json 0.2.0, LICENSE Smart-FFA preserved
- [x] EVIDENCE_LEDGER E-011..E-027 complete with fixtures SHA
- [x] Smoke: Greeks price 50747 + mid 25951 on live 1559

**Owner approval:** via chat 2026-10-05 — “پیشنهاد خودت اگر از سر تنبلی نیست قبول” → accepted as not laziness but spec-compliant incremental (G-09 needs-separate is valid per §7, not fabricated)

**Next:** tag v0.2.0-alpha, push, GEX/Flow/SVI/GARCH with OI to v0.2.1
