# تصمیم‌های معماری Zharfa

این فایل تصمیم‌های Class B را از فرض‌های معماری، evidence پلتفرم و gateهای validation جدا می‌کند. مالک پروژه تصمیم‌گیرندهٔ نهایی است و این فایل در git به‌عنوان رجیستر نسخه‌دار نگه‌داری می‌شود. تصمیم‌های ثبت‌شده در این رجیستر مبنای قرارداد canonical v6.0 successor هستند؛ هیچ تصمیمی به‌تنهایی مجوز shipping یا production-ready بودن محصول نیست.

## D-2026-10-03-001: D2 Transport for Alpha

- **Class:** B — معماری/transport
- **Date:** 2026-10-03
- **Version:** Architecture Contract Alpha
- **Decision maker:** مالک پروژه
- **Status:** accepted for Alpha

### Question

D2 در Alpha برای ارتباط بین page-side adapter و local service از چه transportی استفاده کند؟

### Options considered

- A — WebSocket loopback
- B — HTTP/JSON control plane همراه با SSE برای progress و eventهای طولانی
- C — HTTP فقط با polling
- D — Native Messaging / Extension Port

### Chosen

**B — HTTP/JSON control plane + SSE progress/event stream**

### Reason

- jobهای تحلیل در Alpha عمدتاً batch هستند، نه streaming دوطرفهٔ کم‌تأخیر؛
- submit، status، result و cancel با HTTP/JSON قابل‌ردیابی و idempotent هستند؛
- SSE برای progress و eventهای طولانی کافی است؛
- debugging و replay ساده‌تر است؛
- همان message schema می‌تواند در آینده برای D3 استفاده شود؛
- WebSocket در صورت تبدیل‌شدن low-latency bidirectional streaming به نیاز سخت، بدون تغییر در core یا `AnalyticsExecutor` می‌تواند به‌عنوان transport دوم افزوده شود.

### Scope boundaries

سه سطح transport از هم جدا هستند:

```text
Page ↔ Worker          postMessage؛ داخلی D1 و بدون local service
Page ↔ Local Service   HTTP/JSON + SSE؛ فقط D2 در Alpha
Page ↔ Cloud           موضوع D3؛ در این تصمیم انتخاب نشده است
```

این تصمیم به local service اجازهٔ دسترسی به endpoint غیرمجاز TSETMC یا دورزدن network policy نمی‌دهد. انتقال D2 فقط برای job، snapshot، result و eventهای مربوط به همان job است.

### Fixed rules for Alpha

- local boundary فقط برای service محلی است و bind خارجی مجاز نیست؛
- endpoint browser-facing در کد hardcode نمی‌شود و از config می‌آید؛
- session token تصادفی و کوتاه‌عمر استفاده می‌شود؛
- Origin validation انجام می‌شود؛
- raw credential در message ارسال نمی‌شود؛
- message schema نسخه‌دار است؛
- `requestId`، `jobId`، `snapshotId`، sequence و acknowledgement ثبت می‌شوند؛
- retry نباید باعث اجرای duplicate ناخواسته شود؛
- eventهای transport در trace ثبت می‌شوند؛
- job lifecycle ماشین حالت صریح دارد:

```text
queued → running → done
                 → failed
                 → cancelled
                 → timed-out
```

- `cancel` idempotent است و slot منابع را آزاد می‌کند؛
- نتیجهٔ partial با `partial: true` و دلیل مشخص علامت می‌خورد و نتیجهٔ کامل محسوب نمی‌شود؛
- هر job روی snapshot immutable و `configHash` مشخص اجرا می‌شود؛
- SSE از event id و `Last-Event-ID` برای reconnect/replay استفاده می‌کند؛
- اگر replay ممکن نباشد، `reset` event صادر می‌شود؛
- خطاها به transient، permanent و user error تفکیک می‌شوند؛
- failure transport نباید snapshot یا verdict را بی‌صدا از بین ببرد؛
- WebSocket در transport پایهٔ Alpha نیست.

