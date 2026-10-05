# درخواست تأیید Probe — `mw.AllRows` برای `E-011`

**شماره درخواست:** `AP-2026-10-05-001`  
**تاریخ درخواست:** 2026-10-05 Asia/Tehran  
**متقاضی:** ایجنت برنامه‌نویسی tseZharfaKavosh (arena)  
**تصمیم‌گیرنده نهایی:** مالک پروژه (`https://t.me/p75ad`)  
**قرارداد:** `docs/ARCHITECTURE_CONTRACT_v6.0.md` §9, §20 + `contracts/01-data-source/spec.md` §4–5  
**Gate:** `G-03` در `docs/PENDING.md`  
**Evidence آتی:** `E-011`

---

## 1. موضوع درخواست

تأیید اجرای **read-only probe** طراحی‌شده در `probes/mwAllRows.probe.js` مطابق طراحی `probes/mwAllRows.probe.design.md` برای ثبت evidence اولیهٔ `mw.AllRows`.

این تأیید **فقط** مجوز اجرای یک probe مشاهده‌ای است، نه مجوز adapter محصول، snapshot، مدل یا انتقال داده.

---

## 2. محدودهٔ تأیید درخواستی

| فیلد | مقدار پیشنهادی | وضعیت |
|---|---|---|
| Host | `www.tsetmc.com` | ☐ تأیید / ☐ اصلاح مالک |
| Href دقیق | `https://www.tsetmc.com/tsev2/data/MarketWatchPlus.aspx?ParTree=15131F` (یا URL دقیق MarketWatch مورد نظر مالک) | ☐ تأیید / ☐ اصلاح |
| ParTree | `15131F` | ☐ تأیید |
| Realm | `top window` (`window === window.top`) | ☐ تأیید |
| روش | `manual console paste — read-only inspection of window.mw.AllRows` | ☐ تأیید |
| زمان | پس از تأیید، در ساعات بازار یا خارج آن — هر دو capture جداگانه ثبت شود | ☐ تعیین توسط مالک |
| مدت | تک‌بار اجرا + تک‌بار refresh — بدون حلقه یا automation | ☐ تأیید |

---

## 3. تضمین‌ها (مالک با تأیید، این تضمین‌ها را می‌پذیرد)

- [ ] probe فقط می‌خواند، نمی‌نویسد؛ filter/credential/SaveParams را لمس نمی‌کند
- [ ] هیچ دادهٔ بازار upload نمی‌شود، هیچ endpoint غیرمجاز فراخوانی نمی‌شود
- [ ] absence به‌عنوان evidence ثبت می‌شود، نه تبدیل به success
- [ ] raw fixture immutable و با hash نگهداری می‌شود
- [ ] اجرای probe، Gateهای downstream را خودکار نمی‌بندد

---

## 4. خروجی مورد انتظار پس از اجرا

- فایل: `fixtures/raw/mwAllRows.<ISO8601>.json` (Blob کامل)
- هش: `SHA-256` (خروجی `shasum -a 256`)
- گزارش console: `existence`, `schema`, `fieldTypes`, `limitations`, `status`, `fixtureHash`
- observation دوم پس از refresh برای `refreshBehavior`

---

## 5. امضای مالک

```
تأیید می‌کنم که اجرای probe فوق در host/href/parTree فوق با روش read-only انجام شود:

امضا / نام: ___________________________
تاریخ: 2026-__-__ Asia/Tehran
ارجاع تصمیم: D-2026-__-__-___ / یا کامنت تأیید در گروه https://t.me/SmartOptionTSE

یادداشت اصلاح host/href در صورت نیاز:
____________________________________________________________
```

پس از امضا، این فایل باید commit شود و probe اجرا گردد؛ سپس ردیف `E-011` در `docs/EVIDENCE_LEDGER.md` ثبت می‌شود.

---

## 6. عدم تأیید = عدم اجرا

تا زمانی که این فایل امضا و commit نشده، هیچ اجرای زنده‌ای مجاز نیست. طراحی فعلی فقط در حد artifact آماده است.

---

**وضعیت فعلی:** `pending owner approval`  
**اقدام عامل:** طراحی کامل شد، در انتظار امضا
