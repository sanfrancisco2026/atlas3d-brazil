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
// Scores are NEGATIVE alignment quality (scanLean minimises), so a real
// improvement means the magnitude grew by at least 12%.
function acceptLean(s0,best){
  if(!(s0<0)) return false;
  return best.sc<s0*1.12&&Math.hypot(best.lx,best.lz)>=0.02;
}

let pass=0, fail=0;
function check(name,cond,detail){
  if(cond){ pass++; console.log('  ok -', name); }
  else { fail++; console.log('  FAIL -', name, detail||''); }
}

console.log('=== two-stage argmin scan ===');
// Alignment quality peaks at (0.12,-0.08) and decays toward 0 away from
// it; the score is its negative, so it is always <= 0 - matching the real
// metric, where the score is -mean(edge contrast).
const peak=(lx,lz)=>-50/(1+((lx-0.12)**2+(lz+0.08)**2)*500);
const r1=scanLean(peak);
check('finds the optimum within fine-step resolution',
  Math.abs(r1.best.lx-0.12)<=0.011&&Math.abs(r1.best.lz+0.08)<=0.011,
  JSON.stringify(r1.best));
check('s0 is the no-lean baseline', Math.abs(r1.s0-peak(0,0))<1e-9);
check('clear improvement accepted', acceptLean(r1.s0,r1.best)===true);

console.log('=== true-ortho imagery stays uncorrected ===');
// alignment already best at zero: shifting only makes it worse
const flat=(lx,lz)=>-(50-(lx*lx+lz*lz)*3);
const r2=scanLean(flat);
check('optimum is at (or next to) zero',
  Math.hypot(r2.best.lx,r2.best.lz)<0.06, JSON.stringify(r2.best));
check('no meaningful gain -> rejected (true-ortho case)',
  acceptLean(r2.s0,r2.best)===false);
// a shallow off-zero dip worth under 12% must not trigger a correction
const shallow=(lx,lz)=>(Math.abs(lx-0.2)<0.011&&Math.abs(lz)<0.011)?-53:-50;
const r3=scanLean(shallow);
check('sub-12% improvement rejected even at a real dip',
  acceptLean(r3.s0,r3.best)===false, JSON.stringify(r3));

console.log('=== strong lean accepted, tiny vectors rejected ===');
const strong=(lx,lz)=>(Math.abs(lx-0.15)<0.011&&Math.abs(lz-0.1)<0.011)?-120:-50;
const r4=scanLean(strong);
check('strong alignment peak found and accepted',
  acceptLean(r4.s0,r4.best)===true&&Math.abs(r4.best.lx-0.15)<=0.011);
check('near-zero vector rejected regardless of score',
  acceptLean(-50,{lx:0.01,lz:0.005,sc:-120})===false);
check('degenerate baseline (no usable towers) rejected',
  acceptLean(1e9,{lx:0.3,lz:0.3,sc:-10})===false);

console.log(fail===0?'ALL PASS ('+pass+' checks)':'FAIL ('+fail+')');
process.exit(fail===0?0:1);