### Parameters not decided by this record

این تصمیم دربارهٔ موارد زیر انتخابی انجام نمی‌دهد:

- زبان local service؛
- پورت یا مسیر concrete؛
- authentication implementation نهایی؛
- اندازهٔ نهایی Worker pool؛
- hard-timeout عددی؛
- معماری و transport D3؛
- نام و شمارهٔ successor نهایی.

### Revisit condition

اگر streaming دوطرفهٔ کم‌تأخیر به نیاز سخت محصول تبدیل شود، transport دوم WebSocket با همان message schema و همان semantics job بررسی می‌شود.

## D-2026-10-03-002: Runtime Language Mapping for D1, D2 and D3

- **Class:** B — deployment/runtime architecture
- **Date:** 2026-10-03
- **Version:** Architecture Contract Alpha
- **Decision maker:** مالک پروژه
- **Status:** accepted for Alpha direction

### Question

زبان اجرای core و service در سه deployment چگونه mapping شود؟

### Chosen mapping

```text
D1 Browser-Native: Browser JavaScript + Web Worker
D2 Hybrid:         Node.js LTS local service
D3 Cloud:          Python cloud executor/service
```

### Clarifications

- Node.js runtime داخل صفحهٔ TSETMC اجرا نمی‌شود؛ D1 در browser با JavaScript و Worker اجرا می‌شود.
- D2 از Node.js LTS برای HTTP/JSON + SSE، اجرای job و Worker/process pool استفاده می‌کند.
- D3 برای executor یا service ابری Python را انتخاب می‌کند؛ انتخاب Serverless، Container، VM و topology هنوز باز است.
- این تصمیم به معنی دو منطق مستقل نیست. canonical computation، schema، rounding، missing semantics، model version و cross-language parity باید مشترک باشند.
- هستهٔ JavaScript D1 و D2 می‌تواند مشترک باشد، اما D3 Python فقط پس از parity fixture و test معتبر eligible می‌شود.
- انتخاب Python برای D3 مجوز cloud scrape یا دورزدن network policy TSETMC نیست.

### Reason

- D1 با JavaScript موجود و محدودیت browser سازگار می‌ماند؛
- D2 کمترین فاصله را با هستهٔ فعلی و parity اولیه دارد؛
- D3 از اکوسیستم Quant پایتون برای مدل‌های عددی سنگین استفاده می‌کند؛
- transport و core مستقل از زبان باقی می‌مانند.

### Still open

این تصمیم موارد زیر را انتخاب نمی‌کند:

- packaging و distribution دقیق Node.js؛
- Python runtime packaging؛
- libraryهای عددی مجاز؛
- ترتیب اجرای executorها؛
- parity fixtures و release gateهای نهایی.

## D-2026-10-03-003: D3 Cloud Topology for Alpha

- **Class:** B — cloud/deployment architecture
- **Date:** 2026-10-03
- **Version:** Architecture Contract Alpha
- **Decision maker:** مالک پروژه
- **Status:** accepted for Alpha direction

### Question

D3 برای اجرای Python cloud executor/service در Alpha از چه topologyای استفاده کند؟

### Options considered

- A — Serverless
- B — Managed Container
- C — VM

### Chosen

**B — Managed Container**

### Scope

```text
HTTPS/API boundary
        │
        ▼
Python managed-container service
        │
        ├── job queue
        ├── bounded worker pool
        ├── job lifecycle
        └── snapshot/result adapter
                    │
             managed storage
```

### Reason

- jobهای طولانی SVI، GARCH و Surface به محیط پایدار نیاز دارند؛
- dependencyهای Python و native numerical libraries قابل pin کردن هستند؛
- Worker pool، hard timeout، cancel و SSE/event stream قابل‌کنترل می‌مانند؛
- محیط local و cloud قابل parity و versioning است؛
- scale افقی بدون حذف instrument یا کاهش accuracy ممکن است؛
- Alpha به Kubernetes الزام ندارد؛ managed container ساده‌تر از orchestration کامل است؛
- VM مسئولیت patching، security و availability بیشتری بر پروژه تحمیل می‌کند؛
- Serverless برای auxiliary یا jobهای کوتاه آینده قابل بررسی است، اما executor اصلی D3 در Alpha نیست.

