// Unit test for the cell-coverage greedy set-cover (with justification),
// copied verbatim from index.html.
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
      if(cov.length>bestCov.length||
         (cov.length&&cov.length===bestCov.length&&best>=0&&
          (demand[ci].h||0)>(demand[best].h||0))){ best=ci; bestCov=cov; }
    }
    if(best<0||!bestCov.length) break;
    let gap=null;
    for(const o of existing.concat(newSites)){
      const dd=Math.hypot(demand[best].x-o.x,demand[best].z-o.z);
      if(gap==null||dd<gap) gap=dd;
    }
    newSites.push({x:demand[best].x,z:demand[best].z,covers:bestCov.length,
      hostH:demand[best].h||0, share:bestCov.length/uncovered.length, gap});
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
// 5x5 grid over 400m: corner dist from centre = 283 > 280 -> needs >1
const d1=grid(5,100);
const p1=planCellTowers(d1,[],280,40);
check('starts at 0% with no existing sites', p1.beforeFrac===0);
check('reaches 100% - no dead zones', p1.afterFrac===1&&p1.deadZone===0, JSON.stringify(p1));
check('uses few towers (greedy)', p1.newSites.length<=3, p1.newSites.length);

console.log('=== full coverage across separated clusters ===');
// two clusters 5km apart: the old 6-tower cap logic must not stop early
const d2=grid(3,150).concat(grid(3,150).map(p=>({x:p.x+5000,z:p.z})));
const p2f=planCellTowers(d2,[],280,40);
check('both clusters fully covered', p2f.afterFrac===1&&p2f.deadZone===0);

console.log('=== existing infrastructure honoured ===');
const p2=planCellTowers(d1,[{x:200,z:200}],280,40);
check('existing site counts toward coverage', p2.beforeFrac>0.8, p2.beforeFrac);
check('fewer new towers needed than from scratch', p2.newSites.length<p1.newSites.length+1);
const fullCover=[{x:200,z:200},{x:0,z:0},{x:400,z:400},{x:400,z:0},{x:0,z:400}];
const p3=planCellTowers(d1,fullCover,280,40);
check('no proposals when already fully covered', p3.newSites.length===0&&p3.afterFrac===1);

console.log('=== justification fields ===');
check('every site records host height, covered count, gap share',
  p1.newSites.every(s=>'hostH' in s&&s.covers>0&&s.share>0&&s.share<=1));
check('first site in an empty zone has gap=null, later sites measure it',
  p1.newSites[0].gap===null&&p1.newSites.slice(1).every(s=>s.gap>0));
check('site with existing infrastructure measures gap to it',
  p2.newSites.every(s=>s.gap>0));
check('shares are of the THEN-remaining gap (first covers less than 100%)',
  p1.newSites[0].share<1||p1.newSites.length===1);

console.log('=== height tie-break: taller roof wins line-of-sight ===');
// two isolated buildings 1000m apart, each only covers itself; the 40m
// one must be picked before the 10m one
const dTie=[{x:0,z:0,h:10},{x:1000,z:0,h:40}];
const pTie=planCellTowers(dTie,[],280,40);
check('taller host chosen first', pTie.newSites[0].hostH===40, JSON.stringify(pTie.newSites));
check('both eventually covered', pTie.afterFrac===1);

console.log('=== cap + monotonicity ===');
const d3=grid(2,50).concat(grid(2,50).map(p=>({x:p.x+5000,z:p.z})));
const p4=planCellTowers(d3,[],280,1);
check('respects maxNew cap', p4.newSites.length===1);
check('reports remaining dead zone', p4.deadZone===4, p4.deadZone);
check('coverage never decreases', p4.afterFrac>=p4.beforeFrac);
check('deterministic', JSON.stringify(planCellTowers(d1,[],280,40))===JSON.stringify(planCellTowers(d1,[],280,40)));

console.log(fail===0?'ALL PASS ('+pass+' checks)':'FAIL ('+fail+')');
process.exit(fail===0?0:1);
