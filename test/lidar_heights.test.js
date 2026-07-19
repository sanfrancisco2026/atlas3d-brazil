// Unit test for the SP LiDAR height-model helpers, copied verbatim from index.html.
// Run: node test/lidar_heights.test.js   (exit 0 = pass)
function lidarHeightAt(a,lat,lon,decode){
  if(!a._u8) a._u8=(decode||(s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0))))(a.heights);
  const gx=Math.floor((lon-a.W)/(a.E-a.W)*a.w);
  const gy=Math.floor((lat-a.S)/(a.N-a.S)*a.h);
  let m=0;
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
    const x=gx+dx,y=gy+dy;
    if(x>=0&&y>=0&&x<a.w&&y<a.h) m=Math.max(m,a._u8[y*a.w+x]);
  }
  return m;
}
function lidarColor(h){
  if(h<3) return [0,0,0,0];
  if(h<10) return [80+h*8,200,90,150];
  if(h<30) return [235,160-(h-10)*3,60,165];
  if(h<80) return [235,60,90+(h-30)*2,180];
  return [255,80,220,200];
}

let pass=0, fail=0;
function check(name,cond,detail){
  if(cond){ pass++; console.log('  ok -', name); }
  else { fail++; console.log('  FAIL -', name, detail||''); }
}

// synthetic 4x4 grid, row 0 = SOUTH edge. A 100m tower at grid (x=2,y=1).
const grid=new Uint8Array(16); grid[1*4+2]=100; grid[0]=5;
const area={W:-46.66,S:-23.57,E:-46.62,N:-23.53,w:4,h:4,heights:'unused'};
const decode=()=>grid;

console.log('=== lidarHeightAt ===');
// centre of cell (x=2, y=1): lon fraction (2.5/4), lat fraction (1.5/4) from SOUTH
const lon=area.W+(2.5/4)*(area.E-area.W), lat=area.S+(1.5/4)*(area.N-area.S);
check('samples the tower at its own cell', lidarHeightAt(area,lat,lon,decode)===100);
const lat0=area.S+(0.5/4)*(area.N-area.S);
check('3x3 neighbourhood: adjacent row still sees the tower',
  lidarHeightAt(area,lat0,lon,decode)===100);
const farLon=area.W+(0.5/4)*(area.E-area.W), farLat=area.S+(3.5/4)*(area.N-area.S);
check('far corner does not see it', lidarHeightAt(area,farLat,farLon,decode)===0);
check('south-west corner sees the 5m cell (row-0=south orientation)',
  lidarHeightAt(area,area.S+1e-6,area.W+1e-6,decode)===5);
check('edge clamping never throws', lidarHeightAt(area,area.N,area.E,decode)>=0);

console.log('=== lidarColor ramp ===');
check('ground transparent', lidarColor(0)[3]===0&&lidarColor(2.9)[3]===0);
check('low-rise opaque green-ish', lidarColor(5)[3]>0&&lidarColor(5)[1]===200);
check('bands are increasingly opaque',
  lidarColor(5)[3]<lidarColor(20)[3]&&lidarColor(20)[3]<lidarColor(50)[3]&&lidarColor(50)[3]<lidarColor(120)[3]);
check('high-rise hits the magenta band', lidarColor(120)[2]===220);

console.log(fail===0?'ALL PASS ('+pass+' checks)':'FAIL ('+fail+')');
process.exit(fail===0?0:1);
