# Earth Map — 3D Globe Web App Design

**Date:** 2026-07-22
**Status:** Approved

## Purpose

A web app showing an interactive 3D earth globe. At the default (far) view the
user sees a textured earth. Zooming in reveals country borders; zooming further
reveals province-level detail — initially only for Vietnam, showing its 34
post-merger provinces and cities (2025 administrative restructuring, the "2026
map"). Hosted on AWS as a static site, deployed via Terraform and GitHub
Actions.

Reference architecture: `aws-serverless-webapp` (Cognito → CloudFront → S3 →
API Gateway → Lambda → DynamoDB), **reduced to S3 + CloudFront only** — no
database, no auth, no API layer.

## Decisions made

| Topic | Decision |
|---|---|
| 3D engine | Three.js via **globe.gl** (globe.gl wraps Three.js) |
| App tooling | **Vite + vanilla TypeScript**, no UI framework |
| Visual style | Earth texture at globe scale + GeoJSON polygon overlays when zoomed |
| Vietnam data | Source a public GeoJSON of the 34 new provinces/cities; bundle as static asset; record provenance |
| Other countries at detail zoom | National borders only (no placeholder message) |
| Interactivity | Hover highlight + name tooltip; click a country to fly the camera to it |
| AWS scope | S3 (private, OAC) + CloudFront only; Terraform IaC; GitHub Actions with OIDC |
| Zoom mechanism | Approach A: single polygons layer, camera-altitude bands with hysteresis |

## Phase 1 — Local frontend

### Architecture

Single-page Vite + TypeScript app; one full-screen globe.gl canvas. All data is
static files under `public/`:

- Earth texture image(s) (bundled locally, from globe.gl example assets).
- `countries.geojson` — world country polygons (Natural Earth 110m or similar).
- `vietnam-34-provinces.geojson` — Vietnam's 34 provinces/cities post-merger.
  Sourcing: prefer an existing public community dataset of the new
  administrative map; fallback is merging the old 63-province boundaries
  according to the official merger list. Provenance and license recorded in
  `public/data/README.md`.

No runtime network dependency beyond the app's own static files.

### Zoom levels (approach A)

globe.gl has no built-in zoom levels; we derive them from camera altitude via
the `onZoom` event:

- Band `globe` (far, default): texture only, no polygons.
- Band `countries` (mid): country polygons — translucent fills, visible
  strokes.
- Band `detail` (near): same dataset but Vietnam's national polygon replaced by
  its 34 province polygons; other countries unchanged.

Band thresholds use hysteresis (different enter/exit altitudes) to prevent
flicker at boundaries. The polygons layer's data is swapped per band; globe.gl
diffs the data efficiently.

### Modules

| File | Responsibility |
|---|---|
| `src/main.ts` | Bootstrap: create globe, wire modules |
| `src/globe.ts` | Configure globe.gl instance (texture, atmosphere, controls) |
| `src/zoomLevels.ts` | Pure function: altitude → `'globe' \| 'countries' \| 'detail'` with hysteresis |
| `src/layers.ts` | Zoom band → polygon dataset (merges VN provinces at `detail`) |
| `src/interactions.ts` | Hover highlight + tooltip; click-to-fly to country centroid |
| `src/data.ts` | Lazy GeoJSON loading (provinces fetched on first `detail` entry) |

Each module has one purpose and a small interface; `zoomLevels` and `layers`
are pure and unit-testable without a DOM.

### Behavior details

- Hover: polygon highlights (stroke/fill emphasis) and a tooltip shows the
  country or province name (official Vietnamese names for provinces).
- Click on a country: camera flies to the country's centroid at detail
  altitude.
- Manual zoom (scroll/pinch/drag) always works; bands react to whatever the
  camera altitude is, regardless of how it got there.

### Error handling

- GeoJSON fetch failure: non-blocking error toast; globe remains usable at
  texture level; retry on next band entry.
- WebGL unavailable: replace canvas with a plain "WebGL required" message.

### Testing

- Vitest unit tests for `zoomLevels.ts` (band transitions, hysteresis) and
  `layers.ts` (dataset selection/merging).
- Build smoke test: `vite build` succeeds in CI.
- Visual/interaction behavior verified manually in the dev server.

## Phase 2 — AWS, Terraform, CI/CD

Starts only after phase 1 works locally.

### Infrastructure (Terraform)

- `infra/bootstrap`: one-time remote state (S3 state bucket + lock).
- `infra/envs/prod` (+ reusable modules): private S3 site bucket, CloudFront
  distribution with Origin Access Control, default root object, SPA-friendly
  error responses. Single environment (prod), matching the reference repo.

### CI/CD (GitHub Actions, OIDC — no long-lived keys)

- `ci.yml` (pull requests): typecheck, unit tests, `vite build`,
  `terraform fmt -check` / `validate` / `plan` using a read-only plan role.
- `deploy.yml` (push to `main`): `terraform apply`, `vite build`,
  `aws s3 sync --delete` to the site bucket, CloudFront invalidation, using a
  deploy role.

Everything is same-origin static content — no CORS configuration needed.

## Out of scope (for now)

- Province/city detail for countries other than Vietnam.
- Any API, database, or authentication.
- Search, routing/permalinks, mobile-specific UI, i18n.
