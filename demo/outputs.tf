output "vpc_id" {
  value = aws_vpc.main.id
}

output "app_instance_public_ip" {
  value = aws_instance.app.public_ip
}

output "db_endpoint" {
  value = aws_db_instance.main.endpoint
}

# Sensitive value output without marking it sensitive - the password would
# show up in plaintext in `terraform output` and CI logs.
output "db_password" {
  value = var.db_password
}

output "assets_bucket_name" {
  value = aws_s3_bucket.assets.bucket
}

output "ci_access_key_id" {
  value = aws_iam_access_key.ci.id
}

output "ci_secret_access_key" {
  value = aws_iam_access_key.ci.secret
}
