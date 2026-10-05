# قرارداد معماری Zharfa Smart Filter — نسخهٔ canonical v6.0

**وضعیت: CANONICAL v6.0 — با تأیید مالک در 2026-10-04؛ این canonicalization فقط برای architecture/governance است و مجوز shipping یا production-ready بودن محصول نیست.**

**دامنهٔ این تأیید:** این سند قرارداد canonical successor است. release اولیهٔ `tseZharfaKavosh v0.1.0.0` همچنان governance-only است؛ gateهای فنی باز در `docs/PENDING.md` باقی می‌مانند و این approval آن‌ها را بی‌صدا نمی‌بندد یا waive نمی‌کند.

این سند تصمیم‌ها، policyها و اصلاحات پذیرفته‌شده را برای قرارداد canonical successor ثبت می‌کند. انتخاب‌های حل‌نشده در بخش «تصمیم‌های باقی‌مانده» می‌آیند و نباید به‌عنوان default، واقعیت پلتفرم یا مصوبهٔ معماری تفسیر شوند.

مبنای پلتفرم و محدودیت‌های Artifact A، قرارداد canonical v5.0 در commit زیر است:

```text
251db6b0e846e367cc20f0580f798ad5e4c552a3
```

این سند آن قرارداد را بی‌صدا supersede نمی‌کند. هر تعارض فقط پس از تصویب successor رسمی و ثبت در نسخهٔ بعدی حل می‌شود.

---

## ۱. اصل حاکم و سطوح ادعا

هر گزاره باید در یکی از سه سطح ثبت شود:

### ۱.۱ تصمیم محصول — Owner-approved direction

این‌ها جهت محصول‌اند، نه ادعای فنی دربارهٔ رفتار TSETMC:

- سناریوی محصول «اسب تهران + جت جهانی»؛
- حفظ سازگاری عمیق با اکوسیستم TSETMC بدون حذف توان تحلیلی سطح بالا؛
- داشتن سه deployment direction با نام‌های D1، D2 و D3؛
- استفاده از D1 به‌عنوان مسیر Browser-Native و کانال توزیع/بازاریابی؛
- عدم ساده‌سازی مسئله از طریق کوچک‌کردن universe، افزایش اجباری freshness، حذف projection دقیق، یا برگشت خاموش به manual mode؛
- عدم تولید کد محصول تا بسته‌شدن دروازه‌های لازم و تأیید قرارداد successor.

### ۱.۲ فرض معماری — Needs validation

این‌ها مسیرهای معماری پذیرفته‌شده برای بررسی‌اند، اما هنوز واقعیت اثبات‌شدهٔ پلتفرم نیستند:

- استفاده از `mw.AllRows` به‌عنوان primary local-memory adapter برای داده‌های حاضر در MarketWatch؛
- اجرای تحلیل سنگین D1 در Web Worker، با adapter روی main thread؛
- وجود یک core مشترک با adapterهای متفاوت برای D1، D2 و D3؛
- وجود Compute Dispatcher در Artifact B؛
- وجود ماژول‌های GEX/DEX، Vanna/Volga، Flow و Volatility Surface؛
- bridge خودکار و تأییدشده از B به فیلتر A؛
- parity محاسبات بین executorهای متفاوت.

### ۱.۳ واقعیت اثبات‌شده — Contract/platform evidence

این‌ها از قرارداد canonical v5.0 به ارث می‌رسند یا باید با evidence مستقل ثبت شوند:

- رفتار `PrepareFilterCode` و فهرست ۵۹ trigger؛
- row schema و معانی فیلدهای B.5.2 و B.5.3؛
- محدودیت‌های pure، row-only، بدون DOM، timer، network، storage و state برای Artifact A؛
- محدودیت‌های source/min، `node --check`، parity و نبود Terser/Uglify/mangling؛
- endpointهای واقعاً تأییدشده و provenance هر داده؛
- هر ادعای جدید دربارهٔ `mw.AllRows`، `mw.FilterCode` یا `mw.SaveParams` فقط پس از ثبت evidence مربوط.

نبودن یک fixture در sandbox، evidence مالک را خودکار رد نمی‌کند؛ اما provenance `owner-observed` با `contract-verified` یکی نیست.

### ۱.۴ مؤلف، lineage و حقوق قانونی

مالک پروژه صریحاً اعلام کرده است که مالک حقوق upstream، fork و successor است و اختیار صدور مجوز successor را دارد. بر همین مبنا، successor `tseZharfaKavosh v0.1.0.0` با مجوز `Smart-FFA-1.1` آماده می‌شود. artifactهای تاریخی v5.0 و نسخه‌های پیشین همچنان lineage و notice تاریخی خود را حفظ می‌کنند.

- **مؤلف اصلی:** `https://t.me/p75ad`
- **گروه پروژه:** `https://t.me/SmartOptionTSE`
- **lineage:** `tseZharfaKavosh` از `tseOptionZharfa v0.0.4.1` و آن از `tseOption_ExoticFilter v0.0.4.6`؛
- **مجوز successor:** `Smart-FFA-1.1 (Free Fork with Attribution and Optional Donation)`؛
- **کپی‌رایت:** `© ۱۴۰۵ — حقوق مؤلف محفوظ است`؛
- **scope:** مجوز v1.1 برای successor و مواد مجاز همان release است و attribution/upstream lineage را حذف یا تحریف نمی‌کند.

حقوق و شروط Smart-FFA-1.1:

- استفاده، مطالعه، تغییر، fork، بازتوزیع، bundle و استفادهٔ تجاری مجاز است؛
- حفظ نام و نشانی مؤلف اصلی، شناسهٔ مجوز و lineage الزامی است؛
- donation اختیاری است و license fee، subscription، royalty یا feature unlock نیست؛
- پروژه donation status را track، store یا بر اساس آن feature/priority تعیین نمی‌کند؛
- fork می‌تواند donation channel خود را اضافه یا channel upstream را حذف کند، اما نباید attribution upstream را با channel خود جایگزین کند؛
- این بخش scope مجوز را ثبت می‌کند و جای مشاورهٔ حقوقی حوزهٔ قضایی کاربر نیست.

**رفع مسئولیت قانونی/محصولی:**

> این ابزار صرفاً تحلیلی و اطلاعاتی است؛ تضمین سود نمی‌دهد و مسئولیت هر تصمیم و معامله تنها بر عهده کاربر است.

`fullNotice` successor:

