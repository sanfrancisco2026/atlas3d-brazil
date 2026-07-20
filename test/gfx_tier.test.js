// Unit test for GPU tier classification, copied verbatim from index.html.
// Run: node test/gfx_tier.test.js   (exit 0 = pass)
function classifyGPU(s){
  s=(s||'').toLowerCase();
  if(/swiftshader|software|llvmpipe|basic render/.test(s)) return 'low';
  if(/intel|iris|uhd graphics/.test(s)) return 'medium';
  if(/nvidia|geforce|rtx|gtx|radeon|apple m\d/.test(s)) return 'high';
  return 'medium';
}
const GFX={
  high:  {px:2,   shadow:4096, bloomDiv:1, rain:1,   traffic:190},
  medium:{px:1.5, shadow:2048, bloomDiv:2, rain:0.7, traffic:150},
  low:   {px:1,   shadow:0,    bloomDiv:2, rain:0.4, traffic:90},
};

let pass=0, fail=0;
function check(name,cond,detail){
  if(cond){ pass++; console.log('  ok -', name); }
  else { fail++; console.log('  FAIL -', name, detail||''); }
}

console.log('=== classifyGPU (real-world renderer strings) ===');
check('this machine dGPU -> high',
  classifyGPU('ANGLE (NVIDIA, NVIDIA GeForce RTX 2050 Direct3D11 vs_5_0)')==='high');
check('this machine iGPU -> medium (headless probe string)',
  classifyGPU('ANGLE (Intel, Intel(R) Iris(R) Xe Graphics (0x000046A8) Direct3D11 vs_5_0 ps_5_0, D3D11)')==='medium');
check('SwiftShader -> low',
  classifyGPU('ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)))')==='low');
check('Microsoft Basic Render Driver -> low',
  classifyGPU('ANGLE (Microsoft, Microsoft Basic Render Driver Direct3D11)')==='low');
check('AMD -> high', classifyGPU('ANGLE (AMD, AMD Radeon RX 6600)')==='high');
check('Apple silicon -> high', classifyGPU('Apple M2')==='high');
check('unknown -> medium (safe middle)', classifyGPU('')==='medium'&&classifyGPU(null)==='medium');

console.log('=== budgets sane ===');
check('shadow budget descends with tier',
  GFX.high.shadow>GFX.medium.shadow&&GFX.medium.shadow>GFX.low.shadow);
check('pixel ratio descends', GFX.high.px>GFX.medium.px&&GFX.medium.px>GFX.low.px);
check('traffic and rain budgets descend',
  GFX.high.traffic>GFX.medium.traffic&&GFX.medium.traffic>GFX.low.traffic&&
  GFX.high.rain>GFX.medium.rain&&GFX.medium.rain>GFX.low.rain);
check('low tier disables shadows entirely', GFX.low.shadow===0);

console.log(fail===0?'ALL PASS ('+pass+' checks)':'FAIL ('+fail+')');
process.exit(fail===0?0:1);
