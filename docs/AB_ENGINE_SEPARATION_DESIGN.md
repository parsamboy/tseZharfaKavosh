# A/B Engine Separation — Final Design

**تاریخ:** 2026-10-17  
**وضعیت:** **v0.1.0 پیاده‌سازی شد** — `src/engine/bEngine.v0.1.0.js` + `src/engine/aLookup.v0.1.0.js`، ۶۹/۶۹ تست parity پاس (E-042). اجرای live هنوز باقی است.  
**مرجع:** E-037, E-038, E-039, E-040, E-041, E-042 (Evidence Ledger)

---

## ۱. معماری کلی

```
┌─────────────────────────────────────────────────────────┐
│  B — Engine (UX + Settings + Data + Computation)        │
│  ─────────────────────────────────────────────────────  │
│  • Runs independently (once per snapshot)               │
│  • Owns: mw.AllRows, mw.Settings, FilterCode, SaveParams│
│  • Computes: Funnel (BS+IV, Greeks, etc.)              │
│  • Publishes: mw.__B_result (immutable bitset)         │
│  • Guard: runs only if snapshotId or configHash changed │
│  • Async: setTimeout/requestIdleCallback (not in       │
│    RenderData)                                          │
│  • Fail-closed (B): error → keep PREVIOUS valid state, │
│    publish nothing partial                              │
└──────────────────────┬──────────────────────────────────┘
                       │ publishes (atomic swap)
                       ▼
┌─────────────────────────────────────────────────────────┐
│  A — Per-Row Lookup (inside FilterCode/RenderData)       │
│  ─────────────────────────────────────────────────────  │
│  • Does ONLY lookup of B's published bitset            │
│  • FilterResult = bitset[pos] (O(1))                   │
│  • Fail-open (A): no valid published result → true     │
│    (user sees MORE, never an empty page)               │
│  • No computation, no dirty-tracking, no state         │
│  • ~0.01ms per row (bitset lookup)                     │
└─────────────────────────────────────────────────────────┘
```

### اصول کلیدی

1. **B مستقل اجرا می‌شود** — UX + settings + data + engine در B است
2. **A فقط lookup می‌کند** — هیچ computation، dirty-tracking یا state در A
3. **B فقط یک‌بار per snapshot اجرا می‌شود** — guard با snapshotId + configHash
4. **دو معنای مجزای fail دارند** (بند ۲.۸ را ببینید):
   - B: error → نتیجهٔ قبلی حفظ می‌شود، هیچ partial publish نمی‌شود
   - A: اگر نتیجهٔ معتبر منتشر نشده → `true` (کاربر همه را می‌بیند، صفحهٔ خالی نه)
5. **minify candidate بازنشسته نمی‌شود** — evidence 61 PrepareFilterCode rules حفظ می‌شود

---

## ۲. B — Engine Design

### ۲.۱ State (on mw)

```javascript
mw.__B_index       // {inscode: position} — reverse index (O(1) lookup)
mw.__B_rowIndex    // {inscode: row} — فقط aid/debug؛ compute هرگز از آن نمی‌خواند
mw.__B_symbols     // [inscode, ...] — ordered symbol list
mw.__B_bitset      // Uint8Array — compressed result (1 bit per symbol)
mw.__B_prevRows    // {inscode: {tvol, pl, tno, pcp}} — for dirty detection
mw.__B_totalRuns   // number — run counter
mw.__B_indexRebuilds / __B_indexCacheHits // number — شاخص کارایی index
mw.__B_snapshotId  // string — last processed snapshot
mw.__B_configHash  // string — last processed config
mw.__B_configVersion // number — increments on SaveSettings/SaveParams
mw.__B_result      // {meta: {...}} — published metadata
mw.__B_meta        // {snapshotId, configHash, computedAt, dirtyCount, ...}
```

### ۲.۲ Global Helpers (new Function — JIT-optimizable)

```javascript
// MUST use new Function() — eval-defined functions are 12× slower (JIT-blocked)
window.__B_erf = new Function('x', 'var t=1/(1+0.3275911*Math.abs(x)); ...');
window.__B_bsDelta = new Function('S','K','T','r','sigma', '...');
window.__B_solveIV = new Function('S','K','T','r','marketPrice', '...');
```

**علت:** توابع تعریف‌شده در `eval` توسط JIT بهینه نمی‌شوند (dynamic scope). `new Function()` تابع را در global scope تعریف می‌کند (JIT-optimizable).

### ۲.۳ Hooks (configVersion tracking)

```javascript
// SaveSettings hook (this=window — NOT mw)
var __origSaveSettings = mw.SaveSettings;
mw.SaveSettings = function() {
    mw.__B_configVersion = (mw.__B_configVersion || 0) + 1;
    if (typeof __origSaveSettings === 'function') {
        try { __origSaveSettings.apply(window, arguments); }
        catch(e) { /* log */ }
    }
};

// SaveParams hook (this=window)
var __origSaveParams = mw.SaveParams;
mw.SaveParams = function() {
    mw.__B_configVersion = (mw.__B_configVersion || 0) + 1;
    if (typeof __origSaveParams === 'function') {
        try { __origSaveParams.apply(window, arguments); }
        catch(e) { /* log */ }
    }
};
```

**مهم:** `this=window` (نه `this=mw`) — `mw.SaveSettings` internally accesses `this.Instruments` which is on `window`.

### ۲.۴ Guard + Dual Trigger

```javascript
var __snapshotId = 'snap-' + (mw.RoundNo || 0) + '-' + Object.keys(mw.AllRows).length;
var __configHash = (mw.__B_configVersion || 0) + '-' + (mw.FilterCode ? mw.FilterCode.length : 0);

var __needRun = (__snapshotId !== mw.__B_snapshotId) || (__configHash !== mw.__B_configHash);

if (__needRun) {
    // ... dirty detection + compute ...
}
```

- **snapshotId:** از `mw.RoundNo` + تعداد rows (تغییر با هر snapshot جدید)
- **configHash:** از `configVersion` + `FilterCode.length` (تغییر با settings change)
- **B فقط وقتی یکی از این دو تغییر کند اجرا می‌شود**

### ۲.۵ Dirty Detection (O(n) once per cycle)

پیاده‌سازی: `bEngine.detectDirty(rows)` → `{dirty, rowMap, count}` (بدون mutation).

```javascript
const DIRTY_FIELDS = ['pl', 'plc', 'l18', 'l30', 'tvol', 'tno', 'pcp'];
```

- **O(n)** — یک‌بار per cycle (نه per row)
- **۷ فیلد، نه ۴:** مجموعهٔ اولیهٔ probe (`tvol/pl/tno/pcp`) **`plc` را جا انداخته بود**.
  `plc` (قیمت بازار) ورودی مستقیم `impliedVol` است؛ تغییرش بدون بازمحاسبه می‌ماند و
  بیت قدیمی می‌ماند (bug صحت). `l18/l30` هم ورودی parse (strike/kind) هستند.
  این باگ با تست stale-row در `probes/engine.parity.v1.js` گرفته شد.
- **بدون mutation:** `prevRows` فقط بعد از چرخهٔ موفق (`commitDirty`) advance می‌شود؛
  در حالت fail-closed، ردیف‌های ناموفق در چرخهٔ بعد retry می‌شوند.
- `rowMap` شیء row **جاری** هر dirty را نگه می‌دارد؛ compute هرگز به row کش‌شده
  (`__B_rowIndex`) وابسته نیست.

### ۲.۶ Compute Phase (O(dirty) with O(1) lookup)

