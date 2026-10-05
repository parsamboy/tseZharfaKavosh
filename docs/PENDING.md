# فهرست موارد باز Zharfa — قرارداد canonical v6.0

**وضعیت:** سند کنترل تصمیم و validation؛ قرارداد v6.0 canonical شده، اما این فایل gateهای باز را نگه می‌دارد و مجوز تولید کد، shipping یا production-ready بودن نیست.

مواردی که در `docs/DECISIONS.md` انتخاب شده‌اند از این فهرست به‌عنوان تصمیم باز حذف می‌شوند. این فایل فقط تصمیم‌های هنوز تأییدنشده و gateهای فنی باز را نگه می‌دارد.

---

## ۱. تصمیم باز مالک

### P-DEC-001 — دامنهٔ دقیق Alpha

وضعیت: **✅ تصمیم گرفته شد — D-2026-10-05-001 (Full)**

مالک در 2026-10-05 صریحاً **Full scope** را انتخاب کرد (پرسش دامنه → گزینه full → تایید «بله»). این تصمیم در `docs/DECISIONS.md` به‌عنوان `D-2026-10-05-001` ثبت شد:

```text
✅ D1 + D2 + D3 (همه deploymentها)
✅ Greeks/IV + Spread + SVI+Surface کامل + GEX/DEX + Flow + GARCH + bridge خودکار
⛔ هیچ ماژولی phased نیست
```

P-DEC-001 از این فهرست **حذف و به تصمیم بسته** تبدیل شد؛ مرجع canonical آن `D-2026-10-05-001` است. هر تغییر بعدی نیاز به تصمیم جدید Class B دارد.

### P-DEC-002 — privacy و data-transfer policy

وضعیت: **✅ تصمیم گرفته شد — D-2026-10-05-002 (Option A Strict)**

مالک در 2026-10-05 گزینهٔ **A — سخت‌گیرانه (no-server-upload + explicit opt-in)** را انتخاب کرد و در `docs/DECISIONS.md` به‌عنوان `D-2026-10-05-002` ثبت شد:

```text
D1: هیچ upload — D2: local-first — D3: فقط با opt-in صریح هر job
```

P-DEC-002 از این فهرست **حذف و به تصمیم بسته** تبدیل شد؛ مرجع canonical آن `D-2026-10-05-002` است.

---

## ۲. Gateهای فنی و مستندسازی

این موارد گزینهٔ انتخابی مالک نیستند؛ validation/design gate هستند.

