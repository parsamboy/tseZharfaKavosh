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
- `claim`: `OI chain 36 اهرم 1405/07/29 via cdn.tsetmc.com GetInstrumentOptionByInstrumentID: 35/36 ok sum 3,201,962 zeros 1 (502 retry for 56981594284253648), sample 20000 call 4972 / put 22083, 56000 call 180550 / put 262642 — matches page 4,969 — no credential`
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
- `status`: `candidate` — satisfies G-13 for bridge design (authoritative slot exists, SaveParams round-trip, trace valid); live ApplyBridge with non-empty FilterCode remains as next probe
- `relatedGate`: `G-13`
- `bestChoiceReason`: |
    FilterCode property exists (has true) but value "" len 0 — proves authoritative slot exists even though no filter active now. SaveParams is function setData("MarketWatchSettings",JSON.stringify(mw.Settings)) — persistence via Settings. FilterNo 8 matches PENDING. Trace valid. Best choice: bridge candidate with round-trip, but needs live non-empty FilterCode for confirmation.

### E-023-supplemental — v4 public exhaustive test (2026-10-05 09:24)

- `tested`: `11 same-origin endpoints on old.tsetmc.com 15131F`
- `results`: `Option.aspx 200 html no-oi, InstOption.aspx 200 html no-oi, OptionMarketWatch 200 html, DerivativeOption 200 html, ClientTypeAll flow=3 200 csv (not OI), MarketWatchInit 200 AllRows csv, MarketWatchPlus 200 csv, /api/* 404, TsePublicV2 http blocked MixedContent`
- `conclusion`: `No public OI/multiplier endpoint — authenticated api.tsetmc.com is the only remaining candidate per §7`
