// Unit test for IBGE helpers, copied verbatim from index.html.
// Run: node test/ibge.test.js   (exit 0 = pass)
function ibgeCodeFrom(extratags){
  if(!extratags) return null;
  return extratags['IBGE:GEOCODIGO']||extratags['ibge:geocodigo']
       ||extratags['IBGE:geocodigo']||null;
}
function ibgeDensity(pop,areaKm2){
  return (pop>0&&areaKm2>0)?Math.round(pop/areaKm2):null;
}

let pass=0, fail=0;
function check(name,cond,detail){
  if(cond){ pass++; console.log('  ok -', name); }
  else { fail++; console.log('  FAIL -', name, detail||''); }
}

console.log('=== ibgeCodeFrom ===');
check('canonical uppercase key (live Goiania shape)',
  ibgeCodeFrom({'IBGE:GEOCODIGO':'5208707'})==='5208707');
check('lowercase variant', ibgeCodeFrom({'ibge:geocodigo':'3550308'})==='3550308');
check('mixed-case variant', ibgeCodeFrom({'IBGE:geocodigo':'3304557'})==='3304557');
check('no code (South Africa) -> null', ibgeCodeFrom({place:'municipality'})===null);
check('missing extratags -> null', ibgeCodeFrom(undefined)===null&&ibgeCodeFrom(null)===null);

console.log('=== ibgeDensity ===');
check('Goiania 2024: 1494599 / 729.296 km2 = 2049/km2',
  ibgeDensity(1494599,729.296)===2049, ibgeDensity(1494599,729.296));
check('null-safe on missing pop', ibgeDensity(null,729)===null);
check('null-safe on zero area', ibgeDensity(1000,0)===null);

console.log(fail===0?'ALL PASS ('+pass+' checks)':'FAIL ('+fail+')');
process.exit(fail===0?0:1);
