/**
 * tseZharfaKavosh — Jalali (Shamsi) <-> Gregorian calendar v0.1.0
 * Depends on: nothing (pure integer date arithmetic)
 * Purpose: option expiry in TSETMC l30 labels is Jalali ("...-1405/07/29"), while the
 *   engine needs a maturity in years. This module converts an expiry label into a
 *   day count so the engine can compute T = DTE/365 (owner decision q9) instead of
 *   modelling every option as 30 days.
 * Provenance: the conversion below is the same code that ran inside
 *   probes/ivfilter.borderline.live.v1.js, where two anchors were verified live:
 *     1405/01/01 == 2026-03-21   and   1405/07/29 == 2026-10-21 (3 days out at the
 *   time of the live run, 2026-10-18). Both are re-asserted in engine.parity.v1.js
 *   so a future edit cannot silently break the maturity of every option.
 * Pure functions, no I/O, no fabrication — an unparseable date returns null.
 * SPDX: Smart-FFA-1.1
 */

// Days in each Jalali month; Esfand is 29 here because the leap day is carried by
// the day index (jd up to 30), not by this table — only FULL months are summed.
const J_MONTH_DAYS = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29];
// Julian Day Number of 1 Farvardin 979 (the Jalali epoch used by this algorithm)
const J_EPOCH_JDN = 2305527;

/**
 * Gregorian (y, m, d) -> Julian Day Number (proleptic Gregorian, m is 1-based).
 * @param {number} y
 * @param {number} m 1..12
 * @param {number} d 1..31
 * @returns {number}
 */
function gregToJDN(y, m, d) {
  const a = Math.floor((14 - m) / 12), y2 = y + 4800 - a, m2 = m + 12 * a - 3;
  return d + Math.floor((153 * m2 + 2) / 5) + 365 * y2 + Math.floor(y2 / 4) -
         Math.floor(y2 / 100) + Math.floor(y2 / 400) - 32045;
}

/**
 * Julian Day Number -> Gregorian {y, m, d} (m is 1-based). Inverse of gregToJDN.
 * @param {number} j
 * @returns {{y:number,m:number,d:number}}
 */
function jdnToGreg(j) {
  const a = j + 32044, b = Math.floor((4 * a + 3) / 146097), c = a - Math.floor(146097 * b / 4);
  const d = Math.floor((4 * c + 3) / 1461), e = c - Math.floor(1461 * d / 4);
  const m = Math.floor((5 * e + 2) / 153);
  return { y: 100 * b + d - 4800 + Math.floor(m / 10), m: m + 3 - 12 * Math.floor(m / 10),
           d: e - Math.floor((153 * m + 2) / 5) + 1 };
}

/**
 * Jalali (Shamsi) (jy, jm, jd) -> Julian Day Number.
 * @param {number} jy e.g. 1405
 * @param {number} jm 1..12
 * @param {number} jd 1..31
 * @returns {number}
 */
function jalaliToJDN(jy, jm, jd) {
  const jy1 = jy - 979;
  let j = 365 * jy1 + Math.floor(jy1 / 33) * 8 + Math.floor((jy1 % 33 + 3) / 4);
  for (let i = 0; i < jm - 1; i++) j += J_MONTH_DAYS[i];
  return J_EPOCH_JDN + j + jd - 1;
}

/**
 * Julian Day Number -> Jalali {jy, jm, jd}. Inverse of jalaliToJDN.
 * Needed by anything that has to BUILD an expiry label (test fixtures, the option
 * chain's "next expiry" chips) - without it a caller would hardcode a date and go
 * stale the moment the month turned.
 * @param {number} j
 * @returns {{jy:number,jm:number,jd:number}}
 */
function jdnToJalali(j) {
  let jy = 979 + Math.floor((j - J_EPOCH_JDN) / 366);
  while (jalaliToJDN(jy, 1, 1) > j) jy--;
  while (jalaliToJDN(jy + 1, 1, 1) <= j) jy++;
  let days = j - jalaliToJDN(jy, 1, 1);
  let jm = 1;
  while (jm < 12 && days >= J_MONTH_DAYS[jm - 1]) { days -= J_MONTH_DAYS[jm - 1]; jm++; }
  return { jy: jy, jm: jm, jd: days + 1 };
}

/**
 * An expiry label as it appears in TSETMC l30 ("...-1405/07/29" or "...-14050729")
 * -> whole days from today. Accepts only the exact Jalali shapes the parser emits,
 * so a garbled label yields null (insufficient maturity) instead of a wrong T.
 * @param {string} expiryStr
 * @param {number} todayJDN JDN of "today" (see jalaliTodayJDN)
 * @returns {number|null} days to expiry (can be <= 0 for an expired option)
 */
function daysToExpiry(expiryStr, todayJDN) {
  const m = String(expiryStr || '').match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
  if (!m) return null;
  const jm = +m[2], jd = +m[3];
  if (jm < 1 || jm > 12 || jd < 1 || jd > 31) return null;
  return jalaliToJDN(+m[1], jm, jd) - todayJDN;
}

/**
 * JDN of a JS Date in the LOCAL timezone (not UTC: an expiry is a market date, and
 * a UTC shift near midnight would move a 1-day option by a whole day).
 * @param {Date} [d]
 * @returns {number}
 */
function localDateToJDN(d) {
  const t = d || new Date();
  return gregToJDN(t.getFullYear(), t.getMonth() + 1, t.getDate());
}

/**
 * The calendar hook the engine injects: calendar(expiry, nowMs) -> days | null.
 * @returns {function(string, number): (number|null)}
 */
function createCalendar() {
  return function calendar(expiry, nowMs) {
    const todayJDN = localDateToJDN(nowMs ? new Date(nowMs) : new Date());
    return daysToExpiry(expiry, todayJDN);
  };
}

const VERSION = '0.1.0-jalaliCalendar-001';
module.exports = { gregToJDN, jdnToGreg, jalaliToJDN, jdnToJalali, daysToExpiry,
                   localDateToJDN, createCalendar, VERSION };
if (typeof window !== 'undefined') {
  window.TseCalendar = { gregToJDN, jdnToGreg, jalaliToJDN, jdnToJalali, daysToExpiry,
                         localDateToJDN, createCalendar, VERSION };
}
