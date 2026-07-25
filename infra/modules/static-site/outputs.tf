output "bucket_name" {
  description = "Name of the private origin bucket the deploy workflow syncs into."
  value       = aws_s3_bucket.site.id
}

output "distribution_id" {
  description = "CloudFront distribution ID, used to create cache invalidations."
  value       = aws_cloudfront_distribution.site.id
}

output "distribution_domain_name" {
  description = "The *.cloudfront.net domain, used as the Route 53 alias target."
  value       = aws_cloudfront_distribution.site.domain_name
}

output "distribution_hosted_zone_id" {
  description = "CloudFront's fixed hosted zone ID, required by Route 53 alias records."
  value       = aws_cloudfront_distribution.site.hosted_zone_id
}
