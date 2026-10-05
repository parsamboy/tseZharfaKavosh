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
