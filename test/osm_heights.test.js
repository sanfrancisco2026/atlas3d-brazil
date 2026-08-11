// Unit tests for live OSM height enrichment of offline zones,
// functions copied verbatim from index.html.
// Run: node test/osm_heights.test.js   (exit 0 = pass)
function parseOverpassHeights(json){
  const out=[];
  ((json&&json.elements)||[]).forEach(el=>{
    const t=el.tags||{}, c=el.center||el;
    if(c.lat==null||c.lon==null) return;
    let h=null;
    const raw=t.height||t['building:height'];
    if(raw!=null){
      const s=String(raw).trim();
      const ft=/^([\d.]+)\s*(?:'|ft|feet)$/i.exec(s);
      if(ft) h=parseFloat(ft[1])*0.3048;
      else{ const m=parseFloat(s); if(isFinite(m)) h=m; }
    }
    if(h==null&&t['building:levels']!=null){
      const lv=parseFloat(t['building:levels']);
      if(isFinite(lv)&&lv>0) h=lv*3.2+1;
    }
    if(h!=null&&h>=2&&h<=650) out.push({lat:c.lat,lon:c.lon,h,
      src:raw!=null?'height':'levels'});
  });
  return out;
}
function matchHeightsToBuildings(builds,samples,tolM){
  const M=111320, out=new Map(), best=new Map();
  samples.forEach(s=>{
    let bi=-1, bd=tolM;
    builds.forEach((b,i)=>{
      const dLat=(b.lat-s.lat)*M;
      const dLon=(b.lon-s.lon)*M*Math.cos(s.lat*Math.PI/180);
      const d=Math.hypot(dLat,dLon);
      if(d<bd){ bd=d; bi=i; }
    });
    if(bi>=0&&(!best.has(bi)||bd<best.get(bi))){
      best.set(bi,bd); out.set(builds[bi].id,s);
    }
  });
  return out;
}

let pass=0, fail=0;
function check(name,cond,detail){
  if(cond){ pass++; console.log('  ok -', name); }
  else { fail++; console.log('  FAIL -', name, detail||''); }
}
const el=(lat,lon,tags)=>({type:'way',id:1,center:{lat,lon},tags});

console.log('=== parsing Overpass height tags ===');
const p=parseOverpassHeights({elements:[
  el(-26.2,28.04,{building:'yes',height:'38'}),
  el(-26.2,28.05,{building:'yes',height:'38.5 m'}),
  el(-26.2,28.06,{building:'yes',height:"125'"}),
  el(-26.2,28.07,{building:'yes',height:'410 ft'}),
  el(-26.2,28.08,{building:'yes','building:levels':'12'}),
  el(-26.2,28.09,{building:'yes','building:height':'22'}),
]});
check('plain metres', p[0].h===38&&p[0].src==='height');
check('metres with unit suffix', p[1].h===38.5);
check('feet with prime symbol', Math.abs(p[2].h-38.1)<0.01, p[2].h);
check('feet spelled out', Math.abs(p[3].h-124.968)<0.01, p[3].h);
check('building:levels -> 3.2m per level + parapet',
  Math.abs(p[4].h-(12*3.2+1))<1e-9&&p[4].src==='levels');
check('building:height alias honoured', p[5].h===22);

console.log('=== rejecting junk ===');
const bad=parseOverpassHeights({elements:[
  el(-26.2,28.0,{height:'tall'}),
  el(-26.2,28.0,{height:'0'}),
  el(-26.2,28.0,{height:'2000'}),
  el(-26.2,28.0,{'building:levels':'0'}),
  {type:'way',id:9,tags:{height:'30'}},          // no coordinates
  el(-26.2,28.0,{}),
]});
check('non-numeric, zero, absurd, level-0, coordinate-less all dropped',
  bad.length===0, JSON.stringify(bad));
check('empty / malformed response safe',
  parseOverpassHeights(null).length===0&&
  parseOverpassHeights({}).length===0&&
  parseOverpassHeights({elements:[]}).length===0);

console.log('=== matching samples to footprints ===');
// three buildings ~50m apart on a lat line
const B=[{id:'a',lat:-26.2000,lon:28.0400},
         {id:'b',lat:-26.2000,lon:28.0405},
         {id:'c',lat:-26.2010,lon:28.0400}];
const m1=matchHeightsToBuildings(B,[{lat:-26.20001,lon:28.04001,h:40}],28);
check('sample lands on the nearest building', m1.get('a')&&m1.get('a').h===40);
check('other buildings untouched', !m1.has('b')&&!m1.has('c'));
check('sample beyond tolerance is ignored',
  matchHeightsToBuildings(B,[{lat:-26.2100,lon:28.0400,h:40}],28).size===0);
check('closest sample wins when two target one building',
  (()=>{ const m=matchHeightsToBuildings(B,
    [{lat:-26.20010,lon:28.04000,h:10},{lat:-26.20001,lon:28.04000,h:44}],28);
    return m.get('a').h===44; })());
check('multiple buildings each get their own sample',
  (()=>{ const m=matchHeightsToBuildings(B,
    [{lat:-26.2000,lon:28.0400,h:30},{lat:-26.2000,lon:28.0405,h:60}],28);
    return m.get('a').h===30&&m.get('b').h===60; })());
check('no samples / no buildings safe',
  matchHeightsToBuildings(B,[],28).size===0&&
  matchHeightsToBuildings([],[{lat:0,lon:0,h:5}],28).size===0);

console.log(fail===0?'ALL PASS ('+pass+' checks)':'FAIL ('+fail+')');
process.exit(fail===0?0:1);
