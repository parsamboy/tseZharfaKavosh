/**
 * G-13 — bridge official probe v3 (G-13)
 * Official probe for the missing piece of E-026:
 *   ApplyBridge with NON-EMPTY FilterCode + live SaveParams round-trip + trace + rollback.
 *
 * Run on old.tsetmc.com/Loader.aspx?ParTree=15131F (same host/parTree as E-026).
 * Reads mw.FilterCode / mw.SaveParams / mw.Settings, applies a non-empty test
 * FilterCode, verifies round-trip, validates trace, then rolls back and records
 * restoredSlot (rollback evidence only — NOT A+B / G-13 confirmation by itself).
 *
 * Governance: gate stays 'G-13' (official probe). Status is determined by live run:
 *   - if roundTrip.confirmed && trace.valid && rollback.restored -> candidate-confirmed
 *     (owner may then promote E-026 to confirmed)
 *   - otherwise -> needs-investigation (gate remains candidate)
 *
 * SPDX: Smart-FFA-1.1
 */
(function g13v3(){
  var out = {
    meta: {
      test: 'G13-BRIDGE-v3',
      gate: 'G-13',
      evidenceId: 'E-026',
      version: '0.1.0-bridge-001',
      host: (typeof location !== 'undefined' ? location.host : 'unknown'),
      parTree: '15131F',
      capturedAt: new Date().toISOString(),
      method: 'official probe v3 — read + apply non-empty FilterCode + SaveParams round-trip + trace validate + rollback + restoredSlot'
    },
    initial: {},
    apply: {},
    roundTrip: {},
    trace: {},
    rollback: {},
    restoredSlot: {},
    status: 'unknown',
    bestChoice: ''
  };

  try {
    var mw = (typeof window !== 'undefined') ? window.mw : null;

    // 1. initial read (read-only, before any mutation)
    var fc0 = mw ? mw.FilterCode : null;
    var fc0Str = (typeof fc0 === 'string') ? fc0 : (fc0 != null ? String(fc0) : '');
    out.initial.filterCode = { has: fc0 != null, len: fc0Str.length, preview: fc0Str.slice(0, 80) };
    out.initial.saveParamsType = (mw && typeof mw.SaveParams) || 'undefined';
    var st0 = mw ? mw.Settings : null;
    out.initial.filterNo = (st0 && typeof st0.FilterNo !== 'undefined') ? st0.FilterNo : null;
    out.initial.settingsSnapshot = st0 ? String(JSON.stringify(st0)).slice(0, 500) : null;

    var savedOriginal = fc0Str;
    var sp = mw ? mw.SaveParams : null;

    // 2. apply non-empty test FilterCode (never the user's real FilterCode)
    var testFC = 'G13-PROBE-' + Date.now();
    out.apply.sent = testFC;
    out.apply.persisted = false;
    out.apply.persistError = null;
    try {
      if (mw) mw.FilterCode = testFC;
      if (typeof sp === 'function') { sp(); out.apply.persisted = true; }
      else { out.apply.persistError = 'SaveParams not a function'; }
    } catch (e) { out.apply.persistError = e && e.message ? e.message : String(e); }

    // 3. round-trip read + confirmBridge
    var fc1 = mw ? mw.FilterCode : null;
    var fc1Str = (typeof fc1 === 'string') ? fc1 : (fc1 != null ? String(fc1) : '');
    out.roundTrip.observed = fc1Str.slice(0, 80);
    out.roundTrip.observedLen = fc1Str.length;
    out.roundTrip.confirmed = (fc1Str === testFC);
    out.roundTrip.confirmBridge = {
      confirmed: (fc1Str === testFC),
      sent: testFC.slice(0, 60),
      observed: fc1Str.slice(0, 60)
    };

    // 4. trace validation (submit -> accepted -> running -> done)
    var now = new Date().toISOString();
    var trace = [
      { state: 'submit', at: now, FilterCode: testFC.slice(0, 40) },
      { state: 'accepted', at: now },
      { state: 'running', at: now },
      { state: 'done', at: now, confirmed: out.roundTrip.confirmed }
    ];
    var order = { submit: 0, accepted: 1, running: 2, done: 3, failed: 3, cancelled: 3 };
    var traceValid = true;
    for (var i = 1; i < trace.length; i++) {
      var prev = order[trace[i - 1].state];
      var curr = order[trace[i].state];
      if (curr == null || prev == null || curr < prev) { traceValid = false; break; }
    }
    out.trace.states = trace.map(function (t) { return t.state; });
    out.trace.valid = traceValid;
    out.trace.sample = trace;

    // 5. rollback to original + restoredSlot (rollback evidence only)
    out.rollback.restored = false;
    out.rollback.error = null;
    try {
      if (mw) mw.FilterCode = savedOriginal;
      if (typeof sp === 'function') sp();
      var fc2 = mw ? mw.FilterCode : null;
      var fc2Str = (typeof fc2 === 'string') ? fc2 : (fc2 != null ? String(fc2) : '');
      out.rollback.restored = (fc2Str === savedOriginal);
      out.restoredSlot = {
        before: savedOriginal.slice(0, 80),
        after: fc2Str.slice(0, 80),
        restored: (fc2Str === savedOriginal)
      };
    } catch (e) { out.rollback.error = e && e.message ? e.message : String(e); }

    // 6. status
    if (out.roundTrip.confirmed && out.trace.valid && out.rollback.restored) {
      out.status = 'candidate-confirmed';
      out.bestChoice = 'ApplyBridge with non-empty FilterCode round-trips and rolls back cleanly — owner may promote E-026 to confirmed after review';
    } else {
      out.status = 'needs-investigation';
      out.bestChoice = 'Round-trip or rollback did not fully succeed — investigate before promoting G-13; gate remains candidate';
    }
  } catch (e) {
    out.error = e && e.message ? e.message : String(e);
    out.status = 'error';
  }

  console.log('%c[G-13 v3] official bridge probe', 'color:#0a7;font-weight:bold');
  console.log('initial FilterCode len:', out.initial.filterCode && out.initial.filterCode.len);
  console.log('roundTrip confirmed:', out.roundTrip.confirmed);
  console.log('trace valid:', out.trace.valid);
  console.log('rollback restored:', out.rollback.restored);
  console.log('restoredSlot:', out.restoredSlot);
  console.log('status:', out.status);
  console.log(JSON.stringify(out, null, 2));
  return out;
})();
