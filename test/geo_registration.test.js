// Unit test for satellite-mosaic geo-registration, functions copied
// verbatim from index.html.
// Run: node test/geo_registration.test.js   (exit 0 = pass)
function lon2tile(lon,z){ return (lon+180)/360*Math.pow(2,z); }
function lat2tile(lat,z){ return (1-Math.log(Math.tan(lat*Math.PI/180)+1/Math.cos(lat*Math.PI/180))/Math.PI)/2*Math.pow(2,z); }
// Pure (unit-tested): worst |Mercator row - linear-in-lat row| in px for
// a zone of half-height dLat degrees centred at cLat, at tile zoom z.
function mercRowOffsetPx(cLat,dLat,z){
  const N=cLat+dLat, S=cLat-dLat;
  const y0=lat2tile(N,z), h=(lat2tile(S,z)-y0)*256;
  let m=0;
  for(let i=0;i<=64;i++){
    const lat=N+(S-N)*i/64;
    m=Math.max(m,Math.abs((lat2tile(lat,z)-y0)*256-i/64*h));
  }
  return m;
}

let pass=0, fail=0;
function check(name,cond,detail){
  if(cond){ pass++; console.log('  ok -', name); }
  else { fail++; console.log('  FAIL -', name, detail||''); }
}
const M_LAT=111320;
// replicate the app's zoom pick: start z19, step down while wider than the cap
function appZoom(cLat,radiusM,maxPx){
  const dLon=radiusM/(M_LAT*Math.cos(cLat*Math.PI/180));
  let z=19;
  while(z>15&&(lon2tile(cLat*0+dLon,z)-lon2tile(-dLon,z))*256>maxPx) z--;
  return z;
}

console.log('=== longitude (columns) is mathematically exact ===');
check('lon2tile is affine in lon -> linear consumer mapping has ~zero error',
  (()=>{ const z=19,W=-49.26,E=-49.24,x0=lon2tile(W,z),w=(lon2tile(E,z)-x0)*256;
    let m=0;
    for(let i=0;i<=32;i++){ const lon=W+(E-W)*i/32;
      m=Math.max(m,Math.abs((lon2tile(lon,z)-x0)*256-i/32*w)); }
    return m<1e-6; })());

console.log('=== latitude (rows): Mercator vs linear stays sub-pixel ===');
// every preset region x capture radius x the zoom the app would pick
const zones=[
  ['Goiania',-16.68],['Sao Paulo',-23.56],['Rio-ish',-22.9],
  ['Johannesburg',-26.20],['Cape Town',-33.92]];
const radii=[350,875,2000,3000];
let worst=0, worstDesc='';
zones.forEach(([name,lat])=>radii.forEach(r=>{
  [2600,3200].forEach(cap=>{
    const z=appZoom(lat,r,cap);
    const off=mercRowOffsetPx(lat,r/M_LAT,z);
    if(off>worst){ worst=off; worstDesc=`${name} r=${r}m z${z}`; }
  });
}));
check('worst row offset across all zones/radii/zooms < 0.5px',
  worst<0.5, worst.toFixed(3)+'px @ '+worstDesc);
console.log(`   (worst case: ${worst.toFixed(3)}px @ ${worstDesc})`);
check('typical preset zone (350m radius) is < 0.05px',
  mercRowOffsetPx(-16.68,350/M_LAT,19)<0.05);
check('offset grows with zone size (sanity of the bound)',
  mercRowOffsetPx(-26.2,3000/M_LAT,16)>mercRowOffsetPx(-26.2,350/M_LAT,16));
check('offset is zero at the equator (Mercator locally linear)',
  mercRowOffsetPx(0,875/M_LAT,19)<0.02);

console.log(fail===0?'ALL PASS ('+pass+' checks)':'FAIL ('+fail+')');
process.exit(fail===0?0:1);
