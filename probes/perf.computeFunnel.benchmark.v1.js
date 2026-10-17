/**
 * tseZharfaKavosh — perf benchmark for computeFunnel (BS+IV) v0.1.0
 * Local (node) — no network, no live site. Measures per-symbol cost of the
 * REAL repo models (src/optionParser.v0.1.0.js + src/models/greeks.v0.1.0.js)
 * on synthetic rows shaped like live mw.AllRows (E-011 / G-04 findings:
 * total 3362, optionLike 800, stockLike 2562).
 *
 * Purpose: resolve contradiction "40ms full recompute" — is the real funnel
 * ~12us/symbol (as v9 probe suggested) or ~0.1-2ms/symbol (bisection IV)?
 *
 * Run: node probes/perf.computeFunnel.benchmark.v1.js
 * SPDX-License-Identifier: Smart-FFA-1.1
 */
'use strict';

const path = require('path');
const { parseOptionLabel } = require(path.join(__dirname, '..', 'src', 'optionParser.v0.1.0.js'));
const G = require(path.join(__dirname, '..', 'src', 'models', 'greeks.v0.1.0.js'));
const { bsGreeks, impliedVol, normCDF, VERSION } = G;

const UNDERLYINGS = ['اهرم', 'بساما', 'فولاد', 'شپنا', 'وبانک', 'خودرو', 'کچاد', 'پارس', 'مبین', 'آرمان'];
const TOTAL_SYMBOLS = 3282;   // v9 probe run1 dirty
const OPTION_ROWS = 800;      // G-04 live finding
const R = 0.2;                // risk-free (v9 probe)
const T = 0.082;              // ~1 month (v9 probe)
const TRUE_SIGMA = 0.35;      // "true" vol used to synthesize a realistic market price

// realistic strike ladder: near the underlying (TSETMC strikes bracket the spot)
const SPOTS = [15000, 22000, 27500, 44000, 53000, 61500, 72813, 79500];

function makeRows(n, optionRatio) {
  const rows = [];
  for (let i = 0; i < n; i++) {
    const isOption = i < Math.floor(n * optionRatio);
    const u = UNDERLYINGS[i % UNDERLYINGS.length];
    const S = SPOTS[i % SPOTS.length];
    const inscode = String(400000000000000 + i * 7919);
    if (isOption) {
      const kind = (i % 2 === 0) ? 'call' : 'put';
      const strike = Math.round((S * (0.85 + 0.3 * ((i % 17) / 16))) / 500) * 500;
      const jy = 1405, jm = 7 + (i % 3), jd = 1 + (i % 27);
      rows.push({
        inscode,
        l18: (kind === 'call' ? 'ض' : 'ط') + 'هرم' + strike,
        l30: (kind === 'call' ? 'اختیارخ ' : 'اختیارف ') + u + '-' + strike + '-' +
             jy + '/' + String(jm).padStart(2, '0') + '/' + String(jd).padStart(2, '0'),
        pl: S,
        pc: strike,
        plc: 0, pcp: 0, plp: 0,   // filled below with a BS-consistent market price
        tvol: 1000 + (i % 9000),
        tno: 20 + (i % 300),
      });
    } else {
      rows.push({
        inscode,
        l18: u + String(1000 + i),
        l30: u,
        pl: 3000 + (i % 7000), pc: 2950 + (i % 700), plc: 3010 + (i % 500),
        pcp: 2990 + (i % 500), plp: 3005 + (i % 500),
        tvol: 1000 + (i % 9000), tno: 20 + (i % 300),
      });
    }
  }
  // synthesize a realistic market price: BS price at TRUE_SIGMA (+ small noise)
  for (const r of rows) {
    if (!r.plc) continue;
    const kind = r.l18[0] === 'ض' ? 'call' : 'put';
    const g = bsGreeks({ S: r.pl, K: r.pc, T, r: R, sigma: TRUE_SIGMA, kind });
    const premium = Math.max(1, g.price);
    r.plc = premium * (1 + ((r.inscode.charCodeAt(3) % 7) - 3) * 0.01);
    r.pcp = premium * 0.98;
    r.plp = premium * 1.01;
  }
  return rows;
}

