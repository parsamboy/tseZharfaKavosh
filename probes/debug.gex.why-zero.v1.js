/**
 * Debug why GEX chain 0 — list all ض/ط rows live
 */
(function dbg(){
  var rows=window.mw&&window.mw.AllRows?Object.values(window.mw.AllRows):[];
  console.log('total AllRows', rows.length);
  var optRows=rows.filter(function(r){return String(r.l18).charAt(0)==='ض'||String(r.l18).charAt(0)==='ط';});
  console.log('ض/ط count', optRows.length);
  console.log('samples ض/ط', optRows.slice(0,5).map(function(r){return {l18:r.l18, l30:r.l30, pc:r.pc, tvol:r.tvol};}));
  // try parse like before and log failures
  function parseOpt(l18,l30){
    if(l18.charAt(0)!=='ض'&&l18.charAt(0)!=='ط') return null;
    if(l30.indexOf('اختیار')===-1&&l30.indexOf('اختيار')===-1) return null;
    var parts=l30.split('-'); if(parts.length<3) return null;
    var strike=parseInt(parts[parts.length-2].replace(/,/g,''),10);
    var dateStr=parts[parts.length-1].trim().replace(/\s/g,'');
    var expiry; if(dateStr.indexOf('/')!==-1){ var pp=dateStr.split('/'); if(pp[0].length===2) pp[0]='14'+pp[0]; expiry=pp.join('/'); } else if(/^\d{8}$/.test(dateStr)) expiry=dateStr.slice(0,4)+'/'+dateStr.slice(4,6)+'/'+dateStr.slice(6,8);
    var first=parts[0].replace(/.*اختیارخ\s*/,'').replace(/.*اختيارخ\s*/,'').replace(/.*اختیارف\s*/,'').replace(/.*اختيارف\s*/,'').trim();
    var underlying=first.split(' ')[0].trim();
    var kind=(l30.indexOf('اختیارف')!==-1||l30.indexOf('اختيارف')!==-1)?'put':'call';
    if(!strike||!expiry||!underlying) return null;
    return {underlying, strike, expiry, kind, dateStr};
  }
  var parsed=optRows.map(function(r){ return {raw:{l18:r.l18,l30:r.l30}, parsed: parseOpt(String(r.l18),String(r.l30))}; });
  console.log('parsed sample', parsed.slice(0,8));
  var اهرم=parsed.filter(function(x){return x.parsed && x.parsed.underlying==='اهرم';});
  console.log('اهرم parsed count', اهرم.length, اهرم.slice(0,8).map(function(x){return x.parsed; }));
  var byExpiry={}; اهرم.forEach(function(x){ byExpiry[x.parsed.expiry]=(byExpiry[x.parsed.expiry]||0)+1; });
  console.log('اهرم byExpiry', byExpiry);
  return {total:rows.length, optCount:optRows.length, اهرمCount:اهرم.length, byExpiry};
})();