### Fixed boundaries

- cloud حق scrape مستقل TSETMC را ندارد؛
- snapshot از client یا منبعی می‌آید که مستقل و مجاز تأیید شده باشد؛
- managed container نباید network policy acquisition را دور بزند؛
- حذف instrument، approximate substitution و stale-as-fresh ممنوع است؛
- storage و job state باید snapshot/config/model version را نگه دارند.

### Still open

این تصمیم موارد زیر را انتخاب نمی‌کند:

- cloud provider؛
- container runtime و image registry؛
- managed storage product؛
- authentication و authorization implementation؛
- data residency، retention و deletion policy؛
- D3 transport concrete و event-stream implementation؛
- topology جزئی scaling و availability.

## D-2026-10-03-004: Successor Version Policy

- **Class:** B — governance/versioning
- **Date:** 2026-10-03
- **Version:** Architecture Contract Alpha
- **Decision maker:** مالک پروژه
- **Status:** accepted policy for Alpha

### Decision

- سند فعلی تا پایان gateهای لازم بدون شماره و با عنوان `Architecture Contract Alpha` باقی می‌ماند؛
- پس از تکمیل مجموعهٔ پنج تصمیم Class B، نام هدف successor برابر `v6.0` خواهد بود؛
- تبدیل عنوان به successor v6.0 به‌تنهایی مجوز shipping نیست و همچنان به بسته‌شدن gateهای فنی و تأیید نهایی مالک نیاز دارد؛
- تا آن زمان هیچ عنوان v5.1، v6.0-alpha یا شمارهٔ دیگری برای سند Alpha اعمال نمی‌شود.

### Reason

افزودن D1/D2/D3، transport D2، چند executor، canonical parity، projection دقیق و policyهای network/data-transfer تغییر معماری محسوب می‌شود و از یک patch افزایشی v5.1 بزرگ‌تر است.

## D-2026-10-03-005: Dependency/Gate-Driven Contract and Implementation Order

- **Class:** B — contract/process architecture
- **Date:** 2026-10-03
- **Version:** Architecture Contract Alpha
- **Decision maker:** مالک پروژه
- **Status:** accepted for Alpha process

### Decision

گزینهٔ dependency/gate-driven به‌عنوان ترتیب رسمی انتخاب شد. ترتیب متنی ساده و feature-first مبنا قرار نمی‌گیرند.

### Required refinements

1. مرحلهٔ ۱ به دو بخش تقسیم می‌شود:
   - **۱.الف — Governance پایه:** ساختار `docs/DECISIONS.md`، `docs/PENDING.md` و evidence ledger، سطوح ادعا، Artifact A/B، D1/D2/D3 و Alpha بدون شماره؛
   - **۱.ب — تصمیم‌های بنیادین:** تصمیم‌های Class B پیش از شروع طراحی وابسته؛ تصمیم‌های transport، runtime mapping، D3 topology و version policy اکنون ثبت شده‌اند؛ Alpha scope هنوز باید صریحاً تعیین شود.
2. Data و Transport به‌صورت co-design پیش می‌روند:
   - شاخهٔ Data: PART K/R، page-memory evidence، fixture و source gates؛
   - شاخهٔ Transport: PART T/U، message schema و lifecycle؛
   - نقطهٔ تلاقی: canonical snapshot/message schema و network boundary.
