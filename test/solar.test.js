// Unit test for solar roof potential math, copied verbatim from index.html.
// Run: node test/solar.test.js   (exit 0 = pass)
const SOLAR={usable:0.60, kwpPerM2:0.20, yieldKwhPerKwp:1650};
function solarPotential(footprintM2){
  const usableM2=Math.max(0,footprintM2||0)*SOLAR.usable;
  const kwp=usableM2*SOLAR.kwpPerM2;
  return {usableM2:Math.round(usableM2),
          kwp:Math.round(kwp*10)/10,
          mwhYear:Math.round(kwp*SOLAR.yieldKwhPerKwp/100)/10};
}
function fmtKwp(kwp){
  return kwp>=1000?(kwp/1000).toFixed(1)+' MWp':Math.round(kwp)+' kWp';
}

let pass=0, fail=0;
function check(name,cond,detail){
  if(cond){ pass++; console.log('  ok -', name); }
  else { fail++; console.log('  FAIL -', name, detail||''); }
}

console.log('=== solarPotential ===');
const s=solarPotential(1000);   // 1000 m2 warehouse roof
check('60% usable', s.usableM2===600);
check('200Wp/m2 -> 120 kWp', s.kwp===120);
check('1650 kWh/kWp -> 198 MWh/y', Math.abs(s.mwhYear-198)<0.5, s.mwhYear);
const house=solarPotential(120);
console.log('   120m2 house ->', JSON.stringify(house));
check('small house lands in plausible band (10-20 kWp)', house.kwp>=10&&house.kwp<=20);
check('monotonic in area', solarPotential(500).kwp<solarPotential(900).kwp);
check('zero/negative/undefined safe',
  solarPotential(0).kwp===0&&solarPotential(-5).kwp===0&&solarPotential().kwp===0);

console.log('=== fmtKwp ===');
check('kWp below 1000', fmtKwp(842)==='842 kWp');
check('MWp at 1000+', fmtKwp(2450)==='2.5 MWp');

console.log(fail===0?'ALL PASS ('+pass+' checks)':'FAIL ('+fail+')');
process.exit(fail===0?0:1);
