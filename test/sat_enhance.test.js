// Unit test for the satellite-image enhancement math, copied verbatim
// from index.html.
// Run: node test/sat_enhance.test.js   (exit 0 = pass)
// Pure (unit-tested): the per-pixel enhancement - saturation lifted 22%
// around the pixel's own luma, then a mild contrast S around mid-grey,
// clamped to 0..255. Grey stays grey; greens/reds deepen naturally.
function enhanceRGB(r,g,b){
  const l=0.299*r+0.587*g+0.114*b;
  const c=v=>{ v=(l+(v-l)*1.22-128)*1.07+128;
    return v<0?0:v>255?255:v; };
  return [c(r),c(g),c(b)];
}

let pass=0, fail=0;
function check(name,cond,detail){
  if(cond){ pass++; console.log('  ok -', name); }
  else { fail++; console.log('  FAIL -', name, detail||''); }
}

console.log('=== neutral tones ===');
check('mid-grey 128 is the fixed point', enhanceRGB(128,128,128).every(v=>v===128));
check('grey stays grey (no colour cast)',
  (()=>{ const [r,g,b]=enhanceRGB(90,90,90); return r===g&&g===b; })());
check('dark grey gets slightly darker, light grey lighter (contrast)',
  enhanceRGB(90,90,90)[0]<90&&enhanceRGB(180,180,180)[0]>180);

console.log('=== saturation ===');
check('vegetation green becomes greener (channel gap grows)',
  (()=>{ const inp=[60,120,50], out=enhanceRGB(...inp);
    return (out[1]-out[0])>(inp[1]-inp[0])&&(out[1]-out[2])>(inp[1]-inp[2]); })());
check('terracotta roof red deepens the same way',
  (()=>{ const out=enhanceRGB(170,110,90);
    return (out[0]-out[2])>(170-90); })());

console.log('=== clamping ===');
check('saturated bright pixels clamp at 255, never wrap',
  enhanceRGB(250,255,245).every(v=>v>=0&&v<=255));
check('near-black clamps at 0', enhanceRGB(5,2,8).every(v=>v>=0&&v<=255));

console.log(fail===0?'ALL PASS ('+pass+' checks)':'FAIL ('+fail+')');
process.exit(fail===0?0:1);
