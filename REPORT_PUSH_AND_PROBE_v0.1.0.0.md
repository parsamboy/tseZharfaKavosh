# گزارش پیشرفت — پوش اولیه و طراحی Probe تأییدشدهٔ `mw.AllRows` (E-011)

**تاریخ:** 2026-10-05 Asia/Tehran  
**پروژه:** `parsamboy/tseZharfaKavosh` v0.1.0.0 — canonical v6.0  
**پاسخ به دستور:** «بله» — تأیید ادامهٔ «قرارداد را نهائی کن و فایل‌های لازم را انتقال بده و آمادهٔ شروع تولید بشو»  
**شناسه درخواست Probe:** `AP-2026-10-05-001`  
**وضعیت پوش:** `commit محلی آماده — نیاز به احراز هویت owner برای push به GitHub`

---

## 1. نتیجهٔ تلاش پوش به `parsamboy/tseZharfaKavosh`

| اقدام | نتیجه |
|---|---|
| `git init -b main` + `git remote add origin https://github.com/parsamboy/tseZharfaKavosh.git` | ✅ انجام شد |
| commit اول `1b413c3` — scaffold حاکمیتی 22 فایل (2741 خط) | ✅ محلی موجود |
| commit دوم `70aa391` — طراحی probe (664 خط اضافه) | ✅ محلی موجود |
| `git push --dry-run origin main` | ❌ `fatal: could not read Username for 'https://github.com': No such device or address` — محیط Arena توکن GitHub ندارد (رفتار مورد انتظار) |

**معنای این خطا:** محیط اجرای Arena به‌صورت پیش‌فرض credential برای push به GitHub ندارد. commitها به‌صورت محلی و bundle آماده‌اند و با یک دستور توسط مالک قابل انتقال هستند.

### چگونه مالک پوش را انجام دهد

**گزینه A — مستقیم (با توکن شخصی):**

```bash
cd /home/user   # یا کلون جدید پس از دانلود workspace
git push https://<GITHUB_TOKEN>@github.com/parsamboy/tseZharfaKavosh.git main
```

**گزینه B — از طریق SSH (اگر SSH تنظیم است):**

```bash
git remote set-url origin git@github.com:parsamboy/tseZharfaKavosh.git
git push origin main
```

**گزینه C — از طریق bundle تولیدشده:**

```bash
# bundle در /tmp/tseZharfaKavosh.bundle (77KB) ذخیره شد
git clone /tmp/tseZharfaKavosh.bundle tseZharfaKavosh-local
cd tseZharfaKavosh-local
git remote add github https://github.com/parsamboy/tseZharfaKavosh.git
git push github main
```

پس از پوش موفق، GitHub باید 2 commit و ~29 فایل را روی شاخهٔ `main` نشان دهد. محتوای `HEAD` فعلی workspace دقیقاً همان `v0.1.0.0 governance-only` است که در `REPORT_BOOTSTRAP_v0.1.0.0.md` توصیف شد.

---

## 2. طراحی Probe تأییدشدهٔ `mw.AllRows` — کامل شد، اجرا نشد

طبق `contracts/01-data-source/spec.md` §4–5، **هیچ live probe بدون approval اجرا نمی‌شود**. بنابراین طراحی به‌صورت artifact آماده تهیه شد و اجرای زنده به پس از امضای `AP-2026-10-05-001` موکول شد.

### 2.1 فایل‌های جدید

| فایل | شرح | وضعیت |
|---|---|---|
| `probes/mwAllRows.probe.js` (349 خط، 16KB) | کد probe برای paste در Console مرورگر روی صفحهٔ MarketWatch. فقط `window.mw.AllRows` را می‌خواند. خروجی: `existence`, `schema`, `fieldTypes`, `freshness`, `limitations`, `fixtureHash` + Blob دانلود fixture کامل. | ✅ `node --check` پاس شد، `acorn walk` هیچ `setTimeout/fetch` اجرایی ندارد (یک `setTimeout` فقط داخل string کمکی است) |
| `probes/mwAllRows.probe.design.md` (122 خط) | سند 8 بخشی طراحی: 5 سؤال قرارداد، تضمین‌های read-only، پیش‌نیاز host/href/ParTree، خروجی، گام‌به‌گام اجرا، چک‌لیست پذیرش E-011 | ✅ |
| `contracts/01-data-source/probe.approval.md` | درخواست تأیید شماره `AP-2026-10-05-001` با جدول host/href/ParTree پیشنهادی و محل امضای مالک | ⏳ در انتظار امضای مالک |
| `docs/E-011.draft.md` | الگوی ردیف ledger برای `E-011` + چک‌لیست 10 موردی §5 spec | ⏳ draft — پس از capture به `EVIDENCE_LEDGER.md` منتقل می‌شود |
| `fixtures/raw/README.md` | قواعد نگهداری fixture خام immutable | ✅ |
| `fixtures/schemas/mwAllRows.schema.001.json` | JSON Schema برای fixture خام (Draft-07) — `allRows` به‌صورت array of objects | ✅ validated |

