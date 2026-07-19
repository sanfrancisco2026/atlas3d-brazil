// Unit test for the crime-layer helpers, copied verbatim from index.html.
// Run: node test/crime_layer.test.js   (exit 0 = pass)
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function crimeRadius(total,max){
  return clamp(6+22*Math.sqrt(total/Math.max(1,max)),6,28);
}
function crimePopup(m){
  const top=(m.top||[]).map(([g,n])=>`${g}: ${n}`).join('<br>');
  const yrs=Object.keys(m.years||{}).sort().join(', ');
  return `<b>${m.name}</b><br>${m.total} record${m.total===1?'':'s'} in sample`+
    (top?`<hr style="margin:4px 0">${top}`:'')+
    (yrs?`<br><i>years: ${yrs}</i>`:'');
}

let pass=0, fail=0;
function check(name,cond,detail){
  if(cond){ pass++; console.log('  ok -', name); }
  else { fail++; console.log('  FAIL -', name, detail||''); }
}

console.log('=== crimeRadius ===');
check('largest municipality hits the 28px cap', crimeRadius(500,500)===28);
check('small counts stay readable (>=6px floor)', crimeRadius(1,500)>=6);
check('monotonic in count', crimeRadius(50,500)<crimeRadius(200,500));
check('sqrt scale compresses the top',
  (crimeRadius(400,500)-crimeRadius(100,500)) < (crimeRadius(100,500)-crimeRadius(1,500))*3);
check('zero max guarded', crimeRadius(0,0)===6);

console.log('=== crimePopup ===');
const P=crimePopup({name:'Palmas',total:371,
  top:[['FURTO',120],['LESAO CORPORAL',80]],years:{'2020':300,'2021':71}});
check('name and total present', P.includes('Palmas')&&P.includes('371 records'));
check('top groups listed', P.includes('FURTO: 120')&&P.includes('LESAO CORPORAL: 80'));
check('years sorted and shown', P.includes('years: 2020, 2021'));
check('singular form for one record', crimePopup({name:'X',total:1}).includes('1 record in sample'));
check('missing top/years degrade cleanly',
  !crimePopup({name:'X',total:2}).includes('<hr')&&!crimePopup({name:'X',total:2}).includes('years:'));

console.log(fail===0?'ALL PASS ('+pass+' checks)':'FAIL ('+fail+')');
process.exit(fail===0?0:1);
