// Unit tests for the GIS analysis suite (measure, sun-hours, flood rise,
// CityJSON export, share links), functions copied verbatim from index.html.
// Run: node test/gis_suite.test.js   (exit 0 = pass)
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function pointInPoly(poly,x,y){
  let inside=false;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++){
    const a=poly[i],b=poly[j];
    if((a.y>y)!==(b.y>y)&&x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x) inside=!inside;
  }
  return inside;
}
function pathLength(pts){
  let L=0;
  for(let i=0;i<pts.length-1;i++)
    L+=Math.hypot(pts[i+1].x-pts[i].x,pts[i+1].z-pts[i].z);
  return L;
}
function polyArea(pts){
  if(pts.length<3) return 0;
  let a=0;
  for(let i=0;i<pts.length;i++){
    const p=pts[i], q=pts[(i+1)%pts.length];
    a+=p.x*q.z-q.x*p.z;
  }
  return Math.abs(a)/2;
}
function buildHeightGrid(builds,N,sceneW,sceneH){
  const h=new Float32Array(N*N);
  builds.forEach(b=>{
    if(!b.ring||b.ring.length<3) return;
    const poly=b.ring.map(([x,z])=>({x,y:z}));
    let x0=1/0,x1=-1/0,z0=1/0,z1=-1/0;
    b.ring.forEach(([x,z])=>{ x0=Math.min(x0,x); x1=Math.max(x1,x);
                              z0=Math.min(z0,z); z1=Math.max(z1,z); });
    const gx0=Math.max(0,Math.floor((x0/sceneW+0.5)*N));
    const gx1=Math.min(N-1,Math.ceil((x1/sceneW+0.5)*N));
    const gz0=Math.max(0,Math.floor((z0/sceneH+0.5)*N));
    const gz1=Math.min(N-1,Math.ceil((z1/sceneH+0.5)*N));
    for(let gz=gz0;gz<=gz1;gz++)for(let gx=gx0;gx<=gx1;gx++){
      const px=(gx+0.5)/N*sceneW-sceneW/2, pz=(gz+0.5)/N*sceneH-sceneH/2;
      if(pointInPoly(poly,px,pz)){ const i=gz*N+gx; if(b.h>h[i]) h[i]=b.h; }
    }
  });
  return {h,N,sceneW,sceneH,step:Math.max(sceneW,sceneH)/N,maxDist:420};
}
function sunBlocked(hg,x,z,sx,sz,tanEl){
  for(let d=hg.step; d<=hg.maxDist; d+=hg.step){
    const px=x+sx*d, pz=z+sz*d;
    const gx=Math.floor((px/hg.sceneW+0.5)*hg.N);
    const gz=Math.floor((pz/hg.sceneH+0.5)*hg.N);
    if(gx<0||gz<0||gx>=hg.N||gz>=hg.N) return false;
    if(hg.h[gz*hg.N+gx]>d*tanEl+0.5) return true;
  }
  return false;
}
function sunHoursAt(hg,x,z,suns){
  let lit=0;
  for(const s of suns) if(!sunBlocked(hg,x,z,s.sx,s.sz,s.tanEl)) lit++;
  return lit;
}
function sunTrack(){
  const suns=[];
  for(let hour=6.5;hour<=17.5;hour+=1){
    const elev=Math.sin((hour-6)/12*Math.PI);
    if(elev<=0.06) continue;
    const az=(hour-12)/12*Math.PI+Math.PI*0.35;
    const e=elev*Math.PI/2*0.92;
    const hx=Math.cos(az)*Math.cos(e), hz=Math.sin(az)*Math.cos(e);
    const hyp=Math.hypot(hx,hz)||1e-9;
    suns.push({sx:hx/hyp,sz:hz/hyp,tanEl:Math.sin(e)/hyp});
  }
  return suns;
}
function floodStats(elev,mn,rise){
  if(!elev||!elev.length) return {cells:0,frac:0};
  const lvl=mn+rise;
  const cells=elev.filter(e=>e<lvl).length;
  return {cells,frac:cells/elev.length};
}
function cityJSONFrom(builds,center){
  const vertices=[]; const CityObjects={};
  builds.forEach((b,bi)=>{
    const n=b.ring.length; if(n<3) return;
    const base=vertices.length, minH=b.minH||0;
    b.ring.forEach(([x,z])=>vertices.push(
      [Math.round(x*1000),Math.round(-z*1000),Math.round(minH*1000)]));
    b.ring.forEach(([x,z])=>vertices.push(
      [Math.round(x*1000),Math.round(-z*1000),Math.round(b.h*1000)]));
    const bot=[...Array(n).keys()].map(k=>base+k).reverse();
    const top=[...Array(n).keys()].map(k=>base+n+k);
    const sides=[...Array(n).keys()].map(k=>{
      const a=base+k, c=base+(k+1)%n;
      return [a,c,c+n,a+n];
    });
    CityObjects['bld_'+bi]={type:'Building',
      attributes:{measuredHeight:+(+b.h).toFixed(2),heightSource:b.src||'unknown'},
      geometry:[{type:'Solid',lod:'1',
        boundaries:[[[bot],[top],...sides.map(s=>[s])]]}]};
  });
  return {type:'CityJSON',version:'1.1',
    transform:{scale:[0.001,0.001,0.001],translate:[0,0,0]},
    metadata:{title:'ATLAS-3D LoD1 building export',
      referenceSystem:'local ENU metres; origin lat '+center.lat.toFixed(6)+
        ', lon '+center.lon.toFixed(6)+' (WGS84)'},
    CityObjects,vertices};
}
function encodeShareHash(lat,lon,r,hour){
  return '#loc='+lat.toFixed(5)+','+lon.toFixed(5)+','+Math.round(r)+','+hour;
}
function decodeShareHash(h){
  const m=/^#loc=(-?[\d.]+),(-?[\d.]+),(\d+),([\d.]+)$/.exec(h||'');
  return m?{lat:+m[1],lon:+m[2],r:+m[3],hour:+m[4]}:null;
}

