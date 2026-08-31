resource "aws_iam_role" "app_role" {
  name = "${var.project_name}-app-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        # Wildcard principal lets any AWS account (or anonymous, for some
        # principal types) assume this role.
        Principal = {
          AWS = "*"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

# Overly permissive policy granting full admin access instead of the
# least-privilege permissions the app actually needs.
resource "aws_iam_policy" "app_policy" {
  name        = "${var.project_name}-app-policy"
  description = "Permissions for ShopPal app servers"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "FullAdminAccess"
        Effect   = "Allow"
        Action   = "*"
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "app_attach" {
  role       = aws_iam_role.app_role.name
  policy_arn = aws_iam_policy.app_policy.arn
}

resource "aws_iam_instance_profile" "app_profile" {
  name = "${var.project_name}-app-profile"
  role = aws_iam_role.app_role.name
}

# A long-lived IAM access key for a service user instead of using roles -
# creates a credential that can leak and never expires.
resource "aws_iam_user" "ci" {
  name = "${var.project_name}-ci-user"
}

resource "aws_iam_access_key" "ci" {
  user = aws_iam_user.ci.name
}

resource "aws_iam_user_policy" "ci_policy" {
  name = "${var.project_name}-ci-policy"
  user = aws_iam_user.ci.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = "*"
        Resource = "*"
      }
    ]
  })
}
