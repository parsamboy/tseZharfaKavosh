# Changelog

All notable changes to `tseZharfaKavosh` are recorded here.

## [Unreleased]

### Fixed — the apply probe's rollback repaired the mirror instead of restoring it, and a flaky absolute millisecond bound failed the engine suite on a busy machine (E-072)

`probes/aSettingsApply.harness.v1.js` is new: it runs the apply probe file itself
inside a vm context with a minimal fake site, so all five scenarios are
reproducible without the owner. 108 checks pass — defaults, stored `wideReach`,
garbage storage (nothing registered), an inline override, and a change made
through the panel's own `applyChange` → `save` path.

Building it found two defects, and neither was in the code the harness was
written to test:

**The rollback repaired instead of restoring.** `restoreState()` set
`mw.FilterCode` to the *slot's* code when the mirror had been empty. That leaves
the page in a state it had never been in, and makes `mirrorRestored` report a
rollback that did not actually happen. It now restores `savedFilterCode`
verbatim — restore, do not repair.

**An absolute millisecond bound is a test that depends on the machine.**
`engine.parity.v1.js` asserted `detectDirty < 3.0ms` while its own comment admits
a 1.4–2.6ms variance, so a loaded machine fails the suite for no code reason. It
did exactly that during this session (162/1). The bound is now a ratio against
the same run's own full cycle, which is machine-independent; five consecutive
runs are 163/0.

The synthetic population is measured, not guessed. The first version produced
zero hidden rows, which would have made every hidden-row assertion vacuous, so a
price sweep against the engine located where each verdict class actually lives:
the solved IV climbs monotonically with price, so one ladder crosses `ivMax`
(`fail-iv-range` → HIDE) and keeps climbing into the q10 pin
(`no-iv-solution` → stays visible). The harness now asserts the population itself
exercises keep, hide *and* fail-open, so it cannot silently degrade again.

### Verified — the settings now drive the LIVE filter (E-071, owner 2026-10-24T07:05:08.372Z): G-30 closed

`probes/aSettingsApply.live.v1.js` ran on `old.tsetmc.com/Loader.aspx?ParTree=15131F`.
This time a filter slot was active (`filterNo 4`), which E-070 had not been.

With the shipped defaults the engine judged 188 of 1987 symbols — 187 kept, 1
hidden, 1799 fail-open — and published `snap-1-1987` with `configHash
fs1-df750af0` over a 249-byte bitset. The dual-trigger guard refused to re-run on
the same snapshotId+hash. The repo-generated A body (430 bytes, fnv1a `38fe0c59`,
returned byte for byte by `PrepareFilterCode`) went into slot 4 and the mirror,
then `SaveParams` and `RenderData`.

