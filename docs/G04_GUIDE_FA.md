# راهنمای Gate G-04 — option / universe / parser

**Gate:** `G-04` در `docs/PENDING.md` — **باز** (پس از G-03 که اکنون ✅ confirmed شد، G-04 دروازهٔ بعدی شاخهٔ Data است)  
**وابسته به:** `E-011` (G-03) — AllRows با 113 فیلد و 3358 ردیف ثابت کرد که دادهٔ خام داریم، ولی هنوز نمی‌دانیم کدام ردیف «اختیار معامله» است  
**قرارداد:** `docs/ARCHITECTURE_CONTRACT_v6.0.md` §10 (Universe و relation option) + CL-014 در `V5_CLEANUP.md` + §20 ترتیب Gateها  
**خروجی لازم (طبق PENDING):** `parser نسخه‌دار، label fixture و relation fixture`

---

## 1) G-04 دقیقاً چه مشکلی را حل می‌کند؟

AllRows به شما **3358 شیء** با فیلدهای `l18`, `l30`, `inscode`, `iid` و 109 فیلد دیگر داد — اما **هیچ‌کدام برچسب «این اختیار است» ندارند**. 
در TSETMC، اختیار معامله فقط از **متن برچسب** (`l18`/`l30` مثلاً `"ضخود8045-...6000-1404..."` یا `"اختيار خ ..."` ) و گاهی از **ارتباط با نماد پایه** قابل تشخیص است.

بدون G-04:
- نمی‌توانید بفهمید Universe واقعی اختیارها چقدر است (نباید کل 3358 را اختیار فرض کنید — §10: `U_snapshot = تمام رکوردهای واقعاً موجود` نه کل بازار)
- نمی‌توانید `GEX/DEX`, `SVI`, `Flow` را بسازید — همه به `strike`, `expiry`, `underlying` نیاز دارند
- هر حدس غلط = **fabrication** و نقض قرارداد — رکورد `unknown` نباید حذف شود و نباید `confirmed` فرض شود

**هدف G-04:** یک **parser نسخه‌دار و قابل آزمون** که از روی یک ردیف خام (فقط `l18`/`l30`/`inscode`) یکی از 5 وضعیت زیر را برمی‌گرداند:

| وضعیت | معنا | آیا در محاسبات می‌آید؟ |
|---|---|---|
| `unknown` | برچسب با هیچ گرامری match نشد و ارتباط پایه هم ندارد — دست نزن | ❌ نه — در Universe می‌ماند ولی eligible نیست |
| `candidate` | گرامر اولیه match کرد ولی cross-check (مثلاً `baseInsCodes` یا تقویم) هنوز نداریم | ❌ نه — فقط برای fixture |
| `reported` | یک منبع (مثلاً خودِ برچسب) ادعا می‌کند اختیار است ولی تأیید دوم نداریم | ❌ نه |
| `confirmed` | برچسب + ارتباط با underlying + (در آینده) chain/calendar — هر دو تأیید شد | ✅ بله — فقط این eligible است |
| `rejected` | گرامر صریحاً گفت «این سهم/صندوق است، نه اختیار» — مثلاً `l18 = "فولاد"` | ❌ نه |

> **قاعدهٔ طلایی:** `unknown` از Universe حذف نمی‌شود، اما `confirmed` هم فرض نمی‌شود — در UI باید `unknown/insufficient-data` نشان دهد، نه صفر.

---

## 2) چرا این سه خروجی لازم است؟

| خروجی | چیست | چرا بدون آن G-04 بسته نمی‌شود |
|---|---|---|
| **1. Parser نسخه‌دار** | یک تابع pure: `(row: RawRow) => {status, underlying?, strike?, expiry?, rawMatch?}` با نسخهٔ سمانتیک مثل `option-parser@0.1.0` — بدون شبکه، بدون DOM | تا نسخه نداشته باشد، نمی‌توان parity بین D1/D2/D3 یا no-fabrication test نوشت |
| **2. label fixture** | فایل JSON شامل **نمونه‌های واقعی** (anonymized) از `l18`/`l30` اختیار و غیراختیار + خروجی مورد انتظار parser — مثلاً 30 اختیار واقعی + 30 سهم | بدون fixture اصیل، نمی‌توان ثابت کرد parser روی دادهٔ واقعی کار می‌کند نه دادهٔ ساختگی |
| **3. relation fixture** | فایل JSON شامل نگاشت `option inscode → underlying inscode` (یا `iid`→`underlying iid`) با provenance (از کجا آمد: خودِ برچسب؟ `baseInsCodes`؟) | بدون این، نمی‌دانیم `ضخود8045` به `خودرو` وصل است یا نه — CL-014 |

**هش هر fixture** (SHA-256) در `EVIDENCE_LEDGER` ثبت و immutable نگهداری می‌شود — مثل همان کاری که برای `mw.AllRows` کردیم.

---

## 3) کارهایی که پاکسازی V5 باقی گذاشته (CL-014 و دوستان)

- **CL-014:** برچسب اختیار گاهی **دو یا سه عدد** دارد (مثلاً قیمت اعمال 6000 + تاریخ 14041120 + حجم). گرامر باید صریح بگوید کدام عدد strike است، کدام تاریخ، و اگر دو عدد بود چه؟
- **CL-003 / G-07:** chain اختیار از AllRows کامل نیست — باید منبع مجزا باشد (G-04 فقط **تشخیص** اختیار است، نه chain کامل)
- **CL-005:** scope دقیق AllRows: آیا 3358 کل بازار است یا فقط دیده‌بانی؟ Universe تا fixture کامل نشود نباید «کل بازار» اعلام شود (§10)

---

