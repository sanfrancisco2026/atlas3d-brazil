// Unit test for map-overlay helpers, copied verbatim from index.html.
// Run: node test/map_overlays.test.js   (exit 0 = pass)
function gibsUrl(date){
  return 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/'+
    `MODIS_Terra_CorrectedReflectance_TrueColor/default/${date}/`+
    'GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg';
}
function nextFrame(idx,len){ return len>0?(idx+1)%len:0; }

let pass=0, fail=0;
function check(name,cond,detail){
  if(cond){ pass++; console.log('  ok -', name); }
  else { fail++; console.log('  FAIL -', name, detail||''); }
}

console.log('=== gibsUrl ===');
const u=gibsUrl('2015-08-15');
check('embeds the requested date', u.includes('/default/2015-08-15/'));
check('keeps Leaflet placeholders literal', u.endsWith('/{z}/{y}/{x}.jpg'));
check('epsg3857 + Level9 matrix (matches the verified live tile)',
  u.includes('epsg3857')&&u.includes('GoogleMapsCompatible_Level9'));
check('true-color MODIS layer', u.includes('MODIS_Terra_CorrectedReflectance_TrueColor'));

console.log('=== nextFrame ===');
check('advances', nextFrame(0,8)===1&&nextFrame(3,8)===4);
check('wraps at the end', nextFrame(7,8)===0);
check('single frame stays put', nextFrame(0,1)===0);
check('empty list safe', nextFrame(0,0)===0);

console.log(fail===0?'ALL PASS ('+pass+' checks)':'FAIL ('+fail+')');
process.exit(fail===0?0:1);
