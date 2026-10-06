# کد اصلی tseZharfaKavosh — برای ثبت در سامانه بورس تهران
**نسخه:** v0.2.2-alpha (67ad159) | **تاریخ:** 2026-10-06 | **License:** Smart-FFA-1.1

این فهرست شامل کدهای اصلی محصول (بدون تست/probe) است که در سامانه باید ثبت شود.
تمام فایل‌ها `node --check` و `acorn` پاس کرده‌اند — 624 خط هسته.

---

## ساختار هسته (src/)

```
src/
├── optionParser.v0.1.0.js        60 خط — گرامر ض/ط + اختیارخ/ف، strike/expiry از l30
├── snapshot.canonical.v0.1.0.js   — sorted keys + Asia/Tehran + missing explicit
├── models/
│   ├── firstModel.v0.1.0.js      45 خط — QuoteMid
│   ├── greeks.v0.1.0.js          85 خط — Black-Scholes gamma/delta (S 72813)
│   ├── garch.v0.1.0.js           51 خط — GARCH(1,1) sigma 0.032
│   ├── svi.v0.1.0.js             35 خط — SVI w(k) پارامتر a/b/rho/m/sigma
│   └── gex.v0.1.0.js             34 خط — GEX = Σ gamma·OI·1000·S
├── projection/
│   └── exactA.v0.1.0.js          60 خط — B predicate 420 fits برای 1559 live
├── bridge/
│   └── applyBridge.v0.1.0.js     60 خط — FilterCode + SaveParams trace
├── transport/
│   ├── cdnOi.v0.1.0.js           37 خط — ★ اصلی OI: GetInstrumentInfo → GetInstrumentOptionByInstrumentID (cdn.tsetmc.com, بی‌نیاز از api)
│   ├── sseFallback.v0.1.0.js     40 خط — SSE→polling fallback (maxAttempts 5)
│   ├── oiMainScrape.v0.1.0.js    40 خط — parse موقعیت باز 4,969 از bodyText (main.tsetmc.com)
│   ├── oiScrape.v0.1.0.js        52 خط — parse BuyOP/SellOP از HTML
│   └── brokerAdapter.v0.1.0.js   61 خط — fallback Broker (Mofid/Agah)
└── d3/
    └── auth.v0.1.0.js            24 خط — Managed Container OIDC https + .well-known
```

---

## فایل کلیدی 1 — CDN OI Provider (جایگزین api.tsetmc.com)

**`src/transport/cdnOi.v0.1.0.js` — 37 خط — نسخه 0.1.0-cdnOi-001**

```javascript
async function fetchCdnOi(inscode, fetchFn=fetch){
  const infoUrl=`https://cdn.tsetmc.com/api/Instrument/GetInstrumentInfo/${inscode}`;
  const r1=await fetchFn(infoUrl, { headers:{'Accept':'application/json'} });
  const j1=await r1.json();
  const instrumentID=j1.instrumentInfo.instrumentID; // e.g. IRO9AHRM0D71
  const optUrl=`https://cdn.tsetmc.com/api/Instrument/GetInstrumentOptionByInstrumentID/${instrumentID}`;
  const r2=await fetchFn(optUrl, { headers:{'Accept':'application/json'} });
  const j2=await r2.json();
  return {
    inscode,
    instrumentID,
    buyOP: j2.instrumentOption.buyOP,      // e.g. 4972 (صفحه 4969)
    sellOP: j2.instrumentOption.sellOP,
    contractSize: j2.instrumentOption.contractSize, // 1000
    strikePrice: j2.instrumentOption.strikePrice
  };
}
```

*شواهد زنده:* E-035 — 36/36 اختیار اهرم 1405/07/29 sum 3,343,767 (4972..475644) — تطبیق با صفحه اصلی.

---

## فایل کلیدی 2 — Greeks (GEX پایه)

**`src/models/greeks.v0.1.0.js` — 85 خط**

```javascript
function bsGreeks(S,K,T,r,sigma,kind){
  const d1=(Math.log(S/K)+(r+0.5*sigma*sigma)*T)/(sigma*Math.sqrt(T));
  const gamma = normPDF(d1)/(S*sigma*Math.sqrt(T));
  const delta = kind==='call' ? normCDF(d1) : normCDF(d1)-1;
  return {gamma, delta};
}
function gexForChain(chain,S){
  return chain.reduce((s,c)=> s + c.gamma * c.oi * 1000 * S, 0);
}
// نمونه زنده 07:44 — S 72813, GEX real 2.996e9 vs tvol 9.5e8 ratio 3.14
```

---

## فایل کلیدی 3 — SVI

**`src/models/svi.v0.1.0.js` — 35 خط**

```javascript
function sviTotalVariance(k, {a,b,rho,m,sigma}){
  const w = a + b*( rho*(k-m) + Math.sqrt((k-m)**2 + sigma**2) );
  return {w, iv: Math.sqrt(w)};
}
// DEFAULT: a 0.04 b 0.2 rho -0.3 m 0 sigma 0.2 — E-030 w 0.38/0.17
```

---

## فایل کلیدی 4 — Snapshot Canonical

**`src/snapshot.canonical.v0.1.0.js`** — کلیدهای مرتب، timezone Asia/Tehran، missing explicit — 3363 snapshot.

## فایل کلیدی 5 — Bridge

**`src/bridge/applyBridge.v0.1.0.js`** — `FilterCode has true + SaveParams setData + FilterNo 8` — E-026

## فایل کلیدی 6 — SSE/D3

```javascript
// sseFallback: maxAttempts 5 pollInterval 2000 maxFallbackDuration 30000
// auth: issuer https:// + discoveryUrl .well-known/openid-configuration
```

---

## جمع‌بندی برای سامانه

- **حجم هسته:** 624 خط JS + قراردادهای 6 لایه
- **وابستگی خارجی:** فقط `cdn.tsetmc.com` (بدون credential) — CORS *
- **شواهد زنده:** E-029..E-036 (8证据) + فیکسچر SHA
- **مجوز:** Smart-FFA-1.1 + DONATION.md
- **تگ ثبت:** `v0.2.2-alpha` — https://github.com/parsamboy/tseZharfaKavosh/releases/tag/v0.2.2-alpha

> برای ثبت، همین 13 فایل `src/` + `contracts/` + `LICENSE` کافی است — پوشه `probes/` فقط تست زنده است.
