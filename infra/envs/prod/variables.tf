variable "region" {
  description = "Region for the origin bucket and Terraform state."
  type        = string
  default     = "ap-southeast-1"
}

variable "domain_name" {
  description = "Public hostname the site is served from."
  type        = string
  default     = "earthmap.nghuy.link"
}

variable "hosted_zone_id" {
  description = "Route 53 hosted zone ID for nghuy.link."
  type        = string
}

variable "site_bucket_name" {
  description = "Globally unique name for the origin bucket."
  type        = string
}

variable "name_prefix" {
  description = "Prefix for resource names in this environment."
  type        = string
  default     = "earth-map-prod"
}

variable "price_class" {
  description = "CloudFront price class."
  type        = string
  default     = "PriceClass_200"
}
