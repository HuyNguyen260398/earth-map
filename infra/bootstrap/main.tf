# The provider already exists in this account (shared with other projects).
# Referencing it here is deliberate: creating it would fail with
# EntityAlreadyExists and risks other stacks' state.
data "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"
}

locals {
  # GitHub issues the OIDC subject claim in one of two shapes. Repositories
  # created before the immutable-subject rollout get
  #   repo:<owner>/<repo>:<context>
  # newer ones — earth-map among them — get the ID-qualified form
  #   repo:<owner>@<owner_id>/<repo>@<repo_id>:<context>
  # Check which applies with:
  #   gh api repos/<owner>/<repo>/actions/oidc/customization/sub
  #
  # Both are listed when the IDs are supplied: a StringEquals condition with a
  # list matches if any element does, so the roles keep working if GitHub
  # migrates the repository between formats. They stay exact strings rather
  # than a wildcard, which would also match a repo named earth-map-evil.
  subject_prefixes = compact([
    "repo:${var.github_owner}/${var.github_repo}",
    var.github_owner_id != null && var.github_repo_id != null
    ? "repo:${var.github_owner}@${var.github_owner_id}/${var.github_repo}@${var.github_repo_id}"
    : null,
  ])

  plan_subjects   = [for prefix in local.subject_prefixes : "${prefix}:pull_request"]
  deploy_subjects = [for prefix in local.subject_prefixes : "${prefix}:ref:refs/heads/main"]
}

# ---------------------------------------------------------------------------
# Terraform remote state
# ---------------------------------------------------------------------------

resource "aws_s3_bucket" "state" {
  bucket = var.state_bucket_name
}

resource "aws_s3_bucket_versioning" "state" {
  bucket = aws_s3_bucket.state.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "state" {
  bucket = aws_s3_bucket.state.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "state" {
  bucket                  = aws_s3_bucket.state.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# No lock table: infra/envs/prod uses S3-native locking (use_lockfile), which
# takes the lock with a conditional PutObject on <key>.tflock in this bucket.

# ---------------------------------------------------------------------------
# GitHub Actions IAM roles
# ---------------------------------------------------------------------------

data "aws_iam_policy_document" "plan_trust" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [data.aws_iam_openid_connect_provider.github.arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:sub"
      values   = local.plan_subjects
    }
  }
}

resource "aws_iam_role" "plan" {
  name               = "${var.name_prefix}-ci-plan-role"
  description        = "Read-only role assumed by ci.yml to run terraform plan on pull requests."
  assume_role_policy = data.aws_iam_policy_document.plan_trust.json
}

# ci.yml runs `terraform plan -lock=false`, so this role never needs to write
# the .tflock object — ReadOnlyAccess alone is sufficient and keeps the PR role
# genuinely incapable of changing anything.
resource "aws_iam_role_policy_attachment" "plan_readonly" {
  role       = aws_iam_role.plan.name
  policy_arn = "arn:aws:iam::aws:policy/ReadOnlyAccess"
}

data "aws_iam_policy_document" "deploy_trust" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [data.aws_iam_openid_connect_provider.github.arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:sub"
      values   = local.deploy_subjects
    }
  }
}

resource "aws_iam_role" "deploy" {
  name               = "${var.name_prefix}-ci-deploy-role"
  description        = "Role assumed by deploy.yml to apply the prod stack and ship the frontend."
  assume_role_policy = data.aws_iam_policy_document.deploy_trust.json
}

data "aws_iam_policy_document" "deploy" {
  # Covers both the state object and the <key>.tflock object that S3-native
  # locking writes and deletes alongside it.
  statement {
    sid    = "TerraformStateAndLock"
    effect = "Allow"

    actions = [
      "s3:ListBucket",
      "s3:GetBucketVersioning",
      "s3:GetObject",
      "s3:PutObject",
      "s3:DeleteObject",
    ]

    resources = [
      "arn:aws:s3:::${var.state_bucket_name}",
      "arn:aws:s3:::${var.state_bucket_name}/*",
    ]
  }

  # The site bucket's full lifecycle: create, configure, sync objects, destroy.
  statement {
    sid     = "SiteBucket"
    effect  = "Allow"
    actions = ["s3:*"]

    resources = [
      "arn:aws:s3:::${var.site_bucket_name}",
      "arn:aws:s3:::${var.site_bucket_name}/*",
    ]
  }

  # CloudFront supports resource-level permissions for very few of the actions
  # Terraform needs across a distribution/function/policy lifecycle, so this is
  # service-wide by necessity rather than by convenience.
  statement {
    sid       = "CloudFront"
    effect    = "Allow"
    actions   = ["cloudfront:*"]
    resources = ["*"]
  }

  # ACM ARNs are generated at RequestCertificate time and cannot be predicted,
  # so this statement cannot be resource-scoped.
  statement {
    sid    = "Acm"
    effect = "Allow"

    actions = [
      "acm:RequestCertificate",
      "acm:DescribeCertificate",
      "acm:DeleteCertificate",
      "acm:ListCertificates",
      "acm:ListTagsForCertificate",
      "acm:AddTagsToCertificate",
      "acm:RemoveTagsFromCertificate",
    ]

    resources = ["*"]
  }

  statement {
    sid    = "Route53Zone"
    effect = "Allow"

    actions = [
      "route53:GetHostedZone",
      "route53:ListResourceRecordSets",
      "route53:ChangeResourceRecordSets",
    ]

    resources = ["arn:aws:route53:::hostedzone/${var.hosted_zone_id}"]
  }

  statement {
    sid       = "Route53Global"
    effect    = "Allow"
    actions   = ["route53:ListHostedZones", "route53:GetChange"]
    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "deploy" {
  name   = "${var.name_prefix}-ci-deploy-policy"
  role   = aws_iam_role.deploy.id
  policy = data.aws_iam_policy_document.deploy.json
}
