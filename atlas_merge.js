// Merges the offline datasets into window.ATLAS_LOCAL.
// MUST be an external deferred script loaded after the dataset files:
// `defer` is ignored on inline scripts, so an inline merge would run at
// parse time before any dataset exists (that bug shipped once already).
// Each dataset file publishes its own global (a one-line shim at the end
// of the generated file), so ordering between them no longer matters:
//   atlas_local_brazil.js       -> window.ATLAS_LOCAL_BRAZIL
//   atlas_local_goias.js        -> window.ATLAS_LOCAL_GOIAS
//   atlas_local_southafrica.js  -> window.ATLAS_LOCAL_SA
// Precedence: Goiás beats Brazil-wide for the 17 shared area names (it is
// the more specific regional extract); South Africa concatenates (its
// names never collide).
(function(){
  var brazil=window.ATLAS_LOCAL_BRAZIL, goias=window.ATLAS_LOCAL_GOIAS,
      sa=window.ATLAS_LOCAL_SA;
  var merged=null;
  if(goias&&brazil){
    var goiasNames=new Set(goias.areas.map(function(a){ return a.name; }));
    merged={
      source: goias.source+' + '+brazil.source,
      areas: goias.areas.concat(brazil.areas.filter(function(a){ return !goiasNames.has(a.name); }))
    };
  }else merged=goias||brazil||null;
  if(sa){
    if(merged){ merged.areas=merged.areas.concat(sa.areas);
                merged.source+=' + '+sa.source; }
    else merged=sa;
  }
  if(merged) window.ATLAS_LOCAL=merged;
})();
