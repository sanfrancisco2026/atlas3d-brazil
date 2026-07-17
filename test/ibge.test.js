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
function ufFromCode(code){
  const uf=parseInt(String(code||'').slice(0,2),10);
  return (uf>=11&&uf<=53)?String(uf):null;
}
function malhaUrl(level,code){
  const B='https://servicodados.ibge.gov.br/api/v3/malhas/';
  const F='formato=application/vnd.geo%2Bjson';
  const uf=ufFromCode(code);
  if(level==='municipality') return `${B}municipios/${code}?${F}`;
  if(!uf) return null;
  if(level==='municipal-mesh') return `${B}estados/${uf}?${F}&intrarregiao=municipio&qualidade=minima`;
  if(level==='micro') return `${B}estados/${uf}?${F}&intrarregiao=microrregiao&qualidade=minima`;
  if(level==='meso') return `${B}estados/${uf}?${F}&intrarregiao=mesorregiao&qualidade=minima`;
  if(level==='state') return `${B}estados/${uf}?${F}&qualidade=minima`;
  return null;
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

console.log('=== ufFromCode ===');
check('Goiania 5208707 -> UF 52 (GO)', ufFromCode('5208707')==='52');
check('Sao Paulo 3550308 -> UF 35', ufFromCode('3550308')==='35');
check('out-of-range / garbage -> null',
  ufFromCode('9912345')===null&&ufFromCode('abc')===null&&ufFromCode(null)===null);

console.log('=== malhaUrl (endpoints verified live via curl) ===');
check('municipality targets the municipio malha',
  malhaUrl('municipality','5208707').includes('malhas/municipios/5208707?'));
check('municipal mesh = whole-state intrarregiao=municipio',
  malhaUrl('municipal-mesh','5208707').includes('estados/52?')&&
  malhaUrl('municipal-mesh','5208707').includes('intrarregiao=municipio'));
check('micro/meso map to the only valid state intrarregioes',
  malhaUrl('micro','5208707').includes('intrarregiao=microrregiao')&&
  malhaUrl('meso','5208707').includes('intrarregiao=mesorregiao'));
check('state outline has no intrarregiao',
  !malhaUrl('state','5208707').includes('intrarregiao'));
check('geo+json formato is URL-encoded (+ would decode to a space)',
  malhaUrl('state','5208707').includes('vnd.geo%2Bjson'));
check('invalid inputs -> null',
  malhaUrl('municipal-mesh','9900000')===null&&malhaUrl('bogus','5208707')===null);

function meshFromBundle(M,level,code){
  if(!M) return null;
  const uf=ufFromCode(code); if(!uf) return null;
  const pick=(fc,id)=>{ const f=((fc&&fc.features)||[])
      .filter(f=>f.properties&&String(f.properties.codarea)===String(id));
    return f.length?{type:'FeatureCollection',features:f}:null; };
  if(level==='municipality') return pick(M.municipal&&M.municipal[uf],code);
  if(level==='municipal-mesh') return (M.municipal&&M.municipal[uf])||null;
  if(level==='micro') return (M.micro&&M.micro[uf])||null;
  if(level==='meso') return (M.meso&&M.meso[uf])||null;
  if(level==='state') return pick(M.states,uf);
  return null;
}

console.log('=== meshFromBundle (offline bundle lookup) ===');
const F=(codarea)=>({type:'Feature',properties:{codarea},geometry:{}});
const BUNDLE={
  municipal:{'52':{type:'FeatureCollection',features:[F('5208707'),F('5200050')]}},
  micro:{'52':{type:'FeatureCollection',features:[F('52010')]}},
  meso:{'52':{type:'FeatureCollection',features:[F('5203')]}},
  states:{type:'FeatureCollection',features:[F('52'),F('35')]},
};
check('municipality filters its own polygon from the state mesh',
  meshFromBundle(BUNDLE,'municipality','5208707').features.length===1&&
  meshFromBundle(BUNDLE,'municipality','5208707').features[0].properties.codarea==='5208707');
check('municipal-mesh returns the whole state set',
  meshFromBundle(BUNDLE,'municipal-mesh','5208707').features.length===2);
check('micro/meso resolve by UF',
  meshFromBundle(BUNDLE,'micro','5208707').features.length===1&&
  meshFromBundle(BUNDLE,'meso','5208707').features.length===1);
check('state outline picked from national mesh by UF code',
  meshFromBundle(BUNDLE,'state','5208707').features[0].properties.codarea==='52');
check('missing bundle/state -> null (falls back to API)',
  meshFromBundle(null,'municipality','5208707')===null&&
  meshFromBundle(BUNDLE,'municipal-mesh','3550308')===null);
check('unknown municipality in bundle -> null',
  meshFromBundle(BUNDLE,'municipality','5299999')===null);

console.log(fail===0?'ALL PASS ('+pass+' checks)':'FAIL ('+fail+')');
process.exit(fail===0?0:1);