```text
tseZharfaKavosh
fork از tseOptionZharfa v0.0.4.1
fork از tseOption_ExoticFilter v0.0.4.6
مؤلف اصلی: https://t.me/p75ad
گروه پروژه: https://t.me/SmartOptionTSE
مجوز: Smart-FFA-1.1 (Free Fork with Attribution and Optional Donation)
© ۱۴۰۵ — حقوق مؤلف محفوظ است
این ابزار صرفاً تحلیلی و اطلاعاتی است؛ تضمین سود نمی‌دهد و مسئولیت هر تصمیم و معامله تنها بر عهده کاربر است.
حمایت اختیاری: حمایت هیچ ویژگی‌ای را باز نمی‌کند و اجباری نیست.
```

قواعد delivery حقوقی:

- source متن فارسی را به‌صورت UTF-8 قابل ویرایش نگه می‌دارد؛
- min representation همهٔ نویسه‌های non-ASCII را به Unicode escape تبدیل می‌کند؛
- legal source/min parity اجباری است؛
- legal notice باید در footer پنل و سطوح هشدار/تأیید لازم حاضر باشد؛
- donation notice تا پرشدن channelهای مالک نباید مقصد فعال جعلی بسازد؛
- `LICENSE` و `DONATION.md` در root و سیاست‌های تصمیم/معماری در `docs/` نگه‌داری می‌شوند.

### تفسیر افزودهٔ PART F.8.14 — Donation اختیاری

این interpretation برای successor Smart-FFA-1.1 الزام‌آور است:

- donation کاملاً voluntary و optional است و هیچ feature، access، priority یا حق استفاده‌ای را unlock نمی‌کند؛
- donation license fee، subscription، royalty یا شرط use/fork/redistribution نیست؛
- هیچ donation status در source، panel، compiler، analytics یا telemetry track/store نمی‌شود؛
- تا ثبت channel واقعی توسط owner، placeholder موجود در `DONATION.md` نباید به مقصد فعال تعبیر شود؛
- fork می‌تواند channel خود را اضافه کند یا channel upstream را حذف کند، اما باید attribution و ownership channelها را روشن نگه دارد؛
- این interpretation به‌تنهایی مجوز اجرای payment processor یا افزودن code محصول نیست.

### PART H — Smart-FFA AI/Fork Policy v1.1

۱. هر کد، متن، fixture یا artifact تولیدشده با کمک AI باید همان attribution، lineage، license notice، no-tracking و no-feature-unlock policy را حفظ کند؛ AI بودن منبع، تعهدهای license را کاهش نمی‌دهد.

۲. fork و derivative می‌تواند author/version خود و channel donation خود را اضافه کند، اما attribution upstream، نام مؤلف، گروه، lineage و disclaimer فارسی را حذف یا تحریف نمی‌کند.

۳. successor license v1.1 به upstream historical artifactها به‌صورت retroactive اعمال نمی‌شود. scope هر release باید در decision register و header همان release قابل تشخیص باشد.

۴. v0.1.0.0 فقط governance scaffold، contract، legal documentation و metadata است؛ LEGAL runtime module، donation footer اجرایی، adapter، core logic، UI، compiler و live probe تا approval و gate مربوط تولید یا اجرا نمی‌شوند.

۵. هیچ خروجی AI یا fork نمی‌تواند donation، tracking، telemetry، feature gating یا data transfer پنهان اضافه کند. هر تغییر privacy/data-transfer باید Class B و در `docs/PENDING.md` یا decision ثبت شود.

۶. این policy جایگزین gateهای فنی و release approval نیست؛ تأیید canonical در Approval Record ثبت شده است، اما approval record مجوز shipping یا اجرای کد محصول محسوب نمی‌شود.

---

## ۲. مدل محصول

Zharfa یک محصول واحد است که دو artifact مستقل دارد:

```text
Artifact A — predicate بومی فیلتر TSETMC
Artifact B — پنل، داده، تحلیل، compiler و bridge
```

### ۲.۱ Artifact A

- در مسیر فیلتر `ParTree=15131F` اجرا می‌شود؛
- فقط row جاری را می‌خواند؛
- pure، بی‌حالت و مستقل از فراخوانی‌های دیگر است؛
- DOM، UI، timer، network، storage و state بین فراخوانی‌ها ندارد؛
- verdict آن یا یک projection دقیق و تاریخ‌دار از B است، یا predicate ردیفی‌ای که صریحاً در قرارداد تعریف شده است؛
- هیچ scalar-only fallback، Bloom approximation یا حذف خاموش شناسه‌ها مجاز نیست.

### ۲.۲ Artifact B

- پنل و موتور تحلیلی Zharfa است؛
- دادهٔ معتبر، snapshot، profile هدف، تقویم، pool، history و مدل‌های تحلیلی را مدیریت می‌کند؛
- مسئول provenance، freshness، missing/unknown، compile و bridge است؛
- هیچ داده‌ای را جعل نمی‌کند؛
- ماژول‌های حرفه‌ای را فقط وقتی eligible می‌کند که dependency و منبع دادهٔ آن‌ها معتبر باشد.

### ۲.۳ مرز محصول و پلتفرم

«اسب تهران» به معنی adapterها و محدودیت‌های واقعی TSETMC است. «جت جهانی» به معنی سطح معماری و مدل‌های B است. مدل‌های جهانی به‌صورت runtime داخل Artifact A منتقل نمی‌شوند؛ خروجی آن‌ها فقط از مسیر projection دقیق و ثبت‌شده می‌تواند به A برسد.

---

## ۳. نام‌گذاری deploymentها

برای جلوگیری از تداخل با Artifact A و Artifact B، نام deploymentها این است:

| نام | معنا |
|---|---|
| D1 | Browser-Native |
| D2 | Hybrid با service محلی |
| D3 | Cloud |

در این سند عبارت «Profile A/B/C» برای deployment استفاده نمی‌شود.

D1، D2 و D3 جهت محصول/معماری هستند و mapping زبان آن‌ها به‌عنوان تصمیم مالک برای جهت Alpha در `D-2026-10-03-002` ثبت شده است؛ implementation و parity آن همچنان gate دارد:

```text
D1 = Browser JavaScript + Web Worker
D2 = Node.js LTS local service
D3 = Python cloud executor/service
```

این mapping، cloud topology، packaging، libraryهای عددی یا جزئیات deployment را به‌تنهایی تعیین نمی‌کند.

---

## ۴. Core مشترک و deployment-specific adapters

منطق تحلیلی باید از محیط اجرا مستقل طراحی شود و از interfaceهای مفهومی زیر استفاده کند:

