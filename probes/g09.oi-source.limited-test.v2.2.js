/**
 * G-09 OI v2.2 — network + cfield drill (where OI could hide)
 * Run on old.tsetmc.com/Loader.aspx?ParTree=15131F AFTER table has loaded (wait 5s after page load)
 * Checks: performance resources URLs, mw.* function endpoints, and cfield0/1/2 values for OI-like numbers
 */
(function g09v22(){
  var out={ meta:{ test:'G09-OI-v2.2', host:location.host, href:location.href }, perf:{ urls:[], oiUrls:[], count:0 }, mwFuncs:{ list:[], fnSnippets:{} }, cfields:{ sample:[], note:'' }, dom:{ thCount:0, tableCount:0, thText:[] } };
  try{
    // perf resources
    var res=performance.getEntriesByType('resource')||[];
    out.perf.count=res.length;
    out.perf.urls=res.slice(-40).map(function(r){ return (r.name||'').slice(0,180); });
    out.perf.oiUrls=out.perf.urls.filter(function(u){ var low=u.toLowerCase(); return low.indexOf('oi')!==-1||low.indexOf('open')!==-1||low.indexOf('interest')!==-1||low.indexOf('insthistory')!==-1||low.indexOf('option')!==-1; });
  }catch(e){ out.perf.error=e.message; }
  try{
    var mw=window.mw||{};
    var keys=Object.keys(mw).slice(0,80);
    keys.forEach(function(k){
      var v=mw[k];
      if(typeof v==='function'){
        out.mwFuncs.list.push(k+':function');
        try{ out.mwFuncs.fnSnippets[k]=String(v).slice(0,600).replace(/\s+/g,' ').slice(0,600); }catch(e){}
      } else if(v && typeof v==='object'){
        var sub=Object.keys(v).slice(0,10).join(',');
        out.mwFuncs.list.push(k+':'+(Array.isArray(v)?'array len '+v.length:'object keys '+sub));
      } else {
        out.mwFuncs.list.push(k+':'+typeof v);
      }
    });
  }catch(e){ out.mwFuncs.error=e.message; }
  try{
    var rows=window.mw && window.mw.AllRows, vals=[];
    if(rows && typeof rows==='object' && !Array.isArray(rows)) vals=Object.values(rows);
    else if(Array.isArray(rows)) vals=rows;
    function isOpt(r){ var l18=String(r.l18||'').trim(), l30=String(r.l30||''); return (l18[0]==='ض'||l18[0]==='ط') && (l30.indexOf('اختيار')!==-1||l30.indexOf('اختیار')!==-1); }
    var opts=vals.filter(isOpt).slice(0,3);
    out.cfields.sample=opts.map(function(r){ return { l18:r.l18, inscode:r.inscode, cfield0:r.cfield0, cfield1:r.cfield1, cfield2:r.cfield2, flow:r.flow, tvol:r.tvol, cgrvalcot:r.cgrvalcot, yval:r.yval, z:r.z }; });
    out.cfields.note='cfield0/1/2 + flow/cgrvalcot/yval checked — any could be OI if numeric and stable';
  }catch(e){ out.cfields.error=e.message; }
  try{
    var tables=document.querySelectorAll('table');
    out.dom.tableCount=tables.length;
    var ths=Array.from(document.querySelectorAll('th'));
    out.dom.thCount=ths.length;
    out.dom.thText=ths.slice(0,20).map(function(el){return (el.textContent||'').trim().slice(0,60);}).filter(Boolean);
    // also check for any element containing OI text after 5s
    out.dom.bodyHasOI=(document.body.innerText||'').indexOf('موقعیت باز')!==-1 || (document.body.innerText||'').indexOf('قرارداد باز')!==-1;
  }catch(e){ out.dom.error=e.message; }
  console.log('%c[G09 v2.2] perf + mwFuncs + cfields','color:#0a7;font-weight:bold');
  console.log('Perf total',out.perf.count,' oiUrls',out.perf.oiUrls);
  console.log('Perf urls tail',out.perf.urls);
  console.log('mwFuncs',out.mwFuncs.list);
  console.log('cfields sample',out.cfields.sample);
  console.log('DOM thCount',out.dom.thCount,' thText',out.dom.thText,' bodyHasOI',out.dom.bodyHasOI);
  console.log(JSON.stringify(out,null,2));
  return out;
})();
