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
  window grids and animated night windows. Remaining unmapped buildings are
  not invented: their roofs are **detected in the satellite image** (colour
  palette learned from the zone's real mapped roofs), each region's border
  traced and simplified, and extruded at the neighbourhood's median height.
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
- **Municipal layer loader** — drop in a **geo360 / iCad export** (or any
  GeoJSON file, URL, or token-protected endpoint you have access to) and
  it is placed on the 3D satellite base, geo-registered and clipped to
  the selected area. Lat/long and **UTM-22S (SIRGAS 2000)** are detected
  and converted automatically — verified to 0.1 mm against known ground
  truth. ATLAS-3D never scrapes authenticated portals; you bring the
  data you have rights to.
- **Analysis** — routing that follows the OSRM polyline exactly, greedy
  set-cover cell-tower planner with per-tower siting justification, rooftop
  solar potential, carbon-credit scenarios, pollution/AQ effects.
- **GIS analysis suite** — click-to-measure distance and area in the scene;
  sun-hours shadow analysis (2.5D building-shadow march heatmap over the
  whole zone, sub-second); interactive flood-rise slider (% area and
  buildings affected on the SRTM terrain grid); walk-time isochrones
  (click a point - streets colour by 5/10/15-minute walking bands via
  Dijkstra over the walkable street graph incl. T-junctions, with
  buildings-reachable counts); shareable permalinks that restore
  location, capture radius and time of day from the URL.
- **Export** — postcard PNG, GLB scene export, and **CityJSON 1.1** LoD1
  building solids with height-provenance attributes (CityGML-family
  interchange, opens in ninja/QGIS-CityJSON tooling).

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