قبل از compute، `ensureIndex()` ایندکس را فقط وقتی می‌سازد که مجموعهٔ نمادها عوض شده
باشد (count + نمونه‌برد ۱۶ inscode). صفحه فیلدها را in-place mutate می‌کند، پس کلیدها
پایدارند؛ ساخت ۳۲۸۲ کلید در هر چرخه ۱.۴-۱.۷ms بی‌دلیل هزینه داشت (۵۰٪ بودجهٔ cycle).
گزینهٔ `strictIndex` برای rebuild اجباری در هر چرخه موجود است.

```javascript
var __newResult = new Uint8Array(mw.__B_bitset.length);
// copy current bitset
for (var __c = 0; __c < mw.__B_bitset.length; __c++) __newResult[__c] = mw.__B_bitset[__c];

var __solveIV = window.__B_solveIV;  // local ref (JIT)
var __bsDelta = window.__B_bsDelta;  // local ref (JIT)

for (var __d = 0; __d < __dirty.length; __d++) {
    var __ins = __dirty[__d];
    var __row = mw.__B_rowIndex[__ins];  // O(1) lookup
    if (__row) {
        // Funnel logic (BS+IV, Greeks, etc.)
        var __S = parseFloat(__row.pl) || 72813;
        var __K = parseFloat(__row.pc) || 72000;
        var __T = 0.082;
        var __r = 0.2;
        var __iv = __solveIV(__S, __K, __T, __r, parseFloat(__row.plc || __row.pcp || 1));
        var __delta = __bsDelta(__S, __K, __T, __r, __iv);
        var __gamma = Math.exp(-Math.pow(Math.log(__S/__K)+(__r+__iv*__iv/2)*__T,2)/(2*__iv*__iv*__T))/(__S*__iv*Math.sqrt(2*Math.PI*__T));
        var __pass = (__delta > 0.3) && (__gamma > 1e-4) && (__iv < 1.0) && (__iv > 0.01);

        var __pos = mw.__B_index[__ins];  // O(1) lookup
        if (__pos !== undefined) {
            var __byteIdx = Math.floor(__pos / 8);
            var __bitIdx = __pos % 8;
            if (__pass) __newResult[__byteIdx] |= (1 << __bitIdx);
            else __newResult[__byteIdx] &= ~(1 << __bitIdx);
        }
    }
}

// Atomic swap
mw.__B_bitset = __newResult;
mw.__B_snapshotId = __snapshotId;
mw.__B_configHash = __configHash;
mw.__B_totalRuns = (mw.__B_totalRuns || 0) + 1;
mw.__B_meta = {snapshotId: __snapshotId, configHash: __configHash, computedAt: new Date().toISOString(), dirtyCount: __dirty.length, totalSymbols: mw.__B_symbols.length, bitsetBytes: mw.__B_bitset.length, configVersion: mw.__B_configVersion, elapsedMs: __elapsed};
```

### ۲.۷ Publish (atomic swap)

- **قبل از swap:** bitset جدید ساخته می‌شود (copy + update)
- **swap:** `mw.__B_bitset = __newResult` (atomic — یک assignment)
- **هیچ reset-then-fill نیست** — race condition وجود ندارد
- **partial result publish نمی‌شود** — فقط بعد از compute کامل

### ۲.۸ Fail-Closed

```javascript
try {
    // ... entire B computation ...
} catch(e) {
    console.error('[B] Error:', e.message);
    // B FAIL-CLOSED: publish NOTHING. Previous mw.__B_bitset stays as-is.
    // If this was the FIRST run (no previous bitset), A has nothing valid to
    // read and therefore returns true for every row (fail-open) — see §3.
}
```

> **دو معنای fail — تفکیک‌شده (اصلاح تناقض ۱، ۲۰۲۶-۱۰-۱۷):**
> «fail-closed» فقط دربارهٔ **B** است: B هیچ نتیجهٔ ناقص یا خرابی را publish نمی‌کند.
> «fail-open» فقط دربارهٔ **A** است: اگر B نتیجهٔ معتبری منتشر نکرده باشد (اولین اجرا
> یا خطا)، A برای همهٔ ردیف‌ها `true` برمی‌گرداند — کاربر **همهٔ** ردیف‌ها را می‌بیند.
> اگر برعکس باشد (A روی خطای B `false` بدهد) صفحهٔ خالی می‌شود — فاجعه.
> عبارت «B fail-closed → halt» به معنای «متوقف شدن publish» است، نه «متوقف شدن A».

---

## ۳. A — Per-Row Lookup (inside FilterCode)

بدنهٔ **پیاده‌شده** در `src/engine/aLookup.v0.1.0.js` (`buildFilterCodeBody()`، ۴۳۰ بایت):

```javascript
// tseZharfaKavosh A lookup 0.1.0-aLookup-001 — reads only B published projection
var FilterResult = true;
var __i = mw.__B_index;
if (__i && mw.__B_known && mw.__B_bitset && row) {
  var __p = __i[row.inscode];
  if (__p !== undefined) {
    var __b = __p >> 3, __m = __p & 7;
    if (__b >= 0 && __b < mw.__B_known.length && (mw.__B_known[__b] >> __m) & 1) {
      FilterResult = !!((mw.__B_bitset[__b] >> __m) & 1);
    }
  }
}
```

هر شاخهٔ `if` یک **خروج fail-open** است: نبود projection، نبود `__B_index` (اولین
RenderData پیش از B)، نبود `known`/`bitset`، نماد ناشناس، یا بایت خارج از بازه —
همه `true` برمی‌گردانند. اگر برعکس بود (throw یا `false`)، TSETMC پیش‌فرض خود را
اعمال می‌کرد و صفحهٔ خالی 가능 می‌شد.

- **O(1)** — bitset lookup (`>> 3` / `& 7` به جای `/8` و `%8`: معنای یکسان، ارزان‌تر)
- **Fail-open** — هر عدم‌قطعییت → `true`
- **هیچ computation** — فقط lookup
- **هیچ state** — stateless
- **~0.01ms per row**
- **parity**: `evaluateRow` و همین بدنه روی ۳۲۸۲/۳۲۸۲ ردیف یکسان جواب دادند

---

## ۴. Performance Summary

> **وضعیت اعداد:** اعداد «live» از probe های سایت زنده (old.tsetmc.com، parTree 15131F)
> گرفته شده‌اند؛ اعداد «local bench» از `probes/perf.computeFunnel.benchmark.v1.js`
> (node 22، کد **واقعی** repo، دادهٔ مصنوعی) هستند. تناقض ۲ و ۳ در §۱۱ ثبت و
> **با اجرای live v1 بسته** شده‌اند.

