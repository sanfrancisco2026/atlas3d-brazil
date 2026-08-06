// Unit tests for the external municipal layer loader (geo360 / iCad
// exports, any GeoJSON), functions copied verbatim from index.html.
// Run: node test/ext_layer.test.js   (exit 0 = pass)
function utmToLatLon(E,N,zone,south){
  const a=6378137, f=1/298.257223563, k0=0.9996;
  const e2=f*(2-f), ep2=e2/(1-e2);
  const x=E-500000, y=south?N-10000000:N;
  const M=y/k0, mu=M/(a*(1-e2/4-3*e2*e2/64-5*e2*e2*e2/256));
  const e1=(1-Math.sqrt(1-e2))/(1+Math.sqrt(1-e2));
  const phi1=mu+(3*e1/2-27*e1*e1*e1/32)*Math.sin(2*mu)
    +(21*e1*e1/16-55*e1*e1*e1*e1/32)*Math.sin(4*mu)
    +(151*e1*e1*e1/96)*Math.sin(6*mu)+(1097*e1*e1*e1*e1/512)*Math.sin(8*mu);
  const sp=Math.sin(phi1), cp=Math.cos(phi1), tp=Math.tan(phi1);
  const N1=a/Math.sqrt(1-e2*sp*sp);
  const T1=tp*tp, C1=ep2*cp*cp;
  const R1=a*(1-e2)/Math.pow(1-e2*sp*sp,1.5);
  const D=x/(N1*k0);
  const lat=phi1-(N1*tp/R1)*(D*D/2-(5+3*T1+10*C1-4*C1*C1-9*ep2)*D*D*D*D/24
    +(61+90*T1+298*C1+45*T1*T1-252*ep2-3*C1*C1)*D*D*D*D*D*D/720);
  const lon=(D-(1+2*T1+C1)*D*D*D/6
    +(5-2*C1+28*T1-3*C1*C1+8*ep2+24*T1*T1)*D*D*D*D*D/120)/cp;
  return {lat:lat*180/Math.PI, lon:(zone*6-183)+lon*180/Math.PI};
}
function detectCRS(sample,crsName){
  const m=/EPSG(?:::|:)?(\d{4,6})/i.exec(crsName||'');
  const code=m?+m[1]:0;
  if(code===4326||code===4674) return {kind:'geographic'};
  if(code>=32701&&code<=32760) return {kind:'utm',zone:code-32700,south:true};
  if(code>=32601&&code<=32660) return {kind:'utm',zone:code-32600,south:false};
  if(code>=31972&&code<=31985) return {kind:'utm',zone:code-31960,south:true};
  if(Math.abs(sample[0])<=180&&Math.abs(sample[1])<=90) return {kind:'geographic'};
  return {kind:'utm',zone:22,south:true};
}
function geoJsonRings(gj){
  const out=[];
  const walk=g=>{
    if(!g) return;
    if(g.type==='FeatureCollection') return (g.features||[]).forEach(f=>walk(f.geometry));
    if(g.type==='Feature') return walk(g.geometry);
    if(g.type==='GeometryCollection') return (g.geometries||[]).forEach(walk);
    const c=g.coordinates;
    if(!c) return;
    if(g.type==='LineString') out.push(c);
    else if(g.type==='MultiLineString'||g.type==='Polygon') c.forEach(r=>out.push(r));
    else if(g.type==='MultiPolygon') c.forEach(p=>p.forEach(r=>out.push(r)));
  };
  walk(gj);
  return out.filter(r=>Array.isArray(r)&&r.length>1);
}
// forward UTM, used only to build round-trip fixtures in this test
function latLonToUTM(lat,lon,zone,south){
  const a=6378137, f=1/298.257223563, k0=0.9996;
  const e2=f*(2-f), ep2=e2/(1-e2);
  const la=lat*Math.PI/180, lo=lon*Math.PI/180;
  const lo0=(zone*6-183)*Math.PI/180;
  const N=a/Math.sqrt(1-e2*Math.sin(la)**2), T=Math.tan(la)**2;
  const C=ep2*Math.cos(la)**2, A=Math.cos(la)*(lo-lo0);
  const M=a*((1-e2/4-3*e2*e2/64-5*e2**3/256)*la
    -(3*e2/8+3*e2*e2/32+45*e2**3/1024)*Math.sin(2*la)
    +(15*e2*e2/256+45*e2**3/1024)*Math.sin(4*la)-(35*e2**3/3072)*Math.sin(6*la));
  const E=k0*N*(A+(1-T+C)*A**3/6+(5-18*T+T*T+72*C-58*ep2)*A**5/120)+500000;
  let Nn=k0*(M+N*Math.tan(la)*(A*A/2+(5-T+9*C+4*C*C)*A**4/24
    +(61-58*T+T*T+600*C-330*ep2)*A**6/720));
  if(south) Nn+=10000000;
  return [E,Nn];
}

