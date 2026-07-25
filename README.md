<div align="center">

# Earth Map

**[earthmap.nghuy.link](https://earthmap.nghuy.link)**

[![CI](https://github.com/HuyNguyen260398/earth-map/actions/workflows/ci.yml/badge.svg)](https://github.com/HuyNguyen260398/earth-map/actions/workflows/ci.yml)
[![Deploy](https://github.com/HuyNguyen260398/earth-map/actions/workflows/deploy.yml/badge.svg)](https://github.com/HuyNguyen260398/earth-map/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE.md)

[![Three.js](https://img.shields.io/badge/three.js-r185-000000?logo=threedotjs&logoColor=white)](https://threejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-8.1-646CFF?logo=vite&logoColor=white)](https://vite.dev)
[![Terraform](https://img.shields.io/badge/Terraform-%3E%3D1.11-7B42BC?logo=terraform&logoColor=white)](https://developer.hashicorp.com/terraform)
[![AWS](https://img.shields.io/badge/AWS-S3%20%C2%B7%20CloudFront-FF9900?logo=amazonwebservices&logoColor=white)](https://aws.amazon.com)

An interactive 3D earth globe you navigate **by clicking**, not by hunting for the
right zoom level.

</div>

Start on a textured NASA Blue Marble sphere, click to dive into world borders,
click a country to focus it, then keep drilling — for Vietnam, all the way down
to its 34 post-2025-reform provinces and their 3,321 wards, over streamed
satellite imagery.

There is no API, no database and no sign-in. Every byte the app needs is a static
asset, so the whole thing is delivered straight from a CDN.

## What it does

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

### How navigation works

| You are looking at | Click the earth | Click a shape | Click empty space |
|---|---|---|---|
| **Globe** — textured earth, no borders | dive to the country map, centred where you clicked | — | — |
| **Countries** — world borders | nothing (that's ocean) | focus that country | back to the globe |
| **Detail** — one country's provinces | back to the country map | drill into that province | back to the country map |
| **Ward** — one province's wards | back to the province map | nothing | back to the province map |

Every country shows its national outline; Vietnam is the one with subdivision
data, so it is the country you can drill through to ward level.

## Frontend

A single-page app with no framework — the globe *is* the UI.

| Layer | Choice |
|---|---|
| Rendering | [Three.js](https://threejs.org) via [globe.gl](https://github.com/vasturiano/globe.gl) and three-globe |
| Language | TypeScript |
| Build | [Vite](https://vite.dev) — static export, content-hashed assets, three.js split into its own long-lived chunk |
| Tests | [Vitest](https://vitest.dev) over the navigation, zoom-band, layer and styling modules |
| Geometry | [polygon-clipping](https://github.com/mfogel/polygon-clipping) to dissolve subdivisions into a focused outline |
| Data | GeoJSON — Natural Earth countries, Vietnam provinces and wards, committed to the repo |
| Imagery | NASA Blue Marble and GEBCO textures; Esri World Imagery tiles streamed at close range |

## Backend

The app makes no API calls, so there is no compute or data tier to run — the
backend is a delivery stack. Everything below is defined in Terraform and shipped
by GitHub Actions.

| Concern | Service |
|---|---|
| Static hosting | **Amazon S3** — private bucket, no website endpoint |
| CDN and entry point | **Amazon CloudFront** — HTTP/3, brotli and gzip, reachable only via Origin Access Control |
| Edge compute | **CloudFront Functions** — rewrites extension-less paths to the SPA shell |
| Security headers | **CloudFront response-headers policy** — HSTS, CSP, `nosniff`, frame and referrer policy |
| TLS | **AWS Certificate Manager** — DNS-validated certificate |
| DNS | **Amazon Route 53** — A/AAAA aliases onto the distribution |
| Infrastructure as code | **Terraform** — remote state in S3 with native locking, no DynamoDB |
| CI/CD | **GitHub Actions** with AWS OIDC — no long-lived access keys |

Assets are cached by class: content-hashed bundles, textures and GeoJSON are
immutable for a year, while `index.html` is revalidated on every load so a
release is live immediately. GeoJSON is served as `application/json` specifically
so CloudFront will compress it — roughly 4× smaller over the wire.

[`docs/architecture.md`](docs/architecture.md) has the request path, caching
rules and pipeline diagrams.

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

- [Frontend README](frontend/README.md) — module-level tour, terrain details,
  local development.
- [Deployment guide](docs/deployment.md) — bootstrapping the AWS account,
  configuring the repository, releasing and tearing down.
- [Deployment architecture](docs/architecture.md) — the AWS stack, request path,
  caching rules and CI/CD pipeline.
- [Design spec](docs/superpowers/specs/2026-07-22-earth-globe-design.md) — what the
  app is meant to do and why.
- [Implementation plans](docs/superpowers/plans/) — how the frontend and the
  hosting stack were built, phase by phase.