| سناریو | زمان | منبع | قابل قبول؟ |
|---|---|---|---|
| Per-row funnel (parse+impliedVol+bsGreeks) — **live** | **16.16 μs** | live perf.funnel.v1 [کنسول] | ✅ |
| Per-row funnel — local bench (warm) | 8.4 μs | local bench | ✅ (خوش‌بینانه؛ live ۲× آن است) |
| impliedVol روی قیمت‌های بازار واقعی | p50=24, max=24, **۷۷٪ ردیف‌ها در سقف** | live v1 | ✅ هزینه **پایدار و پیش‌بینی‌پذیر** |
| bsGreeks (σ معلوم) | 0.74 μs | local bench | ✅ |
| Funnel روی ۹۹۶ ردیف آپشن (live) | **16.1 ms** | live v1 | ✅ |
| parse روی همهٔ ۳۲۸۹ نماد | 4.2 ms | live v1 | ✅ |
| Cold single-shot impliedVol | 0.0–0.1 ms | live v1 | ✅ یک‌بار |
| **Full recompute (run 1، live)** | **~18.4 ms** (detectDirty 2.3 + funnel 16.1) | live v1 [کنسول] | ✅ یک‌بار per snapshot |
| Full recompute در probe v9 (funnel سبک‌تر + bitset/index) | 40 ms | live v9 [TextArea] | ✅ هم‌مرتبه |
| Incremental — فقط compute (live) | 0.8–1.0 ms | live v9 [TextArea] | ✅ |
| detectDirty (۴ فیلد × ۳۲۸۹) | **2.3 ms** | live v1 [کنسول] | مستقل از compute |
| **Incremental — کل چرخه (compute + detectDirty)** | **~2.6–3.4 ms** | live v1 + v9 | ✅ زیر آستانهٔ ۵ms |
| parity suite (node، ۹۴ تست) | ۹۴/۹۴ پاس | engine.parity.v1 | ✅ |
| full recompute با mapping مالک | ۱۲.۷–۱۶.۰ms | engine.parity.v1 | ✅ |
| IV filter OFF (q1) | هر آپشن confirmed پاس می‌شود | engine.parity.v1 | ✅ fail-open تا بسته‌شدن باگ |
| Per-row lookup (A) | ~0.01 ms | design | ✅ (3289 rows ≈ 33ms total in RenderData) |
| Bitset size | 411 bytes | live v5 | ✅ (63× کاهش vs ~27KB object) |
| Memory (__B_result) — bitset+known | **824 bytes** (۲× ۴۱۲) | اندازه‌گیری‌شده node | ✅ |
| Memory `__B_prevRows` (۷ فیلد × ۳۲۸۹) | **~۳۵۰KB** (JSON) / ~۴۵۰KB heap | اندازه‌گیری‌شده node | ✅ |
| Memory `__B_symbols` + `__B_index` | **~۰.۰۶MB + ~۰.۱۹MB** | اندازه‌گیری‌شده node | ✅ |
| **جمع حافظهٔ B** | **~۰.۷–۰.۹MB** | اندازه‌گیری‌شده node | ⚠️ عدد قبلی (۲۰۰-۳۰۰KB) فقط bitset را حساب می‌کرد |
| **Full recompute (node parity، ۹۸۴ آپشن)** | **۱۶.۹–۲۲.۱ms** | engine.parity.v1 (node) | ✅ هم‌مرتبه با live ۱۸.۴ms |
| **Incremental cycle (node parity، ۶۵ dirty)** | **۱.۳–۲.۲ms** | engine.parity.v1 (node) | ✅ با cache ایندکس |
| detectDirty با ۷ فیلد (node) | ۰.۸–۱.۶ms | engine.parity.v1 (node) | ✅ (۴ فیلد: ۰.۲۵ms؛ live ۴ فیلد: ۲.۳ms) |
| buildIndex در چرخهٔ incremental | **۰ms (cache)** | engine.parity.v1 (node) | ✅ (بدون cache: ۱.۴-۱.۷ms) |

### یافتهٔ کلیدی اجرای live v1 (۲۰۲۶-۱۰-۱۷)

1. **۹۹۶ ردیف آپشن confirmed** از ۳۲۸۹ نماد (۳۰٪) — بیشتر از تخمین G-04 (۸۰۰ از ۳۳۶۲).
   هزینهٔ funnel به **تعداد آپشن‌ها** بسته است، نه کل نمادها.
2. **۷۷٪ ردیف‌ها (۷۶۸ از ۹۹۶) به سقف تکرار IV می‌رسند** (p50=24، max=24).
   **تفسیر اولیهٔ ما («قیمت بازار با BS هم‌خوان نیست») ناتوان بود** و با اندازه‌گیری
   تصحیح شد: حتی با mapping **درست** (S از نقشهٔ underlying + mid پیشنهاد خرید/فروش،
   `r=0.30`) روی دادهٔ مصنوعی، ۱۰۰٪ ردیف‌ها هنوز به سقف می‌رسند. علت واقعی
   **شرط توقف حلقه** است: `|price - marketPrice| < 1e-6` در مقیاس ریال (قیمت
   هزاران ریال) عملاً دست‌نیافتنی است، پس حلقه همیشه از مسیر `high-low < 1e-7`
   (پس از ~۲۵ تکرار) خارج می‌شود. IV با دقت ۱e-7 همگرا می‌شود — نتیجه **قابل استفاده**
   است، فقط زودتر break نمی‌کند. پس at-cap به‌تنهایی نشانهٔ دادهٔ بد نیست.
3. **اما هشدار مالک درست بود و یک شکاف واقعی را نشان داد:** هیچ evidence در این repo
   معنای `plc` را تأیید نکرده (E-011 صریحاً می‌گوید «`_*` vs non-`_*` semantics
   unknown»)، و پروب خودِ ما (G-11 greeks v1.1) از mapping کاملاً متفاوتی استفاده
   کرده: S = `pc` ردیف underlying از طریق نقشهٔ ساخته‌شده از l30، marketPrice =
   mid پیشنهاد خرید/فروش `(pd1+po1)/2`، `r=0.30`. پروب v9 از `S=row.pl` و
   `marketPrice=row.plc` استفاده می‌کرد. این **عدم‌تطابق ثبت‌نشده** است.
4. **تشخیص درست برای «IV معنادار است یا نه»** تعداد تکرار نیست، بلکه **مرز بودن
   جواب** است: اگر sigma به ۰.۰۱ یا ۳.۰ چسبیده باشد یعنی راه‌حلی در بازه نیست
   (عدم‌تطابق قیمت‌گذاری)؛ اگر درون بازه باشد IV معتبر است. probe تشخیصی
   `probes/fieldsem.ivdiagnostic.live.v1.js` هر دو را روی دادهٔ زنده اندازه می‌گیرد.
3. **verdict = PLAUSIBLE-40ms** — ادعای ۴۰ms probe v9 و اندازه‌گیری ۱۸.۴ms امروز
   در یک محدودهٔ منطقی هستند (v9 funnel سبک‌تر + کار bitset/index داشت).
4. **detectDirty زنده = ۲.۳ms** → تأیید عدد DIAG2 (۲.۹ms) و اصلاح §۴.
5. `dirtyCount=0` در همان snapshot → تأیید اینکه detectDirty در «عدم تغییر» صفر
   dirty برمی‌گرداند (شرط incremental).

### چرا ادعای ۴۰ms معقول است (و چرا نه اغراق‌آمیز)

`src/models/greeks.v0.1.0.js` از **bisection** برای IV استفاده می‌کند، ولی حلقه در
همین حالت سقف سخت دارد: در هر تکرار بازه نصف می‌شود و `high-low < 1e-7` پس از
`src/models/greeks.v0.1.0.js` از **bisection** برای IV استفاده می‌کند، ولی حلقه در
همین حالت سقف سخت دارد: در هر تکرار بازه نصف می‌شود و `high-low < 1e-7` پس از
~۲۵ تکرار break می‌کند. پس هر `impliedVol` حداکثر ~۲۵ فراخوانی `bsGreeks` است.

**اندازه‌گیری نهایی (live v1، ۲۰۲۶-۱۰-۱۷، ۹۹۶ ردیف آپشن):**

- per-row funnel = **۱۶.۱۶μs** (نه ۸.۴μs بنچمارک محلی؛ live ۲× آن است چون ۷۷٪ ردیف‌ها
  به سقف ۲۴-۲۵ تکرار می‌رسند — قیمت بازار واقعی با قیمت BS هم‌خوان نیست)
- funnel روی ۹۹۶ آپشن = **۱۶.۱ms** + detectDirty **۲.۳ms** → full recompute **~۱۸.۴ms**
- عدد probe v9 (۴۰ms) هم‌مرتبه است: funnel سبک‌تر + کار bitset/index/swap

تخمین «۱-۲ms هر آپشن → ۳-۶ ثانیه» حدود ۲۵۰ برابر بدبینانه بود (فرض ۱۰۰ تکرار
bisection، در حالی که سقف واقعی ~۲۵ است).
**یعنی گزینهٔ (ب) نبود؛ گزینهٔ (الف) هم نبود** — funnel واقعاً BS+IV کامل است
و ادعای ۴۰ms با اندازه‌گیری live تأیید شد (verdict: `PLAUSIBLE-40ms`).

