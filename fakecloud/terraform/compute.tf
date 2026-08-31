# ---------------------------------------------------------------------------
# EC2 + ELBv2: the compute the six ShopPal services would run on.
#
# One instance per service, plus a bastion and a forgotten "migration" box.
# The AMIs deliberately resolve to the oldest thing in the catalogue, so
# "instance running an end-of-life image" is itself a finding.
# ---------------------------------------------------------------------------

# !! GAP: the fleet is pinned to a 2017 Amazon Linux image. It is years past
# end-of-life and misses every kernel and OpenSSL fix since - "instance running
# an unsupported AMI" is a finding in its own right.
data "aws_ami" "amazon_linux" {
  owners      = ["137112412989"] # amazon
  most_recent = true

  filter {
    name   = "name"
    values = [var.ami_name_filter]
  }
}

# !! GAP: account-level EBS encryption-by-default is off, so any volume that
# doesn't explicitly opt in lands unencrypted.
resource "aws_ebs_encryption_by_default" "off" {
  enabled = false
}

# !! GAP: a key pair means long-lived SSH access, and the public half is
# checked into the repo. SSM Session Manager would leave no key to steal.
resource "aws_key_pair" "ops" {
  key_name = "${local.name}-ops"

  # Throwaway key generated for this fixture; the private half does not exist.
  public_key = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIHZ8kqE1sT7vQ2mN9pR4xW6yB0cD3fG5hJ7kL9mP1qSt shoppal-fakecloud"

  tags = {
    Name     = "${local.name}-ops"
    Insecure = "long-lived-ssh-key"
  }
}

locals {
  # Shared bootstrap for the app fleet.
  #
  # !! GAP: user_data is readable by anyone holding ec2:DescribeInstanceAttribute
  # and is stored unencrypted on the instance. Putting the DB password and a
  # static IAM key in it hands both to any principal with read-only EC2 access.
  app_user_data = <<-EOT
    #!/bin/bash
    set -euo pipefail

    cat >/etc/shoppal/server.env <<'ENV'
    NODE_ENV=production
    DB_CONNECTION_URL=postgres://${local.db_master_username}:${local.db_master_password}@${aws_db_instance.primary.address}:5432/shoppal
    JWT_SECRET=b7f3c1d9e2a84f60b5c7d8e9f0a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3
    AWS_ACCESS_KEY_ID=${aws_iam_access_key.app_service_account.id}
    AWS_SECRET_ACCESS_KEY=${aws_iam_access_key.app_service_account.secret}
    ENV

    docker run -d --restart=always --env-file /etc/shoppal/server.env \
      -p 3000:3000 shoppal/server:latest
  EOT

  instances = {
    client = {
      service       = "client"
      instance_type = "t3.small"
      subnet        = aws_subnet.public["a"].id
      public_ip     = true
      sg            = "app"
      encrypted     = true
      imdsv2        = true
      user_data     = null
      insecure      = ""
    }

    admin = {
      service       = "admin"
      instance_type = "t3.small"
      subnet        = aws_subnet.public["b"].id
      public_ip     = true
      sg            = "app"
      encrypted     = true
      imdsv2        = true
      user_data     = null
      insecure      = ""
    }

    # !! GAP: the core API sits in a *public* subnet with a public IP, runs on
    # an unencrypted root volume, allows IMDSv1 (so an SSRF in the Express app
    # can mint role credentials), and carries the DB password in user_data.
    server = {
      service       = "server"
      instance_type = "t3.medium"
      subnet        = aws_subnet.public["a"].id
      public_ip     = true
      sg            = "app"
      encrypted     = false
      imdsv2        = false
      user_data     = local.app_user_data
      insecure      = "public-ip,unencrypted-root,imdsv1-enabled,secrets-in-user-data"
    }

    support = {
      service       = "support"
      instance_type = "t3.small"
      subnet        = aws_subnet.private["a"].id
      public_ip     = false
      sg            = "app"
      encrypted     = false
      imdsv2        = false
      user_data     = null
      insecure      = "unencrypted-root,imdsv1-enabled"
    }

    # The one that's done right: private subnet, encrypted volume, IMDSv2
    # required. A scanner that flags this is over-reporting.
    notifications = {
      service       = "notifications"
      instance_type = "t3.micro"
      subnet        = aws_subnet.private["b"].id
      public_ip     = false
      sg            = "app"
      encrypted     = true
      imdsv2        = true
      user_data     = null
      insecure      = ""
    }
  }
}