let pass=0, fail=0;
function check(name,cond,detail){
  if(cond){ pass++; console.log('  ok -', name); }
  else { fail++; console.log('  FAIL -', name, detail||''); }
}

console.log('=== measurement ===');
check('3-4-5 triangle path length', pathLength([{x:0,z:0},{x:3,z:0},{x:3,z:4}])===7);
check('single point / empty -> 0', pathLength([{x:1,z:1}])===0&&pathLength([])===0);
check('10x10 square area = 100', polyArea([{x:0,z:0},{x:10,z:0},{x:10,z:10},{x:0,z:10}])===100);
check('triangle area', polyArea([{x:0,z:0},{x:10,z:0},{x:0,z:10}])===50);
check('fewer than 3 points -> 0 area', polyArea([{x:0,z:0},{x:5,z:5}])===0);

console.log('=== sun-hours heightfield ===');
// 200x200m scene, 50x50 grid (4m cells); one 30m building east of origin
const hg=buildHeightGrid([{ring:[[20,-10],[40,-10],[40,10],[20,10]],h:30}],50,200,200);
check('building cells carry its height',
  hg.h[25*50+31]===30, hg.h[25*50+31]);
check('open ground stays 0', hg.h[25*50+10]===0);
check('low morning sun from the east is blocked',
  sunBlocked(hg,0,0,1,0,0.2)===true);
check('high sun clears the same building',
  sunBlocked(hg,0,0,1,0,2.0)===false);
check('sun from the west (building behind) not blocked',
  sunBlocked(hg,0,0,-1,0,0.2)===false);
check('sunHoursAt counts lit samples',
  sunHoursAt(hg,0,0,[{sx:1,sz:0,tanEl:0.2},{sx:-1,sz:0,tanEl:0.2},
    {sx:1,sz:0,tanEl:2}])===2);
const suns=sunTrack();
check('sun track: ~11 daylight samples, all above horizon, unit horizontals',
  suns.length>=9&&suns.length<=12&&
  suns.every(s=>s.tanEl>0&&Math.abs(Math.hypot(s.sx,s.sz)-1)<1e-9));

console.log('=== flood rise ===');
const elev=[800,801,802,803,810,812,815,820,830];
check('no rise -> nothing flooded', floodStats(elev,800,0).cells===0);
check('+4m floods the four lowest cells', floodStats(elev,800,4).cells===4);
check('huge rise floods everything', floodStats(elev,800,100).frac===1);
check('empty grid safe', floodStats([],800,5).cells===0);

console.log('=== CityJSON LoD1 ===');
const cj=cityJSONFrom([{ring:[[0,0],[10,0],[10,10],[0,10]],h:25,minH:0,src:'osm'},
                       {ring:[[50,50],[60,50],[55,40]],h:8,src:'typo'}],
                      {lat:-16.68,lon:-49.25});
check('valid envelope: type/version/transform',
  cj.type==='CityJSON'&&cj.version==='1.1'&&cj.transform.scale[0]===0.001);
check('two buildings exported', Object.keys(cj.CityObjects).length===2);
check('square: 8 vertices, solid with 6 faces (bottom+top+4 sides)',
  (()=>{ const b=cj.CityObjects.bld_0, shell=b.geometry[0].boundaries[0];
    return cj.vertices.length===8+6&&shell.length===6&&b.geometry[0].lod==='1'; })());
check('height attribute + provenance carried',
  cj.CityObjects.bld_0.attributes.measuredHeight===25&&
  cj.CityObjects.bld_1.attributes.heightSource==='typo');
check('top vertices at h*1000 (transform mm), y = -z (ENU north)',
  (()=>{ const v=cj.vertices[4];   // first top vertex of the square
    return v[2]===25000&&cj.vertices[3][1]===-10000; })());
check('origin lat/lon stated in the reference system',
  cj.metadata.referenceSystem.includes('-16.68')&&
  cj.metadata.referenceSystem.includes('-49.25'));

console.log('=== share links ===');
const h1=encodeShareHash(-16.6809,-49.2539,350,17.5);
const d1=decodeShareHash(h1);
check('round-trip preserves the values',
  d1&&Math.abs(d1.lat+16.6809)<1e-4&&Math.abs(d1.lon+49.2539)<1e-4&&
  d1.r===350&&d1.hour===17.5);
check('garbage / empty hashes -> null',
  decodeShareHash('#foo')===null&&decodeShareHash('')===null&&
  decodeShareHash('#loc=a,b,c,d')===null);

console.log(fail===0?'ALL PASS ('+pass+' checks)':'FAIL ('+fail+')');
process.exit(fail===0?0:1);
