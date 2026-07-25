terraform {
  # 1.11 is the floor for stable S3-native state locking (use_lockfile), which
  # the prod backend in infra/envs/prod relies on instead of a lock table.
  required_version = ">= 1.11"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}

provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Project   = "earth-map"
      ManagedBy = "terraform"
      Component = "bootstrap"
    }
  }
}
