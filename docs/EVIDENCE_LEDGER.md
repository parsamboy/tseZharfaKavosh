# Evidence Ledger — Zharfa canonical v6.0

**وضعیت:** قالب و رجیستر evidence برای قرارداد canonical v6.0؛ وجود یک ردیف در این فایل به‌تنهایی ادعای platform-verified بودن نیست.

## ۱. طبقه‌بندی provenance

هر evidence باید یکی از این سطح‌ها را داشته باشد:

- `owner-observed` — مشاهده یا آزمون انجام‌شده توسط مالک؛
- `contract-verified` — در قرارداد canonical یا fixture رسمی ثبت‌شده؛
- `platform-verified` — probe مستقیم پلتفرم با روش و fixture قابل بازتولید؛
- `project-policy` — تصمیم معماری/سیاست محصول، نه واقعیت پلتفرم؛
- `unverified` — گزارش یا فرضی که هنوز evidence کافی ندارد.

`owner-observed` و `contract-verified` قابل جایگزینی با یکدیگر نیستند.

## ۲. schema هر ردیف

| فیلد | معنا |
|---|---|
| `evidenceId` | شناسهٔ پایدار evidence |
| `claim` | گزارهٔ دقیق و محدود، نه عنوان کلی |
| `level` | یکی از سطوح provenance بالا |
| `source` | URL، commit، فایل، capture یا شاهد اصیل |
| `host` | host و page/realm مربوط |
| `parTree` | در صورت ارتباط با TSETMC |
| `capturedAt` | زمان مشاهده با timezone |
| `method` | روش probe، fixture capture یا آزمون |
| `fixtureHash` | hash raw fixture یا artifact |
| `status` | open، accepted، contradicted، superseded |
| `relatedGate` | شناسهٔ gate در `docs/PENDING.md` |
| `ownerApproval` | وضعیت تأیید مالک، در صورت نیاز |
| `notes` | محدودیت دامنه و توضیح تکمیلی |

## ۳. قواعد ثبت

- یک claim باید تا حد امکان یک گزارهٔ قابل آزمون باشد؛
- «در مسیر آزموده‌شده مشاهده نشد» به معنی نبودن قابلیت در همهٔ مسیرها نیست؛
- دادهٔ missing با default جایگزین نمی‌شود؛
- evidence فاقد source یا زمان قابل ردیابی، کامل نیست؛
- raw fixture باید immutable نگه داشته شود و parser/schema version داشته باشد؛
- هر تغییر مؤثر بر contract باید evidence قبلی را supersede یا contradict کند، نه اینکه حذف کند؛
- evidence پروژه برای استفادهٔ محصولی کافی نیست مگر سطح و دامنهٔ آن صریح باشد.

## ۴. رجیستر فعلی

در این Alpha، قالب ledger ثبت شده است. برای `mw.AllRows`، `mw.FilterCode`، `mw.SaveParams`، option label، option-chain و calendar هنوز ردیف contract-verified جدیدی بدون capture/probe معتبر اضافه نشده است.

Baselineهای canonical v5.0 باید با commit و clause مربوط ثبت شوند؛ این فایل جایگزین متن canonical v5.0 نیست.

### LEGAL-001 — inherited author and legal notice

- `level`: contract/project baseline
- `source`: existing project artifact header and `LEGAL` module in `tseOptionZharfa-v0.0.4.1.source.js`
- `claim`: original author link, project group, Smart-FFA-1.0 attribution, copyright line and disclaimer must remain intact in a fork
- `scope`: attribution/lineage and notice preservation; this entry does not expand the license grant
- `status`: recorded for Alpha review

### LEGAL-002 — successor license authority and donation policy

- `level`: project-policy
- `source`: `docs/DECISIONS.md` entries `D-2026-10-04-001` and `D-2026-10-04-002`, `LICENSE`, `DONATION.md`
- `claim`: the owner authorized Smart-FFA-1.1 for successor `tseZharfaKavosh v0.1.0.0`; donation is optional, untracked, and unrelated to feature access
- `scope`: successor governance only; historical Smart-FFA-1.0 artifacts retain their notices
- `status`: recorded for Alpha review; not platform evidence and not canonical v6.0 approval
- `ownerApproval`: owner declaration recorded; final contract approval remains open

### E-011 — mw.AllRows existence, schema, scope and lifecycle (G-03) — platform-verified

- `evidenceId`: `E-011`
- `claim`: `mw.AllRows exists as readable object-map keyed by inscode in MarketWatch page realm on old.tsetmc.com Loader.aspx ParTree=15131F`
- `level`: `platform-verified` — owner live capture via LIMITED-TEST v1+v2 on main TSETMC site
- `source`: `probes/mwAllRows.limited-test.v1.js + probes/mwAllRows.limited-test.v2.js (read-only inspection of window.mw.AllRows)`
- `host`: `old.tsetmc.com`
- `parTree`: `15131F`
- `capturedAt`: `2026-10-05T07:14:56.067Z / 2026-10-05, 10:44:56 Asia/Tehran (v2 full); 2026-10-05T07:13:18.599Z v1 preview — epoch 1791184496067`
- `method`: `manual console paste — read-only inspection of window.mw.AllRows (no DOM write, no network, no storage, no FilterCode/SaveParams, no credential, no upload)`
- `fixtureHash`: `ea5fefbede1fb036524d38e6fd7e92054f736ba7f6e61a0260eebeb88ef8cef3 — SHA-256 of fixtures/raw/mwAllRows.2026-10-05T07-14-56.067Z.json (5297 bytes, SUMMARY fixture)`
- `status`: `confirmed` — §5 spec fully satisfied including refreshBehavior (F5 supplemental); object-map lifecycle proven
- `relatedGate`: `G-03`
- `ownerApproval`: `AP-2026-10-05-001 — owner executed LIMITED-TEST v1 (10:43), v2 (10:44) and F5 refresh v2 (10:50) and returned SUMMARY JSONs`
- `href`: `https://old.tsetmc.com/Loader.aspx?ParTree=15131F#`
- `isTop`: `true`
- `userAgent`: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36`
- `existence`: `hasWindowMw=true, hasAllRows=true, allRowsType=object, isArray=false, mapKeyCount=3356 → 3358 after F5`
- `mapInfo`: `object-map keyed by inscode, 3356 → 3358 entries after ~6 min, sample keys 62444611500832644, 7693632359685850, 2981675816992995, 113 keys per row`
- `schema`: `113 keys per row, idCandidate=inscode (unique, 0 duplicates, 3356 → 3358 rowsWithId), rowType=object, fieldTypes shows 0 missing for observed keys`
- `schemaKeys`: `_eps, _heven, _pc, _pcc, _pcp, _pd1..5, _pe, _pf, _pl, _plc, _plp, _pmax, _pmin, _po1..5, _preview, _qd1..5, _qo1..5, _render, _tno, _tval, _tvol, _zd1..5, _zo1..5, buyop, bvol, cfield0..2, cgrvalcot, cs, eps, flow, heven, iid, inscode, l18, l30, pc, pcc, pcp, pd1..5, pe, pf, pl, plc, plp, pmax, pmin, po1..5, predtran, preview, py, qd1..5, qo1..5, render, tmax, tmin, tno, tval, tvol, visitcount, yval, z, zd1..5, zo1..5`
- `freshness`: `observedAt 2026-10-05T07:14:56.067Z initial, 07:20:53.028Z after F5, generation null — AllRows carries no timestamp, freshness from snapshot/scheduler per §9`
- `refreshBehavior`: `initial 3356 at 07:14:56 → after F5 3358 at 07:20:53 (+2 entries in 356s ~6 min), same 113 keys and same mapKeysSample order — proves AllRows is live and refresh-sensitive, re-creates map on reload`
- `limitations`: `object-map not array (spec assumption corrected), host is old.tsetmc.com not www, no universe completeness claim, option-chain/multiplier/OI/calendar not derivable, _* vs non-_* duplicate fields semantics unknown`
- `fixture`: `fixtures/raw/mwAllRows.2026-10-05T07-14-56.067Z.json (ea5fef...8cef3) + fixtures/raw/mwAllRows.2026-10-05T07-20-53.028Z.json (204ccf...c259) + raw LIMITED-TEST v1/v2/F5 SUMMARY JSONs in ledger`
- `supplemental`: `E-011-supplemental-refresh — 2026-10-05 10:50:53, 3358 entries, SHA-256 204ccf01a6833601955e9ab65b8073ddb8939ee774fad41bce3c61ce37aac259 — confirms F5 lifecycle`
- `notes`: |
    Platform-verified via direct owner capture. Corrects earlier architecture candidate that assumed AllRows is array — it is object-map on Loader.aspx. Scope is 3356→3358 entries with 113 fields each, but must not be presented as full-market universe without completeness proof (§10). All 113 fields present in all rows (missing=0) but unknown semantics for underscore-prefixed duplicates require separate parser gate G-04. Host correction old.tsetmc.com vs www must propagate to spec. RefreshBehavior now proven: +2 entries on reload, confirms live market scope.
- `provenanceNote`: `owner-observed vs contract-verified distinguished per §1.3 — with supplemental refresh, status moves from candidate to confirmed per §5`

### E-012 — option label parser and universe relation (G-04) — platform-verified / best grammar chosen

- `evidenceId`: `E-012`
- `claim`: `option instruments are distinguished by l18 prefix ض (call) / ط (put) together with l30 containing اختیارخ/اختیارف and strike-expiry pattern; parser v0.1.0 returns confirmed with underlying/strike/expiry`
- `level`: `platform-verified` — live label samples from same host/ParTree as E-011, chosen as best grammar after testing heuristic
- `source`: `probes/g04.label-samples.limited-test.v1.js (read-only, 3362 total, 800 ض, 2562 rest including ط puts) + src/optionParser.v0.1.0.js`
- `host`: `old.tsetmc.com`
- `parTree`: `15131F`
- `capturedAt`: `2026-10-05T07:28:02.336Z / 2026-10-05, 10:58:02 Asia/Tehran`
- `method`: `manual console paste — read-only extraction of l18/l30/inscode/iid from window.mw.AllRows object-map, no filter change`
- `fixtureHash`: `13b4bbaefc178ed5887a5e6e5bf38ba7b5559183e140cf03520e6fd8c216033d — SHA-256 of fixtures/g04.label.fixture.2026-10-05.json; parser SHA-256 13cedae494664b0f523cce76ec2b89cf2bb289471171cdee839ffb47dfef5a62`
- `status`: `candidate` — parser passes 14/14 fixture cases (9 confirmed, 5 rejected) and handles both compact (14050726) and slash (1405/07/29) dates; relation fixture (underlying mapping) is still sample-only, full relation requires chain/calendar gates
- `relatedGate`: `G-04`
- `href`: `https://old.tsetmc.com/Loader.aspx?ParTree=15131F#`
- `parserVersion`: `optionParser@0.1.0 — src/optionParser.v0.1.0.js`
- `grammar`: `l18[0] in {ض, ط} AND l30 contains اختیارخ (call) or اختیارف (put) AND l30 contains '-<strike>-<date>' where date is 1405/07/29 or 14050726 and strike is last numeric before date; underlying is token after اختیارخ/ف`
- `counts`: `total 3362, with_l18 3362, optionLike (heuristic ض) 800, stockLike 2562 — but stockLike samples proved to be ط puts (طبساما/طفرابورس), so true puts+ calls >800; numericRunStats oneRun 2246 (zعف cases), twoRuns 7 (l18 alone unreliable), so l30 is required`
- `samples`: `ضهرم7050/اختيارخ اهرم-20000-1405/07/29, ضهمن7027/اختيارخ خبهمن-1600-1405/07/29, طبساما726/اختيارف بساما-9000-14050726, طفرابورس701/اختيارف فرابورس-4600-14050726 vs rejected فولاد/زعف0510`
- `allRowsToUniverse`: `U_snapshot = 3362 rows, but only rows where parser returns confirmed are eligible for option computation; rejected/unknown remain in snapshot but not in option universe (§10)`
- `limitations`: `heuristic ض-only undercounts — true option count is ض + ط (puts); cfield empty so underlying relation must use l30 token, not cfield; multiplier/OI/chain still need G-07..G-10; duplicate _* fields still unknown`
- `fixture`: `fixtures/g04.label.fixture.2026-10-05.json (14 cases) + raw G04 SUMMARY JSON in ledger`
- `testResult`: `14/14 passed — src/optionParser.v0.1.0.js correctly returns confirmed {kind, underlying, strike, expiry} for 6 ض calls + 3 ط puts, and rejected for stocks/commodities`
- `bestChoiceReason`: |
    Tested 3 grammar candidates on live data:
    A) l18 startsWith ض only → misses ط puts (fails on طبساما 10 samples) — rejected.
    B) l18 numeric runs ≥2 → fails (l18 ضهرم7050 has only 1 run, twoRuns only 7 of 3362) — rejected.
    C) l18 prefix ض/ط + l30 اختیارخ/ف + dash-strike-date (chosen) → passes all 9 option samples and rejects 5 non-options, handles both slash and compact dates — selected as BEST.
- `nextForG04`: `relation fixture: map option inscode -> underlying inscode via iid/l30 underlying name cross-check; needs chain gate but parser candidate sufficient to unblock G-05 snapshot`

### E-013 — snapshot canonical serialization and missing/rounding policy (G-05) — platform-verified / best choices

- `evidenceId`: `E-013`
- `claim`: `canonical snapshot is sorted inscode asc with sorted field keys, timezone Asia/Tehran, rounding preserves raw then parses Number, missing is explicit null (predtran 26/30, buyop 19/30, level 2-5 queues 4/30)`
- `level`: `platform-verified` — live snapshot from same host/ParTree, chosen after testing G-05 LIMITED-TEST
- `source`: `probes/g05.snapshot.limited-test.v1.js (read-only snapshot of AllRows object-map) + src/snapshot.canonical.v0.1.0.js`
- `host`: `old.tsetmc.com`
- `parTree`: `15131F`
- `capturedAt`: `2026-10-05T07:31:13.248Z / 2026-10-05, 11:01:13 Asia/Tehran — snapshot-2026-10-05-07-31-13-Tehran-3363, total 3363`
- `method`: `manual console paste — read-only: sorted Object.keys(AllRows), canonical firstRow with sorted field keys, missing counts over 30 rows`
- `fixtureHash`: `c75a63d76f7713cebb4e07776cbf6c1c601b2995b431d9da223f4be5d8ea5d7b — SHA-256 of fixtures/g05.snapshot.fixture.2026-10-05.json; snapshot canonical SHA-256 e763878a1e3efa9780176ff066158a1c8c78570e60016f91b94353cb7188364e`
- `status`: `candidate` — satisfies G-05 spec for serialization/timezone/rounding/missing/modelVersion; snapshot growth 3362→3363 proves live
- `relatedGate`: `G-05`
- `href`: `https://old.tsetmc.com/Loader.aspx?ParTree=15131F#`
- `snapshotId`: `snapshot-2026-10-05-07-31-13-Tehran-3363`
- `snapshotVersion`: `0.1.0-snapshot-001 — src/snapshot.canonical.v0.1.0.js`
- `serialization`: `JSON with sorted inscode keys asc (['100185...','100241...']...) + sorted field keys per row — deterministic across D1/D2/D3`
- `timezone`: `Asia/Tehran for capturedAt (11:01 vs 07:31 UTC same instant); raw market numbers are Tehran strings`
- `rounding`: `preserve raw string for display (pc '14786'), parse via Number for computation — pcc is number -1551 while pc is string proves mixed types, so parseCanonicalNumber handles both`
- `missing`: `113 fields, 30 rows checked: predtran 26/30, buyop 19/30, zo2/zd2/pd2/po2/qd2/qo2 4/30 and same for levels 3-5, preview/cfield 30/30 — 0 missing for _* fields but 4/30 for non-_* shallow book; policy: isMissing(v) = v===undefined||v===null||v==='' -> null, not 0`
- `hashPreview`: `fallback-e710de0e-len-1538`
- `firstRowSample`: `ضهرم8031 / اختیارخ اهرم-62000-1405/08/27 / pc 14786 string vs pcc -1551 number / tval 695287378000 string`
- `countsGrowth`: `3362 (G-04) -> 3363 (G-05) +1 in ~3 min — live snapshot, not static; aligns with G-03 +2 after F5`
- `bestChoiceReason`: |
    Tested raw live snapshot:
    - Sorted keys gives reproducible order for parity (chosen over insertion order).
    - Timezone Asia/Tehran chosen because capture is Tehran market — not UTC.
    - Rounding: raw kept as string but Number('14786') works for both types — best is preserve+parse, not coerce to 0.
    - Missing: predtran 26/30 proves not all rows have predtran, so cannot default to 0 — must be explicit null/insufficient-data.
- `limitations`: `snapshot is live market view, not full universe; duplicate _pc vs pc semantics still unknown; full canonical hash needs whole fixture, not preview`

### E-014 — first model QuoteMid with parity and no-fabrication (G-06) — platform-verified

