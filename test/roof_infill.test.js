// Unit tests for roof-detection synthetic infill, functions copied
// verbatim from index.html.
// Run: node test/roof_infill.test.js   (exit 0 = pass)
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function roofPaletteFrom(samples,topN){
  const hist=new Map();
  samples.forEach(([r,g,b])=>{
    const k=(r>>5)+','+(g>>5)+','+(b>>5);
    hist.set(k,(hist.get(k)||0)+1);
  });
  return new Set([...hist.entries()].sort((a,b)=>b[1]-a[1])
    .slice(0,topN).map(e=>e[0]));
}
function matchesRoofPalette(pal,r,g,b){
  const qr=r>>5, qg=g>>5, qb=b>>5;
  for(let dr=-1;dr<=1;dr++)for(let dg=-1;dg<=1;dg++)for(let db=-1;db<=1;db++)
    if(pal.has((qr+dr)+','+(qg+dg)+','+(qb+db))) return true;
  return false;
}
function gridComponents(mask,W,H,minCells,maxCells){
  const seen=new Uint8Array(W*H), out=[];
  for(let i=0;i<W*H;i++){
    if(!mask[i]||seen[i]) continue;
    const q=[i]; seen[i]=1; const cells=[];
    while(q.length){
      const c=q.pop(); cells.push(c);
      const x=c%W, y=(c/W)|0;
      if(x+1<W&&mask[c+1]&&!seen[c+1]){ seen[c+1]=1; q.push(c+1); }
      if(x>0&&mask[c-1]&&!seen[c-1]){ seen[c-1]=1; q.push(c-1); }
      if(y+1<H&&mask[c+W]&&!seen[c+W]){ seen[c+W]=1; q.push(c+W); }
      if(y>0&&mask[c-W]&&!seen[c-W]){ seen[c-W]=1; q.push(c-W); }
    }
    if(cells.length>=minCells&&cells.length<=maxCells) out.push(cells);
  }
  return out;
}
function traceOutline(cells,W){
  const inSet=new Set(cells);
  const has=(x,y)=>x>=0&&y>=0&&inSet.has(y*W+x);
  const nxt=new Map();
  const add=(k,v)=>{ if(!nxt.has(k)) nxt.set(k,[]); nxt.get(k).push(v); };
  let sx=Infinity, sy=Infinity;
  cells.forEach(c=>{ const x=c%W, y=(c/W)|0;
    if(y<sy||(y===sy&&x<sx)){ sx=x; sy=y; }
    if(!has(x,y-1)) add(x+','+y,[x+1,y]);
    if(!has(x+1,y)) add((x+1)+','+y,[x+1,y+1]);
    if(!has(x,y+1)) add((x+1)+','+(y+1),[x,y+1]);
    if(!has(x-1,y)) add(x+','+(y+1),[x,y]);
  });
  const start=[sx,sy], ring=[];
  let cur=start, guard=cells.length*8+16;
  do{
    ring.push(cur);
    const arr=nxt.get(cur[0]+','+cur[1]);
    if(!arr||!arr.length) return null;
    cur=arr.pop();
  }while((cur[0]!==start[0]||cur[1]!==start[1])&&guard-->0);
  return guard>0?ring:null;
}
function simplifyRing(ring,eps){
  const N=ring.length;
  if(N<=4) return ring.slice();
  const dseg=(p,a,b)=>{
    const dx=b[0]-a[0], dy=b[1]-a[1], L2=dx*dx+dy*dy;
    const t=L2?clamp(((p[0]-a[0])*dx+(p[1]-a[1])*dy)/L2,0,1):0;
    return Math.hypot(p[0]-(a[0]+dx*t),p[1]-(a[1]+dy*t));
  };
  const keep=new Set([0]);
  const dp=(pts,i0,i1)=>{
    if(i1-i0<2) return;
    let mx=-1, mi=-1;
    for(let i=i0+1;i<i1;i++){
      const d=dseg(pts[i],pts[i0],pts[i1]);
      if(d>mx){ mx=d; mi=i; }
    }
    if(mx>eps){ dp(pts,i0,mi); keep.add(mi%N); dp(pts,mi,i1); }
  };
  let far=0, mx=-1;
  for(let i=1;i<N;i++){
    const d=Math.hypot(ring[i][0]-ring[0][0],ring[i][1]-ring[0][1]);
    if(d>mx){ mx=d; far=i; }
  }
  keep.add(far);
  dp(ring,0,far);
  dp(ring.concat([ring[0]]),far,N);
  return ring.filter((_,i)=>keep.has(i));
}
function medianNearbyHeight(neigh,x,z,R,fallback){
  const hs=neigh.filter(n=>Math.hypot(n.x-x,n.z-z)<=R)
    .map(n=>n.h).sort((a,b)=>a-b);
  return hs.length>=3?hs[hs.length>>1]:fallback;
}