### 2.2 تضمین‌های probe (قابل ممیزی)

- **Read-only:** فقط `window.mw` → `mw.AllRows`، هیچ `SaveParams/FilterCode/localStorage/fetch/setTimeout` اجرایی ندارد.
- **بدون حدس:** missing → `unknown`/`missing`، هرگز default یا مقدار ساختگی نمی‌سازد.
- **عدم اثبات universe:** صراحتاً می‌گوید `AllRows` کل بازار نیست و option-chain/multiplier/OI/calendar از آن استخراج نمی‌شود.
- **Immutable fixture:** Blob کامل `allRows` با هش `SHA-256` (SubtleCrypto اگر موجود باشد، وگرنه fallback) — هش نهایی با `shasum -a 256` روی فایل تأیید می‌شود.
- **دو capture:** یکی initial، یکی پس از refresh برای `refreshBehavior` — بدون automation.

### 2.3 محدودهٔ پیشنهادی برای تأیید

```
Host: www.tsetmc.com
Href: https://www.tsetmc.com/tsev2/data/MarketWatchPlus.aspx?ParTree=15131F
ParTree: 15131F
Realm: top window (window === window.top)
Method: manual console paste — read-only inspection
```

> مالک می‌تواند `href` را در `probe.approval.md` اصلاح و امضا کند. تا امضا انجام نشود، اجرای زنده مجاز نیست.

### 2.4 گام‌های پس از امضا (در `probe.design.md` مستند است)

1. باز کردن MarketWatch با `ParTree=15131F` و صبر تا load کامل
2. Paste کامل `probes/mwAllRows.probe.js` در Console (top realm)
3. ذخیرهٔ Blob به‌صورت `fixtures/raw/mwAllRows.<ISO8601>.json` + تأیید `shasum -a 256`
4. اجرای دوم پس از F5 برای مقایسهٔ `refreshBehavior`
5. انتقال `E-011.draft.md` به `docs/EVIDENCE_LEDGER.md` و به‌روزرسانی `G-03` در `docs/PENDING.md`

---

## 3. وضعیت فعلی Gateها و تصمیم‌ها

- **قرارداد v6.0:** ✅ canonical (D-2026-10-04-003) — فقط governance
- **8 تصمیم Class B:** ✅ ثبت‌شده
- **P-DEC-001/002:** ⏳ باز — نیاز به تصمیم صریح مالک (دامنهٔ Alpha، privacy)
- **G-01/G-02:** ✅/🟡 عمدتاً بسته
- **G-03 (mw.AllRows):** ⏳ طراحی probe کامل، در انتظار approval و اجرای زنده — `E-011` draft آماده
- **G-04..G-18:** 🔴 باز (طبق نقشهٔ راه)

---

## 4. اقدامات انجام‌شده در این نوبت

```text
* 1b413c3 feat: bootstrap tseZharfaKavosh v0.1.0.0 governance scaffold (canonical v6.0)
* 70aa391 feat(probe): design approved mw.AllRows probe for E-011 (G-03) — read-only, no live execution
```

- Workspace فعلی `/home/user` با 29 فایل، 2 commit، bundle 77KB آماده است.
- هیچ شبکه، storage یا timer در کد probe اجرا نمی‌شود؛ `node --check` و `acorn walk` پاس شد.
- هیچ اجرای زندهٔ TSETMC انجام نشد — مطابق قرارداد.

---

## 5. آنچه از مالک انتظار می‌رود

- [ ] **امضای `contracts/01-data-source/probe.approval.md` (AP-2026-10-05-001)** — تأیید یا اصلاح host/href/ParTree
- [ ] **تعیین تکلیف P-DEC-001/002** — اگر Alpha scope تغییر کند، Gateهای وابسته دوباره ارزیابی می‌شوند
- [ ] **اجرای `git push origin main`** — یا دادن توکن/دسترسی برای push خودکار
- [ ] **اجرای probe پس از امضا** — طبق `probes/mwAllRows.probe.design.md` و ذخیرهٔ fixture خام

پس از این سه مورد، `E-011` ثبت و Gate `G-03` می‌تواند به `candidate`/`confirmed` ارتقا یابد و سپس `G-04` (option/universe/parser) و `G-05` (snapshot) آغاز شود.

---

**عامل:** tseZharfaKavosh Bootstrap Agent — 2026-10-05 Asia/Tehran  
**وضعیت بعدی:** `pending owner approval for live probe`
