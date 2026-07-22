# Earth Globe Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A local Vite + TypeScript single-page app showing a 3D earth globe (globe.gl) with three zoom bands: textured globe → country borders → Vietnam's 34 post-merger provinces.

**Architecture:** One full-screen globe.gl canvas. Camera altitude (from globe.gl's `onZoom`) is classified into bands (`globe` / `countries` / `detail`) with hysteresis; each band swaps the data of a single polygons layer. All GeoJSON and textures are static files under `frontend/public/` — no runtime network dependency beyond the app's own origin.

**Tech Stack:** Vite (vanilla-ts template), TypeScript (strict), globe.gl ^2.34 (bundles Three.js), Vitest, pnpm.

**Spec:** `docs/superpowers/specs/2026-07-22-earth-globe-design.md`. Phase 2 (AWS S3+CloudFront, Terraform, GitHub Actions) is a separate plan written after this one ships.

## Global Constraints

- Node.js 20.x or newer, pnpm 9.x or newer. (Executed against Node 26.5.0 / pnpm 11.15.1, which scaffolds Vite 8 + TypeScript 6 + Vitest 4.)
- No UI framework (no React/Next) — vanilla TypeScript only.
- All assets (textures, GeoJSON) served from the app's own origin; no CDN URLs at runtime.
- `vietnam-34-provinces.geojson` must contain exactly **34** features; provenance and attribution recorded in `frontend/public/data/README.md` (source: https://github.com/nguyenduy1133/Free-GIS-Data, attribution "Nguyen Duy Liem").
- Vietnam is identified in the countries dataset by `properties.ISO_A3 === 'VNM'`.
- Prepared province features have properties exactly `{ name: string, level: 'province' }`.
- Zoom band thresholds (camera altitude, globe-radius units; default view ≈ 2.5): countries enter ≤ 1.8, exit ≥ 2.0; detail enter ≤ 0.6, exit ≥ 0.75.
- Keep `frontend/public/data/vietnam-34-provinces.geojson` under ~3 MB (simplify with mapshaper).
- Working directory for all `pnpm` commands: `/Users/huyng/ws/earth-map/frontend` unless stated otherwise.
- **Commit per task:** every task ends with exactly one commit. Before committing, mark all of that task's steps as done (`- [x]`) in this plan file and include the plan file in the commit, so each commit records both the change and the plan progress.

---

### Task 1: Scaffold the Vite + TypeScript app

**Files:**
- Create: `frontend/` (via Vite scaffold: `package.json`, `tsconfig.json`, `index.html`, `src/`, `.gitignore`)
- Create: `frontend/src/style.css` (replace template content)
- Modify: `frontend/index.html`, `frontend/package.json`
- Delete: `frontend/src/counter.ts`, `frontend/src/assets/`, `frontend/public/favicon.svg`, `frontend/public/icons.svg` (exact leftovers vary by Vite template version — list `src/` and `public/` first)

**Interfaces:**
- Consumes: nothing (first task).
- Produces: a building, testable app shell. `index.html` contains `<div id="app"></div>`; `pnpm dev`, `pnpm build`, `pnpm test` all work. Later tasks put source in `frontend/src/` and assets in `frontend/public/`.

- [x] **Step 1: Scaffold the project**

```bash
cd /Users/huyng/ws/earth-map
pnpm create vite frontend --template vanilla-ts
cd frontend
pnpm install
pnpm add globe.gl
pnpm add -D vitest @types/geojson
```

- [x] **Step 2: Replace the template shell**

Replace `frontend/index.html` with:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Earth Map</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

Replace `frontend/src/style.css` with:

```css
html,
body,
#app {
  margin: 0;
  height: 100%;
  overflow: hidden;
  background: #000;
}

.fallback {
  color: #fff;
  font-family: system-ui, sans-serif;
  text-align: center;
  padding-top: 40vh;
}

.toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(200, 40, 40, 0.9);
  color: #fff;
  font-family: system-ui, sans-serif;
  font-size: 14px;
  padding: 10px 16px;
  border-radius: 6px;
  z-index: 10;
}
```

Replace `frontend/src/main.ts` with a minimal placeholder (real wiring comes in Task 4):

```ts
import './style.css';

document.querySelector<HTMLDivElement>('#app')!.textContent = 'Earth Map';
```

Delete the template leftovers:

```bash
rm -rf frontend/src/counter.ts frontend/src/assets frontend/public/favicon.svg frontend/public/icons.svg
```

- [x] **Step 3: Add the test script**

In `frontend/package.json`, add to `"scripts"`:

```json
"test": "vitest run"
```

- [x] **Step 4: Verify dev server, build, and test runner**

```bash
cd /Users/huyng/ws/earth-map/frontend
pnpm build        # Expected: "vite build" completes, dist/ created
pnpm test         # Expected: "No test files found" exit code 0 — pass with --passWithNoTests if needed:
```

If `pnpm test` fails on "no test files", change the script to `"test": "vitest run --passWithNoTests"`.

Then run `pnpm dev`, open http://localhost:5173, and confirm a black page showing "Earth Map". Stop the server.

- [x] **Step 5: Commit (task done)**

Mark all Task 1 steps `- [x]` in `docs/superpowers/plans/2026-07-22-globe-frontend.md`, then:

```bash
cd /Users/huyng/ws/earth-map
git add frontend docs/superpowers/plans/2026-07-22-globe-frontend.md
git commit -m "feat: scaffold Vite + TypeScript frontend shell"
```

---

### Task 2: Acquire and prepare static assets (textures + GeoJSON)

**Files:**
- Create: `frontend/public/textures/earth-blue-marble.jpg`, `frontend/public/textures/earth-topology.png`, `frontend/public/textures/night-sky.png`
- Create: `frontend/public/data/countries.geojson`
- Create: `frontend/public/data/vietnam-34-provinces.geojson`
- Create: `frontend/public/data/README.md`
- Create: `frontend/scripts/prepare-provinces.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces: static asset paths used by later tasks — `/textures/earth-blue-marble.jpg`, `/textures/earth-topology.png`, `/textures/night-sky.png`, `/data/countries.geojson` (Natural Earth 110m; features carry `properties.ADMIN`, `properties.ISO_A3`), `/data/vietnam-34-provinces.geojson` (34 features; `properties = { name, level: 'province' }`).

- [x] **Step 1: Download globe textures**

```bash
cd /Users/huyng/ws/earth-map/frontend
mkdir -p public/textures public/data scripts
curl -fL -o public/textures/earth-blue-marble.jpg https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg
curl -fL -o public/textures/earth-topology.png   https://unpkg.com/three-globe/example/img/earth-topology.png
curl -fL -o public/textures/night-sky.png        https://unpkg.com/three-globe/example/img/night-sky.png
ls -la public/textures   # Expected: three non-empty files
```

- [x] **Step 2: Download world countries GeoJSON (Natural Earth 110m)**

```bash
curl -fL -o public/data/countries.geojson \
  https://raw.githubusercontent.com/vasturiano/globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson
```

If that URL 404s, use the Natural Earth mirror instead:

```bash
curl -fL -o public/data/countries.geojson \
  https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson
```

Verify it parses and Vietnam is present with the expected properties:

```bash
node -e "
const fc = JSON.parse(require('fs').readFileSync('public/data/countries.geojson', 'utf8'));
const vn = fc.features.find(f => f.properties.ISO_A3 === 'VNM');
console.log('features:', fc.features.length, '| vietnam:', vn && vn.properties.ADMIN);
"
```

Expected: `features: 177 | vietnam: Vietnam` (feature count may vary slightly by dataset version; `vietnam: Vietnam` must appear).

- [x] **Step 3: Clone the Vietnam provinces source and locate the file**

```bash
CLONE_DIR=$(mktemp -d)
git clone --depth 1 https://github.com/nguyenduy1133/Free-GIS-Data "$CLONE_DIR/Free-GIS-Data"
SRC=$(find "$CLONE_DIR/Free-GIS-Data" -name "Provinces.geojson" -path "*Post-2025*" | head -1)
echo "$SRC"   # Expected: a path inside the "Vietnam Administrative Divisions (Post-2025)..." directory
```

- [x] **Step 4: Simplify with mapshaper to a reasonable size**

```bash
npx -y mapshaper "$SRC" -simplify 8% keep-shapes -o precision=0.0001 format=geojson public/data/provinces-raw.geojson
ls -la public/data/provinces-raw.geojson   # Expected: well under 3 MB; if larger, re-run with -simplify 4%
```

- [x] **Step 5: Inspect the source property names**

```bash
node -e "
const fc = JSON.parse(require('fs').readFileSync('public/data/provinces-raw.geojson', 'utf8'));
console.log('features:', fc.features.length);
console.log('properties of first feature:', fc.features[0].properties);
"
```

Expected: `features: 34` and a properties object containing the province name under some key (likely Vietnamese, e.g. `ten_tinh`, `TenTinh`, or `Name`). Note the exact key holding the Vietnamese province name — it is the `<NAME_KEY>` argument in the next step.

- [x] **Step 6: Write and run the normalization script**

> **Executed note:** the source name key is `TinhThanh`, and the upstream file
> has a data bug — it labels the Mekong Delta unit as a second "Lạng Sơn",
> leaving `Đồng Tháp` missing. The delivered script therefore also applies a
> latitude-keyed correction (a "Lạng Sơn" centred below 15°N is `Đồng Tháp`)
> and validates the output against the official 34-unit name list, exiting
> non-zero on duplicates, missing, or unexpected units. See
> `frontend/public/data/README.md`. The skeleton below is the pre-correction
> version; the committed script is the authority.

Create `frontend/scripts/prepare-provinces.mjs`:

```js
// Normalizes a raw provinces GeoJSON so every feature has properties
// exactly { name, level: 'province' }.
// Usage: node scripts/prepare-provinces.mjs <in.geojson> <out.geojson> <NAME_KEY>
import { readFileSync, writeFileSync } from 'node:fs';

const [inFile, outFile, nameKey] = process.argv.slice(2);
if (!inFile || !outFile || !nameKey) {
  console.error('Usage: node scripts/prepare-provinces.mjs <in.geojson> <out.geojson> <NAME_KEY>');
  process.exit(1);
}

const fc = JSON.parse(readFileSync(inFile, 'utf8'));
const features = fc.features.map((f) => {
  const name = f.properties?.[nameKey];
  if (!name) throw new Error(`Feature missing name key "${nameKey}": ${JSON.stringify(f.properties)}`);
  return { type: 'Feature', geometry: f.geometry, properties: { name, level: 'province' } };
});

writeFileSync(outFile, JSON.stringify({ type: 'FeatureCollection', features }));
console.log(`Wrote ${features.length} features to ${outFile}`);
console.log(features.map((f) => f.properties.name).join(', '));
```

Run it with the key found in Step 5:

```bash
node scripts/prepare-provinces.mjs public/data/provinces-raw.geojson public/data/vietnam-34-provinces.geojson <NAME_KEY>
rm public/data/provinces-raw.geojson
```

Expected: `Wrote 34 features to public/data/vietnam-34-provinces.geojson` followed by 34 Vietnamese province/city names (e.g. Hà Nội, Thành phố Hồ Chí Minh, Đà Nẵng, …).

- [x] **Step 7: Record provenance**

Create `frontend/public/data/README.md`:

```markdown
# Map data provenance

## countries.geojson
- Natural Earth 1:110m Admin 0 — Countries (public domain).
- Downloaded via the globe.gl example datasets mirror.
- Features carry Natural Earth properties; the app reads `ADMIN` (name) and `ISO_A3`.

## vietnam-34-provinces.geojson
- Boundaries of Vietnam's 34 provinces/municipalities after the 1 July 2025
  administrative merger, including the Hoàng Sa (Paracel) and Trường Sa
  (Spratly) archipelagos.
- Source: https://github.com/nguyenduy1133/Free-GIS-Data
  ("Vietnam Administrative Divisions (Post-2025)" / `Provinces.geojson`).
- Provided free of charge for public use; attribution: **Nguyen Duy Liem**.
- Processing: simplified with mapshaper (`-simplify 8% keep-shapes`,
  coordinate precision 0.0001), then properties normalized to
  `{ name, level: 'province' }` by `frontend/scripts/prepare-provinces.mjs`.
```

- [x] **Step 8: Commit (task done)**

Mark all Task 2 steps `- [x]` in `docs/superpowers/plans/2026-07-22-globe-frontend.md`, then:

```bash
cd /Users/huyng/ws/earth-map
git add frontend/public frontend/scripts docs/superpowers/plans/2026-07-22-globe-frontend.md
git commit -m "feat: add globe textures and countries/Vietnam-provinces GeoJSON assets"
```

---

### Task 3: Zoom band classification (`zoomLevels.ts`) — TDD

**Files:**
- Create: `frontend/src/zoomLevels.ts`
- Test: `frontend/src/zoomLevels.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `type ZoomBand = 'globe' | 'countries' | 'detail'` and `nextBand(current: ZoomBand, altitude: number): ZoomBand`. Exported threshold constants `COUNTRIES_ENTER = 1.8`, `COUNTRIES_EXIT = 2.0`, `DETAIL_ENTER = 0.6`, `DETAIL_EXIT = 0.75`.

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/zoomLevels.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { nextBand } from './zoomLevels';

describe('nextBand', () => {
  it('stays in globe band at default altitude', () => {
    expect(nextBand('globe', 2.5)).toBe('globe');
  });

  it('enters countries band when zooming in past 1.8', () => {
    expect(nextBand('globe', 1.79)).toBe('countries');
  });

  it('enters detail band when zooming in past 0.6', () => {
    expect(nextBand('countries', 0.59)).toBe('detail');
    expect(nextBand('globe', 0.59)).toBe('detail'); // fast zoom skips a band
  });

  it('applies hysteresis between globe and countries', () => {
    // 1.9 is between enter (1.8) and exit (2.0): current band wins
    expect(nextBand('globe', 1.9)).toBe('globe');
    expect(nextBand('countries', 1.9)).toBe('countries');
    // leaving countries requires altitude >= 2.0
    expect(nextBand('countries', 2.0)).toBe('globe');
  });

  it('applies hysteresis between countries and detail', () => {
    // 0.7 is between enter (0.6) and exit (0.75): current band wins
    expect(nextBand('countries', 0.7)).toBe('countries');
    expect(nextBand('detail', 0.7)).toBe('detail');
    // leaving detail requires altitude >= 0.75
    expect(nextBand('detail', 0.75)).toBe('countries');
  });

  it('jumps from detail straight to globe when zooming far out', () => {
    expect(nextBand('detail', 2.5)).toBe('globe');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/huyng/ws/earth-map/frontend
pnpm test
```

Expected: FAIL — `Cannot find module './zoomLevels'` (or equivalent resolution error).

- [ ] **Step 3: Implement `zoomLevels.ts`**

Create `frontend/src/zoomLevels.ts`:

```ts
export type ZoomBand = 'globe' | 'countries' | 'detail';

// Camera altitude thresholds in globe-radius units (default view ≈ 2.5).
// Enter/exit differ (hysteresis) so the view doesn't flicker at a boundary.
export const COUNTRIES_ENTER = 1.8;
export const COUNTRIES_EXIT = 2.0;
export const DETAIL_ENTER = 0.6;
export const DETAIL_EXIT = 0.75;

export function nextBand(current: ZoomBand, altitude: number): ZoomBand {
  switch (current) {
    case 'globe':
      if (altitude <= DETAIL_ENTER) return 'detail';
      if (altitude <= COUNTRIES_ENTER) return 'countries';
      return 'globe';
    case 'countries':
      if (altitude <= DETAIL_ENTER) return 'detail';
      if (altitude >= COUNTRIES_EXIT) return 'globe';
      return 'countries';
    case 'detail':
      if (altitude >= COUNTRIES_EXIT) return 'globe';
      if (altitude >= DETAIL_EXIT) return 'countries';
      return 'detail';
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm test
```

Expected: PASS — 6 tests passing.

- [ ] **Step 5: Commit (task done)**

Mark all Task 3 steps `- [x]` in `docs/superpowers/plans/2026-07-22-globe-frontend.md`, then:

```bash
cd /Users/huyng/ws/earth-map
git add frontend/src/zoomLevels.ts frontend/src/zoomLevels.test.ts docs/superpowers/plans/2026-07-22-globe-frontend.md
git commit -m "feat: add zoom band classification with hysteresis"
```

---

### Task 4: Polygon dataset selection (`layers.ts`) — TDD

**Files:**
- Create: `frontend/src/layers.ts`
- Test: `frontend/src/layers.test.ts`

**Interfaces:**
- Consumes: `ZoomBand` from `./zoomLevels` (Task 3).
- Produces: `VIETNAM_ISO_A3 = 'VNM'`; `featureName(f: Feature): string`; `buildPolygons(band: ZoomBand, countries: FeatureCollection | null, provinces: FeatureCollection | null): Feature[]`.

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/layers.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import { buildPolygons, featureName } from './layers';

const geometry: Geometry = { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] };

function country(admin: string, iso: string): Feature {
  return { type: 'Feature', geometry, properties: { ADMIN: admin, ISO_A3: iso } };
}

function province(name: string): Feature {
  return { type: 'Feature', geometry, properties: { name, level: 'province' } };
}

const countries: FeatureCollection = {
  type: 'FeatureCollection',
  features: [country('Vietnam', 'VNM'), country('Thailand', 'THA'), country('France', 'FRA')],
};

const provinces: FeatureCollection = {
  type: 'FeatureCollection',
  features: [province('Hà Nội'), province('Đà Nẵng')],
};

describe('buildPolygons', () => {
  it('returns no polygons at globe band', () => {
    expect(buildPolygons('globe', countries, provinces)).toEqual([]);
  });

  it('returns all countries at countries band', () => {
    expect(buildPolygons('countries', countries, provinces)).toHaveLength(3);
  });

  it('replaces Vietnam with its provinces at detail band', () => {
    const result = buildPolygons('detail', countries, provinces);
    expect(result).toHaveLength(4); // 2 non-VN countries + 2 provinces
    expect(result.some((f) => f.properties?.ISO_A3 === 'VNM')).toBe(false);
    expect(result.filter((f) => f.properties?.level === 'province')).toHaveLength(2);
  });

  it('returns empty when countries not yet loaded', () => {
    expect(buildPolygons('countries', null, provinces)).toEqual([]);
  });

  it('falls back to countries at detail band when provinces not yet loaded', () => {
    expect(buildPolygons('detail', countries, null)).toHaveLength(3);
  });
});

describe('featureName', () => {
  it('reads province name property', () => {
    expect(featureName(province('Hà Nội'))).toBe('Hà Nội');
  });

  it('reads country ADMIN property', () => {
    expect(featureName(country('Vietnam', 'VNM'))).toBe('Vietnam');
  });

  it('returns Unknown for missing properties', () => {
    expect(featureName({ type: 'Feature', geometry, properties: {} })).toBe('Unknown');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/huyng/ws/earth-map/frontend
pnpm test
```

Expected: FAIL — `Cannot find module './layers'`.

- [ ] **Step 3: Implement `layers.ts`**

Create `frontend/src/layers.ts`:

```ts
import type { Feature, FeatureCollection } from 'geojson';
import type { ZoomBand } from './zoomLevels';

export const VIETNAM_ISO_A3 = 'VNM';

export function featureName(f: Feature): string {
  const p = f.properties ?? {};
  return (p.name ?? p.ADMIN ?? p.NAME ?? 'Unknown') as string;
}

export function buildPolygons(
  band: ZoomBand,
  countries: FeatureCollection | null,
  provinces: FeatureCollection | null,
): Feature[] {
  if (band === 'globe' || !countries) return [];
  if (band === 'countries' || !provinces) return countries.features;
  return [
    ...countries.features.filter((f) => f.properties?.ISO_A3 !== VIETNAM_ISO_A3),
    ...provinces.features,
  ];
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm test
```

Expected: PASS — all zoomLevels + layers tests passing (14 total).

- [ ] **Step 5: Commit (task done)**

Mark all Task 4 steps `- [x]` in `docs/superpowers/plans/2026-07-22-globe-frontend.md`, then:

```bash
cd /Users/huyng/ws/earth-map
git add frontend/src/layers.ts frontend/src/layers.test.ts docs/superpowers/plans/2026-07-22-globe-frontend.md
git commit -m "feat: add zoom-band polygon dataset selection"
```

---

### Task 5: Globe rendering and zoom-band wiring (`globe.ts`, `data.ts`, `main.ts`)

**Files:**
- Create: `frontend/src/globe.ts`
- Create: `frontend/src/data.ts`
- Modify: `frontend/src/main.ts` (replace Task 1 placeholder entirely)

**Interfaces:**
- Consumes: `nextBand`, `ZoomBand` (Task 3); `buildPolygons` (Task 4); assets from Task 2.
- Produces: `createGlobe(container: HTMLElement): GlobeInstance` (base styling only — no hover/click; Task 6 layers interactions on top); `loadCountries(): Promise<FeatureCollection>`; `loadProvinces(): Promise<FeatureCollection>`. `main.ts` owns band state and the `refreshPolygons()` loop.

- [ ] **Step 1: Implement `globe.ts`**

Create `frontend/src/globe.ts`:

```ts
import Globe, { type GlobeInstance } from 'globe.gl';

export function createGlobe(container: HTMLElement): GlobeInstance {
  return new Globe(container)
    .globeImageUrl('/textures/earth-blue-marble.jpg')
    .bumpImageUrl('/textures/earth-topology.png')
    .backgroundImageUrl('/textures/night-sky.png')
    .polygonsData([])
    .polygonAltitude(0.006)
    .polygonCapColor(() => 'rgba(60, 120, 220, 0.25)')
    .polygonSideColor(() => 'rgba(0, 0, 0, 0.05)')
    .polygonStrokeColor(() => '#ffffff')
    .polygonsTransitionDuration(200);
}
```

Note: globe.gl ≥ 2.32 supports `new Globe(element)`. If TypeScript rejects the constructor call, use the factory form `Globe()(container)` — same instance either way.

- [ ] **Step 2: Implement `data.ts`**

Create `frontend/src/data.ts`:

```ts
import type { FeatureCollection } from 'geojson';

async function fetchGeoJson(url: string): Promise<FeatureCollection> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}: HTTP ${res.status}`);
  return res.json();
}

let countriesPromise: Promise<FeatureCollection> | null = null;
let provincesPromise: Promise<FeatureCollection> | null = null;

// Cached after first success; a failure clears the cache so the next
// band entry retries the fetch.
export function loadCountries(): Promise<FeatureCollection> {
  countriesPromise ??= fetchGeoJson('/data/countries.geojson').catch((err) => {
    countriesPromise = null;
    throw err;
  });
  return countriesPromise;
}

export function loadProvinces(): Promise<FeatureCollection> {
  provincesPromise ??= fetchGeoJson('/data/vietnam-34-provinces.geojson').catch((err) => {
    provincesPromise = null;
    throw err;
  });
  return provincesPromise;
}
```

- [ ] **Step 3: Wire it together in `main.ts`**

Replace `frontend/src/main.ts` entirely with:

```ts
import './style.css';
import type { FeatureCollection } from 'geojson';
import { createGlobe } from './globe';
import { nextBand, type ZoomBand } from './zoomLevels';
import { buildPolygons } from './layers';
import { loadCountries, loadProvinces } from './data';

function webglSupported(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

function showToast(message: string): void {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 5000);
}

const app = document.querySelector<HTMLDivElement>('#app')!;

if (!webglSupported()) {
  app.innerHTML = '<p class="fallback">This app requires WebGL, which your browser does not support.</p>';
} else {
  const globe = createGlobe(app);

  let band: ZoomBand = 'globe';
  let countries: FeatureCollection | null = null;
  let provinces: FeatureCollection | null = null;

  async function refreshPolygons(): Promise<void> {
    try {
      if (band !== 'globe' && !countries) countries = await loadCountries();
      if (band === 'detail' && !provinces) provinces = await loadProvinces();
    } catch (err) {
      showToast('Failed to load map data — zoom again to retry.');
      console.error(err);
    }
    globe.polygonsData(buildPolygons(band, countries, provinces));
  }

  globe.onZoom(({ altitude }) => {
    const next = nextBand(band, altitude);
    if (next === band) return;
    band = next;
    void refreshPolygons();
  });
}
```

- [ ] **Step 4: Verify types, tests, and build**

```bash
cd /Users/huyng/ws/earth-map/frontend
pnpm test    # Expected: PASS (14 tests, unchanged)
pnpm build   # Expected: tsc + vite build succeed
```

- [ ] **Step 5: Verify manually in the dev server**

Run `pnpm dev`, open http://localhost:5173, and check:

1. Textured earth on a starfield, orbitable by drag, default (far) view shows **no** polygons.
2. Scroll-zoom in: country borders (white strokes, translucent blue fills) appear roughly when the globe fills the viewport.
3. Zoom close over Vietnam: the country polygon is replaced by 34 smaller province polygons.
4. Zoom back out: provinces revert to the national border, then polygons disappear — with no flickering at the transition altitudes.
5. DevTools Network tab: `vietnam-34-provinces.geojson` is fetched only after the first deep zoom (lazy), and only once.

Stop the server.

- [ ] **Step 6: Commit (task done)**

Mark all Task 5 steps `- [x]` in `docs/superpowers/plans/2026-07-22-globe-frontend.md`, then:

```bash
cd /Users/huyng/ws/earth-map
git add frontend/src docs/superpowers/plans/2026-07-22-globe-frontend.md
git commit -m "feat: render textured globe with altitude-driven polygon bands"
```

---

### Task 6: Hover and click interactions (`geo.ts`, `interactions.ts`) — TDD for geometry

**Files:**
- Create: `frontend/src/geo.ts`
- Test: `frontend/src/geo.test.ts`
- Create: `frontend/src/interactions.ts`
- Modify: `frontend/src/main.ts` (one line: attach interactions)

**Interfaces:**
- Consumes: `featureName` (Task 4); `GlobeInstance` created by Task 5's `createGlobe`.
- Produces: `geometryCentroid(geometry: Geometry): { lat: number; lng: number }` (bbox center); `attachInteractions(globe: GlobeInstance): void`; `FLY_ALTITUDE = 0.5`.

- [ ] **Step 1: Write the failing tests for the centroid helper**

Create `frontend/src/geo.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { Geometry } from 'geojson';
import { geometryCentroid } from './geo';

describe('geometryCentroid', () => {
  it('returns the bbox center of a polygon', () => {
    const square: Geometry = {
      type: 'Polygon',
      coordinates: [[[100, 10], [110, 10], [110, 20], [100, 20], [100, 10]]],
    };
    expect(geometryCentroid(square)).toEqual({ lat: 15, lng: 105 });
  });

  it('spans all parts of a MultiPolygon', () => {
    const multi: Geometry = {
      type: 'MultiPolygon',
      coordinates: [
        [[[0, 0], [2, 0], [2, 2], [0, 0]]],
        [[[8, 8], [10, 8], [10, 10], [8, 8]]],
      ],
    };
    expect(geometryCentroid(multi)).toEqual({ lat: 5, lng: 5 });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/huyng/ws/earth-map/frontend
pnpm test
```

Expected: FAIL — `Cannot find module './geo'`.

- [ ] **Step 3: Implement `geo.ts`**

Create `frontend/src/geo.ts`:

```ts
import type { Geometry } from 'geojson';

// Bounding-box center. Good enough for fly-to targets; note it can be off
// for shapes crossing the antimeridian (e.g. Fiji, Russia).
export function geometryCentroid(geometry: Geometry): { lat: number; lng: number } {
  const bbox = { minLng: Infinity, minLat: Infinity, maxLng: -Infinity, maxLat: -Infinity };

  const visit = (coords: unknown): void => {
    if (Array.isArray(coords) && typeof coords[0] === 'number') {
      const [lng, lat] = coords as [number, number];
      bbox.minLng = Math.min(bbox.minLng, lng);
      bbox.maxLng = Math.max(bbox.maxLng, lng);
      bbox.minLat = Math.min(bbox.minLat, lat);
      bbox.maxLat = Math.max(bbox.maxLat, lat);
    } else if (Array.isArray(coords)) {
      for (const c of coords) visit(c);
    }
  };

  visit('coordinates' in geometry ? geometry.coordinates : []);
  return { lat: (bbox.minLat + bbox.maxLat) / 2, lng: (bbox.minLng + bbox.maxLng) / 2 };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm test
```

Expected: PASS — 16 tests.

- [ ] **Step 5: Implement `interactions.ts`**

Create `frontend/src/interactions.ts`:

```ts
import type { GlobeInstance } from 'globe.gl';
import type { Feature } from 'geojson';
import { featureName } from './layers';
import { geometryCentroid } from './geo';

export const FLY_ALTITUDE = 0.5; // inside the detail band (enter ≤ 0.6)
const FLY_MS = 1200;

const BASE_FILL = 'rgba(60, 120, 220, 0.25)';
const HOVER_FILL = 'rgba(255, 200, 0, 0.55)';

export function attachInteractions(globe: GlobeInstance): void {
  let hovered: object | null = null;

  globe
    .polygonLabel((f) => `<b>${featureName(f as Feature)}</b>`)
    .onPolygonHover((f) => {
      hovered = f;
      // Re-assign accessors so globe.gl re-evaluates colors for the new hover state.
      globe
        .polygonCapColor((d) => (d === hovered ? HOVER_FILL : BASE_FILL))
        .polygonStrokeColor((d) => (d === hovered ? '#ffd700' : '#ffffff'));
    })
    .onPolygonClick((f) => {
      const feature = f as Feature;
      if (!feature.geometry) return;
      const { lat, lng } = geometryCentroid(feature.geometry);
      globe.pointOfView({ lat, lng, altitude: FLY_ALTITUDE }, FLY_MS);
    });
}
```

- [ ] **Step 6: Attach interactions in `main.ts`**

In `frontend/src/main.ts`, add the import:

```ts
import { attachInteractions } from './interactions';
```

and immediately after `const globe = createGlobe(app);` add:

```ts
attachInteractions(globe);
```

- [ ] **Step 7: Verify types, tests, and build**

```bash
cd /Users/huyng/ws/earth-map/frontend
pnpm test    # Expected: PASS (16 tests)
pnpm build   # Expected: succeeds
```

- [ ] **Step 8: Verify manually in the dev server**

Run `pnpm dev`, open http://localhost:5173, and check:

1. At countries zoom: hovering a country turns it gold and shows a tooltip with its name.
2. Clicking a country flies the camera to it and lands in the detail band (clicking Vietnam reveals the 34 provinces).
3. At detail zoom over Vietnam: hovering a province highlights it and the tooltip shows its Vietnamese name (e.g. "Hà Nội").
4. Hover styling updates promptly with no console errors.

Stop the server.

- [ ] **Step 9: Commit (task done)**

Mark all Task 6 steps `- [x]` in `docs/superpowers/plans/2026-07-22-globe-frontend.md`, then:

```bash
cd /Users/huyng/ws/earth-map
git add frontend/src docs/superpowers/plans/2026-07-22-globe-frontend.md
git commit -m "feat: add hover highlight, name tooltips, and click-to-fly"
```

---

### Task 7: Final verification and frontend README

**Files:**
- Create: `frontend/README.md`

**Interfaces:**
- Consumes: everything above.
- Produces: a verified, documented phase-1 frontend; the starting point for the phase-2 (AWS) plan.

- [ ] **Step 1: Run the full verification suite**

```bash
cd /Users/huyng/ws/earth-map/frontend
pnpm test      # Expected: PASS — 16 tests
pnpm build     # Expected: succeeds
pnpm preview   # Serves the production build
```

Open the preview URL and repeat the manual checks from Task 5 Step 5 and Task 6 Step 8 against the **production build** (this catches asset-path issues that `pnpm dev` hides). Stop the server.

- [ ] **Step 2: Write `frontend/README.md`**

```markdown
# Earth Map — Frontend

Interactive 3D earth globe (Three.js via [globe.gl](https://github.com/vasturiano/globe.gl)).
Zooming reveals three levels of detail:

1. **Globe** — textured earth, no borders.
2. **Countries** — world country borders (Natural Earth 110m).
3. **Detail** — Vietnam's 34 post-merger provinces/cities (2025 administrative
   reform); other countries keep national borders.

Hover highlights a country/province and shows its name; clicking a country
flies the camera to it.

## Develop

    pnpm install
    pnpm dev        # http://localhost:5173

## Test & build

    pnpm test       # Vitest unit tests (zoom bands, layer selection, geometry)
    pnpm build      # production build in dist/
    pnpm preview    # serve the production build

## Data

Static GeoJSON and texture assets live in `public/`; see
`public/data/README.md` for sources, licenses, and processing steps.
```

- [ ] **Step 3: Commit (task done)**

Mark all Task 7 steps `- [x]` in `docs/superpowers/plans/2026-07-22-globe-frontend.md`, then:

```bash
cd /Users/huyng/ws/earth-map
git add frontend/README.md docs/superpowers/plans/2026-07-22-globe-frontend.md
git commit -m "docs: add frontend README"
```