On the real page A read 1340 distinct rows and produced **exactly** the
projection's verdicts — 187 keep / 1 hide / 1152 fail-open, `verdictsMatchProjection
true`. The inverted phase flipped 188 rows with 0 mismatches; clearing produced 0
reads; rollback restored the slot, the mirror and the persisted storage and
verified the bytes.

Two identities worth keeping:

- **judged ⊆ evaluated.** 187 + 1 = 188 = everything the engine judged, and the
  647 rows the site never rendered all fall inside the 1799 insufficient-data
  rows. The funnel never judges a row the page does not show — the same property
  E-068 showed.
- **data drift is real.** E-070 at 05:56:26Z with the identical hash judged 143
  of 1987 with 0 hidden; this run at 07:05:08Z judged 188 with 1 hidden. +45
  judged and +1 hidden in 69 minutes with an unchanged config. Any live settings
  delta must be attributed to drift before it is attributed to a variable.

Hygiene held under a real slot: the persisted blob was 48,489 bytes and the active
slot already held 46,424 bytes of `FilterCode` before the run — larger than the
4096-byte limit the site enforces. The run replaced it and restored it byte for
byte.

What remains open is not machinery but product: the IV window, and the 1525 rows
that never reach the option parser at all. Those are invisible to the funnel — the
projection fail-opens them — so only the A/B registration can act on them.

### Added — the settings now reach the live filter, not just the measurement (E-070 owner run + E-071 apply probe)

The UX settings panel ran live on `old.tsetmc.com/Loader.aspx?ParTree=15131F`
(owner, 2026-10-24T05:56:26.341Z) with the 46,484-byte browser bundle: all four
globals preflighted true, the panel built its 16 controls from `SCHEMA`, and every
variable moved the measured counts. Under the shipped defaults the engine judges
143 of 1987 rows (7.2%): 143 kept, **0 hidden**, 1844 fail-open; `ivStatus`
{ok 142, no-iv-solution 1}; `failOpenReason` {not a confirmed option 1525,
book-too-wide 100, price-outside-arbitrage-bounds 30, missing S/K 23, no usable
market price 166}. The `wideReach` preset takes judged 143 → 194 (+51, 0 lost
from kept): all 30 out-of-bounds rows recover, only 21 of the 100 book-too-wide
do. Turning the IV filter off on top changed nothing — an honest null result,
because hidden was already 0.

One gap the run exposed: `filterNo` was `-1`, so **no filter slot was
registered** — the panel changed the measurement, not what the page shows.

`probes/aSettingsApply.live.v1.js` closes that gap. It takes the settings from
`window.__FUNNEL_SETTINGS_OVERRIDE` > storage > defaults, normalises them through
`TseFunnelSettings`, runs B with them and publishes, registers the repo-generated
A body through the proven E-064/E-068 path, reads the verdicts back through
tallying Proxies in real / inverted / cleared phases, then rolls everything back
(filter slot, mirror, persisted storage). The guard hash is
`TseFunnelSettings.configHash(settings)` — never `configVersion + FilterCode.length`
— and the probe proves it is sensitive to **all 16 variables** by moving each one
alone and requiring the hash to change.

The node harness (`/home/user/applyHarness.js`, 5 scenarios) passes: defaults,
stored `wideReach`, garbage storage (nothing registered), an inline override, and
a change made through the panel's own `applyChange` → `save` path. Two harness
defects were found and fixed on the way, and both were the known traps rather than
new ones: the A body references a bare global `mw`, so a site simulator written in
the host realm must expose it or every `eval` throws and "A matched the
projection" becomes vacuously true over zero rows; and a hash probe that asks for
one hard-coded value is blind when the owner already chose that value — it now
moves every variable and skips candidates the normalizer repairs back.

The first `SETTINGS_JSON` after load shows judged 143 → 142 with **no variable
changed**: `mw.AllRows` mutates in place, so any live settings comparison must
attribute data drift before claiming an effect.

### Added — the UX funnel settings layer (E-069, owner decision 2026-10-21): «همه متغیرها در تنظیمات UX قابل تغییر باشند»

The owner's answer to G-29 was not one of the four offered directions (keep /
narrow the window / widen the guards / measure first) but the capability itself:
**every** funnel variable must be changeable from the UX settings.

`src/ux/funnelSettings.v0.1.0.js` is that layer — 16 variables (7 number, 5 bool,
4 enum), each with a Persian label, help text, UI range/choices, a default read
FROM the engine, five presets, injected-storage persistence, and a `configHash`
that changes when any single variable changes. It is now the 6th module of the
generated browser bundle (`window.TseFunnelSettings`, 46,484 bytes).

**The one rule, enforced by a test rather than by discipline:** the engine is the
single source of truth for values and ranges. The UX layer adds only labels,
persistence and the hash, and `probes/uxSettings.parity.v1.js` (191/191) proves
every declared UI range by probing the engine's own normalizer — so a range can
only exist in one place.

`probes/aSettingsPanel.live.v1.js` builds the RTL panel with one control per
variable generated from the schema, recomputes the engine over `mw.AllRows` on
every change and reports the delta against the shipped defaults. It is read-only
with respect to the site (no filter slot, no `SaveParams`, no `RenderData`); the
only thing it writes is its own `localStorage` key, and
`window.__FUNNEL_SETTINGS_CLEANUP()` removes the panel and that key.

### Fixed — `normalizeFunnelConfig` silently opted into the fixed maturity on a bogus `TMode` (found by the new settings parity, E-069)

`normalizeFunnelConfig({ TMode: 'bogus' })` returned `'fixed'`, switching every row
to the pre-q9 fixed `30/365` maturity — the same "silently wrong config" the
function's own docstring says it is fail-CLOSED to prevent. It was invisible until
every variable became user-editable, because a garbage value could previously only
come from a caller who had already read the source. Now only `'dte'` and `'fixed'`
pass; anything else (including absent) takes the default `'dte'`. The old assertion
`bogus -> fixed` was an incidental encoding of the previous ternary and
contradicted its own test name ("fixed is opt-in" — a typo should not opt you in).

Engine parity 162 -> **163/163**, bundle parity 24/24 -> **54/54** (new section 7:
bundled settings vs source), UX settings parity **191/191**.
### Verified — LIVE real projection re-run with the fixed bundle (E-068, owner, old.tsetmc.com 2026-10-21T08:10:29Z): the chain survives the engine fix, and the filter hides 5 rows

The owner re-ran `probes/aRealProjection.live.v1.js` — **the same probe, byte for
byte** — after pasting the bundle rebuilt for E-066's clock fix.

| | E-065 (buggy clock) | E-068 (fixed) |
|---|---|---|
| computed | 11 | **365** (33x) |
| kept | 11 | 360 |
| hidden | 0 | **5** |
| failOpen | 2742 | 2770 |
| rows | 2753 | 3135 |
| evaluated by the site | 1965 (71.4%) | 2323 (74.1%) |
| reads | 3930 | 4646 (= 2 x 2323) |
| engine elapsedMs | 20.1 | 41.8 |

REAL: `reads 4646 over 2323 distinct inscodes, verdicts {keep 360, hide 5,
failOpen 1958} = expected exactly, verdictsMatchProjection TRUE`. INVERTED:
`flippedWithProjection 365, mismatches 0`. CLEARED: `reads 0`. ROLLBACK: slot,
mirror and persisted storage all restored (889 chars, unchanged).

**The chain is independent of what B decides.** E-065 published 11 judgements
because of the clock bug; with only the engine behind the projection changed,
the same probe publishes 365 and every property still holds. A is a pure
function of the published bitset.

**The filter now hides rows, and the reach is the product finding.** All 5
hidden rows are `ivStatus: fail-iv-range` with iv between 2.5 and 2.902 —
genuinely above the owner's `ivMax 2.5`, the first live run where the window has
real teeth. But the engine judges only 365 of 3135 rows (11.6%), and of the 2323
the site evaluates, A keeps 360 and fails open on 1958 (84.3%). It is right
about every row it judges and silent on 5 of every 6 — the silence being E-067's
598 no-usable-price rows and 84 `dte 0` rows failing open by the owner's own
q8/q9 design.

G-28 is closed by this run. **G-29 opens** for the product decision on the IV
window and the price guards, measured by the new
`probes/aConfigSweep.live.v1.js` (14 configs x the whole live population).

### Added — `probes/aConfigSweep.live.v1.js` (G-29): what would each funnel config actually do to the live page?

Read-only. For each candidate config it builds an engine with that config, builds
the underlying map from `mw.AllRows` and runs `computeFunnel` over every row,
reporting judged / kept / hidden / fail-open, the reason histograms, the IV
distribution and the **delta against the shipped defaults** (`newlyJudged`,
`newlyHidden`, `lostFromKept`) with samples of the rows each change adds. The
shipped-defaults variant is checked against the E-067/E-068 band, and every
variant is cross-checked by an identity
(`judged = judgedBase + newlyJudged - lostFromJudged`) so a sweep that proves
nothing reports `no-effect` instead of a vacuous pass.
### Verified — LIVE funnel re-run with the fixed bundle (E-067, owner, old.tsetmc.com 2026-10-21T07:55:29Z): computed 14 -> 353, and the filter removes 2 rows

The owner re-pasted the rebuilt bundle and re-ran the read-only diagnostic.

| | E-066 (buggy clock) | E-067 (fixed) |
|---|---|---|
| computed | 14 | **353** |
| engineElapsedMs | 20.7 | 47.7 |
| `iv-or-greeks-failed: price-outside-arbitrage-bounds` | **326** | **0** |
| genuine `price-outside-arbitrage-bounds` | hidden inside the 326 | **34** |

**The fix is confirmed by the two columns agreeing where they previously could
not:** `funnelReason` and `priceAttribution` now report the *same* population for
every price reason — `no usable market price 389 = no-book-and-no-trade 389`,
`price-outside-arbitrage-bounds 34 = 34`, `book-too-wide 175 = 175`. Before the
fix those two columns disagreed by 326 rows, because the engine rejected on a
bogus `T` while the probe attributed on the real one.

**The IV distribution is real now:** p50 **0.836**, p90 **1.365**, min 0.010,
max 2.9999999. E-045 measured p50 1.0522 / p90 2.1424 at the shipped fixed
`T = 30/365` — the correct per-option maturity lowers the implied vols, exactly
as the model predicts.

### The filter removes 2 rows

Of the 951 confirmed rows that reached the IV filter:

| ivStatus | rows | verdict |
|---|---|---|
| `ok` | 344 | IV inside `[0.05, 2.5]` → **kept** |
| `no-iv-solution` | 7 | pinned at the solver's own limits `[0.01, 3.0]` → kept visible by q10 |
| `fail-iv-range` | 2 | solvable IV outside the window → **hidden** |

Only **9 of 353** solved IVs fall outside `[0.05, 2.5]`, and 7 of those are
pinned where there is no solution at all. The bitset carries 351 ones and
**2 zeros**. This reproduces E-054's live finding — the default window removes
essentially nothing — now with the real engine and the real chain.

**Reconciliation with E-046** (411–615 solved): the difference is the q8 price
guards. `175 book-too-wide + 34 price-outside-arbitrage-bounds = 209` rows the
engine refuses, and `353 + 209 = 562`, inside E-046's range.

**The dominant loss is the price, and it is the owner's own design:** 598 of 1058
confirmed rows (56.6%) have no usable market price — 389 with a one-sided book
(`pd1 > 0, po1 = 0`) and no trade (`tno = 0`), 175 with a spread wider than
`maxSpreadPct 0.20`, 34 outside the no-arbitrage band. All fail open and stay
visible, which is q8's "never a fabricated price". A further 84 (7.9%) fail on
maturity — every sample is expiry `1405/07/29`, i.e. today with `dte 0`.

**Precision:** E-054's window decision was *not* measured with the buggy engine —
`probes/ivfilter.borderline.live.v1.js` resolves today with `new Date()`. The
clock bug was confined to `bEngine`'s default options, which is why the
standalone live probes and the engine disagreed by an order of magnitude.

New open gate **G-28**: the product decision on the window and on the 598
no-price rows, and the live measurement of the chain's effect through A.

Parity unchanged at **162/162**, bundle parity **24/24**.
### Fixed — the engine's default clock poisoned every maturity (E-066): 162/162, bundle parity 24/24

`probes/aFunnelDiagnostic.live.v1.js` ran live and isolated the wall behind E-065's
`computed 11`. **The underlying relation was not the problem** — the hypothesis from
G-27 was refuted by the data:

| what was suspected | what the live histogram says |
|---|---|
| the G-11/G-12 `underlyingMap` relation (sample-only since E-012) starves the funnel | **refuted**: 1737 map entries cover 19 of 20 option underlyings; S resolved for **1014 of 1037** confirmed rows (97.8%). Only `طعام` (23 rows) has no stock row at all |
| the parser rejects the options | **refuted**: 1037 confirmed, 257 candidate, and the 1759 rejected are the stocks and funds at the head of AllRows |

The wall was the **market-price guard**: 326 of the 333 rows that *do* have a usable
price were rejected with `price-outside-arbitrage-bounds`.

Reproducing that locally gave a byte-identical reason, and the cause was not a market
fact — it was a **clock bug**:

- `createBEngine()` with default options used **one** clock for two different questions.
- `now` defaults to `performance.now()` (monotonic, **ms since page load**) and
  `resolveT` fed it straight into `calendar(expiry, ms)` → `new Date(ms)`.
- In a browser `performance` exists, so every expiry was measured from **1970-01-01**:
  `dte 20775` instead of 28, `T = 56.9 years` instead of `0.0767`.
- With `r = 0.30` and `T = 56.9`, `exp(-r·T) ≈ 2.6e-8`, so a call's no-arbitrage
  bounds collapse from `[S − K·disc, S]` to **`[S, S]`** — and any price that is not
  exactly the spot is `price-outside-arbitrage-bounds`. **326 of 333 rows**, exactly
  the live count.

**The suite was blind to it:** `probes/engine.parity.v1.js` has always injected
`now: FIXED_NOW_MS`, an *epoch* value, so the two clocks were never distinguished.
The bug only appears when the engine is created with **default options** where
`performance` exists — which is precisely what both live probes do.

**Fix:** a separate `nowEpoch` (default `Date.now()`) used only for maturity
resolution, with **no** fallback to `now` — guessing which kind of clock a caller
injected is the mistake that caused this. The parity suite pins both clocks.

New regression section 9 asserts, against the **generated bundle** in a context that
has `performance`:

- default-options maturity is `dte/365`, not ~57 years
- a monotonic `now` cannot poison the maturity
- an explicit `nowEpoch` wins over a monotonic `now`
- the suite's own pinning (`now` + `nowEpoch`) still resolves dte exactly

`pass=162 fail=0` (was 156), bundle parity **24/24** unchanged, `node --check` clean.

Also worth recording from E-066: the 84 rows whose T does not resolve all carry
expiry `1405/07/29` — **today**, `dte 0` — and the engine correctly refuses to
fabricate a maturity, so they fail open and stay visible. 8% of confirmed rows
bypass the filter by design. And the 7 rows that "passed" before the fix all carried
`iv 2.9999999108910558` — the IV solver cap, labelled `no-iv-solution` and kept
visible by q10 — so even those 7 were artefacts of the wrong T.
### Verified — LIVE the real engine projection end to end (E-065, owner, old.tsetmc.com 2026-10-21T07:09:51Z): the A<->B chain holds on real data; the engine judges 11 of 2753 rows

`probes/aRealProjection.live.v1.js` ran live after pasting the generated
`src/engine/tseEngine.browser.v1.js` bundle.

| phase | reads | distinct | verdicts | expected | result |
|---|---|---|---|---|---|
| REAL | 3930 | 1965 | `keep 11, hide 0, failOpen 1954` | identical | **verdictsMatchProjection** |
| INVERTED | 3930 | 1965 | `keep 0, hide 11, failOpen 1954` | — | **flipsExactly**, mismatches 0 |
| CLEARED | 0 | 0 | — | — | **noReads** |

Rollback restored the slot, the mirror **and** storage: the persisted
`MarketWatchSettings` stayed at 889 chars with an empty active slot, byte-count
identical to before the run, so the E-064 clean state survived.

- **The chain works.** First time the *real* engine output met the *real*
  repo-generated body (430 B, fnv1a `38fe0c59`, `compiledIdentical`) on *real*
  data. A is a pure function of the published projection.
- **Coverage reproduced exactly:** 1965 of 2753 rows (71.4%) reach the filter —
  identical to E-063, so 71.4% is a stable property of this page.
- **3930 reads = exactly 2 x 1965** again, independently reproducing E-063/E-062:
  the page re-renders on its own timer inside the measurement window.
- **The dual-trigger guard worked live:** the second `run()` with the same
  snapshotId/configHash returned `{published: false, reason: 'no-change'}`.
- **The finding:** the engine judged **11 of 2753** rows (0.4%) and hid **0**.
  Today the real engine is a no-op filter on this page — and that contradicts
  E-045/E-046, which counted 605 and 1049 option rows here and solved 411-615.

### Added — `probes/aFunnelDiagnostic.live.v1.js` (G-27, E-066): why are 2742 rows insufficient-data?

The v1 probe cannot answer that, and this is a measurement defect rather than a
null result: its fail-open sample is drawn from the head of `mw.AllRows`, and the
head of AllRows is stocks and funds, which the parser correctly rejects as
`'not a confirmed option'` — all six samples were `parsed: 'rejected'`. A sample
of non-option rows cannot diagnose the option rows (the E-060 blindness lesson
again).

The diagnostic is **read-only** (no slot write, no `SaveParams`, no
`RenderData`, no storage, no timer) and buckets **every** row by parse status and
by the funnel step that stopped it:

| step | what is counted |
|---|---|
| S | is `parsed.underlying` in the underlying map — and if not, does a stock row with that `l18` exist and what is its `pc`? |
| T | does the Jalali calendar resolve the expiry (dte histogram) |
| price | which hybrid priority (q8) applies, and if none, why: no book / book too wide / outside the no-arbitrage band / no trade |
| IV | ivStatus and IV buckets for the rows that get that far |

It also reports the underlying map's size and every option underlying that
misses it — the direct read on the G-11/G-12 relation that has been
"sample-only" since E-012. Validated on four population shapes in node
(full / missing stock rows / missing book / no options).

Parity unchanged at **156/156**; bundle parity **24/24**; `node --check` passes
on every new file.
### Added — the engine runs in the browser, and a live probe measures its real projection

**`src/engine/tseEngine.browser.v1.js`** (new, generated) — the five pure modules the
B engine needs, concatenated into ONE browser script by `tools/buildBrowserBundle.v1.js`:

```
src/models/jalaliCalendar.v0.1.0.js   calendar -> T = DTE/365 (q9)
src/optionParser.v0.1.0.js            l18/l30 -> strike/kind/expiry
src/models/greeks.v0.1.0.js           impliedVol / bsGreeks
src/engine/aLookup.v0.1.0.js          buildFilterCodeBody() - the A body generator
src/engine/bEngine.v0.1.0.js          the engine
```

It exposes `window.TseBEngine`, `window.TseModels` and `window.TseLookup`. `aLookup` is
bundled deliberately: the live probe registers the A body the **repo generates**, not a
hand-copied literal, so what is measured live is the body production would ship.

**`probes/bundle.parity.v1.js`** (new) — proves the generated bundle changed nothing that
matters: 24/24, comparing the bundled modules against the originals (`VERSION`,
`DEFAULT_FUNNEL_CONFIG`, `buildFilterCodeBody()` byte-identical at 430 bytes,
`computeFunnel` over 900 rows mixing pass / fail-iv-range / insufficient-data, a full
`run()` + `publish()` cycle with identical bitset and known bytes, and every fail-open
corner of the executed body).

**`probes/aRealProjection.live.v1.js`** (new) — the first probe that lets the **real
engine** compute from **real page data**:

| phase | what is published | what must happen |
|---|---|---|
| REAL | the engine's own projection from `mw.AllRows` | the verdicts A computes must equal the projection's verdicts, row for row |
| INVERTED | the same projection with every pass bit flipped | every verdict must flip with it — A holds no state |
| CLEARED | `__B_index = null` | zero index reads — the body's own fail-open guard ran |

then rollback of the slot, the mirror **and** the persisted storage (E-059/E-064).

The bundle builder strips comments and blank lines with a real lexer (strings, template
literals and regex literals are never touched — `optionParser` and `jalaliCalendar` contain
regex literals a naive stripper would eat), taking 56,029 raw bytes to a 34,611-byte
bundle; nothing else changes.

A node harness (five page shapes) caught three probe bugs before delivery: the `verdicts`
counter used `failOpen` while `verdictOf()` returned `fail-open`, so fail-open rows were
counted under a stray key and reported as zero; the success status was reachable with
`distinctCount === 0`, so a page that never evaluates the mirror reported success; and the
index Proxy only counted keys present in the projection, making symbols that arrive after
publication invisible when they are exactly the rows that must fail open.

Parity unchanged at **156/156**; `node --check` passes on every new file.
### Verified — LIVE slot hygiene clean mode (E-064, owner, old.tsetmc.com 2026-10-21T06:22Z): the owner's page is clean, in memory and in storage

`probes/aSlotHygiene.live.v1.js` ran in clean mode (`window.__A_CLEAN = true`).

- Before: slot `i=1` (active, `FilterNo` 1) held the 1409-byte probe body with fnv1a
  `f3eaeaf0` — verified in-repo to be **exactly** the instrumented body of
  `probes/aTrigger.live.v1.js`. The mirror matched it, and the persisted copy (2348 chars)
  held it too.
- After: **all four slots empty**, the persisted copy down to **889 chars with all slots
  empty**, `afterCounts {memory 0, persisted 0, cleanedSlots 1}`. Status `cleaned`.
- The clean mode touched **one** slot and left the other three — and every filter the owner
  had saved — untouched, which is what the classification guard was for.
- **New datum:** the page reported `__A_SCOPE_RUNS: 418545`. The instrumented body was
  evaluated **418,545 times** by the site's own render loop while it sat in the active slot.
  That independently corroborates E-061's mechanism (the site really does
  `eval(mw.FilterCode)` per row, on every render, indefinitely) and shows its cost side: a
  body in the active slot runs at the page's cadence for as long as it stays there, so A
  must stay cheap per row (~12.9 µs local / 16.2 µs live).
- Page state after this run: no probe body in memory or storage, no `mw.__B_*`, no
  `window.TseBEngine` — the page is exactly as the owner left it, and nothing of ours runs.

Parity unchanged at **156/156**. The A registration chain (G-21/G-22/G-23/G-24/G-25) is
complete and the live page is clean; what remains is the product work: B publishing a real
projection and A being registered permanently.


### Verified — LIVE real registration v4 (E-063, owner, old.tsetmc.com 2026-10-21T06:13Z): **A works on the whole population — G-25 closed**

`probes/aRegisterRealV4.live.v1.js` published a projection over **every** inscode in
`mw.AllRows` (2753 rows, 345 bytes) as read-tallying Proxies, and registered the unchanged
430-byte body through the full path (`compiledIdentical`, `compiledLen 430`, `renderCalled`):

| phase | reads | distinct | verdicts | result |
|---|---|---|---|---|
| all-fail (`known=1, bit=0`) | 3930 | 1965 | `hide 1965`, keep 0 | **allHidden** |
| all-pass (`known=1, bit=1`) | 3930 | 1965 | `keep 1965`, hide 0 | **allKept**, samePopulation |
| fail-open (`__B_index = null`) | **0** | 0 | — | **noReads** |

Rollback: `slotRestored`, `mirrorRestored`, `cleaned` all true. Status
`works-on-the-whole-population`.

**Two numbers that matter for B:**
- **Coverage:** only 1965 of 2753 rows (71.4%) reach the filter; the other 788 are removed by
  `RenderData`'s own pre-filters before A is consulted. B's projection only needs to cover the
  rows the site actually renders.
- **3930 reads is exactly 2 × 1965**, i.e. `RenderData` ran twice inside the 2.2 s window — the
  page's own timer re-rendered during our wait, independently confirming E-062. Since the page
  re-renders without us, the projection must be published **atomically and immutably**, which is
  what the A/B design asked for from the start.

**The A registration chain is now complete end to end:**
`PrepareFilterCode` → two writes → `SaveParams()` → `RenderData()`, with `mw` visible to the
body (G-22), fail-open on a missing projection, **fail-CLOSED on an exception** (a hard
constraint on both A and B), and a verified rollback. G-22/G-23/G-24/G-25 are all closed.

Also: the tally's `bytesSeen` map (690 keys) bloated the JSON to tens of KB; it is now replaced
by a traffic summary plus a 12-entry sample, which cut the probe output to ~3.7 KB.

Note: the owner's slot `i=1` still holds the 1409-byte probe body (non-active) — it has survived
every probe since E-059. Parity unchanged at **156/156**.


### Verified — LIVE real registration v3 (E-062, owner, old.tsetmc.com 2026-10-20T08:19Z): DOM row counting is retired as a measurement

`probes/aRegisterRealV3.live.v1.js` published a projection over all 2896 inscodes and counted
visible rows with `document.getElementById(inscode)`. Registration worked (`compiledIdentical`,
`compiledLen 430`, `renderCalled`, rollback `slotRestored`/`mirrorRestored`/`cleaned`), but the
counts were **0 / 0 / 538 / 0 / 2096** for baseline, all-fail, all-pass, fail-open and rollback.

- All-pass (keep every row) showed **538** visible rows while the rollback, with **no filter at
  all**, showed **2096**. A filter that keeps everything cannot show fewer visible rows than no
  filter, so those numbers measure render timing, not A.
- The market watch renders asynchronously and re-renders on its own timer (`UpdateSpeed` 1000),
  so a count taken 2.2s after `RenderData` races with the page: baseline and all-fail were taken
  before the page had built its rows (`absent 2896`), all-pass caught a partial render, and the
  rollback a fuller one.
- The `id=inscode` hook is real (2096 elements exist once rendered) but is **not a usable
  measurement on this page**.
- **Retired:** DOM row counting. **Valid instrument:** the read-tally Proxy on
  `__B_index` / `__B_known` / `__B_bitset`, which observes each verdict at the moment the body
  computes it and cannot race with a render.
- Added `probes/aRegisterRealV4.live.v1.js`: the tally applied to the **whole** population —
  all-fail must make every evaluated row `hide`, all-pass must make every one `keep`, fail-open
  must produce zero reads. Validated against three page shapes in a vm harness (the harness
  caught a cumulative-tally bug that made fail-open look like 500 reads).
- G-25 still open. Note: the owner's slot i=1 still holds the 1409-byte probe body (non-active;
  `FilterNo` is 2) — it has survived every probe since E-059. Parity unchanged at **156/156**.


### Verified — LIVE real registration v2 (E-061, owner, old.tsetmc.com 2026-10-20T07:51Z): the execution mechanism is known from the site's own source, and A works

`probes/aRegisterRealV2.live.v1.js` captured the exact call site inside `RenderData`:

```js
if (mw.FilterCode.length != 0) { var FilterResult;
  try { FilterResult = eval(mw.FilterCode) } catch (e) { FilterResult = false }
  if (!FilterResult) { if (document.getElementById(row.inscode) != null) { /* hide */ } } }
