// Unit test for street-name label helpers, copied verbatim from index.html.
// Run: node test/road_labels.test.js   (exit 0 = pass)
function dedupeRoadNames(list,perName,capN){
  const seen={};
  return list.slice().sort((a,b)=>b.len-a.len).filter(r=>{
    if((seen[r.name]||0)>=perName) return false;
    seen[r.name]=(seen[r.name]||0)+1; return true;
  }).slice(0,capN);
}
function labelYaw(dx,dz){
  if(dx<0){ dx=-dx; dz=-dz; }
  return Math.atan2(-dz,dx);
}

let pass=0, fail=0;
function check(name,cond,detail){
  if(cond){ pass++; console.log('  ok -', name); }
  else { fail++; console.log('  FAIL -', name, detail||''); }
}
const near=(a,b)=>Math.abs(a-b)<1e-9;

console.log('=== dedupeRoadNames ===');
const segs=[
  {name:'Av. Goias',len:300},{name:'Av. Goias',len:250},{name:'Av. Goias',len:200},
  {name:'Rua 3',len:150},{name:'Rua 7',len:90},
];
const d=dedupeRoadNames(segs,2,90);
check('max 2 labels per street name', d.filter(r=>r.name==='Av. Goias').length===2);
check('keeps the longest segments', d.find(r=>r.name==='Av. Goias').len===300&&
  !d.some(r=>r.name==='Av. Goias'&&r.len===200));
check('other streets kept', d.some(r=>r.name==='Rua 3')&&d.some(r=>r.name==='Rua 7'));
check('global cap respected', dedupeRoadNames(segs,2,3).length===3);
check('input not mutated', segs[0].name==='Av. Goias'&&segs.length===5);

console.log('=== labelYaw (text never upside-down) ===');
check('eastbound road -> yaw 0', near(labelYaw(1,0),0));
check('westbound road flips to eastbound reading', near(labelYaw(-1,0),0));
check('northbound (dz<0) -> +45deg-style yaw', labelYaw(1,-1)>0);
check('a flipped road gets the same yaw as its reverse',
  near(labelYaw(3,2),labelYaw(-3,-2)));

console.log(fail===0?'ALL PASS ('+pass+' checks)':'FAIL ('+fail+')');
process.exit(fail===0?0:1);
