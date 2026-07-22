// Unit tests for glass facade families + night pane-flip animation,
// both functions copied verbatim from index.html.
// Run: node test/facade_glow.test.js   (exit 0 = pass)
// Pure (unit-tested): which glass family a glazed building gets -
// 0 cool-blue curtain, 3 emerald, 4 bronze/smoked, 5 silver mirror
// (ribbon glazing). Supertalls skew mirror/blue - the landmark look.
function pickGlassStyle(h,r){
  if(h>100) return r<0.5?5:0;
  if(r<0.30) return 0;
  if(r<0.55) return 3;
  if(r<0.80) return 4;
  return 5;
}
// Pure (unit-tested): k distinct pane indices out of n from a rand stream -
// which panes flick on/off this tick of the night facade animation
function pickPaneFlips(n,k,rand){
  const s=new Set(); k=Math.min(k,n);
  let guard=n*20+20;
  while(s.size<k&&guard-->0) s.add(Math.floor(rand()*n));
  return [...s];
}
// deterministic rand for the tests (same generator family as the app)
function mulberry32(a){ return function(){ a|=0; a=a+0x6D2B79F5|0;
  let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t;
  return ((t^t>>>14)>>>0)/4294967296; }; }

let pass=0, fail=0;
function check(name,cond,detail){
  if(cond){ pass++; console.log('  ok -', name); }
  else { fail++; console.log('  FAIL -', name, detail||''); }
}

console.log('=== glass families ===');
const GLASS=new Set([0,3,4,5]);
check('every roll maps to a glass family',
  [0,0.1,0.31,0.56,0.81,0.99].every(r=>GLASS.has(pickGlassStyle(60,r))));
check('roll bands: blue / emerald / bronze / mirror',
  pickGlassStyle(60,0.1)===0&&pickGlassStyle(60,0.4)===3&&
  pickGlassStyle(60,0.7)===4&&pickGlassStyle(60,0.9)===5);
check('supertalls (>100m) only mirror or blue curtain',
  [0.1,0.3,0.49,0.51,0.7,0.99].every(r=>[0,5].includes(pickGlassStyle(140,r))));
check('supertall split: mirror below 0.5, blue above',
  pickGlassStyle(140,0.2)===5&&pickGlassStyle(140,0.8)===0);

console.log('=== night pane flips ===');
const rnd=mulberry32(42);
const f=pickPaneFlips(32,5,rnd);
check('returns the requested count', f.length===5);
check('indices are distinct', new Set(f).size===f.length);
check('indices are in range', f.every(i=>i>=0&&i<32&&Number.isInteger(i)));
check('k larger than n clamps to n (all panes, no hang)',
  pickPaneFlips(3,10,mulberry32(7)).sort().join()==='0,1,2');
check('n=0 yields no flips', pickPaneFlips(0,4,mulberry32(9)).length===0);
check('deterministic for a given stream',
  pickPaneFlips(32,5,mulberry32(42)).join()===pickPaneFlips(32,5,mulberry32(42)).join());

console.log(fail===0?'ALL PASS ('+pass+' checks)':'FAIL ('+fail+')');
process.exit(fail===0?0:1);
