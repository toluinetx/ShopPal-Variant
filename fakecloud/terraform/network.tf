# ---------------------------------------------------------------------------
# Networking: the VPC the ShopPal stack would live in.
#
# Two AZs, a public tier (ALB + bastion + the frontends) and a private tier
# (server / support / notifications / Postgres). Some of the security groups
# here are deliberately wide open - each one is marked with an `Insecure` tag
# and a `!! GAP` comment, and catalogued in ../EXPECTED_FINDINGS.md.
# ---------------------------------------------------------------------------

resource "aws_vpc" "main" {
  cidr_block           = "10.42.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = { Name = "${local.name}-vpc" }
}

# !! GAP: no aws_flow_log resource anywhere in this module. A VPC with no flow
# logs has no network-level audit trail.

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "${local.name}-igw" }
}

locals {
  azs = ["${var.region}a", "${var.region}b"]

  public_subnets = {
    "a" = { cidr = "10.42.1.0/24", az = local.azs[0] }
    "b" = { cidr = "10.42.2.0/24", az = local.azs[1] }
  }

  private_subnets = {
    "a" = { cidr = "10.42.11.0/24", az = local.azs[0] }
    "b" = { cidr = "10.42.12.0/24", az = local.azs[1] }
  }
}

resource "aws_subnet" "public" {
  for_each = local.public_subnets

  vpc_id            = aws_vpc.main.id
  cidr_block        = each.value.cidr
  availability_zone = each.value.az

  # !! GAP: auto-assign public IPv4 on the subnet means anything launched here
  # gets an internet-routable address whether or not it wanted one.
  map_public_ip_on_launch = true

  tags = {
    Name     = "${local.name}-public-${each.key}"
    Tier     = "public"
    Insecure = "map_public_ip_on_launch"
  }
}

resource "aws_subnet" "private" {
  for_each = local.private_subnets

  vpc_id            = aws_vpc.main.id
  cidr_block        = each.value.cidr
  availability_zone = each.value.az

  tags = {
    Name = "${local.name}-private-${each.key}"
    Tier = "private"
  }
}

resource "aws_eip" "nat" {
  domain = "vpc"
  tags   = { Name = "${local.name}-nat-eip" }
}

resource "aws_nat_gateway" "main" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public["a"].id
  depends_on    = [aws_internet_gateway.main]

  tags = { Name = "${local.name}-nat" }
}

# !! GAP (asset hygiene): an Elastic IP allocated and never associated with
# anything. Costs money, and inventory tools should flag it as an orphan.
resource "aws_eip" "orphaned" {
  domain = "vpc"

  tags = {
    Name     = "${local.name}-legacy-unused-eip"
    Insecure = "unassociated-eip"
    Note     = "left over from the 2023 migration"
  }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = { Name = "${local.name}-rt-public" }
}

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main.id
  }

  tags = { Name = "${local.name}-rt-private" }
}

resource "aws_route_table_association" "public" {
  for_each       = aws_subnet.public
  subnet_id      = each.value.id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "private" {
  for_each       = aws_subnet.private
  subnet_id      = each.value.id
  route_table_id = aws_route_table.private.id
}

# ---------------------------------------------------------------------------
# Security groups
# ---------------------------------------------------------------------------

# The ALB group is the one that's *correctly* configured: 80/443 from the
# internet is what a public load balancer is for. Useful as a control - a
# scanner that flags this as a finding is producing a false positive.
resource "aws_security_group" "alb" {
  name        = "${local.name}-alb-sg"
  description = "Public ALB: HTTP/HTTPS from the internet (expected)"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "HTTP from internet"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS from internet"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${local.name}-alb-sg", Expected = "true" }
}

# !! GAP: SSH open to the entire internet.
resource "aws_security_group" "bastion" {
  name        = "${local.name}-bastion-sg"
  description = "Bastion host"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "SSH from anywhere"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description      = "SSH from anywhere (IPv6)"
    from_port        = 22
    to_port          = 22
    protocol         = "tcp"
    ipv6_cidr_blocks = ["::/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name     = "${local.name}-bastion-sg"
    Insecure = "ssh-open-to-world"
  }
}

# The app tier group is mostly sane - traffic comes from the ALB - but it also
# carries a stray rule.
resource "aws_security_group" "app" {
  name        = "${local.name}-app-sg"
  description = "server / support / notifications app tier"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "server API from ALB"
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  ingress {
    description     = "support API from ALB"
    from_port       = 8081
    to_port         = 8081
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  ingress {
    description     = "notifications API from app tier"
    from_port       = 8082
    to_port         = 8082
    protocol        = "tcp"
    security_groups = [aws_security_group.bastion.id]
  }

  # !! GAP: someone opened the Node debug/inspect port to the world while
  # chasing a production bug and never closed it.
  ingress {
    description = "TEMP debug - remove me"
    from_port   = 9229
    to_port     = 9229
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name     = "${local.name}-app-sg"
    Insecure = "debug-port-open-to-world"
  }
}

# !! GAP: Postgres reachable from the entire internet.
resource "aws_security_group" "database" {
  name        = "${local.name}-db-sg"
  description = "Postgres"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "Postgres from app tier"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
  }

  ingress {
    description = "Postgres from anywhere - added for the BI tool trial"
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name     = "${local.name}-db-sg"
    Insecure = "postgres-open-to-world"
  }
}

# !! GAP: every port, every protocol, from everywhere. The worst possible
# security group, and exactly the kind of thing that survives in a real estate
# because it was "just for the migration".
resource "aws_security_group" "legacy_allow_all" {
  name        = "${local.name}-legacy-migration-sg"
  description = "Legacy migration box - temporary"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "everything"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name     = "${local.name}-legacy-migration-sg"
    Insecure = "all-ports-open-to-world"
  }
}

# !! GAP (asset hygiene): a security group attached to nothing. Also opens RDP,
# on a Linux-only estate.
resource "aws_security_group" "unused_rdp" {
  name        = "${local.name}-orphan-rdp-sg"
  description = "Unattached leftover"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "RDP from anywhere"
    from_port   = 3389
    to_port     = 3389
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name     = "${local.name}-orphan-rdp-sg"
    Insecure = "unused-sg-rdp-open"
  }
}

# ---------------------------------------------------------------------------
# Network ACLs
# ---------------------------------------------------------------------------

# !! GAP: a NACL whose ingress rule permits all traffic from 0.0.0.0/0,
# removing the subnet-level backstop behind the security groups.
resource "aws_network_acl" "permissive" {
  vpc_id     = aws_vpc.main.id
  subnet_ids = [for s in aws_subnet.private : s.id]

  ingress {
    protocol   = "-1"
    rule_no    = 100
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 0
    to_port    = 0
  }

  egress {
    protocol   = "-1"
    rule_no    = 100
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 0
    to_port    = 0
  }

  tags = {
    Name     = "${local.name}-private-nacl"
    Insecure = "nacl-allow-all"
  }
}
