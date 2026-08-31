resource "aws_instance" "app" {
  ami                    = "ami-0c55b159cbfafe1f0"
  instance_type          = "t3.micro"
  subnet_id              = aws_subnet.public_a.id
  vpc_security_group_ids = [aws_security_group.app.id]
  key_name               = var.ssh_key_name

  associate_public_ip_address = true

  # IMDSv1 left enabled (no http_tokens = "required") - vulnerable to SSRF
  # based credential theft (KICS: EC2 Instance Metadata Service Version 1
  # Enabled / IMDS Not Required Token).
  metadata_options {
    http_endpoint = "enabled"
    http_tokens   = "optional"
  }

  root_block_device {
    volume_size = 20
    volume_type = "gp3"
    # Root volume left unencrypted.
    encrypted = false
  }

  # Secrets embedded directly in plaintext user data instead of a secrets
  # manager / parameter store.
  user_data = <<-EOF
    #!/bin/bash
    export DB_PASSWORD="SuperSecret123!"
    export API_KEY="REPLACE_WITH_REAL_PAYMENT_API_KEY_0000000000"
    echo "Starting ShopPal app server..."
  EOF

  # Detailed monitoring disabled.
  monitoring = false

  tags = {
    Name = "${var.project_name}-app-server"
  }
}

resource "aws_ebs_volume" "app_data" {
  availability_zone = "${var.aws_region}a"
  size              = 50

  # Additional data volume also left unencrypted.
  encrypted = false

  tags = {
    Name = "${var.project_name}-app-data"
  }
}