```

- The site evaluates **the mirror** `mw.FilterCode` with `eval()`, in a scope where `row` **and**
  `mw` are both visible — G-22 is now confirmed at source level, not just behaviourally.
- **The site is fail-CLOSED on exception**: any `throw` in the body yields `FilterResult=false`,
  i.e. the row is hidden. This is the opposite of our fail-open law and is now a hard
  constraint on A (the body must never throw) and on B (the published projection must never
  be able to make it throw).
- The row element's **`id` is the inscode** (`document.getElementById(row.inscode)`) — that is
  the correct DOM hook; the `[inscode]` attribute v1 looked for does not exist.
- Result: the unchanged 430-byte body was invoked 16 times over 12 distinct inscodes and
  **every row it was invoked on got the correct verdict** (3 keep, 3 hide, 2 fail-open on
  `known=0`); dropping `__B_index` produced **zero** reads, i.e. fail-open at the body's own
  guard. Rollback restored slot, mirror and projection.
- `runs-but-wrong-verdicts` was a **sampling artefact**: the probe sampled the first 12 keys of
  `mw.AllRows` (2896 keys) and 4 of them never reached the filter because `RenderData`'s own
  pre-filters (the `heven` bounds; `ViewMode`/`Market` were 0) excluded them first. So the
  status was wrong, the data was right: **8/8 on evaluated rows**.
- Gates: **G-24 closed** (A works end to end). **G-25 opened** for whole-population
  confirmation. New probe `probes/aRegisterRealV3.live.v1.js` publishes the projection over
  *every* `AllRows` inscode and runs all-fail → all-pass → fail-open → rollback, counting
  visible rows through the `id=inscode` hook. Validated against three page shapes in a vm
  harness.
- No product change; parity unchanged at **156/156**.


### Verified — LIVE hygiene + real-registration v1 (E-060, owner, old.tsetmc.com 2026-10-20T07:40Z/07:41Z): slots clean, path executable, measurement redone

- `probes/aSlotHygiene.live.v1.js` read-only: the Filters array has **two** slots
  (`فیلتر شماره 4` at i=0, `فیلتر شماره 2` at i=1 active) and **both are empty**; the
  persisted copy is 795 chars with both empty; the mirror matches the active slot. The
  1409-byte probe body found at 07:20Z is gone — the owner's filters are clean. Only the
  page-level marks remain (`__A_SCOPE_RUNS` 1188432, `__A_SCOPE`).
- `probes/aRegisterReal.live.v1.js`: the registration path executed cleanly (body verified
  430 B / fnv1a `38fe0c59` / 11 newlines, `compiledIdentical`, `compiledLen 430`, `written`,
  `renderCalled`, rollback `slotRestored`/`mirrorRestored`/`cleaned`) — **but its row
  measurement was invalid**: it keyed the projection on `Object.keys(mw.AllRows)` and looked
  the rows up in the DOM as `[inscode="..."]`, and all ten read `absent` at *baseline*, before
  anything was registered. `match:false` therefore proves nothing.
- New knowledge from the live function sources:
  - `RenderData` iterates `for (var key in mw.AllRows) { var row = mw.AllRows[key]; … row.inscode … }`
    — **AllRows is keyed by something else; the inscode lives on the row.**
  - `SelectFilter(FilterNo)` guards an empty `Filters` and then sets `mw.FilterCode = ""` —
    it **reads the active slot into the mirror**. This corrects E-058: T1's `runs 0` was
    because the slot was empty, not because SelectFilter is inert. G-23 restated.
  - `QueryWindowCheckFilter` reads `#InputFilterCode`, `QueryWindowSaveFilter` reads
    `#InputFilterName` — the filter editor's DOM ids are now known.
  - `UpdateMarketWatch` reads `mw.FilterCode.length` — the mirror is load-bearing for the
    page's own logic, so every registration must write both copies.
