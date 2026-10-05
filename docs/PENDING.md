# فهرست موارد باز Zharfa — قرارداد canonical v6.0

**وضعیت:** سند کنترل تصمیم و validation؛ قرارداد v6.0 canonical شده، اما این فایل gateهای باز را نگه می‌دارد و مجوز تولید کد، shipping یا production-ready بودن نیست.

مواردی که در `docs/DECISIONS.md` انتخاب شده‌اند از این فهرست به‌عنوان تصمیم باز حذف می‌شوند. این فایل فقط تصمیم‌های هنوز تأییدنشده و gateهای فنی باز را نگه می‌دارد.

---

## ۱. تصمیم باز مالک

### P-DEC-001 — دامنهٔ دقیق Alpha

وضعیت: **نیازمند تأیید صریح مالک**

باید روشن شود Alpha از نظر قابلیت محصول دقیقاً چه چیزهایی را شامل می‌کند و چه چیزهایی صرفاً در successor باقی می‌مانند.

فهرست پیشنهادیِ زیر هنوز مصوبه نیست:

- D1؛
- D2؛
- Greeks؛
- IV؛
- GARCH؛
- Spread؛
- بخشی از SVI؛
- عدم shipping اولیهٔ D3، GEX/DEX، Flow، Surface کامل و bridge خودکار.

این فهرست فقط زمانی قابل ثبت است که مالک صریحاً آن را به‌عنوان **phased release scope** بپذیرد. حذف این قابلیت‌ها از Alpha نباید به‌عنوان حل محدودیت فنی یا کاهش دائمی دامنهٔ محصول معرفی شود. تا آن زمان، no-simplification rule برقرار است.

### P-DEC-002 — privacy و data-transfer policy

وضعیت: **نیازمند تصمیم Class B مالک**

این policy باید مشخص کند دادهٔ بازار، profile، snapshot، result و متن filter در هر deployment چه زمانی از دستگاه خارج می‌شوند.

گزینه‌های مفهومی:

- D1 بدون upload به service پروژه؛ D2 local-first؛ D3 فقط با opt-in صریح؛
- sync ابری پیش‌فرض برای بخشی از داده؛
- local-only سخت‌گیرانه و بدون انتقال به D3.

متن فعلی Alpha فقط جهت موقت `no-server-upload by design` برای D1 و رضایت صریح برای cloud را ثبت می‌کند؛ آن را privacy مطلق یا policy نهایی تلقی نکنید.

---

## ۲. Gateهای فنی و مستندسازی

این موارد گزینهٔ انتخابی مالک نیستند؛ validation/design gate هستند.

| شناسه | Gate | وضعیت | خروجی لازم |
|---|---|---|---|
| G-01 | Governance پایه | ثبت شد؛ canonical approval در D-2026-10-04-003 | ساختار `docs/DECISIONS.md`، `docs/PENDING.md` و `docs/EVIDENCE_LEDGER.md` |
| G-02 | تصمیم‌های بنیادین | عمدتاً بسته | D2 transport، runtime mapping، D3 topology و version policy ثبت شده؛ Alpha scope باز |
| G-03 | `mw.AllRows` | ✅ **confirmed** — platform-verified (E-011 2026-10-05 old.tsetmc.com/Loader.aspx 3356→3358 entries 113 fields + F5 supplemental 10:50) | provenance، host، realm، schema، scope، refresh behavior و fixture — **نهایی شد؛ refreshBehavior با +2 ردیف پس از F5 اثبات شد** |
| G-04 | option/universe/parser | ✅ candidate — بهترین گرامر انتخاب شد (لبه ض/ط + اختیارخ/ف + strike-expiry در l30) — parser v0.1.0 + fixture 14 موردی، تست 14/14 ✅ | parser نسخه‌دار، label fixture و relation fixture — **برای تشخیص اختیار نهایی شد؛ relation کامل با G-07 تکمیل می‌شود** |
| G-05 | snapshot/canonical computation | باز | schema، serialization، timezone، rounding، missing policy و model version |
| G-06 | اولین مدل | باز | مدل اول همراه parity و no-fabrication test |
| G-07 | option-chain source | باز | منبع مجاز، raw fixture و schema |
| G-08 | calendar source | باز | منبع، بازهٔ اعتبار، timezone و stale policy |
| G-09 | OI source | باز | field معتبر، timestamp و provenance |
| G-10 | multiplier source | باز | منبع مستقل؛ عدم استنتاج از OI یا label |
| G-11 | سایر مدل‌ها | باز | dependency matrix، parity و no-fabrication برای هر مدل |
| G-12 | exact A projection | باز | تعریف snapshot، emitter دقیق، capacity و cost evidence |
| G-13 | bridge confirmation | باز | authoritative state، apply/persist probe و trace |
| G-14 | source/min/release | باز | `node --check`، ۵۹ scan، parity، PART G/H و smoke |
| G-15 | product release approval | باز؛ canonical contract جداگانه تأیید شده | تأیید release محصول پس از gateهای فنی |
| G-16 | SSE fallback policy | باز | `maxAttempts`، `pollInterval`، `maxFallbackDuration` و trace |
| G-17 | D3 authentication/discovery | باز | provider، OAuth 2.0/OIDC discovery، signature و verification policy |
| G-18 | Alpha scope approval | باز | تعیین اینکه D3 و ماژول‌های advanced در Alpha shipping هستند یا phased |

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
