# Earth Map — Frontend

Interactive 3D earth globe (Three.js via [globe.gl](https://github.com/vasturiano/globe.gl)),
navigated by clicking rather than by hunting for a zoom level:

| You are looking at | Click the earth | Click a shape | Click empty space |
|---|---|---|---|
| **Globe** — textured earth, no borders | dive to the country map, centred where you clicked | — | — |
| **Countries** — world borders (Natural Earth 110m) | nothing (that's ocean) | focus that country | back to the globe |
| **Detail** — one country's subdivisions | back to the country map | nothing | back to the country map |

Scrolling still works and stays in sync: zooming out steps back down the ladder
(with hysteresis, so the view doesn't flicker at a boundary), while zooming in
never jumps into the detail view on its own — that always needs a country pick.

Borders are drawn faint enough to read as part of the globe; **hover** is what
picks a shape out, highlighting it and showing its name. In the detail view the
focused country's neighbours are dropped entirely, so only its subdivisions are
drawn. Vietnam is the one country with subdivision data (its 34 post-merger
provinces/cities from the 2025 administrative reform); every other country
shows its national outline alone.

## Terrain

The globe starts on a 4k NASA Blue Marble texture and swaps in an 8k copy once
you leave the far view — the higher resolution only pays off close up, and it's
~4.7 MB. Textures get the renderer's maximum anisotropic filtering (without it
the surface smears into mip blur wherever the globe curves away), the sphere is
tessellated finely enough that the horizon has no visible facets, and a GEBCO
elevation bump map provides relief shading. See
[`public/textures/README.md`](public/textures/README.md).

## Develop

    pnpm install
    pnpm dev        # http://localhost:5173

In dev builds only, `window.__globe` (the globe.gl instance) and `window.__nav()`
(current band + selected country) are exposed for debugging; both are stripped
from production builds.

## Test & build

    pnpm test       # Vitest unit tests
    pnpm build      # production build in dist/
    pnpm preview    # serve the production build

## Structure

| File | Responsibility |
|---|---|
| `src/main.ts` | Bootstrap, state wiring, camera moves, polygon refresh, WebGL fallback |
| `src/navigation.ts` | Pure state machine: click/zoom events → band + selected country |
| `src/zoomLevels.ts` | Altitude thresholds and zoom-driven band changes |
| `src/layers.ts` | Band + selection → polygon dataset; hit-testing a click |
| `src/styles.ts` | Polygon fill/border colours per band and hover state |
| `src/globe.ts` | globe.gl setup: textures, texture quality, tessellation |
| `src/interactions.ts` | Pointer handling: hover, click vs. drag, on/off the globe |
| `src/geo.ts` | Bounds, centroid, point-in-polygon, fly-to altitude |
| `src/data.ts` | Lazy, cached GeoJSON loading |

## Data

Static GeoJSON and texture assets live in `public/`. See
[`public/data/README.md`](public/data/README.md) for sources, licenses, and the
regeneration pipeline — including the **ring winding** requirement, which the
globe's polygon triangulation depends on.
