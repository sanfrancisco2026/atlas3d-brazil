// Unit tests for the tile-based level-of-detail system, pure functions
// copied verbatim from index.html.
// Run: node test/lod.test.js   (exit 0 = pass)
function lodTileIndex(x,z,halfW,halfH,nT){
  const tx=Math.min(nT-1,Math.max(0,Math.floor((x+halfW)/(2*halfW/nT))));
  const tz=Math.min(nT-1,Math.max(0,Math.floor((z+halfH)/(2*halfH/nT))));
  return tz*nT+tx;
}
function lodModeFor(dist,near,hyst,isFar){
  return isFar ? dist>=near-hyst : dist>near+hyst;
}
function sliceGroupArrays(groups,attrs,matIndex){
  const ranges=groups.filter(g=>g.materialIndex===matIndex);
  const total=ranges.reduce((s,g)=>s+g.count,0);
  const out={};
  for(const name of Object.keys(attrs)){
    const src=attrs[name], it=src.itemSize, arr=new Float32Array(total*it);
    let o=0;
    for(const g of ranges){
      arr.set(src.array.subarray(g.start*it,(g.start+g.count)*it),o);
      o+=g.count*it;
    }
    out[name]=arr;
  }
  return out;
}

let pass=0, fail=0;
function check(name,cond,detail){
  if(cond){ pass++; console.log('  ok -', name); }
  else { fail++; console.log('  FAIL -', name, detail||''); }
}

console.log('=== lodTileIndex: scene partition ===');
// 600x400 scene (halfW=300, halfH=200), 6x6 grid -> tiles 100m x ~66.7m
check('scene center falls in a middle tile',
  lodTileIndex(0,0,300,200,6)===21);          // tx=3, tz=3
check('NW corner is tile 0', lodTileIndex(-300,-200,300,200,6)===0);
check('SE corner clamps to the last tile', lodTileIndex(300,200,300,200,6)===35);
check('points beyond the scene edge clamp instead of indexing out of range',
  lodTileIndex(-9999,9999,300,200,6)===30&&    // tx=0, tz=5
  lodTileIndex(9999,-9999,300,200,6)===5);
check('x advances tiles within a row, z advances rows',
  lodTileIndex(-250,-180,300,200,6)===0&&
  lodTileIndex(-150,-180,300,200,6)===1&&
  lodTileIndex(-250,-100,300,200,6)===6);
{
  // every tile of a 6x6 sweep is hit exactly once by its own center
  const seen=new Set();
  for(let tz=0;tz<6;tz++) for(let tx=0;tx<6;tx++)
    seen.add(lodTileIndex(-300+(tx+0.5)*100,-200+(tz+0.5)*400/6,300,200,6));
  check('tile centers map bijectively onto 36 indices', seen.size===36);
}

console.log('=== lodModeFor: hysteresis ===');
check('well inside the near radius -> full detail', lodModeFor(100,380,45,true)===false);
check('well beyond the near radius -> merged', lodModeFor(800,380,45,false)===true);
check('a near tile only demotes past near+hyst',
  lodModeFor(400,380,45,false)===false&&lodModeFor(426,380,45,false)===true);
check('a far tile only promotes below near-hyst',
  lodModeFor(360,380,45,true)===true&&lodModeFor(334,380,45,true)===false);
check('the boundary band is sticky both ways (no flicker at 380m)',
  lodModeFor(380,380,45,false)===false&&lodModeFor(380,380,45,true)===true);

console.log('=== sliceGroupArrays: material-group extraction ===');
{
  // two triangles of material 0 (roof), one of material 1 (wall), one
  // more of material 0 - non-contiguous groups must both be copied
  const groups=[{start:0,count:3,materialIndex:0},
                {start:3,count:3,materialIndex:1},
                {start:6,count:3,materialIndex:0}];
  const position={itemSize:3,array:new Float32Array(
    [0,0,0, 1,0,0, 0,0,1,   9,9,9, 8,8,8, 7,7,7,   2,0,2, 3,0,2, 2,0,3])};
  const uv={itemSize:2,array:new Float32Array(
    [0,0, .1,0, 0,.1,  .9,.9, .8,.8, .7,.7,  .2,.2, .3,.2, .2,.3])};
  const roof=sliceGroupArrays(groups,{position,uv},0);
  const wall=sliceGroupArrays(groups,{position,uv},1);
  check('roof slice concatenates BOTH roof groups (6 verts)',
    roof.position.length===18&&roof.uv.length===12);
  check('wall slice holds exactly the wall triangle',
    wall.position.length===9&&wall.position[0]===9&&wall.position[8]===7);
  check('roof slice preserves vertex order across the gap',
    // uv compares within float32 rounding (Float32Array can't hold .2 exactly)
    roof.position[0]===0&&roof.position[9]===2&&Math.abs(roof.uv[6]-.2)<1e-6);
  check('itemSize is honoured per attribute (3 for position, 2 for uv)',
    roof.uv.length/roof.position.length===2/3);
  check('empty selection yields empty arrays, not a crash',
    sliceGroupArrays(groups,{position},9).position.length===0);
}

console.log(fail===0?'ALL PASS ('+pass+' checks)':'FAIL ('+fail+')');
process.exit(fail===0?0:1);
