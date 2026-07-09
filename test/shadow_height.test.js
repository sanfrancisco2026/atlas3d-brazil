// Unit test for the shadow-height engine's pure core, copied verbatim from
// index.html, driven by a synthetic satellite-luminance field with known truth.
const M_LAT = 111132.92;
const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
const lerp = (a,b,t)=>a+(b-a)*t;
let geoCtx = { mPerLon: M_LAT*Math.cos(-16.68*Math.PI/180) };
let satData = null; // unused; we inject lum

// ---- functions copied from index.html ----
function _median(a){ if(!a.length) return NaN; const s=a.slice().sort((x,y)=>x-y);
  const m=s.length>>1; return s.length%2?s[m]:(s[m-1]+s[m])/2; }
function _pearson(xs,ys){ const n=xs.length; if(n<3) return 0;
  let sx=0,sy=0,sxx=0,syy=0,sxy=0;
  for(let i=0;i<n;i++){ const x=xs[i],y=ys[i]; sx+=x;sy+=y;sxx+=x*x;syy+=y*y;sxy+=x*y; }
  const cov=n*sxy-sx*sy, dx=n*sxx-sx*sx, dy=n*syy-sy*sy;
  const den=Math.sqrt(dx*dy); return den>1e-9?cov/den:0; }
function measureShadow(sLat,sLon,radiusM,az,lum){
  lum=lum||null;
  const cA=Math.cos(az), sA=Math.sin(az), mPerLon=geoCtx.mPerLon;
  const step=2, start=radiusM+3, maxM=150;
  const refs=[];
  for(let s=start;s<start+16;s+=4){
    const r=lum(sLat-(cA*s)/M_LAT, sLon-(sA*s)/mPerLon);
    if(!isNaN(r)) refs.push(r);
  }
  const ref=_median(refs); if(isNaN(ref)) return {len:0,contrast:0};
  const thr=Math.min(ref*0.62,105);
  let len=0, darkSum=0, darkN=0, bright=0;
  for(let s=start;s<maxM;s+=step){
    const l=lum(sLat+(cA*s)/M_LAT, sLon+(sA*s)/mPerLon);
    if(isNaN(l)) break;
    if(l<thr){ len=s-start+step; darkSum+=l; darkN++; bright=0; }
    else if(++bright>=2) break;
  }
  const meanDark=darkN?darkSum/darkN:ref;
  return {len:Math.max(0,len), contrast:ref>1?clamp((ref-meanDark)/ref,0,1):0};
}
function buildShadowModel(prepared,lum){
  let control=prepared.filter(p=>p.tagged&&p.knownH>4);
  if(control.length<6) return null;
  control=control.slice().sort((a,b)=>b.area-a.area).slice(0,120);
  const AZN=16;
  let bestAz=null,bestCorr=0,bestPairs=null;
  for(let i=0;i<AZN;i++){
    const az=i/AZN*Math.PI*2, H=[],L=[];
    for(const p of control){
      const m=measureShadow(p.sLat,p.sLon,p.radius,az,lum);
      if(m.len>2){ H.push(p.knownH); L.push(m.len); }
    }
    if(L.length<Math.max(5,control.length*0.4)) continue;
    const corr=_pearson(L,H);
    if(corr>bestCorr){ bestCorr=corr; bestAz=az; bestPairs={H,L}; }
  }
  if(bestAz===null||bestCorr<0.4) return null;
  const ratios=bestPairs.H.map((h,i)=>h/bestPairs.L[i]).filter(r=>r>0.2&&r<8);
  const k=_median(ratios);
  if(!(k>0.1&&k<8)) return null;
  return { az:bestAz, k, corr:bestCorr, n:ratios.length,
           elevDeg:Math.atan(k)*180/Math.PI, lum };
}

// ---- deterministic PRNG for reproducible test ----
let _s=12345; function rnd(){ _s=(_s*1103515245+12345)&0x7fffffff; return _s/0x7fffffff; }

// ---- synthetic truth ----
const AZ_TRUE = 3/16*Math.PI*2;         // one of the 16 bins (~67.5 deg)
const K_TRUE = Math.tan(48*Math.PI/180); // sun elevation 48 deg
const cAt=Math.cos(AZ_TRUE), sAt=Math.sin(AZ_TRUE);
const cLat=-16.68, cLon=-49.25, mPerLon=geoCtx.mPerLon;

