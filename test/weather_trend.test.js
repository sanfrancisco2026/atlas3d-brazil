// Unit test for the weather climatology + trend core, copied verbatim from index.html.
// Run: node test/weather_trend.test.js   (exit 0 = pass)
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function monthAggregate(times,temps,precips,month){
  const by={};
  for(let i=0;i<times.length;i++){
    const y=+times[i].slice(0,4), m=+times[i].slice(5,7);
    if(m!==month) continue;
    const t=temps[i], p=precips[i];
    if(t==null||p==null) continue;
    (by[y]=by[y]||{year:y,tSum:0,pSum:0,n:0,wet:0});
    by[y].tSum+=t; by[y].pSum+=p; by[y].n++; if(p>=1) by[y].wet++;
  }
  return Object.values(by).filter(r=>r.n>=20)
    .map(r=>({year:r.year,tempMean:r.tSum/r.n,precipSum:r.pSum,wetFrac:r.wet/r.n}))
    .sort((a,b)=>a.year-b.year);
}
function linearTrend(pairs){
  const n=pairs.length; if(n<3) return null;
  let sx=0,sy=0,sxx=0,sxy=0;
  for(const [x,y] of pairs){ sx+=x; sy+=y; sxx+=x*x; sxy+=x*y; }
  const den=n*sxx-sx*sx; if(Math.abs(den)<1e-9) return null;
  const slope=(n*sxy-sx*sy)/den, intercept=(sy-slope*sx)/n;
  return {slope,intercept,predict:x=>slope*x+intercept};
}
function rainIntensity(precipMm){ return clamp(precipMm/12,0,1); }

let pass=0, fail=0;
function check(name,cond,detail){
  if(cond){ pass++; console.log('  ok -', name); }
  else { fail++; console.log('  FAIL -', name, detail||''); }
}

// ---- synthetic ERA5-style archive: 1990-1999, warming +0.05C/yr in January
let seed=99; const rnd=()=>{ seed=(seed*1103515245+12345)&0x7fffffff; return seed/0x7fffffff; };
const times=[], temps=[], precips=[];
for(let y=1990;y<=1999;y++)
  for(let m=1;m<=12;m++)
    for(let d=1;d<=28;d++){
      times.push(`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`);
      temps.push(24+(y-1990)*0.05+(m===7?-3:0)+(rnd()-0.5)*1.2);   // trend + season + noise
      precips.push(m<=3?(rnd()<0.5?rnd()*18:0):(rnd()<0.08?rnd()*4:0)); // wet summer
    }

console.log('=== monthAggregate ===');
const jan=monthAggregate(times,temps,precips,1);
check('one row per year', jan.length===10, 'got '+jan.length);
check('years sorted ascending', jan.every((r,i)=>!i||r.year>jan[i-1].year));
check('January temps near 24C baseline', Math.abs(jan[0].tempMean-24)<1);
const jul=monthAggregate(times,temps,precips,7);
check('July is ~3C cooler (seasonality preserved)', jan[5].tempMean-jul[5].tempMean>2);
check('wet season detected (Jan wetter than Jul)', jan[5].wetFrac>jul[5].wetFrac);
check('null-safe: missing values skipped',
  monthAggregate(['1990-01-01'],[null],[2],1).length===0);
check('partial months rejected (<20 days)',
  monthAggregate(['1990-01-01','1990-01-02'],[24,24],[0,0],1).length===0);

console.log('=== linearTrend ===');
const tr=linearTrend(jan.map(r=>[r.year,r.tempMean]));
console.log('   recovered slope:', (tr.slope).toFixed(4), 'C/yr (true 0.05)');
check('slope recovered within tolerance', Math.abs(tr.slope-0.05)<0.03);
check('prediction extrapolates linearly',
  Math.abs(tr.predict(2010)-(tr.slope*2010+tr.intercept))<1e-9);
check('degenerate inputs return null', linearTrend([[1,1],[2,2]])===null&&
  linearTrend([[5,1],[5,2],[5,3]])===null);

console.log('=== rainIntensity ===');
check('dry = 0', rainIntensity(0)===0);
check('12mm/day saturates at 1', rainIntensity(12)===1&&rainIntensity(50)===1);
check('monotonic', rainIntensity(3)<rainIntensity(6));

console.log(fail===0?'ALL PASS ('+pass+' checks)':'FAIL ('+fail+')');
process.exit(fail===0?0:1);
