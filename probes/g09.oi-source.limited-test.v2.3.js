/**
 * G-09 OI v2.3 — inspect InstHistory / InstStat / cfield values for OI
 * Run on old.tsetmc.com/Loader.aspx?ParTree=15131F after table load
 * This drills into the objects found in v2.2: InstHistory, InstStat, and MarketWatchPlus polling
 */
(function g09v23(){
  var out={ meta:{ test:'G09-OI-v2.3', host:location.host }, instHistory:{ keys:[], sampleEntries:[] }, instStat:{ keys:[], sampleEntries:[] }, allRowsCfields:{ sample:[] }, perfPlus:{ hasPlus:false, plusUrls:[] }, hypothesis:'' };
  try{
    var res=performance.getEntriesByType('resource')||[];
    out.perfPlus.plusUrls=res.map(function(r){return r.name||'';}).filter(function(u){return u.indexOf('MarketWatchPlus')!==-1;}).slice(-3);
    out.perfPlus.hasPlus=out.perfPlus.plusUrls.length>0;
  }catch(e){}
  try{
    var ih=window.mw && window.mw.InstHistory;
    if(ih && typeof ih==='object'){
      var keys=Object.keys(ih);
      out.instHistory.keys=keys.slice(0,5);
      // sample first 2 entries
      for(var i=0;i<Math.min(2,keys.length);i++){
        var k=keys[i], v=ih[k];
        var s='';
        try{ s=JSON.stringify(v).slice(0,1200); }catch(e){ s=String(v).slice(0,1200); }
        out.instHistory.sampleEntries.push({ key:k, type:typeof v, isArray:Array.isArray(v), jsonSnippet:s, keysInside: (v&&typeof v==='object' && !Array.isArray(v)) ? Object.keys(v).slice(0,15) : (Array.isArray(v) && v[0] && typeof v[0]==='object' ? Object.keys(v[0]).slice(0,15) : []) });
        // check if any nested key looks like OI
        var low=JSON.stringify(v).toLowerCase();
        if(low.indexOf('oi')!==-1 || low.indexOf('openinterest')!==-1 || low.indexOf('موقعیت')!==-1) out.instHistory.hintOI=true;
      }
    }
  }catch(e){ out.instHistory.error=e.message; }
  try{
    var is=window.mw && window.mw.InstStat;
    if(is && typeof is==='object'){
      var keys2=Object.keys(is);
      out.instStat.keys=keys2.slice(0,5);
      for(var j=0;j<Math.min(2,keys2.length);j++){
        var k2=keys2[j], v2=is[k2];
        var s2='';
        try{ s2=JSON.stringify(v2).slice(0,1200); }catch(e){ s2=String(v2).slice(0,1200); }
        out.instStat.sampleEntries.push({ key:k2, type:typeof v2, jsonSnippet:s2, keysInside: (v2&&typeof v2==='object' && !Array.isArray(v2)) ? Object.keys(v2).slice(0,15) : [] });
      }
    }
  }catch(e){ out.instStat.error=e.message; }
  try{
    var rows=window.mw && window.mw.AllRows, vals=[];
    if(rows && typeof rows==='object' && !Array.isArray(rows)) vals=Object.values(rows);
    else if(Array.isArray(rows)) vals=rows;
    function isOpt(r){ var l18=String(r.l18||'').trim(), l30=String(r.l30||''); return (l18[0]==='ض'||l18[0]==='ط') && (l30.indexOf('اختيار')!==-1||l30.indexOf('اختیار')!==-1); }
    var opts=vals.filter(isOpt).slice(0,2);
    out.allRowsCfields.sample=opts.map(function(r){
      return { l18:r.l18, inscode:r.inscode, cfield0:r.cfield0, cfield1:r.cfield1, cfield2:r.cfield2, flow:r.flow, cgrvalcot:r.cgrvalcot, yval:r.yval, tvol:r.tvol, pmax:r.pmax, pmin:r.pmin, eps:r.eps };
    });
  }catch(e){ out.allRowsCfields.error=e.message; }
  // also check LoadInstHistory function to see endpoint it calls
  try{
    var fn=window.mw && window.mw.LoadInstHistory;
    if(typeof fn==='function') out.loadInstHistorySnippet=String(fn).slice(0,1200).replace(/\s+/g,' ').slice(0,1200);
  }catch(e){}
  out.hypothesis = out.instHistory.hintOI ? 'OI found inside InstHistory' : (out.perfPlus.hasPlus ? 'MarketWatchPlus is the polling endpoint — OI may be in its payload but not in AllRows; check InstHistory/InstStat details' : 'No OI in AllRows/cfields/InstHistory visible');
  console.log('%c[G09 v2.3] InstHistory/InstStat/cfields','color:#0a7;font-weight:bold');
  console.log('InstHistory keys',out.instHistory.keys,' hintOI',out.instHistory.hintOI);
  console.log('InstHistory samples',out.instHistory.sampleEntries);
  console.log('InstStat keys',out.instStat.keys,' samples',out.instStat.sampleEntries);
  console.log('cfields sample',out.allRowsCfields.sample);
  console.log('LoadInstHistory fn',out.loadInstHistorySnippet);
  console.log('Plus urls',out.perfPlus.plusUrls);
  console.log(JSON.stringify(out,null,2));
  return out;
})();
