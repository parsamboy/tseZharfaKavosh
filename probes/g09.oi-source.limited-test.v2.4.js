/**
 * G-09 OI v2.4 — search for Option/OI endpoints in page source and mw field map
 * Run on old.tsetmc.com/Loader.aspx?ParTree=15131F and also on tsetmc.com option inst page
 */
(function g09v24(){
  var out={ meta:{test:'G09-OI-v2.4', host:location.host, href:location.href}, pageSource:{ optionUrls:[], oiUrls:[], allDataUrls:[] }, fieldMap:{ keys:[], hasOI:false }, instStatFieldMap:{ sampleFieldIds:[], decoded:[] } };
  try{
    var html=document.documentElement.innerHTML.slice(0,30000);
    var urls=html.match(/https?:\/\/[^\"'\) ]+/g)||[];
    out.pageSource.allDataUrls=urls.filter(function(u){ return u.indexOf('tsetmc')!==-1 || u.indexOf('/tsev2/')!==-1; }).slice(0,20);
    out.pageSource.optionUrls=urls.filter(function(u){ var low=u.toLowerCase(); return low.indexOf('option')!==-1; }).slice(0,10);
    out.pageSource.oiUrls=urls.filter(function(u){ var low=u.toLowerCase(); return low.indexOf('oi')!==-1||low.indexOf('open')!==-1; }).slice(0,10);
    // also check inline scripts for endpoint strings
    var scripts=Array.from(document.querySelectorAll('script')).map(function(s){return (s.textContent||'').slice(0,2000);}).join(' ');
    var m=scripts.match(/\/tsev2\/data\/[A-Za-z0-9_.]+/g)||[];
    out.pageSource.inlineEndpoints=[...new Set(m)].slice(0,20);
  }catch(e){ out.pageSource.error=e.message; }
  try{
    var fm=window.mw && window.mw.field;
    if(fm) {
      out.fieldMap.keys=Object.keys(fm).slice(0,30);
      var lowKeys=Object.keys(fm).join(',').toLowerCase();
      out.fieldMap.hasOI= lowKeys.indexOf('oi')!==-1 || lowKeys.indexOf('open')!==-1;
    }
    // InstStat field id decoding: try mw.field numeric mapping if exists
    // sample InstStat numeric keys 50-89 — try to map via inspecting mw.field values?
    var is=window.mw && window.mw.InstStat;
    if(is){
      var firstKey=Object.keys(is)[0];
      var entry=is[firstKey];
      if(entry) {
        out.instStatFieldMap.sampleFieldIds=Object.keys(entry).slice(0,15);
        // try to guess mapping: 50-89 maybe correspond to cfield? Not sure, just record
        out.instStatFieldMap.decoded=Object.keys(entry).slice(0,10).map(function(id){ return id+'='+entry[id]; });
      }
    }
  }catch(e){ out.fieldMap.error=e.message; }
  console.log('%c[G09 v2.4] Option/OI endpoints in page','color:#0a7;font-weight:bold');
  console.log('allDataUrls',out.pageSource.allDataUrls);
  console.log('optionUrls',out.pageSource.optionUrls);
  console.log('inlineEndpoints',out.pageSource.inlineEndpoints);
  console.log('fieldMap keys',out.fieldMap.keys,' hasOI',out.fieldMap.hasOI);
  console.log('InstStat sample decoded',out.instStatFieldMap.decoded);
  console.log(JSON.stringify(out,null,2));
  return out;
})();
