# ---------------------------------------------------------------------------
# RDS: the Postgres that ShopPal's `server` (TypeORM) and `support` (pgx)
# services both connect to.
#
# The primary is the single richest finding in the estate: internet-reachable,
# unencrypted, with backups off and deletion protection off.
# ---------------------------------------------------------------------------

resource "aws_db_subnet_group" "main" {
  name        = "${local.name}-db-subnets"
  description = "ShopPal Postgres subnet group"

  # !! GAP: the subnet group includes the *public* subnets. Combined with
  # publicly_accessible below, this is what actually puts the database on the
  # internet - a private-subnet-only group would neuter it.
  subnet_ids = concat(
    [for s in aws_subnet.private : s.id],
    [for s in aws_subnet.public : s.id],
  )

  tags = {
    Name     = "${local.name}-db-subnets"
    Insecure = "db-subnet-group-includes-public-subnets"
  }
}

# !! GAP: SSL is not enforced (rds.force_ssl = 0) and statement logging is off,
# so there's neither transport security nor a query audit trail.
resource "aws_db_parameter_group" "postgres16" {
  name        = "${local.name}-pg16-params"
  family      = "postgres16"
  description = "ShopPal Postgres 16 parameters"

  parameter {
    name  = "rds.force_ssl"
    value = "0"
  }

  parameter {
    name  = "log_statement"
    value = "none"
  }

  parameter {
    name  = "log_min_duration_statement"
    value = "-1"
  }

  tags = {
    Name     = "${local.name}-pg16-params"
    Insecure = "ssl-not-enforced,no-statement-logging"
  }
}

# !! GAP: the master password is a literal in version-controlled Terraform.
# It also matches the one leaked in the public bucket and the plaintext SSM
# parameter, so a scanner that correlates findings has a full credential path.
locals {
  db_master_username = "shoppal_admin"
  db_master_password = "Sup3rS3cret-Pg-2024"
}

resource "aws_db_instance" "primary" {
  count = var.enable_rds ? 1 : 0

  identifier     = "${local.name}-postgres"
  engine         = "postgres"
  engine_version = "16.3"
  instance_class = "db.t3.medium"

  db_name  = "shoppal"
  username = local.db_master_username
  password = local.db_master_password

  allocated_storage     = 100
  max_allocated_storage = 500
  storage_type          = "gp3"

  db_subnet_group_name   = aws_db_subnet_group.main.name
  parameter_group_name   = aws_db_parameter_group.postgres16.name
  vpc_security_group_ids = [aws_security_group.database.id]

  # !! GAP: reachable from outside the VPC.
  publicly_accessible = true

  # !! GAP: storage is not encrypted at rest, and no KMS key is attached.
  storage_encrypted = false

  # !! GAP: automated backups disabled entirely.
  backup_retention_period = 0

  # !! GAP: nothing stops an accidental (or malicious) delete.
  deletion_protection = false
  skip_final_snapshot = true

  # !! GAP: single-AZ for a production database.
  multi_az = false

  # !! GAP: no log exports, so Postgres logs never reach CloudWatch.
  # (enabled_cloudwatch_logs_exports intentionally omitted)

  # !! GAP: IAM database authentication off - only the static password works.
  iam_database_authentication_enabled = false

  # !! GAP: security patches will not be picked up automatically.
  auto_minor_version_upgrade = false

  # !! GAP: maintenance/patching window unset and Performance Insights off.
  performance_insights_enabled = false

  apply_immediately = true

  tags = {
    Name        = "${local.name}-postgres"
    Role        = "primary"
    DataClass   = "pii"
    Insecure    = "public,unencrypted,no-backups,no-deletion-protection,single-az"
    Description = "Primary Postgres for server + support services"
  }
}

# A second instance used by the analytics team. Better configured than the
# primary - encrypted and private - but still missing deletion protection, so
# it exercises "partially compliant" rather than "clean" or "terrible".
resource "aws_db_instance" "reporting" {
  count = var.enable_rds ? 1 : 0

  identifier     = "${local.name}-postgres-reporting"
  engine         = "postgres"
  engine_version = "16.3"
  instance_class = "db.t3.small"

  db_name  = "shoppal_reporting"
  username = "reporting_ro"
  password = "r3porting-read-only-2024"

  allocated_storage = 50
  storage_type      = "gp3"

  db_subnet_group_name   = aws_db_subnet_group.main.name
  parameter_group_name   = aws_db_parameter_group.postgres16.name
  vpc_security_group_ids = [aws_security_group.database.id]

  publicly_accessible     = false
  storage_encrypted       = true
  kms_key_id              = aws_kms_key.app.arn
  backup_retention_period = 7
  multi_az                = false

  # !! GAP: no deletion protection on a production-adjacent database.
  deletion_protection = false
  skip_final_snapshot = true

  apply_immediately = true

  tags = {
    Name        = "${local.name}-postgres-reporting"
    Role        = "reporting"
    DataClass   = "pii"
    Insecure    = "no-deletion-protection"
    Description = "Read-only reporting replica for the analytics team"
  }
}

# Everything that embeds the database hostname - user_data, Secrets Manager,
# SSM, the Lambda environment, the public DNS record - goes through these, so
# the estate keeps its shape when var.enable_rds is false.
locals {
  db_primary_address = var.enable_rds ? aws_db_instance.primary[0].address : "${local.name}-postgres.abcdefghijkl.${var.region}.rds.amazonaws.com"

  db_primary_endpoint = var.enable_rds ? aws_db_instance.primary[0].endpoint : "${local.db_primary_address}:5432"

  db_reporting_endpoint = var.enable_rds ? aws_db_instance.reporting[0].endpoint : "${local.name}-postgres-reporting.abcdefghijkl.${var.region}.rds.amazonaws.com:5432"
}
