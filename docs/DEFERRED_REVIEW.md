# موارد deferred — برای بررسی مجدد (از یاد نرود)

**تاریخ ایجاد:** 2026-10-05 — per دستور مالک: «اینها از یاد نبر تا بعد مجدد بررسی و در صورت امکان قابل بهره‌برداری باشند»
**مرجع:** E-023, E-023-supplemental, E-024..E-029, ROADMAP v0.2.1 suspended (687eefc)

## فهرست موارد تاییدنشده که باید دوباره بررسی شوند

| # | Gate | مورد | وضع فعلی | چرا deferred | شرط بهره‌برداری |
|---|---|---|---|---|---|
| 1 | G-09 | OI (BuyOP/SellOP/YesterdayOP) منبع جدا | candidate separate / pending-credential suspended | authenticated `api.tsetmc.com/Derivative/Option` تنها منبع (11 endpoint public exhaustive hasOI false, CORS blocked) — owner: «TSETMC_USERNAME/PASSWORD ممکن نیست — مسکوت» | هر وقت credential ممکن شد یا public alternative جدیدی پیدا شد → `node probes/g09.oi-source.limited-test.v3.node.js` → E-023a |
| 2 | G-10 | multiplier (ContractSize) مستقل | candidate separate / suspended | `z=1000` per spec نباید inferred شود — از همان api می‌آید | همراه G-09 فعال می‌شود → E-023b |
| 3 | G-11b | GEX/DEX | deferred to v0.3.0 | نیاز مستقیم به G-09+G-10+chain | بعد از #1 و #2 |
| 4 | G-11c | Flow | deferred to v0.3.0 | نیاز به OI | بعد از #1 |
| 5 | G-11d | SVI / VolSurface کامل | **v0.2.1-alpha: partial بدون OI (1-A) — upgrade به full با OI در یاد** | partial با chain 1559+IV (Greeks) بدون وزن OI در v0.2.1-alpha، سپس upgrade به full وزن‌دار OI به‌محض #1 | #1 برای upgrade به full (جزئی اکنون) |
| 6 | G-11e | GARCH | ✅ candidate شد (E-029) | قبلاً needs-history بود — با ClosingPriceAll public حل شد 2026-10-05 | نگه‌داری شود — نیاز به review ندارد ولی در همین فهرست برای کامل بودن |

## تعهد عدم فراموشی

- این فایل + `docs/PENDING.md` (G-09/G-10/G-11 needs-separate) + `EVIDENCE_LEDGER.md` E-023..E-029 + `docs/ROADMAP_v0.2.1.md` مرجع واحد هستند — هیچ‌کدام حذف بی‌صدا نمی‌شوند.
- هر release بعدی (v0.2.1, v0.3.0) باید این فهرست را مرور و در صورت امکان (credential جدید یا endpoint public جدید) تست مجدد (`v4`/`v3` probe) کند.
- هر probe جدید باید مانند قبل بهترین گزینه را انتخاب کند (public hasOI false → authenticated تک‌منبع).
- تا بررسی مجدد، هیچ‌کدام با `z` یا `tvol` fabricate نمی‌شود.

## اقدام بعدی

- v0.2.1: GARCH ✅ و SVI partial بدون OI ادامه می‌یابد — GEX/Flow مسکوت می‌ماند.
- v0.3.0: به محض امکان credential یا کشف endpoint public جدید، #1 و #2 دوباره با `v3 Node` تست و سپس #3 و #4 فعال می‌شوند.

**وضعیت:** باز — برای review در هر planning بعدی
