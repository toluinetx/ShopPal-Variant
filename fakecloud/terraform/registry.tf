# ---------------------------------------------------------------------------
# ECR: where the six service images from docker-compose.yml would be pushed.
# ---------------------------------------------------------------------------

locals {
  ecr_repos = ["client", "admin", "server", "support", "notifications"]
}

# !! GAP: mutable tags mean `:latest` (and even a pinned `:v1.4.2`) can be
# silently replaced under a running deployment, and scan_on_push is off so
# vulnerable base layers are never surfaced.
resource "aws_ecr_repository" "service" {
  for_each = toset(local.ecr_repos)

  name                 = "${var.project}/${each.key}"
  image_tag_mutability = "MUTABLE"
  force_delete         = true

  image_scanning_configuration {
    scan_on_push = false
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = {
    Name     = "${var.project}/${each.key}"
    Service  = each.key
    Insecure = "mutable-tags,no-scan-on-push"
  }
}

# !! GAP: a repository policy granting pull *and push* to every principal.
# Anyone can overwrite the production server image.
resource "aws_ecr_repository_policy" "server_public" {
  repository = aws_ecr_repository.service["server"].name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "AnyoneCanPullAndPush"
      Effect    = "Allow"
      Principal = "*"
      Action = [
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:BatchCheckLayerAvailability",
        "ecr:PutImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload",
      ]
    }]
  })
}
