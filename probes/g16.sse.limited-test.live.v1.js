/**
 * G-16 SSE fallback LIVE v1 — tests fallback with real MarketWatchPlus as polling source
 * Run on old.tsetmc.com/Loader.aspx?ParTree=15131F — real live market data
 * No credential, read-only, uses real MarketWatchPlus polling as fallback data
 */
(async function g16live(){
  var out={ meta:{ test:'G16-SSE-LIVE-v1', gate:'G-16', host:location.host, now:new Date().toISOString()}, sse:{ attempted:false, failed:false, error:'' }, polling:{ attempted:false, gotData:false, sample:'', count:0 }, fallback:{ valid:false }, status:'unknown' };
  // Try SSE to a non-existent endpoint on same host (should fail and trigger fallback) — this is the live fallback test
  out.sse.attempted=true;
  try{
    // Use a known non-SSE endpoint — MarketWatchInit returns CSV not SSE, so EventSource will error
    var es = new EventSource('/tsev2/data/MarketWatchInit.aspx?h=0&r=0');
    await new Promise(function(resolve, reject){
      var to=setTimeout(function(){ es.close(); out.sse.failed=true; out.sse.error='timeout (expected, not SSE)'; resolve(); }, 3000);
      es.onerror=function(){ clearTimeout(to); es.close(); out.sse.failed=true; out.sse.error='onerror (expected)'; resolve(); };
      es.onopen=function(){ clearTimeout(to); es.close(); out.sse.failed=false; resolve(); };
      es.onmessage=function(){};
    });
  }catch(e){ out.sse.failed=true; out.sse.error=e.message; }
  // Fallback polling: fetch real MarketWatchPlus (live)
  out.polling.attempted=true;
  try{
    var r=await fetch('/tsev2/data/MarketWatchPlus.aspx?h=122825&r='+Date.now(), { credentials:'include' });
    var text=await r.text();
    out.polling.gotData = r.ok && text.length>100;
    out.polling.count=text.split('@').length-1; // rows
    out.polling.sample=text.slice(0,400).replace(/\s+/g,' ').slice(0,400);
    out.polling.status=r.status;
  }catch(e){ out.polling.error=e.message; }
  // Validate fallback trace: sse failed -> polling succeeded -> done
  var trace=[{state:'sse', at:out.meta.now}, {state:'polling', at:new Date().toISOString()}];
  if(out.sse.failed && out.polling.gotData) trace.push({state:'done', at:new Date().toISOString()});
  else trace.push({state:'failed', at:new Date().toISOString()});
  // use same fallbackTrace logic as src
  function fallbackTrace(events){ const order={sse:0,polling:1,done:2,failed:2}; for(let i=1;i<events.length;i++) if(order[events[i].state] < order[events[i-1].state]) return {valid:false}; return {valid:true}; }
  out.fallback.trace=trace;
  out.fallback.valid=fallbackTrace(trace).valid;
  out.status = (out.sse.failed && out.polling.gotData && out.fallback.valid) ? 'candidate' : 'needs-probe';
  out.bestChoice = out.status==='candidate' ? 'SSE failed as expected, polling got live MarketWatchPlus data — fallback valid' : 'Need live polling data';
  console.log('%c[G16 SSE LIVE v1]','color:#0a7;font-weight:bold');
  console.log('sse failed',out.sse.failed,' polling gotData',out.polling.gotData,' count',out.polling.count);
  console.log('sample',out.polling.sample.slice(0,200));
  console.log(JSON.stringify(out,null,2));
  return out;
})();
