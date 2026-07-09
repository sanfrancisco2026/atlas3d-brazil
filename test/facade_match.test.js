// Unit test for the Mapillary facade-matching pure core, copied verbatim from
// index.html and driven by hand-built geometry with known correct answers.
// Run: node test/facade_match.test.js   (exit 0 = pass)
const M_LAT = 111132.92;
const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
let geoCtx = { mPerLon: M_LAT*Math.cos(-16.68*Math.PI/180) };

// ---- functions copied from index.html ----
function _angDiffDeg(a,b){ let d=Math.abs(((a-b)%360+360)%360); return d>180?360-d:d; }
function _bearingDeg(lat1,lon1,lat2,lon2){
  const dE=(lon2-lon1)*geoCtx.mPerLon, dN=(lat2-lat1)*M_LAT;
  return ((Math.atan2(dE,dN)*180/Math.PI)+360)%360;
}
const FACADE_MAX_D=140;
function scoreFacadePhoto(bld,ph,usedCount){
  const dx=(ph.ll[0]-bld.lon)*geoCtx.mPerLon, dz=(ph.ll[1]-bld.lat)*M_LAT;
  const d=Math.hypot(dx,dz);
  if(d>FACADE_MAX_D||d<3) return -1;
  const bCam=_bearingDeg(bld.lat,bld.lon,ph.ll[1],ph.ll[0]);
  let facadeAlign=0.5;
  if(bld.facadeAz!=null){
    const dd=Math.min(_angDiffDeg(bCam,(bld.facadeAz+90)%360),
                      _angDiffDeg(bCam,(bld.facadeAz+270)%360));
    facadeAlign=Math.max(0,Math.cos(dd*Math.PI/180));
  }
  let viewAlign;
  if(ph.pano) viewAlign=0.8;
  else if(ph.compass==null) viewAlign=0.4;
  else{
    const off=_angDiffDeg(ph.compass,(bCam+180)%360);
    if(off>75) return -1;
    viewAlign=Math.cos(off*Math.PI/180);
  }
  const prox=1-d/FACADE_MAX_D;
  const reuse=(usedCount&&usedCount.get(ph)||0)*0.15;
  return 0.4*facadeAlign+0.35*viewAlign+0.25*prox-reuse;
}

// ---- helpers to place cameras at metre offsets from a building ----
const B={lat:-16.68, lon:-49.25, facadeAz:0}; // facade plane runs N-S -> normals E(90)/W(270)
function camAt(eastM,northM,compass,pano){
  return { ll:[B.lon+eastM/geoCtx.mPerLon, B.lat+northM/M_LAT],
           compass:compass===undefined?null:compass, pano:!!pano };
}

let pass=0, fail=0;
function check(name,cond,detail){
  if(cond){ pass++; console.log('  ok -', name); }
  else { fail++; console.log('  FAIL -', name, detail||''); }
}

console.log('=== angle utilities ===');
check('_angDiffDeg wraparound 350 vs 10 = 20', Math.abs(_angDiffDeg(350,10)-20)<1e-9);
check('_angDiffDeg symmetric', _angDiffDeg(10,350)===_angDiffDeg(350,10));
check('bearing due east = 90', Math.abs(_bearingDeg(B.lat,B.lon,B.lat,B.lon+40/geoCtx.mPerLon)-90)<0.01);
check('bearing due north = 0', Math.abs(_bearingDeg(B.lat,B.lon,B.lat+40/M_LAT,B.lon))<0.01);

console.log('=== distance gates ===');
check('200m away disqualified', scoreFacadePhoto(B,camAt(200,0,270))===-1);
check('2m away (inside footprint) disqualified', scoreFacadePhoto(B,camAt(2,0,270))===-1);

console.log('=== orientation-aware selection ===');
// A: 40m east, dead-on the E-facing facade normal, looking west at the wall
const A=camAt(40,0,270);
// Bn: 15m north - closer, looking south at the building, but sits on the wall
//     PLANE (bearing 0 vs normals 90/270 -> facadeAlign 0): sees the narrow end
const Bn=camAt(0,15,180);
// C: 40m east but looking EAST (away from the building)
const C=camAt(40,0,90);
const sA=scoreFacadePhoto(B,A), sB=scoreFacadePhoto(B,Bn), sC=scoreFacadePhoto(B,C);
console.log('   scores: facing='+sA.toFixed(3), 'near-but-parallel='+sB.toFixed(3), 'looking-away='+sC.toFixed(3));
check('facade-facing photo beats nearer misaligned photo', sA>sB);
check('facade-facing photo beats looking-away photo', sA>sC);
check('facade-facing photo passes the 0.55 quality gate', sA>0.55);
check('looking-away photo is hard-disqualified', sC===-1);

console.log('=== pano + unknown metadata ===');
const P=camAt(30,0,undefined,true);          // pano 30m east
check('pano gets viewAlign credit (scores above gate)', scoreFacadePhoto(B,P)>0.55);
const U=camAt(30,0,undefined,false);         // no compass, not pano
check('unknown-compass photo scores below pano at same spot',
  scoreFacadePhoto(B,U)<scoreFacadePhoto(B,P));
const NF={lat:B.lat,lon:B.lon,facadeAz:null}; // building with no facade estimate
check('null facadeAz stays usable (neutral 0.5 term)', scoreFacadePhoto(NF,A)>0.55);

console.log('=== reuse penalty ===');
const used=new Map(); used.set(A,2);
check('a twice-used photo scores 0.30 lower', Math.abs((sA-scoreFacadePhoto(B,A,used))-0.30)<1e-9);

console.log(fail===0?'ALL PASS ('+pass+' checks)':'FAIL ('+fail+' of '+(pass+fail)+')');
process.exit(fail===0?0:1);
