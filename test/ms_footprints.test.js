// Unit test for Microsoft ML footprint tag mapping, copied verbatim from index.html.
// Run: node test/ms_footprints.test.js   (exit 0 = pass)
function msFootprintTags(h){
  const t={building:'yes','ms:footprint':'1'};
  if(h>0) t.height=String(h);
  return t;
}

let pass=0, fail=0;
function check(name,cond,detail){
  if(cond){ pass++; console.log('  ok -', name); }
  else { fail++; console.log('  FAIL -', name, detail||''); }
}

const withH=msFootprintTags(12.5);
check('ML height becomes an OSM-style height tag (string)',
  withH.height==='12.5'&&typeof withH.height==='string');
check('provenance marker always present', withH['ms:footprint']==='1'&&
  msFootprintTags(null)['ms:footprint']==='1');
check('building tag set for the extrusion pipeline', withH.building==='yes');
const noH=msFootprintTags(null);
check('null height -> no height tag (estimator extrudes)', !('height' in noH));
check('zero/negative ML heights treated as unknown',
  !('height' in msFootprintTags(0))&&!('height' in msFootprintTags(-1)));

// integration contract: estimateHeight's tagged-branch triggers on tags.height,
// so an MS height must parse as a positive number via parseLen's rules
const parseLen=v=>{ if(v==null) return NaN;
  const m=String(v).replace(',','.').match(/-?[\d.]+/); if(!m) return NaN;
  let n=parseFloat(m[0]); if(/ft|'/.test(String(v))) n*=0.3048; return n; };
check('height tag round-trips through parseLen', parseLen(withH.height)===12.5);

console.log(fail===0?'ALL PASS ('+pass+' checks)':'FAIL ('+fail+')');
process.exit(fail===0?0:1);
