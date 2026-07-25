variable "domain_name" {
  description = "Fully qualified domain name the certificate is issued for."
  type        = string
}

variable "hosted_zone_id" {
  description = "Route 53 hosted zone in which DNS validation records are written."
  type        = string
}

variable "tags" {
  description = "Tags applied to the certificate."
  type        = map(string)
  default     = {}
}
