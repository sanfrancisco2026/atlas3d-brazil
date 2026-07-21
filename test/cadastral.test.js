// Unit test for cadastral segment clipping, copied verbatim from index.html.
// Run: node test/cadastral.test.js   (exit 0 = pass)
function cadSegmentsInBox(segs,b){
  return segs.filter(s=>{
    const laMin=Math.min(s[0],s[2]),laMax=Math.max(s[0],s[2]);
    const loMin=Math.min(s[1],s[3]),loMax=Math.max(s[1],s[3]);
    return laMax>=b.S&&laMin<=b.N&&loMax>=b.W&&loMin<=b.E;
  });
}

let pass=0, fail=0;
function check(name,cond,detail){
  if(cond){ pass++; console.log('  ok -', name); }
  else { fail++; console.log('  FAIL -', name, detail||''); }
}

const B={S:-16.69,N:-16.67,W:-49.26,E:-49.24};   // Goiania-like box
const inside=[-16.68,-49.25,-16.681,-49.251];
const straddling=[-16.68,-49.25,-16.60,-49.10];   // one end far outside
const crossing=[-16.68,-49.30,-16.68,-49.20];     // BOTH ends outside, spans the box
const outside=[-16.5,-49.0,-16.51,-49.01];
const onEdge=[-16.69,-49.26,-16.695,-49.265];     // touches the corner

const out=cadSegmentsInBox([inside,straddling,crossing,outside,onEdge],B);
check('inside segment kept', out.includes(inside));
check('straddling segment kept', out.includes(straddling));
check('crossing segment kept (both endpoints outside - the old clip dropped these)',
  out.includes(crossing));
check('fully outside segment dropped', !out.includes(outside));
check('edge-touching segment kept (inclusive bounds)', out.includes(onEdge));
check('count as expected', out.length===4);
check('empty input safe', cadSegmentsInBox([],B).length===0);

console.log(fail===0?'ALL PASS ('+pass+' checks)':'FAIL ('+fail+')');
process.exit(fail===0?0:1);