---

## ۵. Key Lessons (از probe ها)

| # | درس | علت | اصلاح |
|---|---|---|---|
| 1 | O(n²) dirty tracking در A | nested loop برای هر row | منتقل به B (O(n) once) |
| 2 | Memory 10× underestimate | 27KB vs 200-300KB | تصحیح estimate |
| 3 | Atomic swap vs reset-then-fill | race condition | atomic swap only |
| 4 | Fail-open vs halt | A باید true برگرداند | fail-open design |
| 5 | Method call overhead 11× | mw.__B_erf (property access on object) | window.__B_erf (global) |
| 6 | Closure-captured 11× | scope chain walk در eval | global property access |
| 7 | eval-defined 12× | JIT-blocked (dynamic scope) | new Function() (global scope) |
| 8 | Inlined erf کندتر | JIT function call optimization | function call (16.4ms vs 38.8ms) |
| 9 | solveIV early-break نمی‌کند | marketPrice (plc/pcp) ≠ BS price | avg 47.2 iters (نه 1) |
| 10 | configVersion 0→12 | SaveParams hook کار می‌کند | dual trigger validated |
| 11 | تخمین IV گران بود (۲۵۰×) | bisection سقف سخت ~۲۵ تکرار دارد (`high-low<1e-7`) | impliedVol فقط ۴.۵μs گرم |
| 12 | «۰.۸ms incremental» فقط compute بود | detectDirty جدا ۲.۹ms اندازه گرفته شد | کل چرخه ~۳.۷-۴ms اعلام شود |
| 13 | فایل probe v9 در workspace نیست | نمی‌توان مرز اندازه‌گیری elapsed را تأیید کرد | probe بعدی breakdown جدا می‌گیرد |

---

## ۶. minify Candidate

**وضعیت:** بازنشسته نمی‌شود (user decision: خیر)

**دلیل:** evidence of passing 61 PrepareFilterCode rules retained. minify برای base64/parse speed استفاده می‌شود.

---

## ۷. Async B (توصیه)

B باید async اجرا شود (setTimeout/requestIdleCallback)، نه داخل RenderData. دلیل:
- RenderData در main thread اجرا می‌شود
- 40ms full recompute می‌تواند UI را block کند
- setTimeout(0) یا requestIdleCallback B را به next frame منتقل می‌کند

```javascript
// Async B execution — createScheduler() in bEngine.v0.1.0.js
function createScheduler() {
  if (typeof requestIdleCallback === 'function') {
    return function (fn) { requestIdleCallback(function () { fn(); }, { timeout: 500 }); };
  }
  if (typeof setTimeout === 'function') return function (fn) { setTimeout(fn, 0); };
  return function (fn) { fn(); };
}
```

**چرا `setTimeout(0)` کافی نیست:** صفحه حدود هر ۱ ثانیه `RenderData` را صدا می‌زند و
یک چرخهٔ کامل B حدود ۲۰-۴۰ms طول می‌کشد. `setTimeout(0)` فقط جلوی block کردن UI را
می‌گیرد ولی تضمین نمی‌کند B *بین* دو RenderData اجرا شود. `requestIdleCallback` با
`{timeout:500}` در بازهٔ idle اجرا می‌شود؛ `setTimeout(0)` فقط fallback است.
B هرگز داخل RenderData اجرا نمی‌شود.

---

## ۸. Implementation Checklist

- [x] Create `src/engine/bEngine.v0.1.0.js` — B engine (index, dirty, compute, publish)
- [x] Create `src/engine/aLookup.v0.1.0.js` — A per-row lookup (FilterCode body)
- [x] ~~Use `new Function()` for helpers~~ — **لازم نیست**: ماژول واقعی است، نه eval.
      توابع معمولی در module scope از قبل JIT-optimizable هستند (درس probe ها فقط
      برای کد تزریق‌شدهٔ کنسول/FilterCode معنا داشت).
- [x] Install SaveSettings/SaveParams hooks with `this=window` (تأییدشده با تست)
- [x] Implement guard (snapshotId + configHash dual trigger)
- [x] Implement dirty detection (O(n) once per cycle, 7 fields, no mutation)
- [x] Implement reverse index (O(1) lookup) + index caching
- [x] Implement atomic swap (build new, then swap)
- [x] Implement fail-closed (error → publish nothing, retry next cycle)
- [x] Implement fail-open in A (true on no projection / unknown symbol / unknown bit)
- [x] Add async execution (injected scheduler: setTimeout/requestIdleCallback)
- [x] Unit + parity suite: `probes/engine.parity.v1.js` — **۶۹/۶۹ پاس**
- [x] `node --check` روی ۷۳ فایل src+probes — همه پاس
- [ ] Test with PrepareFilterCode on the live page (61 rules) — **probe live بعدی**
- [ ] Test incremental on the live page (dirty=0 on no-change)
- [ ] Test performance on the live page (run1 <50ms, incremental <5ms)
- [x] Update governance (E-037..E-041 added; E-042 for implementation)

---

## ۹. Probe History

| Probe | Tag | Result | Key Finding |
|---|---|---|---|
| RenderData RO | [کنسول] | mw.RenderData 4447 chars, eval per row | PrepareFilterCode separate (4386 chars) |
| PrepareFilterCode RO | [کنسول] | 61 .replace(), no eval/Function | compile one-time, eval per-row |
| Guard minimal | [TextArea] | runCount=1, symbols=3436 | guard works |
| Incremental+Bitset | [TextArea] | dirty=0 on no-change, 430 bytes | incremental + bitset work |
| B-Real v1 | [TextArea] | dirty=3436, snapshot=snap-2-3436 | dual trigger partial |
| B-Real v3 | [TextArea] | dirty=2150/238/279, configVersion=0 | SaveSettings hook failed (this=mw) |
| B-Real v4 | [TextArea] | dirty=3010/341/166, 'load' 3104ms | O(n²) nested loop |
| B-Real v5 | [TextArea] | dirty=3015/605/191, 21ms | reverse index O(1) fix |
| Timing (simple) | [کنسول] | 2.9ms full scan | incremental optional |
| Timing (BS+IV) | [کنسول] | 17.4ms full scan | incremental NECESSARY |
| B-BSIV v6 | [TextArea] | run1 322ms | method call overhead |
| B-BSIV v7 | [TextArea] | run1 317ms | closure-captured 11× |
| B-BSIV v8 | [TextArea] | run1 312ms | eval-defined 12× |
| B-BSIV v9 | [TextArea] | run1 40ms, incr 0.8ms | new Function() JIT ✅ |
| Diag1-6 | [کنسول] | various | root cause identification |
| **computeFunnel bench (local)** | **node 22** | impliedVol 4.5μs (cap 25 iter), funnel 8.4μs/row, 3282 → 27.5ms | تخمین «۱-۲ms/آپشن» ۲۵۰× بدبینانه بود |
| **funnel.live.v1** | **[کنسول]** | **run 2026-10-17T10:29Z**: 996 option rows, funnel 16.1ms (16.16us/row), IV p50=24 max=24 (77% at cap), detectDirty 2.3ms, dirty=0, full=18.4ms, verdict PLAUSIBLE-40ms | ادعای ۴۰ms تأیید شد؛ breakdown زنده گرفته شد |

---

## ۱۰. References

