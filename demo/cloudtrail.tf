resource "aws_s3_bucket" "trail" {
  bucket = "${var.project_name}-cloudtrail-logs"

  tags = {
    Name = "${var.project_name}-cloudtrail-logs"
  }
}

resource "aws_s3_bucket_acl" "trail" {
  bucket = aws_s3_bucket.trail.id
  acl    = "public-read"
}

resource "aws_cloudtrail" "main" {
  name           = "${var.project_name}-trail"
  s3_bucket_name = aws_s3_bucket.trail.id

  # Logging left disabled by default.
  enable_logging = false

  # No log file validation, so tampering with delivered logs can't be
  # detected.
  enable_log_file_validation = false

  # Not a multi-region trail, and no CloudWatch Logs / KMS encryption
  # configured for the trail.
  is_multi_region_trail = false
}
