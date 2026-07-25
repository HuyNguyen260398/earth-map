output "certificate_arn" {
  description = "ARN of the issued and validated certificate."
  # Sourced from the validation resource, not the certificate, so consumers
  # cannot attach a certificate that ACM has not yet issued.
  value = aws_acm_certificate_validation.this.certificate_arn
}