- E-037: A/B engine separation architecture
- E-038: ConfigHash dual trigger
- E-039: BS+IV Funnel timing + incremental validation
- E-040: contradiction review (fail-open/fail-closed, 40ms claim, 0.8ms incremental) + local benchmark
- E-026: G-13 bridge confirmation (official probe v3)
- E-011: mw.AllRows existence/schema/lifecycle
- probes/perf.computeFunnel.benchmark.v1.js — local benchmark (node, real repo code)
- probes/perf.funnel.live.v1.js — live timing probe (console, RUN 2026-10-17 — results in E-041)
- src/models/greeks.v0.1.0.js — real BS+IV (bisection IV, hard cap ~25 iters)
- src/optionParser.v0.1.0.js — real option label parser
- docs/PENDING.md: G-12 (exact A projection), G-13 (bridge confirmed)
- docs/DECISIONS.md: D-2026-10-05-001 (Full scope), D-2026-10-05-002 (Privacy A)
---

## ۱۱. بررسی تناقض‌ها پیش از پیاده‌سازی (۲۰۲۶-۱۰-۱۷)

سه تناقض مطرح شد؛ هر سه بررسی و ثبت شدند. **هیچ‌کدام مانع پیاده‌سازی نیست**،
ولی دو مورد باعث اصلاح اعداد و یک مورد باعث اصلاح طراحی شد.

### تناقض ۱ — «fail-closed» در برابر «fail-open»

- **مشکل:** در §۲.۸ نوشته شده بود «B: Fail-closed: error → halt, no partial publish»
  و هم‌زمان «A fail-open». این دو در یک جمله متناقض به نظر می‌رسیدند.
- **تشخیص:** تناقض **ظاهری** بود، نه واقعی. دو لایهٔ مجزای fail دارند:
  - **B fail-closed** = هیچ نتیجهٔ ناقص/خرابی publish نمی‌شود؛ نتیجهٔ **قبلی** حفظ می‌شود.
  - **A fail-open** = اگر نتیجهٔ معتبری موجود نباشد (اولین اجرا یا خطای B)، A برای همهٔ
    ردیف‌ها `true` برمی‌گرداند → کاربر همه را می‌بیند، صفحهٔ خالی نه.
- **تصمیم (تأییدشده):** B حق ندارد partial publish کند؛ A حق ندارد کاربر را کور کند.
  اگر برعخش بود (A روی خطای B `false` بدهد) صفحهٔ خالی می‌شد — فاجعه.
- **اصلاح:** §۱، §۲.۸ و §۳ بازنویسی شدند؛ دو معنای fail صریحاً تفکیک شدند.

### تناقض ۲ — ادعای «۴۰ms full recompute» بدون اندازه‌گیری مستقیم

- **تردد:** `computeFunnel` (BURSA v1.5.0-rc2) هرگز مستقل اندازه‌گیری نشده بود؛
  تخمین نظری «۱-۲ms هر آپشن → ۳-۶ ثانیه برای ۳۲۸۲ نماد» مطرح شد.
- **اندازه‌گیری ۱ (local, node 22):** `probes/perf.computeFunnel.benchmark.v1.js`
  کد **واقعی** repo را اجرا می‌کند (`src/optionParser.v0.1.0.js` + `src/models/greeks.v0.1.0.js`)
  → impliedVol ۴.۵μs (avg 15.6 iter)، funnel ۸.۴μs/row. تخمین ۲۵۰× بدبینانه بود.
- **اندازه‌گیری ۲ (live v1 [کنسول]، ۲۰۲۶-۱۰-۱۷T10:29Z) — ✅ بسته شد:**
  - totalSymbols=3289، optionRows=**996** (۳۰٪ — بیشتر از تخمین G-04)
  - funnelOptionMs=**16.1** → perOptionRowUs=**16.16** (۲× بنچمارک محلی)
  - impliedVolIters: min=0، **p50=24، max=24، atCap24plus=768** → ۷۷٪ ردیف‌ها در سقف
  - parseAllMs=4.2، detectDirtyMs=**2.3**، dirtyCount=0
  - coldSingleShotMs=[0.1, 0, 0.1, 0.1, 0.1]
  - **fullRecomputeEstimateMs=18.4**، verdict=`PLAUSIBLE-40ms`
- **حکم:** ادعای ۴۰ms **تأیید شد**. نه گزینهٔ (الف) (funnel واقعاً BS+IV کامل است)
  و نه گزینهٔ (ب) (ادعا اغراق‌آمیز نیست). عدد طراحی: **۱۶.۱۶μs/ردیف آپشن**.
- **یافتهٔ مهم:** قیمت بازار واقعی (`plc`) با قیمت BS هم‌خوان نیست (نویز/کم‌نقدی)،
  بنابراین IV همیشه به سقف ساختاری می‌رسد. نتیجه: هزینهٔ per-row **پایدار و
  پیش‌بینی‌پذیر** است (برای طراحی خوب)، ولی عدد «۸.۴μs» باید با «۱۶.۱۶μs» جایگزین شود.
- **اقرار:** دادهٔ بنچمارک محلی مصنوعی بود و live ۲× گران‌تر out شد؛ علت (نرخ
  رسیدن به سقف تکرار) شناسایی و ثبت شد.

### تناقض ۳ — «Incremental ۰.۸ms» بدون شاهد و بدون detectDirty

- **تردد:** اگر Full = ۴۰ms و Incremental = ۰.۸ms، نرخ dirty ≈ ۲٪ (۶۶ نماد از ۳۲۸۲).
  یعنی در هر cycle فقط چند ده نماد تغییر می‌کند. این فرض لازم است تأیید شود.
  همچنین detectDirty خودش چند می‌شود؟ (~۱۰٬۰۰۰ مقایسه ≈ ۱-۳ms)
- **یافتهٔ کلیدی:** DIAG2 جداگانه `dirty detection = ۲.۹ms` را اندازه گرفت،
  بنابراین «۰.۸ms incremental» **نمی‌توانست** detectDirty را شامل باشد — elapsed در
  v9 فقط فاز **compute** بوده است.
- **اندازه‌گیری live v1 — ✅ عملاً بسته شد:**
  - detectDirtyMs = **۲.۳ms** (زنده، ۳۲۸۹ نماد، ۴ فیلد) → تأیید عدد DIAG2
  - dirtyCount = **۰** در همان snapshot → شرط «عدم تغییر → صفر dirty» روی دادهٔ واقعی
    برآورده می‌شود
- **تصمیم (اعداد اصلاح‌شده):**
  - compute incremental: **۰.۸–۱.۰ms**
  - detectDirty: **۲.۳ms** (زنده)
  - کل چرخه (detectDirty + compute): **~۲.۶–۳.۴ms** ← عددی که A/B واقعاً می‌پردازد
- **عدم‌قطعییت باقی‌مانده (open gap ثبت‌شده):** فایل probe v9 در workspace نیست،
  بنابراین مرز دقیق elapsed آن قابل تأیید نیست. اما چون probe v1 هر دو فاز را جدا
  اندازه گرفت، این ابهام عملیاً بی‌اثر شد.
- **تصحیح §۴:** جدول Performance اصلاح شد (دو ردیف مجزای compute / کل چرخه).

### جمع‌بندی

| # | تناقض | حکم | وضعیت |
|---|---|---|---|
| ۱ | fail-closed vs fail-open | ظاهری؛ دو لایهٔ مجزا تفکیک شدند | ✅ بسته (طراحی اصلاح شد) |
| ۲ | ۴۰ms بدون اندازه‌گیری | تأیید شد — ۱۸.۴ms زنده، verdict PLAUSIBLE-40ms | ✅ بسته (live v1) |
| ۳ | ۰.۸ms incremental | فقط compute بود؛ کل چرخه ~۲.۶-۳.۴ms | ✅ عملاً بسته (breakdown live اندازه گرفته شد) |

**نتیجه:** هر سه تناقض بسته شد. **هیچ مانعی برای پیاده‌سازی باقی نمانده.**
عدد بودجهٔ طراحی: full recompute = **~۱۸.۴ms** (یک‌بار per snapshot)،
هر چرخهٔ incremental = **~۳ms**، per-row lookup در A = **~۰.۰۱ms**.