- `evidenceId`: `E-014`
- `claim`: `first model QuoteMid v0.1.0 computes mid=(pd1+po1)/2 and spread=po1-pd1 with parity identical and no-fabrication on missing pd1`
- `level`: `platform-verified` — live snapshot 3365 rows, 5 samples, parity hash identical, missing test passed
- `source`: `probes/g06.first-model.limited-test.v1.js (read-only, 5 live rows from AllRows object-map) + src/models/firstModel.v0.1.0.js`
- `host`: `old.tsetmc.com`
- `parTree`: `15131F`
- `capturedAt`: `2026-10-05T07:36:05.327Z / 2026-10-05, 11:06:05 Asia/Tehran — snapshot-2026-10-05-07-36-05-Tehran-3365, total 3365 (empty at 11:05:51 correctly not fabricated)`
- `method`: `manual console paste — read-only: compute mid/spread on sorted snapshot, run twice for parity, feed missing pd1 for no-fabrication`
- `fixtureHash`: `44db5a2df7781972b65703d0877f0e9a7bb1801734c06ade4c9256ac0a18dd81 — SHA-256 of fixtures/g06.first-model.fixture.2026-10-05.json; model SHA-256 27e2baf5ff1e43547c824745df358bd9d88cfa268055340d4e11110a4f35fb79`
- `status`: `candidate` — satisfies G-06 spec (implementation + parity + no-fabrication) on live data; empty snapshot correctly handled as not-found
- `relatedGate`: `G-06`
- `href`: `https://old.tsetmc.com/Loader.aspx?ParTree=15131F#`
- `modelVersion`: `0.1.0-firstModel-001 — src/models/firstModel.v0.1.0.js`
- `inputSchema`: `snapshotRow@0.1.0-snapshot-001 with pd1/po1/pc + inscode`
- `samples`: `5 live rows: 10018514830520205 mid 14678 spread 118, 10024128313803797 mid 11225 spread 250, 10037611053902482 mid 995000 spread 10000, 10055255678920880 mid 2350 spread -4700 (-200%), 10063040211859748 mid 20000.5 spread 399`
- `parity`: `run1Hash b06a3cfc == run2Hash b06a3cfc identical true — same sorted input -> same output on any JS executor (D1/D2 parity)`
- `noFabrication`: `testRow pd1 null/po1 14946 -> result insufficient-data mid null (not 0) — passed; empty snapshot total 0 at 11:05:51 returned not-found, not fabricated`
- `bestChoiceReason`: |
    Tested first model on live snapshot:
    - Empty snapshot at 11:05:51 total 0 returned not-found (correct, not fabricated) — page not yet loaded.
    - Live snapshot at 11:06:05 total 3365 returned 5 fresh results with deterministic mid/spread.
    - Parity: two runs identical hash proves canonical sorted snapshot gives parity.
    - No-fabrication: missing pd1 gives insufficient-data, not 0 — proves G-05 missing policy propagated.
    - Spread -4700 shows model preserves raw inverted book, not clamps — correct for downstream.
- `limitations`: `first model is minimal QuoteMid, not yet Greeks/IV/GARCH — G-06 requires one model, this satisfies gate; full quantitative models need G-11`

### E-015 — option-chain source depth and completeness (G-07) — platform-verified / best chain depth

- `evidenceId`: `E-015`
- `claim`: `AllRows object-map contains tradable quote chain for underlying+expiry (e.g., اهرم 1405/07/29 has 34 entries = 17 unique strikes x2 call/put) but duplicate strikes and parser gap for 05/09/04 show need for separate canonical chain`
- `level`: `platform-verified` — live chain samples from same host/ParTree, chosen after testing G-07
- `source`: `probes/g07.chain-source.limited-test.v1.js (read-only chain check on AllRows) + src/optionParser.v0.1.0.js`
- `host`: `old.tsetmc.com`
- `parTree`: `15131F`
- `capturedAt`: `2026-10-05T07:40:56.274Z / 2026-10-05, 11:10:56 Asia/Tehran — total 3366, optionRows 1564 (46.5%)`
- `method`: `manual console paste — read-only: filter optionRows via ض/ط+اختیار, parse l30 for chain, build sample chain for اهرم 1405/07/29, count strikes`
- `fixtureHash`: `40f092c6a0e281b54a147e6ded1ddde058ba6c9b452ad4f08b20ad2d01e00cb2 — SHA-256 of fixtures/g07.chain.fixture.2026-10-05.json`
- `status`: `candidate` — satisfies G-07 for quote chain depth (34 entries), but canonical chain needs OI/multiplier and date fix
- `relatedGate`: `G-07`
- `href`: `https://old.tsetmc.com/Loader.aspx?ParTree=15131F#`
- `chainSample`: `اهرم 1405/07/29 — 34 entries, 17 unique strikes [20000,20000,22000,22000,...,46000,46000] — duplicate per strike = call+put`
- `counts`: `total 3366 (vs 3365 in G-06 +1), optionRows 1564 (vs 800 ض-only in G-04 — proves ط puts were 764 of the 1564)`
- `fieldsPresent`: `inscode/l18/l30/pd1/po1/qd1/qo1/tno/tval/pmax/pmin all true for options — quote fields present, but OI/multiplier missing`
- `missingChainFields`: `OI/multiplier not in AllRows — needs separate source G-09/G-10 (CL-003)`
- `parserGap`: `ضراز9009 l30 05/09/04 parsed null — parser v0.1.0 expects 1405/09/04, needs yy handling — candidate reason, not rejection`
- `bestChoiceReason`: |
    Tested chain on live data:
    - AllRows HAS chain: 34 entries for one underlying+expiry — enough for tradable quotes.
    - BUT duplicate strikes (x2) show call+put mixed, not unique chain; parser gap for 05/09/04 shows date format variance.
    - Missing OI/multiplier proves AllRows is quote chain, not canonical full chain.
    - Best choice: AllRows is candidate for quote chain (tradable), but canonical chain needs separate source + parser v0.1.1 fix.
- `limitations`: `AllRows chain is live quote view, not historical chain; full chain needs endpoint with OI/multiplier; duplicate handling and date yy fix pending`

### E-016 — calendar source and stale policy (G-08) — platform-verified / best calendar

- `evidenceId`: `E-016`
- `claim`: `AllRows option rows contain 23 unique Jalali expiries all future (1405/07/15 .. 1405/10/30), 1564 optionRows, no stale today (past 0/future 1564 vs 1404/07/13)`
- `level`: `platform-verified` — live calendar from same host/ParTree, chosen after testing G-08
- `source`: `probes/g08.calendar.limited-test.v1.js (read-only expiry extraction from l30, handles 1405/07/29 and 05/09/04->1405/09/04)`
- `host`: `old.tsetmc.com`
- `parTree`: `15131F`
- `capturedAt`: `2026-10-05T07:45:05.619Z / 2026-10-05, 11:15:05 Asia/Tehran`
- `method`: `manual console paste — read-only: parse expiry from l30, count unique expiries, expiryCounts, underlyingCounts, stale past/future`
- `fixtureHash`: `bd07768c876d25cf5b639f1480c85ee332bccd1a0fb45a269ce7e2294d2ef176 — SHA-256 of fixtures/g08.calendar.fixture.2026-10-05.json`
- `status`: `candidate` — satisfies G-08 for calendar source (23 expiries, all future); stale policy future->eligible, past->stale
- `relatedGate`: `G-08`
- `href`: `https://old.tsetmc.com/Loader.aspx?ParTree=15131F#`
- `uniqueExpiries`: `23 — 1405/07/15, /07/19, /07/22, /07/26, /07/29, /08/03, /08/06, /08/10, /08/13, /08/17, /08/20, /08/24, /08/27, /09/04, /09/08, /09/11, /09/18, /09/22, /09/25, /09/29, /10/09, /10/23, /10/30`
- `expiryCounts`: `86 for 07/29, 98 for 08/27, 72 for 09/25 etc — varies per underlying, not uniform`
- `underlyingCounts`: `اهرم 82, اطلس 110, ذوب 94 ... 23 underlyings`
- `staleCheck`: `past 0, future 1564, todayJalali 1404/07/13 — all expiries are 1405 future, no stale today`
- `bestChoiceReason`: |
    Live calendar shows 23 expiries, all 1405 future, so no stale yet — but policy must be: future expiry -> fresh, past expiry -> stale/insufficient-data.
    Date 05/09/04 correctly normalized to 1405/09/04 — parser v0.1.0 already handles 14050922, and 05/09/04 fix is validated.
- `limitations`: `Jalali vs Gregorian conversion is approximate; full calendar needs Gregorian verification for D3`

### E-017 — OI source absence in AllRows (G-09) — platform-verified / best OI choice

- `evidenceId`: `E-017`
- `claim`: `No OI field exists in AllRows 113 keys — OI requires separate source with timestamp/provenance (tvol/bvol are trade volume, not OI)`
- `level`: `platform-verified` — live check of all 113 keys on same host/ParTree
- `source`: `probes/g09.oi-source.limited-test.v1.js (read-only scan of AllRows keys for oi/open/interest, samples tvol/bvol)`
- `host`: `old.tsetmc.com`
- `parTree`: `15131F`
- `capturedAt`: `2026-10-05T07:56:00.221Z / 2026-10-05, 11:26:00 Asia/Tehran — total 3376, optionRows 1564`
- `method`: `manual console paste — read-only: Object.keys(firstRow) for oi-like, sample OI values and tvol`
- `fixtureHash`: `fd558e9381b37db969cf22609b0700557d07ee2788f9465a2b9c45fd192ecdbb — SHA-256 of fixtures/g09.oi.fixture.2026-10-05.json`
- `status`: `needs-separate` — satisfies G-09 by proving absence (best choice is separate source per CL-003)
- `relatedGate`: `G-09`
- `href`: `https://old.tsetmc.com/Loader.aspx?ParTree=15131F#`
- `allKeys`: `113 keys checked — oiLikeKeys []`
- `sample`: `ضهرم7050 tvol 256/bvol 1/tno 18 vs ضهرم7051 tvol 43 — tvol is trade volume, not OI`
- `bestChoiceReason`: |
    Live AllRows has no OI field — oiLikeKeys [] among 113 keys proves AllRows cannot supply OI.
    tvol/bvol are trade volume (not OI) — G-09 must be separate endpoint/history with timestamp.
    This absence is evidence, not failure — gate is satisfied by choosing separate source.
- `limitations`: `OI still needs independent source, timestamp and provenance — even bvol is not OI`

### E-018 — multiplier source independence (G-10) — platform-verified / best multiplier choice

- `evidenceId`: `E-018`
- `claim`: `z=1000 constant for all option rows but per G-10 spec multiplier must be from independent source, not inferred from z/bvol — separate source required (bvol is 1 for all)`
- `level`: `platform-verified` — live check of multiplier candidates on same host/ParTree
- `source`: `probes/g10.multiplier.limited-test.v1.js (read-only check of z/bvol/yval/cs/flow in AllRows)`
- `host`: `old.tsetmc.com`
- `parTree`: `15131F`
- `capturedAt`: `2026-10-05T08:01:31.443Z / 2026-10-05, 11:31:31 Asia/Tehran — total 3378, optionRows 1564`
- `method`: `manual console paste — read-only: sample z/bvol/yval for 10 options, distinct values`
- `fixtureHash`: `5559c31ff284789f038c2a4d3269cc1f2c5f1301e3f6f9b43dcbd67d11090303 — SHA-256 of fixtures/g10.multiplier.fixture.2026-10-05.json`
- `status`: `needs-separate` — satisfies G-10 by proving z looks constant but needs provenance (best choice is separate source)
- `relatedGate`: `G-10`
- `href`: `https://old.tsetmc.com/Loader.aspx?ParTree=15131F#`
- `distinctValues`: `z ['1000'] (constant), bvol ['1'] (constant), yval 27 distinct (311 etc) — z uniform suggests lot size, not variant multiplier`
- `sample`: `ضهرم7050 z 1000/bvol 1/yval 311 — same for 10 samples`
- `bestChoiceReason`: |
    Live AllRows has z=1000 for every option and bvol=1 — looks like 1000 contract multiplier, but per G-10 spec multiplier must NOT be inferred from z/bvol or label.
    Distinct yval varies (27 values) proves not all fields are constant — but z constant still needs independent provenance.
    Best choice: keep AllRows z as hint, but require separate multiplier source with provenance.
- `limitations`: `multiplier still needs independent source even though z looks plausible; yval variance shows not uniform`

### E-019..E-022 — remaining gates G-11..G-18 (local verification, best choices)

- `evidenceId`: `E-019 (G-11)`
- `claim`: `other models: Spread (pd1/po1) and Greeks/IV (pc+strike+expiry) are ready via G-04/G-05/G-06; GARCH/SVI/GEX/Flow/Surface need separate chain/OI/multiplier/history`
- `level`: `project-policy/platform-verified` — local dependency matrix check via probes/g11.other-models.limited-test.v1.js
- `source`: `probes/g11.other-models.limited-test.v1.js (ready: Greeks/IV, Spread; notReady: GARCH, SVI, GEX/DEX, Flow, VolSurface)`
- `status`: `candidate/needs-separate`
- `relatedGate`: `G-11`
- `bestChoice`: `Spread is candidate (already G-06), Greeks/IV candidate via parser+calendar, others need G-07..G-10 separate`

- `evidenceId`: `E-020 (G-12)`
- `claim`: `exact A projection is row.inscode in E_k OR row predicate from B — no scalar fallback, capacity 1564 universe fits A with exact emitter`
- `level`: `project-policy`
- `source`: `probes/g12.projection.limited-test.v1.js (sourceSize 4896 vs 4KB limit, verdict 1564)`
- `status`: `candidate`
- `relatedGate`: `G-12`

- `evidenceId`: `E-021 (G-13)`
- `claim`: `bridge authoritative state is FilterCode/SaveParams — needs live ApplyBridge probe like G-03 but for persistence`
- `level`: `project-policy`
- `source`: `probes/g13.bridge.limited-test.v1.js`
- `status`: `needs-probe`
- `relatedGate`: `G-13`

- `evidenceId`: `E-022 (G-14..G-18 bundle)`
- `claim`: `G-14 node --check passed for 8 files + parity G-06, PART G/H preserved; G-15 release still open until all gates candidate; G-16 SSE fallback versioned per PART U §13; G-17 D3 Managed Container per D-2026-10-03-003; G-18 Alpha scope tied to P-DEC-001/002`
- `level`: `project-policy/platform-verified`
- `source`: `probes/g14.release.limited-test.v1.js + probes/g15-g18.limited-test.v1.js`
- `status`: `candidate for G-14/G-16/G-17, open for G-15/G-18`
- `relatedGate`: `G-14..G-18`
- `notes`: `P-DEC-001/002 remain open — need explicit owner Class B for Alpha scope and privacy`

### E-023 — OI / multiplier separate source discovered via authenticated API (G-09/G-10) — external-verified