// area-based typology guess, matching estimateHeight()'s unknown-type path
function typologyGuess(area){ return area>3000?17:area>900?13:area>250?9:6; }
const buildings=[];
for(let i=0;i<32;i++){
  const blat=cLat+(rnd()-0.5)*0.005, blon=cLon+(rnd()-0.5)*0.005;
  const area=60+rnd()*4200; const R=Math.sqrt(area/Math.PI);
  const guess=typologyGuess(area);
  // true height scattered 0.6x..1.9x around the typology guess: correlated with
  // footprint (so the guess is partly right) but with real per-building variance
  // that only the shadow can resolve. Stays inside the 0.35..3.2x safety clamp.
  const H=clamp(guess*(0.6+1.3*rnd()),3,650);
  const SL=H/K_TRUE;                     // shadow length from edge
  const tagged=i%5!==0;                  // ~80% carry OSM height (control pts)
  buildings.push({blat,blon,H,area,R,SL,tagged,guess});
}
// decoy dark blobs (trees/water) that are NOT building shadows
const decoys=[];
for(let i=0;i<15;i++) decoys.push({lat:cLat+(rnd()-0.5)*0.005, lon:cLon+(rnd()-0.5)*0.005, r:8+rnd()*10});

function lum(lat,lon){
  const noise=(rnd()-0.5)*22;
  // inside any building's shadow corridor?
  for(const b of buildings){
    const dN=(lat-b.blat)*M_LAT, dE=(lon-b.blon)*mPerLon;
    const along=dN*cAt+dE*sAt, perp=-dN*sAt+dE*cAt;
    if(along>=b.R-1 && along<=b.R+b.SL && Math.abs(perp)<b.R*0.85+3) return 38+noise;
  }
  for(const d of decoys){
    const dN=(lat-d.lat)*M_LAT, dE=(lon-d.lon)*mPerLon;
    if(dN*dN+dE*dE < d.r*d.r) return 45+noise;
  }
  return 172+noise; // lit ground
}

const prepared=buildings.map(b=>({
  sLat:b.blat, sLon:b.blon, radius:b.R, area:b.area,
  tagged:b.tagged, knownH:b.tagged?b.H:0,
  typologyH:b.guess, // realistic area-based guess for untagged (the "before")
  trueH:b.H
}));

const model=buildShadowModel(prepared,lum);
console.log('=== calibration ===');
if(!model){ console.log('MODEL NULL (unexpected)'); process.exit(1); }
console.log('true az bin :', 3, ' recovered az bin:', Math.round(model.az/(2*Math.PI)*16));
console.log('true elev   : 48 deg   recovered:', model.elevDeg.toFixed(1)+' deg');
console.log('corr:', model.corr.toFixed(3), ' control pts:', model.n);

// apply to untagged (mirror of index.html apply loop)
let refined=0; const before=[], after=[], truth=[];
for(const p of prepared){
  if(p.tagged) continue;
  truth.push(p.trueH); before.push(p.typologyH);
  const m=measureShadow(p.sLat,p.sLon,p.radius,model.az,model.lum);
  let finalH=p.typologyH;
  if(m.len>4 && m.contrast>=0.18){
    const hShadow=clamp(m.len*model.k,3,650);
    if(hShadow>=p.typologyH*0.35 && hShadow<=p.typologyH*3.2){
      finalH=lerp(p.typologyH,hShadow,clamp(m.contrast*model.corr,0,0.85));
      refined++;
    }
  }
  after.push(finalH);
}
const mae=(a,t)=>a.reduce((s,v,i)=>s+Math.abs(v-t[i]),0)/a.length;
const maeBefore=mae(before,truth), maeAfter=mae(after,truth);
console.log('=== untagged refinement ===');
console.log('untagged buildings:', truth.length, ' shadow-refined:', refined);
console.log('MAE typology vs truth:', maeBefore.toFixed(2)+' m');
console.log('MAE refined  vs truth:', maeAfter.toFixed(2)+' m  (should be lower)');
console.log('corr(typology vs truth):', _pearson(before,truth).toFixed(3));
console.log('corr(refined  vs truth):', _pearson(after,truth).toFixed(3));

// sanity assertions
const azOk = Math.abs(model.az-AZ_TRUE) < (2*Math.PI/16)*1.5;
const elevOk = Math.abs(model.elevDeg-48) < 14;
const improved = maeAfter < maeBefore*0.9;   // shadow cuts height error >=10%
console.log('=== assertions ===');
console.log('azimuth recovered within ~1 bin :', azOk);
console.log('elevation within +/-14 deg      :', elevOk);
console.log('refinement lowered height error  :', improved);
console.log(azOk && elevOk && improved ? 'ALL PASS' : 'FAIL');
process.exit(azOk && elevOk && improved ? 0 : 1);
