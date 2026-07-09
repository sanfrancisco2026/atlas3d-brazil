// Unit test for procedural street-lamp placement, copied verbatim from index.html.
// Run: node test/street_lamps.test.js   (exit 0 = pass)
function laneOffset(yaw,dir,laneW){
  const face=yaw+(dir<0?Math.PI:0);
  return {ox:-Math.cos(face)*laneW, oz:Math.sin(face)*laneW};
}
function pointOnPath(p,d){
  const c=p.cum; let i=0;
  while(i<c.length-2&&c[i+1]<d) i++;
  const t=(d-c[i])/((c[i+1]-c[i])||1);
  const a=p.pts[i], b=p.pts[i+1];
  return {x:a.x+(b.x-a.x)*t, z:a.z+(b.z-a.z)*t, yaw:Math.atan2(b.x-a.x,b.z-a.z)};
}
function lampPositions(paths,capN){
  const out=[];
  for(const p of paths){
    const spacing=p.major?30:46, side=p.major?7:5;
    let flip=1;
    for(let d=spacing/2;d<p.total&&out.length<capN;d+=spacing){
      const pt=pointOnPath(p,d);
      const lo=laneOffset(pt.yaw,flip,side);
      out.push({x:pt.x+lo.ox,z:pt.z+lo.oz});
      flip=-flip;
    }
    if(out.length>=capN) break;
  }
  return out;
}
// helper: straight path along +x (eastbound), length L
function eastPath(L,major){
  const pts=[{x:0,z:0},{x:L,z:0}];
  return {pts,cum:[0,L],total:L,major};
}

let pass=0, fail=0;
function check(name,cond,detail){
  if(cond){ pass++; console.log('  ok -', name); }
  else { fail++; console.log('  FAIL -', name, detail||''); }
}
const near=(a,b)=>Math.abs(a-b)<1e-9;

console.log('=== spacing ===');
const major=lampPositions([eastPath(300,true)],999);
check('major road, 300m at 30m spacing -> 10 lamps', major.length===10, 'got '+major.length);
check('first lamp at half-spacing (15m)', near(major[0].x,15));
const minor=lampPositions([eastPath(300,false)],999);
check('minor road uses 46m spacing (fewer lamps)', minor.length<major.length&&minor.length===7,
  'got '+minor.length);

console.log('=== alternating sides ===');
// eastbound: flip=+1 -> south (+z), flip=-1 -> north (-z)
check('lamps alternate sides of the way',
  near(major[0].z,7)&&near(major[1].z,-7)&&near(major[2].z,7));
check('minor roads sit closer to the way (5m)', near(Math.abs(minor[0].z),5));
check('every lamp is exactly off-centreline', major.every(l=>near(Math.abs(l.z),7)));

console.log('=== cap ===');
const capped=lampPositions([eastPath(10000,true),eastPath(10000,true)],50);
check('global cap respected across paths', capped.length===50);

console.log(fail===0?'ALL PASS ('+pass+' checks)':'FAIL ('+fail+')');
process.exit(fail===0?0:1);