- `DataSource`
- `SnapshotStore`
- `AnalyticsExecutor`
- `Compiler`
- `ApplyBridge`
- `EvidenceLedger`

هر deployment implementation مخصوص خود را دارد. در Alpha، D1 با Browser JavaScript/Worker، D2 با Node.js LTS و D3 با Python mapping می‌شود؛ این mapping در `docs/DECISIONS.md` ثبت شده است.

Core مشترک نباید به DOM، `window.mw`، localStorage، localhost یا cloud API وابسته باشد.

استقلال deployment به معنی یکسان‌بودن خودکار نتایج نیست. برابری نتایج فقط پس از تکمیل canonical computation و parity test قابل ادعاست.

---

## ۵. Canonical computation و parity

برای هر executor باید قرارداد محاسباتی مشترک وجود داشته باشد:

- input schema نسخه‌دار؛
- canonical serialization؛
- timezone مشخص `Asia/Tehran`؛
- rounding و decimal policy؛
- semantics دقیق برای missing، stale و unknown؛
- model version در هر خروجی؛
- conventionهای Greeks و volatility؛
- snapshot identity و data age؛
- نبود randomness در مسیر واقعی؛
- fixture مشترک برای زبان‌ها و executorهای مختلف؛
- parity test در هر release.

تا زمانی که این موارد با fixture و تست ثبت نشده‌اند، عبارت «منطق یکسان» فقط هدف معماری است، نه واقعیت contract-verified.

---

## ۶. D1 — Browser-Native

D1 به‌عنوان مسیر Browser-Native و کانال توزیع/بازاریابی ثبت می‌شود.

### ۶.۱ مسیر اجرایی

```text
Main-thread Page Adapter
        │
        ├── خواندن read-only از page memory در صورت اثبات دسترسی
        ├── ساخت snapshot و provenance
        └── پیام نسخه‌دار
                    │
                    ▼
              Web Worker
        ├── تحلیل
        ├── compile
        └── exact projection
                    │
                    ▼
Main-thread Bridge
        ├── UI و diagnostics
        ├── storage adapter
        └── apply confirmation
```

Web Worker مستقیماً به DOM، `window.mw`، `mw.AllRows` یا `localStorage` دسترسی ندارد.

### ۶.۲ storage و privacy

- IndexedDB storage پایدار canonical D1 در Alpha است و main thread/Worker از storage adapter نسخه‌دار استفاده می‌کنند؛
- `localStorage` برای snapshot، job و result جدید storage canonical نیست؛ فقط compatibility/metadata محدود، در صورت ثبت adapter، مجاز است؛
- Worker مستقیماً به DOM یا `window.mw` دسترسی ندارد و storage از مسیر IndexedDB/adapter انجام می‌شود؛
- D1 به‌صورت پیش‌فرض به service پروژه یا cloud upload ندارد؛
- claim قابل قبول برای D1 عبارت است از **no-server-upload by design**؛
- privacy مطلق تضمین نمی‌شود، زیرا متن filter، شناسه‌های eligible، thresholdها و page state ممکن است برای TSETMC یا scriptهای دارای دسترسی صفحه قابل مشاهده باشند.

### ۶.۳ شبکه

D1 برای acquisition دادهٔ TSETMC از page adapter و منابع مجاز قرارداد استفاده می‌کند. D1 به‌صورت خودکار مجوز استفاده از endpoint غیرمجاز، Loader.aspx، WebSocket یا bypass محدودیت TSETMC را ندارد.

---

## ۷. D2 — Hybrid

D2 مسیر اجرای محلی با service روی دستگاه کاربر است.

اصول تأییدشدهٔ D2:

- acquisition صفحه همچنان از adapter مجاز انجام می‌شود؛
- local service نباید محدودیت TSETMC را دور بزند؛
- داده تا حد امکان روی دستگاه کاربر می‌ماند؛
- انتقال به cloud فقط با انتخاب صریح کاربر مجاز است؛
- transport D2 در Alpha به‌صورت **HTTP/JSON control plane + SSE برای progress و eventهای طولانی** طبق `D-2026-10-03-001` انتخاب شده است؛
- transport D2 یک network surface جدا از acquisition TSETMC است و فقط job، snapshot، result و event مربوط به همان job را منتقل می‌کند؛
- زبان service D2 برای Alpha، Node.js LTS است؛
- پورت concrete، authentication implementation، storage engine و جزئیات packaging هنوز انتخاب نشده‌اند؛
- جزئیات الزامی lifecycle، snapshot، cancel، replay، error taxonomy و Origin در PART U و `docs/DECISIONS.md` ثبت شده‌اند.

---

## ۸. D3 — Cloud

D3 مسیر اجرای ابری است.

اصول تأییدشدهٔ D3:

- executor/service ابری D3 در Alpha با Python mapping می‌شود؛
- topology اصلی D3 در Alpha، Managed Container طبق `D-2026-10-03-003` است؛
- معماری مفهومی شامل API boundary، Python service، job queue، bounded worker pool و managed storage است؛
- Alpha به Kubernetes الزام ندارد؛
- cloud نباید مستقل و خودسرانه TSETMC را scrape کند؛
- cloud snapshot ارسالی client یا منبعی را مصرف می‌کند که مستقل و مجاز تأیید شده باشد؛
- انتقال دادهٔ بازار، profile و filter با رضایت و policy روشن انجام می‌شود؛
- data residency، retention، deletion، authentication، packaging و cloud provider هنوز نهایی نشده‌اند؛
- در صورت فعال‌شدن authentication ابری، discovery باید بر مبنای استاندارد OAuth 2.0/OIDC یا سازوکار معادلِ ثبت‌شده باشد؛ provider و جزئیات implementation هنوز انتخاب نشده‌اند؛
- parity با D1 و D2 باید با canonical fixture و test اثبات شود؛
- D3 در Alpha در سطح architecture/design ثبت شده و shipping آن به `P-DEC-001` و gateهای مربوط وابسته است.

---

## ۹. `mw.AllRows` و page-memory adapter

`mw.AllRows` در این نسخه **contract-verified محسوب نمی‌شود**. وضعیت آن:

```text
owner-observed / architecture candidate / evidence pending
```

اگر evidence لازم ثبت شود، adapter باید فقط read-only باشد و این موارد را تعیین کند:

- `ParTree` و URL دقیق؛
- دسترسی از page realm؛
- scope و تعریف «همهٔ ردیف‌ها»؛
- key و identity هر رکورد؛
- schema و نوع fieldها؛
- behavior در loading، refresh و error؛
- generation یا timestamp؛
- completeness نسبت به universe مورد ادعا؛
- provenance و hash snapshot.

