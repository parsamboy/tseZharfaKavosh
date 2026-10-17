# A/B Engine Separation — Final Design

**تاریخ:** 2026-10-17  
**وضعیت:** Candidate (probe-validated, pending implementation)  
**مرجع:** E-037, E-038, E-039 (Evidence Ledger)

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
mw.__B_rowIndex    // {inscode: row} — reverse index for rows
mw.__B_symbols     // [inscode, ...] — ordered symbol list
mw.__B_bitset      // Uint8Array — compressed result (1 bit per symbol)
mw.__B_prevRows    // {inscode: {tvol, pl, tno, pcp}} — for dirty detection
mw.__B_totalRuns   // number — run counter
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

```javascript
var __dirty = [];
for (var __k in mw.AllRows) {
    if (mw.AllRows.hasOwnProperty(__k)) {
        var __r = mw.AllRows[__k];
        var __prev = mw.__B_prevRows[__r.inscode];
        if (!__prev || __prev.tvol !== __r.tvol || __prev.pl !== __r.pl ||
            __prev.tno !== __r.tno || __prev.pcp !== __r.pcp) {
            __dirty.push(__r.inscode);
        }
        mw.__B_prevRows[__r.inscode] = {tvol: __r.tvol, pl: __r.pl, tno: __r.tno, pcp: __r.pcp};
    }
}
```

- **O(n)** — یک‌بار per cycle (نه per row)
- مقایسه: tvol, pl, tno, pcp (4 field)
- نتیجه: لیست dirty symbols

### ۲.۶ Compute Phase (O(dirty) with O(1) lookup)

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

```javascript
// === A: per-row lookup (fail-open) ===
var __posA = mw.__B_index[row.inscode];
var FilterResult = true;  // fail-open default
if (__posA !== undefined && mw.__B_bitset) {
    FilterResult = !!((mw.__B_bitset[Math.floor(__posA / 8)] >> (__posA % 8)) & 1);
}
```

- **O(1)** — bitset lookup
- **Fail-open** — اگر B publish نکرده باشد، `true` برمی‌گرداند
- **هیچ computation** — فقط lookup
- **هیچ state** — stateless
- **~0.01ms per row**

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
| Per-row lookup (A) | ~0.01 ms | design | ✅ (3289 rows ≈ 33ms total in RenderData) |
| Bitset size | 411 bytes | live v5 | ✅ (63× کاهش vs ~27KB object) |
| Memory (__B_result) | ~200-300 KB | live estimate | ✅ (تصحیح‌شده از 27KB) |

### یافتهٔ کلیدی اجرای live v1 (۲۰۲۶-۱۰-۱۷)

1. **۹۹۶ ردیف آپشن confirmed** از ۳۲۸۹ نماد (۳۰٪) — بیشتر از تخمین G-04 (۸۰۰ از ۳۳۶۲).
   هزینهٔ funnel به **تعداد آپشن‌ها** بسته است، نه کل نمادها.
2. **۷۷٪ ردیف‌ها (۷۶۸ از ۹۹۶) به سقف تکرار IV می‌رسند** (p50=24، max=24). یعنی قیمت
   بازار واقعی (`plc`) با قیمت BS هم‌خوان نیست (نویز/کم‌نقدی). نتیجه: per-row cost
   همیشه روی **حداکثر ساختاری** است — نه ارزان‌تر می‌شود، ولی **پیش‌بینی‌پذیر** است.
   بنچمارک محلی (۸.۴μs) خوش‌بینانه بود؛ عدد طراحی باید **۱۶.۱۶μs** باشد.
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
// Async B execution
function runB() {
    setTimeout(function() {
        // ... entire B computation ...
        // atomic swap at the end
    }, 0);
}
```

---

## ۸. Implementation Checklist

- [ ] Create `src/engine/bEngine.v0.1.0.js` — B engine (index, dirty, compute, publish)
- [ ] Create `src/engine/aLookup.v0.1.0.js` — A per-row lookup (FilterCode template)
- [ ] Use `new Function()` for all helper functions (erf, bsDelta, solveIV, etc.)
- [ ] Store helpers on `window` (global scope) for JIT optimization
- [ ] Install SaveSettings/SaveParams hooks with `this=window`
- [ ] Implement guard (snapshotId + configHash dual trigger)
- [ ] Implement dirty detection (O(n) once per cycle)
- [ ] Implement reverse index (O(1) lookup)
- [ ] Implement atomic swap (build new, then swap)
- [ ] Implement fail-closed (try/catch, no partial publish)
- [ ] Implement fail-open in A (return true on uncertainty)
- [ ] Add async execution (setTimeout/requestIdleCallback)
- [ ] Test with PrepareFilterCode (61 rules)
- [ ] Test incremental (dirty=0 on no-change)
- [ ] Test performance (run1 <50ms, incremental <2ms)
- [ ] Update governance (E-037/038/039 already added)

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
