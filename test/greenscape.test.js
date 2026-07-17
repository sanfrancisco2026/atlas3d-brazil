// Unit test for the greenscape vegetation classifier, copied verbatim from index.html.
// Run: node test/greenscape.test.js   (exit 0 = pass)
function isVegetated(r,g,b){ return g>40 && g>r*1.06 && g>b*1.06; }

let pass=0, fail=0;
function check(name,cond,detail){
  if(cond){ pass++; console.log('  ok -', name); }
  else { fail++; console.log('  FAIL -', name, detail||''); }
}

check('park green', isVegetated(60,110,55));
check('dark tree canopy', isVegetated(40,62,35));
check('grey asphalt rejected', !isVegetated(120,122,125));
check('bare red soil rejected', !isVegetated(150,110,80));
check('concrete rooftop rejected', !isVegetated(180,180,175));
check('blue water rejected', !isVegetated(40,70,120));
check('near-black shadow rejected (g<=40 floor)', !isVegetated(20,35,18));
check('white cloud/overexposure rejected', !isVegetated(250,252,250));

console.log(fail===0?'ALL PASS ('+pass+' checks)':'FAIL ('+fail+')');
process.exit(fail===0?0:1);