---

## ۱۱.۱ شکاف ۱ — TextArea: نحوهٔ ثبت و اجرا (قبل از این سند کاملاً غایب بود)

این بخش اضافه شد چون سند هیچ توضیحی دربارهٔ **ثبت** A در TSETMC نداشت، در حالی که
تنها مسئلهٔ حل‌نشدهٔ اصلی همان است.

### آنچه تأییدشده است (evidence)

| واقعیت | شاهد |
|---|---|
| `PrepareFilterCode` وجود دارد و ۶۱ قاعدهٔ `.replace()` دارد، بدون `eval`/`Function` | probe [کنسول] (RenderData/PrepareFilterCode RO) |
| `PrepareFilterCode` جدا از `RenderData` است و یک‌بار compile می‌شود | همان probe |
| محدودیت ظرفیت Artifact A: **۴۰۹۶ بایت** (ParTree=15131F) | spec §8.14 / `exactA.capacityCheck` |
| بدنهٔ A تولیدشده: **۴۳۰ بایت** → با حاشیهٔ ۹.۶× جا می‌شود | `aLookup.buildFilterCode()` |
| `FilterCode` اسلات authoritative است و با `SaveParams` round-trip می‌شود | E-026 / G-13 confirmed |
| `mw` از داخل بدنهٔ filter قابل دسترسی است (probe v9 `mw.__B_index`/`mw.__B_bitset` را از FilterCode خواند) | probe B-BSIV v9 [TextArea] — **فایلش در workspace نیست، در probe live دوباره تأیید شود** |
| trace معتبر: `submit → accepted → running → done` | E-026 |
| rollback کار می‌کند (`restoredSlot` before/after، `restored=true`) | E-026 |

### جریان ثبت (طراحی)

```
1. B ماژول را روی صفحه تزریق می‌کند (script tag یا کنسول) و hooks را نصب می‌کند.
2. B اولین چرخه را async اجرا و projection را روی mw.__B_* منتشر می‌کند.
3. A: بدنهٔ ۴۳۰ بایتی (buildFilterCodeBody) از طریق PrepareFilterCode ثبت می‌شود.
4. PrepareFilterCode آن را در FilterCode authoritative می‌نشاند و SaveParams
   round-trip تأیید می‌کند (E-026).
   **تصحیح (E-056):** `mw.FilterCode` یک آینهٔ نوشتنی است و به `Settings.Filters[FilterNo]`
   نمی‌رسد؛ `SaveParams` فقط `mw.Settings` را ذخیره می‌کند. پس ثبت درست **دو نوشتن + ذخیره** است:
   **تصحیح دوم (E-057):** ثبت درست کافی نیست. بدنهٔ ابزارگذاری‌شده با همین مسیر در اسلات
   فعال ماند (`stillRegisteredAtEnd: true`) ولی در ۴ ثانیه **هرگز اجرا نشد** (`runs: 0`).
   یعنی سایت فیلتر را در لحظهٔ خودش compile می‌کند و نتیجه را cache می‌کند؛ نوشتن روی
   `mw.Settings` آن cache را باطل نمی‌کند. پس ثبت واقعی A = **کشف trigger کامپایل (G-23)** و
   بعد عبور دادن بدنه از همان مسیر، نه نوشتن مستقیم روی تنظیمات.
   **تصحیح سوم (E-058) — مسیر کامل ثبت، نهایی:**
   ```js
   var fno  = mw.Settings.FilterNo;
   var code = mw.PrepareFilterCode(A.buildFilterCodeBody());
   mw.Settings.Filters[fno].FilterCode = code;   // پایدار
   mw.FilterCode                    = code;       // نشست جاری
   mw.SaveParams();                              // ذخیره
   mw.RenderData();                              // compile + اجرا — بدون این مرحله هیچ‌چیز اتفاق نمی‌افتد
   ```
   `RenderData` هم‌زمان نیست: بدنه حدود یک ثانیه بعد از بازگشت آن شروع به اجرا می‌کند
   (`firstRunAt 1251ms`)، پس بعد از ثبت باید منتظر ماند. مسیر UI (پر کردن TextArea و
   `QueryWindowSaveFilter`) headless کار نمی‌کند: در DOM هیچ textarea نیست تا وقتی دیالوگ
   فیلتر باز نباشد.
   ```js
   var fno = mw.Settings.FilterNo;
   var code = mw.PrepareFilterCode(A.buildFilterCodeBody());
   mw.Settings.Filters[fno].FilterCode = code;   // پایدار
   mw.FilterCode = code;                          // نشست جاری
   mw.SaveParams();
   ```
5. هر RenderData، A برای هر ردیف فقط بیت را می‌خواند.
```

### آنچه هنوز باز است (gate بعدی)

1. ~~**API دقیق ثبت TextArea**~~ — **بسته شد (E-056).** `mw.PrepareFilterCode(RawCode)` با
   `argCount: 1`، ۶۱ قانون `.replace()`، بدون `eval`/`new Function`؛ کامپایلر DSL خود سایت است
   (`(l18)` → `row["l18"]`, `(tno)` → `parseInt(row["tno"],10)`). بدنهٔ JS ساده دست‌نخورده رد می‌شود.
2. ~~**آیا بدنهٔ filter به `mw` دسترسی دارد؟**~~ — **بسته شد (E-058): `scope-ok`.**
   بدنهٔ ابزارگذاری‌شده با `mw.RenderData()` اجرا شد (`runs 2132`، `firstRunAt 1251ms`) و
   `sawMw: true` گزارش کرد. پس `mw` از داخل context فیلتر قابل دید است و خواندن
   `mw.__B_index` بدون گارد در بدنهٔ A کار می‌کند؛ B **نیازی ندارد** projection را به
   `window.__B_*` منتقل کند. این تنها نقطهٔ وابستگی بین A و B قطعی شد.
3. ~~**۶۱ قانون `.replace()`**~~ — **بسته شد (E-056).** روی بدنهٔ واقعی اجرا شد:
   `resultLen 430`، `resultIdentical: true`. هیچ قانونی شناسه‌های `__` یا ساختار بدنه را
   دستکاری نمی‌کند.
4. **`roundTick`** — اگر `suggestTrade` در B پیاده شود، `roundTick71` لازم است؛
   در حال حاضر در طراحی A/B وجود ندارد و باید به‌عنوان وابستگی ثبت شود.

### برچسب‌گذاری probe (قرارداد workflow)

- `[کنسول]` = تزریق کنسول، فقط خواندن/اندازه‌گیری.
- `[TextArea]` = ثبت FilterCode + `PrepareFilterCode` (+ rollback در پایان).
- اگر هر دو لازم باشد، هر دو برچسب با ترتیب اجرا ذکر می‌شوند.

---

## ۱۲. وضعیت پیاده‌سازی v0.1.0 (۲۰۲۶-۱۰-۱۷)

### فایل‌ها

| فایل | نقش |
|---|---|
| `src/engine/bEngine.v0.1.0.js` | B: index (+cache)، dirty detection، funnel (ماژول‌های تزریق‌شده)، guard، atomic swap، publish، hooks |
| `src/engine/aLookup.v0.1.0.js` | A: `evaluateRow` + بدنهٔ تولیدی برای FilterCode (۴۳۵ بایت) + capacity check + parity harness |
| `probes/engine.parity.v1.js` | ۶۹ تست: unit + parity + timing |

### API خلاصه

