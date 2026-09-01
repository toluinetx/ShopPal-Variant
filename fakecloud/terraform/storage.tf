# ---------------------------------------------------------------------------
# S3: the buckets ShopPal would need.
#
#   product-images  - public CDN origin, and public in the worst way
#   user-avatars    - correctly locked down (control / false-positive check)
#   db-backups      - pg_dump target, unencrypted and unversioned
#   alb-logs        - access log sink
#   terraform-state - state bucket, with the classic no-locking/no-encryption mistakes
# ---------------------------------------------------------------------------

locals {
  bucket_names = {
    product_images = "${local.name}-product-images${local.suffix}"
    user_avatars   = "${local.name}-user-avatars${local.suffix}"
    db_backups     = "${local.name}-db-backups${local.suffix}"
    alb_logs       = "${local.name}-alb-logs${local.suffix}"
    tf_state       = "${local.name}-terraform-state${local.suffix}"
    cloudtrail     = "${local.name}-cloudtrail${local.suffix}"
  }
}

# ===========================================================================
# product-images - the badly exposed one
# ===========================================================================

resource "aws_s3_bucket" "product_images" {
  bucket        = local.bucket_names.product_images
  force_destroy = true

  tags = {
    Name        = local.bucket_names.product_images
    DataClass   = "public-content"
    Insecure    = "public-read-acl,public-bucket-policy,no-public-access-block"
    Description = "Product photos served to the storefront"
  }
}

resource "aws_s3_bucket_ownership_controls" "product_images" {
  bucket = aws_s3_bucket.product_images.id
  rule {
    object_ownership = "BucketOwnerPreferred"
  }
}

# !! GAP: every one of the four public-access blocks is disabled, which is what
# makes the ACL and policy below actually take effect.
resource "aws_s3_bucket_public_access_block" "product_images" {
  bucket = aws_s3_bucket.product_images.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

# !! GAP: world-readable ACL.
resource "aws_s3_bucket_acl" "product_images" {
  bucket = aws_s3_bucket.product_images.id
  acl    = "public-read"

  depends_on = [
    aws_s3_bucket_ownership_controls.product_images,
    aws_s3_bucket_public_access_block.product_images,
  ]
}

# !! GAP: anonymous principal, and s3:* rather than s3:GetObject - so the
# "public read" bucket is in fact anonymously *writable* and deletable too.
resource "aws_s3_bucket_policy" "product_images" {
  bucket = aws_s3_bucket.product_images.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "PublicEverything"
      Effect    = "Allow"
      Principal = "*"
      Action    = "s3:*"
      Resource = [
        aws_s3_bucket.product_images.arn,
        "${aws_s3_bucket.product_images.arn}/*",
      ]
    }]
  })

  depends_on = [aws_s3_bucket_public_access_block.product_images]
}

# ===========================================================================
# user-avatars - the well-configured control bucket
# ===========================================================================

resource "aws_s3_bucket" "user_avatars" {
  bucket        = local.bucket_names.user_avatars
  force_destroy = true

  tags = {
    Name      = local.bucket_names.user_avatars
    DataClass = "pii"
    Expected  = "true"
  }
}

resource "aws_s3_bucket_public_access_block" "user_avatars" {
  bucket = aws_s3_bucket.user_avatars.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "user_avatars" {
  bucket = aws_s3_bucket.user_avatars.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.app.arn
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_versioning" "user_avatars" {
  bucket = aws_s3_bucket.user_avatars.id
  versioning_configuration {
    status = "Enabled"
  }
}

# ===========================================================================
# db-backups - Postgres dumps, and the most damaging exposure in the estate
# ===========================================================================

resource "aws_s3_bucket" "db_backups" {
  bucket        = local.bucket_names.db_backups
  force_destroy = true

  tags = {
    Name        = local.bucket_names.db_backups
    DataClass   = "confidential"
    Insecure    = "no-encryption,no-versioning,no-logging,cross-account-policy"
    Description = "Nightly pg_dump of the shoppal database"
  }
}

# !! GAP: no aws_s3_bucket_server_side_encryption_configuration for this
# bucket, no versioning, and no access logging - customer PII and password
# hashes sitting in plaintext at rest with no recovery from a delete.

resource "aws_s3_bucket_public_access_block" "db_backups" {
  bucket = aws_s3_bucket.db_backups.id

  block_public_acls       = true
  block_public_policy     = false
  ignore_public_acls      = true
  restrict_public_buckets = false
}

# !! GAP: a wildcard-account principal. Any AWS principal in any account can
# read the backups - the classic "confused deputy" bucket policy.
resource "aws_s3_bucket_policy" "db_backups" {
  bucket = aws_s3_bucket.db_backups.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "AnyAwsAccountCanRead"
      Effect    = "Allow"
      Principal = { AWS = "*" }
      Action    = ["s3:GetObject", "s3:ListBucket"]
      Resource = [
        aws_s3_bucket.db_backups.arn,
        "${aws_s3_bucket.db_backups.arn}/*",
      ]
    }]
  })

  depends_on = [aws_s3_bucket_public_access_block.db_backups]
}

# ===========================================================================
# alb-logs
# ===========================================================================

resource "aws_s3_bucket" "alb_logs" {
  bucket        = local.bucket_names.alb_logs
  force_destroy = true

  tags = {
    Name      = local.bucket_names.alb_logs
    DataClass = "operational"
  }
}

resource "aws_s3_bucket_public_access_block" "alb_logs" {
  bucket = aws_s3_bucket.alb_logs.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# !! GAP: log bucket has no lifecycle policy and no object-lock, so logs can be
# deleted by anyone who can write to it and grow without bound.
resource "aws_s3_bucket_server_side_encryption_configuration" "alb_logs" {
  bucket = aws_s3_bucket.alb_logs.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# ===========================================================================
# terraform-state
# ===========================================================================

resource "aws_s3_bucket" "tf_state" {
  bucket        = local.bucket_names.tf_state
  force_destroy = true

  tags = {
    Name      = local.bucket_names.tf_state
    DataClass = "confidential"
    Insecure  = "no-encryption,no-versioning"
  }
}

# !! GAP: state files hold every secret Terraform touched, and this bucket has
# neither encryption nor versioning.

resource "aws_s3_bucket_public_access_block" "tf_state" {
  bucket = aws_s3_bucket.tf_state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ===========================================================================
# cloudtrail log bucket
# ===========================================================================

resource "aws_s3_bucket" "cloudtrail" {
  bucket        = local.bucket_names.cloudtrail
  force_destroy = true

  tags = {
    Name      = local.bucket_names.cloudtrail
    DataClass = "audit"
  }
}

resource "aws_s3_bucket_public_access_block" "cloudtrail" {
  bucket = aws_s3_bucket.cloudtrail.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_policy" "cloudtrail" {
  bucket = aws_s3_bucket.cloudtrail.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AWSCloudTrailAclCheck"
        Effect    = "Allow"
        Principal = { Service = "cloudtrail.amazonaws.com" }
        Action    = "s3:GetBucketAcl"
        Resource  = aws_s3_bucket.cloudtrail.arn
      },
      {
        Sid       = "AWSCloudTrailWrite"
        Effect    = "Allow"
        Principal = { Service = "cloudtrail.amazonaws.com" }
        Action    = "s3:PutObject"
        Resource  = "${aws_s3_bucket.cloudtrail.arn}/AWSLogs/${local.account_id}/*"
      },
    ]
  })
}
