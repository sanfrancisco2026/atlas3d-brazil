// Unit tests for the OpenWeather adapters (current weather + air
// pollution), functions copied verbatim from index.html.
// Run: node test/openweather.test.js   (exit 0 = pass)
function owmToWmo(id){
  if(id==null) return null;
  if(id>=200&&id<300) return 95;
  if(id>=300&&id<400) return 53;
  if(id>=500&&id<600) return id>=520?80:(id>=502?65:(id===501?63:61));
  if(id>=600&&id<700) return 71;
  if(id>=700&&id<800) return 45;
  if(id===800) return 0;
  if(id===801) return 1;
  if(id===802) return 2;
  if(id>802) return 3;
  return null;
}
function parseOWMWeather(j){
  const w=(j.weather&&j.weather[0])||{};
  const rain=(j.rain&&(j.rain['1h']!=null?j.rain['1h']:j.rain['3h']/3))||0;
  const snow=(j.snow&&(j.snow['1h']!=null?j.snow['1h']:j.snow['3h']/3))||0;
  return {tempC:j.main&&j.main.temp, precip:Math.max(rain,snow),
    windKmh:(j.wind&&j.wind.speed||0)*3.6, windDeg:(j.wind&&j.wind.deg)||0,
    cloud:(j.clouds&&j.clouds.all)||0, code:owmToWmo(w.id),
    label:'OpenWeather'+(w.description?' · '+w.description:'')};
}
function parseOWMAir(j){
  const e=j&&j.list&&j.list[0];
  if(!e||!e.components) return null;
  const pm=e.components.pm2_5;
  if(!(pm>=0)) return null;
  const aqi=e.main&&e.main.aqi;
  const OWM_AQI=['','Good','Fair','Moderate','Poor','Very poor'];
  return {pm25:Math.round(pm*10)/10, aqi,
    label:'OpenWeather'+(aqi?' · AQI '+aqi+' ('+OWM_AQI[aqi]+')':''),
    components:e.components};
}
// the app's existing band function, to confirm the two agree
function aqBand(pm){
  if(pm<=12)   return ['Good','#00ff9d'];
  if(pm<=35.4) return ['Moderate','#ffdb0d'];
  if(pm<=55.4) return ['Sensitive','#ff9a3d'];
  return ['Unhealthy','#ff4d5e'];
}

let pass=0, fail=0;
function check(name,cond,detail){
  if(cond){ pass++; console.log('  ok -', name); }
  else { fail++; console.log('  FAIL -', name, detail||''); }
}

console.log('=== OpenWeather condition ids -> WMO codes ===');
check('clear / few / scattered / broken map to the cloud ladder',
  owmToWmo(800)===0&&owmToWmo(801)===1&&owmToWmo(802)===2&&owmToWmo(804)===3);
check('thunderstorm family -> 95', owmToWmo(200)===95&&owmToWmo(232)===95);
check('drizzle -> 53', owmToWmo(300)===53&&owmToWmo(321)===53);
check('rain intensities: light / moderate / heavy / showers',
  owmToWmo(500)===61&&owmToWmo(501)===63&&owmToWmo(502)===65&&owmToWmo(521)===80);
check('snow -> 71, haze/fog -> 45', owmToWmo(601)===71&&owmToWmo(741)===45);
check('null / unknown id -> null', owmToWmo(null)===null&&owmToWmo(1)===null);

console.log('=== current-weather payload ===');
const w=parseOWMWeather({main:{temp:27.4},wind:{speed:5,deg:120},
  clouds:{all:40},rain:{'1h':2.5},weather:[{id:501,description:'moderate rain'}]});
check('temperature passes through', w.tempC===27.4);
check('wind converted m/s -> km/h', Math.abs(w.windKmh-18)<1e-9, w.windKmh);
check('precipitation from the 1h bucket', w.precip===2.5);
check('cloud cover + WMO code + provider label',
  w.cloud===40&&w.code===63&&w.label.includes('moderate rain'));
check('3h bucket averaged when 1h is absent',
  parseOWMWeather({rain:{'3h':6},main:{temp:20}}).precip===2);
check('snow counted as precipitation',
  parseOWMWeather({snow:{'1h':1.5},main:{temp:-2}}).precip===1.5);
check('dry payload -> zero precip, no crash',
  (()=>{ const d=parseOWMWeather({main:{temp:31},wind:{speed:0},clouds:{all:0},
    weather:[{id:800,description:'clear sky'}]});
    return d.precip===0&&d.windKmh===0&&d.code===0; })());
check('empty payload does not throw',
  (()=>{ const e=parseOWMWeather({}); return e.precip===0&&e.code===null; })());

console.log('=== air-pollution payload ===');
const air=parseOWMAir({list:[{main:{aqi:3},components:{pm2_5:23.7,pm10:41.2,
  no2:18.4,o3:63.1,so2:2.1,co:310.4,nh3:1.2}}]});
check('PM2.5 extracted and rounded to 0.1', air.pm25===23.7);
check('AQI band named in the label', air.aqi===3&&air.label.includes('Moderate'));
check('other pollutants kept for the log',
  air.components.pm10===41.2&&air.components.no2===18.4);
check('PM2.5 agrees with the app health band',
  aqBand(air.pm25)[0]==='Moderate');
check('clean air maps to Good', aqBand(parseOWMAir(
  {list:[{main:{aqi:1},components:{pm2_5:4.2}}]}).pm25)[0]==='Good');
check('zero PM2.5 is valid (not treated as missing)',
  parseOWMAir({list:[{main:{aqi:1},components:{pm2_5:0}}]}).pm25===0);
check('missing list / components / pm2_5 -> null (caller falls back)',
  parseOWMAir({})===null&&parseOWMAir({list:[]})===null&&
  parseOWMAir({list:[{main:{aqi:2}}]})===null&&
  parseOWMAir({list:[{components:{pm10:20}}]})===null);

console.log(fail===0?'ALL PASS ('+pass+' checks)':'FAIL ('+fail+')');
process.exit(fail===0?0:1);
