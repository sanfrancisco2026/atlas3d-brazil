// Unit tests for aerial imagery source selection, functions copied
// verbatim from index.html.
// Run: node test/imagery_source.test.js   (exit 0 = pass)
const SA_BOUNDS={S:-35.0,N:-22.0,W:16.3,E:33.1};
const IMG_SRC={
  esri:{label:'Esri World Imagery',maxZ:19,
    url:(z,x,y)=>`https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`},
  ngi:{label:'CD:NGI aerial (South Africa)',maxZ:20,bounds:SA_BOUNDS,
    url:(z,x,y)=>`https://aerial.openstreetmap.org.za/ngi-aerial/${z}/${x}/${y}.png`},
};
function inBounds(b,bb){ return b&&bb&&b.cLat>=bb.S&&b.cLat<=bb.N&&b.cLon>=bb.W&&b.cLon<=bb.E; }
function pickImagerySource(sel,b,hasWayback,hasCustom){
  if(sel==='custom'&&hasCustom) return 'custom';
  if(sel==='wayback'&&hasWayback) return 'wayback';
  if(sel==='ngi') return inBounds(b,SA_BOUNDS)?'ngi':'esri';
  if(sel==='esri') return 'esri';
  return inBounds(b,SA_BOUNDS)?'ngi':'esri';
}

let pass=0, fail=0;
function check(name,cond,detail){
  if(cond){ pass++; console.log('  ok -', name); }
  else { fail++; console.log('  FAIL -', name, detail||''); }
}
const JB={cLat:-26.2044,cLon:28.0456};        // Johannesburg
const CT={cLat:-33.9221,cLon:18.4231};        // Cape Town
const GYN={cLat:-16.6809,cLon:-49.2539};      // Goiania
const NYC={cLat:40.758,cLon:-73.9855};        // Manhattan
const LES={cLat:-29.31,cLon:27.48};           // Maseru, Lesotho (inside the SA box)

console.log('=== auto: NGI inside South Africa, Esri elsewhere ===');
check('Johannesburg -> NGI', pickImagerySource('auto',JB,false,false)==='ngi');
check('Cape Town -> NGI', pickImagerySource('auto',CT,false,false)==='ngi');
check('Goiania -> Esri', pickImagerySource('auto',GYN,false,false)==='esri');
check('Manhattan -> Esri', pickImagerySource('auto',NYC,false,false)==='esri');

console.log('=== explicit choices ===');
check('NGI forced outside its coverage falls back to Esri',
  pickImagerySource('ngi',GYN,false,false)==='esri');
check('NGI forced inside coverage stays NGI',
  pickImagerySource('ngi',JB,false,false)==='ngi');
check('Esri forced stays Esri even in South Africa',
  pickImagerySource('esri',JB,false,false)==='esri');
check('Wayback only when a release is loaded',
  pickImagerySource('wayback',JB,true,false)==='wayback'&&
  pickImagerySource('wayback',JB,false,false)==='ngi');
check('custom only when a URL is set',
  pickImagerySource('custom',GYN,false,true)==='custom'&&
  pickImagerySource('custom',GYN,false,false)==='esri');

console.log('=== bounds edges ===');
check('a point just outside the SA box uses Esri',
  pickImagerySource('auto',{cLat:-21.9,cLon:28.0},false,false)==='esri'&&
  pickImagerySource('auto',{cLat:-26.2,cLon:33.5},false,false)==='esri');
check('the box is generous enough to include neighbours inside it',
  pickImagerySource('auto',LES,false,false)==='ngi');
check('missing box is safe', pickImagerySource('auto',null,false,false)==='esri');

console.log('=== tile URLs ===');
check('NGI uses z/x/y.png ordering',
  IMG_SRC.ngi.url(18,151494,150855)
    ==='https://aerial.openstreetmap.org.za/ngi-aerial/18/151494/150855.png');
check('Esri uses z/y/x ordering',
  IMG_SRC.esri.url(18,151494,150855).endsWith('/18/150855/151494'));
check('NGI advertises deeper zoom than Esri',
  IMG_SRC.ngi.maxZ>IMG_SRC.esri.maxZ);

console.log(fail===0?'ALL PASS ('+pass+' checks)':'FAIL ('+fail+')');
process.exit(fail===0?0:1);
