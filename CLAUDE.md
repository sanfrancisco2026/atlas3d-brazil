# ATLAS-3D — Brazil / Goiás Atlas Explorer

Static, single-page, no-build-step web app. Everything lives in `index.html` plus
two offline data files. There is no server, no package.json, no bundler — open
`index.html` directly or serve the folder with any static file server.

## Architecture

- `index.html` — the entire app: CSS, UI panel, and the module `<script type="module">`
  at the bottom containing all logic (map picking, OSM fetch, satellite tiling,
  height extrapolation, Three.js scene construction, animation loop).
- `atlas_local_brazil.js` — offline Geofabrik Brazil-wide extract (ODbL), assigns
  `window.ATLAS_LOCAL = {source, areas: [...]}` (53 named areas across all of
  Brazil, including 17 Goiás-state municipalities).
- `atlas_local_goias.js` — offline Geofabrik centro-oeste/Goiás extract, same
  shape, covering those same 17 Goiás-area names as a dedicated regional source.
- Both scripts are `defer`red and loaded in a fixed order, with two small inline
  `<script defer>` snippets in between/after them in `index.html`'s `<head>`
  that snapshot `window.ATLAS_LOCAL` after the Brazil script runs (into
  `window.ATLAS_LOCAL_BRAZIL`), then, once the Goiás script runs and overwrites
  `window.ATLAS_LOCAL`, merge the two: Goiás's 17 areas take precedence (by
  name), and every other Brazil-wide area is concatenated in as fallback
  coverage. Relative execution order of deferred classic scripts matches
  document order, so this merge is guaranteed to run after both datasets have
  loaded and before the `type="module"` script (also implicitly deferred) that
  calls `localOSM()`.

### Data flow
1. User searches (Nominatim) or clicks the 2D Leaflet map to pick a capture zone.
2. On "Build": try `localOSM()` (offline dataset lookup by bounding box) first,
   fall back to live Overpass API mirrors (`fetchOSM`) if no local area matches.
3. Satellite imagery is stitched from Esri World_Imagery tiles directly into a
   canvas (CORS-safe, no proxy).
4. Building heights come from OSM tags when present (`estimateHeight` →
   `tagged:true` for explicit `height`/`building:levels`). When absent, a
   typology table + deterministic per-building jitter (`mulberry32` seeded on
   OSM id) gives a first guess, which is then **refined by shadow
   photogrammetry** (see below) when the satellite imagery supports it.
5. `buildBuildings` runs in two passes: pass 1 computes each footprint's
   geometry/centroid/area/typology-height into a `prepared[]` array; then
   `buildShadowModel` self-calibrates a shadow model against the OSM-tagged
   buildings (ground-control points) — searching 16 azimuths for the one whose
   measured shadow lengths best correlate with known heights, then taking
   `k = tan(sunElevation) = median(height/shadowLength)`. Pass 2 extrudes,
   nudging each *untagged* building's height toward `shadowLength * k`
   (blended by measurement confidence, outliers rejected). It degrades
   silently to the plain typology guess when there's no imagery, too few
   control points (<6), or weak correlation (<0.4) — so it is strictly
   non-regressive. Core is unit-tested by `test/shadow_height.test.js` (run
   `node test/shadow_height.test.js`; a synthetic luminance field with known
   truth — asserts calibration recovers azimuth+elevation and refinement
   lowers height MAE; exit 0 = pass).
6. Three.js extrudes footprints, applies satellite-projected roof UVs + procedural
   emissive facade textures, and renders with bloom/ACES tone mapping.
7. Optional Mapillary street photos retexture the 40 tallest facades
   (`applyObliqueFacades`, needs a user-supplied token). Photo selection is
   orientation-aware (`scoreFacadePhoto`, pure + unit-tested): a photo
   qualifies only if the camera is 3–140 m away, its compass bearing shows it
   was aimed at the building (>75° off-axis is hard-disqualified), and it sits
   near the normal of the building's dominant facade plane (`facadeAz` on
   `mesh.userData`, from the longest footprint edge, computed in
   `buildBuildings`). Panoramas get fixed view credit; a reuse penalty spreads
   photos across buildings. Each applied photo is then cross-referenced
   against the satellite mosaic (`photoSatTint`): sky-dominated shots are
   rejected, and the facade material is colour-corrected toward the mosaic's
   tones (clamped per-channel ratio) so photo walls match the scene's
   lighting; a CORS-tainted canvas degrades to applying the photo untinted.
   Tested by `test/facade_match.test.js` (14 geometry checks; exit 0 = pass).
8. Routing uses public OSRM; geocoding uses public Nominatim.
10. Traffic is a five-class fleet (cars/motos/vans/buses/trucks — multi-box
   bodies + cylinder wheels in a second dark material group, per-instance
   paint, heavy vehicles on major roads only) with right-hand lane discipline
   via `laneOffset` (pure, tested in `test/traffic_lane.test.js`).
10b. Named roads get flat street-name labels on the road surface
   (`buildRoadLabels`; `dedupeRoadNames`/`labelYaw` pure, tested in
   `test/road_labels.test.js`). Offline builds fetch names via a light async
   Overpass query since the Geofabrik extracts lack the name field.
