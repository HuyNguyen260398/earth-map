variable "region" {
  description = "Region for the Terraform state bucket and IAM roles."
  type        = string
  default     = "ap-southeast-1"
}

variable "name_prefix" {
  description = "Prefix for bootstrap-created resource names."
  type        = string
  default     = "earth-map"
}

variable "state_bucket_name" {
  description = "Globally unique S3 bucket name for Terraform remote state."
  type        = string
}

variable "site_bucket_name" {
  description = "Name of the site bucket the prod stack will create. Scopes the deploy role's S3 permissions; the bucket need not exist yet."
  type        = string
}

variable "hosted_zone_id" {
  description = "Route 53 hosted zone ID for nghuy.link. Scopes the deploy role's Route 53 permissions."
  type        = string
}

variable "github_owner" {
  description = "GitHub account that owns the repository."
  type        = string
  default     = "HuyNguyen260398"
}

variable "github_repo" {
  description = "GitHub repository name."
  type        = string
  default     = "earth-map"
}

variable "github_owner_id" {
  description = "Numeric GitHub account ID. Set together with github_repo_id when the repository issues the immutable OIDC subject claim. Find both with: gh api repos/<owner>/<repo>/actions/oidc/customization/sub"
  type        = number
  default     = null
}

variable "github_repo_id" {
  description = "Numeric GitHub repository ID. See github_owner_id."
  type        = number
  default     = null
}
