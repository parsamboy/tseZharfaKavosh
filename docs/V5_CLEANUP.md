# v5.0 Cleanup Register — canonical v6.0 successor

**وضعیت:** register اصلاحات و تعارض‌های شناخته‌شده؛ قرارداد canonical v5.0 را تغییر نمی‌دهد و هیچ اصلاحی تا تصویب successor به‌صورت silent اعمال نمی‌شود.

این فایل مواردی را نگه می‌دارد که هنگام طراحی successor باید تعیین تکلیف شوند. هر مورد باید با clause، evidence و تصمیم مشخص بسته شود.

| شناسه | موضوع | وضعیت | اقدام successor |
|---|---|---|---|
| CL-001 | تعارض `A.5.4` دربارهٔ CDN با `G.5.4` دربارهٔ network surface | باز | تفکیک platform reachability از network surface مجاز پروژه |
| CL-002 | `A.5.9` نبودن rate limit ثابت در برابر throttle سیاست پروژه | باز | ثبت observed fact جدا از project policy و scheduler policy |
| CL-003 | `F.8.5` نبودن option-chain endpoint مجاز و تأییدشده | باز | منبع، raw fixture و schema پیش از مصرف |
| CL-004 | `MarketWatchInit.aspx` و نبود fixture/schema معتبر | باز | خارج از مسیر live تا evidence کامل |
| CL-005 | `mw.AllRows` در برابر گزارهٔ کلی globals و scope صفحه | باز | exception دقیق، host/realm، schema و completeness evidence |
| CL-006 | تفاوت cadence اجرای filter با lifecycle ساخت IIFE/closure | باز | probe lifecycle و حل صریح B.6.2/B.6.3 پیش از object projection |
| CL-007 | allocation و persistent closure در exact projection | باز | emitter دقیق allocation-free یا اصلاح قراردادی صریح؛ بدون scalar fallback |
| CL-008 | نسبت size budget min/source با سقف واقعی Artifact A | باز | probe ظرفیت textarea/parser و cost evidence |
| CL-009 | bridge state در برابر ادعای `FilterCode`/`SaveParams` | باز | authoritative apply/persist confirmation |
| CL-010 | `G.5.6` ظاهرشدن پنل در برابر خطای parser/data/DOM | باز | تفکیک shell availability از data validity و bootstrap failure |
| CL-011 | ادعاهای `Verified` بدون evidence pointer کامل | باز | اتصال هر ادعا به ledger، fixture، host، زمان و hash |
| CL-012 | profile raw/derived و افشای متن یا اثر filter | باز | تعریف projection disclosure؛ بدون privacy مطلق |
| CL-013 | freshness دادهٔ page-memory در برابر timestamp/generation | باز | snapshot consistency و observedAt معتبر |
| CL-014 | label option با چند numeric run و relation underlying | باز | grammar نسخه‌دار، fixture و وضعیت unknown/reported/confirmed |
| CL-015 | defaults تحلیلی در برابر missing market observation | باز | تفکیک config default از market observation؛ unknown باقی بماند |
| CL-016 | تعارض freshness در K.6 با مقدار Appendix E | باز | یک واحد و data-class policy نسخه‌دار |
| CL-017 | ابهام `minVolume` و خلط `tvol` با `tval` | باز | نام، واحد و field mapping صریح |
| CL-018 | ابهام condition و semantics `abortThresholdInput` | باز | تعریف trigger، واحد و رفتار missing |
| CL-019 | نبود فرمول صریح `maxStalePricePct` | باز | تفکیک staleness واقعی از last-mid deviation |
| CL-020 | نبود zero/missing policy برای `maxImbalanceRatio` | باز | تعریف نسبت، صفر و unknown |
| CL-021 | ابهام `poolAutoUpdate` در برابر `fetchAuto` و `storeAuto` | باز | تفکیک fetch، persist و بازار/غیربازار |
| CL-022 | تعارض timeout K.2.2 با delay مشاهده‌شدهٔ A.5.12 | باز | timeout project policy جدا از platform observation |
| CL-023 | بررسی شماره‌گذاری A.5.10 و A.5.11 | باز | شماره یکتا و cross-reference معتبر |
| CL-024 | قرارگرفتن policyهای پروژه در A.7/A.8 | باز | تفکیک platform fact، project policy و owner decision |

## قانون cleanup

- v5.0 baseline حفظ می‌شود؛
- این register مجوز تغییر مستقیم v5.0 نیست؛
- هر resolution باید در successor canonical v6.0 با provenance و تست ثبت شود؛
- حل یک مورد که بر gateهای downstream اثر دارد، آن gateها را دوباره باز می‌کند؛
- هیچ cleanupای به‌تنهایی مجوز تولید کد محصول، live probe یا shipping نیست؛ gate مستقل لازم است.
