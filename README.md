# Earth Map

An interactive 3D earth globe you navigate **by clicking**, not by hunting for the
right zoom level. Start on a textured NASA Blue Marble sphere, click to dive into
world borders, click a country to focus it, then keep drilling — for Vietnam, all
the way down to its 34 post-2025-reform provinces and their 3,321 wards, over
streamed satellite imagery.

Built with [Three.js](https://threejs.org) via
[globe.gl](https://github.com/vasturiano/globe.gl), TypeScript and Vite. No
backend, no API keys — everything is static assets.

## Features

- **Click-to-drill navigation.** Four bands — globe → countries → one country's
  provinces → one province's wards — each entered by clicking a shape and left by
  clicking empty space.
- **Scroll stays in sync.** Zooming out steps back down the ladder with
  hysteresis, so the view never flickers at a band boundary; zooming in never
  drills in on its own.
- **Borders that read as part of the earth.** Faint outlines by default; hover is
  what picks a shape out, highlighting it and naming it. The focused shape gets a
  glowing border rebuilt from its subdivisions' dissolved outer edge, so it sits
  exactly on them.
- **Terrain that sharpens as you descend.** A 4k Blue Marble texture upgrades to
  8k once you leave the far view, with maximum anisotropic filtering and GEBCO
  bump-mapped relief; from the province band down, three-globe's tile engine
  streams Esri World Imagery at a zoom level picked from the camera altitude.
- **Vietnam in full detail.** The 34 provinces/municipalities after the 1 July
  2025 administrative merger, and every phường / xã / đặc khu within them.
- **Pure state machine at the core.** Navigation, zoom bands, layer selection and
  styling are side-effect-free modules with unit tests; rendering is wired on top.

## Getting started

Requires [Node.js](https://nodejs.org) 20.19+ or 22.12+ (Vite's floor) and
[pnpm](https://pnpm.io).

```sh
git clone https://github.com/HuyNguyen260398/earth-map.git
cd earth-map/frontend
pnpm install
pnpm dev          # http://localhost:5173
```

That's the whole setup — the GeoJSON and texture assets are committed under
`frontend/public/`, so there is nothing to download or configure.

### Other commands

Run these from `frontend/`:

| Command | What it does |
|---|---|
| `pnpm dev` | Vite dev server with HMR |
| `pnpm test` | Vitest unit tests |
| `pnpm build` | Type-check, then production build into `dist/` |
| `pnpm preview` | Serve the production build |

> [!TIP]
> In dev builds only, `window.__globe` (the globe.gl instance) and `window.__nav()`
> (current band plus selected country/province) are exposed for poking at from the
> console. Both are stripped from production builds.

## How navigation works

| You are looking at | Click the earth | Click a shape | Click empty space |
|---|---|---|---|
| **Globe** — textured earth, no borders | dive to the country map, centred where you clicked | — | — |
| **Countries** — world borders | nothing (that's ocean) | focus that country | back to the globe |
| **Detail** — one country's provinces | back to the country map | drill into that province | back to the country map |
| **Ward** — one province's wards | back to the province map | nothing | back to the province map |

Every country shows its national outline; Vietnam is the one with subdivision
data, so it is the country you can drill through to ward level.

## Repository layout

```
earth-map/
├── frontend/          # the app — Vite + TypeScript + globe.gl
│   ├── src/           # navigation state machine, layers, styling, globe setup
│   ├── public/data/   # countries, Vietnam provinces, per-province wards (GeoJSON)
│   ├── public/textures/
│   └── scripts/       # one-off data preparation pipelines
└── docs/              # design spec and implementation plan
```

`frontend/README.md` documents each source module and what it owns.

## Data and attribution

All map and texture assets ship with the repo; provenance, licenses and the
regeneration pipelines are documented next to them:

- [`frontend/public/data/README.md`](frontend/public/data/README.md) — Natural
  Earth countries, Vietnam provinces (attribution: Nguyen Duy Liem), ward
  boundaries, plus the **ring winding** requirement the globe's polygon
  triangulation depends on.
- [`frontend/public/textures/README.md`](frontend/public/textures/README.md) —
  NASA Blue Marble and GEBCO elevation imagery.

> [!IMPORTANT]
> Satellite tiles come from Esri World Imagery, which requires the on-screen
> imagery credit shown while the tiles are active. Swapping in another XYZ
> provider (Mapbox Satellite, etc.) is a one-line change in
> `frontend/src/globe.ts` — mind that provider's terms and attribution too.

## Documentation

- [Design spec](docs/superpowers/specs/2026-07-22-earth-globe-design.md) — what the
  app is meant to do and why.
- [Implementation plan](docs/superpowers/plans/2026-07-22-globe-frontend.md) — how
  it was built, phase by phase.
- [Frontend README](frontend/README.md) — module-level tour, terrain details,
  development notes.
