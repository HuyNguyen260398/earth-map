# MIT License

Copyright (c) 2026 Huy Nguyen

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---

## Third-party data and assets

The license above covers the source code in this repository. The map data,
imagery and third-party libraries it bundles are **not** covered by it and carry
their own terms. Provenance for every committed asset is documented in
[`frontend/public/data/README.md`](frontend/public/data/README.md) and
[`frontend/public/textures/README.md`](frontend/public/textures/README.md);
in summary:

| Asset | Source | Terms |
|---|---|---|
| `countries.geojson` | Natural Earth 1:110m Admin 0 | Public domain |
| `vietnam-34-provinces.geojson` | [Free-GIS-Data](https://github.com/nguyenduy1133/Free-GIS-Data) | Free for public use; attribution: **Nguyen Duy Liem** |
| `wards/*.geojson` | [vietnamese-provinces-database](https://github.com/thanglequoc/vietnamese-provinces-database) | Per upstream repository; derived from the official Vietnam Administrative Units Reference Map |
| `earth-day-*.jpg`, `earth-topology-4k.jpg` | NASA Blue Marble Next Generation / NASA–GEBCO elevation | Public domain |
| `night-sky.png` | [three-globe](https://github.com/vasturiano/three-globe) examples | MIT (three-globe) |

Satellite tiles are fetched at runtime from **Esri World Imagery** and are not
redistributed here. Their use is subject to Esri's terms, including the on-screen
imagery credit the app displays while the tiles are active.

Runtime and build dependencies (three.js, globe.gl, polygon-clipping, Vite,
TypeScript, Vitest, mapshaper, …) are licensed by their respective authors; see
`frontend/pnpm-lock.yaml` and each package's own license.
