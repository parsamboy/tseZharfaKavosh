# گزارش نهایی بخش G-03 — ثبت E-011 و نهایی شدن Host/Schema `mw.AllRows`

**تاریخ نهایی شدن:** 2026-10-05 Asia/Tehran — 10:44:56 Tehran (capture v2)  
**پروژه:** `tseZharfaKavosh v0.1.0.0` — canonical v6.0  
**Gate:** `G-03` در `docs/PENDING.md` — **از `باز` به `candidate` تبدیل شد**  
**Evidence:** `E-011` در `docs/EVIDENCE_LEDGER.md` — سطح `platform-verified`  
**Approval:** `AP-2026-10-05-001` — مالک LIMITED-TEST v1 (10:43) و v2 (10:44) را اجرا و JSON را بازگرداند  
**Fixture:** `fixtures/raw/mwAllRows.2026-10-05T07-14-56.067Z.json` — SHA-256 `ea5fefbede1fb036524d38e6fd7e92054f736ba7f6e61a0260eebeb88ef8cef3` (5297 bytes SUMMARY)

---

## 1. یافتهٔ کلیدی — اصلاح فرض معماری

| فرض اولیه (§9) | یافتهٔ زندهٔ مالک |
|---|---|
| `mw.AllRows` آرایهٔ همهٔ ردیف‌ها | **`mw.AllRows` یک object-map است با کلید `inscode` (رشتهٔ 17 رقمی) و مقدار شیء ردیف** |
| Host پیشنهادی `www.tsetmc.com` با `MarketWatchPlus.aspx` | **Host واقعی `old.tsetmc.com` با `Loader.aspx?ParTree=15131F#`** |
| — | `isTop: true` — realm صحیح `top window` |

این یافته دقیقاً هدف Gate G-03 بود — حالا adapter باید map را بخواند، نه array.

---

## 2. خلاصهٔ دو capture که E-011 را ساختند

### Capture v1 — LIMITED-TEST v1 (2026-10-05 10:43:18 Tehran)
```
Host: old.tsetmc.com
Href: https://old.tsetmc.com/Loader.aspx?ParTree=15131F#
hasWindowMw: true, hasAllRows: true, allRowsType: object, isArray: false
mapKeysSample (30 نمایش داده‌شده): 62444611500832644, 7693632359685850, ...
status: non-array — اولین هشدار که فرض array نادرست است
```

### Capture v2 — LIMITED-TEST v2 (2026-10-05 10:44:56 Tehran) — **مرجع نهایی E-011**
```
Host: old.tsetmc.com (همان)
ParTree: 15131F, isTop: true, userAgent: Chrome/154
Existence: hasWindowMw true, hasAllRows true, allRowsType object, isArray false, length 3356, keyCount 3356
mapInfo: object-map, 3356 entries, sample keys همان 5 عدد بالا, valueType object
Schema: 113 keys per row, idCandidate inscode (unique), rowType object
  rowsWithId 3356, duplicateIds 0 — همهٔ ردیف‌ها id یکتا دارند، missing=0 برای 113 کلید مشاهده‌شده
Keys کامل (113):
  _eps _heven _pc _pcc _pcp _pd1..5 _pe _pf _pl _plc _plp _pmax _pmin _po1..5 _preview _qd1..5 _qo1..5 _render _tno _tval _tvol _zd1..5 _zo1..5
  buyop bvol cfield0..2 cgrvalcot cs eps flow heven iid inscode l18 l30 pc pcc pcp pd1..5 pe pf pl plc plp pmax pmin po1..5 predtran preview py qd1..5 qo1..5 render tmax tmin tno tval tvol visitcount yval z zd1..5 zo1..5
Status: candidate-object-map
Freshness: observedAt 2026-10-05T07:14:56.067Z, generation null (AllRows timestamp ندارد — per §9)
Limitations: map not array, host old.tsetmc.com, no universe completeness, option-chain not derivable, _* duplicate semantics unknown, refresh after F5 pending
```

> **توجه:** v1 عدد 30 را فقط به دلیل truncation نمایش داد؛ v2 عدد کامل 3356 را با `Object.keys` اثبات کرد.

---

## 3. چک‌لیست §5 spec برای E-011 — وضعیت نهایی

