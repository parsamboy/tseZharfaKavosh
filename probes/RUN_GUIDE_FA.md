# راهنمای اجرای تست محدود `mw.AllRows` — نسخهٔ نهایی بخش G-03

**فایل تست:** `probes/mwAllRows.limited-test.v1.js`  
**هدف:** `E-011` / Gate `G-03` — نهایی شدن این بخش پس از دریافت نتایج شما  
**زمان اجرا:** کمتر از ۲ دقیقه — فقط کپی/پیست در Console  
**تضمین‌ها:** فقط‌خواندنی — هیچ تغییر فیلتر، هیچ SaveParams/FilterCode، هیچ شبکه، هیچ storage، هیچ timer

---

## گام‌به‌گام (سامانهٔ اصلی بورس تهران)

### 1) باز کردن صفحهٔ درست
- مرورگر Chrome/Firefox را در حالت عادی باز کنید (بدون افزونهٔ فیلترشکنِ مداخله‌گر).
- بروید به:
  ```
  https://www.tsetmc.com/tsev2/data/MarketWatchPlus.aspx?ParTree=15131F
  ```
- صبر کنید صفحه **کاملاً لود شود** — چرخ‌دندهٔ لودینگ دیده‌بانی تمام شود، جدول نمادها ظاهر شود. اگر ۱۰ ثانیه طول کشید صبر کنید.

### 2) باز کردن Console در realm درست
- کلید `F12` → تب `Console` را انتخاب کنید.
- در Console تایپ کنید:
  ```js
  window===window.top
  ```
  و Enter بزنید — باید `true` نشان دهد. اگر `false` بود، مطمئن شوید در پنجرهٔ اصلی هستید نه داخل iframe.

### 3) اجرای تست
- فایل `probes/mwAllRows.limited-test.v1.js` را باز کنید، **تمام محتوا** را `Ctrl+A` → `Ctrl+C` کنید.
- در Console پیست (`Ctrl+V`) و `Enter` بزنید.
- خروجی سه بخش دارد:
  1. `Host / ParTree / isTop / Existence / Schema` — خواندنی
  2. `SamplePreview` — جدول نمونهٔ ردیف اول
  3. **بلوک `SUMMARY JSON`** بین دو خط `=== COPY EVERYTHING BELOW ===` و `=== END OF COPY BLOCK ===`

### 4) ارسال نتیجه به ایجنت
- **همان بلوک JSON** را از `{` تا `}` کپی کنید و اینجا پیست کنید — نه اسکرین‌شات، نه عکس، **متن خام JSON**.
- کافی است یک بار بفرستید. اگر `length: 0` یا `status: not-found` بود، **۱۰ ثانیه صبر کنید** و یک بار دیگر paste کنید، سپس هر دو نتیجه را بفرستید.

### 5) آنچه ارسال می‌کنید شامل چیست و شامل چه نیست

**شامل:**
- `host`, `href`, `parTree`, `isTop`, `capturedAt`
- `hasWindowMw`, `hasAllRows`, `isArray`, `length`
- `keys`, `keyCount`, `idCandidate`, `rowsWithId`, `duplicateIds`
- `samplePreview` (نوع هر فیلد ردیف اول، بدون دادهٔ حساس)
- `status` و `limitations`

**شامل نیست:**
- تمام سطرهای بازار — فقط **۲ ردیف اول** به‌صورت truncated در `rawPreview` (حداکثر ۳۰۰۰ کاراکتر) برای تأیید schema
- هیچ credential، کوکی، یا دادهٔ لاگین
- هیچ تغییر در سامانه

---

## پس از دریافت شما

ایجنت با JSON شما:
- ردیف `E-011` را در `docs/EVIDENCE_LEDGER.md` ثبت می‌کند
- Gate `G-03` را از `باز` به `candidate/confirmed` (یا `unknown` اگر absence بود) می‌بندد
- فیچرهای بعدی (`G-04` option/parser) را باز می‌کند
- گزارش نهایی این بخش را به‌صورت commit ثبت و پوش را نهایی می‌کند

> اگر خطایی دیدید (مثلاً `SyntaxError` یا `hasWindowMw: false`)، همان خطا را کپی کنید — خطا هم evidence است و بخش را نهایی می‌کند، نه خراب.

---

## بررسی ایمنی قبل از اجرا (اختیاری ولی توصیه می‌شود)

در هر ویرایشگر، فایل را باز کنید و جستجو کنید — نباید این عبارات باشد:
- `FilterCode`, `SaveParams`, `localStorage`, `fetch`, `XMLHttpRequest`, `setTimeout`

فقط یک `setTimeout` وجود ندارد — `node --check` پاس شده است.

---

**زمان تقریبی:** ۹۰ ثانیه  
**نتیجه مورد انتظار:** یک بلوک JSON بین ۸۰ تا ۳۰۰ خط — همین را بفرستید و این بخش بسته می‌شود.