- Added `probes/aRegisterRealV2.live.v1.js`: registers the **unchanged** 430-byte body and
  measures its verdicts by publishing `__B_index` / `__B_known` / `__B_bitset` as
  **read-logging Proxies**, so the per-row verdict is observed directly instead of through
  the DOM. Validated against three page shapes in a vm harness (the harness caught a real
  bug: the first version's numeric-key guard silently skipped non-digit inscodes).
- G-24 still open. No product change; parity unchanged at **156/156**.


### Verified — LIVE re-run surfaces a persisted probe body (E-059, owner, old.tsetmc.com 2026-10-20T07:20Z) + slot hygiene probe

- The owner re-ran `probes/aRegister.live.v1.js` two days after E-058. It reported
  `slot.originalLen: 1409` with the preview `var FilterResult = true;\ntry {\n  var __g =
  (typeof window !=` — verified in-repo to be, byte for byte, the head of the **instrumented
  body of `probes/aTrigger.live.v1.js`** (exactly 1409 bytes). So the ACTIVE filter slot
  (`FilterNo` 1 of 3) still held a probe body, and because the page had been reloaded, that
  body had been **persisted**.
- **Persistence confirmed** the hard way: two writes + `SaveParams` really does survive a
  reload.
- **Governance correction:** "rollback restored" in E-055/E-057/E-058 meant the **in-memory**
  `mw.Settings` was restored — never that the persisted copy was clean. A later
  restore + `SaveParams` can be lost (debounce, or the site re-serialising from its own
  copy). From now on a probe must read `getData('MarketWatchSettings')` after rollback and
  only claim clean when memory **and** storage are clean.
- E-055's `entryMatches: false` is re-read as an artefact: this run's `identical: true`,
  `firstDiffAt: -1`, `afterLen: 1409` shows the write reaches the slot and round-trips.
- Added `probes/aSlotHygiene.live.v1.js` (tag `کانسول`, no waiting): read-only classification
  of every slot, the mirror and the persisted copy, plus an opt-in clean mode
  (`window.__A_CLEAN = true`) that clears **only** slots classified as `probe-body` and
  never touches the owner's own site-dsl filters. Validated in both modes in a vm harness.
- G-24 still open: `probes/aRegisterReal.live.v1.js` is the end-to-end test that calls
  `RenderData()`. No product change; parity unchanged at **156/156**.


### Verified — LIVE A trigger probe (E-058, owner, old.tsetmc.com 2026-10-18T10:05Z): the registration path is complete, and A can read mw

- `probes/aTrigger.live.v1.js` (tag `کانسول`) ran live. Recon: 9 `mw` functions mention
  `FilterCode`, 0 properties already hold a compiled body, `FilterNo` 1 of 3, and **no
  textarea exists in the DOM** until the filter dialog is opened. Four activation tests,
  each rolled back independently:
  - `T1 mw.SelectFilter(1)` -> `runs 0` — not the trigger.
  - `T2` TextArea path -> skipped (no textarea); `QueryWindowSaveFilter()` throws
    `Cannot read properties of undefined (reading 'replace')` while the dialog is closed,
    so the UI path is not usable headlessly.
  - `T3` mirror + `SaveParams` -> `runs 0` — confirms E-057.
  - `T4 mw.RenderData()` -> **`runs 2132`, `firstRunAt 1251ms`, `sawMw true`, `sawRow true`**.
- **G-22 closed, answer `scope-ok`:** the filter body's execution context can see `mw`, so
  A's unguarded `mw.__B_index` read is viable and B does **not** have to publish the
  projection on `window.__B_*`. The only A/B coupling is now pinned down.
- **G-23 closed, answer `mw.RenderData()`:** the complete registration path is
  `Settings.Filters[FilterNo].FilterCode = PrepareFilterCode(body)` + `mw.FilterCode = same`
  + `SaveParams()` + **`RenderData()`**. Without the last call nothing happens at all.
  `RenderData` is not synchronous — the body starts running about a second after it returns,
  so registration must be followed by a wait.
- **G-24 opened:** whether the real 430-byte body, registered through this path, hides
  exactly the rows the projection marks and fails open when the projection is gone. Probe:
  `probes/aRegisterReal.live.v1.js`.
- No product change: `window.TseBEngine` is still not registered on the page.
  Engine parity unchanged at **156/156**.


### Verified — LIVE A-scope probe v1 (E-057, owner, old.tsetmc.com 2026-10-18T09:53Z): storing a filter body does NOT make it run

- `probes/aScope.live.v1.js` (tag `کانسول`) registers an instrumented, fail-open body
  through the E-056 two-write path and polls its global counters for 4s at
  `UpdateSpeed: 1000`. Live result: `runs: 0`, `firstRunAtMs: -1`, `evaluated: false`,
  `bodyError: null`, while `stillRegisteredAtEnd: true` (the code was still in the active
  slot) and `rollback.restored: true`.
- **Consequence for the design:** the E-056 registration path is necessary but not
  sufficient. The site compiles the filter at some moment of its own and caches the
  compiled function; writing `mw.Settings` afterwards does not invalidate that cache.
  Registering A for real therefore requires finding the compile trigger first.
- **Consequence for E-055:** its `candidate-confirmed` proved a body can be *stored* and
  round-trips byte-for-byte. It never proved the site *executes* it. Storage and
  execution are two separate steps and only the first one is now known.
- Gates: **G-22 stays open but is now blocked on the new G-23** (what triggers
  compilation). G-23 opened; the trigger probe is `probes/aTrigger.live.v1.js`
  (read-only recon of every `mw` function mentioning `FilterCode`/`FilterResult` plus the
  filter DOM, then four independently-rolled-back activation tests).
- No product change: `window.TseBEngine` is still not registered on the page.
  Engine parity unchanged at **156/156**.


### Changed — owner decisions applied to the funnel config (2026-10-17)

- `ivFilterEnabled: false` — the 77% IV-at-cap warning is an **open bug**: no row is
  hidden on the basis of IV until the live diagnostic probe (`probes/fieldsem.ivdiagnostic.live.v1.js`)
  has run. IV is still solved and echoed (`iv`, `atBoundary`) so the published projection
  stays auditable; `reason` is `iv-filter-disabled-open-bug` and every confirmed option
  passes (fail-open).
- `marketPriceFrom: 'pl'` (owner q2) replaces `bidAskMid`; `resolveMarketPrice()` keeps
  `bidAskMid` available for comparison.
- `useDeltaGamma: false` (owner q5) — pass = "IV solved and inside (ivMin, ivMax)";
  `deltaMin`/`gammaMin` remain in the config but are not applied.
- Owner follow-up answers applied: q3 is CONFIRMED as `underlyingFrom:'underlyingMap'`
  (S from the underlying row via the l30-built map, price field `pc`); q4 is
  "user-configurable", so `r` (and `T`/thresholds) now come from the UX settings layer
  and pass through the new `normalizeFunnelConfig()`: range-checked, garbage falls back
  to the proven defaults (fail-closed), switches coerced to booleans, unknown sources
  rejected, `DEFAULT_FUNNEL_CONFIG` never mutated.
- Parity suite extended to **102 assertions**, all passing.

### Added — live field-semantics + IV diagnostic evidence and market-price guards (2026-10-18)

- The owner ran `probes/fieldsem.ivdiagnostic.live.v1.js` [console] on old.tsetmc.com
  (E-045): `plc == pl - pc` for only 37.2% of rows, and `pl == pc` in every sampled
  row with a non-zero `plc` — the last price is stale whenever the option has not traded.
- IV boundary pinning on live data: the owner's mapping (underlying `pc` + bid/ask mid,
  r=0.30) pins **13.3%** of rows at the interval bound, the v9 mapping **40%** — the
  input mapping, not a data signal, caused the original 77% at-cap warning.