| شرط | وضعیت |
|---|---|
| owner approval/reference | ✅ `AP-2026-10-05-001` — مالک هر دو v1/v2 را اجرا کرد |
| exact host, page, realm, parTree | ✅ `old.tsetmc.com`, `Loader.aspx?ParTree=15131F#`, `top`, `15131F` |
| raw immutable fixture | ✅ `fixtures/raw/mwAllRows.2026-10-05T07-14-56.067Z.json` + دو SUMMARY JSON در ledger |
| capture timestamp و timezone | ✅ هر دو capture با UTC+Tehran و epochMs |
| probe method و environment | ✅ `manual console paste — read-only` + `userAgent` + `isTop` |
| schema و completeness statement | ✅ 113 keys, 3356 rows, 0 duplicates, missing=0, fieldTypes |
| refresh/lifecycle observation | 🟡 initial ✓ — after-refresh F5 optional supplemental (مانع candidate نیست) |
| fixture hash | ✅ `ea5fef...8cef3` SHA-256 روی SUMMARY fixture |
| explicit limitations و unknown fields | ✅ 6 مورد limitation صریح |
| link از ledger و PENDING | ✅ E-011 در `EVIDENCE_LEDGER.md`, G-03 در `PENDING.md` به‌روزرسانی شد |

**نتیجه:** G-03 برای این بخش **نهایی (candidate) شد** — refresh تکمیلی می‌تواند بعداً به‌صورت E-011 supplemental اضافه شود بدون باز کردن دوباره gate اصلی.

---

## 4. پرونده‌های به‌روزرسانی‌شده در این نهایی‌سازی

| فایل | تغییر |
|---|---|
| `fixtures/raw/mwAllRows.2026-10-05T07-14-56.067Z.json` | **جدید** — fixture SUMMARY با host/schema/status/limitations و هش SHA-256 |
| `docs/EVIDENCE_LEDGER.md` | **ویرایش** — افزودن ردیف کامل `E-011` (platform-verified, candidate, تمام فیلدهای §2) |
| `docs/PENDING.md` | **ویرایش** — سطر `G-03` از `باز` به `✅ candidate — شواهد platform-verified ثبت شد` |
| `probes/mwAllRows.limited-test.v1.js` | قبلاً commit شده — شاهد v1 |
| `probes/mwAllRows.limited-test.v2.js` | قبلاً commit شده — شاهد v2 که map را درست هندل کرد |

---

## 5. پیامد معماری برای گام‌های بعدی

- **Adapter آینده** باید `Object.keys/values` را بخواند، نه `length` آرایه — §9 و `contracts/01-data-source/spec.md` باید با host جدید `old.tsetmc.com` به‌روزرسانی تفسیری شود.
- **Universe:** 3356 ردیف مشاهده شد، اما نباید به‌عنوان کل بازار معرفی شود تا completeness proof جداگانه (G-04) انجام شود — per §10 `U_snapshot = تمام رکوردهای واقعاً موجود در snapshot معتبر`.
- **Duplicate fields:** 113 کلید شامل جفت‌های `pd1` و `_pd1` و `tval` و `_tval` — semantics تمایز `_` ناشناخته است و در G-04 (parser) باید تعیین شود.
- **Downstream:** G-03 candidate است، بنابراین **G-04 (option/universe/parser) و G-05 (snapshot/canonical)** اکنون مجاز به آغاز طراحی هستند — per ترتیب dependency-driven §20.

---

## 6. اقدام بعدی پیشنهادی (اختیاری تکمیلی)

برای تکمیل `refreshBehavior` به‌صورت supplemental:
- صفحه را `F5` کنید، 10 ثانیه صبر کنید، دوباره `probes/mwAllRows.limited-test.v2.js` را paste کنید و JSON را بفرستید.
- آن capture به‌عنوان `E-011 supplemental` به ledger اضافه می‌شود و G-03 از `candidate` به `confirmed` ارتقا می‌یابد.

این مرحله **مانع ادامهٔ G-04 نیست** — می‌توانید هم‌زمان با آن ادامه دهید.

---

**وضعیت بخش:** ✅ **نهایی شد** — منتظر دستور برای آغاز `G-04` یا `refresh supplemental`  
**عامل:** tseZharfaKavosh Agent — 2026-10-05 10:47 Asia/Tehran