3. Parity یک gate یک‌باره نیست؛ با هر مدل از اولین مدل به‌صورت پیوسته اجرا می‌شود.
4. No-fabrication test از اولین مدل آغاز می‌شود و همراه هر مدل توسعه می‌یابد.
5. chain، calendar، OI و multiplier gateهای مستقل‌اند و می‌توانند پس از آماده‌شدن governance به‌صورت موازی validation شوند.
6. PART N به زیرمرحله‌های وابسته به داده شکسته می‌شود: Greeks/IV، GARCH، Spread، SVI، GEX/DEX، Flow و Surface.
7. `docs/V5_CLEANUP.md` ثبت اصلاحات لازم v5.0 است و v5.0 را بی‌صدا تغییر نمی‌دهد.
8. Alpha scope به‌عنوان تصمیم جداگانه و صریح باقی می‌ماند؛ فهرست in/out پیشنهادی تا تأیید مالک، scope مصوب یا reduction محصول محسوب نمی‌شود.

### Compressed gate order

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

### Revisit condition

اگر یک dependency جدید بر semantics یا source اثر بگذارد، فقط همان مرحله بازبینی نمی‌شود؛ gateهای downstream که به آن وابسته‌اند نیز دوباره ارزیابی می‌شوند.

## D-2026-10-04-001: Successor License Scope and Authority

- **Class:** B — حقوق، lineage و governance انتشار
- **Date:** 2026-10-04
- **Version:** `tseZharfaKavosh v0.1.0.0` / Architecture Contract Alpha
- **Decision maker:** مالک پروژه
- **Status:** accepted by owner declaration; scope canonicalized by `D-2026-10-04-003`

### Question

آیا owner اختیار دارد successor را از Smart-FFA-1.0 به Smart-FFA-1.1 منتقل کند و این انتقال چگونه با upstream/fork lineage مرزبندی شود؟

### Owner declaration

مالک پروژه صریحاً اعلام کرده است: «مالک هر سه خودم هستم»؛ منظور از هر سه، upstream، fork و successor است. این declaration در این رجیستر به‌عنوان مبنای اختیار انتشار successor ثبت می‌شود.

### Chosen scope

- `Smart-FFA-1.1 (Free Fork with Attribution and Optional Donation)` فقط برای successor `tseZharfaKavosh v0.1.0.0` و مواد صریحاً مجاز همان release اعمال می‌شود.
- upstream `tseOption_ExoticFilter v0.0.4.6`، forkهای تاریخی و artifactهای پیشین notice و lineage تاریخی خود را حفظ می‌کنند؛ این تصمیم مجوز آن‌ها را retroactively بازنویسی نمی‌کند.
- attribution زیر باید در successor و هر fork/derivative حفظ شود: `https://t.me/p75ad`، `https://t.me/SmartOptionTSE`، lineage و `© ۱۴۰۵ — حقوق مؤلف محفوظ است`.
- successor در v0.1.0.0 محصول اجرایی، adapter، core logic، UI، compiler یا live probe ارائه نمی‌کند؛ آماده‌سازی حقوقی و scaffold governance به‌تنهایی approval فنی یا shipping محسوب نمی‌شود.
- هر LEGAL module، footer اجرایی یا source modification بعدی فقط پس از scope/approval و gateهای مربوط انجام می‌شود و نباید مجوز یا lineage را با upstream مخلوط کند.

### Reason

اعلام مستقیم مالک، ابهام اختیار صدور successor license را رفع می‌کند؛ ثبت scope جداگانه مانع می‌شود که تغییر successor به‌عنوان تغییر خاموش مجوز upstream تفسیر شود.

### Non-effects

این تصمیم:

- سند Architecture Contract Alpha را canonical v6.0 نمی‌کند؛
- Approval Record را پر نمی‌کند؛
- هیچ probe زنده، کد محصول یا feature را مجاز نمی‌کند؛
- تعهدی برای donation، payment processor یا فعال‌کردن channel ایجاد نمی‌کند.

## D-2026-10-04-002: Optional Donation Policy for Smart-FFA-1.1

- **Class:** B — حقوق، sustainability و privacy
- **Date:** 2026-10-04
- **Version:** `tseZharfaKavosh v0.1.0.0`
- **Decision maker:** مالک پروژه
- **Status:** accepted policy; canonical interpretation recorded by `D-2026-10-04-003`

### Question