- Those 13.3% are provably impossible prices: outside the no-arbitrage bounds (call
  S=70164, K=24000, r=0.30, T=30/365 -> lower bound 46749 vs a mid of 46000) or from a
  23-32% wide book whose mid needs a vol above 300%.
- New `marketPriceProblem()` guard: `price-outside-arbitrage-bounds` and
  `book-too-wide` now return `insufficient-data` (never computed, never published), so
  A fails open and the row stays visible instead of hiding behind a fabricated IV.
  Configurable via `checkArbitrageBounds` and `maxSpreadPct` (0.20, PROVISIONAL).
- A boundary pin is now reported as `no-iv-solution`, distinct from
  `fail-iv-range` (a valid IV outside the funnel window).
- Live median IV is 1.0522 (p90 2.1424), so the funnel's `ivMax=1.0` would reject about
  half of the live options — the IV window needs an owner decision before the filter
  can be enabled (see design doc §12, decisions q7/q8).
- Parity suite extended to **114 assertions**, all passing.

### Changed — owner decisions q7/q8: ivMax 3.0 + hybrid price hierarchy (2026-10-18)

- `ivMax: 1.0 -> 3.0` (owner q7, UX-configurable): the live median IV is 1.0522 and
  p90 is 2.1424, so the old window would have rejected about half of the live options.
  The price guard stays the primary layer; `ivMax` is a backup that only rejects 1-2%
  (an IV above 300% is an anomaly). 5.0 was rejected because it equals the solver's
  own cap, which would make the check meaningless.
