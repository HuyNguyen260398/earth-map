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
├── infra/             # Terraform — bootstrap, reusable modules, prod environment
├── .github/           # CI (pull requests) and deploy (main) workflows
└── docs/              # design spec, implementation plans, deployment architecture
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

## Deployment

The app is served from `https://earthmap.nghuy.link` — a private S3 bucket
behind CloudFront, defined in Terraform and shipped by GitHub Actions. See
[`docs/architecture.md`](docs/architecture.md) for the full picture.

> [!WARNING]
> Deploying creates real, billable AWS resources (CloudFront, S3, Route 53
> queries). Traffic to a personal site keeps this to a few dollars a month, but
> it is not free. See [Tear down](#tear-down) below.

### Prerequisites

| Tool | Version |
|---|---|
| Terraform | >= 1.11 (for S3-native state locking) |
| AWS CLI | v2, authenticated to the target account |
| Node.js | 22.x |
| pnpm | 11.x |
| GitHub CLI | optional, for the `gh` commands below |

You also need a Route 53 hosted zone for the parent domain and permission to
create S3 buckets, CloudFront distributions, ACM certificates and IAM roles.

### 1. Bootstrap (once)

Creates the Terraform state bucket and the two OIDC-trusted CI roles. This step
uses local state — it is the chicken-and-egg that everything else stands on.
There is no lock table: `infra/envs/prod` locks with an S3 object
(`use_lockfile`), so the state bucket is the whole backend.

```sh
cd infra/bootstrap
cp terraform.tfvars.example terraform.tfvars   # edit the values
terraform init
terraform apply
```

The account's GitHub OIDC provider is referenced, not created — if the account
does not have one yet, create it first:

```sh
aws iam create-open-id-connect-provider \
  --url "https://token.actions.githubusercontent.com" \
  --client-id-list "sts.amazonaws.com"
```

Note the three outputs; they become the GitHub configuration in the next step.

### 2. Configure the GitHub repository

**Variables:**

| Name | Value |
|---|---|
| `AWS_REGION` | `ap-southeast-1` |
| `STATE_BUCKET_NAME` | `terraform output state_bucket_name` |
| `SITE_BUCKET_NAME` | the `site_bucket_name` you set in `terraform.tfvars` |
| `HOSTED_ZONE_ID` | the hosted zone ID for the parent domain |

**Secrets:**

| Name | Value |
|---|---|
| `AWS_PLAN_ROLE_ARN` | `terraform output plan_role_arn` |
| `AWS_DEPLOY_ROLE_ARN` | `terraform output deploy_role_arn` |

```sh
gh variable set AWS_REGION --body "ap-southeast-1"
gh variable set STATE_BUCKET_NAME --body "<state bucket>"
gh variable set SITE_BUCKET_NAME --body "<site bucket>"
gh variable set HOSTED_ZONE_ID --body "<zone id>"
gh secret set AWS_PLAN_ROLE_ARN --body "<plan role arn>"
gh secret set AWS_DEPLOY_ROLE_ARN --body "<deploy role arn>"
```

> [!IMPORTANT]
> `deploy.yml` triggers on pushes to `main`, and the CI roles' OIDC trust
> policies are scoped to `refs/heads/main` and `pull_request`. Make sure `main`
> is the repository's default branch (`gh repo edit --default-branch main`).

### 3. First deploy

Push to `main`. `deploy.yml` applies the stack, builds the frontend, syncs it
to S3 and invalidates the cache. The first apply waits on ACM DNS validation,
which usually takes a few minutes, and on the CloudFront distribution
deploying, which can take up to fifteen.

Verify once it finishes:

```sh
curl -sI https://earthmap.nghuy.link | grep -Ei 'HTTP/|strict-transport|content-security'
curl -sI -H 'Accept-Encoding: gzip' https://earthmap.nghuy.link/data/countries.geojson | grep -i content-encoding
```

Expected: `HTTP/2 200`, an HSTS header, a CSP header, and `content-encoding: gzip`
on the GeoJSON. Then open the site and confirm the browser console reports no
CSP violations — if it does, adjust `content_security_policy` in
`infra/modules/static-site/variables.tf`.

### Local plan

```sh
cd infra/envs/prod
cp terraform.tfvars.example terraform.tfvars   # edit the values
terraform init \
  -backend-config="bucket=<state bucket>" \
  -backend-config="region=<region>"
terraform plan
```

### Tear down

The site bucket has no `force_destroy`, so empty it first.

```sh
aws s3 rm "s3://<site bucket>" --recursive
cd infra/envs/prod && terraform destroy
```

Then, only when you are finished entirely, remove the state bucket and CI
roles. The bucket is versioned, so delete every object version and delete
marker before destroying it:

```sh
aws s3api delete-objects --bucket <state bucket> --delete "$(
  aws s3api list-object-versions --bucket <state bucket> \
    --output json --query '{Objects: Versions[].{Key:Key,VersionId:VersionId}}')"
aws s3api delete-objects --bucket <state bucket> --delete "$(
  aws s3api list-object-versions --bucket <state bucket> \
    --output json --query '{Objects: DeleteMarkers[].{Key:Key,VersionId:VersionId}}')"
cd infra/bootstrap && terraform destroy
```

## Documentation

- [Deployment architecture](docs/architecture.md) — the AWS stack, request path,
  caching rules and CI/CD pipeline.
- [Design spec](docs/superpowers/specs/2026-07-22-earth-globe-design.md) — what the
  app is meant to do and why.
- [Implementation plan](docs/superpowers/plans/2026-07-22-globe-frontend.md) — how
  it was built, phase by phase.
- [Frontend README](frontend/README.md) — module-level tour, terrain details,
  development notes.
