output "site_bucket_name" {
  description = "Origin bucket the deploy workflow syncs the build into."
  value       = module.site.bucket_name
}

output "distribution_id" {
  description = "Distribution the deploy workflow invalidates after a sync."
  value       = module.site.distribution_id
}

output "site_url" {
  description = "Public URL of the deployed app."
  value       = "https://${var.domain_name}"
}
