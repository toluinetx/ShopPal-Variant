# ---------------------------------------------------------------------------
# Decoy objects.
#
# Bucket *configuration* findings (public ACL, no encryption) are only half the
# job - a good scanner also samples object contents. These give it something to
# find. Every credential below is a documented non-functional placeholder
# (AWS's own AKIAIOSFODNN7EXAMPLE, RFC-style dummy values); nothing here
# authenticates against anything.
#
# Gated behind var.seed_bucket_objects.
# ---------------------------------------------------------------------------

locals {
  seed = var.seed_bucket_objects ? 1 : 0
}

# --- In the anonymously-readable product-images bucket ---------------------

resource "aws_s3_object" "public_product_image" {
  count = local.seed

  bucket       = aws_s3_bucket.product_images.id
  key          = "products/hoodie-navy-01.jpg"
  content      = "JFIF-placeholder-not-a-real-jpeg"
  content_type = "image/jpeg"

  tags = { Simulation = "true" }
}

# !! GAP: a build artifact containing the app's real env file, uploaded into
# the public bucket by a misconfigured CI job. This is the "public bucket leaks
# credentials" chain that turns a low finding into a critical one.
resource "aws_s3_object" "leaked_env" {
  count = local.seed

  bucket       = aws_s3_bucket.product_images.id
  key          = "deploy-artifacts/.env.production"
  content_type = "text/plain"

  content = <<-EOT
    # ShopPal server - production environment
    # (simulated file, placeholder values only)
    NODE_ENV=production
    DB_CONNECTION_URL=postgres://shoppal_admin:Sup3rS3cret-Pg-2024@${local.name}-postgres.abcdefghijkl.${var.region}.rds.amazonaws.com:5432/shoppal
    JWT_SECRET=b7f3c1d9e2a84f60b5c7d8e9f0a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3
    COOKIE_REFRESH_TOKEN_NAME=refreshToken
    AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
    AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
    # Deliberately not written in Stripe's real key shape: a conforming
    # placeholder trips GitHub push protection and blocks the commit. The
    # AWS keys above are AWS's own documented non-functional examples, which
    # scanners recognise as such.
    STRIPE_SECRET_KEY=<placeholder-not-a-real-stripe-key>
  EOT

  tags = {
    Simulation = "true"
    Insecure   = "credentials-in-public-object"
  }
}

# --- In the wide-open db-backups bucket ------------------------------------

# !! GAP: an unencrypted database dump containing PII and password hashes,
# readable by any AWS principal thanks to the bucket policy.
resource "aws_s3_object" "db_dump" {
  count = local.seed

  bucket       = aws_s3_bucket.db_backups.id
  key          = "nightly/shoppal-${var.environment}-2026-08-30.sql"
  content_type = "application/sql"

  content = <<-EOT
    -- ShopPal nightly logical backup (simulated fixture - synthetic rows only)
    -- pg_dump 16.3
    COPY public.users (user_id, username, email, password, phone) FROM stdin;
    1	ada.hopper	ada.hopper@example.com	$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy	+1-555-0142
    2	linus.b	linus.b@example.net	$2a$10$e0MYzXyjpJS7Pd0RVvHwHe1HcXfR5nHkC1eGmXcQZ5r2rvWKzS5Aq	+1-555-0177
    \\.
    COPY public.admins (admin_id, username, email, password) FROM stdin;
    1	admin	admin@shoppal.local	$2a$10$X7Qm8Kk3nQpZ1cLmT0vWQeRyU5sD9fG2hJ4kL6mN8pQ0rS2tU4vW6
    \\.
  EOT

  tags = {
    Simulation = "true"
    DataClass  = "pii"
    Insecure   = "unencrypted-pii-backup"
  }
}

# !! GAP: a private SSH key checked into the backup bucket.
resource "aws_s3_object" "stray_ssh_key" {
  count = local.seed

  bucket       = aws_s3_bucket.db_backups.id
  key          = "ops/id_rsa_deploy"
  content_type = "text/plain"

  content = <<-EOT
    -----BEGIN OPENSSH PRIVATE KEY-----
    THIS IS NOT A REAL KEY. It is a fixed-length placeholder used by the
    ShopPal fakecloud so that secret-scanning rules which match on the
    BEGIN/END markers have something to hit. No key material is present.
    -----END OPENSSH PRIVATE KEY-----
  EOT

  tags = {
    Simulation = "true"
    Insecure   = "private-key-in-bucket"
  }
}

# --- In the terraform-state bucket -----------------------------------------

# !! GAP: Terraform state is a secret-bearing artifact; this one is in a bucket
# with no encryption and no versioning.
resource "aws_s3_object" "tf_state_blob" {
  count = local.seed

  bucket       = aws_s3_bucket.tf_state.id
  key          = "env:/prod/terraform.tfstate"
  content_type = "application/json"

  content = jsonencode({
    version           = 4
    terraform_version = "1.9.8"
    serial            = 137
    lineage           = "0f1e2d3c-4b5a-6978-8796-a5b4c3d2e1f0"
    outputs = {
      db_master_password = {
        value     = "Sup3rS3cret-Pg-2024"
        type      = "string"
        sensitive = true
      }
    }
    resources = []
  })

  tags = {
    Simulation = "true"
    Insecure   = "secrets-in-unencrypted-state"
  }
}