resource "aws_instance" "fleet" {
  for_each = local.instances

  ami           = data.aws_ami.amazon_linux.id
  instance_type = each.value.instance_type
  subnet_id     = each.value.subnet
  key_name      = aws_key_pair.ops.key_name

  vpc_security_group_ids      = [aws_security_group.app.id]
  associate_public_ip_address = each.value.public_ip
  iam_instance_profile        = aws_iam_instance_profile.app_instance.name

  user_data = each.value.user_data

  root_block_device {
    volume_size = 20
    volume_type = "gp3"
    encrypted   = each.value.encrypted
  }

  metadata_options {
    http_endpoint = "enabled"
    # "optional" == IMDSv1 permitted; "required" == IMDSv2 only.
    http_tokens = each.value.imdsv2 ? "required" : "optional"
  }

  monitoring = false

  tags = merge(
    {
      Name    = "${local.name}-${each.key}"
      Service = each.value.service
      Tier    = each.value.public_ip ? "public" : "private"
    },
    each.value.insecure != "" ? { Insecure = each.value.insecure } : { Expected = "true" },
  )
}

# !! GAP: SSH-from-anywhere bastion with an unencrypted root volume.
resource "aws_instance" "bastion" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.micro"
  subnet_id     = aws_subnet.public["a"].id
  key_name      = aws_key_pair.ops.key_name

  vpc_security_group_ids      = [aws_security_group.bastion.id]
  associate_public_ip_address = true
  iam_instance_profile        = aws_iam_instance_profile.bastion.name

  root_block_device {
    volume_size = 8
    volume_type = "gp3"
    encrypted   = false
  }

  metadata_options {
    http_endpoint = "enabled"
    http_tokens   = "required"
  }

  tags = {
    Name     = "${local.name}-bastion"
    Service  = "bastion"
    Tier     = "public"
    Insecure = "ssh-open-to-world,unencrypted-root"
  }
}

# !! GAP: the worst box in the estate. Every port open to the internet, admin
# instance profile, IMDSv1, unencrypted, and nobody remembers it exists.
resource "aws_instance" "legacy_migration" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t2.medium"
  subnet_id     = aws_subnet.public["b"].id
  key_name      = aws_key_pair.ops.key_name

  vpc_security_group_ids      = [aws_security_group.legacy_allow_all.id]
  associate_public_ip_address = true
  iam_instance_profile        = aws_iam_instance_profile.app_instance.name

  root_block_device {
    volume_size = 30
    volume_type = "gp2"
    encrypted   = false
  }

  metadata_options {
    http_endpoint = "enabled"
    http_tokens   = "optional"
  }

  tags = {
    Name     = "${local.name}-legacy-migration"
    Service  = "unknown"
    Tier     = "public"
    Owner    = "unassigned"
    Insecure = "all-ports-open,admin-instance-profile,imdsv1-enabled,unencrypted-root,eol-ami"
    Note     = "spun up for the 2023 data migration, never terminated"
  }
}

# !! GAP (asset hygiene): an unattached, unencrypted volume holding a copy of
# the database directory. Detached storage is a common blind spot.
resource "aws_ebs_volume" "orphaned_db_copy" {
  availability_zone = local.azs[0]
  size              = 100
  type              = "gp2"
  encrypted         = false

  tags = {
    Name     = "${local.name}-pgdata-snapshot-restore"
    Insecure = "unattached-unencrypted-volume"
    Note     = "restore target from the 2025-04 incident"
  }
}

# ---------------------------------------------------------------------------
# Application Load Balancer
# ---------------------------------------------------------------------------

# !! GAP: internet-facing with no HTTPS listener, no access logs and no
# deletion protection. Everything - including the JWT in the Authorization
# header - crosses the internet in cleartext.
resource "aws_lb" "public" {
  name               = "${local.name}-alb"
  load_balancer_type = "application"
  internal           = false
  security_groups    = [aws_security_group.alb.id]
  subnets            = [for s in aws_subnet.public : s.id]

  enable_deletion_protection = false
  drop_invalid_header_fields = false

  tags = {
    Name     = "${local.name}-alb"
    Insecure = "http-only-listener,no-access-logs,no-deletion-protection"
  }
}

resource "aws_lb_target_group" "server" {
  name     = "${local.name}-tg-server"
  port     = 3000
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id

  health_check {
    path                = "/ready"
    matcher             = "200"
    interval            = 30
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }

  tags = { Name = "${local.name}-tg-server" }
}

resource "aws_lb_target_group" "support" {
  name     = "${local.name}-tg-support"
  port     = 8081
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id

  health_check {
    path    = "/readyz"
    matcher = "200"
  }

  tags = { Name = "${local.name}-tg-support" }
}

# !! GAP: port 80 only. No listener on 443, and no redirect to it.
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.public.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.server.arn
  }
}

resource "aws_lb_listener_rule" "support" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 100

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.support.arn
  }

  condition {
    path_pattern {
      values = ["/support/*", "/tickets/*"]
    }
  }
}
