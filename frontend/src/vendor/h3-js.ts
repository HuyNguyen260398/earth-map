// Stand-in for `h3-js`, Uber's hexagonal grid library, aliased in
// vite.config.ts.
//
// three-globe uses it for its two hex layers — `hexBinPointsData` and
// `hexPolygonsData` — and nothing else. This globe draws polygons, paths and
// satellite tiles, so the real package is 534 kB of Emscripten-compiled source,
// the largest single item in the vendor chunk, for code that never runs.
//
// Every call site sits inside those layers' data pipelines, so the stub only
// throws if a hex layer is actually given data.

import { stubbedOut } from './stub';

export const latLngToCell = (): never => stubbedOut('h3-js', 'latLngToCell');
export const cellToLatLng = (): never => stubbedOut('h3-js', 'cellToLatLng');
export const cellToBoundary = (): never => stubbedOut('h3-js', 'cellToBoundary');
export const polygonToCells = (): never => stubbedOut('h3-js', 'polygonToCells');