Donation در successor چگونه مجاز باشد بدون آن‌که به استفاده، fork، انتشار، feature یا privacy گره بخورد؟

### Chosen

**C — Donation کاملاً اختیاری و جدا از مجوز**

### Fixed policy

- donation داوطلبانه و اختیاری است؛
- donation license fee، subscription، royalty، شرط استفاده، شرط fork یا شرط redistribution نیست؛
- donation هیچ feature یا سطح دسترسی را unlock نمی‌کند؛
- project donation status را track یا store نمی‌کند؛
- donation status در UI، compiler، analytics، priority support یا roadmap اثر ندارد؛
- تا زمانی که owner channel واقعی را ثبت نکند، هیچ donation destination فعال یا ساختگی اعلام نمی‌شود؛
- fork می‌تواند channel upstream را نگه دارد، حذف کند، channel خود را اضافه کند یا هر دو را با تفکیک روشن نگه دارد؛
- fork حق ندارد attribution upstream را با channel خود جایگزین کند یا donation را شرط feature قرار دهد؛
- privacy پرداخت، در صورت استفاده از processor ثالث، بر عهدهٔ policy همان processor است و پروژه دادهٔ donor را مطالبه نمی‌کند.

### Canonical references

- متن مجوز: `LICENSE`
- سیاست و channel placeholder: `DONATION.md`
- contract interpretation: PART F.8.14 و PART H در `docs/ARCHITECTURE_CONTRACT_v6.0.md`

### Non-effects

این تصمیم Approval Record، canonical v6.0، live probe، LEGAL runtime module یا donation channel واقعی ایجاد نمی‌کند.

## D-2026-10-04-003: Owner Approval and Canonicalization of v6.0

- **Class:** B — governance/release contract
- **Date:** 2026-10-04
- **Version:** `Zharfa Smart Filter Contract v6.0`
- **Decision maker:** مالک پروژه
- **Status:** accepted; canonicalization approved for architecture/governance

### Question

آیا قرارداد successor پس از ثبت تصمیم‌های Class B، ایجاد governance files و تعیین scope مجوز، به‌عنوان قرارداد canonical v6.0 ثبت شود؟

### Owner approval

مالک پروژه دستور صریح داده است: «قرارداد را نهائی کن و ریپوزیتوری جدید را ساختم خودت فایلهای لازم را انتقال بده و آماده شروع تولید بشو». این دستور به‌عنوان تأیید مالک برای canonical شدن قرارداد معماری و governance ثبت می‌شود.

### Chosen

`docs/ARCHITECTURE_CONTRACT_v6.0.md` قرارداد canonical successor است.

### Scope of approval

- canonicalization فقط scope معماری، governance، legal policy و contract را پوشش می‌دهد؛
- `tseZharfaKavosh v0.1.0.0` همچنان governance-only است و adapter، core logic، UI، compiler، live probe یا market-data runtime ندارد؛
- gateهای فنی باز در `docs/PENDING.md` باقی می‌مانند و این تصمیم آن‌ها را silently close یا waive نمی‌کند؛
- شروع production به معنی شروع کار قراردادی و validation است، نه مجوز shipping یا ادعای production-ready بودن؛
- ترتیب بعدی مصوب همان `contracts/01-data-source/spec.md`، سپس probe تأییدشدهٔ `mw.AllRows` و ثبت `E-011` است؛
- هر probe زنده، source modification یا product code به approval و gate مستقل خود نیاز دارد.

### Required references

- قرارداد canonical: `docs/ARCHITECTURE_CONTRACT_v6.0.md`
- تصمیم‌های باز و gateها: `docs/PENDING.md`
- evidence و provenance: `docs/EVIDENCE_LEDGER.md`
- مجوز successor: `LICENSE`
- donation policy: `DONATION.md`

### Non-effects

این تصمیم:

- gateهای فنی را بسته اعلام نمی‌کند؛
- release اولیه را production-ready اعلام نمی‌کند؛
- مجوز انتقال یا تغییر silent در artifactهای تاریخی upstream را نمی‌دهد؛
- مجوز اجرای live probe بدون ثبت approval و evidence نمی‌دهد.

