// Unit tests for the municipal-boundary outline layer helpers, copied
// verbatim from index.html.
// Run: node test/muni_layer.test.js   (exit 0 = pass)
// Pure (unit-tested): popup HTML for one outlined area
function muniPopupHtml(name,code,pop){
  return `<b>${name||'Area '+code}</b><br>IBGE code ${code}`+
    (pop?`<br>Population: ${Number(pop).toLocaleString()} (2024 est.)`:'')+
    '<br><span style="opacity:.7">IBGE territorial mesh &middot; outline only</span>';
}
// Pure (unit-tested): unique codarea list -> pipe-joined chunks, sized so
// the keyless IBGE API URLs stay comfortably under length limits
function muniCodeChunks(fc,size){
  const codes=[...new Set(((fc&&fc.features)||[])
    .map(f=>f.properties&&f.properties.codarea).filter(Boolean).map(String))];
  const out=[];
  for(let i=0;i<codes.length;i+=size) out.push(codes.slice(i,i+size).join('|'));
  return out;
}

let pass=0, fail=0;
function check(name,cond,detail){
  if(cond){ pass++; console.log('  ok -', name); }
  else { fail++; console.log('  FAIL -', name, detail||''); }
}
const fc=n=>({features:Array.from({length:n},(_,i)=>({properties:{codarea:5200000+i}}))});

console.log('=== popup details ===');
const p=muniPopupHtml('Goiânia','5208707',1494599);
check('name, code and population all present',
  p.includes('Goiânia')&&p.includes('5208707')&&p.includes('1,494,599'));
check('outline-only note included', p.includes('outline only'));
check('no population -> line omitted, no NaN',
  !muniPopupHtml('X','1',null).includes('Population')&&
  !muniPopupHtml('X','1',undefined).includes('NaN'));
check('unnamed area falls back to its code',
  muniPopupHtml(null,'5299999').includes('Area 5299999'));

console.log('=== code chunking for the keyless APIs ===');
check('246 municipalities (GO) -> 5 chunks of <=50',
  (()=>{ const ch=muniCodeChunks(fc(246),50);
    return ch.length===5&&ch[0].split('|').length===50&&ch[4].split('|').length===46; })());
check('chunk URLs stay short (50 codes ~ 400 chars)',
  muniCodeChunks(fc(246),50).every(c=>c.length<500));
check('duplicate codareas deduped',
  muniCodeChunks({features:[{properties:{codarea:1}},{properties:{codarea:1}},
    {properties:{codarea:2}}]},50).join()==='1|2');
check('features without codarea skipped, empty input safe',
  muniCodeChunks({features:[{properties:{}},{}]},50).length===0&&
  muniCodeChunks(null,50).length===0);

console.log(fail===0?'ALL PASS ('+pass+' checks)':'FAIL ('+fail+')');
process.exit(fail===0?0:1);
