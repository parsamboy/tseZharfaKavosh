/**
 * G-13 — bridge confirmation, authoritative state, trace
 * Checks: applyBridge must be confirmed via FilterCode/SaveParams and trace
 */
(function g13(){
  var out={
    meta:{ test:'G13-BRIDGE-v1', gate:'G-13', evidenceId:'E-021-draft' },
    bridge:{ apply:'ApplyBridge interface', authoritative:'FilterCode from mw.Settings.Filters', confirmation:'SaveParams probe pending', trace:['submit','accepted','running','done'] },
    status:'needs-probe',
    bestChoice:'Bridge authoritative state is FilterCode/SaveParams on old.tsetmc.com — needs live ApplyBridge probe like G-03 but for persistence — gate stays open until probe, but design is candidate'
  };
  console.log('%c[G-13] Bridge','color:#0a7;font-weight:bold');
  console.log(JSON.stringify(out,null,2));
  return out;
})();