```javascript
// B
const b = createBEngine({ models: { parseOptionLabel, impliedVol, bsGreeks } });
b.installHooks(mw, window);              // configVersion (dual trigger)
const snap = b.computeSnapshotId(mw);    // 'snap-7-3289'
const cfg  = b.computeConfigHash(mw);    // '3-3'
const report = b.run(mw.AllRows, snap, cfg);
// report: {published, reason, dirtyCount, computed, unknown, elapsedMs, runs, meta}
b.publish(mw);                           // atomic: mw.__B_bitset / __B_known / __B_index ...
b.runAsync(mw.AllRows, snap, cfg, cb);   // async — never inside RenderData

// A (inside the filter slot, 435 bytes)
var FilterResult = true;
var __i = mw.__B_index;
if (__i && mw.__B_known && mw.__B_bitset && row) {
  var __p = __i[row.inscode];
  if (__p !== undefined) {
    var __b = (__p / 8) | 0, __m = __p % 8;
    if (__b >= 0 && __b < mw.__B_known.length && (mw.__B_known[__b] >> __m) & 1) {
      FilterResult = !!((mw.__B_bitset[__b] >> __m) & 1);
    }
  }
}
```

### نتایج تست parity (node 22، کد واقعی repo، ۳۲۸۲ نماد / ۹۸۴ آپشن)

| شاخص | مقدار |
|---|---|
| تست‌های پاس‌شده | **۶۹ / ۶۹** |
| `node --check` (۷۳ فایل src+probes) | همه پاس |
| parity بدنهٔ A با `evaluateRow` | ۳۲۸۲/۳۲۸۲ یکسان |
| بایت بدنهٔ A | ۴۳۵ / ۴۰۹۶ (fits) |
| full recompute | ۱۶.۹–۲۲.۱ms |
| incremental cycle | ۱.۳–۲.۲ms |
| detectDirty (۷ فیلد) | ۰.۸–۱.۶ms |
| buildIndex در چرخهٔ incremental | ۰ms (cache hit) |
| per-row funnel با mapping G-11 (node) | ۱۶.۱۷μs |
| حافظهٔ کل B | ~۰.۷–۰.۹MB (اندازه‌گیری‌شده) |

### دو باگی که تست‌ها گرفتند (هر دو اصلاح شدند)

1. **`plc` در dirty fields نبود** — `plc` ورودی `impliedVol` است؛ تغییرش باعث
   recompute نمی‌شد و بیت قدیمی می‌ماند. اصلاح: `DIRTY_FIELDS = [pl, plc, l18, l30,
   tvol, tno, pcp]`. هزینه: detectDirty از ۰.۲۵ms به ~۱ms (node) رفت — قابل قبول.
2. **ترتیب آرگومان‌ها در `compileFilterCodeBody`** — امضا `(mw, row)` بود در حالی که
   `evaluateRow(row, published)` است؛ parity test به‌اشتباه جابجا صدا می‌شد و
   ۷۸۶ عدم‌تطابق گزارش شد. اصلاح: امضا `(row, mw)` تا با `evaluateRow` یکسان شود.

### تصمیم‌های مالک — اعمال‌شده در کد (۲۰۲۶-۱۰-۱۷)

| # | تصمیم | مقدار در `DEFAULT_FUNNEL_CONFIG` |
|---|---|---|
| q1 | ✅ **تصمیم: `ivFilterEnabled: true` به‌عنوان لایهٔ «محاسبه + برچسب» — اعمال شد (E-054).** دادهٔ live: با T واقعی، پنجرهٔ `[0.01, 3.0]` **۰ ردیف** حذف می‌کند و `[0.05, 2.5]` **۱۰ ردیف از ۴۵۳ (۲.۲٪)**؛ نرخ مرزی ۵.۱٪ (PRODUCT-DECISION) در برابر ۱.۱٪ با T ثابت |
| q2 | قیمت آپشن = `pl` | `marketPriceFrom: 'pl'` |
| q3 | منبع S | ✅ **تأیید شد (۲۰۲۶-۱۰-۱۷): `underlyingMap`** — S از ردیف غیرآپشن همان اختیار (نقشهٔ ساخته‌شده از روی `l18`) و فیلد `pc` |
| q4 | نرخ بدون ریسک | ✅ **قابل تغییر توسط کاربر** — `r: 0.30` پیش‌فرض، ولی از لایهٔ تنظیمات UX می‌آید و با `normalizeFunnelConfig()` اعتبارسنجی می‌شود |
| q5 | آستانه‌ها | `useDeltaGamma: false` — پاس = «IV حل شد و در بازهٔ معتبر است»؛ delta/gamma در config مانده‌اند ولی اعمال نمی‌شوند |
| q6 | minify | بازنشده نمی‌شود (تصمیم قبلی) |

```javascript
const DEFAULT_FUNNEL_CONFIG = {
  T: 30 / 365, r: 0.30,
  ivMin: 0.01, ivMax: 1.0,
  deltaMin: 0.3, gammaMin: 1e-4,      // kept, NOT applied while useDeltaGamma is false
  useDeltaGamma: false,               // q5
  ivFilterEnabled: false,             // q1 - open bug, no IV-based hiding
  marketPriceFrom: 'pl',              // q2
  underlyingFrom: 'underlyingMap',    // q3 - CONFIRMED by the owner
  underlyingPriceField: 'pc',
  legacyV9Mapping: false
};
```

### یافتهٔ live از probe تشخیصی (E-045، ۲۰۲۶-۱۰-۱۸، old.tsetmc.com)

پرابت `fieldsem.ivdiagnostic.live.v1` روی سایت واقعی اجرا شد (۲۲۱۹ نماد، ۶۰۵ ردیف آپشن،
۱۲۰ ردیف نمونه):

| سنجه | G-11 (انتخاب شما: `pc` underlying + bidAskMid، r=۰.۳۰) | v9 (`row.pl` + `plc`، r=۰.۲) |
|---|---|---|
| IV حل‌شده | ۱۰۰/۱۲۰ | ۱۲۰/۱۲۰ |
| IV میانه (p50) | **۱.۰۵۲۲** | ۱.۰۶۹ |
| IV صدک ۹۰ | ۲.۱۴۲۴ | ۳.۰ |
| **چسبیدن به مرز** | **۱۶ (۱۳.۳٪)** | ۴۸ (۴۰٪) |
| قیمت خارج از بازهٔ BS | ۱۶ | ۴۱ |
| IV درون‌بازه و معقول | ۳۳ (۲۷.۵٪) | ۳۷ (۳۰.۸٪) |

سه نتیجهٔ قطعی:

1. **mapping شما درست است**: ۱۳.۳٪ مرزی در برابر ۴۰٪ نسخهٔ v9 (۳× بهتر).
2. **۱۳.۳٪ ردیف هیچ IV معتبری ندارند** و علتش ثابت شد — یا قیمت خارج از کران‌های
   no-arbitrage است (نمونه: S=۷۰۱۶۴، K=۲۴۰۰۰ → کران پایین ۴۶۷۴۹ ولی mid قیمت ۴۶۰۰۰)
   یا از دفتری با spread ۲۳–۳۲٪ می‌آید که vol بالای ۳۰۰٪ می‌خواهد.
3. **`ivMax=1.0` بسیار تنگ است**: میانهٔ IV زنده ۱.۰۵ است، یعنی با این آستانه حدود
   نیمی از آپشن‌ها رد می‌شوند. قبل از روشن‌کردن فیلتر باید پنجرهٔ IV عوض شود.

همچنین معنای فیلدها ثابت شد (E-048): `plc == pl - pc` فقط در ۳۷.۲٪ ردیف‌ها برقرار است،
چون **`plc = pl − prevClose`** است (تغییر نسبت به پایانی دیروز) و `pc` قیمت امروز است، نه
پایانی دیروز. اثبات: ۶/۶ نمونه با دو snapshot از همان ردیف‌ها.

