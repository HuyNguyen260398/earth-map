terraform {
  # 1.11 is the floor for stable S3-native state locking (use_lockfile).
  required_version = ">= 1.11"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }

  # Partial configuration: supply bucket / region via -backend-config at init
  # time. See README "Deployment".
  #
  # use_lockfile takes the state lock with a conditional PutObject on
  # <key>.tflock in the same bucket — no DynamoDB table, and no deprecated
  # `dynamodb_table` argument.
  backend "s3" {
    key          = "earth-map/prod/terraform.tfstate"
    encrypt      = true
    use_lockfile = true
  }
}

provider "aws" {
  region = var.region

  default_tags {
    tags = local.tags
  }
}

# CloudFront viewer certificates must live in us-east-1 regardless of where
# the rest of the stack runs.
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  default_tags {
    tags = local.tags
  }
}
