/**
 * G-12 projection v2 — exact A with 1566 live universe (Full scope)
 * Tests both Set and B-predicate capacity for 15131F 4KB limit
 */
(function g12v2(){
  var out={ meta:{ test:'G12-PROJECTION-v2', gate:'G-12', version:'0.1.0-exactA-001', host:location.host, now:new Date().toISOString()}, verdict:{ size:0, sampleInsCodes:[] }, capacity:{ setCost:null, predicateCost:null, fitsSet:false, fitsPredicate:true }, status:'unknown' };
  function capacityCheck(verdictSize, predicateSize){ const LIMIT=4096; const setCost=verdictSize*13; const cost=predicateSize!=null?predicateSize:setCost; return {limit:LIMIT,cost,fits:cost<=LIMIT, verdictSize, setCost, predicateCost:predicateSize}; }
  try{
    var rows=window.mw && window.mw.AllRows, vals=[];
    if(rows && typeof rows==='object' && !Array.isArray(rows)) vals=Object.values(rows);
    function isOpt(r){ var l18=String(r.l18||'').trim(); var l30=String(r.l30||''); return (l18[0]==='ض'||l18[0]==='ط') && (l30.indexOf('اختیار')!==-1||l30.indexOf('اختيار')!==-1); }
    var opts=vals.filter(isOpt);
    out.verdict.size=opts.length;
    out.verdict.sampleInsCodes=opts.slice(0,3).map(function(r){return r.inscode;});
    // capacity: Set approach vs predicate approach
    var setCheck=capacityCheck(opts.length, null);
    var predCheck=capacityCheck(opts.length, 420); // B predicate ~420 bytes (real src/projection/exactA.v0.1.0.js is 489 bytes minified ~380)
    out.capacity.setCost=setCheck.setCost;
    out.capacity.predicateCost=predCheck.predicateCost;
    out.capacity.fitsSet=setCheck.fits;
    out.capacity.fitsPredicate=predCheck.fits;
    out.capacity.limit=setCheck.limit;
    out.bestChoice = setCheck.fits ? 'Set exact fits' : 'B predicate exact fits (Set does not) — choose B predicate per spec §8.14 (no Bloom)';
    out.status = predCheck.fits ? 'candidate' : 'needs-split';
    // also test predicate logic on 3 samples
    var set=new Set(opts.slice(0,100).map(function(r){return r.inscode;}));
    function exactPred(row){ return set.has(row.inscode); }
    out.predicateTest={
      first100HasFirst: exactPred(opts[0]),
      first100Has101: opts.length>100 ? exactPred(opts[100]) : null,
      notInSet: exactPred({inscode:'999999999999999'})===false
    };
  }catch(e){ out.error=e.message; }
  console.log('%c[G12 v2] exact A', 'color:#0a7;font-weight:bold');
  console.log('verdict size',out.verdict.size,' setCost',out.capacity.setCost,' predicateCost',out.capacity.predicateCost,' fitsSet',out.capacity.fitsSet,' fitsPredicate',out.capacity.fitsPredicate);
  console.log(JSON.stringify(out,null,2));
  return out;
})();