- `marketPriceFrom: 'pl' -> 'hybrid'` (owner q8), a three-level hierarchy:
  1. the bid/ask mid, guarded by `marketPriceProblem()` (arbitrage bounds + spread);
  2. `pl` only when `tno > 0` (the row actually traded today) — the spread guard is
     skipped on this path because a real executed trade is evidence even when the
     surrounding quotes are wide;
  3. otherwise `insufficient-data`, so A fails open and the row stays visible.
- Every rejection now carries its reason (`missing market price`,
  `price-outside-arbitrage-bounds`, `book-too-wide`), and the chosen source is echoed
  as `inputs.marketPriceSource` (`mid` | `pl-traded` | the explicit source name).
- Backlog: `plc == pl - pc` for only 37.2% of live rows, so `plc` is not the price
  change (most likely `plc = pl - py`) — recorded as gate G-18; no decision may be
  built on `plc` until it is settled (the q8 hierarchy uses `tno > 0`, not `plc`).
- The IV window is now clamped to the solver's own bisection range
  (`IV_SOLVER_MIN = 0.01`, `IV_SOLVER_MAX = 3.0`): an `ivMax` above 3.0 could never
  reject anything (the solver cannot return more), and an `ivMin` below 0.01 would
  let a floor-pinned IV pass. Both are footguns, so `normalizeFunnelConfig` clamps
  them instead of trusting a meaningless setting.
- Parity suite extended to **130 assertions**, all passing.

### Added — per-option maturity capability (q9), off by default; probe measures the real engine (2026-10-18)