10c. 3D navigation: +/- zoom buttons and keys (`dollyZoom`), WASD/arrow
   flight with R/F altitude (`updateNav`), double-click fly-to on the ground.
11. Air quality: `applyAirQuality` uses OpenAQ v3 (optional user key input
   `#aqKey`) or falls back to `estimatePM25` (pure, tested) derived from road
   density + industrial footprint collected during build. PM2.5 drives smog
   fog tint/density, exhaust haze over major roads, and animated smoke plumes
   from industrial buildings (`buildPollutionFX`/`updatePollution`). The HUD
   stat is colour-coded by EPA-style health band (`aqBand`, pure, tested)
   with the band + data source in its tooltip.
12. Night: `buildStreetLamps` renders instanced lamps from OSM
   `highway=street_lamp` nodes (now part of the main Overpass query) or,
   offline/unmapped, derives them from the road network (`lampPositions`,
   pure, tested in `test/street_lamps.test.js`). `fetchNightLights` samples
   NASA GIBS VIIRS Black Marble (public, no key) to calibrate `nightCalib`,
   which scales lamp brightness and the warm window glow. `refreshEnvironment`
   builds a PMREM environment from the procedural sky so glass-variant towers
   (h>55, or >38 with probability) get real glazed reflections when no photo
   data is available; regenerated when the time slider is released.
13. Weather (`applyWeatherMode`): live Open-Meteo conditions animate the scene
   (rain particles via `buildRain`/`updateRain`, wind steering smoke + rain
   drift, cloud cover flattening light/turbidity in `applyAtmosphere`); month
   mode aggregates the ERA5 archive 1980→last year (`monthAggregate`, pure)
   into a monthly pattern, and the simulation-year slider replays observed
   years or extrapolates by `linearTrend` (pure) past the archive. Tested in
   `test/weather_trend.test.js`.
14. 2D-map overlays: time machine (`gibsUrl`, pure) overlays dated NASA MODIS
   true-color imagery (2000→, date picker + opacity, maxNativeZoom 9); live
   radar toggle animates the last 8 RainViewer frames (`nextFrame`, pure).
   Tested in `test/map_overlays.test.js`.
15. Export: `exportPostcard` re-renders at up to 2x (`fitExportScale`, pure,
   tested) and composites a caption bar (place name from `geoCtx.placeName`,
   clock, OSM/Esri attribution) into a downloaded PNG; `exportGLB` sends the
   built scene (ground, buildings, roads, trees, lamps — not transient
   traffic) through three's GLTFExporter as a binary .glb. Filenames via
   `slugify` (pure, tested in `test/export_utils.test.js`).
9. In the 3D view, clicking a building (outside route mode) opens an inspect
   card (`selectBuilding`/`hideBldCard`): height, estimated floors, footprint
   area, and height provenance — colour-coded OSM z-tag / shadow-measured /
   typology estimate, from `mesh.userData.src`. ESC or clicking empty ground
   closes it; hidden synthetic infill is excluded from picking.

## Credentials

No required API keys. All backing services are free/public:
- OpenStreetMap Nominatim (geocoding) — public, rate-limited, no key.
- Overpass API (several public mirrors, see `OVERPASS` array in the module script).
- Esri ArcGIS World_Imagery tiles — public, no key.
- OSRM public router — no key.
- NASA GIBS (VIIRS Black Marble night-lights + dated MODIS true-color
  tiles for the time machine) — public, no key.
- Open-Meteo (current weather + ERA5 archive back to 1980) — public, no key.
- RainViewer (live precipitation radar frames) — public, no key.
- **Mapillary access token** — optional, user-supplied at runtime via the
  "Mapillary token" password input in the UI (for real street-photo facades).
  Never hardcode a token in source; it's a per-session runtime input only.
- **OpenAQ API key** — optional, user-supplied at runtime via the "OpenAQ key"
  password input (live PM2.5 from explore.openaq.org). Same rule: never
  hardcode; without it the app estimates air quality from OSM-derived road
  density + industrial footprint.

## Standing rules (for the /loop working on this repo)

- Ship exactly ONE improvement per iteration, fully working end-to-end (no
  half-finished features left in the tree).
- Alternate each iteration between:
  - **(A) UX polish** — visual/interaction refinement of the existing panel,
    loader, HUD, stats, etc.
  - **(B) Differentiator feature** — something that meaningfully extends what
    the app can do. Done so far: Brazil + Goiás dataset merge; shadow-based
    height estimation; orientation-aware Mapillary facades with satellite
    cross-referencing; realistic traffic; OpenAQ pollution; night realism;
    postcard + GLB export. Open candidates: new preset Goiás municipalities;
    offline-first fallback UX; colour-coded AQ health bands.
- This is a static app: keep it dependency-free and buildless unless a change
  genuinely requires tooling — prefer plain JS/CSS/HTML additions.
- The two `atlas_local_*.js` files are large (28MB / 5.6MB) generated data
  extracts, not hand-edited source — treat them as read-only data unless a task
  is specifically about reshaping the dataset format.
- Update this file's Architecture/Credentials sections whenever an iteration
  changes how the app is structured or what it depends on.
