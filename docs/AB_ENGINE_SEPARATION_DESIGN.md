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
│  • Fail-closed: error → halt, no partial publish       │
└──────────────────────┬──────────────────────────────────┘
                       │ publishes (atomic swap)
                       ▼
┌─────────────────────────────────────────────────────────┐
│  A — Per-Row Lookup (inside FilterCode/RenderData)       │
│  ─────────────────────────────────────────────────────  │
│  • Does ONLY lookup of B's published bitset            │
│  • FilterResult = bitset[pos] (O(1))                   │
│  • Fail-open: returns true on uncertainty              │
│  • No computation, no dirty-tracking, no state         │
│  • ~0.01ms per row (bitset lookup)                     │
└─────────────────────────────────────────────────────────┘
```

### اصول کلیدی

1. **B مستقل اجرا می‌شود** — UX + settings + data + engine در B است
2. **A فقط lookup می‌کند** — هیچ computation، dirty-tracking یا state در A
3. **B فقط یک‌بار per snapshot اجرا می‌شود** — guard با snapshotId + configHash
4. **B partial/error → halt** — فقط نتیجهٔ کامل publish می‌شود
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
    // Do NOT publish partial result
    // mw.__B_bitset remains unchanged (previous valid state)
    // A will use previous bitset (fail-open on A side)
}
```

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

| سناریو | زمان | قابل قبول؟ |
|---|---|---|
| Full recompute (run 1) | 40 ms | ✅ (یک‌بار per snapshot) |
| Incremental (run 2+) | 0.8-1.0 ms | ✅ (هر RenderData cycle) |
| Per-row lookup (A) | ~0.01 ms | ✅ (3282 rows = ~33ms total in RenderData) |
| Bitset size | 411 bytes | ✅ (63× کاهش vs ~27KB object) |
| Memory (__B_result) | ~200-300 KB | ✅ (تصحیح‌شده از 27KB) |
| Dirty detection | 2.9 ms | ✅ (O(n) once per cycle) |

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

---

## ۱۰. References

- E-037: A/B engine separation architecture
- E-038: ConfigHash dual trigger
- E-039: BS+IV Funnel timing + incremental validation
- E-026: G-13 bridge confirmation (official probe v3)
- E-011: mw.AllRows existence/schema/lifecycle
- docs/PENDING.md: G-12 (exact A projection), G-13 (bridge confirmed)
- docs/DECISIONS.md: D-2026-10-05-001 (Full scope), D-2026-10-05-002 (Privacy A)