**تصحیح یافتهٔ قبلی (۲۰۲۶-۱۰-۱۸):** در تحلیل اول (E-045) نوشته بود «در همهٔ نمونه‌های با
`plc ≠ 0` مقدار `pl == pc` بود، پس `pl` کهنه می‌شود». آن تفسیر **غلط** بود. با فرمول اثبات‌شده
`plc = pl − prevClose` معلوم می‌شود آن ردیف‌ها از پایانی دیروز جابجا شده بودند (یعنی معامله
داشتند) و تصادفاً `pl == pc` بود. پس **`pl` کهنه نیست**؛ `pl` قیمت آخرین معاملهٔ امروز است
وقتی ردیف معامله داشته باشد. سیگنال درست «امروز معامله نشده» همان `tno == 0` است — که q8
از آن استفاده می‌کند و درست بوده. `plc == 0` هم یک سیگنال ارزان‌تر (ولی ضعیف‌تر) است.

در موتور گارد `marketPriceProblem()` اضافه شد: قیمت خارج از کران‌های no-arbitrage
(`price-outside-arbitrage-bounds`) یا دفتر عریض (`book-too-wide`) → `insufficient-data`
یعنی «محاسقه نمی‌کنیم»، و A ردیف را fail-open نگه می‌دارد (پنهان نمی‌شود، سیگنال جعلی هم
نداریم).

### تصمیم‌های بازِ جدید (نیازمند پاسخ مالک)

| # | موضوع | شواهد |
|---|---|---|
| q7 | ✅ **`ivMax: 3.0`** (قابل تغییر در UX، محدود به محدودهٔ حل‌کننده `[0.01, 3.0]`) — پوشش p90=۲.۱۴ با حاشیه؛ گارد قیمت اولویت اول، ivMax لایهٔ backup. اگر p99 > ۳.۰ شد بازبینی می‌شود. |
| q8 | ✅ **`marketPriceFrom: 'hybrid'`** — سلسله‌مراتبی: mid دفتر (با گارد) → `pl` اگر `tno > 0` → `insufficient-data` (fail-open). |
| q9 | ✅ **تصمیم: `TMode:'dte'` — اعمال شد (E-052).** گاردها را با طرح ۲×۲ (maturity × guards) آزمودیم: در T ثابت ۶.۳٪ → ۰٪ (همه را نجات می‌دهند)، در T واقعی ۳۷.۵٪ → ۹.۱٪ (۱۲ را می‌نجلانند، ۲ می‌ماند) — **پس q9 باید قبل از q1 جواب شود** |
| q10 | ✅ **تصمیم: ردیف «بی‌راه‌حل» (pin) دیده شود و برچسب بگیرد — اعمال شد (E-052).** یک pin یعنی «مدل BS راه‌حلی در بازهٔ solver ندارد»؛ این با «IV معتبر خارج از پنجره» فرق دارد. `pinFailOpen:true` (پیش‌فرض) آن را نگه می‌دارد و `ivStatus:'no-iv-solution'` منتشر می‌شود؛ `fail-iv-range` تنها حالت قابل حذف است. |

### q8 — سلسله‌مراتبی hybrid قیمت (تصمیم مالک، ۲۰۲۶-۱۰-۱۸)

دادهٔ live نشان داد هیچ منبعیalone کافی نیست، بنابراین:

```
قیمت = اول_معتبر([
  mid دفتر با گارد,        // اولویت ۱ — همیشه تازه
  pl اگر tno > 0,          // اولویت ۲ — معاملهٔ واقعی امروز
  insufficient-data        // اولویت ۳ — fail-open
])
```

- **mid اول**: دفتر سفارش هر لحظه به‌روز است؛ گارد `marketPriceProblem()` میانی که
  از دفتر نویزی (spread > ۲۰٪) یا خارج از کران‌های no-arbitrage است را رد می‌کند.
- **`pl` فقط وقتی `tno > 0`**: آنگاه `pl` قیمت آخرین معاملهٔ واقعی امروز است و از یک
  quote جعلی معتبرتر. گارد spread روی این مسیر اجرا **نمی‌شود** (`fromBook:false`)
  چون یک معاملهٔ واقعی شاهد است، حتی اگر اطرافش نویز باشد.
- **در نهایت `insufficient-data`**: نه mid معتبر داریم نه `pl` معامله‌شده → ردیف
  محاسبه نمی‌شود و A آن را fail-open نگه می‌دارد (پنهان نمی‌شود، سیگنال جعلی هم ندارد).
- هر رد شدن دلیل خودش را در خروجی می‌آورد (`price-outside-arbitrage-bounds`،
  `book-too-wide`، `missing market price`) تا عیب‌یابی ممکن باشد.
- `marketPriceSource` در `inputs` echo می‌شود (`mid` | `pl-traded` | نام منبع).

### q4 — r از تنظیمات کاربر می‌آید، نه از ثابت کد

پاسخ شما برای q4 «قابل تغییر توسط کاربر» بود، بنابراین `r` (و مثل آن `T` و
آستانه‌ها) از لایهٔ تنظیمات UX خوانده می‌شود و موتور هرگز مقدار ورودی را Blind
قبول نمی‌کند:

```javascript
function normalizeFunnelConfig(cfg) { /* ... */ }
```

- هر مقدار عددی داخل بازهٔ مجاز باشد (`r` بین ۰ و ۵، `T` بین ۰ و ۱۰ سال)؛
- `NaN`، رشته، `undefined` یا خارج از بازه → **بازگشت به پیش‌فرض اثبات‌شده**
  (fail-closed، نه fail-open — چون `r` اشتباه همهٔ IVهای snapshot را جابجا می‌کند)؛
- سوییچ‌ها به بولین واقعی تبدیل و منابع ناشناس (`marketPriceFrom`/`underlyingFrom`)
  رد می‌شوند؛
- `DEFAULT_FUNNEL_CONFIG` هرگز mutate نمی‌شود.

این در parity با ۸ تست تازه پوشش داده شد: `r` معتبر عبور می‌کند، `r` خرابی به
۰.۳۰ برمی‌گردد، بازهٔ IV وارونه ترمیم می‌شود، و `r` کاربر عملاً IV حل‌شده را
تغییر می‌دهد (`iv(r=0.2) ≠ iv(r=0.5)`).

### نکتهٔ مهم از تست round-trip با انتخاب q2

وقتی دادهٔ ردیف آپشن را واقع‌گرایانه کردم (`pl` = قیمت خود آپشن، نه قیمت
underlying — همان فرضی که probe v9 داشت و اشتباه بود):

| mapping | IV بازیابی‌شده (حقیقت ۰.۳۵) | چسبیدن به مرز |
|---|---|---|
| مالک (q2+q3): `pl` + نقشهٔ underlying | ۰.۳۴۵۶ | ۱/۴۰ (۲.۵٪) |
| v9: `row.pl` به‌عنوان S + `plc` | — | ۳۶/۴۰ (۹۰٪) |

یعنی انتخاب شما IV را تقریباً دقیق بازیابی می‌کند، در حالی که mapping قدیمی probe v9
۹۰٪ ردیف‌ها را به مرز می‌چسباند (راه‌حلی وجود ندارد). این قوی‌ترین شاهد بر اینکه
mapping ورودی علت اصلی هشدار بود.

### گام بعدی (live) — دو probe، یکی در هر اجرا

1. **`probes/fieldsem.ivdiagnostic.live.v1.js` [کنسول]** — اندازه‌گیری معنی `plc`/`plp` (آزا `plc = pl - pc` روی تمام ردیف‌ها) + تفکیک IV در هر دو mapping (سیگما درون بازه یا چسبیده به مرز). این باعث تصه یمی‌شود و تصهیم‌های ۱ تا ۳ بسته شود.
2. **ثبت A از طریق `PrepareFilterCode`** + تأیید ۶۱ قانون + اندازه‌گیری دورهٔ incremental روی صفحهٔ واقعی (rollback در پایان).

طبق workflow، هر بار یکی از این دو تا پرسیدن نتیجه.
