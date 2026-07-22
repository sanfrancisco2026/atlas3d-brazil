// Unit test for the architecture-aligned facade UV grid, functions copied
// verbatim from index.html.
// Run: node test/facade_uv.test.js   (exit 0 = pass)
// Real-world facade module: ~3.6m window bay, ~3.0m floor height.
const WINDOW_W=3.6, FLOOR_H=3.0;
function windowCols(len){ return Math.max(1,Math.round(len/WINDOW_W)); }
function floorRows(hEff){ return Math.max(1,Math.round(hEff/FLOOR_H)); }

let pass=0, fail=0;
function check(name,cond,detail){
  if(cond){ pass++; console.log('  ok -', name); }
  else { fail++; console.log('  FAIL -', name, detail||''); }
}

console.log('=== whole window bays per wall ===');
check('18m wall -> 5 bays (3.6m module)', windowCols(18)===5);
check('exact module multiples map exactly', windowCols(3.6)===1&&windowCols(36)===10);
check('tiny wall still gets one bay', windowCols(0.8)===1);
check('in-between lengths round to the nearest whole bay',
  windowCols(5.3)===1&&windowCols(5.5)===2);

console.log('=== whole floors per height ===');
check('30m building -> 10 floors', floorRows(30)===10);
check('low shed -> one floor', floorRows(2)===1);
check('75m tower -> 25 floors', floorRows(75)===25);

console.log('=== alignment invariants (why corners and parapets line up) ===');
// texture tile = 4 bays wide x 8 rows tall. A wall edge spans u = bays/4:
// u*4 is an integer, so the edge ALWAYS ends on a mullion line -> the
// next wall starts clean at the corner, never mid-window.
check('every wall width lands on a mullion boundary',
  [2,7.3,11,18.05,44.4,120].every(L=>Number.isInteger(windowCols(L))));
// v at the parapet = rows/8: integer rows -> the top row is never cut.
check('every height lands on a row boundary',
  [3,7,12.4,55,203].every(h=>Number.isInteger(floorRows(h))));
check('implied floor height stays near 3m for realistic buildings',
  [9,24,45,90].every(h=>{ const fh=h/floorRows(h); return fh>2.5&&fh<3.6; }));

console.log(fail===0?'ALL PASS ('+pass+' checks)':'FAIL ('+fail+')');
process.exit(fail===0?0:1);