تا آن زمان، `mw.AllRows` فقط مسیر پیشنهادی برای bulk data است و نباید به‌عنوان کل universe بازار معرفی شود.

داده‌هایی مانند option-chain عمیق، option-to-underlying، multiplier، OI، history، calendar، IV surface و Greeks از `mw.AllRows` به‌صورت خودکار اثبات نمی‌شوند و به منابع یا parserهای جداگانه نیاز دارند.

---

## ۱۰. Universe و relation option

Universe نباید به‌دلیل size، rate یا هزینهٔ تحلیل truncate شود.

تعریف عملیاتی موقت:

```text
U_snapshot = تمام رکوردهای واقعاً موجود در snapshot معتبر
```

این تعریف تا زمان اثبات completeness، ادعای «کل بازار» نیست.

تشخیص option و relation با underlying باید دارای موارد زیر باشد:

- parser نسخه‌دار؛
- fixture اصیل؛
- grammar صریح برای label؛
- handling برای چند numeric run؛
- وضعیت‌های `unknown`, `candidate`, `reported`, `confirmed`, `rejected`؛
- عدم حدس‌زدن در labelهای ناسازگار؛
- provenance برای `baseInsCodes` و هر cross-check.

رکورد unknown از universe حذف نمی‌شود، اما eligible یا confirmed نیز فرض نمی‌شود.

---

## ۱۱. ماژول‌های تحلیلی سطح بالا

ماژول‌های زیر هدف معماری B هستند و تا تکمیل dependency matrix قابلیت shipping محسوب نمی‌شوند:

| ماژول | ورودی‌های لازم | وضعیت Alpha |
|---|---|---|
| GEX/DEX | chain، strike، expiry، OI، multiplier، underlying | منبع chain و multiplier باز است |
| Vanna/Volga | IV معتبر، Greeks، expiry، convention | convention و منبع باز است |
| Flow Scanner | trade history، سمت معامله یا proxy معتبر، timestamp | سمت معامله تعریف نهایی نشده |
| Volatility Surface | chain کامل، IVهای معتبر، quality gates | chain کامل باز است |

این ماژول‌ها نباید با دادهٔ ساختگی، multiplier حدسی یا relation حدسی فعال شوند.

### ۱۱.۱ وضعیت نمایش ماژول

ماژول به‌دلیل کمبود داده یا خطا از UI ناپدید نمی‌شود. وضعیت آن باید یکی از این حالت‌ها باشد:

- `fresh` — داده معتبر و نتیجهٔ کامل؛
- `stale` — داده کهنه و نتیجه با برچسب سن/تاریخ؛
- `unknown` — داده یا provenance کافی نیست و نتیجهٔ تحلیلی صادر نمی‌شود؛
- `insufficient-data` — دادهٔ شناخته‌شده برای محاسبه کافی نیست و دلیل نمایش داده می‌شود؛
- `error` — اجرای ماژول شکست خورده و کد/شرح خطا ثبت می‌شود.

`unknown`، `insufficient-data` و `error` نباید به‌صورت eligible، صفر، مقدار خنثی یا نتیجهٔ کامل تفسیر شوند. وضعیت و دلیل باید در پنل، trace و snapshot خروجی قابل مشاهده باشد.

---

## ۱۲. Exact projection از B به A

B باید verdict را در snapshot مشخصی تولید کند. برای snapshot شمارهٔ `k`:

```text
E_k = مجموعهٔ canonical instrument IDهایی که B در snapshot k واجدشرایط اعلام کرده است
```

projection دقیق باید به‌صورت صریح یکی از این دو باشد:

1. عضویت دقیق `row.inscode` در `E_k`؛ یا
2. predicate ردیفی دقیق که جزئی از verdict رسمی B و همان snapshot است.

ترکیب مبهم membership با threshold زنده مجاز نیست.

**تعریف predicate ردیفی دقیق:**

- تابعی deterministic است که از verdict رسمی B در snapshot `k` مشتق شده باشد؛
- دامنهٔ ورودی، field mapping و missing/unknown policy آن با B یکسان باشد؛
- اگر B verdict خود را به‌صورت شرطی روی row تعریف کرده باشد، همان شرط نسخه‌دار و کامل می‌تواند در A صادر شود؛
- اگر verdict B به دادهٔ cross-row، chain، profile یا تحلیل عمیق وابسته باشد، باید نتیجهٔ دقیق آن به projection مناسب مانند مجموعهٔ شناسه‌های `E_k` تبدیل شود؛
- threshold عمومی یا جدیدی که B آن را در verdict خود اعمال نکرده است، predicate دقیق محسوب نمی‌شود.

**تفاوت با scalar-only fallback:**

- predicate دقیق، بخشی از تعریف رسمی verdict B برای snapshot مشخص است؛
- scalar fallback یک شرط عمومی مستقل است که ممکن است ردیف‌هایی را عبور دهد که B رد کرده یا ردیف‌های واجدشرایط را حذف کند؛
- هیچ approximation یا شرط مستقل نباید با نام exact projection عرضه شود.

قواعد ثابت:

- scalar-only fallback مجاز نیست؛
- Bloom یا approximation مجاز نیست؛
- universe برای جا شدن در textarea حذف نمی‌شود؛
- ceiling عددی جدید تا probe واقعی تصویب نمی‌شود؛
- object literal فقط پس از حل تعارض lifecycle/allocation و ثبت evidence مجاز است؛
- emitterهای دقیق و allocation-free مانند decision tree ثابت می‌توانند بررسی شوند؛
- اگر emitter دقیق در ظرفیت ثبت‌شده جا نشود، build نباید خروجی ناقص تولید کند.

A باید با شناسهٔ snapshot، config hash، زمان تولید و وضعیت apply از B تفکیک شود.

---

## ۱۳. Bridge و apply confirmation

وضعیت‌های bridge عبارت‌اند از:

```text
generated
written
page-state-observed
applied-confirmed
persisted-confirmed
unconfirmed
error
```

وجود `mw.FilterCode`، `mw.Settings.Filters` و `mw.SaveParams` در این Alpha به‌عنوان owner-observed/candidate ثبت می‌شود، نه API قطعی.

`applied-confirmed` فقط پس از تعیین authoritative page state و probe معتبر صادر می‌شود. نوشتن در textarea، تغییر row count یا return value ناشناخته به‌تنهایی confirmation نیست.

