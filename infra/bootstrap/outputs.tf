output "state_bucket_name" {
  description = "S3 bucket holding Terraform remote state and its .tflock objects. Set as the STATE_BUCKET_NAME GitHub variable."
  value       = aws_s3_bucket.state.id
}

output "plan_role_arn" {
  description = "Set as the AWS_PLAN_ROLE_ARN GitHub secret."
  value       = aws_iam_role.plan.arn
}

output "deploy_role_arn" {
  description = "Set as the AWS_DEPLOY_ROLE_ARN GitHub secret."
  value       = aws_iam_role.deploy.arn
}
