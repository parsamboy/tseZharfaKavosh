# Release Checklist — v0.2.1-alpha (G-11 GARCH + SVI partial)

**Gate:** G-11 extended + G-15 second Alpha
**Tag:** v0.2.1-alpha
**Base:** v0.2.0-alpha (E-028)
**Scope:** Full scope incremental — adds GARCH (public) + SVI partial without OI (1-A, upgrade remembered) — GEX/Flow deferred per DEFERRED_REVIEW

## Checklist

- [x] GARCH v0.1.0 — 60 closes اهرم 72550..48294 sigma 0.032 ann 0.51 — E-029 platform-verified candidate
- [x] SVI v0.1.0 partial — chain 36 (18 strikes) S 72788 T 0.082 w 0.38/0.17/0.09 — E-030 candidate (1-A)
- [x] Greeks/IV still candidate (E-024)
- [x] G-09/G-10 stays candidate separate suspended (E-023 + v4 11 endpoints no-oi) — no fabrication, per owner “مسکوت”
- [x] DEFERRED_REVIEW updated: 1-A with upgrade remembered (0073566)
- [x] CHANGELOG [0.2.1-alpha] added
- [x] PENDING G-11 updated to candidate (Greeks/GARCH/SVI partial)
- [x] node --check still 33/33 + new svi/garch files

**Owner approval:** 2026-10-06 — 1-A with upgrade remembered (“ولی برای ارتقا در یادمان بماند”) + “انتخاب اول” for v0.2.1-alpha tag

**Next:** v0.2.1-beta (GARCH MLE + SVI fit) or v0.3.0 (GEX/Flow when credential re-enabled)
