// Unit test for the cell-coverage greedy set-cover, copied verbatim from index.html.
// Run: node test/cell_planner.test.js   (exit 0 = pass)
function planCellTowers(demand,existing,R,maxNew){
  const R2=R*R;
  const inR=(a,b)=>(a.x-b.x)*(a.x-b.x)+(a.z-b.z)*(a.z-b.z)<=R2;
  let uncovered=demand.map((d,i)=>i).filter(i=>!existing.some(e=>inR(demand[i],e)));
  const total=Math.max(1,demand.length);
  const beforeFrac=1-uncovered.length/total;
  const newSites=[];
  while(uncovered.length&&newSites.length<maxNew){
    let best=-1,bestCov=[];
    for(let ci=0;ci<demand.length;ci++){
      const cov=uncovered.filter(i=>inR(demand[i],demand[ci]));
      if(cov.length>bestCov.length){ best=ci; bestCov=cov; }
    }
    if(best<0) break;
    newSites.push({x:demand[best].x,z:demand[best].z,covers:bestCov.length});
    const rm=new Set(bestCov);
    uncovered=uncovered.filter(i=>!rm.has(i));
  }
  return {newSites,beforeFrac,afterFrac:1-uncovered.length/total,
          deadZone:uncovered.length};
}

let pass=0, fail=0;
function check(name,cond,detail){
  if(cond){ pass++; console.log('  ok -', name); }
  else { fail++; console.log('  FAIL -', name, detail||''); }
}
const grid=(n,step)=>{ const d=[]; for(let i=0;i<n;i++)for(let j=0;j<n;j++)
  d.push({x:i*step,z:j*step}); return d; };

console.log('=== full coverage from scratch ===');
// 5x5 grid over 400m: one central tower with R=280 covers everything? corner
// dist from centre = sqrt(200^2*2)=283 > 280 -> needs >1
const d1=grid(5,100);
const p1=planCellTowers(d1,[],280,6);
check('starts at 0% with no existing sites', p1.beforeFrac===0);
check('reaches 100% within cap', p1.afterFrac===1&&p1.deadZone===0, JSON.stringify(p1));
check('uses few towers (greedy)', p1.newSites.length<=3, p1.newSites.length);

console.log('=== existing infrastructure honoured ===');
const p2=planCellTowers(d1,[{x:200,z:200}],280,6);
check('existing site counts toward coverage', p2.beforeFrac>0.8, p2.beforeFrac);
check('fewer new towers needed than from scratch', p2.newSites.length<p1.newSites.length+1);
const fullCover=[{x:200,z:200},{x:0,z:0},{x:400,z:400},{x:400,z:0},{x:0,z:400}];
const p3=planCellTowers(d1,fullCover,280,6);
check('no proposals when already fully covered', p3.newSites.length===0&&p3.afterFrac===1);

console.log('=== cap + monotonicity ===');
// two far-apart clusters + cap 1 -> one dead zone remains
const d2=grid(2,50).concat(grid(2,50).map(p=>({x:p.x+5000,z:p.z})));
const p4=planCellTowers(d2,[],280,1);
check('respects maxNew cap', p4.newSites.length===1);
check('reports remaining dead zone', p4.deadZone===4, p4.deadZone);
check('coverage never decreases', p4.afterFrac>=p4.beforeFrac);
check('deterministic', JSON.stringify(planCellTowers(d1,[],280,6))===JSON.stringify(planCellTowers(d1,[],280,6)));

console.log(fail===0?'ALL PASS ('+pass+' checks)':'FAIL ('+fail+')');
process.exit(fail===0?0:1);