- `TMode: 'fixed' | 'dte'` in the funnel config. `'fixed'` (the shipped default) keeps
  `T = 30/365`; `'dte'` computes the maturity per option from the parsed expiry through
  an **injected** calendar (`opts.calendar`), so the Jalali<->Gregorian conversion stays
  outside the engine (gate G-08's job). Without a calendar, `'dte'` returns
  insufficient-data rather than silently modelling the wrong maturity.
- The market-price guards and the IV solver now use the per-row maturity, because the
  arbitrage bounds depend on `T`: a price that is valid at 30 days can be below the
  bound at 3 days. `inputs.T` echoes the maturity actually used.
- `probes/ivfilter.borderline.live.v1.js` now measures RUN B through the real engine
  (`TMode: 'dte'`) instead of a local re-implementation, and reports the engine's own
  counts. Validated in node: the engine's RUN B matches the probe's local RUN B exactly
  (total 33, ok 22, atUpper 2, borderlinePct 9.1%) and the price-resolution parity check
  against `computeFunnel` stays 33/33.
- Three real bugs found and fixed while wiring this: `resolveMarketPrice` did not
  receive `T`; `normalizeFunnelConfig` could never write `'dte'`; two parity tests
  referenced a block-scoped engine from another scope.
- The probe now measures a **2x2 factorial** (maturity x guards), which isolates what
  the guards actually rescue: the same rows are measured with the guards on and off, in
  both T modes. On synthetic data the guards cut the boundary rate from 6.3% to 0% at the
  shipped T (they rescue everything, as the owner predicted), but only from 37.5% to 9.1%
  at the correct maturity — they cannot finish the job there. This is the direct test of
  the owner's "all boundary rows are rescued" claim.
- The probe also reports **boundary concentration per underlying** (`byBase`, top 8), so a
  single chain cannot hide inside an average.

### Verified — LIVE window sweep (E-053, owner, old.tsetmc.com 2026-10-18T08:41Z)

The probe's new `windowSweep` answers the owner's question on live data — "if
`ivFilterEnabled=true` with `[0.05, 2.5]`, how many rows are removed?":

| window | would remove | of solved |
|---|---|---|
| `[0.01, 3.0]` (shipped) | **0** | 0% |
| `[0.05, 3.0]` | 4 | 0.86% |
| `[0.01, 2.5]` | 4 | 0.86% |
| `[0.05, 2.5]` | 8 | 1.73% |
| `[0.10, 2.0]` | 40 | 8.64% |
| `[0.20, 1.5]` | 108 | 23.33% |

- **Enabling `ivFilterEnabled` today is pure logging**: at the default window it removes
  exactly zero rows, so there is no behavioural risk in turning it on to collect the
  `ivStatus` labels.
- RUN A (shipped maturity, guards on): 463 solved of 1049 rows, borderline 5 (1.1%).
  Guards off: 755 solved, 147 borderline (19.5%) — of which **140 are floor pins**. The
  same 3-day chains that ceiling-pin at the correct maturity floor-pin at 30/365: a pin
  is a property of the market price versus the model, not of the maturity choice.
- The diagnostic probe (n=120, T=30/365) independently confirms the no-solution
  population: **15 rows (12.5%) carry a price no volatility in [0.01, 3.0] can produce**
  (G-11 mapping). v9: 62 (51.7%). The price guards absorb most of these (292 of 1049
  rows rejected as arbitrage/spread), which is why the funnel only sees 5.
- **G-13 v3 live (reconfirmation)**: non-empty FilterCode round-trips (sent == observed,
  len 23), trace valid (submit → accepted → running → done), rollback + slot restore
  clean. G-13 was already `confirmed` on 2026-10-15 (E-026); the probe's own
  `bestChoice` text ("owner may promote E-026 to confirmed") predates that promotion
  and is stale.
- **Probe fix (regression introduced by the sweep itself), two attempts**:
  1. PROBE_JSON was printed *after* the human-readable tables, so the tables the sweep
     added pushed it past the console's line cap. Two live runs came back truncated at
     the same line (VM6037:499, VM6369:499).
  2. Moving it to the first line was **not enough** — the paste was cut at the same
     place, because the real cap is on **length**: exactly 5001 characters (measured).
     The full JSON was ~15KB.
  3. The verbose object was still printed as a second json line at the end, and the next
     live run (VM6589:563) copied **that** line — 5001 chars of a ~15KB line, cut in the
     same place again. Two json lines in the output is what made that possible.
  Shipped shape: **exactly one json line**, the slim projection, printed first — 2799
  chars on synthetic data, structurally bounded. The verbose object is opt-in
  (`window.__B_PROBE_FULL = true`) and is then emitted in 4000-char chunks that each
  survive a paste (reassembly verified in node).
- Outstanding: RUN B (real DTE) and `runB_engine` still need one clean live run; the
  engine is not registered on the page yet (`window.TseBEngine` absent), so today's
  code commits have no live effect.

### Verified — LIVE A-registration (E-055, owner, old.tsetmc.com 2026-10-18T09:39Z) — and one thing it did NOT prove

The generated A body registered through the real filter slot and came back
**byte-for-byte unchanged**: 430 bytes, 11 newlines preserved, fnv1a `38fe0c59` both ways,
`firstDiffAt = -1`, compiles in the slot's `(row, mw)` signature, all 7 fail-open
behavioural cases pass, rollback restored the original empty slot.

**But the persistence path is still unproven.** The active slot is `Settings.FilterNo = 1`
of 3, and after `SaveParams()` the entry still reads `Settings.Filters[1].FilterCode` len 0
(`entryMatches: false`). E-026 records `SaveParams` as
`setData("MarketWatchSettings", JSON.stringify(mw.Settings))` — persistence goes through
`mw.Settings`, not through `mw.FilterCode`. Setting `mw.FilterCode` and reading it back is
a plain property assignment: it proves the slot accepts the bytes, not that they were
stored. The G-13 v3 probe's "trace valid" check validated a trace array the probe itself
synthesised, so it never tested persistence either.

Also: `FilterNo` was 1 here and 8 in E-026 — the slot index is not stable across page
loads, so a registration must target `Settings.FilterNo`, never a hardcoded index.

New gate **G-21**: resolve `PrepareFilterCode`'s real signature and prove the body lands
in the active slot.

### Added — A-registration live probe (`probes/aRegister.live.v1.js`, tag [کنسول])

The remaining gate after q1: G-13 (E-026/E-053) proved that a **non-empty string**
round-trips through the filter slot. It did not prove that the **generated A body**
survives it — 430 bytes, 11 newlines and a non-ASCII em dash in its header comment. A
storage layer that strips newlines or mangles non-ASCII would break the body's byte
accounting (and therefore the 4096-byte capacity check) without breaking the JS.

The probe: generate the body (from `window.TseALookup` if the module is loaded, else
from an inline mirror that is verified byte-identical to the module) → capacity →
syntax in the slot's `(row, mw)` signature → register in the real `mw.FilterCode` +
`mw.SaveParams()` → **byte-for-byte round-trip** → 7 fail-open behavioural cases on the
body that came back → rollback to the original slot value.

Output contract learned the hard way: `PROBE_JSON` is the **first and only** json line
(1715 chars against a measured 5000-char paste cap); verbose detail is opt-in via
`window.__A_FULL`.

Validated in node against five mock slots: a faithful slot → `candidate-confirmed`; a
slot that strips newlines → caught (`identical=false`, `nl 11->0`, `firstDiffAt=81`); a
missing `SaveParams` → caught; the real module path → confirmed, and the mirror body is
byte-identical to the module's (430 bytes, fnv1a `38fe0c59`).

### Verified — LIVE RUN B closes q1 (E-054, owner, old.tsetmc.com 2026-10-18T09:20Z)

RUN B (the correct maturity, guards on) over 1049 live option rows:

- **ivSolved 453, borderline 23 = 5.1%** (atLower 3, atUpper 20) → verdict
  **PRODUCT-DECISION** (the owner's 3-8% band). The same ~4-5x factor as E-051
  (7.3% vs 1.8%): the shipped maturity hides the boundary population.
- IV histogram: 0.5-1 → 240, 1-1.5 → 107, 0.2-0.5 → 24, 1.5-2 → 30, 2-2.9 → 27.
- **windowSweep at the correct maturity** — the number q1 was waiting for:

  | window | removes | of solved |
  |---|---|---|
  | `[0.01, 3.0]` | **0** | 0% |
  | `[0.05, 3.0]` | 1 | 0.22% |
  | `[0.01, 2.5]` | 9 | 1.99% |
  | `[0.05, 2.5]` | 10 | 2.2% |
  | `[0.10, 2.0]` | 28 | 6.18% |
  | `[0.20, 1.5]` | 59 | 13.02% |

- All 10 borderline samples are **one chain** (اهرم, 3 days, K=20000..46000, S=70911, all
  iv=3.0 ceiling) — 10 of the 20 ceiling pins. q10 keeps them visible.
- 43.8% of live option rows have no usable price, so the filter's real coverage is at
  most 56% whatever the window says.

**Applied**: `ivFilterEnabled: true` (the default window removes nothing, so this is pure
labelling) with `ivMin: 0.05` / `ivMax: 2.5` (10 rows, 2.2%), per the owner's stated rule
"if the probe shows an effect". Parity **156/156**.

### Verified — q9 + q10 applied; two latent bugs found on the way (E-052)

The owner's review accepted **q9** (`TMode:'dte'`) and **q10** (a boundary pin stays
visible and labelled). Both are now engine defaults, and applying them exposed two
bugs that no test could see:

1. **`normalizeFunnelConfig` mapped an ABSENT `TMode` to `'fixed'`.** Flipping the
   default therefore had no effect on any caller that did not pass `TMode`
   explicitly — q9 would have been silently inert. Now an absent key keeps the
   default, and a parity test builds an engine with no `funnelConfig` at all.
2. **The pass test and the boundary flag used different thresholds.** `pass` tested
   `sigma < ivMax` while `atBoundary` tested `sigma >= 2.9999999`. The real solver
   returns **2.99999991** for a pin, so a real pin was `atBoundary:true` AND
   `ivStatus:'ok'` at the same time. A fake solver returning exactly `3.0` does not
   reproduce it, which is why the existing test missed it. One predicate now decides
   both, and the pin test runs BEFORE the window test.

- **`src/models/jalaliCalendar.v0.1.0.js` (new)** — the Jalali conversion was
  promoted out of the probe and became the engine's DEFAULT calendar, so `dte` can
  neither degrade to "model everything as 30 days" nor mean "no maturity at all".
  Anchors 1405/01/01 == 2026-03-21 and 1405/07/29 == 2026-10-21 are asserted in the
  parity harness (2000-date round-trip included). This closes G-08's open question
  ("expiry needs Jalali calendar validation vs Gregorian").
- **q10 is a flag, not a hardcoded behaviour**: `pinFailOpen` (default `true`), so the
  decision is reversible without touching code.
- **The parity fixture went date-relative.** Its expiries are now generated as
  today + 30 days against a PINNED clock; with hardcoded Jalali dates half the
  fixture was already in the past once `dte` became the default.
- **Parity 140/140 -> 154/154.** The live probe in node: `engineParity` 200/200 agree
  (its own parity engine is now pinned to `TMode:'fixed'` to match its 30/365 mirror),
  and the engine's RUN B reports `ivStatus {ok:200, no-iv-solution:1, fail-iv-range:0}`
  with 201/201 rows passing — exactly the "logging mode" table the owner described.
- The probe gained a **windowSweep** (what a narrower `ivMin`/`ivMax` would actually
  remove) and **ivStatus counts**, which is the data the `ivMin`/`ivMax` decision needs.

### Verified — LIVE borderline measurement (E-051, owner, old.tsetmc.com 2026-10-18T07:18Z)

The owner ran the probe live: 2983 symbols, 1049 option rows, 1710-entry underlying map.

| | guards ON | guards OFF | guards rescue |
|---|---|---|---|
| **A: T = 30/365 (shipped)** | **1.8%** (8/442) | 17.3% (124/715) | 116 of 124 (93.5%) |
| **B: T = DTE/365 (correct)** | **7.3%** (30/411) | 11.9% (73/615) | 43 of 73 (59%) |

- The shipped maturity **flatters the result**: 1.8% would have looked "safe to enable",
  but it is produced by modelling 3-day options as 30 days. Live maturities span 3 to 87
  days (0-7d 91, 8-30d 265, 31-90d 556 rows).
- At the correct maturity the guards are much less effective (59% vs 93.5% rescue), so
  **the q9 (maturity) decision must precede the q1 (filter) decision**.
- 10 of the 29 ceiling pins at RUN B are a **single chain** (one underlying, 3 days to
  expiry, K=20000..46000). Verified arithmetically that this chain has no Black-Scholes
  solution at all: even at sigma=3.0 the model produces only ~334 rial of time value for
  K=46000 while the market shows 1080 - the price is 2-3x the model's maximum.
- 47.8% of live option rows have **no usable price** (17 no underlying, 120 no usable
  maturity, 297 with neither a valid book nor a trade), so under fail-open they bypass the
  filter entirely - that caps the filter's real coverage regardless of the decision.
- Verdict: **PRODUCT-DECISION** (7.3% is inside the owner's 3-8% band). `ivFilterEnabled`
  stays `false` until the owner decides what a no-solution row should do.
- Parity suite extended to **140 assertions**, all passing. The shipped default is
  unchanged (`TMode: 'fixed'`, `T = 30/365`).

### Added — IV borderline probe (live, [console]) + the fixed-T defect it exposes (2026-10-18)

- `probes/ivfilter.borderline.live.v1.js` [console] decides whether `ivFilterEnabled`
  can be enabled. It mirrors bEngine/greeks/optionParser verbatim, measures the real
  engine path, and reports every field the owner's decision table needs: the price
  source split (mid / pl-traded / insufficient), guard hits (arbitrage vs spread),
  noS/noT, ivSolved/ivFailed, atLower/atUpper, a 10-bucket IV histogram, up to 10
  borderline samples, and a single DECISION line applying the <3% / 3-8% / >8% rule.
- The probe runs the measurement TWICE — RUN A with the shipped `T = 30/365` and
  RUN B with the correct `T = DTE/365` — because the shipped T is a fixed
  approximation inherited from probe G-11.
- Validated in node against a fake live page: the probe runs end-to-end and its
  price-resolution layer agrees with the real engine's `computeFunnel` on 33/33 rows.
  A parity bug in the first draft (comparing across different T values, while the
  arbitrage bounds depend on T) was found and fixed.
- On synthetic data RUN A reports 0% borderline while RUN B reports 9.1% — the fixed
  T hides the problem. Gate **G-19** opened: the live expiry 1405/07/29 is
  2026-10-21, i.e. 3 days away, so the real T is 10x smaller than the modelled one.
  Decision q9 (per-option T via an injected calendar, or keep 30/365) is with the owner.
- A verified Jalali->Gregorian conversion (1405/01/01 == 2026-03-21) is inlined in the

### Fixed — `plc` semantics PROVEN (G-18 closed) (2026-10-18)

Comparing the 05:55Z and 06:55Z live snapshots of the same six option rows proves,
to two decimals on all six (6/6):

```
plc = pl - prevClose          (yesterday's close, NOT pc)
pc  = today's price
pcp = (pc - prevClose)/prevClose * 100
plp = (pl - prevClose)/prevClose * 100
```

This is why `plc == pl - pc` held for only 36.1% of rows (800/2219): `pc` is not the
previous close. It also explains the 05:55Z anomaly where `plc` was 0 while `pl != pc`
— at that moment `pl` equalled the previous close, so the change was genuinely zero.

Derived consequence for the engine: **`prevClose = pl - plc` is computable from the row
itself**, so price staleness is detectable without relying on `tno`. The q8 hierarchy
(`tno > 0`) remains correct, but `plc != 0` is a cheaper corroborating signal.

Second live IV run under the owner's mapping (T=30/365): atBoundary 13/120 (10.8%),
saneInterior 33 (27.5%); the v9 mapping pins 65/120 (54.2%). This is RUN-A data —
the decision measurement needs `probes/ivfilter.borderline.live.v1.js`.
  probe so DTE can be computed from the parsed `expiry`.
- Parity suite extended to **94 assertions** (`probes/engine.parity.v1.js`), all passing:
  synthetic option rows now carry realistic price fields (`pl` = the option's own last
  price), the round-trip test runs under the owner mapping (mean IV 0.3456 vs true 0.35,
  boundary pins 1/40), and the v9 mapping on the same data pins 36/40 (90%).


### Added — A/B engine separation v0.1.0 (G-12/G-13)

- `src/engine/bEngine.v0.1.0.js` — B engine: reverse index with caching, dirty
  detection (7 fields, O(n), no mutation), dual-trigger guard (snapshotId +
  configHash), per-row funnel with injected models, atomic swap, fail-closed
  publish, SaveSettings/SaveParams hooks (`this=window`), async runner.
- `src/engine/aLookup.v0.1.0.js` — A per-row lookup: `evaluateRow` (fail-open),
  generated 435-byte FilterCode body, capacity check (4096 limit), parity harness.
- `probes/engine.parity.v1.js` — 69 assertions: unit + parity + timing.
- `docs/AB_ENGINE_SEPARATION_DESIGN.md` — design, contradiction review (§11),
  performance budget (§4), implementation status (§12).

### Fixed (found by the parity suite)

- `plc` was missing from `DIRTY_FIELDS` although `impliedVol` reads it, so a
  market-price-only change never recomputed and the published bit went stale.
  `DIRTY_FIELDS` is now `[pl, plc, l18, l30, tvol, tno, pcp]`.
- `compileFilterCodeBody` had signature `(mw, row)` while `evaluateRow` is
  `(row, published)`; the signature now matches so the two cannot be confused.

### Evidence

- E-037 A/B architecture, E-038 configHash dual trigger, E-039 BS+IV timing,
  E-040 contradiction review + local benchmark, E-041 live funnel timing
  (18.4ms full / 16.16us per option row / detectDirty 2.3ms live),
  E-042 implementation + 69/69 parity + node --check 73/73.

### Changed — gap verification round 2 (2026-10-17)

- `src/engine/aLookup.v0.1.0.js` — bit extraction micro-optimised (`>> 3` / `& 7`);
  doc section 3 now shows the implemented guarded body instead of the old snippet.
- `src/engine/bEngine.v0.1.0.js` —
  - funnel input mapping is now explicit config (`marketPriceFrom`,
    `underlyingFrom`, `underlyingPriceField`, `r`) with a `legacyV9Mapping` switch;
  - default follows the repo's own G-11 probe (underlying map + bid/ask mid, r=0.30);
  - `createScheduler()` prefers `requestIdleCallback({timeout:500})` over `setTimeout(0)`;
  - `installHooks` initialises `mw.__B_configVersion` at install time;
  - funnel echoes its inputs (`S`, `K`, `marketPrice`, `T`, `r`, `kind`) for audit.
- `docs/AB_ENGINE_SEPARATION_DESIGN.md` — new section 11.1 (TextArea registration:
  what is confirmed vs what is open), measured memory numbers (~0.7-0.9 MB total),
  async section rewritten, IV-at-cap reframed (stopping criterion, not a data signal).
- `probes/engine.parity.v1.js` — 89 assertions, including an IV round-trip proof:
  the G-11 mapping recovers a synthesized true IV exactly (mean 0.3500, 0/984
  boundary pins) while the v9 mapping is biased (0.3557) and pins 28/984.
- `probes/fieldsem.ivdiagnostic.live.v1.js` — new live probe: settles what `plc`
  means (`plc = pl - pc`?) and whether live IVs are interior or boundary-pinned.

### Evidence

- E-042 implementation + parity; E-043 gap verification + IV round-trip proof.

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
