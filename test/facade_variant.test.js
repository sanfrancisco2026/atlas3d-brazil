// Unit test for facade variant selection, copied verbatim from index.html.
// Run: node test/facade_variant.test.js   (exit 0 = pass)
function pickFacadeVariant(h,area,r){
  if(h>55||(h>38&&r<0.35)) return 0;
  if(area>2500&&h>12&&r<0.7) return 0;
  return r>0.5?1:2;
}

let pass=0, fail=0;
function check(name,cond,detail){
  if(cond){ pass++; console.log('  ok -', name); }
  else { fail++; console.log('  FAIL -', name, detail||''); }
}

console.log('=== towers ===');
check('every tower >55m is glass regardless of roll',
  [0,0.3,0.7,0.99].every(r=>pickFacadeVariant(60,400,r)===0));
check('mid-rise 39-55m is glass ~35% of the time',
  pickFacadeVariant(45,400,0.2)===0&&pickFacadeVariant(45,400,0.5)!==0);

console.log('=== large buildings (the new rule) ===');
check('mall footprint 3000m2 at 15m gets curtain glass (r<0.7)',
  pickFacadeVariant(15,3000,0.4)===0);
check('same mall can still be masonry/concrete (r>=0.7)',
  pickFacadeVariant(15,3000,0.8)!==0);
check('large but LOW building (warehouse 8m) never glass',
  [0.1,0.4,0.9].every(r=>pickFacadeVariant(8,5000,r)!==0));
check('small-footprint low building never glass',
  [0.1,0.4,0.9].every(r=>pickFacadeVariant(15,800,r)!==0));

console.log('=== masonry/concrete split ===');
check('non-glass splits by roll: high r masonry, low r concrete',
  pickFacadeVariant(10,300,0.9)===1&&pickFacadeVariant(10,300,0.4)===2);

console.log(fail===0?'ALL PASS ('+pass+' checks)':'FAIL ('+fail+')');
process.exit(fail===0?0:1);
