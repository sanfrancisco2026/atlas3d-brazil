// Unit tests for road discipline: lane clamping (vehicles stay on the
// carriageway) and synthetic-footprint-vs-road-corridor overlap.
// All four functions copied verbatim from index.html.
// Run: node test/road_discipline.test.js   (exit 0 = pass)
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
// Pure (unit-tested): pull the lane offset inward so the wheel track stays
// on the carriageway - on narrow streets (service/living) vehicles hug the
// centreline instead of riding the verge through buildings and parks.
function laneClamp(lane,halfW){ return Math.min(lane,Math.max(0.4,halfW-0.9)); }
// Pure (unit-tested): ray-cast point-in-polygon on {x,y} rings
function pointInPoly(poly,x,y){
  let inside=false;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++){
    const a=poly[i],b=poly[j];
    if((a.y>y)!==(b.y>y)&&x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x) inside=!inside;
  }
  return inside;
}
// Pure (unit-tested): min distance from a point to the ring's edges
function distToPolyEdge(poly,x,y){
  let m=Infinity;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++){
    const a=poly[i],b=poly[j];
    const dx=b.x-a.x,dy=b.y-a.y,L2=dx*dx+dy*dy;
    const t=L2?clamp(((x-a.x)*dx+(y-a.y)*dy)/L2,0,1):0;
    m=Math.min(m,Math.hypot(x-(a.x+dx*t),y-(a.y+dy*t)));
  }
  return m;
}
// Pure (unit-tested): does a footprint ring overlap any road-corridor sample
// (centreline point + that road's half-width)?
function footprintOnRoad(poly,samples){
  return samples.some(s=>pointInPoly(poly,s.x,s.y)||distToPolyEdge(poly,s.x,s.y)<s.hw);
}

let pass=0, fail=0;
function check(name,cond,detail){
  if(cond){ pass++; console.log('  ok -', name); }
  else { fail++; console.log('  FAIL -', name, detail||''); }
}

console.log('=== laneClamp: wheel track stays on the carriageway ===');
// road half-widths from ROAD_CLASS: service 1.4, living_street 1.75,
// unclassified 2.0, residential 2.25, secondary 3.0, motorway 4.5
check('car (1.9) on a service alley (hw 1.4) hugs the centreline at 0.5',
  Math.abs(laneClamp(1.9,1.4)-0.5)<1e-9);
check('clamped offset + car half-width (0.86) fits inside every class',
  [1.4,1.75,2.0,2.25].every(hw=>laneClamp(1.9,hw)+0.86<=hw));
check('bus/truck (2.3) untouched on major roads (hw >= 3.0)',
  laneClamp(2.3,3.0)===2.1&&laneClamp(2.3,4.5)===2.3);
check('floor of 0.4 even on absurdly narrow ways', laneClamp(1.9,1.0)===0.4);
check('wide roads never widen the lane beyond the class value',
  laneClamp(1.1,4.5)===1.1);

console.log('=== pointInPoly / distToPolyEdge ===');
const sq=[{x:0,y:0},{x:10,y:0},{x:10,y:10},{x:0,y:10}];   // 10x10 square
check('centre is inside', pointInPoly(sq,5,5));
check('outside point is outside', !pointInPoly(sq,15,5));
check('distance from centre to edge = 5', distToPolyEdge(sq,5,5)===5);
check('distance from (15,5) to edge = 5', distToPolyEdge(sq,15,5)===5);
check('distance beyond a corner uses the corner',
  Math.abs(distToPolyEdge(sq,13,-4)-5)<1e-9);

console.log('=== footprintOnRoad: synthetic infill vs road corridor ===');
// mirrors the app's segment sampler: 4m spacing, endpoint always included
const mkRoad=(x0,y0,x1,y1,hw)=>{ const out=[],L=Math.hypot(x1-x0,y1-y0);
  for(let d=0;;d+=4){ const dd=Math.min(d,L);
    out.push({x:x0+(x1-x0)*dd/L,y:y0+(y1-y0)*dd/L,hw});
    if(dd>=L) break; }
  return out; };
check('road passing through the footprint -> overlap',
  footprintOnRoad(sq,mkRoad(-20,5,30,5,2.25)));
check('road skimming 1m outside a 2.25m corridor -> overlap (edge clip)',
  footprintOnRoad(sq,mkRoad(-20,11,30,11,2.25)));
check('road 10m away -> clear', !footprintOnRoad(sq,mkRoad(-20,20,30,20,2.25)));
check('no roads nearby -> clear', !footprintOnRoad(sq,[]));
check('short road ending at the wall still counts',
  footprintOnRoad(sq,mkRoad(-20,5,-1,5,2.25)));

console.log(fail===0?'ALL PASS ('+pass+' checks)':'FAIL ('+fail+')');
process.exit(fail===0?0:1);
