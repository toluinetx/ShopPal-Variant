# Bucket for product images / static assets - made public and unencrypted.
resource "aws_s3_bucket" "assets" {
  bucket = "${var.project_name}-assets"

  tags = {
    Name = "${var.project_name}-assets"
  }
}

# Public-read ACL on a bucket - anyone on the internet can list/read objects.
resource "aws_s3_bucket_acl" "assets" {
  bucket = aws_s3_bucket.assets.id
  acl    = "public-read"
}

# Public access block explicitly disabled (all four protections turned off).
resource "aws_s3_bucket_public_access_block" "assets" {
  bucket = aws_s3_bucket.assets.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

# No aws_s3_bucket_server_side_encryption_configuration resource -> bucket
# is left without default encryption (KICS: S3 Bucket Without Server Side
# Encryption).

# No aws_s3_bucket_versioning resource -> versioning disabled, so objects
# can be overwritten/deleted with no recovery.

# No aws_s3_bucket_logging resource -> no access logging configured.

resource "aws_s3_bucket_policy" "assets" {
  bucket = aws_s3_bucket.assets.id

  # Wildcard principal and action - anyone can perform any S3 action on
  # this bucket (KICS: S3 Bucket With Wildcard Principal / All Users
  # Permissions).
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicWildcardAccess"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:*"
        Resource = [
          aws_s3_bucket.assets.arn,
          "${aws_s3_bucket.assets.arn}/*",
        ]
      }
    ]
  })
}

# Bucket used for application logs/backups - also unencrypted, and reuses
# the same open bucket policy pattern.
resource "aws_s3_bucket" "backups" {
  bucket = "${var.project_name}-backups"

  tags = {
    Name = "${var.project_name}-backups"
  }
}

resource "aws_s3_bucket_acl" "backups" {
  bucket = aws_s3_bucket.backups.id
  acl    = "public-read-write"
}
