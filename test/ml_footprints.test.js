// Unit tests for ML (Microsoft) footprint plausibility filtering.
// Mirrors the logic in buildBuildings: offset-duplicate rejection
// against human-mapped OSM footprints, and the road-corridor guard now
// applied to every machine-derived footprint.
// Run: node test/ml_footprints.test.js   (exit 0 = pass)

// --- copied verbatim from index.html ---
function pointInPoly(poly,x,y){
  let inside=false;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++){
    const xi=poly[i].x, yi=poly[i].y, xj=poly[j].x, yj=poly[j].y;
    if(((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi)+xi)) inside=!inside;
  }
  return inside;
}
// the guard predicate, extracted: which footprints must clear the road?
function needsRoadCheck(p){ return !!(p.isSyn||p.isML); }

// the dedupe pass, extracted with the same spatial-hash semantics
function dropDuplicateML(prepared,toScene){
  const CELL=40, hash=new Map();
  const key=(x,z)=>Math.floor(x/CELL)+','+Math.floor(z/CELL);
  prepared.filter(p=>!p.isML&&!p.isSyn).forEach(p=>{
    const {x,z}=toScene(p); const k=key(x,z);
    if(!hash.has(k)) hash.set(k,[]);
    hash.get(k).push({p,cx:x,cz:z});
  });
  let dropped=0;
  const kept=prepared.filter(p=>{
    if(!p.isML) return true;
    const {x:cx,z:cz}=toScene(p);
    const gx=Math.floor(cx/CELL), gz=Math.floor(cz/CELL);
    for(let dx=-1;dx<=1;dx++) for(let dz=-1;dz<=1;dz++){
      const bucket=hash.get((gx+dx)+','+(gz+dz));
      if(!bucket) continue;
      for(const o of bucket){
        if(Math.hypot(o.cx-cx,o.cz-cz)<Math.max(p.radius,o.p.radius)){ dropped++; return false; }
        if(pointInPoly(o.p.pts,cx,cz)){ dropped++; return false; }
      }
    }
    return true;
  });
  return {kept,dropped};
}

let pass=0, fail=0;
function check(name,cond,detail){
  if(cond){ pass++; console.log('  ok -', name); }
  else { fail++; console.log('  FAIL -', name, detail||''); }
}
const sq=(cx,cz,r)=>[{x:cx-r,y:cz-r},{x:cx+r,y:cz-r},{x:cx+r,y:cz+r},{x:cx-r,y:cz+r}];
const at=p=>({x:p._x,z:p._z});
const osm=(x,z,r)=>({_x:x,_z:z,radius:r,pts:sq(x,z,r)});
const ml =(x,z,r)=>({_x:x,_z:z,radius:r,pts:sq(x,z,r),isML:true});

console.log('=== road guard applies to machine-derived footprints only ===');
check('OSM footprints are trusted, never road-checked', needsRoadCheck({})===false);
check('roof-detection synthetic is road-checked', needsRoadCheck({isSyn:true})===true);
check('ML footprints are now road-checked too', needsRoadCheck({isML:true})===true);

console.log('=== offset-duplicate rejection ===');
{
  const r=dropDuplicateML([osm(0,0,8), ml(3,0,8)],at);
  check('an ML copy offset 3m from an OSM building is dropped',
    r.dropped===1&&r.kept.length===1&&!r.kept[0].isML);
}
{
  const r=dropDuplicateML([osm(0,0,8), ml(60,60,8)],at);
  check('a genuine ML footprint far from any OSM building is kept',
    r.dropped===0&&r.kept.length===2);
}
{
  // centre inside a large OSM ring but further than either radius
  const r=dropDuplicateML([osm(0,0,30), ml(20,20,3)],at);
  check('an ML centre inside an OSM ring is dropped even when radii do not overlap',
    r.dropped===1&&r.kept.length===1);
}
{
  const r=dropDuplicateML([osm(0,0,8), ml(0,0,8), ml(200,0,8)],at);
  check('exact duplicates dropped, distant one survives',
    r.dropped===1&&r.kept.length===2&&r.kept[1]._x===200);
}
{
  // straddling a 40m hash cell boundary - the 3x3 neighbour sweep must catch it
  const r=dropDuplicateML([osm(39,39,6), ml(42,42,6)],at);
  check('duplicates across a spatial-hash cell boundary are still caught',
    r.dropped===1);
}
{
  const r=dropDuplicateML([osm(0,0,8), osm(50,0,8)],at);
  check('OSM footprints are never dropped by this pass',
    r.dropped===0&&r.kept.length===2);
}
{
  const r=dropDuplicateML([ml(0,0,8), ml(4,0,8)],at);
  check('ML-vs-ML pairs are left alone (offline dedupe owns that)',
    r.dropped===0&&r.kept.length===2);
}
{
  const many=[osm(0,0,10)];
  for(let i=0;i<50;i++) many.push(ml(i*100+300,0,6));
  const r=dropDuplicateML(many,at);
  check('a spread-out ML field is preserved in full', r.dropped===0&&r.kept.length===51);
}

console.log(fail===0?'ALL PASS ('+pass+' checks)':'FAIL ('+fail+')');
process.exit(fail===0?0:1);
