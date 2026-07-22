# Earth Map — Frontend

Interactive 3D earth globe (Three.js via [globe.gl](https://github.com/vasturiano/globe.gl)).
Camera altitude drives three levels of detail:

1. **Globe** (altitude > 1.8) — textured earth, no borders.
2. **Countries** (≤ 1.8) — world country borders (Natural Earth 110m).
3. **Detail** (≤ 0.6) — Vietnam's 34 post-merger provinces/cities (2025
   administrative reform); other countries keep their national borders.

Band thresholds use hysteresis (separate enter/exit altitudes) so the view does
not flicker at a boundary. Hovering a country or province highlights it and
shows its name; clicking a country flies the camera to it, which lands in the
detail band.

## Develop

    pnpm install
    pnpm dev        # http://localhost:5173

In dev builds only, the globe instance is exposed as `window.__globe` for
debugging (reading `pointOfView()`, swapping `polygonsData()`); it is stripped
from production builds.

## Test & build

    pnpm test       # Vitest unit tests (zoom bands, layer selection, geometry)
    pnpm build      # production build in dist/
    pnpm preview    # serve the production build

## Structure

| File | Responsibility |
|---|---|
| `src/main.ts` | Bootstrap, band state, polygon refresh, WebGL fallback |
| `src/globe.ts` | globe.gl instance configuration (textures, polygon styling) |
| `src/zoomLevels.ts` | Pure altitude → band classification with hysteresis |
| `src/layers.ts` | Band → polygon dataset (swaps Vietnam for its provinces) |
| `src/interactions.ts` | Hover highlight, name tooltips, click-to-fly |
| `src/geo.ts` | Bounding-box centroid for fly-to targets |
| `src/data.ts` | Lazy, cached GeoJSON loading |

## Data

Static GeoJSON and texture assets live in `public/`. See
[`public/data/README.md`](public/data/README.md) for sources, licenses, and the
regeneration pipeline — including the **ring winding** requirement, which the
globe's polygon triangulation depends on.
