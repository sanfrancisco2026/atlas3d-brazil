// Unit test for facade window-row floor counting, function copied
// verbatim from index.html.
// Run: node test/facade_floors.test.js   (exit 0 = pass)
const FLOOR_FT_M=3.048;
function floorsFromCount(n){ return Math.max(1,Math.min(n||0,40)); }
function countWindowRows(profile,minAmp){
  if(!profile||profile.length<8) return 0;
  const w=Math.max(3,Math.round(profile.length/10));
  const det=profile.map((v,i)=>{
    let s=0,c=0;
    for(let j=Math.max(0,i-w);j<=Math.min(profile.length-1,i+w);j++){ s+=profile[j]; c++; }
    return v-s/c;
  });
  const amp=Math.sqrt(det.reduce((a,v)=>a+v*v,0)/det.length);
  if(amp<(minAmp||4)) return 0;
  const th=amp*0.6;
  let n=0, state=0;
  for(const v of det){
    if(state<=0&&v>th) state=1;
    else if(state>=0&&v<-th){ if(state===1) n++; state=-1; }
  }
  return n;
}

let pass=0, fail=0;
function check(name,cond,detail){
  if(cond){ pass++; console.log('  ok -', name); }
  else { fail++; console.log('  FAIL -', name, detail||''); }
}
// synthetic facade: n floors, 6 samples per floor, slab light / window dark
const facade=(floors,perFloor,ampl,noise,trend)=>{
  const out=[];
  for(let i=0;i<floors*perFloor;i++){
    const phase=Math.sin(i/perFloor*2*Math.PI);
    out.push(128+phase*ampl+(noise?(((i*2654435761)%97)/97-0.5)*noise:0)
      +(trend?i*trend:0));
  }
  return out;
};

console.log('=== counting window rows ===');
check('8-floor facade counts 8', countWindowRows(facade(8,6,20,0,0))===8);
check('15-floor tower counts 15', countWindowRows(facade(15,6,20,0,0))===15);
check('4-floor walk-up counts 4', countWindowRows(facade(4,8,25,0,0))===4);
check('count survives moderate noise',
  (()=>{ const n=countWindowRows(facade(10,6,22,10,0)); return n>=9&&n<=11; })(),
  countWindowRows(facade(10,6,22,10,0)));
check('count survives a brightness trend (sunlit-to-shade wall)',
  (()=>{ const n=countWindowRows(facade(10,6,22,0,0.8)); return n>=9&&n<=11; })(),
  countWindowRows(facade(10,6,22,0,0.8)));

console.log('=== rejecting non-facades ===');
check('flat wall (no banding) counts 0',
  countWindowRows(new Array(80).fill(120))===0);
check('weak noise only (roof/asphalt) counts 0',
  countWindowRows(facade(10,6,1.5,2,0))===0);
check('too-short profile counts 0', countWindowRows([1,2,3])===0);
check('null-safe', countWindowRows(null)===0);

console.log('=== floors -> height (10 ft per floor) ===');
check('12 floors = 36.58m', Math.abs(12*FLOOR_FT_M-36.576)<1e-9);
check('3 floors = 9.14m', Math.abs(3*FLOOR_FT_M-9.144)<1e-9);

console.log('=== user rule: not visible -> exactly one floor ===');
check('zero visible rows -> 1 floor', floorsFromCount(0)===1);
check('undefined/null count -> 1 floor',
  floorsFromCount(undefined)===1&&floorsFromCount(null)===1);
check('1-2 visible floors honoured as counted',
  floorsFromCount(1)===1&&floorsFromCount(2)===2);
check('normal counts pass through', floorsFromCount(15)===15);
check('runaway count capped at 40', floorsFromCount(90)===40);

console.log(fail===0?'ALL PASS ('+pass+' checks)':'FAIL ('+fail+')');
process.exit(fail===0?0:1);