`persisted-confirmed` سطحی بالاتر از `applied-confirmed` است و فقط وقتی صادر می‌شود که پس از apply، در یک snapshot بعدی صفحه یا پس از reload/navigation مجاز، متن یا state canonical متناظر با همان `compiledTextHash`/normalized hash باقی‌مانده مشاهده شود. اگر persistence probe انجام نشده یا page state مرجع قطعی ندارد، وضعیت حداکثر `applied-confirmed` است و نباید `persisted-confirmed` صادر شود.

manual mode نباید به‌صورت خاموش fallback شود. اگر مسیر خودکار شکست خورد، وضعیت باید error یا unconfirmed باقی بماند و جزئیات trace شود.

---

## ۱۴. Freshness، bulk و deep path

دو مسیر داده حفظ می‌شوند:

### ۱۴.۱ Bulk path

- منبع بالقوه: page-memory adapter تأییدشده؛
- fieldها فقط پس از schema/evidence معتبر مصرف می‌شوند؛
- freshness از generation/timestamp قابل اتکا گرفته می‌شود؛
- snapshot باید نسبت به mutationهای هم‌زمان پایدار باشد.

### ۱۴.۲ Deep path

- فقط endpointها و parserهای دارای provenance مصرف می‌شوند؛
- scheduler نباید instrumentها را به‌دلیل هزینه حذف کند؛
- timeout، abort، deduplication و backoff لازم است؛
- freshness target کاربر با freshness achieved جدا ثبت می‌شود؛
- stale یا unknown نباید fresh یا eligible فرض شود؛
- option-chain و calendar تا زمان تأیید منبع در وضعیت باز هستند.

`mw.AllRows` کاهش fetch برای bulk را ممکن می‌کند، اما به‌تنهایی trade-off کل داده‌های عمیق را حل‌شده اعلام نمی‌کند.

### ۱۴.۳ رفتار scheduler در ساعات بازار

- در ساعات بازار، polling و refresh طبق freshness policy مصوب و data-source contract اجرا می‌شود؛
- در ساعات خارج از بازار، polling خودکار متوقف می‌شود، مگر اینکه کاربر درخواست صریح یا policy جداگانهٔ مصوب داشته باشد؛
- تشخیص ساعات بازار از calendar/session policy معتبر می‌آید، نه صرفاً از ساعت سیستم؛
- اولین refresh در جلسهٔ بعدی باید snapshot تازه با `observedAt` جدید بسازد؛
- stop شدن polling خارج از بازار به معنی حذف instrument یا پاک‌کردن pool نیست؛
- retryهای transport محلی job، از polling دادهٔ TSETMC جدا هستند و این قاعده آن‌ها را بی‌صدا متوقف نمی‌کند.

---

## ۱۵. Compute Dispatcher

Compute Dispatcher فقط در Artifact B قرار می‌گیرد و هرگز وارد Artifact A نمی‌شود.

اصول آن:

- executor انتخاب‌شده باید در trace ثبت شود؛
- dispatcher نباید universe را کوچک کند؛
- نباید approximate را جای exact بنشاند؛
- نباید stale را fresh معرفی کند؛
- نباید deployment را بی‌صدا عوض کند؛
- نباید network policy deployment جاری را دور بزند؛
- شکست ظرفیت باید گزارش شود، نه پنهان.

D1 با Browser JavaScript، D2 با Node.js LTS و D3 با Python در Managed Container mapping شده‌اند. پورت concrete، authentication implementation، packaging، cloud provider و scaling topology هنوز تصمیم نهایی نیستند؛ transport پایهٔ D2 برای Alpha در تصمیم `D-2026-10-03-001` انتخاب شده است.

---

## ۱۶. تصمیم‌های باقی‌مانده برای تأیید مالک

این بخش فقط مواردی را نگه می‌دارد که هنوز نیازمند انتخاب/تأیید صریح هستند. تصمیم‌های زیر قبلاً در `docs/DECISIONS.md` ثبت شده‌اند و دیگر در این فهرست باز نیستند:

- `D-2026-10-03-001` — transport D2؛
- `D-2026-10-03-002` — mapping زبان‌های D1/D2/D3؛
- `D-2026-10-03-003` — topology اصلی D3؛
- `D-2026-10-03-004` — policy نسخه؛
- `D-2026-10-03-005` — ترتیب dependency/gate-driven.

تصمیم‌های باقی‌مانده:

1. دامنهٔ دقیق قابلیت‌های Alpha به‌عنوان phased release یا عدم تعیین scope محدود؛ در `docs/PENDING.md` با شناسهٔ `P-DEC-001`؛
2. privacy و data-transfer policy به‌عنوان تصمیم Class B؛ در `docs/PENDING.md` با شناسهٔ `P-DEC-002`.

این سند اکنون با عنوان `Zharfa Smart Filter Contract v6.0` canonical است. canonical شدن قرارداد به‌تنهایی مجوز shipping، اجرای probe زنده یا production-ready بودن release نیست؛ این موارد به gateهای مستقل و تصمیم‌های PENDING وابسته‌اند.

---

## ۱۷. دروازه‌های فنی — تصمیم انتخابی نیستند

این موارد در فهرست «تصمیم‌های مالک» نیستند؛ کارهای validation/design هستند که باید پیش از release بسته شوند:

- evidence دامنه و schema `mw.AllRows`؛
- probe `mw.FilterCode` و `mw.SaveParams`؛
- طراحی main-thread/Worker؛
- تعریف دقیق A snapshot؛
- exact projection بدون scalar fallback؛
- ظرفیت واقعی textarea و parser؛
- bridge confirmation؛
- منبع option-chain؛
- option-to-underlying fixture؛
- multiplier و OI؛
- calendar source؛
- canonical computation؛
- parity سه executor؛
- network boundary هر deployment؛
- defaults و evidence ledger؛
- جزئیات privacy و data-transfer طبق تصمیم Class B `P-DEC-002`؛
- fixtureهای cross-language؛
- تست‌های source/min و invariants قرارداد v5.0.

بسته‌شدن این gateها به معنی انتخاب یک گزینهٔ محصولی نیست؛ به معنی اثبات یا رد فنی همان مسیر انتخاب‌شده است.

---

## ۱۸. وضعیت canonical v6.0 و قاعدهٔ تولید

این سند:

