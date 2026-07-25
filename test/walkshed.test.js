// Unit tests for the walkshed (walk-time isochrone), functions copied
// verbatim from index.html.
// Run: node test/walkshed.test.js   (exit 0 = pass)
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
function pointOnPath(p,d){
  const c=p.cum; let i=0;
  while(i<c.length-2&&c[i+1]<d) i++;
  const t=(d-c[i])/((c[i+1]-c[i])||1);
  const a=p.pts[i], b=p.pts[i+1];
  return {x:a.x+(b.x-a.x)*t, z:a.z+(b.z-a.z)*t, yaw:Math.atan2(b.x-a.x,b.z-a.z)};
}
function buildTJunctions(paths,tol){
  const CELL=8, hash=new Map();
  const key=(x,z)=>Math.round(x/CELL)+','+Math.round(z/CELL);
  paths.forEach((p,pi)=>{ for(let d=0;d<=p.total;d+=6){
    const q=pointOnPath(p,d), k=key(q.x,q.z);
    if(!hash.has(k)) hash.set(k,[]);
    hash.get(k).push({pi,d,x:q.x,z:q.z});
  }});
  const tj=new Array(paths.length*2).fill(null);
  paths.forEach((p,pi)=>[0,1].forEach(end=>{
    const pt=_pathEnd(p,end), best=new Map();
    const cx=Math.round(pt.x/CELL), cz=Math.round(pt.z/CELL);
    for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){
      const lst=hash.get((cx+dx)+','+(cz+dz)); if(!lst) continue;
      for(const s of lst){
        if(s.pi===pi) continue;
        const hop=Math.hypot(s.x-pt.x,s.z-pt.z);
        if(hop<=tol&&(!best.has(s.pi)||hop<best.get(s.pi).hop))
          best.set(s.pi,{p:s.pi,d:s.d,hop});
      }
    }
    if(best.size) tj[pi*2+end]=[...best.values()];
  }));
  return tj;
}
function walkReach(paths,net,start,tj){
  const times=new Array(paths.length*2).fill(Infinity);
  if(!paths.length||!start) return times;
  times[start.pi*2]=start.d;
  times[start.pi*2+1]=paths[start.pi].total-start.d;
  const rev=[];
  if(tj) tj.forEach((lst,w)=>{ if(lst) lst.forEach(t=>{
    (rev[t.p]=rev[t.p]||[]).push({w,d:t.d,hop:t.hop}); }); });
  const done=new Array(times.length).fill(false);
  for(;;){
    let u=-1,best=Infinity;
    for(let i=0;i<times.length;i++)
      if(!done[i]&&times[i]<best){ best=times[i]; u=i; }
    if(u<0) break;
    done[u]=true;
    const pi=u>>1, end=u&1, p=paths[pi];
    const v=pi*2+(1-end);
    if(times[u]+p.total<times[v]) times[v]=times[u]+p.total;
    const pt=_pathEnd(p,end);
    for(const e of _near(net,paths,pt)){
      const w=e.p*2+e.end;
      const q=_pathEnd(paths[e.p],e.end);
      const hop=Math.hypot(q.x-pt.x,q.z-pt.z);
      if(times[u]+hop<times[w]) times[w]=times[u]+hop;
    }
    if(tj&&tj[u]) for(const t of tj[u]){
      const q=paths[t.p];
      if(times[u]+t.hop+t.d<times[t.p*2]) times[t.p*2]=times[u]+t.hop+t.d;
      if(times[u]+t.hop+(q.total-t.d)<times[t.p*2+1])
        times[t.p*2+1]=times[u]+t.hop+(q.total-t.d);
    }
    if(rev[pi]) for(const r of rev[pi]){
      const along=end?p.total-r.d:r.d;
      if(times[u]+along+r.hop<times[r.w]) times[r.w]=times[u]+along+r.hop;
    }
  }
  return times;
}
function reachAt(paths,times,pi,d,start){
  let m=Math.min(times[pi*2]+d, times[pi*2+1]+(paths[pi].total-d));
  if(start&&pi===start.pi) m=Math.min(m,Math.abs(d-start.d));
  return m;
}
function nearestOnPaths(paths,x,z,step){
  let best=null;
  paths.forEach((p,pi)=>{
    for(let d=0;d<=p.total;d+=step){
      const q=pointOnPath(p,d);
      const dd=Math.hypot(q.x-x,q.z-z);
      if(!best||dd<best.dist) best={pi,d,dist:dd};
    }
  });
  return best;
}

