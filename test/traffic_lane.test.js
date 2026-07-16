// Unit test for traffic lane-discipline math, copied verbatim from index.html.
// Scene axes: +x = east, +z = south, yaw = atan2(dx,dz).
// Run: node test/traffic_lane.test.js   (exit 0 = pass)
function laneOffset(yaw,dir,laneW){
  const face=yaw+(dir<0?Math.PI:0);
  return {ox:-Math.cos(face)*laneW, oz:Math.sin(face)*laneW};
}
const VEH_TYPES=[
  {key:'car',  share:0.56, vMin:7,  vMax:14, lane:1.9, majorOnly:false},
  {key:'moto', share:0.14, vMin:9,  vMax:17, lane:1.1, majorOnly:false},
  {key:'van',  share:0.12, vMin:6.5,vMax:12, lane:2.0, majorOnly:false},
  {key:'bus',  share:0.09, vMin:5.5,vMax:8.5, lane:2.3, majorOnly:true},
  {key:'truck',share:0.09, vMin:5,  vMax:9,  lane:2.3, majorOnly:true},
];

let pass=0, fail=0;
function check(name,cond,detail){
  if(cond){ pass++; console.log('  ok -', name); }
  else { fail++; console.log('  FAIL -', name, detail||''); }
}
const near=(a,b)=>Math.abs(a-b)<1e-9;
const yawOf=(dx,dz)=>Math.atan2(dx,dz);

console.log('=== right-hand rule, forward travel (dir=+1) ===');
let o=laneOffset(yawOf(0,-1),1,2);  // heading north (-z)
check('northbound offsets east (+x)', near(o.ox,2)&&near(o.oz,0), JSON.stringify(o));
o=laneOffset(yawOf(1,0),1,2);       // heading east (+x)
check('eastbound offsets south (+z)', near(o.ox,0)&&near(o.oz,2), JSON.stringify(o));
o=laneOffset(yawOf(0,1),1,2);       // heading south (+z)
check('southbound offsets west (-x)', near(o.ox,-2)&&near(o.oz,0), JSON.stringify(o));
o=laneOffset(yawOf(-1,0),1,2);      // heading west (-x)
check('westbound offsets north (-z)', near(o.ox,0)&&near(o.oz,-2), JSON.stringify(o));

console.log('=== reversed travel flips the lane side ===');
const f=laneOffset(yawOf(0,-1),1,2), r=laneOffset(yawOf(0,-1),-1,2);
check('opposite directions use opposite sides', near(f.ox,-r.ox)&&near(f.oz,-r.oz));

console.log('=== magnitude preserved ===');
o=laneOffset(0.7321,1,1.9);
check('offset length equals lane width', near(Math.hypot(o.ox,o.oz),1.9));

console.log('=== fleet composition sanity ===');
check('type shares sum to 1', near(VEH_TYPES.reduce((s,t)=>s+t.share,0),1));
check('every type has vMin<vMax and positive lane',
  VEH_TYPES.every(t=>t.vMin<t.vMax&&t.lane>0));
const car=VEH_TYPES.find(t=>t.key==='car');
const heavies=VEH_TYPES.filter(t=>['bus','truck'].includes(t.key));
check('heavy vehicles stick to major roads', heavies.every(t=>t.majorOnly));
check('heavy vehicles are slower and wider-offset than cars',
  heavies.every(t=>t.vMax<car.vMax&&t.lane>car.lane));
check('all five classes present',
  ['car','moto','van','bus','truck'].every(k=>VEH_TYPES.some(t=>t.key===k)));

console.log(fail===0?'ALL PASS ('+pass+' checks)':'FAIL ('+fail+')');
process.exit(fail===0?0:1);
