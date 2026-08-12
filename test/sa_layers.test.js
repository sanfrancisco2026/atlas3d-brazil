// Unit tests for the South African open-GIS layer queries, function
// copied verbatim from index.html.
// Run: node test/sa_layers.test.js   (exit 0 = pass)
function arcgisQueryUrl(base,b,max){
  return base+'/query?where=1%3D1&outFields=*'+
    '&geometry='+encodeURIComponent(`${b.W},${b.S},${b.E},${b.N}`)+
    '&geometryType=esriGeometryEnvelope&inSR=4326'+
    '&spatialRel=esriSpatialRelIntersects&outSR=4326&f=geojson'+
    '&resultRecordCount='+(max||1000);
}
const SA_LAYERS={
  wards:{label:'MDB wards 2020',url:'https://services7.arcgis.com/oeoyTUJC8HEeYsRB/arcgis/rest/services/MDB_Wards_2020/FeatureServer/0'},
  munis:{label:'MDB local municipalities 2018',url:'https://services7.arcgis.com/oeoyTUJC8HEeYsRB/arcgis/rest/services/LocalMunicipalities2018_Final/FeatureServer/0'},
  ctParks:{label:'Cape Town parks',url:'https://esapqa.capetown.gov.za/agsext/rest/services/Theme_Based/ODP_SPLIT_2/FeatureServer/3'},
  ctZoning:{label:'Cape Town zoning',url:'https://services6.arcgis.com/nyYfO9SxHU2ChQd9/arcgis/rest/services/Zoning/FeatureServer/0'},
  ctRail:{label:'Cape Town railway lines',url:'https://esapqa.capetown.gov.za/agsext/rest/services/Theme_Based/ODP_SPLIT_12/FeatureServer/5'},
  ctWater:{label:'Cape Town watercourses',url:'https://esapqa.capetown.gov.za/agsext/rest/services/Theme_Based/ODP_SPLIT_3/FeatureServer/8'},
};

let pass=0, fail=0;
function check(name,cond,detail){
  if(cond){ pass++; console.log('  ok -', name); }
  else { fail++; console.log('  FAIL -', name, detail||''); }
}
const JB={W:28.037,S:-26.212,E:28.054,N:-26.197};

console.log('=== query construction ===');
const u=arcgisQueryUrl(SA_LAYERS.wards.url,JB);
check('targets the FeatureServer query endpoint', u.includes('/FeatureServer/0/query?'));
check('asks for GeoJSON in WGS84', u.includes('f=geojson')&&u.includes('outSR=4326'));
check('sends the capture box as an envelope filter',
  u.includes('geometryType=esriGeometryEnvelope')&&
  u.includes(encodeURIComponent('28.037,-26.212,28.054,-26.197')));
check('bounds are URL-encoded (raw commas would break the query)',
  u.includes('%2C')&&!/geometry=28\.037,/.test(u));
check('requests attributes so popups have content', u.includes('outFields=*'));
check('caps the record count', u.includes('resultRecordCount=1000'));
check('custom cap honoured',
  arcgisQueryUrl(SA_LAYERS.wards.url,JB,50).includes('resultRecordCount=50'));

console.log('=== negative coordinates survive encoding ===');
const ct=arcgisQueryUrl(SA_LAYERS.ctParks.url,{W:18.41,S:-33.93,E:18.44,N:-33.91});
check('southern-hemisphere box encoded intact',
  ct.includes(encodeURIComponent('18.41,-33.93,18.44,-33.91')));

console.log('=== catalogue integrity ===');
check('every layer has a label and an https FeatureServer URL',
  Object.values(SA_LAYERS).every(l=>l.label&&/^https:\/\//.test(l.url)&&
    /FeatureServer\/\d+$/.test(l.url)));
check('six curated layers registered', Object.keys(SA_LAYERS).length===6);
check('national layers come from the Municipal Demarcation Board org',
  SA_LAYERS.wards.url.includes('oeoyTUJC8HEeYsRB')&&
  SA_LAYERS.munis.url.includes('oeoyTUJC8HEeYsRB'));
check('Cape Town layers come from City of Cape Town services',
  ['ctParks','ctRail','ctWater'].every(k=>SA_LAYERS[k].url.includes('capetown.gov.za')));

console.log(fail===0?'ALL PASS ('+pass+' checks)':'FAIL ('+fail+')');
process.exit(fail===0?0:1);
