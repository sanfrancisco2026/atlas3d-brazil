// Unit test for vegetation archetype selection, copied verbatim from index.html.
// Run: node test/vegetation.test.js   (exit 0 = pass)
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function vegArchetype(lidarH,nearB,r){
  if(lidarH!=null&&lidarH>=3.5)
    return {type:r<0.2?'cone':'tree',
            h:clamp(lidarH,3.5,28)*(nearB?0.85:1), shade:!!nearB};
  if(lidarH!=null&&lidarH>=1)
    return {type:'shrub', h:clamp(lidarH,0.6,3), shade:!!nearB};
  if(lidarH!=null&&lidarH>0)
    return {type:'grass', h:0.3+r*0.25, shade:!!nearB};
  if(nearB){                       // street trees line built-up blocks
    if(r<0.12) return {type:'tree', h:4+r*25, shade:true};
    return r<0.65?{type:'shrub',h:0.8+r*1.2,shade:true}
                 :{type:'grass',h:0.3+r*0.2,shade:true};
  }
  if(r<0.16) return {type:r<0.03?'cone':'tree', h:5+r*25, shade:false};
  if(r<0.5)  return {type:'shrub', h:0.7+r*2, shade:false};
  return {type:'grass', h:0.25+r*0.3, shade:false};
}

let pass=0, fail=0;
function check(name,cond,detail){
  if(cond){ pass++; console.log('  ok -', name); }
  else { fail++; console.log('  FAIL -', name, detail||''); }
}

console.log('=== LiDAR-measured heights drive the archetype ===');
const t12=vegArchetype(12,false,0.5);
check('12m LiDAR canopy -> tree at measured height', t12.type==='tree'&&t12.h===12);
check('LiDAR tree capped at 28m', vegArchetype(60,false,0.5).h===28);
check('2m LiDAR -> shrub at measured height', vegArchetype(2,false,0.5).type==='shrub'&&
  vegArchetype(2,false,0.5).h===2);
check('0.4m LiDAR -> grass', vegArchetype(0.4,false,0.5).type==='grass');
check('cone form for a share of tall canopy', vegArchetype(10,false,0.1).type==='cone');

console.log('=== surroundings: beside buildings = shade-tolerant + smaller ===');
const shaded=vegArchetype(12,true,0.5);
check('tree beside a building is 15% smaller and flagged shaded',
  Math.abs(shaded.h-12*0.85)<1e-9&&shaded.shade===true);
check('no LiDAR + near building -> shrubs mostly',
  vegArchetype(null,true,0.3).type==='shrub'&&vegArchetype(null,true,0.9).type==='grass');
check('occasional street tree beside buildings (4-7m, shaded)', (()=>{
  const a=vegArchetype(null,true,0.05);
  return a.type==='tree'&&a.h>=4&&a.h<=7&&a.shade===true; })());

console.log('=== open ground without LiDAR ===');
check('occasional full tree (5-9m)', (()=>{ const a=vegArchetype(null,false,0.1);
  return a.type==='tree'&&a.h>=5&&a.h<=9; })());
check('mostly shrubs/grass', vegArchetype(null,false,0.3).type==='shrub'&&
  vegArchetype(null,false,0.8).type==='grass');
check('grass stays under 0.6m', vegArchetype(null,false,0.99).h<0.6);

console.log(fail===0?'ALL PASS ('+pass+' checks)':'FAIL ('+fail+')');
process.exit(fail===0?0:1);
