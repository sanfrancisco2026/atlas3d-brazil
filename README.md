# ATLAS-3D — Any Place on Earth, in Immersive 3D

A **single-file, buildless** web app that reconstructs any neighbourhood as an
immersive 3D city — OpenStreetMap footprints extruded over Esri satellite
imagery, with live weather, traffic, night lights and official Brazilian
geodata layers. No build step, no framework, no server-side code: one
`index.html` plus precomputed offline data bundles.

## Quick start

```
npx serve -l 5183 .
```

Open <http://localhost:5183>, pick a preset (Goiânia, São Paulo, Johannesburg,
Cape Town…) or drop the golden frame anywhere on the map, and hit
**Build Immersive 3D**. (Serving the folder avoids `file://` CORS quirks with
the module script.)

## What it does

- **3D reconstruction** — OSM building footprints extruded with real heights
  (OSM tags → São Paulo PMSP LiDAR → satellite shadow-length model →
  typology), Microsoft ML footprints filling OSM gaps, procedural facade
  families (4 glazed-glass + masonry + concrete) with architecture-aligned
  window grids and animated night windows.
- **Pixel-true rooftops** — every roof shows exactly the vertical satellite
  image over its footprint; mosaic geo-registration is verified sub-pixel by
  built-in audit hooks (`__atlasGeoCheck`, `__atlasRoofPixelCheck`).
- **Living streets** — mixed GLB vehicle fleet (cars/motos/vans/buses/semis)
  driving a real road-network graph with junction continuity, lane discipline
  clamped to carriageway width, and edge-portal entry/exit.
- **Time, weather, night** — full day/night cycle, Open-Meteo live weather +
  monthly climatology, climate-trend simulation slider, RainViewer radar,
  NASA GIBS historic imagery, VIIRS-calibrated night lights.
- **Official geodata** — IBGE municipal mesh (outline-only boundary layer
  with name/population details), BDIA geoscience info, census-sector
  cadastral lines, crime sample layer, OSM/OpenInfraMap infrastructure
  planner layers (simulated fallbacks are always badged).
- **Analysis** — routing that follows the OSRM polyline exactly, greedy
  set-cover cell-tower planner with per-tower siting justification, rooftop
  solar potential, carbon-credit scenarios, pollution/AQ effects.
- **Export** — postcard PNG and GLB scene export.

## Offline datasets

The app builds its preset cities without hitting the live Overpass API:

- `atlas_local_brazil.js` / `atlas_local_goias.js` /
  `atlas_local_southafrica.js` — OSM extracts, merged at load time by
  `atlas_merge.js` (Goiás areas take precedence).
- `atlas_ibge_mesh.js` (5,570 municipal boundaries), `atlas_ibge_geosci.js`,
  `atlas_crime_data.js`, `atlas_cadastral.js` (195k census-sector segments),
  `atlas_ms_buildings.js` (86k gap-fill footprints), `atlas_lidar_sp.js`
  (São Paulo 4m height grids).
- `models/` — decimated GLB vehicle fleet.

Anywhere outside the preset areas, data is fetched live from keyless public
APIs.

## Hardware awareness

The renderer classifies the GPU (high / medium / low) and budgets pixels,
shadows, bloom, rain and traffic accordingly — it runs on integrated
graphics (verified 50–60 fps on Intel Iris Xe at the medium tier).

## Tests

Every non-trivial algorithm is a pure function copied verbatim into a Node
test suite — 28 suites, zero dependencies:

```
for f in test/*.test.js; do node "$f"; done
```

## Data sources & credits

| Source | Use |
|---|---|
| © OpenStreetMap contributors (ODbL) | footprints, roads, POIs, infrastructure |
| Esri World Imagery | satellite mosaic (ground + rooftops) |
| IBGE (servicodados / malhas / BDIA) | municipality data, boundaries, geoscience |
| Microsoft Building Footprints (ODbL) | gap-fill building polygons |
| PMSP LiDAR 2017 (AWS Open Data) | São Paulo measured heights |
| Open-Meteo, RainViewer, NASA GIBS | weather, radar, historic/night imagery |
| OSRM, Nominatim | routing, geocoding |
| Mapillary (optional token) | street-photo facades + reference tints |
| crimebrasil.com.br (sample) | crime layer |
| Vivekkk-1/3D-Models (BSL-1.0) + user GLBs | vehicle models |

See [CLAUDE.md](CLAUDE.md) for architecture notes, data flow, and standing
rules for ongoing work on this app.
