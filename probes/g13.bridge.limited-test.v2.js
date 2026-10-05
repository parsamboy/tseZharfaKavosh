/**
 * G-13 bridge v2 — authoritative FilterCode/SaveParams + trace
 * Run on old.tsetmc.com/Loader.aspx?ParTree=15131F — reads mw.FilterCode, mw.SaveParams, mw.Settings
 */
(function g13v2(){
  var out={ meta:{ test:'G13-BRIDGE-v2', gate:'G-13', version:'0.1.0-bridge-001', host:location.host, now:new Date().toISOString()}, filterCode:{ value:null, len:0, preview:'', has:false }, saveParams:{ type:null, snippet:'' }, settings:{ FilterNo:null, has:false }, trace:{ states:['submit','accepted','running','done'], sample:[] }, status:'unknown' };
  try{
    var fc=window.mw && window.mw.FilterCode;
    out.filterCode.has = typeof fc==='string' || typeof fc==='number';
    if(typeof fc==='string'){ out.filterCode.value=fc.slice(0,200); out.filterCode.len=fc.length; out.filterCode.preview=fc.slice(0,80); }
    else if(typeof fc==='number'){ out.filterCode.value=String(fc); out.filterCode.len=String(fc).length; }
    var sp=window.mw && window.mw.SaveParams;
    out.saveParams.type=typeof sp;
    if(typeof sp==='function'){ try{ out.saveParams.snippet=String(sp).slice(0,800).replace(/\s+/g,' ').slice(0,800); }catch(e){} }
    else if(sp!=null){ try{ out.saveParams.snippet=JSON.stringify(sp).slice(0,600); }catch(e){ out.saveParams.snippet=String(sp).slice(0,600);} }
    var st=window.mw && window.mw.Settings;
    if(st && typeof st==='object'){ out.settings.FilterNo=st.FilterNo; out.settings.has=true; }
    // build sample apply request (without actually applying)
    var sampleFC = out.filterCode.value || "(none)";
    out.trace.sample=[{state:'submit', at:out.meta.now, FilterCode:sampleFC.slice(0,40)}, {state:'accepted', at:out.meta.now}, {state:'running', at:out.meta.now}, {state:'done', at:out.meta.now, confirmed:true}];
    // validate trace ordering
    function validateTrace(trace){
      const order={submit:0,accepted:1,running:2,done:3,failed:3,cancelled:3};
      for(let i=1;i<trace.length;i++) if(order[trace[i].state] < order[trace[i-1].state]) return false;
      return true;
    }
    out.trace.valid=validateTrace(out.trace.sample);
    out.status = out.filterCode.has ? 'candidate' : 'needs-probe';
    out.bestChoice = out.filterCode.has ? 'FilterCode authoritative exists — bridge can use SaveParams round-trip' : 'No FilterCode string — needs live ApplyBridge probe';
  }catch(e){ out.error=e.message; }
  console.log('%c[G13 v2] bridge','color:#0a7;font-weight:bold');
  console.log('FilterCode has',out.filterCode.has,' len',out.filterCode.len,' preview',out.filterCode.preview);
  console.log('SaveParams type',out.saveParams.type,' snippet',out.saveParams.snippet.slice(0,200));
  console.log('Settings FilterNo',out.settings.FilterNo);
  console.log(JSON.stringify(out,null,2));
  return out;
})();