## 4) ترتیب — G-04 قبل از G-05 است، ولی با G-07..G-10 موازی می‌تواند برود

```
G-03 (AllRows) ✅ confirmed (شما با 3356→3358 ثابت کردید)
   ↓
G-04 (option/parser) ← **اینجاییم — باید بعد از G-03 و قبل از snapshot باشد**
   ↓
G-05 (snapshot/canonical — schema, timezone Asia/Tehran, rounding, missing policy)
   ↓
G-06 (اولین مدل + parity + no-fabrication)
   ↓
G-07..G-10 (chain / calendar / OI / multiplier — می‌توانند بعد از G-05 موازی شوند)
```

G-04 بدون G-03 ممکن نیست (دادهٔ خام ندارید)، ولی G-04 می‌تواند هم‌زمان با طراحی `snapshot` اولیه شروع شود — فقط **قبل از اینکه مدل‌ها اختیار را مصرف کنند** باید بسته شود.

---

## 5) نتیجهٔ هر Gate — جدول کامل 18 Gate و خروجی‌شان

| Gate | نام | خروجی نهایی چیست | اگر پاس نشود چه می‌شود |
|---|---|---|---|
| **G-01** | Governance پایه | ✅ تمام شد — ساختار `DECISIONS`/`PENDING`/`EVIDENCE` | هیچ قراردادی canonical نمی‌شد |
| **G-02** | تصمیم‌های بنیادین | 🟡 عمدتاً بسته — D2 transport, runtime, D3 topology ثبت شد؛ Alpha scope هنوز باز | بعداً P-DEC-001/002 جدا تصویب می‌شود |
| **G-03** | `mw.AllRows` | ✅ **confirmed** — 3356→3358 object-map, 113 فیلد, host old.tsetmc.com | بدون آن هیچ adapter/snapshot معتبر نیست |
| **G-04** | **option/universe/parser** | **parser نسخه‌دار + label fixture + relation fixture + وضعیت‌های 5گانه** | نمی‌دانید کدام ردیف اختیار است — GEX/SVI/Flow فعال نمی‌شود |
| **G-05** | snapshot / canonical computation | schema نسخه‌دار, canonical JSON, timezone Asia/Tehran, rounding, missing semantics | هیچ snapshot بی‌نقصی ندارید — همهٔ مدل‌ها روی شن روان‌اند |
| **G-06** | اولین مدل + parity + no-fabrication | یک مدل (مثلاً Greeks) روی هر 3 executor + تست parity + تست با دادهٔ ناقص (نباید بسازد) | parity صوری است — D1/D2/D3 نتایج متفاوت می‌دهند |
| **G-07** | option-chain source | منبع مجاز chain, raw fixture, schema | chain ناقص → Surface/SVI بی‌اعتبار |
| **G-08** | calendar source | منبع تقویم، بازهٔ اعتبار، stale policy | expiry غلط → IV/SVI غلط |
| **G-09** | OI source | فیلد OI معتبر + timestamp + provenance | OI حدسی → GEX/DEX غلط |
| **G-10** | multiplier source | منبع مستقل ضریب قرارداد (نه حدس از OI/label) | multiplier غلط = ارزش اختیار کاملاً غلط |
| **G-11** | سایر مدل‌ها | dependency matrix + parity/no-fabrication برای هر مدل باقی‌مانده | فقط اولین مدل دارید |
| **G-12** | exact A projection | تعریف `E_k` + emitter دقیق + ظرفیت Artifact A | نمی‌توانید verdict B را به فیلتر A بریزید |
| **G-13** | bridge confirmation | authoritative state + apply/persist probe + trace | bridge بی‌تأیید = کاربر فکر می‌کند فیلتر اعمال شد ولی نشد |
| **G-14** | source/min/release tests | `node --check`, اسکن 59 trigger, parity, PART G/H, smoke | release باگِ source/min دارد |
| **G-15** | product release approval | تأیید مالک پس از همهٔ Gateها | shipping بدون تأیید ممنوع |
| **G-16** | SSE fallback policy | `maxAttempts, pollInterval, maxFallbackDuration` | در D2 قطعی SSE بی‌پاسخ می‌ماند |
| **G-17** | D3 auth/discovery | provider, OAuth2/OIDC, signature | D3 بدون احراز هویت ناامن است |
| **G-18** | Alpha scope approval | مالک می‌گوید D3 و ماژول‌های advanced در Alpha هستند یا phased | Scope شناور می‌ماند |

**برای این پروژه، نتیجهٔ نهایی هر Gate = یک یا چند فایل immutable + یک ردیف EVIDENCE + یک تست parity/no-fabrication.** هیچ‌کدام با «حدس» بسته نمی‌شود.

---

## 6) پلان پیشنهادی برای G-04 (نیاز به تأیید شما)

1. **Fixture جمع‌آوری (read-only):** از همین AllRows 3358 ردیفی، 40 نمونه `l18`/`l30` (20 اختیار مشکوک + 20 سهم واضح) را با همین روش LIMITED-TEST استخراج کنیم — بدون حدس، فقط raw.
2. **طراحی grammar v0.1:** بر اساس نمونه‌های واقعی بورس تهران (الگوی «ض» + نماد پایه + عدد اعمال + تاریخ جلالی).
3. **Parser pure:** تابع JS `parseOptionLabel(row) → {status, ...}` — نسخه‌دار، بدون شبکه.
4. **No-fabrication test:** fixture ناقص (برچسب بی‌عدد) باید `unknown` برگرداند، نه strike ساختگی.

آیا **طراحی G-04 با همین پلانِ 4 مرحله‌ای** را تأیید می‌کنید تا fixture اولیه و draft parser را بسازم؟ (اجرای استخراج fixture هم read-only و مثل همین v2 خواهد بود)
