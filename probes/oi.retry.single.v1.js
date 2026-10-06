/**
 * OI retry single — for the one 502 failed: 56981594284253648 طهرم7059 46000 put
 * Run on old.tsetmc.com/15131F or main.tsetmc.com — tries 3 times with delay
 */
(async function(){
  const ins='56981594284253648';
  let out={ inscode:ins, tries:[], result:null };
  async function fetchCdnOi(inscode){
    let r1=await fetch('https://cdn.tsetmc.com/api/Instrument/GetInstrumentInfo/'+inscode, { headers:{'Accept':'application/json'} });
    if(!r1.ok) throw new Error('info '+r1.status);
    let j1=await r1.json();
    let instrumentID=j1.instrumentInfo.instrumentID;
    let r2=await fetch('https://cdn.tsetmc.com/api/Instrument/GetInstrumentOptionByInstrumentID/'+instrumentID, { headers:{'Accept':'application/json'} });
    if(!r2.ok) throw new Error('opt '+r2.status);
    let j2=await r2.json();
    return j2.instrumentOption;
  }
  for(let i=0;i<3;i++){
    try{
      let opt=await fetchCdnOi(ins);
      out.tries.push({ attempt:i+1, ok:true, buyOP:opt.buyOP, sellOP:opt.sellOP, contractSize:opt.contractSize, instrumentID:opt.instrumentID });
      out.result=opt;
      console.log(`retry ${i+1} success buyOP ${opt.buyOP}`);
      break;
    }catch(e){
      out.tries.push({ attempt:i+1, ok:false, error:e.message });
      console.log(`retry ${i+1} failed ${e.message}`);
      await new Promise(r=>setTimeout(r,800));
    }
  }
  console.log(JSON.stringify(out,null,2));
  return out;
})();
