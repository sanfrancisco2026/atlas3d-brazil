// Unit tests for the off-nadir roof-lean estimation, functions copied
// verbatim from index.html.
// Run: node test/ortho_lean.test.js   (exit 0 = pass)
function scanLean(scoreFn){
  let best={lx:0,lz:0,sc:scoreFn(0,0)};
  const s0=best.sc;
  for(let lx=-0.55;lx<=0.551;lx+=0.05)for(let lz=-0.55;lz<=0.551;lz+=0.05){
    const sc=scoreFn(lx,lz); if(sc<best.sc) best={lx,lz,sc};
  }
  const c={lx:best.lx,lz:best.lz};
  for(let lx=c.lx-0.04;lx<=c.lx+0.041;lx+=0.01)
    for(let lz=c.lz-0.04;lz<=c.lz+0.041;lz+=0.01){
      const sc=scoreFn(lx,lz); if(sc<best.sc) best={lx,lz,sc};
    }
  return {s0,best};
}
function acceptLean(s0,best){
  return best.sc<s0*0.9&&Math.hypot(best.lx,best.lz)>=0.02;
}

let pass=0, fail=0;
function check(name,cond,detail){
  if(cond){ pass++; console.log('  ok -', name); }
  else { fail++; console.log('  FAIL -', name, detail||''); }
}

console.log('=== two-stage argmin scan ===');
// paraboloid with a known minimum at (0.12, -0.08)
const para=(lx,lz)=>100+((lx-0.12)**2+(lz+0.08)**2)*5000;
const r1=scanLean(para);
check('finds the minimum within fine-step resolution',
  Math.abs(r1.best.lx-0.12)<=0.011&&Math.abs(r1.best.lz+0.08)<=0.011,
  JSON.stringify(r1.best));
check('s0 is the no-lean baseline', Math.abs(r1.s0-para(0,0))<1e-9);
check('clear minimum accepted', acceptLean(r1.s0,r1.best)===true);

console.log('=== true-ortho imagery stays uncorrected ===');
// flat-ish score surface: no lean is meaningfully better than zero
const flat=(lx,lz)=>100+(lx*lx+lz*lz)*3;   // minimum AT zero
const r2=scanLean(flat);
check('flat surface: zero (or trivial) vector found',
  Math.hypot(r2.best.lx,r2.best.lz)<0.06, JSON.stringify(r2.best));
check('no significant improvement -> rejected (Manhattan case)',
  acceptLean(r2.s0,r2.best)===false);
// noisy surface with a shallow off-zero dip: improvement under 10%
const shallow=(lx,lz)=>(Math.abs(lx-0.2)<0.011&&Math.abs(lz)<0.011)?95:100;
const r3=scanLean(shallow);
check('sub-10% improvement rejected even at a real dip',
  acceptLean(r3.s0,r3.best)===false, JSON.stringify(r3));

console.log('=== strong lean accepted, tiny vectors rejected ===');
const strong=(lx,lz)=>(Math.abs(lx-0.15)<0.011&&Math.abs(lz-0.1)<0.011)?40:100;
const r4=scanLean(strong);
check('strong dip found and accepted',
  acceptLean(r4.s0,r4.best)===true&&Math.abs(r4.best.lx-0.15)<=0.011);
check('near-zero vector rejected regardless of score',
  acceptLean(100,{lx:0.01,lz:0.005,sc:40})===false);

console.log(fail===0?'ALL PASS ('+pass+' checks)':'FAIL ('+fail+')');
process.exit(fail===0?0:1);
