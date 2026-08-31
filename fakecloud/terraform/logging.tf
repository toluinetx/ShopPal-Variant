# ---------------------------------------------------------------------------
# CloudTrail + CloudWatch Logs: the audit story, such as it is.
# ---------------------------------------------------------------------------

# !! GAP: a single-region trail with log file validation disabled, no CloudWatch
# Logs delivery, no KMS encryption, and no data-event selectors - so S3 object
# reads (including the leaked backups) are never recorded at all.
resource "aws_cloudtrail" "main" {
  name           = "${local.name}-trail"
  s3_bucket_name = aws_s3_bucket.cloudtrail.id

  is_multi_region_trail         = false
  include_global_service_events = false
  enable_log_file_validation    = false
  enable_logging                = true

  depends_on = [aws_s3_bucket_policy.cloudtrail]

  tags = {
    Name     = "${local.name}-trail"
    Insecure = "single-region,no-log-validation,no-data-events,unencrypted"
  }
}

# ---------------------------------------------------------------------------
# Log groups, one per service.
# ---------------------------------------------------------------------------

locals {
  log_groups = {
    server        = { retention = 0, encrypted = false }
    support       = { retention = 0, encrypted = false }
    notifications = { retention = 7, encrypted = false }
    alb           = { retention = 30, encrypted = true }
  }
}

# !! GAP: retention_in_days = 0 means "never expire" - unbounded cost, and for
# the encrypted = false groups, application logs (which for ShopPal's server
# include request bodies) sit unencrypted indefinitely.
resource "aws_cloudwatch_log_group" "service" {
  for_each = local.log_groups

  name              = "/${var.project}/${var.environment}/${each.key}"
  retention_in_days = each.value.retention
  kms_key_id        = each.value.encrypted ? aws_kms_key.app.arn : null

  tags = merge(
    { Name = "/${var.project}/${var.environment}/${each.key}" },
    each.value.encrypted && each.value.retention > 0
    ? { Expected = "true" }
    : { Insecure = "unencrypted-log-group${each.value.retention == 0 ? ",no-retention-limit" : ""}" },
  )
}
