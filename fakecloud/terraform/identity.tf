# ---------------------------------------------------------------------------
# IAM: humans, service accounts, roles and policies.
#
# This is where a traversal-style scanner earns its keep - the interesting
# findings here aren't single bad resources but reachable *paths* (a leaked
# key -> a user -> an over-broad policy -> the backup bucket).
# ---------------------------------------------------------------------------

# !! GAP: a password policy well below any recognised baseline - short
# passwords, no complexity, no rotation, and users may not rotate their own.
resource "aws_iam_account_password_policy" "weak" {
  minimum_password_length        = 6
  require_uppercase_characters   = false
  require_lowercase_characters   = false
  require_numbers                = false
  require_symbols                = false
  allow_users_to_change_password = false
  max_password_age               = 0
  password_reuse_prevention      = 0
}

# ===========================================================================
# Policies
# ===========================================================================

# !! GAP: full administrative access expressed as a customer-managed policy,
# then attached directly to a human user and to an EC2 role.
resource "aws_iam_policy" "god_mode" {
  name        = "${local.name}-deploy-everything"
  description = "Deployment policy for CI"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid      = "AllowEverything"
      Effect   = "Allow"
      Action   = "*"
      Resource = "*"
    }]
  })

  tags = { Insecure = "wildcard-action-and-resource" }
}

# !! GAP: iam:PassRole on every role, combined with ec2:RunInstances, is a
# textbook privilege-escalation primitive.
resource "aws_iam_policy" "pass_role_wildcard" {
  name        = "${local.name}-launch-workers"
  description = "Lets the worker fleet scale itself"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "iam:PassRole",
        "ec2:RunInstances",
        "ec2:CreateTags",
      ]
      Resource = "*"
    }]
  })

  tags = { Insecure = "passrole-wildcard-privesc" }
}

# !! GAP: unrestricted access to every secret in the account.
resource "aws_iam_policy" "read_all_secrets" {
  name        = "${local.name}-read-secrets"
  description = "Application secret access"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "secretsmanager:GetSecretValue",
        "secretsmanager:ListSecrets",
        "ssm:GetParameter",
        "ssm:GetParameters",
        "ssm:GetParametersByPath",
        "kms:Decrypt",
      ]
      Resource = "*"
    }]
  })

  tags = { Insecure = "unscoped-secret-access" }
}

# A properly scoped policy - the control case. Only the two prefixes the
# `server` service actually writes to, on one bucket.
resource "aws_iam_policy" "avatars_readwrite" {
  name        = "${local.name}-avatars-rw"
  description = "Scoped avatar upload access for the server service"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
        Resource = "${aws_s3_bucket.user_avatars.arn}/avatars/*"
      },
      {
        Effect   = "Allow"
        Action   = ["s3:ListBucket"]
        Resource = aws_s3_bucket.user_avatars.arn
        Condition = {
          StringLike = { "s3:prefix" = ["avatars/*"] }
        }
      },
    ]
  })

  tags = { Expected = "true" }
}

# ===========================================================================
# Human users
# ===========================================================================

resource "aws_iam_group" "engineers" {
  name = "${local.name}-engineers"
}

# !! GAP: the group carries admin rights, so every member inherits them.
resource "aws_iam_group_policy_attachment" "engineers_admin" {
  group      = aws_iam_group.engineers.name
  policy_arn = aws_iam_policy.god_mode.arn
}

# !! GAP: a long-lived human user with a static access key, admin rights (via
# both a direct attachment and the group) and no MFA device.
resource "aws_iam_user" "ci_deployer" {
  name = "${local.name}-ci-deployer"

  tags = {
    Name     = "${local.name}-ci-deployer"
    Owner    = "platform-team"
    Insecure = "admin-user,static-key,no-mfa"
  }
}

resource "aws_iam_user_group_membership" "ci_deployer" {
  user   = aws_iam_user.ci_deployer.name
  groups = [aws_iam_group.engineers.name]
}

resource "aws_iam_user_policy_attachment" "ci_deployer_admin" {
  user       = aws_iam_user.ci_deployer.name
  policy_arn = aws_iam_policy.god_mode.arn
}

# !! GAP: two simultaneously active access keys for one identity - the second
# is almost always a rotation that was never finished.
resource "aws_iam_access_key" "ci_deployer_primary" {
  user = aws_iam_user.ci_deployer.name
}

resource "aws_iam_access_key" "ci_deployer_stale" {
  user = aws_iam_user.ci_deployer.name
}