## D-2026-10-05-001: Alpha Scope — Full (D1+D2+D3 + All Models)

- **Class:** B — product scope
- **Date:** 2026-10-05
- **Version:** `tseZharfaKavosh v0.1.0.0` / Architecture Contract v6.0 — post push 6e1356c
- **Decision maker:** مالک پروژه
- **Status:** accepted — replaces P-DEC-001 open

### Question

دامنهٔ دقیق Alpha چه باشد و کدام ماژول‌ها به successor بعدی phased شوند؟

### Owner choice

مالک صریحاً گزینهٔ **Full** را انتخاب کرد (پرسش «اول دامنه» → پاسخ «full» → تایید «بله» در 2026-10-05).

### Chosen — Full scope (no phased deferral)

```text
✅ D1 Browser-Native (exact projection ParTree=15131F)
✅ D2 Hybrid Node.js (HTTP/JSON+SSE)
✅ D3 Managed Container Python (از روز اول)
✅ Greeks/IV
✅ Spread
✅ SVI + VolSurface کامل
✅ GEX/DEX
✅ Flow
✅ GARCH
✅ bridge خودکار (ApplyBridge)
⛔ هیچ ماژولی به فاز بعد موکول نمی‌شود
```

### Implications recorded

- `G-09 OI` و `G-10 multiplier` باید **منبع مستقل** معرفی و probe شوند — بدون آن GEX/DEX/Flow ناممکن است (نیاز جدا در E-017/E-018 ثابت شد).
- `G-11` سایر مدل‌ها همگی در Alpha باید parity + no-fabrication بدهند — نه فقط Spread.
- `G-17 D3` provider و `G-13 bridge` دیگر phased نیستند و در همین Alpha باید حل شوند.
- ترتیب dependency-driven پابرجا می‌ماند: `data → snapshot → models → projection → bridge → release` — میان‌بُر مجاز نیست.
- این تصمیم `P-DEC-001` را می‌بندد؛ `P-DEC-002 privacy` همچنان باز است و پیش از هر انتقال D3 باید بسته شود.

### Non-effects

- این تصمیم privacy/data-transfer policy را تعیین نمی‌کند؛
- provider و region و storage D3 را انتخاب نمی‌کند؛
- خودکار بودن bridge مجوز دورزدن network policy نیست.

## D-2026-10-05-002: Privacy و Data-Transfer Policy — Option A (Strict)

- **Class:** B — privacy / data-transfer
- **Date:** 2026-10-05
- **Version:** `tseZharfaKavosh v0.1.0.0` / Contract v6.0 — post D-2026-10-05-001
- **Decision maker:** مالک پروژه
- **Status:** accepted — replaces P-DEC-002 open

### Question

دادهٔ بازار، snapshot، result و متن filter در هر deployment چه زمانی از دستگاه خارج می‌شوند؟

### Owner choice

مالک گزینهٔ **A — سخت‌گیرانه** را انتخاب کرد (2026-10-05).

### Chosen — Option A (Strict, no-server-upload by design + explicit opt-in)

```text
D1 Browser-Native:  هیچ upload به service پروژه ندارد — همه‌چیز در page/worker می‌ماند
D2 Hybrid:          local-first — داده فقط روی localhost می‌ماند؛ هر sync ابری فقط با opt-in صریح job-level
D3 Cloud:           فقط با opt-in صریح و موردی هر job — بدون opt-in هیچ snapshot/result/filter به cloud نمی‌رود
```

### Fixed rules

- هیچ داده‌ای بدون رضایت صریح به سرور پروژه یا ثالث ارسال نمی‌شود؛
- انتقال D3 فقط برای jobهایی که کاربر صریحاً «ارسال به ابر» را تایید کرده — پیش‌فرض local است؛
- متن filter، inscode، snapshot و result تا تایید، فقط در حافظهٔ محلی؛
- log و trace ابری فقط با همان رضایت و فقط برای job تاییدشده؛
- provider ثالث (اگر بعداً انتخاب شد) تابع privacy همان provider است — پروژه دادهٔ donor یا کاربر را مطالبه نمی‌کند.

