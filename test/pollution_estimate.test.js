// Unit test for the OSM-derived PM2.5 estimator, copied verbatim from index.html.
// Run: node test/pollution_estimate.test.js   (exit 0 = pass)
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function estimatePM25(ctx,areaKm2){
  if(!(areaKm2>0)) return 6;
  const rd=(ctx.majorKm*2+ctx.minorKm*0.5)/areaKm2;
  const indFrac=Math.min(0.25,ctx.indArea/(areaKm2*1e6));
  return clamp(6+rd*0.55+indFrac*160,3,90);
}

let pass=0, fail=0;
function check(name,cond,detail){
  if(cond){ pass++; console.log('  ok -', name); }
  else { fail++; console.log('  FAIL -', name, detail||''); }
}
const Z={stacks:[],indArea:0,majorKm:0,minorKm:0};

console.log('=== base + guards ===');
check('empty scene = clean background 6', estimatePM25(Z,0.49)===6);
check('zero/invalid area falls back to 6', estimatePM25(Z,0)===6&&estimatePM25(Z,NaN)===6);

console.log('=== monotonicity ===');
const roads1=estimatePM25({...Z,majorKm:2,minorKm:8},0.49);
const roads2=estimatePM25({...Z,majorKm:4,minorKm:16},0.49);
check('more roads -> more PM2.5', roads2>roads1&&roads1>6);
const ind1=estimatePM25({...Z,indArea:15000},0.49);
const ind2=estimatePM25({...Z,indArea:60000},0.49);
check('more industry -> more PM2.5', ind2>ind1&&ind1>6);
check('major roads weigh more than minor km-for-km',
  estimatePM25({...Z,majorKm:3},0.49)>estimatePM25({...Z,minorKm:3},0.49));

console.log('=== realistic ranges ===');
const center=estimatePM25({...Z,majorKm:2.5,minorKm:9,indArea:8000},0.49);
console.log('   dense city centre ->', center.toFixed(1), 'ug/m3');
check('dense centre lands in a plausible urban band (12-45)', center>=12&&center<=45);
const extreme=estimatePM25({...Z,majorKm:50,minorKm:200,indArea:5e6},0.49);
check('estimate is capped at 90', extreme===90);
check('never below 3', estimatePM25({...Z,majorKm:-99},0.49)>=3);

console.log(fail===0?'ALL PASS ('+pass+' checks)':'FAIL ('+fail+')');
process.exit(fail===0?0:1);
