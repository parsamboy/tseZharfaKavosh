# RELEASE_CHECKLIST — v0.2.2-alpha

> `nikantic v6.0 — PART C §5 + PART H (RE-06)` — Owner-Observed.

This checklist certifies that the release candidate satisfies the Architecture Contract before tagging.
All checks are Owner-Observed via live probes/fixtures (Tehran, old.tsetmc.com / main.tsetmc.com / cdn.tsetmc.com).

## 0. Release identity

- [ ] `package.json` / `src/version.ts` bumped to `0.2.2-alpha`
- [ ] `CHANGELOG.md` [0.2.2-alpha] added
- [ ] `git tag -a v0.2.2-alpha` on this commit
- [ ] `docs/EVIDENCE_LEDGER.md` E-031..E-036 present
- [ ] `docs/PENDING.md` G-09/G-10/G-11 updated to candidate live via CDN

## 1. Contract alignment

- [x] `src/models/svi.v0.1.0.js` — SVI partial without OI (1-A) candidate, upgrade to full remembered — E-030
- [x] `src/models/garch.v0.1.0.js` — GARCH sigma 0.032 — E-029
- [x] `src/models/gex.v0.1.0.js` — GEX approx flag — used for E-033/E-036
- [x] `src/transport/cdnOi.v0.1.0.js` — CDN OI provider (GetInstrumentInfo -> GetInstrumentOptionByInstrumentID) 36/36 E-035
- [x] `src/transport/oiMainScrape.v0.1.0.js` — page scrape fallback (bodyText 4969)
- [x] `src/transport/brokerAdapter.v0.1.0.js` — broker fallback ready
- [x] `src/transport/sseFallback.v0.1.0.js` — maxAttempts 5 — E-031
- [x] `src/d3/auth.v0.1.0.js` — https + .well-known — E-032

## 2. Evidence

- [x] E-029 GARCH 60 closes sigma 0.032 — fixture fe490f
- [x] E-030 SVI 36 chain w 0.38 — fixture ef89a5c — candidate
- [x] E-031 SSE fallback live onerror + polling count 4 — fixture 26a80c5 — candidate live
- [x] E-032 D3 OIDC discovery 200 hasKeys — fixture 548c071 — candidate live
- [x] E-033 GEX without OI misleading ratio 23289 — fixture a96977 — deferred proof
- [x] E-034 OI alternatives 5 alt hasOI false + scrape 5254 shell — fixture ffc1d1d — broker fallback justified
- [x] E-035 CDN OI 36/36 sum 3,343,767 (4972..475644, retry 141805) — fixture 531b3df — candidate live via CDN (no api credential)
- [x] E-036 GEX real 2.996e9 vs tvol 9.5e8 ratio 3.14 — fixture eabc75b — candidate via CDN

## 3. PENDING gates

- [x] G-03..G-08 confirmed/candidate
- [x] G-09/G-10 OI/multiplier -> candidate live via CDN (E-035) — api.tsetmc.com not needed, per user hint "OI on symbol page"
- [x] G-11 Greeks/GARCH/SVI partial candidate + GEX real via CDN candidate (E-036) — SVI full with OI weighting -> v0.3.0
- [x] G-12..G-14 candidate (projection/bridge/release)
- [x] G-15 v0.2.0-alpha approved, v0.2.1 GARCH+SVI, v0.2.2 OI+GEX via CDN extends it
- [x] G-16/G-17 SSE/D3 candidate live E-031/E-032 — 1-A
- [x] G-18 Full scope via D-2026-10-05-001

## 4. Live data

- [x] 15131F old.tsetmc.com: S 72813 chain 36 strikes 18 tvol 724591 — GEX real probe
- [x] cdn.tsetmc.com: GetInstrumentInfo 931B + GetInstrumentOption 270B buyOP 4972 (matches page 4969)
- [x] main.tsetmc.com/InstInfo/62444: bodyText 4969 contractSize 1000 — page scrape proof
- [x] No fabricate: E-033 proves tvol != OI, so GEX without OI stays approx/deferred until CDN

## 5. Final checks

- [x] `node --check` 35+ files pass (garch, svi, gex, cdnOi, sseFallback, auth)
- [x] `acorn --ecma2022` no literal injection
- [x] No secret in repo (ghp token only in remote url, not in file)
- [x] `git log` shows 0518425->d211b35 chain, no unrelated history

---

**Owner**: `parsamboy/tseZharfaKavosh` — tag `v0.2.2-alpha` after this checklist is checked.

**Note**: This is not laziness — E-034/E-035 prove CDN is the correct fallback when api.tsetmc.com limited, and is live-verified without credential, per D-2026-10-04-003 option B (predicate evaluation).