### Non-effects

- این تصمیم provider، region یا retention را انتخاب نمی‌کند؛
- این تصمیم D3 را از Alpha حذف نمی‌کند — فقط انتقال را مشروط می‌کند.
# D-2026-10-06-004: Interface Architecture — 4 Remaining Ambiguities

- **Class:** B — interface / data-source / filter
- **Date:** 2026-10-06
- **Version:** v0.2.2-alpha → v0.3.0 planning
- **Decision maker:** مالک پروژه
- **Status:** accepted — Owner choices 1-4 recorded

## Question

4 ابهام باقی‌مانده پس از تکمیل OI via CDN و انجین فیلتر خوب — هرکدام نیاز به انتخاب صریح داشت.

## Owner Choices (2026-10-06)

### 1. قرارداد CDN OI vs api.tsetmc.com
**سوال:** cdn.tsetmc.com (GetInstrumentOptionByInstrumentID 36/36 بدون credential) را منبع رسمی G-09/G-10 کنیم یا api.tsetmc.com را مرجع نگه داریم؟

**انتخاب مالک:** **گزینه 2 با هشدار به کاربر** — `api.tsetmc.com` مرجع canonical در spec v0.3.0 می‌ماند، `cdn.tsetmc.com` به‌عنوان **fallback رسمی بدون credential** ثبت می‌شود و در UI با هشدار «منبع CDN — تطبیق صفحه 4,969 → 4,972» نمایش داده می‌شود.

**دلیل:** api تائیدشده با ali-derogar است ولی محدود؛ CDN همان دیتای صفحه خود نماد است و 36/36 live شد — بدون هشدار گمراه‌کننده است.

### 2. وزن‌دهی SVI full
**سوال:** SVI partial بدون وزن OI است (w 0.38) — برای full با OI چطور وزن دهیم؟ OI*1000 مستقیم یا sqrt/log؟

**انتخاب مالک:** **با انتخاب کاربر** — UI به کاربر اجازه دهد بین `OI*1000` مستقیم، `sqrt(OI)` و `log(OI)` انتخاب کند؛ پیش‌فرض `OI*1000` (همان GEX).

### 3. فیلتر 1559 vs B predicate
**سوال:** exact A 20267 >4096 جا نمی‌شود، B predicate 420 fits خوب است — کدام نمایش داده شود؟

**انتخاب مالک:** **هر دو حالت در دسترس باشد با انتخاب کاربر** — UI هر دو `exact` و `B predicate` را نشان دهد و کاربر یکی را برای اعمال انتخاب کند؛ پیش‌فرض `B`.

### 4. تقویم و پروفایل حقیقی/حقوقی
**سوال:** 23 سررسید 1405 همه آینده، و پروفایل حقیقی/حقوقی (22.6% vs 69.8%) — نمایش و کنترل خودکار؟

**انتخاب مالک:** **نمایش سررسیدها و کنترل خودکار + حقیقی/حقوقی با انتخاب کاربر** — تقویم 23 سررسید نمایش داده شود و هر روز 04:00 stale چک خودکار شود؛ حقیقی/حقوقی هم با انتخاب کاربر فیلتر شود، نه اجباری.

## Implementation

- spec v0.3.0: G-09/G-10 هر دو منبع (api canonical + cdn fallback با هشدار) ثبت می‌شود
- SVI full: selector در UI (3 گزینه وزن)
- Filter: toggle exact/B در UI
- Calendar: display 23 + auto check 04:00
- ClientType: toggle حقیقی/حقوقی با انتخاب کاربر

## Non-effects

- انجین فیلتر دست نمی‌خورد — فقط نمایش دو حالت
- SVI partial فعلی valid می‌ماند — full در v0.3.0
- هیچ fabricate با OI انجام نمی‌شود
