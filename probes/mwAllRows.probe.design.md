# طراحی Probe تأییدشدهٔ `mw.AllRows` — هدف `E-011` / Gate `G-03`

**پروژه:** `tseZharfaKavosh v0.1.0.0`  
**قرارداد مرجع:** `docs/ARCHITECTURE_CONTRACT_v6.0.md` §9 + `contracts/01-data-source/spec.md` §4–5  
**وضعیت طراحی:** `approved for preparation` — اجرا فقط پس از تأیید صریح مالک برای host/page/realm مشخص  
**شناسهٔ شواهد آتی:** `E-011`  
**Gate وابسته:** `G-03` در `docs/PENDING.md`  
**نسخهٔ probe:** `0.1.0.0-probe-001`  
**مجوز:** `Smart-FFA-1.1`

---

## 1. هدف — 5 سؤال قرارداد

probe دقیقاً به 5 سؤال `contracts/01-data-source/spec.md` §4 پاسخ می‌دهد و هیچ چیز اضافه‌ای اثبات نمی‌کند:

1. آیا شیء `mw.AllRows` در realm/page مشخص وجود دارد؟
2. کالکشن ردیف‌ها و schema فیلدها چیست (keys، typeها، id candidate)؟
3. آیا کالکشن نسبت به scope ادعایی complete است (یا فقط یک snapshot view)؟
4. رفتار refresh و lifecycle چگونه است (پس از reload/navigation چه می‌شود)؟
5. کدام مقادیر missing/unknown/stale/malformed هستند (بدون جعل default)؟

> **Non-claim:** این probe ثابت نمی‌کند که `AllRows` کل universe بازار است، ثابت نمی‌کند option-chain/multiplier/OI/calendar از آن استخراج می‌شود، و absence در یک capture را به‌معنای عدم وجود جهانی نمی‌گیرد (§2 spec).

---

## 2. تضمین‌های read-only و بی‌اثر

- فقط `window.mw` و `window.mw.AllRows` را **می‌خواند**، هرگز نمی‌نویسد.
- هیچ تغییری در filterها (`FilterCode`, `SaveParams`, `Settings.Filters`) نمی‌دهد.
- هیچ credential ارسال نمی‌کند، هیچ endpoint فراخوانی نمی‌کند، هیچ upload دادهٔ بازار انجام نمی‌دهد.
- هیچ DOM mutation، timer، network، storage یا state بین فراخوانی‌ها ندارد.
- absence یا failure به‌عنوان `evidence` با وضعیت `unknown` ثبت می‌شود، نه تبدیل به ادعای مثبت.

---

## 3. پیش‌نیاز اجرا (باید در approval مالک قید شود)

| فیلد | مقدار پیشنهادی (باید توسط مالک نهایی شود) |
|---|---|
| `host` | `www.tsetmc.com` |
| `href` | `https://www.tsetmc.com/tsev2/data/MarketWatchPlus.aspx` یا URL دقیق MarketWatch با `ParTree=15131F` |
| `parTree` | `15131F` |
| `realm` | `top window` (نه iframe) — بررسی شود `window === window.top` |
| `capturedAt` | زمان اجرا با `Asia/Tehran` + UTC |
| `method` | `manual console paste — read-only inspection` |
| `schemaVersion` | `0.1.0.0-mwAllRows-schema-001` |
| `sourceId` | `mw.AllRows@TSETMC` |

> تا approval مالک با host/href/parTree دقیق ثبت نشود، اجرای زنده مجاز نیست.

---

## 4. خروجی probe

### 4.1 بخش‌های خروجی (`result` JSON)
- `meta` — evidenceId, sourceId, claim, host, href, parTree, capturedAt, method, schemaVersion, provenance
- `existence` — hasWindowMw, hasAllRows, allRowsType, allRowsIsArray, allRowsLength
- `schema` — keys, keyCount, idFieldCandidate, sample (3 ردیف اول با type/preview), fieldTypes (آمار هر فیلد)، completeness (totalRows, rowsWithIdField, duplicateIdCount)
- `freshness` — observedAt + توضیح عدم وجود generation در AllRows (§9)
- `refreshBehavior` — initialCapture + راهنمای capture دوم پس از refresh
- `limitations` — محدودیت‌ها و unknownها صریح
- `status` — `candidate` / `unknown` / `rejected` (initial)
- `fixtureHash` — SHA-256 preview (truncated header)؛ هش کامل باید روی فایل Blob محاسبه شود
- `rawFixture` — برای preservation کامل: `_fixtureMeta` + `allRowsLength` + `allRowsSampleRaw` (5 ردیف) + summary — و در صورت امکان Blob دانلود کامل `allRows`

