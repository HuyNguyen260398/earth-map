variable "name_prefix" {
  description = "Prefix for CloudFront resource names."
  type        = string
}

variable "bucket_name" {
  description = "Globally unique name for the private origin bucket."
  type        = string
}

variable "domain_name" {
  description = "Alias the distribution serves, e.g. earthmap.nghuy.link."
  type        = string
}

variable "certificate_arn" {
  description = "ARN of a validated us-east-1 ACM certificate covering domain_name."
  type        = string
}

variable "comment" {
  description = "CloudFront distribution comment shown in the console."
  type        = string
  default     = "Earth Map SPA"
}

variable "price_class" {
  description = "CloudFront price class. PriceClass_200 includes South-East Asia, the app's primary audience, without paying for South America and Oceania edges."
  type        = string
  default     = "PriceClass_200"
}

variable "content_security_policy" {
  description = "Content-Security-Policy header value. Esri World Imagery tiles are loaded as images from server.arcgisonline.com; change this in step with frontend/src/globe.ts."
  type        = string
  default     = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://server.arcgisonline.com; connect-src 'self'; worker-src 'self' blob:; font-src 'self'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'; object-src 'none'"
}

variable "tags" {
  description = "Tags applied to taggable resources in this module."
  type        = map(string)
  default     = {}
}