- با ثبت تصمیم‌های Class B و تأیید صریح مالک در `D-2026-10-04-003`، canonical v6.0 است؛
- قرارداد canonical v5.0 را بی‌صدا بازنویسی نمی‌کند و lineage آن را حفظ می‌کند؛
- به‌تنهایی مجوز تولید Artifact A یا B نیست؛
- مجوز probe زنده، shipping یا production-ready بودن نیست؛
- defaultهای حل‌نشده و gateهای باز را به‌صورت خاموش تعیین نمی‌کند؛
- اصل عدم جعل داده و عدم کاهش خاموش دامنه را حفظ می‌کند.

وضعیت release اولیه:

- `tseZharfaKavosh v0.1.0.0` فقط governance، legal documentation، contract و metadata است؛
- adapter، core logic، UI، compiler، live probe و market-data runtime در این release وجود ندارد؛
- gateهای G-03 تا G-14 و G-16 تا G-18 در `docs/PENDING.md` باز هستند؛
- شروع تولید به معنی شروع مرحلهٔ قراردادی و validation است، نه مجوز shipping محصول.

هر کد محصول آینده باید source/min، `node --check`، اسکن ۵۹ trigger، parity، legal parity و الزامات PART G/H را رعایت کند.

## ۱۹. PART U — Transport Layer

PART U سه سطح مستقل را تعریف می‌کند. این سه سطح نباید در implementation یا trace با یکدیگر اشتباه شوند:

```text
Page ↔ Worker          postMessage؛ داخلی مرورگر و مربوط به D1
Page ↔ Local Service   HTTP/JSON + SSE؛ مربوط به D2 در Alpha
Page ↔ Cloud           مربوط به D3؛ در Alpha انتخاب نشده
```

### U.1 سطح اول — Page ↔ Worker

- این سطح transport داخلی D1 است؛
- از `postMessage` با message schema نسخه‌دار استفاده می‌کند؛
- به local service یا cloud نیاز ندارد؛
- `snapshotId`، `configHash`، `jobId` و version باید همراه پیام باشند؛
- Worker مستقیماً به DOM، `window.mw` یا `localStorage` دسترسی ندارد؛
- main-thread adapter مالک دسترسی page و storage adapter است؛
- failure و timeout Worker باید به main thread گزارش شود و به‌عنوان موفقیت کامل تفسیر نشود.

### U.2 سطح دوم — Page ↔ Local Service در D2

Transport انتخاب‌شده برای Alpha:

```text
HTTP/JSON control plane + SSE progress/event stream
```

HTTP/JSON برای عملیات زیر استفاده می‌شود:

- submit job؛
- دریافت status؛
- دریافت result؛
- درخواست cancel؛
- انتقال snapshot یا reference معتبر به snapshot؛
- دریافت diagnostics و error detail.

SSE برای موارد زیر استفاده می‌شود:

- progress؛
- state transition؛
- completion؛
- failure؛
- cancellation؛
- timeout؛
- eventهای قابل replay.

WebSocket در transport پایهٔ Alpha نیست. افزودن آن فقط در صورت تبدیل‌شدن bidirectional low-latency streaming به نیاز سخت و پس از تصمیم جدید مجاز است.

### U.3 مرز و امنیت D2

- local service نباید روی interface خارجی bind شود؛
- endpoint browser-facing در کد hardcode نمی‌شود؛
- endpoint از config معتبر می‌آید؛
- D1 مقدار local endpoint ندارد؛
- D2 endpoint محلی خود را از config می‌گیرد؛
- origin درخواست باید بررسی شود؛
- production origin و dev origin باید allowlist جدا داشته باشند؛
- origin ناشناخته یا فاقد policy رد می‌شود؛
- session token تصادفی و کوتاه‌عمر لازم است؛
- raw credential نباید در message حمل شود؛
- transport D2 فقط job، snapshot، result و event همان job را منتقل می‌کند؛
- local service حق استفاده از endpoint غیرمجاز TSETMC، Loader.aspx، bypass یا تغییر globalهای TSETMC را ندارد؛
- این transport policy جایگزین network policy acquisition نمی‌شود.

### U.4 Message envelope

هر پیام D2 باید envelope نسخه‌دار داشته باشد و در صورت ارتباط jobمحور، این شناسه‌ها را حمل کند:

```text
schemaVersion
messageType
requestId
jobId
snapshotId
configHash
sequence
createdAt
signature      // optional for D2; required by D3 after auth policy
payload
```

وجود payload بدون schema version یا بدون هویت snapshot برای job قابل قبول نیست. D3 در صورت فعال‌شدن cloud authentication باید signature/integrity و verification policy خود را مشخص کند؛ الگوریتم concrete در این Alpha انتخاب نشده است.

Retry باید idempotent باشد. دریافت دوبارهٔ یک `requestId` نباید باعث اجرای دوبارهٔ ناخواستهٔ job شود.

### U.5 Job lifecycle

هر job دقیقاً یکی از stateهای اصلی زیر را دارد:

```text
queued → running → done
                 → failed
                 → cancelled
                 → timed-out
```

قواعد:

- `queued` هنوز اجرا نشده است؛
- `running` منابع اجرایی گرفته است؛
- `done` فقط برای نتیجهٔ کامل و معتبر است؛
- `failed` شامل دلیل و طبقهٔ خطا است؛
- `cancelled` با درخواست cancel ایجاد می‌شود؛
- `timed-out` به‌صراحت از `failed` عادی جدا می‌شود؛
- transition نامعتبر باید رد و trace شود؛
- job نباید هم‌زمان دو state نهایی داشته باشد.

### U.6 Snapshot immutability

هر job دقیقاً به یک `snapshotId` و `configHash` متصل است.

- snapshot در طول job mutation نمی‌شود؛
- ورود دادهٔ جدید snapshot جدید می‌سازد؛
- دادهٔ جدید job جاری را بی‌صدا تغییر نمی‌دهد؛
- result باید `snapshotId`، `configHash`، model version و زمان تولید را حمل کند؛
- نتیجه‌ای که snapshot آن با درخواست ناسازگار است، eligible برای مصرف نیست.

### U.7 Cancel semantics

- cancel idempotent است؛
- cancel دوباره خطای destructive ایجاد نمی‌کند؛
- cancel باید slot و منابع job را آزاد کند؛
- cancel نتیجهٔ partial را کامل اعلام نمی‌کند؛
- نتیجهٔ partial، اگر تولید شود، باید `partial: true` و `reason: cancelled` داشته باشد؛
- cancel داده را از pool یا snapshot store حذف نمی‌کند؛
- retry کردن cancel‌شده فقط با job جدید و شناسهٔ جدید مجاز است.