function bench(label, fn, iters) {
  // warmup
  for (let i = 0; i < Math.min(50, iters); i++) fn(i);
  const t0 = process.hrtime.bigint();
  let acc = 0;
  for (let i = 0; i < iters; i++) acc += fn(i) ? 1 : 0;
  const t1 = process.hrtime.bigint();
  const totalMs = Number(t1 - t0) / 1e6;
  const perUs = (totalMs * 1000) / iters;
  console.log(
    label.padEnd(46) +
    ' total=' + totalMs.toFixed(2).padStart(9) + 'ms' +
    '  per-call=' + perUs.toFixed(2).padStart(8) + 'us' +
    '  iters=' + iters + (acc < 0 ? '' : '')
  );
  return { label, totalMs, perUs, iters };
}

const rows = makeRows(TOTAL_SYMBOLS, OPTION_ROWS / TOTAL_SYMBOLS);
const optionRows = rows.filter(r => r.inscode && /^[ضط]/.test(r.l18));
console.log('rows=' + rows.length + ' optionLike=' + optionRows.length + ' greeks VERSION=' + VERSION);
console.log('--- per-symbol costs (node v' + process.version + ') ---');

// 1) parse only
bench('parseOptionLabel(all rows)', i => { parseOptionLabel(rows[i % rows.length]); return false; }, rows.length * 20);
bench('parseOptionLabel(option rows only)', i => { parseOptionLabel(optionRows[i % optionRows.length]); return false; }, optionRows.length * 20);

// 2) real repo BS+IV per option row (impliedVol = bisection up to 100 iters x bsGreeks)
{
  const iters = [];
  bench('impliedVol(real repo, 1 option row)', i => {
    const r = optionRows[i % optionRows.length];
    const v = impliedVol({ S: parseFloat(r.pl), K: parseFloat(r.pc), T, r: R, kind: i % 2 ? 'put' : 'call', marketPrice: parseFloat(r.plc) });
    iters.push(v.iterations);
    return false;
  }, optionRows.length * 20);
  const avg = iters.reduce((a, b) => a + b, 0) / iters.length;
  const max = Math.max.apply(null, iters);
  console.log('  -> impliedVol iterations: avg=' + avg.toFixed(1) + ' max=' + max + ' (cap 100)');
}

// 3) bsGreeks alone
bench('bsGreeks(1 row, sigma known)', i => {
  const r = optionRows[i % optionRows.length];
  bsGreeks({ S: parseFloat(r.pl), K: parseFloat(r.pc), T, r: R, sigma: 0.35, kind: i % 2 ? 'put' : 'call' });
  return false;
}, optionRows.length * 20);

// 4) full pipeline per option row: parse + impliedVol + bsGreeks
bench('FULL parse+impliedVol+bsGreeks (1 opt row)', i => {
  const r = optionRows[i % optionRows.length];
  const p = parseOptionLabel(r);
  if (p.status !== 'confirmed') return false;
  const iv = impliedVol({ S: parseFloat(r.pl), K: p.strike, T, r: R, kind: p.kind, marketPrice: parseFloat(r.plc) });
  const g = bsGreeks({ S: parseFloat(r.pl), K: p.strike, T, r: R, sigma: iv.sigma, kind: p.kind });
  return !!(g && g.delta);
}, optionRows.length * 20);

// 5) v9-probe style light funnel (60-iter bisection solveIV + delta + gamma) for comparison
const lightErf = new Function('x', 'var t=1/(1+0.3275911*Math.abs(x));var y=1-((((1.061405429*t-1.453152027)*t+1.421413741)*t-0.284496736)*t+0.254829592)*t*Math.exp(-x*x);return 0.5*(1+(x<0?-1:1)*y);');
const solveIVLight = new Function('__erf', 'return function(S,K,T,r,mp){var lo=0.01,hi=3.0,mid,it;for(it=0;it<60;it++){mid=(lo+hi)/2;var d1=(Math.log(S/K)+(r+mid*mid/2)*T)/(mid*Math.sqrt(T));var px=S*__erf(d1/Math.SQRT2)-K*Math.exp(-r*T)*__erf((d1-mid*Math.sqrt(T))/Math.SQRT2);if(px>mp)hi=mid;else lo=mid;}return mid;};')(lightErf);
bench('LIGHT v9-style solveIV+delta+gamma (1 row)', i => {
  const r = optionRows[i % optionRows.length];
  const S = parseFloat(r.pl), K = parseFloat(r.pc), mp = parseFloat(r.plc);
  const iv = solveIVLight(S, K, T, R, mp);
  const d1 = (Math.log(S / K) + (R + iv * iv / 2) * T) / (iv * Math.sqrt(T));
  const delta = lightErf(d1 / Math.SQRT2);
  const gamma = Math.exp(-Math.pow(Math.log(S / K) + (R + iv * iv / 2) * T, 2) / (2 * iv * iv * T)) / (S * iv * Math.sqrt(2 * Math.PI * T));
  return delta > 0 && gamma > 0;
}, optionRows.length * 20);

