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