### 4.2 فایل fixture خام (immutable)
- نام پیشنهادی: `fixtures/raw/mwAllRows.<ISO8601>.json`
- محتوا: `{ _fixtureMeta, allRows: <full array> }` — بدون truncation برای preservation
- هش: `shasum -a 256 fixtures/raw/mwAllRows.*.json` (خارج از مرورگر، قابل بازتولید)
- نگهداری: immutable، هرگز overwrite نشود؛ نسخهٔ جدید با timestamp جدید.

---

## 5. روش اجرا گام‌به‌گام (پس از approval)

1. مرورگر را در حالت عادی (بدون افزونهٔ مداخله‌گر) روی URL تأییدشده باز کنید، صبر کنید MarketWatch کاملاً load شود (loading indicator تمام شود).
2. DevTools → Console را در `top` realm باز کنید. اجرای `window === window.top` را چک کنید — باید `true` باشد.
3. تمام محتوای `probes/mwAllRows.probe.js` را paste و Enter کنید.
4. خروجی console را بررسی کنید: `existence`, `schema`, `limitations`, `fixtureHash`.
5. اگر Blob link ظاهر شد: روی لینک کلیک کنید یا دستور پیشنهادی `a.click()` را اجرا کنید تا فایل JSON کامل دانلود شود. آن را به `fixtures/raw/` منتقل کنید (immutable).
6. مقدار `fixtureHash` کامل را با `shasum -a 256` تأیید کنید و در ledger ثبت کنید.
7. **برای refreshBehavior:** صفحه را refresh کنید (F5)، صبر کنید load کامل شود، دوباره probe را اجرا کنید و دو خروجی `allRowsLength/keys/sample` را مقایسه کنید — آیا length تغییر کرد؟ آیا keys ثابت ماند؟ این مقایسه را به‌عنوان `refreshBehavior` در ledger ثبت کنید.
8. probe سوم: به یک صفحهٔ دیگر TSETMC با ParTree متفاوت بروید و تکرار کنید تا scope مشخص شود — این optional است و فقط با approval جداگانه انجام شود.

> هر اجرای ناموفق یا partial نیز evidence است — آن را با وضعیت واقعی (`unknown`/`rejected`) ثبت کنید، هرگز به `candidate` تبدیل نکنید.

---

## 6. معیار پذیرش برای `E-011` (چک‌لیست §5 spec)

- [ ] owner approval/reference برای probe — **در انتظار امضای مالک**
- [ ] host, page, realm, parTree دقیق
- [ ] raw immutable fixture + timestamp + timezone
- [ ] probe method و environment (userAgent, realm)
- [ ] schema و completeness statement (keys, types, duplicate, missing stats)
- [ ] refresh/lifecycle observation (capture دوم)
- [ ] fixture hash (SHA-256 روی فایل کامل)
- [ ] محدودیت‌ها و فیلدهای unknown صریح
- [ ] لینک از `docs/EVIDENCE_LEDGER.md` و `docs/PENDING.md` Gate G-03

---

## 7. وابستگی پایین‌دست

هیچ snapshot، مدل، projection، bridge یا runtime نباید به `mw.AllRows` وابسته شود تا وضعیت آن در ledger به `candidate`/`confirmed` با scope مشخص برسد و Gate G-03 شرایط §5 را پاس کند.

---

## 8. فایل‌های مرتبط

- اجرا: `probes/mwAllRows.probe.js`
- این طراحی: `probes/mwAllRows.probe.design.md`
- قرارداد: `contracts/01-data-source/spec.md`
- تعریف §9: `docs/ARCHITECTURE_CONTRACT_v6.0.md`
- ثبت نهایی: `docs/EVIDENCE_LEDGER.md` → ردیف `E-011`
- خام: `fixtures/raw/mwAllRows.*.json` (پس از اجرا)

---

**تهیه‌کننده:** ایجنت برنامه‌نویسی tseZharfaKavosh — شاخهٔ arena  
**تاریخ طراحی:** 2026-10-05 Asia/Tehran