// 6) extrapolation to full 3282 symbols
console.log('--- extrapolation to ' + TOTAL_SYMBOLS + ' dirty symbols (funnel applied to option rows only) ---');
const iv = bench('impliedVol 800 rows (one pass)', i => {
  const r = optionRows[i];
  impliedVol({ S: parseFloat(r.pl), K: parseFloat(r.pc), T, r: R, kind: i % 2 ? 'put' : 'call', marketPrice: parseFloat(r.plc) });
  return false;
}, optionRows.length);
console.log('  -> impliedVol for all ' + optionRows.length + ' option rows = ' + iv.totalMs.toFixed(1) + 'ms');

const full = bench('FULL pipeline 800 option rows', i => {
  const r = optionRows[i];
  const p = parseOptionLabel(r);
  if (p.status !== 'confirmed') return false;
  const v = impliedVol({ S: parseFloat(r.pl), K: p.strike, T, r: R, kind: p.kind, marketPrice: parseFloat(r.plc) });
  const g = bsGreeks({ S: parseFloat(r.pl), K: p.strike, T, r: R, sigma: v.sigma, kind: p.kind });
  return !!(g && g.delta);
}, optionRows.length);
console.log('  -> parse+impliedVol+bsGreeks for all option rows = ' + full.totalMs.toFixed(1) + 'ms');

// 7) COLD single-shot cost (B runs once per snapshot — first call is cold)
{
  const samples = [];
  for (let s = 0; s < 200; s++) {
    const r = optionRows[s % optionRows.length];
    const ivFn = new Function('bsGreeks', 'return function(S,K,T,r,mp){let low=0.01,high=3.0,mid,price,iter=0;let lp=bsGreeks({S,K,T,r,sigma:low,kind:"call"}).price;let hp=bsGreeks({S,K,T,r,sigma:high,kind:"call"}).price;for(iter=0;iter<100;iter++){mid=(low+high)/2;price=bsGreeks({S,K,T,r,sigma:mid,kind:"call"}).price;if(Math.abs(price-mp)<1e-6)break;if(price>mp)high=mid;else low=mid;if(high-low<1e-7)break;}return mid;};')(bsGreeks);
    const t0 = process.hrtime.bigint();
    ivFn(r.pl, r.pc, T, R, r.plc);
    const t1 = process.hrtime.bigint();
    samples.push(Number(t1 - t0) / 1e6);
  }
  samples.sort((a, b) => a - b);
  console.log('COLD single-shot impliedVol (new Function, first call): median=' +
    samples[100].toFixed(3) + 'ms  p10=' + samples[20].toFixed(3) + 'ms  p90=' + samples[180].toFixed(3) + 'ms');
}

// 8) PRODUCTION-style funnel: parse + firstModel + bsGreeks + impliedVol + garch + svi per row
try {
  const garchMod = require(path.join(__dirname, '..', 'src', 'models', 'garch.v0.1.0.js'));
  const sviMod = require(path.join(__dirname, '..', 'src', 'models', 'svi.v0.1.0.js'));
  const closes = [];
  let p = 50000;
  for (let i = 0; i < 60; i++) { p = p * (1 + (Math.sin(i * 1.7) * 0.01)); closes.push(p); }
  const sviParams = sviMod.DEFAULT_SVI_PARAMS;
  bench('PROD parse+firstModel+iv+greeks+garch+svi', i => {
    const r = optionRows[i % optionRows.length];
    const parsed = parseOptionLabel(r);
    if (parsed.status !== 'confirmed') return false;
    const kind = parsed.kind;
    const S = r.pl, K = parsed.strike;
    const v = impliedVol({ S, K, T, r: R, kind, marketPrice: r.plc });
    const g = bsGreeks({ S, K, T, r: R, sigma: v.sigma, kind });
    const gv = garchMod.garch11(closes);
    const sv = sviMod.sviForStrike(S, K, T, R, sviParams);
    return !!(g && gv && sv);
  }, optionRows.length * 10);
  console.log('  (garch uses a synthetic 60-close series — per-row garch/svi cost included)');
} catch (e) {
  console.log('PROD scenario skipped: ' + e.message);
}

console.log('DONE');
