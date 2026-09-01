output "account_id" {
  description = "Account ID the emulator reports. Scanners should discover this via sts:GetCallerIdentity."
  value       = local.account_id
}

output "region" {
  value = var.region
}

output "endpoint" {
  description = "Point your scanner's AWS client at this URL."
  value       = var.fakecloud_endpoint
}

output "vpc_id" {
  value = aws_vpc.main.id
}

output "bucket_names" {
  description = "Every S3 bucket in the estate."
  value       = local.bucket_names
}

output "instance_ids" {
  description = "EC2 instances, keyed by role."
  value = merge(
    { for k, v in aws_instance.fleet : k => v.id },
    {
      bastion          = aws_instance.bastion.id
      legacy_migration = aws_instance.legacy_migration.id
    },
  )
}

output "rds_endpoints" {
  description = "Postgres endpoints. Metadata only - see README, nothing listens here."
  value = {
    primary   = local.db_primary_endpoint
    reporting = local.db_reporting_endpoint
  }
}

output "load_balancer_dns" {
  value = aws_lb.public.dns_name
}

output "iam_users" {
  value = [
    aws_iam_user.ci_deployer.name,
    aws_iam_user.contractor.name,
    aws_iam_user.app_service_account.name,
  ]
}

output "seeded_access_key_ids" {
  description = <<-EOT
    Access key IDs minted inside the emulator. Handy as scanner input when you
    want to test "given this leaked key, what can it reach?". The secrets are
    in Terraform state and in the plaintext SSM parameter - both deliberate.
  EOT
  value = {
    ci_deployer_primary = aws_iam_access_key.ci_deployer_primary.id
    ci_deployer_stale   = aws_iam_access_key.ci_deployer_stale.id
    contractor          = aws_iam_access_key.contractor.id
    svc_server          = aws_iam_access_key.app_service_account.id
  }
}

output "summary" {
  description = "Quick inventory count."
  value = {
    ec2_instances    = length(aws_instance.fleet) + 2
    s3_buckets       = length(local.bucket_names)
    rds_instances    = var.enable_rds ? 2 : 0
    security_groups  = 5
    iam_users        = 3
    iam_roles        = 4
    lambda_functions = 1
    sqs_queues       = 3
    sns_topics       = 2
    ecr_repositories = length(local.ecr_repos)
    log_groups       = length(local.log_groups)
    kms_keys         = 2
  }
}
