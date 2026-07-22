// Unit test for carbon-credit estimation, copied verbatim from index.html.
// Run: node test/carbon.test.js   (exit 0 = pass)
const SOLAR={usable:0.60, kwpPerM2:0.20, yieldKwhPerKwp:1650};
const CARBON={vegKgPerM2:0.30, efBR:0.10, efZA:0.95};
function gridEF(lon){ return lon>-20?CARBON.efZA:CARBON.efBR; }
function carbonCredits(vegM2,potM2,kwp,lon){
  const r1=v=>Math.round(v*10)/10;
  const green=Math.max(0,vegM2||0)*CARBON.vegKgPerM2/1000;
  const greenPot=Math.max(0,potM2||0)*CARBON.vegKgPerM2/1000;
  const solar=Math.max(0,kwp||0)*SOLAR.yieldKwhPerKwp/1000*gridEF(lon);
  return {green:r1(green),greenPot:r1(greenPot),solar:r1(solar),
          without:r1(green+greenPot),withSolar:r1(green+greenPot+solar)};
}

let pass=0, fail=0;
function check(name,cond,detail){
  if(cond){ pass++; console.log('  ok -', name); }
  else { fail++; console.log('  FAIL -', name, detail||''); }
}

console.log('=== grid emission factor by region ===');
check('Brazil (Goiania lon -49.25) uses hydro-heavy 0.10', gridEF(-49.25)===0.10);
check('South Africa (Joburg lon 28.05) uses coal-heavy 0.95', gridEF(28.05)===0.95);

console.log('=== Goiania-like zone (2.56km2 grid) ===');
// ~30% vegetated, ~33% greenable of a 1600x1600m zone; 3200 kWp solar
const veg=0.30*1600*1600, pot=0.33*1600*1600;
const c=carbonCredits(veg,pot,3200,-49.25);
console.log('  ', JSON.stringify(c));
check('green today: 768000m2 * 0.3kg = 230.4 t/yr', c.green===230.4);
check('greenable adds 253.4 t/yr', c.greenPot===253.4);
check('solar: 3200kWp*1650kWh*0.10t/MWh = 528 t/yr', c.solar===528);
check('without = green + potential', c.without===483.8);
check('with = without + solar', Math.abs(c.withSolar-(c.without+c.solar))<0.11);

console.log('=== same solar earns ~9.5x more credits on the ZA grid ===');
const za=carbonCredits(veg,pot,3200,28.05);
check('ZA solar credits scale with the dirtier grid',
  Math.abs(za.solar/c.solar-CARBON.efZA/CARBON.efBR)<0.01, za.solar);

console.log('=== guards ===');
const z=carbonCredits(0,0,0,-49);
check('all-zero zone yields zero everywhere',
  z.green===0&&z.greenPot===0&&z.solar===0&&z.without===0&&z.withSolar===0);
check('null/negative inputs clamp to zero',
  carbonCredits(null,-5,undefined,-49).withSolar===0);

console.log(fail===0?'ALL PASS ('+pass+' checks)':'FAIL ('+fail+')');
process.exit(fail===0?0:1);