### U.8 SSE reconnect و replay

- هر SSE event یک `id` یکتا و monotonic در همان stream دارد؛
- client در reconnect مقدار `Last-Event-ID` را می‌فرستد؛
- server eventهای بعد از آن ID را replay می‌کند؛
- اگر replay window منقضی شده باشد، server یک `reset` event می‌فرستد؛
- client پس از `reset` باید وضعیت snapshot/job را دوباره از control plane بخواند؛
- progress تکراری نباید به‌عنوان اجرای دوبارهٔ job تفسیر شود.

### U.8.1 SSE failure و polling fallback

SSE transport برای progress است و نباید تنها راه مشاهدهٔ state job باشد.

- پس از تعداد مشخص و قابل‌پیکربندی failureهای متوالی، client وضعیت SSE را `blocked` یا `unavailable` ثبت می‌کند؛
- client سپس به polling روی control-plane status endpoint می‌رود؛
- polling فقط status/progress/result job را می‌خواند و جایگزین acquisition دادهٔ TSETMC نیست؛
- `pollInterval`، `maxAttempts` و `maxFallbackDuration` باید در config نسخه‌دار و trace ثبت شوند؛
- هر تغییر از SSE به polling در trace و UI قابل مشاهده است؛
- اگر polling نیز در مدت policy شکست بخورد، job به‌صورت خودکار `failed` یا `timed-out` می‌شود و stale/fresh جعل نمی‌شود؛
- retry و polling نباید باعث اجرای دوبارهٔ job یا حذف snapshot شود؛
- مقدارهای پیشنهادی ۲ ثانیه و ۵ دقیقه در این Alpha default قطعی نیستند و در policy transport/Expert configuration باید جداگانه تأیید شوند.

### U.9 Error taxonomy

| دسته | نمونه | رفتار |
|---|---|---|
| `transient` | قطع موقت شبکه یا service unavailable | retry با backoff و idempotency |
| `permanent` | snapshot نامعتبر یا schema ناسازگار | بدون retry خودکار؛ وضعیت failure |
| `user` | پارامتر یا profile نامعتبر | بدون retry؛ بازگشت خطای قابل‌فهم به UI |

هر error باید category، code، message قابل‌نمایش، `requestId` و در صورت ارتباط job، `jobId` داشته باشد.

### U.10 Worker pool و timeout

- اجرای هم‌زمان jobها باید محدود و قابل مشاهده باشد؛
- job اضافی در `queued` می‌ماند مگر priority صریح وجود داشته باشد؛
- مقدار نهایی pool size در این تصمیم انتخاب نشده است؛
- hard timeout برای هر job الزامی است؛
- مقدارهای پیشنهادی ۶۰ ثانیه برای job عادی و حداکثر ۳۰۰ ثانیه برای job سنگین در این Alpha به‌عنوان candidate ثبت می‌شوند، نه default نهایی؛
- timeout باید منابع و slot را آزاد کند؛
- timeout نباید result کامل تولید کند؛
- تغییر timeout فقط از مسیر policy معتبر و قابل trace مجاز است.

### U.11 Browser-facing URL policy

- هیچ URL مربوط به local service در کد browser-facing hardcode نمی‌شود؛
- مقدار endpoint از config می‌آید؛
- D1 endpoint محلی ندارد؛
- D2 endpoint محلی از config می‌آید؛
- D3 endpoint آینده از سازوکار discovery/auth مخصوص خود می‌آید؛
- محیط preview توسعه باید از relative URL و proxy استفاده کند، نه اتصال hardcoded به `localhost` یا `127.0.0.1`.

### U.12 D3

D3 در این Alpha transport انتخاب‌شده ندارد. در هر تصمیم آینده:

- page ↔ cloud باید از page ↔ Worker و page ↔ local service جدا بماند؛
- cloud نباید مستقل TSETMC را scrape کند؛
- message schema مشترک باید حفظ شود؛
- authentication، retention، residency، upload scope و transport باید جداگانه تصویب شوند.

### U.13 Trace و observability

برای هر job و transport باید حداقل این رخدادها قابل ردیابی باشند:

- submit؛
- accepted/queued؛
- running؛
- progress؛
- reconnect؛
- retry؛
- cancel؛
- done؛
- failed؛
- timed-out؛
- reset؛
- result consumed یا rejected به‌دلیل mismatch snapshot.

**PART U در این Alpha transport D2 و lifecycle آن را قطعی می‌کند. D2 با Node.js LTS mapping شده است؛ پورت concrete، packaging، cloud transport و hard-timeout/pool defaults هنوز تصمیم نهایی نیستند.**

---

## ۲۰. ترتیب قرارداد و gateها — Dependency/Gate-Driven

این بخش ترتیب قرارداد و validation را dependency-driven تعریف می‌کند. این ترتیب با ترتیب متنی PARTها یا feature-first یکی نیست.

### ۲۰.۱ مرحلهٔ ۱.الف — Governance پایه

این مرحله فقط ساختار پایه را تثبیت می‌کند:

پیش‌شرط‌های canonicalization که اکنون در repository موجود و versioned هستند:

- `docs/DECISIONS.md` باید در repository ایجاد و شامل ورودی‌های `D-2026-10-03-001` تا `D-2026-10-03-005` باشد؛
- `docs/PENDING.md` باید در repository ایجاد و شامل `P-DEC-001` و `P-DEC-002` باشد؛
- `docs/V5_CLEANUP.md` باید در repository ایجاد و register کامل cleanup را نگه دارد؛
- `docs/EVIDENCE_LEDGER.md` باید قالب و provenance evidence را نگه دارد؛
- وجود فیزیکی و versioned این فایل‌ها در commit canonical ثبت شده است؛ approval نهایی در `D-2026-10-04-003` آمده است.

- سه سطح ادعا؛
- ساختار `docs/DECISIONS.md`؛
- ساختار `docs/PENDING.md`؛
- ساختار `docs/EVIDENCE_LEDGER.md`؛
- ساختار `docs/V5_CLEANUP.md`؛
- Artifact A و Artifact B؛
- D1، D2 و D3؛
- successor با شمارهٔ canonical `v6.0`.

این مرحله ادعای جدید platform را تأیید نمی‌کند.

### ۲۰.۲ مرحلهٔ ۱.ب — تصمیم‌های بنیادین