# !! GAP: a contractor account that was never offboarded, still holding an
# active key and secret-read rights.
resource "aws_iam_user" "contractor" {
  name = "${local.name}-contractor-dana"

  tags = {
    Name     = "${local.name}-contractor-dana"
    Owner    = "unassigned"
    Insecure = "dormant-user,active-key,no-mfa"
    Note     = "engagement ended 2025-11; account never disabled"
  }
}

resource "aws_iam_access_key" "contractor" {
  user = aws_iam_user.contractor.name
}

resource "aws_iam_user_policy_attachment" "contractor_secrets" {
  user       = aws_iam_user.contractor.name
  policy_arn = aws_iam_policy.read_all_secrets.arn
}

# !! GAP: credentials handed to a service and embedded in config, rather than
# an instance role.
resource "aws_iam_user" "app_service_account" {
  name = "${local.name}-svc-server"

  tags = {
    Name     = "${local.name}-svc-server"
    Insecure = "service-account-with-static-key"
  }
}

resource "aws_iam_access_key" "app_service_account" {
  user = aws_iam_user.app_service_account.name
}

resource "aws_iam_user_policy_attachment" "app_service_account_scoped" {
  user       = aws_iam_user.app_service_account.name
  policy_arn = aws_iam_policy.avatars_readwrite.arn
}

# !! GAP: an inline user policy is easy to miss if a scanner only walks
# attached managed policies. This one grants s3:* on every bucket.
resource "aws_iam_user_policy" "app_service_account_inline" {
  name = "legacy-inline-s3"
  user = aws_iam_user.app_service_account.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid      = "LegacyBroadS3"
      Effect   = "Allow"
      Action   = "s3:*"
      Resource = "*"
    }]
  })
}

# ===========================================================================
# Roles
# ===========================================================================

# !! GAP: a trust policy that any AWS account can assume, with no external ID
# and no conditions. Cross-account takeover in one step.
resource "aws_iam_role" "third_party_monitoring" {
  name = "${local.name}-vendor-monitoring"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { AWS = "*" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = {
    Name     = "${local.name}-vendor-monitoring"
    Insecure = "assumable-by-any-principal"
    Note     = "set up for an APM trial, never scoped down"
  }
}

resource "aws_iam_role_policy_attachment" "third_party_monitoring" {
  role       = aws_iam_role.third_party_monitoring.name
  policy_arn = aws_iam_policy.god_mode.arn
}

# The app-tier instance role. Trust policy is correct (ec2.amazonaws.com only)
# but the permissions attached to it are far wider than the app needs.
resource "aws_iam_role" "app_instance" {
  name = "${local.name}-app-instance-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = { Name = "${local.name}-app-instance-role" }
}

resource "aws_iam_role_policy_attachment" "app_instance_secrets" {
  role       = aws_iam_role.app_instance.name
  policy_arn = aws_iam_policy.read_all_secrets.arn
}

resource "aws_iam_role_policy_attachment" "app_instance_passrole" {
  role       = aws_iam_role.app_instance.name
  policy_arn = aws_iam_policy.pass_role_wildcard.arn
}

resource "aws_iam_instance_profile" "app_instance" {
  name = "${local.name}-app-instance-profile"
  role = aws_iam_role.app_instance.name
}

# The bastion role, correctly minimal - another control case.
resource "aws_iam_role" "bastion" {
  name = "${local.name}-bastion-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = { Name = "${local.name}-bastion-role", Expected = "true" }
}

resource "aws_iam_role_policy" "bastion_ssm" {
  name = "ssm-session-only"
  role = aws_iam_role.bastion.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "ssmmessages:CreateControlChannel",
        "ssmmessages:CreateDataChannel",
        "ssmmessages:OpenControlChannel",
        "ssmmessages:OpenDataChannel",
      ]
      Resource = "*"
    }]
  })
}

resource "aws_iam_instance_profile" "bastion" {
  name = "${local.name}-bastion-profile"
  role = aws_iam_role.bastion.name
}

# Lambda execution role - over-broad, see serverless.tf.
resource "aws_iam_role" "lambda_exec" {
  name = "${local.name}-lambda-exec-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = { Name = "${local.name}-lambda-exec-role" }
}

# !! GAP: the thumbnailer only needs one bucket prefix; it gets everything.
resource "aws_iam_role_policy_attachment" "lambda_exec_admin" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = aws_iam_policy.god_mode.arn
}
