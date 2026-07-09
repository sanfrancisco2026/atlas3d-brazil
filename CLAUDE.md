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
4. Building heights are extrapolated from OSM tags (`estimateHeight`) when
   explicit height/levels data is absent, using a typology table + deterministic
   per-building jitter (`mulberry32` seeded PRNG keyed on OSM id).
5. Three.js extrudes footprints, applies satellite-projected roof UVs + procedural
   emissive facade textures, and renders with bloom/ACES tone mapping.
6. Routing uses public OSRM; geocoding uses public Nominatim.

## Credentials

No required API keys. All backing services are free/public:
- OpenStreetMap Nominatim (geocoding) — public, rate-limited, no key.
- Overpass API (several public mirrors, see `OVERPASS` array in the module script).
- Esri ArcGIS World_Imagery tiles — public, no key.
- OSRM public router — no key.
- **Mapillary access token** — optional, user-supplied at runtime via the
  "Mapillary token" password input in the UI (for real street-photo facades).
  Never hardcode a token in source; it's a per-session runtime input only.

## Standing rules (for the /loop working on this repo)

- Ship exactly ONE improvement per iteration, fully working end-to-end (no
  half-finished features left in the tree).
- Alternate each iteration between:
  - **(A) UX polish** — visual/interaction refinement of the existing panel,
    loader, HUD, stats, etc.
  - **(B) Differentiator feature** — something that meaningfully extends what
    the app can do (e.g. adding new preset Goiás municipalities, offline-first
    fallback UX, export/share of a built scene, etc. — the Brazil + Goiás
    dataset merge described above is already done)
- This is a static app: keep it dependency-free and buildless unless a change
  genuinely requires tooling — prefer plain JS/CSS/HTML additions.
- The two `atlas_local_*.js` files are large (28MB / 5.6MB) generated data
  extracts, not hand-edited source — treat them as read-only data unless a task
  is specifically about reshaping the dataset format.
- Update this file's Architecture/Credentials sections whenever an iteration
  changes how the app is structured or what it depends on.
