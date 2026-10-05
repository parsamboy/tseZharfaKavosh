/**
 * GARCH v1.2 — check Settings.LoadInstHistory and try to trigger history load
 * If 0, history won't load — need to set 1 or use alternative Financial.aspx
 */
(function garch12(){
  var out={ meta:{ test:'G11-GARCH-v1.2', host:location.host, now:new Date().toISOString()}, settings:{ LoadInstHistory:null, allSettings:{} }, instHistory:{ totalKeys:0, sampleKeys:[] }, tryLoad:{ attempted:false, result:'' }, alt:{ financialUrl:'', note:'' } };
  try{
    var s=window.mw && window.mw.Settings;
    if(s){
      out.settings.LoadInstHistory=s.LoadInstHistory;
      out.settings.allSettings={ LoadInstHistory:s.LoadInstHistory, LoadInstHistory_raw: s.LoadInstHistory, FilterNo:s.FilterNo, UpdateSpeed:s.UpdateSpeed };
    }
    var ih=window.mw && window.mw.InstHistory;
    out.instHistory.totalKeys=ih?Object.keys(ih).length:0;
    out.instHistory.sampleKeys=ih?Object.keys(ih).slice(0,3):[];
    // Try to see if LoadInstHistory function exists and what it does
    var fn=window.mw && window.mw.LoadInstHistory;
    out.tryLoad.fnExists=typeof fn==='function';
    if(typeof fn==='function'){
      out.tryLoad.fnSnippet=String(fn).slice(0,600).replace(/\s+/g,' ').slice(0,600);
      // If LoadInstHistory==0, try to set to 1 and call (read-only? will trigger network)
      if(s && s.LoadInstHistory===0){
        out.tryLoad.note='LoadInstHistory is 0 — history disabled per settings. Try to enable?';
        // Alternative: Financial.aspx is public history without needing LoadInstHistory
        out.alt.financialUrl='http://members.tsetmc.com/tsev2/chart/data/Financial.aspx?i=17914401175772326&t=ph&a=1 (for اهرم)';
        out.alt.note='Financial.aspx is public chart history (via web_search farbod-s/tsetmc.py) — can be used for GARCH without InstHistory';
      } else if(s && s.LoadInstHistory!==0){
        out.tryLoad.note='LoadInstHistory !=0 — should be loading, but totalKeys 0 suggests not yet fetched (need wait)';
      }
    }
    // Check Financial.aspx via performance? Not yet, just note
  }catch(e){ out.error=e.message; }
  console.log('%c[G11 GARCH v1.2]','color:#0a7;font-weight:bold');
  console.log('Settings.LoadInstHistory',out.settings.LoadInstHistory,' totalKeys',out.instHistory.totalKeys);
  console.log('LoadInstHistory fn',out.tryLoad.fnSnippet);
  console.log('alt',out.alt);
  console.log(JSON.stringify(out,null,2));
  return out;
})();
