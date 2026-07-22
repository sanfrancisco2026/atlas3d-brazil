// Unit tests for window dressing decisions + Mapillary reference tint,
// both functions copied verbatim from index.html.
// Run: node test/window_dressing.test.js   (exit 0 = pass)
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
// Pure (unit-tested): per-window dressing decisions for the facade painter.
// Glass towers get dark mullion frames + occasional blinds/reflection
// streaks; masonry/concrete get light frames, sills, curtains/blinds and
// the odd window AC unit (masonry only - the Brazilian apartment look).
function windowDressing(style,r,glassy){
  if(glassy)
    return {frame:'dark', interior:r<0.22?'blinds':'plain', streak:r>0.72,
            sill:false, ac:false};
  return {frame:'light',
    interior:r<0.28?'blinds':r<0.52?'curtain':'plain', streak:false,
    sill:true, ac:style===1&&r>0.9};
}
// Pure (unit-tested): median street-photo facade tone -> per-channel tint
// for the procedural walls, so unphotographed buildings match the look of
// the Mapillary-referenced ones. Needs >=2 photos; clamped so the city
// never goes cartoonish. 135 = neutral facade luminance.
function facadeRefTint(avgs){
  if(!avgs||avgs.length<2) return null;
  const med=k=>{ const v=avgs.map(a=>a[k]).sort((a,b)=>a-b); return v[v.length>>1]; };
  const cc=v=>clamp(v/135,0.82,1.18);
  return [cc(med(0)),cc(med(1)),cc(med(2))];
}

let pass=0, fail=0;
function check(name,cond,detail){
  if(cond){ pass++; console.log('  ok -', name); }
  else { fail++; console.log('  FAIL -', name, detail||''); }
}

console.log('=== glass towers ===');
check('dark mullion frames, no sills, never an AC unit',
  [0,0.4,0.95].every(r=>{ const d=windowDressing(0,r,true);
    return d.frame==='dark'&&!d.sill&&!d.ac; }));
check('some panes have blinds, most are plain',
  windowDressing(0,0.1,true).interior==='blinds'&&
  windowDressing(0,0.5,true).interior==='plain');
check('reflection streak on the high-roll share',
  windowDressing(0,0.8,true).streak===true&&windowDressing(0,0.3,true).streak===false);

console.log('=== masonry / concrete ===');
check('light frames with sills',
  [1,2].every(s=>{ const d=windowDressing(s,0.6,false);
    return d.frame==='light'&&d.sill; }));
check('interior mix: blinds / curtain / plain by roll',
  windowDressing(1,0.1,false).interior==='blinds'&&
  windowDressing(1,0.4,false).interior==='curtain'&&
  windowDressing(1,0.7,false).interior==='plain');
check('AC units only on masonry, only the top rolls',
  windowDressing(1,0.95,false).ac===true&&
  windowDressing(2,0.95,false).ac===false&&
  windowDressing(1,0.5,false).ac===false);

console.log('=== Mapillary reference tint ===');
check('needs at least two photos', facadeRefTint([[100,100,100]])===null&&
  facadeRefTint([])===null&&facadeRefTint(null)===null);
check('neutral 135 tone -> unity tint',
  facadeRefTint([[135,135,135],[135,135,135],[135,135,135]])
    .every(v=>Math.abs(v-1)<1e-9));
check('warm street -> warm tint, channel-wise median',
  (()=>{ const t=facadeRefTint([[150,140,120],[145,130,110],[155,150,130]]);
    return t[0]>t[1]&&t[1]>t[2]&&Math.abs(t[0]-150/135)<1e-9; })());
check('clamped to 0.82..1.18 so the city never goes cartoonish',
  (()=>{ const t=facadeRefTint([[20,20,20],[250,250,250],[20,250,20]]);
    return t.every(v=>v>=0.82&&v<=1.18); })());
check('outlier photo cannot drag the median',
  (()=>{ const t=facadeRefTint([[130,130,130],[132,132,132],[255,0,0]]);
    return Math.abs(t[0]-132/135)<1e-9&&Math.abs(t[1]-130/135)<1e-9; })());

console.log(fail===0?'ALL PASS ('+pass+' checks)':'FAIL ('+fail+')');
process.exit(fail===0?0:1);
