/**
 * GEX real live v1 — uses real OI from CDN (E-035) vs tvol proxy — proves worth
 * Run on old.tsetmc.com/Loader.aspx?ParTree=15131F — LIVE with real gamma and real OI
 */
(async function(){
  var out={ meta:{ test:'G11-GEX-REAL-v1', gate:'G-11', now:new Date().toISOString(), host:location.host }, chain:{ count:36, S:null }, gex:{}, status:'unknown' };
  function normCDF(x){ const a1=0.254829592,a2=-0.284496736,a3=1.421413741,a4=-1.453152027,a5=1.061405429,p=0.3275911; const s=x<0?-1:1; x=Math.abs(x)/Math.sqrt(2); const t=1/(1+p*x); const y=1-(((((a5*t+a4)*t)+a3)*t+a2)*t+a1)*t*Math.exp(-x*x); return 0.5*(1+s*y); }
  function normPDF(x){ return Math.exp(-0.5*x*x)/Math.sqrt(2*Math.PI); }
  function bsGamma(S,K,T,rate,sigma){ const d1=(Math.log(S/K)+(rate+0.5*sigma*sigma)*T)/(sigma*Math.sqrt(T)); return normPDF(d1)/(S*sigma*Math.sqrt(T)); }
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
    return {underlying, strike, expiry, kind};
  }
  // Real OI from CDN E-035 (35/36)
  const oiMap={
    '62444611500832644':4972,'68991773475135927':22083,'7693632359685850':1623,'33729769377762283':5811,'2981675816992995':580,'26116073846521759':3610,'28144333261517699':1210,'50381533386072990':3991,'637801642303120':2760,'3601271742898640':1079,'8317476333644321':8030,'50722285466614154':3555,'29778185185510585':7820,'26958565996800765':30205,'3959980703154953':29087,'28004646087700990':60984,'36376073274065755':87809,'41273399333337429':150209,'34175952452012705':122969,'56981594284253648':null,'48417927688227268':209173,'62913554535814385':475644,'23953663226548375':180550,'62922467095421733':262642,'63976939731487182':288641,'68984808439842234':324493,'9766397730892719':199214,'53188074928115116':50773,'60518811070166899':349122,'52553501104605839':37455,'45260140814147731':100348,'49816586330607170':2433,'2395225131488459':168890,'47189190877578184':911,'18076398465551639':3286,'65990560704289616':0
  };
  try{
    var rows=window.mw&&window.mw.AllRows?Object.values(window.mw.AllRows):[];
    var Srow=rows.find(r=> String(r.l18).trim()==='اهرم');
    var S=Srow?parseFloat(String(Srow.pc).replace(/,/g,'')):72810;
    out.chain.S=S;
    var T=30/365, rate=0.30, sigma=0.40;
    var chain=rows.map(r=>{ var p=parseOpt(String(r.l18),String(r.l30)); if(!p) return null; if(p.underlying!=='اهرم'||p.expiry!=='1405/07/29') return null; var g=bsGamma(S,p.strike,T,rate,sigma); var tvol=parseInt(String(r.tvol).replace(/,/g,''),10); var oi=oiMap[r.inscode]; return {inscode:r.inscode, l18:r.l18, strike:p.strike, kind:p.kind, gamma:g, tvol:isFinite(tvol)?tvol:0, oi: oi}; }).filter(Boolean);
    out.chain.count=chain.length;
    // GEX with real OI vs tvol proxy vs 1
    let gexReal=0, gexTvol=0, gexOne=0;
    let byStrikeReal={}, byStrikeTvol={};
    chain.forEach(c=>{
      if(c.oi!=null && c.oi>0) gexReal += c.gamma * c.oi * 1000 * S;
      if(c.tvol>0) gexTvol += c.gamma * c.tvol * 1000 * S;
      gexOne += c.gamma * 1 * 1000 * S;
      if(!byStrikeReal[c.strike]) byStrikeReal[c.strike]=0;
      if(!byStrikeTvol[c.strike]) byStrikeTvol[c.strike]=0;
      if(c.oi) byStrikeReal[c.strike]+= c.gamma * c.oi * 1000 * S;
      if(c.tvol) byStrikeTvol[c.strike]+= c.gamma * c.tvol * 1000 * S;
    });
    out.gex={ real: gexReal, tvol: gexTvol, one: gexOne, realFormatted: gexReal.toExponential(3), tvolFormatted: gexTvol.toExponential(3), ratioRealVsTvol: gexTvol? (gexReal/gexTvol).toFixed(3):null, ratioRealVsOne: (gexReal/gexOne).toFixed(3) };
    out.byStrike=Object.keys(byStrikeReal).sort((a,b)=>a-b).map(k=>({ strike:parseInt(k), real: byStrikeReal[k].toExponential(2), tvol: (byStrikeTvol[k]||0).toExponential(2), ratio: byStrikeTvol[k] ? (byStrikeReal[k]/byStrikeTvol[k]).toFixed(2) : null }));
    out.oiStats={ sum: chain.reduce((s,c)=>s+(c.oi||0),0), tvolSum: chain.reduce((s,c)=>s+c.tvol,0) };
    out.worth={ note: gexTvol && Math.abs(gexReal/gexTvol -1) >0.5 ? 'Real OI GEX differs a lot from tvol proxy — confirms E-033 misleading, real OI needed' : 'Close' , realNeeded: true };
    out.status='candidate';
  }catch(e){ out.error=e.message; console.error(e); }
  console.log('%c[G11 GEX REAL LIVE v1 — CDN OI]','color:#0a7;font-weight:bold');
  console.log('S',out.chain.S,' count',out.chain.count);
  console.log('gex real',out.gex.realFormatted,' tvol',out.gex.tvolFormatted,' ratio real/tvol',out.gex.ratioRealVsTvol);
  console.log('byStrike',out.byStrike);
  console.log(JSON.stringify(out,null,2));
  return out;
})();