let pass=0, fail=0;
function check(name,cond,detail){
  if(cond){ pass++; console.log('  ok -', name); }
  else { fail++; console.log('  FAIL -', name, detail||''); }
}

console.log('=== UTM-22S (the geo360 portal CRS) -> WGS84 ===');
// Goiania Praca Civica: -16.6809, -49.2539
const [gE,gN]=latLonToUTM(-16.6809,-49.2539,22,true);
const back=utmToLatLon(gE,gN,22,true);
check('round-trip returns the same point (sub-centimetre)',
  Math.abs(back.lat+16.6809)*111320<0.01&&Math.abs(back.lon+49.2539)*106000<0.01,
  JSON.stringify(back));
check('easting/northing land in the expected UTM-22S range',
  gE>600000&&gE<800000&&gN>8100000&&gN<8200000, gE+','+gN);
check('northern-hemisphere flag handled',
  (()=>{ const [E,N]=latLonToUTM(40.758,-73.9855,18,false);
    const r=utmToLatLon(E,N,18,false);
    return Math.abs(r.lat-40.758)*111320<0.01&&Math.abs(r.lon+73.9855)*85000<0.01; })());
check('1km east in UTM moves ~1km east on the ground',
  (()=>{ const p=utmToLatLon(gE+1000,gN,22,true);
    const d=(p.lon+49.2539)*111320*Math.cos(16.68*Math.PI/180);
    return Math.abs(d-1000)<2; })());

console.log('=== CRS detection ===');
check('EPSG:31982 (SIRGAS 2000 / UTM 22S) recognised',
  (()=>{ const c=detectCRS([690000,8155000],'urn:ogc:def:crs:EPSG::31982');
    return c.kind==='utm'&&c.zone===22&&c.south; })());
check('EPSG:32722 (WGS84 / UTM 22S) recognised',
  (()=>{ const c=detectCRS([690000,8155000],'EPSG:32722');
    return c.kind==='utm'&&c.zone===22&&c.south; })());
check('EPSG:4326 and 4674 (SIRGAS geographic) treated as lat/long',
  detectCRS([-49.25,-16.68],'EPSG:4326').kind==='geographic'&&
  detectCRS([-49.25,-16.68],'urn:ogc:def:crs:EPSG::4674').kind==='geographic');
check('no CRS tag: lat/long values detected by range',
  detectCRS([-49.2539,-16.6809],'').kind==='geographic');
check('no CRS tag: metric values fall back to the portal zone 22S',
  (()=>{ const c=detectCRS([690123,8155432],'');
    return c.kind==='utm'&&c.zone===22&&c.south; })());
check('northern UTM code keeps south=false',
  detectCRS([500000,4500000],'EPSG:32618').south===false);

console.log('=== GeoJSON geometry extraction ===');
const fc={type:'FeatureCollection',features:[
  {type:'Feature',geometry:{type:'Polygon',coordinates:[[[0,0],[1,0],[1,1],[0,0]]]}},
  {type:'Feature',geometry:{type:'LineString',coordinates:[[2,2],[3,3]]}},
  {type:'Feature',geometry:{type:'MultiPolygon',coordinates:[[[[4,4],[5,4],[5,5],[4,4]]],
    [[[6,6],[7,6],[7,7],[6,6]]]]}},
  {type:'Feature',geometry:{type:'Point',coordinates:[9,9]}},
  {type:'Feature',geometry:null}]};
const rings=geoJsonRings(fc);
check('polygons, lines and multipolygons all extracted', rings.length===4);
check('points and null geometries ignored',
  !rings.some(r=>r.length<2)&&rings.every(Array.isArray));
check('GeometryCollection walked',
  geoJsonRings({type:'GeometryCollection',geometries:[
    {type:'LineString',coordinates:[[0,0],[1,1]]}]}).length===1);
check('empty / malformed input safe',
  geoJsonRings(null).length===0&&geoJsonRings({}).length===0&&
  geoJsonRings({type:'FeatureCollection'}).length===0);

console.log(fail===0?'ALL PASS ('+pass+' checks)':'FAIL ('+fail+')');
process.exit(fail===0?0:1);
