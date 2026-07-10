// Unit test for export helpers, copied verbatim from index.html.
// Run: node test/export_utils.test.js   (exit 0 = pass)
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function slugify(s){
  return (s||'scene').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'').slice(0,48)||'scene';
}
function fitExportScale(w,h,maxDim){
  return clamp(Math.min(maxDim/w,maxDim/h),1,2);
}

let pass=0, fail=0;
function check(name,cond,detail){
  if(cond){ pass++; console.log('  ok -', name); }
  else { fail++; console.log('  FAIL -', name, detail||''); }
}

console.log('=== slugify ===');
check('accents stripped (Goiânia)', slugify('Goiânia · Praça Cívica')==='goiania_praca_civica',
  slugify('Goiânia · Praça Cívica'));
check('coords survive', slugify('-16.6809, -49.2539')==='16_6809_49_2539',
  slugify('-16.6809, -49.2539'));
check('empty/null falls back to scene', slugify('')==='scene'&&slugify(null)==='scene');
check('symbols-only falls back to scene', slugify('···!!!')==='scene');
check('length capped at 48', slugify('x'.repeat(200)).length===48);
check('no leading/trailing underscores', !/^_|_$/.test(slugify('  São Paulo!  ')));

console.log('=== fitExportScale ===');
check('typical 1920x1080 -> 2x', fitExportScale(1920,1080,4096)===2);
check('large canvas capped by maxDim', Math.abs(fitExportScale(3000,2000,4096)-4096/3000)<1e-12);
check('never below native (huge canvas)', fitExportScale(8000,5000,4096)===1);
check('never above 2x (tiny canvas)', fitExportScale(400,300,4096)===2);

console.log(fail===0?'ALL PASS ('+pass+' checks)':'FAIL ('+fail+')');
process.exit(fail===0?0:1);
