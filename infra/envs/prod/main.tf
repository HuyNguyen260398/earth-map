locals {
  tags = {
    Project     = "earth-map"
    Environment = "prod"
    ManagedBy   = "terraform"
  }
}

module "certificate" {
  source = "../../modules/acm-certificate"

  providers = {
    aws = aws.us_east_1
  }

  domain_name    = var.domain_name
  hosted_zone_id = var.hosted_zone_id
  tags           = local.tags
}

module "site" {
  source = "../../modules/static-site"

  name_prefix     = var.name_prefix
  bucket_name     = var.site_bucket_name
  domain_name     = var.domain_name
  certificate_arn = module.certificate.certificate_arn
  comment         = "Earth Map SPA — production (${var.domain_name})"
  price_class     = var.price_class
  tags            = local.tags
}

# Alias records live here rather than in a module: two resources, and keeping
# them beside the module call makes the dependency on the distribution obvious.
resource "aws_route53_record" "ipv4" {
  zone_id = var.hosted_zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = module.site.distribution_domain_name
    zone_id                = module.site.distribution_hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "ipv6" {
  zone_id = var.hosted_zone_id
  name    = var.domain_name
  type    = "AAAA"

  alias {
    name                   = module.site.distribution_domain_name
    zone_id                = module.site.distribution_hosted_zone_id
    evaluate_target_health = false
  }
}
