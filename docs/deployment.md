# Deployment guide

Operational runbook for the stack described in
[`architecture.md`](architecture.md). The app is served from
`https://earthmap.nghuy.link`.

> [!WARNING]
> Following this creates real, billable AWS resources (CloudFront, S3, Route 53
> queries). Traffic to a personal site keeps this to a few dollars a month, but
> it is not free. See [Tear down](#tear-down).

## Prerequisites

| Tool | Version |
|---|---|
| Terraform | >= 1.11 (for S3-native state locking) |
| AWS CLI | v2, authenticated to the target account |
| Node.js | 22.x |
| pnpm | 11.x |
| GitHub CLI | optional, for the `gh` commands below |

You also need a Route 53 hosted zone for the parent domain and permission to
create S3 buckets, CloudFront distributions, ACM certificates and IAM roles.

## Local development

Everything the app needs is committed, so there is nothing to download or
configure:

```sh
cd frontend
pnpm install
pnpm dev          # http://localhost:5173
```

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

The infrastructure has its own checks, none of which need AWS credentials:

```sh
terraform fmt -check -recursive infra
terraform -chdir=infra/modules/static-site test
node --test 'infra/modules/static-site/functions/*.test.mjs'
```

## 1. Bootstrap (once)

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

> [!IMPORTANT]
> GitHub issues the OIDC subject claim in two shapes. Repositories created
> before the immutable-subject rollout get `repo:<owner>/<repo>:<context>`;
> newer ones get `repo:<owner>@<owner_id>/<repo>@<repo_id>:<context>`. Check
> which applies before applying, and set `github_owner_id` / `github_repo_id`
> in `terraform.tfvars` if the prefix contains `@` IDs — otherwise every
> workflow fails with `Not authorized to perform sts:AssumeRoleWithWebIdentity`.
>
> ```sh
> gh api repos/<owner>/<repo>/actions/oidc/customization/sub
> ```

Note the three outputs; they become the GitHub configuration in the next step.

## 2. Configure the GitHub repository

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

Until these exist, `ci.yml` skips the plan with a notice rather than failing,
and `deploy.yml` fails immediately naming exactly what is missing.

> [!IMPORTANT]
> `deploy.yml` triggers on pushes to `main`, and the CI roles' OIDC trust
> policies are scoped to `refs/heads/main` and `pull_request`. Make sure `main`
> is the repository's default branch:
>
> ```sh
> gh repo edit --default-branch main
> ```

## 3. Release

Push to `main`. `deploy.yml` applies the stack, builds the frontend, syncs it to
S3 in three passes and invalidates the cache. The first apply waits on ACM DNS
validation, which usually takes a few minutes, and on the CloudFront
distribution deploying, which can take up to fifteen.

Verify once it finishes:

```sh
curl -sI https://earthmap.nghuy.link | grep -Ei 'HTTP/|strict-transport|content-security'
curl -s -D - -H 'Accept-Encoding: br' -o /dev/null \
  https://earthmap.nghuy.link/data/countries.geojson | grep -i content-encoding
```

Expected: `HTTP/2 200`, an HSTS header, a CSP header, and `content-encoding: br`
on the GeoJSON. Use a `GET` rather than `HEAD` for the compression check —
CloudFront does not report an encoding for `HEAD`.

Then open the site and confirm the browser console reports no CSP violations.
The CSP is the one thing that cannot be verified from a shell; if it trips,
adjust `content_security_policy` in `infra/modules/static-site/variables.tf`.

## Local plan

```sh
cd infra/envs/prod
cp terraform.tfvars.example terraform.tfvars   # edit the values
terraform init \
  -backend-config="bucket=<state bucket>" \
  -backend-config="region=<region>"
terraform plan
```

## Tear down

The site bucket has no `force_destroy`, so empty it first.

```sh
aws s3 rm "s3://<site bucket>" --recursive
cd infra/envs/prod && terraform destroy
```

Then, only when you are finished entirely, remove the state bucket and CI roles.
The bucket is versioned, so delete every object version and delete marker before
destroying it:

```sh
aws s3api delete-objects --bucket <state bucket> --delete "$(
  aws s3api list-object-versions --bucket <state bucket> \
    --output json --query '{Objects: Versions[].{Key:Key,VersionId:VersionId}}')"
aws s3api delete-objects --bucket <state bucket> --delete "$(
  aws s3api list-object-versions --bucket <state bucket> \
    --output json --query '{Objects: DeleteMarkers[].{Key:Key,VersionId:VersionId}}')"
cd infra/bootstrap && terraform destroy
```
