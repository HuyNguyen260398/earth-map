mock_provider "aws" {}

variables {
  name_prefix     = "earth-map-prod"
  bucket_name     = "earth-map-prod-site-000000000000"
  domain_name     = "earthmap.nghuy.link"
  certificate_arn = "arn:aws:acm:us-east-1:000000000000:certificate/00000000-0000-0000-0000-000000000000"
}

run "distribution_is_wired_to_the_domain_and_bucket" {
  command = plan

  assert {
    condition     = aws_s3_bucket.site.bucket == "earth-map-prod-site-000000000000"
    error_message = "Site bucket must use the caller-supplied name."
  }

  assert {
    condition     = contains(aws_cloudfront_distribution.site.aliases, "earthmap.nghuy.link")
    error_message = "Distribution must serve the requested domain."
  }

  assert {
    condition     = aws_cloudfront_distribution.site.default_root_object == "index.html"
    error_message = "Root requests must resolve to the SPA shell."
  }

  assert {
    condition     = aws_cloudfront_distribution.site.viewer_certificate[0].minimum_protocol_version == "TLSv1.2_2021"
    error_message = "Viewer TLS floor must be TLSv1.2_2021."
  }
}

run "origin_is_private_and_compressed" {
  command = plan

  assert {
    condition     = aws_s3_bucket_public_access_block.site.block_public_policy
    error_message = "The site bucket must never be publicly reachable."
  }

  assert {
    condition     = aws_cloudfront_distribution.site.default_cache_behavior[0].compress
    error_message = "Compression must be on — GeoJSON is ~3.5x smaller gzipped."
  }

  assert {
    condition     = aws_cloudfront_distribution.site.default_cache_behavior[0].viewer_protocol_policy == "redirect-to-https"
    error_message = "Plain HTTP must be redirected, not served."
  }

  assert {
    condition     = length(aws_cloudfront_distribution.site.default_cache_behavior[0].function_association) == 1
    error_message = "The viewer-request rewrite function must be attached."
  }
}
