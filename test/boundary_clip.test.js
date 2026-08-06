// Unit test for selected-area confinement (road clipping), function
// copied verbatim from index.html.
// Run: node test/boundary_clip.test.js   (exit 0 = pass)
function clipPolyToRect(pts,halfW,halfH){
  const clipSeg=(a,b)=>{
    let t0=0,t1=1; const dx=b.x-a.x, dz=b.z-a.z;
    const p=[-dx,dx,-dz,dz], q=[a.x+halfW,halfW-a.x,a.z+halfH,halfH-a.z];
    for(let i=0;i<4;i++){
      if(p[i]===0){ if(q[i]<0) return null; }
      else{ const r=q[i]/p[i];
        if(p[i]<0){ if(r>t1) return null; if(r>t0) t0=r; }
        else{ if(r<t0) return null; if(r<t1) t1=r; } }
    }
    return [{x:a.x+dx*t0,z:a.z+dz*t0},{x:a.x+dx*t1,z:a.z+dz*t1}];
  };
  const out=[]; let run=null;
  for(let i=0;i<pts.length-1;i++){
    const c=clipSeg(pts[i],pts[i+1]);
    if(!c){ run=null; continue; }
    if(run&&Math.hypot(c[0].x-run[run.length-1].x,c[0].z-run[run.length-1].z)<1e-6)
      run.push(c[1]);
    else{ run=[c[0],c[1]]; out.push(run); }
  }
  return out;
}

let pass=0, fail=0;
function check(name,cond,detail){
  if(cond){ pass++; console.log('  ok -', name); }
  else { fail++; console.log('  FAIL -', name, detail||''); }
}
const inRect=(pieces,hw,hh)=>pieces.every(p=>p.every(q=>
  Math.abs(q.x)<=hw+1e-9&&Math.abs(q.z)<=hh+1e-9));

console.log('=== fully inside: untouched ===');
const p1=clipPolyToRect([{x:0,z:0},{x:50,z:20},{x:80,z:-30}],100,100);
check('one piece, all points preserved',
  p1.length===1&&p1[0].length===3&&p1[0][2].x===80);

console.log('=== crossing the boundary: cut AT the edge ===');
const p2=clipPolyToRect([{x:0,z:0},{x:300,z:0}],100,100);
check('cut exactly at x=+100', p2.length===1&&p2[0][p2[0].length-1].x===100);
check('clipped output confined to the rectangle', inRect(p2,100,100));

console.log('=== fully outside: dropped ===');
check('way entirely beyond the frame yields nothing',
  clipPolyToRect([{x:200,z:200},{x:300,z:250}],100,100).length===0);

console.log('=== leave and re-enter: two pieces ===');
const p3=clipPolyToRect([{x:-90,z:0},{x:-150,z:0},{x:-150,z:40},{x:-90,z:40}],100,100);
check('re-entering way split into 2 in-area pieces',
  p3.length===2&&inRect(p3,100,100), JSON.stringify(p3));

console.log('=== both endpoints outside but crossing through ===');
const p4=clipPolyToRect([{x:-200,z:-50},{x:200,z:50}],100,100);
check('through-segment kept as its in-rectangle chord',
  p4.length===1&&inRect(p4,100,100)&&
  Math.abs(p4[0][0].x+100)<1e-9&&Math.abs(p4[0][1].x-100)<1e-9);

console.log('=== degenerate ===');
check('single point / empty input safe',
  clipPolyToRect([{x:0,z:0}],100,100).length===0&&
  clipPolyToRect([],100,100).length===0);

console.log(fail===0?'ALL PASS ('+pass+' checks)':'FAIL ('+fail+')');
process.exit(fail===0?0:1);
