// Unit test for road-network traffic continuity, copied verbatim from index.html.
// Run: node test/road_network.test.js   (exit 0 = pass)
const JUNCTION_TOL=6, JUNCTION_CELL=8;
function _pathEnd(p,end){ return end?p.pts[p.pts.length-1]:p.pts[0]; }
function buildRoadNetwork(paths,halfW,halfH){
  const cellMap=new Map();
  const ck=(x,z)=>Math.round(x/JUNCTION_CELL)+','+Math.round(z/JUNCTION_CELL);
  paths.forEach((p,i)=>{ [0,1].forEach(end=>{
    const pt=_pathEnd(p,end), k=ck(pt.x,pt.z);
    if(!cellMap.has(k)) cellMap.set(k,[]);
    cellMap.get(k).push({p:i,end});
  });});
  const portals=new Set(), portalList=[];
  paths.forEach((p,i)=>{ [0,1].forEach(end=>{
    const pt=_pathEnd(p,end);
    if(Math.abs(pt.x)>halfW*0.92||Math.abs(pt.z)>halfH*0.92){
      portals.add(i+':'+end); portalList.push({p:i,end});
    }
  });});
  return {cellMap,portals,portalList,ck};
}
function _near(net,paths,pt){
  const cx=Math.round(pt.x/JUNCTION_CELL), cz=Math.round(pt.z/JUNCTION_CELL);
  const out=[];
  for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){
    const lst=net.cellMap.get((cx+dx)+','+(cz+dz));
    if(!lst) continue;
    for(const e of lst){
      const q=_pathEnd(paths[e.p],e.end);
      if(Math.hypot(q.x-pt.x,q.z-pt.z)<=JUNCTION_TOL) out.push(e);
    }
  }
  return out;
}
function nextLeg(paths,net,pi,arrEnd,rand,allow){
  const pt=_pathEnd(paths[pi],arrEnd);
  const cands=_near(net,paths,pt)
    .filter(e=>!(e.p===pi&&e.end===arrEnd))
    .filter(e=>!allow||allow(e.p));
  if(!cands.length)
    return {p:pi,dir:arrEnd?-1:1,d:arrEnd?paths[pi].total-0.1:0.1};
  const c=cands[Math.floor(rand()*cands.length)];
  return {p:c.p,dir:c.end?-1:1,d:c.end?paths[c.p].total-0.1:0.1};
}
function spawnLeg(paths,net,rand,allow){
  const ps=net.portalList.filter(e=>!allow||allow(e.p));
  if(!ps.length){
    const idxs=paths.map((_,i)=>i).filter(i=>!allow||allow(i));
    const i=idxs[Math.floor(rand()*idxs.length)];
    return {p:i,dir:rand()>.5?1:-1,d:rand()*paths[i].total};
  }
  const e=ps[Math.floor(rand()*ps.length)];
  return {p:e.p,dir:e.end?-1:1,d:e.end?paths[e.p].total-0.1:0.1};
}

let pass=0, fail=0;
function check(name,cond,detail){
  if(cond){ pass++; console.log('  ok -', name); }
  else { fail++; console.log('  FAIL -', name, detail||''); }
}
const path=(x0,z0,x1,z1,major)=>({pts:[{x:x0,z:z0},{x:x1,z:z1}],
  total:Math.hypot(x1-x0,z1-z0),major:!!major});

// scene half-extent 100. T-junction at origin, portals at both x edges,
// interior dead end to the north.
const A=path(-100,0,0,0,true);    // west portal -> centre
const B=path(0,0,100,0,true);     // centre -> east portal
const C=path(0,0,0,80,false);     // centre -> interior dead end (minor)
const paths=[A,B,C];
const net=buildRoadNetwork(paths,100,100);

console.log('=== portals ===');
check('edge endpoints become portals', net.portals.has('0:0')&&net.portals.has('1:1'));
check('interior endpoints are not portals',
  !net.portals.has('0:1')&&!net.portals.has('2:0')&&!net.portals.has('2:1'));
check('portal list matches set', net.portalList.length===2);

console.log('=== junction continuation ===');
const leg1=nextLeg(paths,net,0,1,()=>0);      // arrive at centre from west
check('continues onto a CONNECTED path, never re-enters its own arrival end',
  (leg1.p===1&&leg1.dir===1)||(leg1.p===2&&leg1.dir===1), JSON.stringify(leg1));
const legsSeen=new Set();
for(let r=0;r<10;r++) legsSeen.add(nextLeg(paths,net,0,1,()=>r/10).p);
check('junction offers all connected legs', legsSeen.has(1)&&legsSeen.has(2));
check('entering at a far end travels backwards along it',
  (()=>{ for(let r=0;r<10;r++){ const l=nextLeg(paths,net,1,0,()=>r/10);
    if(l.p===0&&l.dir!==-1) return false;
    if(l.p===0&&Math.abs(l.d-(paths[0].total-0.1))>1e-9) return false; }
    return true; })());

console.log('=== dead end = U-turn (no mid-scene despawn) ===');
const uturn=nextLeg(paths,net,2,1,()=>0);
check('dead end U-turns on the same path', uturn.p===2&&uturn.dir===-1);
check('U-turn starts back from the far end', Math.abs(uturn.d-(paths[2].total-0.1))<1e-9);

console.log('=== majorOnly filter ===');
const majorAllow=i=>paths[i].major;
const legM=nextLeg(paths,net,0,1,()=>0.9,majorAllow);
check('heavy vehicles never continue onto minor roads', legM.p!==2);
const spawnM=spawnLeg(paths,net,()=>0.9,majorAllow);
check('heavy spawns only at portals of allowed roads', paths[spawnM.p].major===true);

console.log('=== portal spawn drives inward ===');
for(let r=0;r<4;r++){
  const s=spawnLeg(paths,net,()=>r/4);
  const inward=(s.p===0&&s.dir===1&&s.d<1)||(s.p===1&&s.dir===-1&&s.d>paths[1].total-1);
  if(!inward){ check('spawn always heads into the scene', false, JSON.stringify(s)); break; }
  if(r===3) check('spawn always heads into the scene', true);
}

console.log(fail===0?'ALL PASS ('+pass+' checks)':'FAIL ('+fail+')');
process.exit(fail===0?0:1);