let pass=0, fail=0;
function check(name,cond,detail){
  if(cond){ pass++; console.log('  ok -', name); }
  else { fail++; console.log('  FAIL -', name, detail||''); }
}
const shoelace=r=>{ let a=0;
  for(let i=0;i<r.length;i++){ const p=r[i],q=r[(i+1)%r.length];
    a+=p[0]*q[1]-q[0]*p[1]; }
  return Math.abs(a)/2; };

console.log('=== roof colour palette ===');
const terracotta=[180,95,70], grey=[120,122,125], grass=[70,140,60];
const pal=roofPaletteFrom(
  [...Array(30)].map(()=>terracotta).concat([...Array(20)].map(()=>grey))
  .concat([grass]),2);
check('learns the dominant roof colours, drops the outlier',
  matchesRoofPalette(pal,...terracotta)&&matchesRoofPalette(pal,...grey));
check('adjacent shade of a learned colour still matches',
  matchesRoofPalette(pal,180+34,95,70));
check('vegetation green is NOT in the roof palette',
  !matchesRoofPalette(pal,70,200,60));

console.log('=== component segmentation ===');
// 12x12 grid: 3x3 block at (1,1), L-shape, and 1-cell noise
const W=12,H=12, mask=new Uint8Array(W*H);
const set=(x,y)=>mask[y*W+x]=1;
for(let y=1;y<4;y++)for(let x=1;x<4;x++) set(x,y);          // 9-cell block
for(let y=6;y<10;y++) set(6,y); for(let x=7;x<10;x++) set(x,9); // L (7 cells)
set(11,0);                                                   // noise
const comps=gridComponents(mask,W,H,3,100);
check('two components found, single-cell noise filtered', comps.length===2);
check('sizes preserved', comps.map(c=>c.length).sort().join()==='7,9');

console.log('=== border tracing + simplification ===');
const block=comps.find(c=>c.length===9), L=comps.find(c=>c.length===7);
const br=simplifyRing(traceOutline(block,W),0.6);
check('3x3 block traces to a 4-corner square of area 9',
  br.length===4&&Math.abs(shoelace(br)-9)<1e-9, JSON.stringify(br));
const lr=simplifyRing(traceOutline(L,W),0.6);
check('L-shape keeps its concave corner (6 corners, area = 7 cells)',
  lr.length===6&&Math.abs(shoelace(lr)-7)<1e-9, JSON.stringify(lr));
check('outline is null-safe on broken input', traceOutline([0],1)!==null);
// regression: the first simplifier collapsed LARGE rings into slivers
// (cumulative drift) - a 30x20 rectangle must survive as 4 corners
const W2=40,H2=30, big=[];
for(let y=3;y<23;y++)for(let x=5;x<35;x++) big.push(y*W2+x);
const bigRing=simplifyRing(traceOutline(big,W2),1.25);
check('large rectangle (600 cells, 100-corner trace) keeps 4 corners and full area',
  bigRing.length===4&&Math.abs(shoelace(bigRing)-600)<1e-9,
  bigRing.length+' pts, area '+shoelace(bigRing));

console.log('=== neighbourhood height ===');
const nb=[{x:0,z:0,h:4},{x:10,z:0,h:6},{x:20,z:0,h:9},{x:500,z:500,h:60}];
check('median of the three neighbours within range',
  medianNearbyHeight(nb,10,0,50,5)===6);
check('distant tower excluded from the median',
  medianNearbyHeight(nb,10,0,50,5)!==60);
check('fewer than 3 neighbours -> fallback',
  medianNearbyHeight(nb,500,500,20,5)===5);

console.log(fail===0?'ALL PASS ('+pass+' checks)':'FAIL ('+fail+')');
process.exit(fail===0?0:1);
