resource "aws_db_subnet_group" "main" {
  name       = "${var.project_name}-db-subnet-group"
  subnet_ids = [aws_subnet.public_a.id, aws_subnet.public_b.id]

  tags = {
    Name = "${var.project_name}-db-subnet-group"
  }
}

resource "aws_db_instance" "main" {
  identifier     = "${var.project_name}-db"
  engine         = "postgres"
  engine_version = "13.7"
  instance_class = "db.t3.micro"

  allocated_storage = 20

  db_name  = "shoppal"
  username = var.db_username
  password = var.db_password # hardcoded/plaintext credential, see variables.tf

  db_subnet_group_name  = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.db.id]

  # Exposes the database directly to the internet.
  publicly_accessible = true

  # No encryption at rest for the database storage.
  storage_encrypted = false

  # No deletion protection - the DB can be destroyed without safeguards.
  deletion_protection = false

  # Backups effectively disabled.
  backup_retention_period = 0

  # Single AZ, no multi-AZ failover.
  multi_az = false

  # Auto minor version upgrades disabled, and no IAM DB authentication.
  auto_minor_version_upgrade = false
  iam_database_authentication_enabled = false

  # Skips final snapshot on deletion, and logging/monitoring are left off.
  skip_final_snapshot = true

  tags = {
    Name = "${var.project_name}-db"
  }
}