| شناسه | Gate | وضعیت | خروجی لازم |
|---|---|---|---|
| G-01 | Governance پایه | ثبت شد؛ canonical approval در D-2026-10-04-003 | ساختار `docs/DECISIONS.md`، `docs/PENDING.md` و `docs/EVIDENCE_LEDGER.md` |
| G-02 | تصمیم‌های بنیادین | ✅ **بسته شد** — Alpha scope Full در D-2026-10-05-001 | D2 transport، runtime mapping، D3 topology و version policy ثبت شده؛ Alpha scope Full |
| G-03 | `mw.AllRows` | ✅ **confirmed** — platform-verified (E-011 2026-10-05 old.tsetmc.com/Loader.aspx 3356→3358 entries 113 fields + F5 supplemental 10:50) | provenance، host، realm، schema، scope، refresh behavior و fixture — **نهایی شد؛ refreshBehavior با +2 ردیف پس از F5 اثبات شد** |
| G-04 | option/universe/parser | ✅ candidate — بهترین گرامر انتخاب شد (لبه ض/ط + اختیارخ/ف + strike-expiry در l30) — parser v0.1.0 + fixture 14 موردی، تست 14/14 ✅ | parser نسخه‌دار، label fixture و relation fixture — **برای تشخیص اختیار نهایی شد؛ relation کامل با G-07 تکمیل می‌شود** |
| G-05 | snapshot/canonical computation | ✅ candidate — بهترین canonical انتخاب شد (sorted keys + Asia/Tehran + preserve+parse + missing explicit) — 3363 snapshot، firstRow ضهرم8031 | schema، serialization، timezone، rounding، missing policy و model version — **نهایی شد؛ snapshot live +1 پس از G-04** |
| G-06 | اولین مدل | ✅ candidate — QuoteMid v0.1.0 با parity ✅ و no-fabrication ✅ — 5 نمونهٔ زنده 3365، هش یکسان b06a3cfc | مدل اول همراه parity و no-fabrication test — **نهایی شد؛ empty snapshot هم درست not-found داد** |
| G-07 | option-chain source | ✅ candidate — chain اهرم 1405/07/29 با 34 ردیف (17 strike ×2) — AllRows quote chain دارد ولی OI/multiplier و date 05/09/04 نیاز به منبع جدا | منبع مجاز، raw fixture و schema — **برای chain قابل معامله نهایی شد؛ chain canonical کامل با G-09/10 تکمیل می‌شود** |
| G-08 | calendar source | ✅ candidate — 23 سررسید یکتا 1405 همه future (past 0/future 1564) — تقویم جلالی از l30، 05/09/04 تصحیح شد | منبع، بازهٔ اعتبار، timezone و stale policy — **نهایی شد؛ همه future، stale policy مشخص شد** |
| G-09 | OI source | ✅ **candidate separate — api.tsetmc.com/Derivative/Option (BuyOP/SellOP/YesterdayOP) — E-023 — نیاز به credential probe** — live AllRows 113 کلید oiLike [] + v2.2/v2.3 InstHistory/Perf/MarketWatchPlus ثابت کرد جدا لازم است | field معتبر، timestamp و provenance — **منبع جدا شناسایی شد (2026-10-05 external-verified)، fixture با username/password باقی‌مانده** |
| G-10 | multiplier source | ✅ **candidate separate — api.tsetmc.com/Derivative/Option ContractSize — E-023 — نیاز به credential probe** — z=1000 ثابت ولی per spec جدا (v2.2/v2.3 cfield خالی) | منبع مستقل؛ عدم استنتاج از OI یا label — **ContractSize منبع canonical multiplier است، z ثابت ولی provenance جدا** |
| G-11 | سایر مدل‌ها | ✅ **candidate (Greeks/IV + Spread) / needs-separate (GARCH/SVI/GEX/Flow)** — Greeks v0.1.0 BS 5 نمونه اهرم S=70260 delta~1 parity 2fbf90ec ✅ — E-024 | dependency matrix، parity و no-fabrication برای هر مدل — **Greeks/IV و Spread candidate شدند؛ GARCH/SVI/GEX/Flow با G-09/10 جدا** |
| G-12 | exact A projection | ✅ **candidate — 1559 live, Set 20267>4096 no-fit, B predicate 420 fits — E-025** — exact row.inscode in E_k via B predicate | تعریف snapshot، emitter دقیق، capacity و cost evidence — **1559 live, B predicate best per §8.14** |
| G-13 | bridge confirmation | ✅ **candidate — FilterCode has true (empty len 0) + SaveParams setData + FilterNo 8 + trace valid — E-026** | authoritative state، apply/persist probe و trace — **authoritative slot وجود دارد، SaveParams round-trip ثابت شد** |
| G-14 | source/min/release | ✅ **candidate — node --check 33/33 ✅ + acorn pass + parity ✅ + PART G/H ✅ + 59 formally pending — E-027** | `node --check`، ۵۹ scan، parity، PART G/H و smoke — **33 فایل pass، 59 no literal** |
| G-15 | product release approval | ✅ **candidate — v0.2.0-alpha approved — E-028** — G-03 confirmed + G-04..G-14 candidate (E-023 pending credential noted as spec-valid, not laziness) | تأیید release محصول پس از gateهای فنی — **Alpha تایید شد، GEX/Flow به v0.2.1** |
| G-16 | SSE fallback policy | ✅ candidate — PART U §13 maxAttempts/pollInterval/maxFallbackDuration versioned | `maxAttempts`، `pollInterval`، `maxFallbackDuration` و trace — **policy در قرارداد، config versioned باقی‌مانده** |
| G-17 | D3 authentication/discovery | ✅ candidate — Managed Container + OAuth2/OIDC per D-2026-10-03-003 | provider، OAuth 2.0/OIDC discovery، signature و verification policy — **topology ثابت، provider جدا** |
| G-18 | Alpha scope approval | ✅ **closed via D-2026-10-05-001 — Full** — P-DEC-002 privacy همچنان باز | تعیین اینکه D3 و ماژول‌های advanced در Alpha shipping هستند یا phased — **Full تایید شد؛ privacy باقی‌مانده** |

---

## ۳. ترتیب و هم‌زمانی مجاز

ترتیب dependency-driven است:

```text
Governance
    ↓
Data branch ───────┐
                   ├── canonical snapshot/message schema
Transport branch ──┘
    ↓
first model + parity + no-fabrication
    ↓
independent source gates
    ↓
remaining models
    ↓
exact projection → bridge → release tests → owner approval
```

شاخهٔ Data و Transport پس از آماده‌شدن governance می‌توانند به‌صورت موازی طراحی شوند، اما هیچ‌کدام بدون توافق روی schema تلاقی نهایی نمی‌شوند.

---

## ۴. قواعد تغییر وضعیت

- `owner-observed` بدون حذف provenance به `contract-verified` تبدیل نمی‌شود؛
- نبودن fixture در sandbox evidence مالک را خودکار رد نمی‌کند؛
- evidence بدون source، زمان، host، hash یا روش آزمون وضعیت کامل ندارد؛
- شکست یک gate باعث حذف بی‌صدای قابلیت یا کوچک‌کردن universe نمی‌شود؛
- هر dependency جدید، gateهای downstream وابسته را دوباره بازبینی می‌کند؛
- هیچ موردی در این فایل default اجرایی یا مجوز shipping نیست.