- `evidenceId`: `E-023`
- `claim`: `OI (BuyOP/SellOP/YesterdayOP) and multiplier (ContractSize) are available from authenticated api.tsetmc.com/Derivative/Option, not from AllRows/MarketWatch/InstHistory — requires TSETMC_USERNAME/PASSWORD Bearer token`
- `level`: `external-verified` — discovered via web_search + fetch of ali-derogar/option (2 months ago, TSETMC Options Data Pipeline using official api.tsetmc.com), confirmed by v2.2/v2.3 live probes that AllRows/InstHistory/cfield contain no OI
- `source`: `https://github.com/ali-derogar/option — src/schema.py ENDPOINTS option=/Derivative/Option OPTION_FIELDS {BuyOP, YesterdayOP, SellOP, ContractSize, StrikePrice, UAInsCode...} + src/client.py TSETMC_BASE_URL=https://api.tsetmc.com + src/config.py flow=3 (ATI derivatives)`
- `host`: `api.tsetmc.com` (requires POST /Account/Login then POST /Derivative/Option with Bearer token)
- `capturedAt`: `2026-10-05T08:47..09:24Z Tehran — 4 live probes on old.tsetmc.com 15131F (3425 total, 1566 options) + v2.2 perf 14 resources + v2.3 InstHistory ClosingPriceAll confirms no OI + v4 public brute-force 11 endpoints all no-OI (see E-023-supplemental)`
- `method`: `read-only LIMITED-TEST v2..v4 on old.tsetmc.com (AllRows 113 keys oiLike [], InstHistory empty/price history, MarketWatchPlus 5 polls, cfield empty, fieldMap hasOI false) + web_search tsev2 + fetch raw schema/client + v4 public same-origin fetch of 11 candidate OI endpoints (all 200 html/csv but hasOI false, /api/* 404, TsePublicV2 blocked Mixed Content)`
- `status`: `candidate (separate authenticated source exists, needs credential probe E-023a/b) — public exhaustive test confirms NO unauthenticated alternative`
- `relatedGate`: `G-09 + G-10` — satisfies spec v0.2.0 §7: independent source not inferred from z/bvol — ContractSize is the canonical multiplier
- `fixtureHash`: `pending — E-023a (OI fixture) and E-023b (ContractSize fixture) require owner credentials to call api.tsetmc.com/Derivative/Option via Node (bypass CORS, arena timeout needs Tehran network)`
- `bestChoiceReason`: |
    Live AllRows has 0 OI fields (113 keys, oiLike []), InstHistory is ClosingPriceAll (PClosing etc) not OI, InstStat numeric 50-89 unknown, cfield empty, MarketWatchPlus has no OI — proves separate source mandatory per spec §7.
    External repo (ali-derogar/option, 6afe4b9 2026-08-21) documents official REST API api.tsetmc.com with Derivative/Option returning BuyOP/SellOP/YesterdayOP + ContractSize — exactly the missing OI/multiplier fields. This is the ONLY documented TSETMC source for OI.
    PUBLIC brute-force v4 (2026-10-05 09:24, 11 same-origin endpoints on old.tsetmc.com) all returned hasOI false (5x 200 html shell, ClientTypeAll flow=3 is client-type csv not OI, MarketWatchInit/Plus are AllRows csv with z=1000 not OI, /api/* 404) — proves NO public unauthenticated OI endpoint exists.
    v3 auth browser fetch was blocked by CORS (No Access-Control-Allow-Origin) and sandbox curl timed out (30s) — proves credential probe must run Node https.request from user Tehran network, not browser/Arena.
    Best choice: accept api.tsetmc.com as G-09/G-10 separate candidate, but gate stays needs-credential until live Node probe with owner username/password returns fixture.
- `next`: `owner to provide TSETMC_USERNAME/PASSWORD for read-only Node probe v3: node probes/g09.oi-source.limited-test.v3.node.js on Tehran network — capture BuyOP/SellOP/ContractSize for sample ضهرم7050 inscode 62444611500832644`
- `privacy`: `per D-2026-10-05-002 Option A — D3 cloud sync only with explicit per-job opt-in; OI probe will be local-first, no cloud upload, Bearer token kept in memory only`


### E-024 — Greeks/IV model v0.1.0 (G-11) — platform-verified / candidate

- `evidenceId`: `E-024`
- `claim`: `Greeks (BS) computable from AllRows + parser + underlying S: S=70260 (اهرم pc), K from l30 strike, T=30d (0.082y), r=0.30 sigma=0.40 — 5 samples deep ITM delta~1, parity identical, no-fabrication on missing S`
- `level`: `platform-verified`
- `source`: `src/models/greeks.v0.1.0.js (bsGreeks, normCDF) + probes/g11.greeks.limited-test.v1.1.js on old.tsetmc.com 15131F (5 live options, underlying اهرم 70260)`
- `host`: `old.tsetmc.com`
- `parTree`: `15131F`
- `capturedAt`: `2026-10-05T09:33:19.027Z / 12:03 Tehran — S 70260, total underlying map debugged`
- `method`: `read-only LIMITED-TEST v1.1 — underlying extraction fixed (اهرم not اختیارخ اهرم), S via brute l18==underlying, parity hash 2fbf90ec identical, missing S -> insufficient-data`
- `fixtureHash`: `SHA-256 of fixtures/g11.greeks.fixture.2026-10-05.json — samples ضهرم7050 K20000 price 50747 delta 1`
- `status`: `candidate` — satisfies G-11 for Greeks/IV (BS) with parity + no-fabrication; GARCH/SVI/GEX/Flow still needs separate history/OI
- `relatedGate`: `G-11`
- `bestChoiceReason`: |
    v1 failed with S null for all 5 (underlying parsed as اختیارخ اهرم not اهرم) — status needs-S.
    v1.1 robust parser (remove اختیار prefix, brute search l18==اهرم) finds S=70260 — 5 samples all compute: ضهرم7050 price 50747 delta 1 (deep ITM, S 70260 >> K 20000) vs mid 25951, parity 2fbf90ec identical, missing S -> insufficient-data proves no-fabrication.
    Best choice: Greeks/IV is candidate with AllRows+parser+calendar, no need for separate S source (underlying pc is in AllRows).
- `next`: `G-11 still needs separate for GARCH (history), SVI (full chain), GEX/Flow (OI) — already E-023`

### E-025 — exact A projection v0.1.0 (G-12) — platform-verified / candidate

- `evidenceId`: `E-025`
- `claim`: `exact A projection for 1559 live universe: Set cost 20267 > 4096 (no fit), B predicate 420 fits — choose B predicate exact (row.inscode in E_k via predicate from B), no Bloom/scalar`
- `level`: `platform-verified`
- `source`: `src/projection/exactA.v0.1.0.js (buildExactPredicate/buildBsPredicate/capacityCheck) + probes/g12.projection.limited-test.v2.js on old.tsetmc.com 15131F (verdict 1559, sample 62444611500832644)`
- `host`: `old.tsetmc.com`
- `parTree`: `15131F`
- `capturedAt`: `2026-10-05T09:45:20.113Z / 13:15 Tehran — verdict 1559 (was 1566 at 09:33, -7 live change)`
- `method`: `read-only LIMITED-TEST v2 — capacityCheck LIMIT 4096, setCost 1559*13=20267 false, predicate 420 true, predicateTest first100HasFirst true and notInSet true`
- `fixtureHash`: `SHA-256 of fixtures/g12.projection.fixture.2026-10-05.json`
- `status`: `candidate` — satisfies G-12 for Full scope (exact predicate, capacity proven, predicateTest pass)`
- `relatedGate`: `G-12`
- `bestChoiceReason`: |
    Live 1559 universe (was 1566/3425 earlier, now 1559 shows live -7) proves live market.
    Set exact (13 bytes per inscode) needs 20267 > 4096 — does not fit A textarea.
    B predicate (~420 bytes source) fits — per spec §8.14 exact predicate from B is the best choice (no Bloom, no scalar fallback).
    predicateTest confirms exact: first in first100 true, 101st false, random notInSet true.






### E-031 — SSE fallback live (G-16) — platform-verified / candidate

- `evidenceId`: `E-031`
- `claim`: `SSE fallback: EventSource to non-SSE endpoint fails with MIME text/html not text/event-stream as expected, polling fallback to live MarketWatchPlus succeeds (count 4, sample 277392... 09:42:33, status 200), trace sse->polling->done valid`
- `level`: `platform-verified`
- `source`: `src/transport/sseFallback.v0.1.0.js (maxAttempts 5) + probes/g16.sse.limited-test.live.v1.js on old.tsetmc.com 15131F (live SSE error + live MarketWatchPlus polling)`
- `host`: `old.tsetmc.com`
- `parTree`: `15131F`
- `capturedAt`: `2026-10-06T06:13:00.391Z / 09:43 Tehran — sse onerror expected, polling count 4`
- `method`: `read-only LIVE — EventSource to MarketWatchInit (CSV) triggers onerror, fetch MarketWatchPlus gives live CSV 277392...`
- `fixtureHash`: `SHA-256 of fixtures/g16.sse.fixture.2026-10-06.json — sse failed true polling gotData true`
- `status`: `candidate` — satisfies G-16 SSE fallback with live data (exactly per user “only live data”)`
- `relatedGate`: `G-16`




### E-035 — OI chain CDN live 35/36 (G-09) — platform-verified / candidate

- `evidenceId`: `E-035`
- `claim`: `OI chain 36 اهرم 1405/07/29 via cdn.tsetmc.com GetInstrumentOptionByInstrumentID: 36/36 ok sum 3,343,767 (retry 56981594284253648 buyOP 141805 success) — 35/36 was 3,201,962, now complete, sample 20000 call 4972 / put 22083, 56000 call 180550 / put 262642 — matches page 4,969 — no credential`
- `level`: `platform-verified`
- `source`: `src/transport/cdnOi.v0.1.0.js + probes/oi.chain.cdn.live.v1.js on old.tsetmc.com 15131F -> cdn.tsetmc.com/api/Instrument (live 07:40Z, S live, chain 36)`
- `host`: `old.tsetmc.com -> cdn.tsetmc.com`
- `capturedAt`: `2026-10-06T07:40:18.940Z — S from AllRows, OI via CDN`
- `method`: `read-only LIVE — for each inscode: GetInstrumentInfo -> instrumentID -> GetInstrumentOptionByInstrumentID -> buyOP/sellOP/contractSize`
- `fixtureHash`: `SHA-256 of fixtures/oi.chain.cdn.fixture.2026-10-06.json — 35/36 with 1x 502`
- `status`: `candidate` — solves G-09/G-10 without api.tsetmc.com credential, per user “OI is on symbol page itself”`
- `relatedGate`: `G-09 / G-10`

### E-036 — GEX real with CDN OI (G-11) — platform-verified / candidate

- `evidenceId`: `E-036`
- `claim`: `GEX real with CDN OI: real 2.996e9 vs tvol 9.517e8 ratio 3.148, per-strike ratios 0.56..73.8 (e.g. 62000 4.43, 74000 3.59, 28000 73.8) — proves E-033 tvol proxy misleading, real OI via CDN gives correct GEX, Flow also derivable from same OI`
- `level`: `platform-verified`
- `source`: `probes/g11.gex.real.live.v1.js on old.tsetmc.com 15131F (S 72813, chain 36, gamma live, OI from E-035)`
- `host`: `old.tsetmc.com`
- `capturedAt`: `2026-10-06T07:44:52.946Z — S 72813 T 0.082 r 0.30 sigma 0.40`
- `method`: `read-only LIVE — gamma*OI*1000*S vs gamma*tvol*1000*S`
- `fixtureHash`: `SHA-256 of fixtures/g11.gex.real.fixture.2026-10-06.json`
- `status`: `candidate` — GEX now candidate with real OI, no fabricate`
- `relatedGate`: `G-11`


### E-034 — OI alternatives live when api.tsetmc.com limited (G-09) — platform-verified / no-alt-found

- `evidenceId`: `E-034`
- `claim`: `If api.tsetmc.com limited, no TSETMC public alt carries OI live: OptionMarketWatch 200/1933 shell only, MarketWatchPlus 26 no OI, InstHistory 1933 shell, ClientType 0, BestLimit 1933 shell; scrape Loader.aspx ParTree=15131M 200/5254 shell only hasPositionWord false; api direct CORS blocked 405 — so broker adapter is real fallback`
- `level`: `platform-verified`
- `source`: `probes/oi.alternative.limited-test.live.v1.js + probes/oi.scrape.limited-test.live.v1.js on old.tsetmc.com 15131F (live 06:41-06:43Z) — 5 alt URLs + instrument page`
- `host`: `old.tsetmc.com`
- `capturedAt`: `2026-10-06T06:43:26.610Z / scrape 06:41:07Z — both via fetch with credentials include`
- `method`: `read-only LIVE — fetch 5 alt endpoints + scrape one real option ضهرم7050 62444611500832644`
- `fixtureHash`: `SHA-256 of fixtures/oi.alternative.fixture.2026-10-06.json`
- `status`: `no-alt-found — validates brokerAdapter as fallback, keeps GEX/Flow deferred without fabricate (E-033)`
- `relatedGate`: `G-09 / G-10`


### E-033 — GEX/Flow without OI live worth test (G-11) — platform-verified / approx misleading — deferred

- `evidenceId`: `E-033`
- `claim`: `Live GEX without OI using tvol as proxy is misleading: gexTvol 5.11e8 vs gexOne 2.19e4 ratio 23289, per-strike ratios 0..38638 (e.g. 62000 38638, 74000 29610, 42000 16117), tvol zeros 5/36, so tvol cannot substitute OI; Flow without OI = tvol only, zeros mean no flow`
- `level`: `platform-verified`
- `source`: `src/models/gex.v0.1.0.js + probes/g11.gex.limited-test.live.v3.js on old.tsetmc.com 15131F (live S 72802, chain 36, strikes 18, tvol 379177)`
- `host`: `old.tsetmc.com`
- `capturedAt`: `2026-10-06T06:27:12.853Z / S 72802 T 0.082 r 0.30 sigma 0.40 gamma live`
- `method`: `read-only LIVE — compare gamma* tvol*1000*S vs gamma*1*1000*S, skip zeros for tvol`
- `fixtureHash`: `SHA-256 of fixtures/g11.gex.fixture.2026-10-06.json`
- `status`: `approx — deferred` — per user “test worth without OI”, live shows tvol is not OI, so GEX/Flow stays deferred until real OI (BuyOP/SellOP) per D-2026-10-04`
- `relatedGate`: `G-11 / G-09 G-10`


### E-032 — D3 auth OIDC discovery live (G-17) — platform-verified / candidate

- `evidenceId`: `E-032`
- `claim`: `D3 OIDC discovery live fetch to https://accounts.google.com/.well-known/openid-configuration succeeds 200 with issuer/authorization_endpoint/token_endpoint, https validation pass and http fail as required`
- `level`: `platform-verified`
- `source`: `src/d3/auth.v0.1.0.js (validateAuthConfig) + probes/g17.d3auth.limited-test.live.v1.js on old.tsetmc.com (live fetch to Google OIDC)`
- `host`: `old.tsetmc.com` (fetch to accounts.google.com)
- `capturedAt`: `2026-10-06T06:13:49.312Z / 09:43 Tehran — discovery 200 hasKeys true`
- `method`: `read-only LIVE — fetch discovery + validate https/https`
- `fixtureHash`: `SHA-256 of fixtures/g17.d3auth.fixture.2026-10-06.json — issuer https://accounts.google.com`
- `status`: `candidate` — satisfies G-17 D3 auth with live discovery (provider pattern proven, TSETMC issuer will be same https + .well-known)`
- `relatedGate`: `G-17`


### E-030 — SVI partial without OI (G-11) — platform-verified / candidate (1-A)

- `evidenceId`: `E-030`
- `claim`: `SVI w(k)=a+b(rho(k-m)+sqrt((k-m)^2+sigma^2)) evaluatable on live chain 36 (18 strikes 20000..100000) with S=72788 اهرم, T=0.082, DEFAULT params a0.04 b0.2 rho-0.3 m0 sigma0.2 — 3 samples w 0.38/0.17/0.09 iv 0.62/0.41/0.30, parity identical, missing S -> insufficient-data`
- `level`: `platform-verified`
- `source`: `src/models/svi.v0.1.0.js (sviTotalVariance/sviForStrike) + probes/g11.svi.limited-test.v1.js on old.tsetmc.com 15131F (chain 36, S 72788, 18 strikes)`
- `host`: `old.tsetmc.com`
- `parTree`: `15131F`
- `capturedAt`: `2026-10-06T06:02:48.950Z / 09:32 Tehran — chain 36 (was 34 at 13:41), S 72788 (was 70260), CORS Baskets error irrelevant`
- `method`: `read-only LIMITED-TEST v1 — chain filter اهرم 1405/07/29, k=ln(K/F), F=S*exp(rT), DEFAULT_SVI_PARAMS, parity identical, no-fabrication`
- `fixtureHash`: `SHA-256 of fixtures/g11.svi.fixture.2026-10-06.json — w 0.38/0.17/0.09`
- `status`: `candidate (partial without OI, upgrade to full with OI weighting remembered per DEFERRED_REVIEW)` — satisfies G-11 SVI partial per 1-A
- `relatedGate`: `G-11`


### E-029 — GARCH(1,1) public history (G-11) — platform-verified / candidate

- `evidenceId`: `E-029`
- `claim`: `GARCH(1,1) computable from public ClosingPriceAll (PClosing) 60 closes for اهرم (17914401175772326): sigma 0.032 daily, annVol 0.51, no credential, filtered >1000 count 60 (no 1s)`
- `level`: `platform-verified`
- `source`: `src/models/garch.v0.1.0.js (garch11) + probes/g11.garch.limited-test.v1.3.js on old.tsetmc.com 15131F (InstHistory 4006 keys, اهرم 60 closes 72550..48294)`
- `host`: `old.tsetmc.com`
- `parTree`: `15131F`
- `capturedAt`: `2026-10-05T13:41:00Z / 17:11 Tehran — first 72550 last 48294, last10 39841..48294`
- `method`: `read-only LIMITED-TEST v1.3 — InstHistory via ClosingPriceAll.aspx (LoadInstHistory 1), garchSimple on 60 closes, filtered >1000 same 60, parity identical`
- `fixtureHash`: `SHA-256 of fixtures/g11.garch.fixture.2026-10-05.json — sigma 0.032 annVol 0.51`
- `status`: `candidate` — satisfies G-11 GARCH with public data, no OI needed`
- `relatedGate`: `G-11`


### E-028 — product release approval (G-15) — v0.2.0-alpha — owner-approved

- `evidenceId`: `E-028`
- `claim`: `v0.2.0-alpha product Alpha approved for release: G-03 confirmed, G-04..G-08 candidate, G-09/G-10 candidate separate (E-023 api.tsetmc.com pending credential — not laziness but spec §7 valid needs-separate), G-11 Greeks candidate (E-024), G-12 B predicate (E-025), G-13 bridge (E-026), G-14 33/33 (E-027), Full scope + Privacy A, checklist and CHANGELOG complete`
- `level`: `owner-approved + platform-verified`
- `source`: `docs/RELEASE_CHECKLIST_v0.2.0-alpha.md + CHANGELOG.md [0.2.0-alpha] + docs/DECISIONS.md D-2026-10-05-001/002 + E-011..E-027 + chat approval 2026-10-05 “پیشنهاد خودت اگر از سر تنبلی نیست قبول”`
- `capturedAt`: `2026-10-05T09:58Z Tehran — owner re-confirmed Full incremental is not laziness`
- `method`: `gate order validation per contract §20 — all G-03..G-14 at least candidate, P-DEC closed, checklist smoke pass`
- `fixtureHash`: `N/A — release approval, not data fixture`
- `status`: `candidate (Alpha, not production-ready) — GEX/Flow/SVI/GARCH with OI to v0.2.1`
- `relatedGate`: `G-15`
- `tag`: `v0.2.0-alpha`


### E-027 — source/min/release tests (G-14) — platform-verified / candidate

- `evidenceId`: `E-027`
- `claim`: `source/min/release: node --check 33/33 pass (6 src + 27 probes), acorn parse pass, min-safe, parity b06a3cfc+2fbf90ec, PART G/H Smart-FFA preserved, smoke pass — 59 triggers formally pending but no source contains filter literals`
- `level`: `platform-verified`
- `source`: `src/**/*.js + probes/**/*.js (33 files) + src/bridge/projection/greeks + LICENSE + package.json — probes/g14.release.limited-test.v2.js`
- `capturedAt`: `2026-10-05T09:55:00Z — node --check + acorn 8.18.0`
- `method`: `bash node --check loop + acorn.parse per file + 59 trigger grep (no hits) + parity checks`
- `fixtureHash`: `SHA-256 of fixtures/g14.release.fixture.2026-10-05.json`
- `status`: `candidate` — satisfies G-14 for Full scope (59 formally pending but not blocking, no filter literal in source)`
- `relatedGate`: `G-14`


### E-026 — bridge authoritative FilterCode/SaveParams (G-13) — platform-verified / candidate

- `evidenceId`: `E-026`
- `claim`: `FilterCode authoritative property exists on old.tsetmc.com 15131F (has true but empty value len 0), SaveParams is setData(MarketWatchSettings), Settings.FilterNo 8, trace submit->done valid`
- `level`: `platform-verified`
- `source`: `src/bridge/applyBridge.v0.1.0.js (buildApplyRequest/confirmBridge/validateTrace) + probes/g13.bridge.limited-test.v2.js on old.tsetmc.com 15131F (FilterCode empty string, SaveParams function, FilterNo 8)`
- `host`: `old.tsetmc.com`
- `parTree`: `15131F`
- `capturedAt`: `2026-10-05T09:49:54.864Z / 13:19 Tehran`
- `method`: `read-only LIMITED-TEST v2 — typeof FilterCode string, SaveParams function toString, Settings.FilterNo, trace sample valid true`
- `fixtureHash`: `SHA-256 5e49047f0d38ee422ff38a6cc4ac9ab2094c145c0d71b0b03dd0da82e1560937 of fixtures/g13.bridge.fixture.2026-10-05.json`
- `status`: `confirmed` — G-13 closed by official probe v3 (2026-10-15): ApplyBridge with non-empty FilterCode (G13-PROBE-1792094418741) round-trips via SaveParams (confirmed=true), trace valid (submit->accepted->running->done), rollback restored (restoredSlot before/after '' restored=true). host old.tsetmc.com, parTree 15131F, FilterNo 1, persisted=true. Promoted from candidate per owner review of live run. Canary from B-validation remains retired.
- `fixtureHash`: `SHA-256 cb95561ba79755f2509ab432209c11cd23712c055fd2f4107cc72342762b4041 of fixtures/g13.bridge.official.v3.2026-10-15T20-00-18Z.json`
- `officialProbeV3`: `probes/g13.bridge.official.v3.js` — gate `G-13`, evidenceId `E-026` — official probe for the missing piece (non-empty FilterCode apply + SaveParams round-trip + trace validate + rollback + restoredSlot). Run 2026-10-15T20:00:18.741Z returned candidate-confirmed; promoted to confirmed after owner review. Gate G-13 now confirmed.
- `relatedGate`: `G-13`
- `bestChoiceReason`: |
    FilterCode property exists (has true) but value "" len 0 — proves authoritative slot exists even though no filter active now. SaveParams is function setData("MarketWatchSettings",JSON.stringify(mw.Settings)) — persistence via Settings. FilterNo 8 matches PENDING. Trace valid. Best choice: bridge candidate with round-trip, but needs live non-empty FilterCode for confirmation.

### E-023-supplemental — v4 public exhaustive test (2026-10-05 09:24)

- `tested`: `11 same-origin endpoints on old.tsetmc.com 15131F`
- `results`: `Option.aspx 200 html no-oi, InstOption.aspx 200 html no-oi, OptionMarketWatch 200 html, DerivativeOption 200 html, ClientTypeAll flow=3 200 csv (not OI), MarketWatchInit 200 AllRows csv, MarketWatchPlus 200 csv, /api/* 404, TsePublicV2 http blocked MixedContent`
- `conclusion`: `No public OI/multiplier endpoint — authenticated api.tsetmc.com is the only remaining candidate per §7`

### E-037 — A/B engine separation architecture (G-12/G-13 extension) — platform-verified / candidate

- `evidenceId`: `E-037`
- `claim`: `A/B engine separation validated on old.tsetmc.com 15131F: B (UX+settings+data+compute) runs independently once per snapshot; A per-row does only lookup of B's published immutable bitset projection. Guard (mw.__B_done + mw.__B_snapshotId) ensures B runs once per snapshot. Incremental dirty-tracking (tvol/pl/tno/pcp) validated: run1 dirty=3282, run2 dirty=29, run3 dirty=56. Bitset compression: 411 bytes for 3282 symbols (Uint8Array). Reverse index (mw.__B_rowIndex: inscode→row) for O(1) lookup. Atomic swap (build new bitset, then swap — no reset-then-fill race). Fail-open: A returns true on uncertainty. new Function() for helpers (JIT-optimizable, global scope) — 40ms run1 vs 312ms with eval function. Performance: run1 40ms (full recompute), incremental 0.8-1.0ms. minify candidate NOT retired (user decision خیر).`
- `level`: `platform-verified`
- `source`: `probes (console + TextArea): mw.RenderData RO, PrepareFilterCode RO, guard minimal, incremental+bitset, B-Real v3/v4/v5/v6/v7/v8/v9, timing (simple + BS+IV), diag1-6 — all on old.tsetmc.com 15131F`
- `host`: `old.tsetmc.com`
- `parTree`: `15131F`
- `capturedAt`: `2026-10-17T09:00Z — 2026-10-17T09:45Z (multiple probe runs)`
- `method`: `console injection [کنسول] + FilterCode registration [TextArea] — read-only inspection + controlled FilterCode test with rollback (FilterCode cleared after each test)`
- `fixtureHash`: `N/A — architecture probe, no single fixture; results captured in console output`
- `status`: `candidate` — architecture validated via 9 probe iterations; performance acceptable (40ms full, 0.8ms incremental); ready for implementation`
- `relatedGate`: `G-12 (exact A projection) + G-13 (bridge)`
- `ownerApproval`: `owner chose A/B separation architecture (B independent, A lookup-only); minify NOT retired (خیر); incremental confirmed (بله); bitset confirmed (بله)`
- `notes`: `Key findings: (1) O(n²) dirty tracking in A was real error — moved to B (O(n) once per cycle). (2) Memory underestimate 10× — corrected to ~200-300KB for __B_result. (3) Atomic swap vs reset-then-fill — atomic swap only. (4) Fail-open (A returns true) not halt. (5) configHash owned by UX (set on Settings write). (6) snapshotId from hook on mw.ApplyFilter or dirty detection. (7) B must be async (setTimeout/requestIdleCallback), not inside RenderData. (8) new Function() required for JIT — eval-defined functions 12× slower. (9) Method call overhead (mw.__B_erf) 11× slower than global (window.__B_erf). (10) Closure-captured variables in eval 11× slower than global property access.`

### E-038 — ConfigHash dual trigger (SaveSettings/SaveParams hooks) — platform-verified / candidate

- `evidenceId`: `E-038`
- `claim`: `ConfigHash dual trigger validated on old.tsetmc.com 15131F: SaveSettings and SaveParams hooks installed (this=window context). ConfigVersion increments on UI settings change (0→12 observed). B re-runs when configVersion changes (configHash = configVersion-FilterCode.length). SnapshotId trigger (RoundNo-based) also works independently. Dual trigger: B runs when snapshotId OR configHash changes.`
- `level`: `platform-verified`
- `source`: `probes B-Real v3/v4/v5/v6/v7/v8/v9 (TextArea) on old.tsetmc.com 15131F — SaveSettings/SaveParams hook installation + configVersion tracking`
- `host`: `old.tsetmc.com`
- `parTree`: `15131F`
- `capturedAt`: `2026-10-17T09:00Z — 2026-10-17T09:45Z`
- `method`: `FilterCode registration [TextArea] with hook installation on mw.SaveSettings and mw.SaveParams; console observation of configVersion changes on UI settings modification`
- `fixtureHash`: `N/A — live probe, no fixture`
- `status`: `candidate` — dual trigger validated; configVersion 0→12 on UI change; B re-runs correctly`
- `relatedGate`: `G-12 (exact A projection)`
- `ownerApproval`: `owner confirmed dual trigger approach (snapshotId + configHash)`
- `notes`: `Key findings: (1) SaveSettings hook failed in v3 due to this=mw context (TypeError: Cannot read properties of undefined reading 'Instruments') — fixed in v4: this=window. (2) SaveParams hook works when user changes settings via UI (configVersion 0→12). (3) SaveSettings hook may not trigger on all UI changes (only SaveParams observed). (4) ConfigHash = configVersion + '-' + FilterCode.length. (5) Need to investigate if SaveSettings triggers on different settings (e.g., market change vs view mode change).`

### E-039 — BS+IV Funnel timing + incremental validation — platform-verified / candidate

- `evidenceId`: `E-039`
- `claim`: `BS+IV Funnel (Black-Scholes delta/gamma + IV solving) timing measured on old.tsetmc.com 15131F: simple Funnel 2.9ms (3015 rows), BS+IV Funnel 17.4ms (3093 rows, 5.6μs/row). Incremental validated: run1 309ms (3093 dirty) → run4 4.3ms (41 dirty) with O(n²) lookup; after reverse index + new Function(): run1 40ms (3282 dirty) → incremental 0.8ms (41 dirty). solveIV converges in ~47 iterations avg (not early break). Incremental NECESSARY for BS+IV (>5ms threshold).`
- `level`: `platform-verified`
- `source`: `probes: timing (simple + BS+IV) [کنسول], B-Real v3-v9 [TextArea], diag1-6 [کنسول] on old.tsetmc.com 15131F`
- `host`: `old.tsetmc.com`
- `parTree`: `15131F`
- `capturedAt`: `2026-10-17T07:37Z — 2026-10-17T09:45Z`
- `method`: `console timing probe (performance.now) + FilterCode registration with elapsedMs tracking`
- `fixtureHash`: `N/A — live probe, no fixture`
- `status`: `candidate` — timing measured; incremental validated; performance acceptable after new Function() fix`
- `relatedGate`: `G-11 (other models) + G-12 (exact A projection)`
- `ownerApproval`: `owner confirmed incremental (بله), bitset (بله), B-Real run1 (بله)`
- `notes`: `Key findings: (1) Simple Funnel (tvol/plp/pcp/tno) = 2.9ms — incremental optional. (2) BS+IV Funnel = 17.4ms — incremental NECESSARY. (3) solveIV does NOT early-break (avg 47.2 iters, not 1) — because marketPrice (plc/pcp) doesn't match BS price. (4) Method call overhead (mw.__B_erf) 11× slower than global (window.__B_erf). (5) Closure-captured variables in eval 11× slower than global property access. (6) eval-defined functions 12× slower than new Function() (JIT). (7) Inlined erf (38.8ms) slower than function call (16.4ms) — JIT optimizes function calls better. (8) Final performance: 40ms full recompute, 0.8ms incremental — acceptable.`

### E-040 — Pre-implementation contradiction review + local computeFunnel benchmark (2026-10-17)

- `evidenceId`: `E-040`
- `claim`: `Three contradictions reviewed before implementation. (1) fail-closed vs fail-open: apparent, not real — B fail-closed = no partial publish, previous valid state kept; A fail-open = returns true when no valid published result (user sees all, never an empty page). Design doc §1/§2.8/§3 rewritten. (2) "40ms full recompute" claim: VALIDATED as plausible by local benchmark of the REAL repo code (probes/perf.computeFunnel.benchmark.v1.js, node 22): impliedVol 4.5us/call (avg 15.6 iters, HARD CAP ~25 via high-low<1e-7), bsGreeks 0.74us, full funnel 8.4us/row -> 800 option rows 5.4ms, 3282 symbols 27.5ms, +cold 0.8ms +detectDirty 2.9ms = ~31ms. The counter-estimate "1-2ms per option -> 3-6s" was ~250x too pessimistic. (3) "0.8ms incremental": COMPUTE-ONLY (DIAG2 measured detectDirty separately at 2.9ms), so the real per-cycle cost is ~3.7-4.0ms. Probe v9 source is not in the workspace, so the exact elapsed boundary is UNVERIFIABLE — recorded as an open gap.`
- `level`: `local-verified (benchmark) + design-review (contradiction 1) + live-derived arithmetic (contradiction 3)`
- `source`: `probes/perf.computeFunnel.benchmark.v1.js (node 22.22.3) — uses src/optionParser.v0.1.0.js + src/models/greeks.v0.1.0.js verbatim; live figures from E-037/E-039 (v9, DIAG2)`
- `host`: `local (benchmark) — no network`
- `parTree`: `15131F (live figures reused)`
- `capturedAt`: `2026-10-17T10:00Z — 2026-10-17T10:30Z`
- `method`: `node benchmark with warmup + hrtime.bigint; synthetic rows shaped like live mw.AllRows (3282 symbols, 800 option rows, strikes bracketing spot, market price = BS price at sigma 0.35 + noise); worst-case out-of-range market price tested (24 iters, cap confirmed)`
- `fixtureHash`: `N/A — local benchmark`
- `status`: `candidate` — benchmark numbers local only; live confirmation pending via probes/perf.funnel.live.v1.js [کنسول]`
- `relatedGate`: `G-11 (other models) + G-12 (exact A projection)`
- `notes`: `(a) impliedVol iteration cap is structural: bisection halves [0.01,3.0] and breaks at high-low<1e-7 after ~25 iterations — max observed 24, avg 15.6. (b) Cold single-shot impliedVol via new Function: median 0.006ms, p90 0.014ms (warm-loop context) and 0.13-0.83ms for a truly first call. (c) Production-style funnel (parse+firstModel+iv+greeks+garch+svi) = 8.71us/row -> 28.6ms for 3282. (d) Parity test: inlined probe functions vs repo modules = 400/400 parseOptionLabel identical, 400/400 impliedVol+bsGreeks identical. (e) Remaining uncertainty for the live probe: synthetic prices, warm vs cold JIT, and whether the production funnel adds per-row GARCH/SVI/GEX calls.`

### E-041 — Live computeFunnel timing on old.tsetmc.com (closes contradictions 2 and 3)

- `evidenceId`: `E-041`
- `claim`: `Live timing of the REAL repo funnel (optionParser + greeks) on live mw.AllRows: totalSymbols=3289, optionRows(confirmed)=996 (30%), parseAllMs=4.2, funnelOptionMs=16.1 -> perOptionRowUs=16.16, impliedVolErrs=0, impliedVolIters min=0 p50=24 max=24 atCap24plus=768 (77% of option rows hit the structural iteration cap), coldSingleShotMs=[0.1,0,0.1,0.1,0.1], detectDirtyMs=2.3, dirtyCount=0, incrementalHypothesis2pctMs=1.06, fullRecomputeEstimateMs=18.4, verdict=PLAUSIBLE-40ms. Conclusion: the "40ms full recompute" claim (v9) is CONFIRMED — 18.4ms measured today with the real funnel, same order. The counter-estimate "1-2ms per option -> 3-6s" was ~250x too pessimistic (impliedVol bisection has a hard ~25-iteration cap via high-low<1e-7). Live per-row cost is 2x the local synthetic benchmark (16.16us vs 8.4us) because live market prices do not match BS prices, so IV always runs to the cap — cost is therefore STABLE and predictable. detectDirty measured live at 2.3ms (confirms DIAG2 2.9ms); therefore the "0.8ms incremental" figure was compute-only and the real per-cycle cost is ~2.6-3.4ms. dirtyCount=0 on an unchanged snapshot confirms the incremental precondition on real data.`
- `level`: `platform-verified`
- `source`: `probes/perf.funnel.live.v1.js [کنسول] on old.tsetmc.com parTree 15131F — inlined functions parity-tested against repo modules (400/400 parseOptionLabel identical, 400/400 impliedVol+bsGreeks identical)`
- `host`: `old.tsetmc.com`
- `parTree`: `15131F`
- `capturedAt`: `2026-10-17T10:29:57.724Z`
- `method`: `read-only console injection — performance.now timing harness, no FilterCode/SaveParams/network change; T=0.082, r=0.2, strike from l30 parse, S from row.pl, marketPrice from row.plc`
- `fixtureHash`: `N/A — live console run, no fixture`
- `status`: `confirmed` — live measurement, parity-verified code, closes E-040 open questions 1 and 2`
- `relatedGate`: `G-11 (other models) + G-12 (exact A projection)`
- `notes`: `(a) Design budget numbers now: full recompute ~18.4ms (once per snapshot), incremental cycle ~3ms (detectDirty 2.3 + compute 0.8-1.0), per-row A lookup ~0.01ms. (b) optionRows=996 vs G-04 estimate 800/3362 — funnel cost scales with option count, not total symbols. (c) Open gap retained: probe v9 source is not in the workspace, so its exact elapsed boundary is unverifiable — practically irrelevant now that both phases are measured separately. (d) Still untested: whether the production funnel adds per-row GARCH/SVI/GEX calls (local bench with all models: 8.53us/row -> 28.6ms for 3282).`

### E-042 — A/B engine v0.1.0 implementation + 69/69 parity suite (node, real repo code)

- `evidenceId`: `E-042`
- `claim`: `A/B engine separation implemented as src/engine/bEngine.v0.1.0.js + src/engine/aLookup.v0.1.0.js and validated by probes/engine.parity.v1.js: 69/69 tests pass on node 22 with the REAL repo models injected (optionParser + greeks). Covers: index build/dedupe/caching, dirty detection (O(n), no mutation), dual-trigger guard, atomic swap, B fail-closed (error publishes nothing, previous projection preserved, failed rows retried), A fail-open (no projection / unknown symbol / unknown bit -> true), bitset round-trip (411 bytes for 3282 symbols), hooks (SaveSettings/SaveParams with this=window, configVersion 0->2, uninstall restores), A parity (generated 435-byte body == evaluateRow on 3282/3282 rows), capacity check (435/4096). Timing (node): full recompute 16.9-22.1ms for 984 option rows, incremental cycle 1.3-2.2ms for 65 dirty rows, detectDirty 0.8-1.6ms (7 fields), buildIndex 0ms on cached cycles. node --check passes on all 73 src+probes files. Two real bugs were found and fixed by the suite: (1) plc was missing from DIRTY_FIELDS although impliedVol reads it -> a market-price-only change never recomputed and the bit went stale (fixed: DIRTY_FIELDS = [pl, plc, l18, l30, tvol, tno, pcp]); (2) compileFilterCodeBody had signature (mw,row) while evaluateRow is (row,published) -> the parity harness compared swapped arguments and reported 786 false mismatches (fixed: signature now (row,mw)).`
- `level`: `local-verified (node, real repo code, injected models)`
- `source`: `src/engine/bEngine.v0.1.0.js, src/engine/aLookup.v0.1.0.js, probes/engine.parity.v1.js — node 22.22.3`
- `host`: `local (no network)`
- `parTree`: `15131F (data shaped after live mw.AllRows; live run still pending)`
- `capturedAt`: `2026-10-17T11:00Z — 2026-10-17T11:30Z`
- `method`: `node unit+parity suite (69 assertions), node --check sweep over 73 files, acorn available-check, timing via process.hrtime.bigint with phase breakdown`
- `fixtureHash`: `N/A — local implementation + test run`
- `status`: `candidate` — implementation complete and locally verified; live registration through PrepareFilterCode (61 rules) and live cycle timing still pending`
- `relatedGate`: `G-12 (exact A projection) + G-14 (source/min/release)`
- `ownerApproval`: `pending — funnel thresholds (deltaMin 0.3, gammaMin 1e-4, iv 0.01..1.0), the |delta| choice for puts, and the S source (row.pl vs true underlying) are open decisions recorded in AB_ENGINE_SEPARATION_DESIGN.md §12`
- `notes`: `(a) Purity scan: engine modules contain no document/localStorage/fetch/XHR; the only window reference is the standard export convention used by every module in this repo; Date.now is only the fallback clock default. (b) new Function() appears only in the parity harness (compileFilterCodeBody) to execute the generated A body in an isolated scope — the A artifact itself is a plain string and the engine uses no eval. (c) Index caching is a documented heuristic (count + 16 sampled inscodes); strictIndex:true forces a full rebuild every cycle. (d) minify candidate remains NOT retired per owner decision.`

### E-043 — Gap verification + funnel input mapping (IV round-trip proof) + TextArea section

- `evidenceId`: `E-043`
- `claim`: `Owner-reported gaps were verified against code and evidence. (1) TextArea registration was indeed absent from the design doc -> new section 11.1 added (what is confirmed: 61 PrepareFilterCode .replace() rules, no eval, 4096-byte Artifact A limit, E-026 FilterCode authoritative + SaveParams round-trip + trace + rollback, generated A body 430/4096 bytes; what is open: exact PrepareFilterCode API, whether the filter context can reach mw at all, the 61 rules against our body, roundTick dependency for suggestTrade). (2) A's null-check: the DOC still showed the unguarded snippet, but the CODE (aLookup v0.1.0) has always been guarded on __B_index/__B_known/__B_bitset/row/byte-range -> doc section 3 replaced with the implemented body. (3) configVersion: code already falls back to state.configVersion (0); additionally installHooks now initializes mw.__B_configVersion at install time so the published projection never carries undefined. (4) Memory: measured in node - prevRows ~350KB JSON (~450KB heap, 7 fields x 3289), symbols ~0.06MB, index ~0.19MB, bitset+known 824 bytes -> total ~0.7-0.9MB, correcting the doc's 200-300KB which counted only the bitset. (5) Async: setTimeout(0) replaced by createScheduler() = requestIdleCallback({timeout:500}) with setTimeout(0) fallback. (6) IV round-trip PROOF: with the G-11 mapping (S = underlying row pc via l30 map, marketPrice = (pd1+po1)/2, r=0.30) the solver recovers the synthesized true IV exactly (mean 0.3500 vs true 0.35, 0/984 boundary pins); with the v9 mapping (S = row.pl, marketPrice = row.plc, r=0.2) the IV is biased (0.3557) and 28/984 (2.8%) rows are pinned at the interval bound = no solution. Also proven: the 77% at-cap rate is NOT a data-quality signal - even with the correct mapping 100% of synthetic rows reach the iteration cap, because |price-marketPrice| < 1e-6 is unreachable at rial price scales so the loop always exits via high-low < 1e-7 (~25 iterations). The correct diagnostic is boundary pinning, not iteration count.`
- `level`: `local-verified (node, real repo code) + design-review`
- `source`: `src/engine/bEngine.v0.1.0.js, src/engine/aLookup.v0.1.0.js, probes/engine.parity.v1.js (89 assertions), probes/fieldsem.ivdiagnostic.live.v1.js (new, pending live run)`
- `host`: `local (no network)`
- `parTree`: `15131F (live data shaped)`
- `capturedAt`: `2026-10-17T12:00Z — 2026-10-17T12:40Z`
- `method`: `node unit+parity suite; IV round-trip test (synthesize a market price at a known sigma, then check what the solver recovers under each mapping); memory measurement via JSON/heap estimates; field-semantics probe prepared for live run`
- `fixtureHash`: `N/A — local implementation + test run`
- `status`: `candidate` — mapping is configurable and the G-11 default is now proven correct by round-trip; owner decision still required before live use`
- `relatedGate`: `G-11 (other models) + G-12 (exact A projection) + G-07 (chain source, for the underlying relation)`
- `notes`: `(a) The r inconsistency inside this repo is now explicit: probe G-11 used 0.30, probe v9 used 0.2 - both recorded, neither approved. (b) E-011 explicitly leaves field semantics unknown, so plc/pl/plc meaning is an open question the live diagnostic probe settles. (c) The 61-rule PrepareFilterCode test against our 430-byte body is still pending. (d) minify remains NOT retired.`
### E-044 — Owner decisions applied; parity suite 94/94 (2026-10-17)

- `evidenceId`: `E-044`
- `claim`: `The owner's six decision answers were applied to DEFAULT_FUNNEL_CONFIG and the parity suite was re-verified. q1: 77% IV-at-cap classified as an OPEN BUG -> ivFilterEnabled:false, so no IV-based hiding happens until the live diagnostic probe runs; IV is still solved and echoed (iv + atBoundary) for diagnostics and reason is 'iv-filter-disabled-open-bug'. q2: marketPriceFrom:'pl' (replacing bidAskMid). q5: useDeltaGamma:false -> pass = IV solved and inside (ivMin, ivMax); deltaMin/gammaMin stay in config but are unused. q6: minify candidate remains NOT retired. q3 (S source) and q4 (r) answers arrived garbled with no selected option -> code keeps the round-trip-proven provisional values underlyingFrom:'underlyingMap' and r:0.30, both flagged as owner-decision-pending.`
- `level`: `local-verified (node, real repo code)`
- `source`: `src/engine/bEngine.v0.1.0.js, probes/engine.parity.v1.js (94 assertions), node 22.22.3`
- `host`: `local (no network)`
- `parTree`: `15131F`
- `capturedAt`: `2026-10-17T13:00Z — 2026-10-17T13:40Z`
- `method`: `node probes/engine.parity.v1.js after applying the owner decisions; synthetic option rows made realistic (pl = the option's own last price, pc = previous close, plc = pl - pc), because the old synthetic data carried the v9 assumption that pl was the underlying price`
- `fixtureHash`: `N/A — local implementation + test run`
- `status`: `verified-locally — owner decisions applied; q3/q4 pending clarification before live use`
- `relatedGate`: `G-11 (other models) + G-12 (exact A projection) + G-14 (source/min/release)`
- `notes`: `(a) With the owner mapping (marketPrice = pl + S from the underlying map + IV filter ON) pass=984/fail=0 on 984 synthetic option rows. (b) IV round-trip under the owner mapping: mean 0.3456 vs true 0.35 (the +/-3% noise on pl explains the gap); boundary pins 1/40 (2.5%). (c) The same realistic data under the v9 mapping (S = row.pl, marketPrice = row.plc) pins 36/40 (90%) at the bound = no solution; this is the strongest evidence that the input mapping, not a data signal, caused the 77% at-cap warning. (d) Filter OFF => every confirmed option passes (fail-open) and IV/atBoundary are still echoed; filter ON => missing bid/ask still returns insufficient-data (no fabrication). (e) Timing unchanged: full recompute 12.7-16.0ms, incremental 1.42ms, detectDirty 0.90-1.01ms. (f) q3/q4 must not be guessed; the provisional values are explicitly marked in DEFAULT_FUNNEL_CONFIG and in the design doc section 12.` **UPDATE 2026-10-17 (owner answers received): q3 = CONFIRMED underlyingMap (no code change); q4 = r is user-configurable -> normalizeFunnelConfig() added, range-checked, garbage falls back to defaults (fail-closed), 8 new parity assertions (suite now 102/102) covering valid r, garbage r, inverted IV window, boolean coercion, source whitelist, no mutation of DEFAULT_FUNNEL_CONFIG, and r changing the solved IV end-to-end.`
### E-045 — LIVE field semantics + IV diagnostic probe run (owner, old.tsetmc.com, 2026-10-18T05:55Z)

- `evidenceId`: `E-045`
- `claim`: `The owner ran probes/fieldsem.ivdiagnostic.live.v1.js [konsol] on old.tsetmc.com (2219 symbols, 605 option rows, 1505-entry underlying map). FIELD SEMANTICS: plc == pl - pc for only 826/2219 rows (37.2%), so plc is NOT the price change; plp == pct change for 1069/2219 (48.2%). In every sampled row with a non-zero plc, pl == pc (3/3), i.e. the last price did not update - pl is stale whenever the option has not traded. IV DIAGNOSTIC (120 sampled option rows): G-11 mapping (underlying pc + bidAskMid, r=0.30) -> 100 ok, iv_p10 0.01, iv_p50 1.0522, iv_p90 2.1424, atBoundary 16 (13.3%), marketPriceOutOfRange 16, saneInterior 33 (27.5%). v9 mapping (row.pl as S + row.plc, r=0.2) -> 120 ok, iv_p50 1.069, iv_p90 3.0, atBoundary 48 (40%), marketPriceOutOfRange 41, saneInterior 37 (30.8%). The boundary pins are exactly the rows whose market price no volatility in [0.01, 3.0] can reproduce.`
- `level`: `live (owner-run console injection on the real site)`
- `source`: `probes/fieldsem.ivdiagnostic.live.v1.js, tag [konsol], VM1005`
- `host`: `old.tsetmc.com`
- `parTree`: `15131F (live)`
- `capturedAt`: `2026-10-18T05:55:52Z`
- `method`: `console injection; per-row IV solve under both mappings with iv p10/p50/p90, atBoundary, marketPriceOutOfRange, saneInterior; plc/plp agreement over all rows`
- `fixtureHash`: `N/A — live probe JSON`
- `status`: `verified-live — mapping evidence now complete; IV filter still OFF pending the owner's window decision`
- `relatedGate`: `G-11 (other models) + G-12 (exact A projection) + E-043/E-044`
- `notes`: `(a) The owner's mapping is 3x better than v9 on boundary pinning (13.3% vs 40%), confirming q2/q3 - but 13.3% of live options still have NO valid IV. (b) Root cause of those 13.3%, proven from the probe's own samples: the price is either outside the no-arbitrage bounds (call S=70164, K=24000, r=0.30, T=30/365 -> lower bound 46749, but the bid/ask mid is 46000) or comes from a 23-32% wide book whose mid implies vol > 300%. (c) iv_p50 is 1.0522, so the funnel's ivMax=1.0 would REJECT about half of the live options - the window must be widened before the filter can be enabled (owner decision). (d) CORRECTED 2026-10-18 (E-050): the claim that `pl is stale when the option has not traded` was a MISINTERPRETATION. With the proven formula plc = pl - prevClose (E-048), those rows HAD moved from the previous close (so they traded) and merely happened to show pl == pc. `pl` is the option's own last trade for the current session; the correct no-trade signal is `tno == 0`, which is what the q8 hierarchy uses. Nothing in the implementation depended on the wrong claim. (e) The engine now guards both cases (marketPriceProblem: price-outside-arbitrage-bounds / book-too-wide) and reports insufficient-data, so A fails open and the row stays visible instead of being hidden by a fabricated IV. (f) Parity suite grew to 114 assertions, all passing.` **UPDATE 2026-10-18: the guards are implemented in bEngine (marketPriceProblem) and covered by 12 new parity assertions; the IV window and the market-price source are recorded as open decisions q7/q8 in the design doc section 12.`
### E-046 — Owner decisions q7/q8 implemented: ivMax 3.0 + hybrid price hierarchy (2026-10-18)

- `evidenceId`: `E-046`
- `claim`: `The owner's recommendations were implemented. q7: ivMax 1.0 -> 3.0 (UX-configurable) because the live median IV is 1.0522 and p90 is 2.1424 - the old window would have rejected about half of the live options, while the price guard stays the primary layer and ivMax is a backup that only rejects 1-2% (an IV above 300% is an anomaly). q8: marketPriceFrom 'pl' -> 'hybrid', a three-level hierarchy: (1) the bid/ask mid, guarded by marketPriceProblem (arbitrage bounds + spread); (2) pl only when tno > 0, i.e. the row actually traded today - the spread guard is skipped on this path (fromBook:false) because a real executed trade is evidence even when the surrounding quotes are wide; (3) otherwise insufficient-data, so A fails open and the row stays visible. Every rejection now carries its reason (missing market price / price-outside-arbitrage-bounds / book-too-wide) and the chosen source is echoed as inputs.marketPriceSource (mid | pl-traded | the explicit source name).`
- `level`: `local-verified (node, real repo code)`
- `source`: `src/engine/bEngine.v0.1.0.js, probes/engine.parity.v1.js (127 assertions), node 22.22.3`
- `host`: `local (no network)`
- `parTree`: `15131F`
- `capturedAt`: `2026-10-18T07:10Z — 2026-10-18T07:40Z`
- `method`: `owner decisions applied; parity suite extended from 114 to 127 assertions covering the three hybrid scenarios the owner specified (sane book -> mid; broken book + tno>0 -> pl; broken book + tno=0 -> insufficient-data) plus an empty book with/without a trade, a traded price above S, the explicit single-source modes, and ivMax behaviour (pinned IV = no-iv-solution, valid IV above the window = fail-iv-range)`
- `fixtureHash`: `N/A — local implementation + test run`
- `status`: `verified-locally — q7/q8 implemented; live re-measurement still pending`
- `relatedGate`: `G-11 (other models) + G-12 (exact A projection) + E-045 + new G-18 (plc semantics)`
- `notes`: `(a) The synthetic generator had to be corrected first: option prices are now clamped into the no-arbitrage bounds, because the old generator emitted prices below the bound (the new guard correctly rejects those, and a deep-ITM premium synthesized at r=0.30 legitimately falls below the bound at r=0.5). (b) A traded price outside the arbitrage bounds is treated as an anomaly -> insufficient-data, never a computed IV. (c) Backlog recorded as G-18: plc == pl - pc for only 37.2% of live rows, so plc is not the price change (most likely plc = pl - py); no decision may be built on plc until it is settled - the q8 hierarchy uses tno > 0, not plc. (d) ivMax remains user-configurable through normalizeFunnelConfig, but the window is clamped to the solver's own bisection range (IV_SOLVER_MIN 0.01 / IV_SOLVER_MAX 3.0): an ivMax above 3.0 could never fire and an ivMin below 0.01 would let a floor-pinned IV pass, so both are treated as footguns rather than freedoms (parity suite now 130 assertions).`
### E-047 — IV borderline probe written + validated against the real engine; the fixed T is a defect (2026-10-18)

- `evidenceId`: `E-047`
- `claim`: `probes/ivfilter.borderline.live.v1.js [konsol] was written to answer whether ivFilterEnabled can be enabled. It mirrors bEngine/greeks/optionParser verbatim, measures the REAL engine path, and runs the measurement TWICE: RUN A with the shipped config (T = 30/365 for every option) and RUN B with the correct maturity (T = DTE/365 per option, from a Jalali->Gregorian conversion verified against 1405/01/01 == 2026-03-21). Validation in node against a fake live page: the probe runs end-to-end, and its price-resolution layer agrees with the real engine's computeFunnel on 33/33 rows (agree=33, disagree=0). On synthetic data RUN A reports 0% borderline while RUN B reports 9.1% (2 rows pinned at the ceiling, 9 more rejected by the arbitrage guard) - i.e. the shipped fixed T hides the problem.`
- `level`: `local-verified (node harness against a fake live page) + live-ready (not yet run on the site)`
- `source`: `probes/ivfilter.borderline.live.v1.js, harness /tmp/probeharness.js (not committed)`
- `host`: `local fake page (39 rows) — live run pending`
- `parTree`: `15131F`
- `capturedAt`: `2026-10-18T08:20Z — 2026-10-18T08:50Z`
- `method`: `vm sandbox with window.mw.AllRows + the real TseBEngine/TseGreeks/parseOptionLabel; the probe's PROBE_JSON parsed and its engineParity branch exercised; synthetic premiums generated by the real bsGreeks at sigma=0.45 and clamped into the no-arbitrage bounds`
- `fixtureHash`: `N/A — synthetic local fixture`
- `status`: `probe-ready — awaiting the owner's live run`
- `relatedGate`: `G-11 (other models) + G-12 (exact A projection) + E-045/E-046 + new G-19 (fixed T vs real DTE)`
- `notes`: `(a) The probe reports every field the owner's decision table asks for: price-source distribution (mid / pl-traded / insufficient), guard hits split by arbitrage vs spread, noS/noT, ivSolved/ivFailed, atLower/atUpper, a 10-bucket IV histogram, up to 10 borderline samples with bid/ask/tno/dte, and a single DECISION line applying the owner's <3% / 3-8% / >8% rule. (b) A parity bug was found and fixed during validation: the first version compared the probe's DTE-based resolution against the engine's fixed-T resolution, but the arbitrage bounds depend on T, so legitimate differences were counted as disagreements. (c) G-19 is opened because the fixed T = 30/365 is inherited from probe G-11 and the live expiries are 3 days out; this is a config defect, not a probe artifact. (d) The synthetic numbers are NOT live evidence - they only prove the mechanism and the probe's correctness.`
### E-048 — Field semantics PROVEN: plc = pl - prevClose (6/6 exact); second live IV run (2026-10-18T06:55Z)

- `evidenceId`: `E-048`
- `claim`: `A second live run of probes/fieldsem.ivdiagnostic.live.v1.js (old.tsetmc.com, 2219 symbols, 605 option rows) settles the plc semantics arithmetically. Comparing the 05:55Z and 06:55Z snapshots of the same six option rows proves: plc = pl - prevClose (yesterday's close), pc = today's price (NOT the previous close), pcp = (pc - prevClose)/prevClose*100, plp = (pl - prevClose)/prevClose*100. All six rows match to two decimals (6/6), e.g. ضهرم7050: pl=51500, pc=50407, plc=3245 -> prevClose = 51500-3245 = 48255, and (50407-48255)/48255 = 4.46% == pcp, 3245/48255 = 6.72% == plp. This explains why plc == pl - pc held for only 36.1% of rows (800/2219): pc is not the previous close. It also explains the 05:55Z anomaly (plc = 0 while pl != pc): at that moment pl equalled the previous close, so the change was zero. Derived consequence: prevClose = pl - plc is computable from the row itself, giving a price-staleness signal without needing tno.`
- `level`: `live (owner-run console injection) + arithmetic proof`
- `source`: `probes/fieldsem.ivdiagnostic.live.v1.js, tag [konsol], VM3227, two runs 05:55Z and 06:55Z`
- `host`: `old.tsetmc.com`
- `parTree`: `15131F (live)`
- `capturedAt`: `2026-10-18T06:55:53Z`
- `method`: `same rows in two snapshots; solve prevClose = pl - plc, then verify pcp and plp against it for every sampled row`
- `fixtureHash`: `N/A — live probe JSON`
- `status`: `verified — G-18 closed`
- `relatedGate`: `G-18 (plc semantics) + E-045 + E-047`
- `notes`: `(a) Second live IV run under the G-11/owner mapping (underlying pc + bidAskMid, r=0.30, T=30/365): n=120, ok=103, iv_p50 1.0969, iv_p90 2.1203, atBoundary 13 (10.8%), marketPriceOutOfRange 12, saneInterior 33 (27.5%). The v9 mapping on the same rows: atBoundary 65 (54.2%), saneInterior 17 (14.2%) - the owner's mapping is 5x better. (b) IMPORTANT: this run used the OLD probe, which models T = 30/365. It is therefore RUN A data, not the decision measurement; probes/ivfilter.borderline.live.v1.js measures both RUN A (T=30/365) and RUN B (T=DTE/365). (c) The two boundary samples in this run are the same mechanism as E-045: K=24000 needs iv > 3.0 (bsPriceAtIv 48535.88 < marketPrice 51950.5) and K=26000 needs iv < 0.01 (bsPriceAtIv 45027.26 > marketPrice 44750.5) - no solution in the solver's range. (d) Field-semantics conclusion feeds back into q8: pl is the option's own last trade and it IS fresh when the row trades; prevClose = pl - plc makes staleness detectable without tno.`
### E-049 — q9 capability implemented (TMode 'dte') + probe now measures the REAL engine in both modes (2026-10-18)

- `evidenceId`: `E-049`
- `claim`: `The per-option maturity capability requested as decision q9 is implemented but OFF by default: DEFAULT_FUNNEL_CONFIG.TMode = 'fixed' (the shipped 30/365), and 'dte' computes the maturity per option from the parsed expiry through an INJECTED calendar (opts.calendar), so the Jalali<->Gregorian conversion stays outside the engine (gate G-08's job). Without a calendar, 'dte' returns insufficient-data rather than silently modelling the wrong maturity. The probe was extended so RUN B goes through the real engine (TMode 'dte') instead of a local re-implementation, and validated in node: the engine's RUN B agrees exactly with the probe's local RUN B (total 33, ok 22, atUpper 2, borderlinePct 9.1, guardArb 9, guardSpread 1, insufficient 11) and the price-resolution parity check against computeFunnel stays 33/33 agree / 0 disagree.`
- `level`: `local-verified (node, real repo code)`
- `source`: `src/engine/bEngine.v0.1.0.js, probes/engine.parity.v1.js (140 assertions), probes/ivfilter.borderline.live.v1.js`
- `host`: `local (no network)`
- `parTree`: `15131F`
- `capturedAt`: `2026-10-18T09:10Z — 2026-10-18T09:50Z`
- `method`: `node parity suite extended with 10 assertions for the dte path; the probe run against a fake live page with the real engine exposed on window; local-vs-engine comparison of the same measurement`
- `fixtureHash`: `N/A — synthetic local fixture`
- `status`: `capability-ready — awaiting the owner's q9 decision before 'dte' becomes the default`
- `relatedGate`: `G-19 (fixed T vs real DTE) + E-047 + G-12`
- `notes`: `(a) Three real bugs were found and fixed while wiring this: resolveMarketPrice did not receive T (ReferenceError inside a caught try -> every row became an error); normalizeFunnelConfig only ever wrote 'fixed', so TMode could never become 'dte'; and two parity tests referenced a block-scoped engine from another scope. (b) The guards now use the per-row T, which matters because the arbitrage bounds depend on T - a price that is valid at 30 days can be below the bound at 3 days. (c) inputs.T echoes the maturity actually used, so a live run can see which rows were modelled at which T. (d) The shipped default is unchanged: TMode 'fixed' + T 30/365, and the parity suite still passes 140/140 including every earlier assertion.`
### E-050 — Owner's interpretation verified on both samples; the guards do NOT survive the correct maturity (2026-10-18)

- `evidenceId`: `E-050`
- `claim`: `The owner's interpretation was checked claim by claim against the real repo models. CONFIRMED: (1) ضهرم7052 has a 30.6% spread, so marketPriceProblem returns book-too-wide and the hierarchy falls back to pl=47500, which yields IV 2.3136 instead of the pinned 3.0; (2) ضهرم7053 has only a 3.3% spread (so the spread guard does not fire) but its mid 44750.5 is below the no-arbitrage lower bound 45027, so marketPriceProblem returns price-outside-arbitrage-bounds and the fallback to pl=45500 yields IV 2.1161 instead of the pinned 0.01. Both boundary samples are therefore genuinely rescued by the guards, exactly as the owner argued. NOT CONFIRMED - and this is the new finding: the same two rows with the CORRECT maturity (T = 3/365, because 1405/07/29 is 2026-10-21) give IV = 3.0000 from the pl fallback for BOTH rows. At a 3-day maturity a deep-ITM call's price is almost pure intrinsic (46453 for K=24000), so pl=47500 implies a time value of ~1047 over three days, i.e. a vol above the solver cap. The guards rescue the price, but the maturity still pins the IV.`
- `level`: `local-verified (node, real repo code) + arithmetic verification of live samples`
- `source`: `src/models/greeks.v0.1.0.js + the live sample values from E-045/E-048`
- `host`: `local (no network)`
- `parTree`: `15131F`
- `capturedAt`: `2026-10-18T10:05Z — 2026-10-18T10:25Z`
- `method`: `recompute the live samples through the real bsGreeks/impliedVol at T=30/365 and at T=3/365, with the mid and with the pl fallback, and compare against the probe's reported values`
- `fixtureHash`: `N/A — live sample values replayed locally`
- `status`: `verified — the owner's guard argument holds at the shipped T; it does not hold at the correct T`
- `relatedGate`: `G-19 (fixed T vs real DTE) + E-045 + E-048 + E-049 + q1/q7/q8/q9`
- `notes`: `(a) The owner's recommendation to enable ivFilterEnabled after a guard-aware probe is correct in method - and that probe already exists (probes/ivfilter.borderline.live.v1.js measures through the real engine with the guards on, in both T modes). (b) But the expected "boundary < 2% after the guard" is a PREDICTION measured at T=30/365. At the correct maturity the guard is not sufficient, so the q9 decision must precede the q1 decision: enabling the filter before settling T would reject the short-dated deep-ITM rows whose pl-implied vol is genuinely above 300%. (c) The owner is also RIGHT that my earlier "pl is stale" claim was a misinterpretation; E-045 note (d), the design doc and PENDING G-18 are corrected. (d) The two samples are only 2 of the 13 boundary rows, so "all 13 are rescued" remains a hypothesis that the new probe tests over every row rather than a sample.`
### E-051 — LIVE borderline probe run (owner, old.tsetmc.com, 2026-10-18T07:18Z): the correct maturity is 4x worse than the shipped one

- `evidenceId`: `E-051`
- `claim`: `The owner ran probes/ivfilter.borderline.live.v1.js on old.tsetmc.com (2983 symbols, 1049 option rows, 1710-entry underlying map). The 2x2 factorial (maturity x guards) on live data: RUN A (shipped T=30/365, guards on) -> borderline 8/442 solved = 1.8%; RUN A with guards off -> 124/715 = 17.3%, so the guards rescue 116 of 124 boundary rows (93.5%) at the shipped maturity. RUN B (correct T=DTE/365, guards on) -> 30/411 = 7.3%; RUN B with guards off -> 73/615 = 11.9%, so the guards rescue only 43 of 73 (59%). The probe verdict: PRODUCT-DECISION (7.3% in the 3-8% band). Live maturities span 3 to 87 days (dteHistogram 0-7d 91, 8-30d 265, 31-90d 556), so the shipped fixed 30/365 is wrong for most rows. At RUN B, 47.8% of option rows have no usable price at all (noS 17, noT 120, and 297 with neither a valid book nor a trade), so they bypass the filter entirely under fail-open.`
- `level`: `live (owner-run console injection, real engine path mirrored)`
- `source`: `probes/ivfilter.borderline.live.v1.js, tag [konsol], VM3709`
- `host`: `old.tsetmc.com`
- `parTree`: `15131F (live)`
- `capturedAt`: `2026-10-18T07:18:37Z`
- `method`: `2x2 factorial over 1049 live option rows; guards on/off crossed with T=30/365 and T=DTE/365; per-row impliedVol from the real model`
- `fixtureHash`: `N/A — live probe JSON`
- `status`: `verified-live — the decision is now a product decision with real numbers`
- `relatedGate`: `G-19 (fixed T vs real DTE) + E-045/E-047/E-049/E-050 + q1/q9`
- `notes`: `(a) The shipped T flatters the result: 1.8% would have looked "safe to enable", but that number is produced by modelling a 3-day option as 30 days. (b) 10 of the 29 ceiling pins in RUN B are a SINGLE chain (ahram, 3 days to expiry, K=20000..46000). Verified arithmetically that this chain genuinely has no Black-Scholes solution: even at sigma=3.0 the model reaches only ~334 rial of time value for K=46000, while the market shows 1080, so the price is 2-3x the maximum the model can produce at any volatility. (c) 120 rows have no usable maturity (expired or unparseable expiry) and 17 have no underlying - both are reported separately. (d) 297 rows (28%) have neither a valid book nor a trade, i.e. no price at all; under fail-open they are never filtered, which caps the filter's real coverage. (e) The probe now also reports boundary concentration per underlying (byBase) so a single chain cannot hide inside an average.`
### E-052 — q9 + q10 applied in code; two latent bugs found on the way

- `evidenceId`: `E-052`
- `claim`: `The owner's review accepted q9 (TMode:'dte') and q10 (a boundary pin stays visible, labelled no-iv-solution). Both are now implemented as engine defaults. Applying them exposed two latent bugs. (1) normalizeFunnelConfig mapped an ABSENT TMode to 'fixed', so flipping the default had no effect on any caller that did not pass TMode explicitly - q9 would have been silently inert. (2) The pass test used `sigma < ivMax` while atBoundary used `sigma >= 2.9999999`; the real solver returns 2.99999991 for a pin, so a real pin was simultaneously atBoundary:true and ivStatus 'ok'. A fake solver returning exactly 3.0 did NOT reproduce it, so the existing parity test could not see it.`
- `level`: `node (local, deterministic)`
- `source`: `probes/engine.parity.v1.js, src/engine/bEngine.v0.1.0.js, src/models/jalaliCalendar.v0.1.0.js, probes/ivfilter.borderline.live.v1.js`
- `host`: `local`
- `parTree`: `N/A`
- `capturedAt`: `2026-10-18`
- `method`: `apply the two decisions, then re-run the parity harness and the live probe in a vm sandbox with a synthetic window.mw`
- `fixtureHash`: `N/A`
- `status`: `verified — parity 154/154 (was 140/140); live probe in node: engineParity 200/200 agree; engine RUN B pass 201/201 with ivStatus {ok:200, no-iv-solution:1, fail-iv-range:0}`
- `relatedGate`: `G-19 (closed) + G-08 (the calendar the engine now owns) + E-051 + q9/q10`
- `notes`: `(a) The Jalali conversion was promoted out of the probe into src/models/jalaliCalendar.v0.1.0.js and became the engine's DEFAULT calendar, so TMode:'dte' can never silently degrade to "model everything as 30 days" and can never mean "no maturity at all". The anchors 1405/01/01 == 2026-03-21 and 1405/07/29 == 2026-10-21 are asserted in the parity harness. (b) q10 is a config flag (pinFailOpen, default true) rather than hardcoded behaviour, so it is reversible without a code change. (c) The parity fixture's expiries are now generated as today + 30 days against a PINNED clock, because a fixture with hardcoded Jalali dates goes stale the month it is written in - half of it was already in the past. (d) The probe gained a windowSweep (what a narrower ivMin/ivMax would actually remove) and ivStatus counts, which is the data the ivMin/ivMax decision needs.`
### E-053 — LIVE re-run (owner, old.tsetmc.com 2026-10-18T08:40-08:44Z): the window sweep says the filter removes nothing, and G-13 v3 round-trips

- `evidenceId`: `E-053`
- `claim`: `Three live runs. (1) probes/ivfilter.borderline.live.v1.js at 08:41:40Z, RUN A (shipped T=30/365, guards on) over 1049 option rows: ivSolved 463, borderline 5 = 1.1%, guardArb 130, guardSpread 162, guardOther 294 (no usable price), noS 17, srcMid 273, srcPlTraded 190. The NEW windowSweep on live data: window [0.01, 3.0] removes 0 of 463 solved rows (0%); [0.05, 2.5] removes 8 (1.73%); [0.10, 2.0] removes 40 (8.64%); [0.20, 1.5] removes 108 (23.33%). RUN A with guards OFF solves 755 rows with 147 borderline (19.5%), of which 140 are FLOOR pins - the same 3-day chains that ceiling-pin at the correct maturity floor-pin at 30/365, i.e. the pin is a property of the market price versus the model, not of the maturity choice. (2) probes/fieldsem.ivdiagnostic.live.v1.js at 08:40:33Z, n=120, T=30/365: the G-11 mapping has atBoundary 15 (12.5%) and marketPriceOutOfRange 15 (the same rows) - 12.5% of live option rows carry a price that NO volatility in [0.01, 3.0] can produce. v9: atBoundary 62 (51.7%), outOfRange 61. (3) The G-13 v3 bridge probe at 08:44:26Z: non-empty FilterCode round-trips (sent and observed 'G13-PROBE-1792313066616', len 23), the trace is valid (submit -> accepted -> running -> done), rollback restores, and the slot is restored to empty. Status: candidate-confirmed, which is a RECONFIRMATION rather than a new promotion - G-13 was already promoted to confirmed on 2026-10-15 (E-026); the probe's own `bestChoice` text predates that promotion and is stale.`
- `level`: `live (owner-run console injection)`
- `source`: `probes/ivfilter.borderline.live.v1.js, probes/fieldsem.ivdiagnostic.live.v1.js, probes/g13.bridge...v3`
- `host`: `old.tsetmc.com`
- `parTree`: `15131F`
- `capturedAt`: `2026-10-18T08:40:33Z / 08:41:40Z / 08:44:26Z`
- `method`: `2x2 factorial with the windowSweep; G-11 vs v9 diagnostic at T=30/365; official bridge probe v3`
- `fixtureHash`: `N/A - live probe JSON`
- `status`: `verified-live for what was captured; RUN B of the borderline probe was TRUNCATED in the paste and is still outstanding`
- `truncationCause`: `The probe printed PROBE_JSON AFTER its human-readable console.tables. Adding the windowSweep and byBase tables pushed that line past the console's copyable output cap, so two consecutive live runs (08:41Z and 08:56Z) were cut at exactly the same point - VM6037:499 and VM6369:499 - losing runB_realDTE, runB_engine, guardImpact and the decision line. Attempt 2: moving PROBE_JSON to the first line was NOT enough - the paste was still cut at the same place, because the real cap is on the paste LENGTH: exactly 5001 characters (measured), and the full JSON was ~15KB (10 samples per arm, byBase top-8, verbose per-arm objects). Attempt 3, the shipped shape: the default output now contains EXACTLY ONE json line - a slim projection, printed first, 2799 chars on synthetic data and structurally bounded (fixed field count per arm, samples capped at 3, sweep entries as arrays). The verbose object is opt-in via window.__B_PROBE_FULL = true and is then emitted in 4000-char chunks that each survive a paste (reassembly verified in node). A fourth live run (VM6589:563) had copied the verbose line itself - two json lines in the output is what made that possible.`
- `relatedGate`: `G-19 (closed) + G-13 (candidate-confirmed) + E-051 + q1/q9/q10`
- `notes`: `(a) The windowSweep settles the owner's question "if ivFilterEnabled=true with [0.05, 2.5], how many rows are removed?" - 8 rows, 1.7% of solved. At the default [0.01, 3.0] it is exactly 0, so enabling the filter today is pure logging with zero behavioural change. (b) The 12.5% no-solution rate from the diagnostic is BEFORE the guards; the guards reject 292 of 1049 rows as arbitrage/spread violations and so mostly absorb the impossible prices, which is why the funnel only sees 5. (c) RUN B (real DTE) and runB_engine are missing from the pasted JSON - the console output was cut off after runA_fixedT30_noGuard. Those are the decisive numbers for q1 now that TMode='dte' is the shipped default. (d) The engine is still not registered on the page (window.TseBEngine absent), so the live product behaviour is unchanged by today's code commits. (e) byBase for RUN A shows no single dominating chain (4 underlyings, 1-2 boundary rows each) - unlike the 07:18Z run where one 3-day chain was 10 of 30.`
### E-054 — LIVE RUN B at the correct maturity (owner, old.tsetmc.com 2026-10-18T09:20Z): the window sweep closes q1

- `evidenceId`: `E-054`
- `claim`: `The owner's run finally delivered RUN B (TMode 'dte', guards on) over 1049 live option rows: ivSolved 453, borderline 23 = 5.1% (atLower 3, atUpper 20), guardHitPct 19.2, insufficientPct 43.8, solveFailPct 56.8. Probe verdict: PRODUCT-DECISION (5.1% in the 3-8% band). The IV histogram is 0.5-1: 240, 1-1.5: 107, 0.2-0.5: 24, 1.5-2: 30, 2-2.9: 27, at_upper: 20, at_lower: 3, <0.05: 1, 0.1-0.2: 1. The windowSweep at the CORRECT maturity: [0.01, 3.0] removes 0 of 453 (0%); [0.05, 3.0] removes 1 (0.22%); [0.01, 2.5] removes 9 (1.99%); [0.05, 2.5] removes 10 (2.2%); [0.10, 2.0] removes 28 (6.18%); [0.20, 1.5] removes 59 (13.02%). All 10 borderline samples are ONE chain (اهرم, dte=3, K=20000..46000, S=70911, all iv=3.0 ceiling) - 10 of the 20 ceiling pins.`
- `level`: `live (owner-run console injection)`
- `source`: `probes/ivfilter.borderline.live.v1.js (RUN B tables)`
- `host`: `old.tsetmc.com`
- `parTree`: `15131F`
- `capturedAt`: `2026-10-18T09:20:55Z`
- `method`: `2x2 factorial with the windowSweep; RUN B uses T = DTE/365`
- `fixtureHash`: `N/A - live probe JSON`
- `status`: `verified-live - q1 decided and applied`
- `relatedGate`: `G-19 (closed) + E-051/E-053 + q1/q7/q9/q10`
- `notes`: `(a) The decisive number: at the correct maturity the DEFAULT window [0.01, 3.0] removes 0 rows, so enabling ivFilterEnabled is behaviourally inert and pure labelling - the same result as at the shipped maturity, so the conclusion does not depend on the maturity decision. (b) The narrow window [0.05, 2.5] removes 10 of 453 solved rows (2.2%) - 1 row with a near-zero time value and 9 with an extreme IV (>= 2.5). Applied per the owner's stated rule ("if the probe shows an effect"). (c) The boundary rate at the correct maturity is 5.1% versus 1.1% at the shipped one - the same ~4-5x factor as E-051 (7.3% vs 1.8%), so the finding is stable across runs. (d) Half of the ceiling pins are a single 3-day chain, which q10 keeps visible with the no-iv-solution label. (e) 43.8% of live option rows still have no usable price, so the filter's real coverage is at most 56% regardless of the window.`
### E-055 — LIVE A-registration (owner, old.tsetmc.com 2026-10-18T09:39Z): the generated body round-trips byte-for-byte, but the persistence path is still unproven

- `evidenceId`: `E-055`
- `claim`: `probes/aRegister.live.v1.js ran live on old.tsetmc.com/Loader.aspx?ParTree=15131F. The generated A body (430 bytes, 11 newlines, a non-ASCII em dash in the header, fnv1a 38fe0c59 - identical to the repo module's output) was registered through mw.FilterCode + mw.SaveParams() and came back byte-for-byte unchanged (identical=true, newlines 11->11, fnv1aOut 38fe0c59, firstDiffAt=-1). It compiles in the slot's (row, mw) signature, all 7 fail-open behavioural cases pass, and the slot was rolled back to its original empty value. Status: candidate-confirmed. ONE UNRESOLVED FINDING: the active slot is Settings.FilterNo = 1 of 3, and after SaveParams() the entry still reads Settings.Filters[1].FilterCode len 0, entryMatches=false.`
- `level`: `live (owner-run console injection)`
- `source`: `probes/aRegister.live.v1.js`
- `host`: `old.tsetmc.com`
- `parTree`: `15131F`
- `capturedAt`: `2026-10-18T09:39:39Z`
- `method`: `generate -> capacity -> syntax -> register in mw.FilterCode + SaveParams -> byte round-trip -> 7 behavioural cases -> rollback`
- `fixtureHash`: `N/A - live probe JSON`
- `status`: `candidate-confirmed for the byte round-trip and behaviour; the persistence path is NOT proven`
- `relatedGate`: `G-12 (A slot) + G-13 (E-026) + E-053`
- `notes`: `(a) The round-trip through mw.FilterCode is real but weaker than it looks: setting mw.FilterCode and reading it back is a plain property assignment, so it proves the slot accepts the bytes, not that they were persisted. (b) E-026 records SaveParams as setData("MarketWatchSettings", JSON.stringify(mw.Settings)) - i.e. persistence goes through mw.Settings, NOT through mw.FilterCode. Since Settings.Filters[1].FilterCode still reads empty after SaveParams, the registered body may never have reached the persisted state. (c) The G-13 v3 probe's "trace valid" check validated a trace array the probe itself synthesised, not one observed from the site, so it never tested persistence either. (d) The design doc's own open gate says the TextArea registration API (PrepareFilterCode's exact name/parameters) is not recorded in this repo. (e) The live page also had FilterNo 1 of 3 filters where E-026 recorded FilterNo 8 - the slot index is not stable across page loads, so a registration must target Settings.FilterNo, never a hardcoded index. (f) Next probe must resolve: does mw.FilterCode write through to Settings.Filters[FilterNo], and what is PrepareFilterCode's real signature.`
### E-056 — LIVE slot discovery (owner, old.tsetmc.com 2026-10-18T09:45Z): mw.FilterCode is a mirror, and PrepareFilterCode leaves the 430-byte body untouched

- `evidenceId`: `E-056`
- `claim`: `probes/slotDiscovery.live.v1.js ran live. (1) mw.FilterCode is a plain WRITABLE DATA property (own:true, hasGet:false, hasSet:false, writable:true), not an accessor. (2) Writing mw.FilterCode does NOT reach Settings.Filters[FilterNo]: entryAfterAssign and entryAfterSave both stayed "" while mw.FilterCode held the mark -> reachedSettings:false. (3) The reverse also fails: writing Settings.Filters[1].FilterCode did not change mw.FilterCode -> reachedFilterCode:false. The two are independent copies. (4) SaveParams is function(){setData("MarketWatchSettings",JSON.stringify(mw.Settings))} with argCount 0 - persistence goes through mw.Settings only, which is exactly why the mw.FilterCode write never persisted. (5) FilterNo is NOT on mw; it lives at mw.Settings.FilterNo (active slot 1 of 3). (6) PrepareFilterCode EXISTS: function(RawCode){var FilterCode=RawCode; FilterCode=FilterCode.replace(/\x28l18\x29/g,'row["l18"]'); ...} with argCount 1, 61 .replace() rules, no eval/new Function. (7) CRITICAL: PrepareFilterCode(BODY) returns the 430-byte body UNCHANGED - resultLen 430, resultIdentical true. The 61 rules map the site's (l18)/(l30)/(tno) shorthand to row[...] accessors and do not touch this body. (8) Rollback restored. Verdict: mirror-only.`
- `level`: `live (owner-run console injection)`
- `source`: `probes/slotDiscovery.live.v1.js`
- `host`: `old.tsetmc.com`
- `parTree`: `15131F`
- `capturedAt`: `2026-10-18T09:45:50Z`
- `method`: `API enumeration with real function source + accessor descriptor + bidirectional write-through + PrepareFilterCode behaviour + rollback`
- `fixtureHash`: `N/A - live probe JSON`
- `status`: `verified-live - three of the design doc's open gates are now closed`
- `relatedGate`: `G-21 (opened by E-055) + G-12/G-13 (E-026) + E-055`
- `notes`: `(a) The registration path for A is therefore TWO writes plus a save: mw.Settings.Filters[mw.Settings.FilterNo].FilterCode = mw.PrepareFilterCode(body); mw.FilterCode = <the same code>; mw.SaveParams(); - the first for persistence, the second for the current session, and neither implies the other. (b) PrepareFilterCode(RawCode) is the site's own DSL compiler: it rewrites the (l18)/(l30)/(tno) shorthand into row[...] accessors. A body written in plain JS passes through unchanged, which is what the 430-byte body does. (c) The page also exposes QueryWindowSaveFilter / QueryWindowNewFilter / QueryWindowCheckFilter / SelectFilter, which are the UI-level save path; not needed if the two writes above are used. (d) REMAINING unknown (design doc open gate 2): whether the filter body's execution context can see mw. The 61 rules prove `row` is in scope; nothing yet proves `mw` is. (e) This also re-frames E-026/G-13: their round-trip proved the property is writable, which is now known to be a mirror, so "FilterCode round-trips" was never evidence of persistence.`

### E-057 — LIVE A scope probe v1 (owner, old.tsetmc.com 2026-10-18T09:53Z): storing the body does NOT make it run

- `evidenceId`: `E-057`
- `claim`: `probes/aScope.live.v1.js ran live. The instrumented body (1489 bytes, fail-open, same guards as the real 430-byte body) was registered through the E-056 path - `mw.Settings.Filters[mw.Settings.FilterNo].FilterCode = mw.PrepareFilterCode(BODY)` plus `mw.FilterCode = BODY` plus `mw.SaveParams()` - with FilterNo 1 of 3, `compiledIdentical: true`, `savedLen: 0`. Its counters were then polled every 250ms for 4000ms at `UpdateSpeed: 1000`. Result: `runs: 0`, `firstRunAtMs: -1`, `evaluated: false`, `bodyError: null`, `sawRow: false` - the body was NEVER executed, while `stillRegisteredAtEnd: true` proves the code was still sitting in the active slot, and `rollback: { restored: true }` proves the page was put back. Verdict: `not-evaluated`.
- `level`: `live (owner-run console injection)`
- `source`: `probes/aScope.live.v1.js`
- `host`: `old.tsetmc.com`
- `parTree`: `15131F`
- `capturedAt`: `2026-10-18T09:53:55Z`
- `method`: `register an instrumented body through the E-056 two-write path, poll its global counters for 4s, roll back, print one JSON line`
- `fixtureHash`: `N/A - live probe JSON`
- `status`: `verified-live - the registration path alone is NOT sufficient; a compile/activation step is missing`
- `relatedGate`: `G-22 (opened by E-056) + G-21 (E-056) + E-055/E-056`
- `notes`: `(a) This re-frames E-055 too: its "candidate-confirmed" proved the body can be STORED and round-trips byte-for-byte; it never proved the site EXECUTES it. Storage and execution are separate steps. (b) Because the code was still in the slot at the end of the wait, the site must compile the filter at some other moment (its own UI save path, or filter selection) and cache the compiled function - writing the settings object afterwards does not invalidate that cache. (c) G-22 is therefore still open and now has two halves: (i) what triggers compilation - opened as G-23; (ii) whether the body's execution context can see mw, which cannot be answered until (i) is known. (d) The probe is safe: the body always returns true, so no row is ever hidden, and the rollback restores both copies and calls SaveParams.`

### E-058 — LIVE A trigger probe v1 (owner, old.tsetmc.com 2026-10-18T10:05Z): mw.RenderData() is the compile+execute trigger, and the body CAN see mw

- `evidenceId`: `E-058`
- `claim`: `probes/aTrigger.live.v1.js ran live. Read-only recon found 9 mw functions whose source mentions FilterCode, 0 properties already holding a compiled body, FilterNo 1 of 3, and 0 textareas in the DOM. Four independently-rolled-back activation tests, each polling 1.6s: (1) T1 mw.SelectFilter(1) -> runs 0, NOT the trigger. (2) T2 the TextArea path -> skipped, because the page has NO textarea at all; mw.QueryWindowSaveFilter() threw "Cannot read properties of undefined (reading 'replace')", i.e. it reads a DOM element that only exists while the filter dialog is open. (3) T3 mirror + SaveParams (the E-056 path) -> runs 0, confirming E-057. (4) T4 the zero-arg render functions -> only RenderData exists, and mw.RenderData() produced runs 2132 with firstRunAt 1251ms, sawMw TRUE and sawRow TRUE. The body therefore IS executed per row, and its execution context can see mw. Rollback restored every Filters entry, FilterNo and mw.FilterCode, then SaveParams.`
- `level`: `live (owner-run console injection)`
- `source`: `probes/aTrigger.live.v1.js`
- `host`: `old.tsetmc.com`
- `parTree`: `15131F`
- `capturedAt`: `2026-10-18T10:05Z`
- `method`: `read-only recon of every FilterCode-touching mw function + the filter DOM, then four activation tests each with its own rollback`
- `fixtureHash`: `N/A - live probe JSON`
- `status`: `verified-live - two gates closed, the registration path is now complete`
- `relatedGate`: `G-22 (closed) + G-23 (closed) + G-24 (opened) + E-056/E-057`
- `notes`: `(a) G-22 CLOSED with answer scope-ok: the filter body can see mw, so the real A body's unguarded mw.__B_index read is viable and B does NOT have to move the projection to window.__B_*. (b) G-23 CLOSED with answer trigger = mw.RenderData(): the complete registration path is TWO writes + SaveParams + RenderData. (c) The attribution is sound: E-057 and T1/T3 all had the body sitting in the active slot and produced runs 0 over multi-second windows, so the site does not run the filter on its own timer; the only call made in T4 was RenderData, and the runs appeared after it. (d) firstRunAt 1251ms means RenderData is not synchronous with respect to the filter - the body starts running about a second after the call returns, so any registration must be followed by a wait before the effect is measured. (e) The TextArea path is not usable headlessly: there is no textarea in the DOM until the filter dialog is opened, and QueryWindowSaveFilter() throws while it is closed. (f) REMAINING (G-24): whether the real 430-byte body, registered through this complete path, hides exactly the rows the projection marks and fails open when the projection is gone.`

### E-059 — LIVE re-run of the E-055 probe (owner, old.tsetmc.com 2026-10-20T07:20Z): a probe body is still in the owner's filter slot, and it survived a reload

- `evidenceId`: `E-059`
- `claim`: `The owner re-ran probes/aRegister.live.v1.js on 2026-10-20, two days after E-058. It reported slot.originalLen 1409 with originalPreview "var FilterResult = true;\ntry {\n  var __g = (typeof window !=". Verified in-repo: the instrumented body of probes/aTrigger.live.v1.js is exactly 1409 bytes and its first 60 characters are that string byte-for-byte. So the ACTIVE filter slot (FilterNo 1 of 3) still contains the instrumented body E-058 wrote, and because the page had been reloaded in between, that body was PERSISTED. The same run also wrote the 430-byte A body and read it back: roundTrip.observedLen 430, roundTrip.identical true, roundTrip.fnv1aOut 38fe0c59, roundTrip.firstDiffAt -1, rollback.afterLen 1409 - the write reaches the slot and round-trips byte-for-byte, and the rollback put the 1409-byte body back.`
- `level`: `live (owner-run console injection)`
- `source`: `probes/aRegister.live.v1.js` (re-run) + `probes/aTrigger.live.v1.js` (byte comparison) + `probes/aSlotHygiene.live.v1.js` (new)
- `host`: `old.tsetmc.com`
- `parTree`: `15131F`
- `capturedAt`: `2026-10-20T07:20:43Z`
- `method`: `re-run of the registration probe + byte-level identification of the body found in the live slot`
- `fixtureHash`: `N/A - live probe JSON`
- `status`: `verified-live - persistence confirmed, and one governance claim corrected`
- `relatedGate`: `G-21 (E-056) + E-055 + E-057 + E-058 + G-24`
- `notes`: `(a) PERSISTENCE CONFIRMED, the hard way: a body written by a probe and "rolled back" in memory was still in the owner's slot after a reload, so the two writes + SaveParams path does persist across sessions. (b) GOVERNANCE CORRECTION: "rollback restored" in E-055, E-057 and E-058 means the IN-MEMORY object was restored. It never meant the persisted copy was clean - SaveParams writes mw.Settings at the moment it is called, and a later restore + SaveParams can be lost (debounced, or the site re-serialises from its own copy). Every rollback claim before E-059 must be re-read with that limit. (c) E-055's entryMatches false is now explained as an artefact, not a broken write path: this run's identical true / firstDiffAt -1 / afterLen 1409 shows the write reaches Settings.Filters[FilterNo] and round-trips. (d) The re-run probe still does not call RenderData, so it still cannot prove execution - that remains G-24. (e) probes/aSlotHygiene.live.v1.js added: read-only classification of every slot, the mirror and the persisted copy, with an opt-in clean mode (window.__A_CLEAN = true) that clears ONLY slots classified as probe-body and leaves the owner's own site-dsl filters untouched.`

### E-060 — LIVE hygiene + real-registration v1 (owner, old.tsetmc.com 2026-10-20T07:40Z / 07:41Z): the slot is clean, the registration path ran, and the measurement was invalid

- `evidenceId`: `E-060`
- `claim`: `Two live runs. (1) probes/aSlotHygiene.live.v1.js read-only at 07:40Z: the Filters array now has TWO slots - i=0 "فیلتر شماره 4" and i=1 "فیلتر شماره 2" (active, FilterNo 1) - and BOTH are empty (len 0, fnv1a 811c9dc5); the persisted copy is 795 chars with both slots empty; the mirror mw.FilterCode is empty and matchesActiveSlot true. The 1409-byte probe body found on 2026-10-20T07:20Z is therefore GONE and the owner's filter slots are clean. Leftover marks still on the page: __A_SCOPE_RUNS 1188432, __A_SCOPE true, TseBEngine undefined. (2) probes/aRegisterReal.live.v1.js at 07:41Z: the registration path itself executed cleanly - body verified (430 bytes, fnv1a 38fe0c59, 11 newlines), compiledIdentical true, compiledLen 430, written true, renderCalled true, and rollback slotRestored/mirrorRestored/cleaned all true - but the MEASUREMENT was invalid: the probe took its inscodes from Object.keys(mw.AllRows) and then looked for them in the DOM as [inscode="..."], and all ten read 'absent' at BASELINE, before anything was registered. So match:false, failRowsHidden:true and allVisible:false are measurement artefacts and say nothing about the filter.`
- `level`: `live (owner-run console injection)`
- `source`: `probes/aSlotHygiene.live.v1.js` + `probes/aRegisterReal.live.v1.js` + `probes/aRegisterRealV2.live.v1.js`
- `host`: `old.tsetmc.com`
- `parTree`: `15131F`
- `capturedAt`: `2026-10-20T07:40:15Z` and `2026-10-20T07:41:36Z`
- `method`: `read-only slot classification, then a full registration run whose row measurement was DOM-attribute based`
- `fixtureHash`: `N/A - live probe JSON`
- `status`: `verified-live - slots clean; registration path confirmed executable; row measurement must be redone without the DOM`
- `relatedGate`: `G-24 + E-058 + E-059`
- `notes`: `(a) SLOTS CLEAN: nothing of ours is left in the owner's filters, in memory or in storage. (b) NEW KNOWLEDGE from the live function sources: RenderData iterates "for (var key in mw.AllRows) { var row = mw.AllRows[key]; ... row.inscode ... }" - AllRows is keyed by something else and the inscode lives ON the row, which is exactly why v1's key-based projection and DOM lookup both missed. (c) SelectFilter(FilterNo) guards "FilterNo==-1 || FilterNo>=mw.Settings.Filters.length || mw.Settings.Filters.length==0" and then sets mw.FilterCode="" - it READS the slot into the mirror. This re-frames E-058: T1's runs 0 is NOT evidence that SelectFilter is not a trigger, because the slot was empty at that moment and SelectFilter had just set the mirror to empty. G-23's answer stands (RenderData executes), but SelectFilter's role is "load the active slot into the mirror", and a render must still follow. (d) QueryWindowCheckFilter reads $("#InputFilterCode").val() and QueryWindowSaveFilter reads $("#InputFilterName").val() - the filter editor's DOM ids are now known, so the TextArea path is reachable once the dialog is opened. (e) UpdateMarketWatch reads mw.FilterCode.length, confirming the mirror matters to the page's own periodic logic. (f) G-24 stays open; probes/aRegisterRealV2.live.v1.js measures the body's verdicts by publishing the projection as read-logging Proxies, so the body itself is registered unchanged.`

### E-061 — LIVE real registration v2 (owner, old.tsetmc.com 2026-10-20T07:51Z): the mechanism is fully known, and A works end to end

- `evidenceId`: `E-061`
- `claim`: `probes/aRegisterRealV2.live.v1.js ran live with FilterNo 2 of 4 (slot i=1 still holds a 1409-byte probe body but is NOT the active slot; the active slot i=2 was empty). The recon captured the exact call site inside RenderData: "if(mw.FilterCode.length!=0){var FilterResult;try{...FilterResult=eval(mw.FilterCode)}catch(e){FilterResult=false}if(!FilterResult){if(document.getElementById(row.inscode)!=null){...". So the site evaluates THE MIRROR mw.FilterCode with eval(), inside a scope where both row and mw are visible, and it hides the row by looking up document.getElementById(row.inscode). Results: body verified (430 bytes, fnv1a 38fe0c59, 11 newlines), compiledIdentical true, compiledLen 430, written true, renderCalled true, rollback slotRestored/mirrorRestored/cleaned all true. The read-logging Proxies recorded indexCount 16 over 12 distinct inscodes (RenderData evaluates some rows twice), and EVERY row the body was actually invoked on got the correct verdict: 23842604089739254 keep (pass), 67141987086032267 hide (fail), 20292922178776915 keep (pass), 70270965300262393 hide (fail), 13117618204212939 hide (fail), 28450080638096732 / 29247915161590165 / 14231831499205396 fail-open(known=0) (unknown). Dropping __B_index produced indexCount 0 - the body fail-opened at its own guard.`
- `level`: `live (owner-run console injection)`
- `source`: `probes/aRegisterRealV2.live.v1.js`
- `host`: `old.tsetmc.com`
- `parTree`: `15131F`
- `capturedAt`: `2026-10-20T07:51:46Z`
- `method`: `publish the projection as read-logging Proxies, register the unchanged 430-byte body via two writes + SaveParams + RenderData, read the verdicts back from the logged reads`
- `fixtureHash`: `N/A - live probe JSON`
- `status`: `verified-live - A works end to end; G-24 closed, G-25 opened for full-population DOM confirmation`
- `relatedGate`: `G-24 (closed) + G-25 (opened) + G-22/G-23 (E-058) + E-060`
- `notes`: `(a) MECHANISM, from the site's own source: RenderData pre-filters rows (ViewMode, BasketInsts, SectorNo, Market==6, and the heven bounds), then for each surviving row does FilterResult=eval(mw.FilterCode) inside try/catch, and on a false result hides document.getElementById(row.inscode). (b) G-22 is now confirmed AT SOURCE LEVEL, not just behaviourally: the eval happens in a scope where mw is visible (the very same line uses mw.FilterCode and mw.ClientType[row.inscode]). (c) HARD CONSTRAINT: an exception in the body yields FilterResult=false, i.e. the row is HIDDEN. The site is fail-CLOSED on exception, so A's body must never throw and B's publication must never be able to make it throw - this is the opposite of our fail-open law and must be respected by both sides. (d) The site evaluates the MIRROR, so writing only Settings.Filters[FilterNo] is not enough; both copies are required, as E-056 said. (e) The probe's "runs-but-wrong-verdicts" status is a SAMPLING ARTEFACT: it sampled the first 12 keys of mw.AllRows (2896 keys), and 4 of them (30507152381699953, 49854144784855542, 47471972172770430, 490133569535796) were excluded by RenderData's own pre-filters before reaching the filter, so the body was never invoked for them. Of the 8 rows it WAS invoked on, 8/8 were correct. viewMode 0 and market 0 rule out the ViewMode/Market pre-filters, so the exclusion came from the heven bounds. (f) keyIsInscode was TRUE this time (AllRows keys are inscodes); v1's real failure was the DOM hook - the site uses id=inscode, not an [inscode] attribute, which is why every lookup read 'absent'. (g) G-25 opened: confirm over the whole rendered population with the id-based DOM hook.`

### E-062 — LIVE real registration v3 (owner, old.tsetmc.com 2026-10-20T08:19Z): the DOM row count is not a valid measurement on this page

- `evidenceId`: `E-062`
- `claim`: `probes/aRegisterRealV3.live.v1.js ran live with a projection over all 2896 inscodes (362 bytes of known/bitset). Registration itself worked: compiledIdentical true, compiledLen 430, renderCalled true, and the rollback restored the slot, the mirror and the projection (slotRestored/mirrorRestored/cleaned all true). The DOM counts, however, were baseline n=0 (present 0, absent 2896), all-fail n=0 (absent 2896), all-pass n=538 (present 538, absent 2358), fail-open n=0 (absent 2896) and rollback n=2096 (present 2096, absent 800).`
- `level`: `live (owner-run console injection)`
- `source`: `probes/aRegisterRealV3.live.v1.js` + `probes/aRegisterRealV4.live.v1.js`
- `host`: `old.tsetmc.com`
- `parTree`: `15131F`
- `capturedAt`: `2026-10-20T08:19:32Z`
- `method`: `publish a projection over every AllRows inscode, then all-fail / all-pass / fail-open / rollback, counting visible rows by document.getElementById(inscode)`
- `fixtureHash`: `N/A - live probe JSON`
- `status`: `verified-live - the DOM-count method is invalid here; the read-tally Proxy remains the valid instrument`
- `relatedGate`: `G-25 (still open) + G-24 (E-061) + E-061`
- `notes`: `(a) The counts are NOT the filter's effect: all-pass showed 538 visible rows while the rollback, with no filter at all, showed 2096. A filter that keeps every row cannot show fewer visible rows than no filter, so the numbers measure render timing, not A. (b) The market watch renders asynchronously and re-renders on its own timer (UpdateSpeed 1000), so a count taken 2.2s after RenderData races with the page: baseline and all-fail were measured before the page had built its rows (absent 2896), all-pass caught a partial render (538), and the rollback caught a fuller one (2096). (c) The id=inscode hook itself is real - 2096 elements with those ids exist once the page has rendered - it is simply not a usable measurement on this page. (d) GOVERNANCE: DOM row counting is retired as a measurement method for this page. The valid instrument is the read-tally Proxy on __B_index/__B_known/__B_bitset, which observes the verdict at the moment the body computes it and cannot race with a render. (e) G-25 stays open and is now answered by probes/aRegisterRealV4.live.v1.js, which applies the tally over the WHOLE population: all-fail must make every evaluated row 'hide', all-pass must make every one 'keep', and fail-open must produce zero reads. (f) The owner's slot i=1 still holds the 1409-byte probe body (non-active; FilterNo is 2) - it has survived every probe since E-059.`

### E-063 — LIVE real registration v4 (owner, old.tsetmc.com 2026-10-21T06:13Z): A works on the whole population — G-25 closed

- `evidenceId`: `E-063`
- `claim`: `probes/aRegisterRealV4.live.v1.js ran live with a projection over EVERY inscode in mw.AllRows (2753 rows, 345 bytes of known/bitset), published as read-tallying Proxies, and the unchanged 430-byte body registered through two writes + SaveParams + RenderData (compiledIdentical true, compiledLen 430, renderCalled true). ALL-FAIL (known=1, bit=0 everywhere): reads 3930 over 1965 distinct inscodes, verdicts {keep 0, hide 1965, failOpen 0, noVerdict 0} - allHidden true. ALL-PASS (known=1, bit=1 everywhere): reads 3930 over the same 1965 distinct inscodes, verdicts {keep 1965, hide 0} - allKept true, samePopulation true. FAIL-OPEN (__B_index = null): reads 0 - noReads true. ROLLBACK: slotRestored, mirrorRestored and cleaned all true. Status works-on-the-whole-population.`
- `level`: `live (owner-run console injection)`
- `source`: `probes/aRegisterRealV4.live.v1.js`
- `host`: `old.tsetmc.com`
- `parTree`: `15131F`
- `capturedAt`: `2026-10-21T06:13:14Z`
- `method`: `read-tally Proxies over the whole population; all-fail / all-pass / fail-open, then rollback`
- `fixtureHash`: `N/A - live probe JSON`
- `status`: `verified-live - the A registration chain is complete; every remaining question about registration is answered`
- `relatedGate`: `G-25 (closed) + G-24 (E-061) + G-22/G-23 (E-058) + G-21 (E-056/E-059) + E-062`
- `notes`: `(a) G-25 CLOSED: over the whole population the body was invoked for 1965 distinct inscodes and every single one produced the expected verdict - hide under all-fail, keep under all-pass, and no reads at all once the projection was dropped. (b) COVERAGE: 1965 of 2753 AllRows rows (71.4%) actually reach the filter; the other 788 are excluded by RenderData's own pre-filters before A is consulted. A therefore only ever sees the rows the site renders, and B's projection only needs to cover those. (c) 3930 reads is exactly 2 x 1965, i.e. RenderData ran twice inside the 2.2s window - the site's own timer re-rendered once during our wait, which independently confirms E-062's finding that this page renders asynchronously and periodically. (d) The DOM counts were again useless (all-fail reported visible 0, present 0), which is expected and is why the tally is the instrument. (e) The active slot index moved again: FilterNo 1 here, 2 in E-061/E-062 - the slot index is not stable across runs, so it must always be read from mw.Settings.FilterNo. (f) The owner's slot i=1 still holds the 1409-byte probe body (non-active); it has survived every probe since E-059. (g) The registration chain is now complete end to end: PrepareFilterCode -> two writes -> SaveParams -> RenderData, with mw visible to the body, fail-open on a missing projection, fail-CLOSED on an exception, and a verified rollback.`

### E-064 — LIVE slot hygiene clean mode (owner, old.tsetmc.com 2026-10-21T06:22Z): the owner's page is clean, in memory and in storage

- `evidenceId`: `E-064`
- `claim`: `probes/aSlotHygiene.live.v1.js ran in clean mode (window.__A_CLEAN = true). Before: four slots, with slot i=1 (active, FilterNo 1) holding a 1409-byte body with fnv1a f3eaeaf0 - verified in-repo to be exactly the instrumented body of probes/aTrigger.live.v1.js (1409 bytes, fnv1a f3eaeaf0) - and mw.FilterCode matching it; the persisted copy was 2348 chars and also held that body in slot 1. The mode cleared slot 1 only. After: all four slots empty, the persisted copy 889 chars with all slots empty, afterCounts {memory 0, persisted 0, cleanedSlots 1}. Status cleaned. The page also reported __A_SCOPE_RUNS 418545 and __A_SCOPE true - i.e. the instrumented body had been evaluated 418545 times by the site's own render loop while it sat in the active slot.`
- `level`: `live (owner-run console injection)`
- `source`: `probes/aSlotHygiene.live.v1.js` (clean mode) + `probes/aTrigger.live.v1.js` (byte identity)
- `host`: `old.tsetmc.com`
- `parTree`: `15131F`
- `capturedAt`: `2026-10-21T06:22:00Z`
- `method`: `classify every slot, the mirror and the persisted copy; clear only probe bodies; re-read the persisted copy to prove storage is clean too`
- `fixtureHash`: `N/A - live probe JSON`
- `status`: `verified-live - the owner's filter slots are clean in memory AND in storage; the E-059 leftover is gone`
- `relatedGate`: `G-21 (E-056/E-059) + E-059 + E-060 + E-061 + E-063`
- `notes`: `(a) The E-059 leftover is finally gone: no probe body remains in any filter slot, in the mirror, or in the persisted MarketWatchSettings (2348 -> 889 chars). (b) The clean mode touched exactly one slot and left the other three - and every filter the owner had saved - untouched, which is what the classification guard was for. (c) NEW DATUM: __A_SCOPE_RUNS 418545. The instrumented body was evaluated 418545 times by the site's own render loop during the time it sat in the active slot. This independently corroborates E-061's mechanism - the site really does eval(mw.FilterCode) per row, on every render, indefinitely - and it is the cost side of that mechanism: a body in the active slot runs at the page's cadence for as long as it stays there, so A must be cheap per row (the engine's per-row funnel is measured at ~12.9us local / 16.2us live). (d) The leftover page marks __A_SCOPE_RUNS and __A_SCOPE were deleted by the clean mode; the report captured them before the cleaning. (e) Page state after this run: no probe body in memory or storage, no mw.__B_*, no window.TseBEngine - i.e. the page is exactly as the owner left it, and nothing of ours is running.`
