/**
 * tseZharfaKavosh — bridge apply/persist v0.1.0 (G-13)
 * D2 bridge: page -> local service -> TSETMC FilterCode/SaveParams
 * Authoritative state is FilterCode, confirmed via SaveParams round-trip + trace
 * No DOM/timer/network beyond approved mw.* APIs
 * SPDX: Smart-FFA-1.1
 */

const VERSION='0.1.0-bridge-001';
const STATES=['idle','submit','accepted','running','done','failed','cancelled'];

/**
 * @param {object} p { FilterCode:string, snapshotId:string, jobId:string }
 * @returns {object} apply request
 */
function buildApplyRequest(p){
  if(!p || typeof p.FilterCode!=='string' || !p.FilterCode) return { error:'insufficient-data', reason:'FilterCode missing' };
  if(!p.snapshotId || !p.jobId) return { error:'insufficient-data', reason:'snapshotId/jobId missing' };
  return {
    FilterCode: p.FilterCode,
    snapshotId: p.snapshotId,
    jobId: p.jobId,
    trace: [{ state:'submit', at: new Date().toISOString(), FilterCode: p.FilterCode.slice(0,40)+'...' }],
    version: VERSION
  };
}

/**
 * Confirm bridge persistence: FilterCode round-trip
 * @param {string} sentFilterCode
 * @param {string} observedFilterCode - from mw.FilterCode or SaveParams readback
 * @returns {object} confirmation
 */
function confirmBridge(sentFilterCode, observedFilterCode){
  if(typeof sentFilterCode!=='string' || typeof observedFilterCode!=='string') return { confirmed:false, reason:'missing codes' };
  const confirmed = sentFilterCode === observedFilterCode;
  return {
    confirmed,
    sent: sentFilterCode.slice(0,60),
    observed: observedFilterCode.slice(0,60),
    trace: [{ state: confirmed ? 'done' : 'failed', at: new Date().toISOString(), confirmed }]
  };
}

/**
 * Trace validation: must be ordered submit->accepted->running->done (or failed/cancelled)
 */
function validateTrace(trace){
  if(!Array.isArray(trace) || trace.length===0) return { valid:false, reason:'empty trace' };
  const order={ submit:0, accepted:1, running:2, done:3, failed:3, cancelled:3 };
  for(let i=1;i<trace.length;i++){
    const prev=order[trace[i-1].state], curr=order[trace[i].state];
    if(curr==null || prev==null) return { valid:false, reason:'unknown state '+trace[i].state };
    if(curr < prev) return { valid:false, reason:'out of order '+trace[i-1].state+'->'+trace[i].state };
  }
  return { valid:true };
}

module.exports={ buildApplyRequest, confirmBridge, validateTrace, STATES, VERSION };
if(typeof window!=='undefined') window.TseBridge={ buildApplyRequest, confirmBridge, validateTrace, STATES, VERSION };