let pass=0, fail=0;
function check(name,cond,detail){
  if(cond){ pass++; console.log('  ok -', name); }
  else { fail++; console.log('  FAIL -', name, detail||''); }
}
const mkPath=pts=>{ const cum=[0];
  for(let i=0;i<pts.length-1;i++)
    cum.push(cum[i]+Math.hypot(pts[i+1].x-pts[i].x,pts[i+1].z-pts[i].z));
  return {pts,cum,total:cum[cum.length-1]}; };

// network: A (0,0)->(100,0), B (100,0)->(100,80) joined at (100,0),
// C disconnected far away
const A=mkPath([{x:0,z:0},{x:100,z:0}]);
const B=mkPath([{x:100,z:0},{x:100,z:80}]);
const C=mkPath([{x:500,z:500},{x:600,z:500}]);
const paths=[A,B,C];
const net=buildRoadNetwork(paths,800,800);
const times=walkReach(paths,net,{pi:0,d:50});   // start mid-A

console.log('=== Dijkstra reach over the street graph ===');
check('both ends of the start way: 50m each', times[0]===50&&times[1]===50);
check('connected way B entered through the junction',
  times[2]===50&&times[3]===130, JSON.stringify(times));
check('disconnected way stays unreachable',
  times[4]===Infinity&&times[5]===Infinity);
check('reachAt mid-B = junction 50m + 40m along', reachAt(paths,times,1,40)===90);
check('reachAt at the START point is 0 (direct along the origin way - the '+
  'endpoint-only formula would say 100)',
  reachAt(paths,times,0,50,{pi:0,d:50})===0);
check('origin way, 20m from the start -> 20m', reachAt(paths,times,0,70,{pi:0,d:50})===20);
check('reachAt on the disconnected way = Infinity',
  reachAt(paths,times,2,50,{pi:0,d:50})===Infinity);

console.log('=== shorter of the two approach directions wins ===');
// D loops back near A''s start: (100,80)->(0,80)->(0,6) - its far end sits
// ~6m from A''s start, inside the junction tolerance
const D=mkPath([{x:100,z:80},{x:0,z:80},{x:0,z:6}]);
const paths2=[A,B,D];
const net2=buildRoadNetwork(paths2,800,800);
const t2=walkReach(paths2,net2,{pi:0,d:50});
check('loop way reachable from BOTH ends: far end via B (130m), near end '+
  'via the 6m junction hop (56m)',
  t2[4]===130&&t2[5]===56, JSON.stringify(t2));
check('mid-loop point takes the cheaper of its two ends',
  reachAt(paths2,t2,2,90,{pi:0,d:50})===Math.min(t2[4]+90,t2[5]+(D.total-90)));

console.log('=== T-junctions: side street ending against an avenue middle ===');
// avenue AV (0,0)->(200,0); side street S ends at (100,2) - 2m from the
// avenue''s MIDDLE, 100m from either endpoint. Endpoint-only junctions
// would leave S unreachable.
const AV=mkPath([{x:0,z:0},{x:200,z:0}]);
const S=mkPath([{x:100,z:2},{x:100,z:80}]);
const p3=[AV,S];
const n3=buildRoadNetwork(p3,800,800);
check('without T-junctions the side street is stranded (the old bug)',
  walkReach(p3,n3,{pi:0,d:0})[2]===Infinity);
const tj3=buildTJunctions(p3,JUNCTION_TOL);
const t3=walkReach(p3,n3,{pi:0,d:0},tj3);
check('with T-junctions it connects: 100m along + 2m hop',
  Math.abs(t3[2]-102)<3&&Math.abs(t3[3]-180)<3, JSON.stringify(t3));
check('reverse direction too: start on the side street, avenue reachable',
  (()=>{ const t=walkReach(p3,n3,{pi:1,d:40},tj3);
    return Math.abs(t[0]-142)<3&&Math.abs(t[1]-142)<3; })());
check('T-junction map: side-street end links the avenue, avenue ends do not link back',
  tj3[2]&&tj3[2][0].p===0&&tj3[0]===null);

console.log('=== snapping ===');
const nb=nearestOnPaths(paths,50,10,8);
check('point 10m off way A snaps onto A', nb.pi===0&&nb.dist<10.5, JSON.stringify(nb));
check('empty network -> null', nearestOnPaths([],5,5,8)===null);

console.log(fail===0?'ALL PASS ('+pass+' checks)':'FAIL ('+fail+')');
process.exit(fail===0?0:1);