تصمیم‌های transport D2، runtime mapping، D3 topology، version policy و gate order در `docs/DECISIONS.md` ثبت شده‌اند. دامنهٔ دقیق قابلیت‌های Alpha همچنان باید به‌صورت جداگانه و صریح تعیین شود؛ فهرست in/out پیشنهادی بدون تأیید مالک مصوبه نیست.

### ۲۰.۳ مرحلهٔ ۲+۳ — Data و Transport به‌صورت co-design

دو شاخه پس از governance می‌توانند موازی طراحی شوند:

#### شاخهٔ Data

- PART K: endpoint، freshness، timeout، provenance و scheduler؛
- PART R: `mw.AllRows`، scope، schema و universe؛
- evidence و fixture مربوط به page memory؛
- option label و option-to-underlying parser؛
- sourceهای chain، calendar، OI و multiplier.

#### شاخهٔ Transport

- PART T: D1، D2 و D3؛
- PART U: Page ↔ Worker، Page ↔ Local Service و Page ↔ Cloud؛
- message schema؛
- job lifecycle، snapshot immutability، cancel، replay و error taxonomy؛
- network boundary.

نقطهٔ تلاقی دو شاخه، canonical snapshot/message schema است. هیچ شاخه‌ای بدون توافق این schema به implementation نهایی نمی‌رسد.

### ۲۰.۴ مرحلهٔ ۴ — Snapshot و canonical computation

- schema نسخه‌دار؛
- canonical serialization؛
- timezone، rounding و decimal policy؛
- missing/unknown semantics؛
- model version؛
- snapshot identity و data age.

### ۲۰.۵ مرحلهٔ ۵.الف — اولین مدل

اولین مدل باید هم‌زمان این سه خروجی را داشته باشد:

- implementation؛
- parity test بین executorهای موجود؛
- no-fabrication test با fixture ناقص.

Parity و no-fabrication از این مرحله به بعد gateهای پیوسته‌اند، نه تست‌هایی که فقط در انتهای release اجرا شوند.

### ۲۰.۶ مرحلهٔ ۵.ب تا ۵.ز — مدل‌های مستقل

مدل‌ها بر اساس dependency خود به زیرمرحله‌های مستقل تقسیم می‌شوند:

- ۵.ب — Greeks و IV؛
- ۵.ج — GARCH؛
- ۵.د — Spread؛
- ۵.ه — SVI؛
- ۵.و — GEX/DEX؛
- ۵.ز — Flow؛
- ۵.ح — Volatility Surface.

هر زیرمرحله باید dependency، parity و no-fabrication test مخصوص خود را داشته باشد.

### ۲۰.۷ مرحلهٔ ۶ — Exact projection

پس از تعریف verdict B، compiler دقیق A، capacity و cost آن بررسی می‌شوند. هیچ projectionی پیش از snapshot semantics و اولین مدل معتبر به‌عنوان verdict کامل معرفی نمی‌شود.

### ۲۰.۸ مرحلهٔ ۷ — Bridge

Bridge پس از آماده‌شدن exact projection بررسی می‌شود، چون generated text باید پیش از apply confirmation معنای ثابت داشته باشد.

### ۲۰.۹ مرحلهٔ ۸ — UI، dispatcher و defaults

Profile/executor indicator، freshness، apply state، dispatcher، pool policy، timeout policy، defaults و data-transfer policy در این مرحله تکمیل می‌شوند.

### ۲۰.۱۰ مرحلهٔ ۹ — Release gates

ترتیب فشردهٔ gateها:

```text
1  Governance پایه
2  تصمیم‌های بنیادین
3  mw.AllRows evidence + fixture
4  option/universe/parser evidence + fixture
5  snapshot + canonical computation
6  اولین مدل + parity + no-fabrication
7  chain source
8  calendar source
9  OI source
10 multiplier source
11 سایر مدل‌ها با parity و no-fabrication
12 exact A projection + capacity
13 bridge confirmation
14 source/min/release tests
15 owner approval و target v6.0
```

`docs/V5_CLEANUP.md` register اصلاحات v5.0 است و v5.0 را بی‌صدا تغییر نمی‌دهد. هر dependency جدید می‌تواند gateهای downstream وابسته را دوباره باز کند.

## ۲۱. V5_CLEANUP_SUMMARY

این فهرست خلاصهٔ موارد باز cleanup v5.0 است. شرح کامل، وضعیت و اقدام هر مورد در `docs/V5_CLEANUP.md` نگه‌داری می‌شود. این خلاصه v5.0 را بی‌صدا تغییر نمی‌دهد.

1. تعارض `A.5.4` دربارهٔ CDN reachable با `G.5.4` دربارهٔ same-origin network surface؛
2. تعارض freshness در K.6 با Appendix E؛
3. ابهام واحد `minVolume` و تفکیک `tvol` از `tval`؛
4. تفکیک‌نشدن semantics و condition مربوط به `abortThresholdInput`؛
5. نبود فرمول و missing policy صریح برای `maxStalePricePct`؛
6. نبود فرمول و zero/missing policy صریح برای `maxImbalanceRatio`؛
7. ابهام `poolAutoUpdate` در برابر `fetchAuto` و `storeAuto`؛
8. تعارض timeout شش تا هشت ثانیه در K.2.2 با delay مشاهده‌شدهٔ A.5.12؛
9. بررسی و تثبیت شماره‌گذاری A.5.10 و A.5.11؛
10. تفکیک policyهای پروژه از platform facts در A.7/A.8؛
11. scope و lifecycle `mw.AllRows`؛
12. bridge authoritative state و persistence؛
13. capacity واقعی Artifact A و allocation/lifecycle projection؛
14. option-chain، option-to-underlying، OI و multiplier؛
15. evidence pointer برای ادعاهای `Verified`.

## ۲۲. Approval Record — تأیید canonical مالک

```text
Canonical: Zharfa Smart Filter Contract v6.0
Current label: Architecture Contract v6.0
Status: approved for architecture/governance; product release gates remain open
Approved by: مالک پروژه
Approved at: 2026-10-04 Asia/Tehran
Signature/reference: D-2026-10-04-003 in docs/DECISIONS.md

Approval statement:
The owner approves this document as the canonical v6.0 architecture
and governance contract for the successor scope. The owner understands
that the remaining technical gates are still tracked in PENDING, that
this approval does not waive them, and that v0.1.0.0 remains a
governance-only release with no product shipping authorization.
```

این approval فقط canonical بودن قرارداد را ثبت می‌کند؛ release approval و production readiness باید از مسیر gateهای مستقل به‌دست آید.

**END OF CANONICAL ARCHITECTURE CONTRACT v6.0**
