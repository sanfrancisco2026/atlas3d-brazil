# ATLAS-3D — Brazil / Goiás Atlas Explorer

Immersive 3D reconstruction of any place on Earth from OpenStreetMap footprints
and satellite imagery, with offline datasets for Brazil and Goiás so it can
build cities without hitting the live Overpass API.

## Run it

No build step. Just serve the folder and open it:

```
npx serve .
```

or open `index.html` directly in a browser (a local static server avoids any
`file://` CORS quirks with the module script).

## Files

- `index.html` — the whole app (UI, 2D picker map, Three.js 3D engine).
- `atlas_local_brazil.js` — offline Brazil-wide OSM extract.
- `atlas_local_goias.js` — offline Goiás/centro-oeste OSM extract, merged with
  the Brazil-wide dataset at load time (Goiás areas take precedence — see
  [CLAUDE.md](CLAUDE.md)).
- `atlas_local_southafrica.js` — offline South Africa OSM extract (18 city
  areas), concatenated into the same merged dataset at load time.

See [CLAUDE.md](CLAUDE.md) for architecture notes, data flow, and standing
rules for ongoing work on this app.
