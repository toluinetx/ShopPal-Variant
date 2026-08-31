# ---------------------------------------------------------------------------
# KMS, Secrets Manager and SSM Parameter Store.
#
# ShopPal's server needs a JWT signing secret and a DB connection string; both
# are here, and both are reachable more easily than they should be.
# ---------------------------------------------------------------------------

# The application CMK. Used by the avatars bucket and the reporting database.
#
# !! GAP: automatic annual key rotation is disabled.
resource "aws_kms_key" "app" {
  description             = "${local.name} application data key"
  enable_key_rotation     = false
  deletion_window_in_days = 7

  tags = {
    Name     = "${local.name}-app-key"
    Insecure = "key-rotation-disabled"
  }
}

resource "aws_kms_alias" "app" {
  name          = "alias/${local.name}-app"
  target_key_id = aws_kms_key.app.key_id
}

# !! GAP: a second key whose *key policy* names a wildcard principal, so the
# key material is usable by anyone who can reach the API.
resource "aws_kms_key" "shared_legacy" {
  description             = "${local.name} legacy shared key"
  enable_key_rotation     = false
  deletion_window_in_days = 7

  policy = jsonencode({
    Version = "2012-10-17"
    Id      = "legacy-open-key-policy"
    Statement = [
      {
        Sid       = "RootAccess"
        Effect    = "Allow"
        Principal = { AWS = "arn:aws:iam::${local.account_id}:root" }
        Action    = "kms:*"
        Resource  = "*"
      },
      {
        Sid       = "AnyoneCanUse"
        Effect    = "Allow"
        Principal = "*"
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey",
        ]
        Resource = "*"
      },
    ]
  })

  tags = {
    Name     = "${local.name}-legacy-key"
    Insecure = "kms-key-policy-wildcard-principal"
  }
}

resource "aws_kms_alias" "shared_legacy" {
  name          = "alias/${local.name}-legacy-shared"
  target_key_id = aws_kms_key.shared_legacy.key_id
}

# ===========================================================================
# Secrets Manager
# ===========================================================================

# !! GAP: no rotation configured, and encrypted with the default AWS-managed
# key rather than a CMK the account controls.
resource "aws_secretsmanager_secret" "jwt" {
  name                    = "${local.name}/server/jwt-secret"
  description             = "HS256 signing key for ShopPal access + refresh tokens"
  recovery_window_in_days = 0

  tags = {
    Name     = "${local.name}-jwt-secret"
    Insecure = "no-rotation"
  }
}

resource "aws_secretsmanager_secret_version" "jwt" {
  secret_id = aws_secretsmanager_secret.jwt.id
  secret_string = jsonencode({
    JWT_SECRET = "b7f3c1d9e2a84f60b5c7d8e9f0a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3"
  })
}

resource "aws_secretsmanager_secret" "db_credentials" {
  name                    = "${local.name}/rds/master-credentials"
  description             = "Master credentials for the ShopPal Postgres primary"
  recovery_window_in_days = 0

  tags = {
    Name     = "${local.name}-db-credentials"
    Insecure = "no-rotation,resource-policy-wildcard"
  }
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = aws_secretsmanager_secret.db_credentials.id
  secret_string = jsonencode({
    engine   = "postgres"
    host     = local.db_primary_address
    port     = 5432
    dbname   = "shoppal"
    username = local.db_master_username
    password = local.db_master_password
  })
}

# !! GAP: a resource policy on the secret with a wildcard principal - anyone
# who can call the API can read the database master password.
resource "aws_secretsmanager_secret_policy" "db_credentials" {
  secret_arn = aws_secretsmanager_secret.db_credentials.arn

  # The console-side "block public policy" check is bypassed deliberately.
  block_public_policy = false

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "AnyoneCanRead"
      Effect    = "Allow"
      Principal = { AWS = "*" }
      Action    = "secretsmanager:GetSecretValue"
      Resource  = "*"
    }]
  })
}

# ===========================================================================
# SSM Parameter Store
# ===========================================================================

# Correctly stored config - not a secret, so String is the right type.
resource "aws_ssm_parameter" "client_url" {
  name  = "/${local.name}/server/CLIENT_PROD_URL"
  type  = "String"
  value = "https://shop.example.com"

  tags = { Expected = "true" }
}

resource "aws_ssm_parameter" "admin_url" {
  name  = "/${local.name}/server/ADMIN_PROD_URL"
  type  = "String"
  value = "https://admin.shop.example.com"

  tags = { Expected = "true" }
}

# !! GAP: a database password stored as a plaintext `String` parameter instead
# of `SecureString`. Readable by anything with ssm:GetParameter, unencrypted,
# and it shows up in CloudTrail request logs.
resource "aws_ssm_parameter" "db_password_plaintext" {
  name        = "/${local.name}/server/DB_PASSWORD"
  description = "Postgres master password"
  type        = "String"
  value       = local.db_master_password

  tags = {
    Insecure = "plaintext-secret-in-parameter-store"
  }
}

# !! GAP: static IAM credentials for the service account, also in plaintext.
resource "aws_ssm_parameter" "aws_key_plaintext" {
  name        = "/${local.name}/server/AWS_SECRET_ACCESS_KEY"
  description = "S3 upload credentials for the server service"
  type        = "String"
  value       = aws_iam_access_key.app_service_account.secret

  tags = {
    Insecure = "plaintext-iam-key-in-parameter-store"
  }
}

# Done properly, for contrast.
resource "aws_ssm_parameter" "support_db_url_secure" {
  name   = "/${local.name}/support/DATABASE_URL"
  type   = "SecureString"
  key_id = aws_kms_key.app.key_id
  value  = "postgres://${local.db_master_username}:${local.db_master_password}@${local.db_primary_address}:5432/shoppal?sslmode=require"

  tags = { Expected = "true" }
}
