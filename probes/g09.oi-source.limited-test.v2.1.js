/**
 * G-09 OI v2.1 — drill into InstHistory + DOM OI columns (follow-up to v2 hint)
 * Run on old.tsetmc.com/Loader.aspx?ParTree=15131F where InstHistory was found
 * Read-only: inspects mw.InstHistory keys/values and table header text containing OI/موقعیت باز
 */
(function g09v21(){
  var out={ meta:{ test:'G09-OI-v2.1', host:location.host, href:location.href, parTree:null }, instHistory:{ exists:false, keys:[], sampleKeys:[], sampleVals:[], hintOI:false }, dom:{ headers:[], oiHeaders:[], bodySnippet:'' }, hypothesis:'' };
  try{ out.meta.parTree=new URL(location.href).searchParams.get('ParTree'); }catch(e){}
  try{
    var ih=window.mw && window.mw.InstHistory;
    out.instHistory.exists = !!ih;
    if(ih){
      var t= typeof ih;
      out.instHistory.type=t;
      if(t==='object'){
        try{ out.instHistory.keys=Object.keys(ih).slice(0,50); }catch(e){}
        // if it's array-like, check first entry
        var vals=[]; if(Array.isArray(ih)) vals=ih.slice(0,2); else if(typeof ih==='object') vals=Object.values(ih).slice(0,2);
        out.instHistory.sampleVals=vals.map(function(v){ try{ return JSON.stringify(v).slice(0,800); }catch(e){ return String(v).slice(0,500); } });
        var allKeysStr=JSON.stringify(out.instHistory.keys).toLowerCase();
        out.instHistory.hintOI = allKeysStr.indexOf('oi')!==-1 || allKeysStr.indexOf('open')!==-1 || allKeysStr.indexOf('interest')!==-1;
        // also check sample vals for oi-like
        var sampleStr=out.instHistory.sampleVals.join(' ').toLowerCase();
        if(sampleStr.indexOf('oi')!==-1 || sampleStr.indexOf('openinterest')!==-1) out.instHistory.hintOI=true;
      } else if(t==='function'){
        out.instHistory.note='function — likely fetch method, check its toString for endpoint';
        try{ out.instHistory.fnText=String(ih).slice(0,1000); }catch(e){}
      }
    }
  }catch(e){ out.instHistory.error=e.message; }
  try{
    var ths=Array.from(document.querySelectorAll('th')).map(function(el){return (el.textContent||'').trim();}).filter(Boolean);
    out.dom.headers=ths.slice(0,30);
    out.dom.oiHeaders=ths.filter(function(h){ return h.indexOf('موقعیت')!==-1 || h.indexOf('باز')!==-1 || h.toLowerCase().indexOf('oi')!==-1 || h.indexOf('قرارداد باز')!==-1; });
    out.dom.bodySnippet=(document.body.innerText||'').slice(0,2000).replace(/\s+/g,' ').slice(0,1200);
    out.dom.hasOIHeader=out.dom.oiHeaders.length>0;
  }catch(e){ out.dom.error=e.message; }
  out.hypothesis = out.instHistory.hintOI ? 'InstHistory may hold OI — inspect its keys/endpoint' : (out.dom.hasOIHeader ? 'DOM has OI header — table likely shows OI' : 'No OI hint in InstHistory/DOM on this page — need other endpoint');
  console.log('%c[G09 v2.1] drill InstHistory + DOM','color:#0a7;font-weight:bold');
  console.log('InstHistory exists',out.instHistory.exists,' keys',out.instHistory.keys,' hintOI',out.instHistory.hintOI);
  console.log('Sample vals',out.instHistory.sampleVals);
  console.log('DOM headers',out.dom.headers);
  console.log('OI headers',out.dom.oiHeaders);
  console.log('Hypothesis',out.hypothesis);
  console.log(JSON.stringify(out,null,2));
  return out;
})();
