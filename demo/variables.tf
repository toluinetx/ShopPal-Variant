variable "aws_region" {
  description = "AWS region to deploy ShopPal demo infra into"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Name prefix for resources"
  type        = string
  default     = "shoppal-demo"
}

variable "db_username" {
  description = "Master username for the RDS instance"
  type        = string
  default     = "shoppal_admin"
}

# Hardcoded default secret committed to source control - a classic
# secrets-management weakness that KICS/secret scanners flag.
variable "db_password" {
  description = "Master password for the RDS instance"
  type        = string
  default     = "SuperSecret123!"
}

variable "ssh_key_name" {
  description = "EC2 key pair name"
  type        = string
  default     = "shoppal-demo-key"
}
