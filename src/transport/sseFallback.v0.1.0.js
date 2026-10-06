/**
 * tseZharfaKavosh — SSE fallback v0.1.0 (G-16)
 * D2 Hybrid: HTTP/JSON + SSE with fallback to polling per PART U §13
 * Config: maxAttempts, pollInterval, maxFallbackDuration — versioned, traced
 * SPDX: Smart-FFA-1.1
 */
const VERSION='0.1.0-sse-001';
const DEFAULT_CONFIG={
  maxAttempts: 5,
  pollInterval: 2000, // ms
  maxFallbackDuration: 30000, // ms
  sseRetry: 1000
};

/**
 * @param {object} config
 * @returns {object} validated config or error
 */
function validateConfig(config={}){
  const c={...DEFAULT_CONFIG, ...config};
  if(!Number.isInteger(c.maxAttempts) || c.maxAttempts<1 || c.maxAttempts>10) return { error:'invalid maxAttempts 1..10' };
  if(!Number.isInteger(c.pollInterval) || c.pollInterval<500 || c.pollInterval>10000) return { error:'invalid pollInterval' };
  if(!Number.isInteger(c.maxFallbackDuration) || c.maxFallbackDuration<5000 || c.maxFallbackDuration>120000) return { error:'invalid maxFallbackDuration' };
  return { config:c, version:VERSION };
}

/**
 * Fallback state machine: sse -> polling -> done/failed
 */
function fallbackTrace(events){
  // events: [{state, at}]
  const order={ sse:0, polling:1, done:2, failed:2 };
  for(let i=1;i<events.length;i++){
    if(order[events[i].state] < order[events[i-1].state]) return { valid:false, reason:'out of order' };
  }
  return { valid:true };
}

module.exports={ validateConfig, fallbackTrace, DEFAULT_CONFIG, VERSION };
if(typeof window!=='undefined') window.TseSseFallback={ validateConfig, fallbackTrace, DEFAULT_CONFIG, VERSION };
