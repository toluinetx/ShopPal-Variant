variable "fakecloud_endpoint" {
  description = <<-EOT
    Base URL of the local AWS API emulator. Must be a loopback or RFC1918
    address; anything else is rejected. Never point this at amazonaws.com.
  EOT
  type        = string
  default     = "http://127.0.0.1:4566"

  # This module creates deliberately vulnerable resources, so the guard has to
  # stop the run *before* the AWS provider is configured and starts making
  # calls. Variable validation is evaluated first and raises a hard error - a
  # `check` block would only emit a warning and let the apply proceed.
  validation {
    condition = can(regex(
      "^https?://(127\\.0\\.0\\.1|localhost|0\\.0\\.0\\.0|\\[::1\\]|host\\.docker\\.internal|10\\.|192\\.168\\.|172\\.(1[6-9]|2[0-9]|3[01])\\.)(:[0-9]+)?(/|$)",
      var.fakecloud_endpoint
    ))
    error_message = <<-EOT
      fakecloud_endpoint must be a local emulator address (loopback or RFC1918).
      This module creates deliberately insecure resources and must never be
      applied against a real AWS account.
    EOT
  }
}

variable "region" {
  description = "Region the fake estate pretends to live in."
  type        = string
  default     = "us-east-1"
}

variable "project" {
  description = "Name prefix applied to every resource and to the `Project` tag."
  type        = string
  default     = "shoppal"
}

variable "environment" {
  description = "Environment label for tags. This is a simulation, so 'prod' here is harmless."
  type        = string
  default     = "prod"
}

variable "bucket_suffix" {
  description = <<-EOT
    Suffix appended to S3 bucket names to keep them globally unique-looking.
    Leave empty to get a stable, predictable set of names (easier to assert on
    from a scanner's test suite); set it to get a fresh estate per apply.
  EOT
  type        = string
  default     = ""
}

variable "ami_name_filter" {
  description = <<-EOT
    Name pattern for the AMI the EC2 fleet boots from. The default resolves to
    a 2017-vintage Amazon Linux image that ships in the emulator's catalogue,
    which is deliberate: an end-of-life AMI is one of the findings.
  EOT
  type        = string
  default     = "amzn-ami-hvm-2017.09.1.20171103-x86_64-gp2"
}

variable "seed_bucket_objects" {
  description = <<-EOT
    Upload a handful of decoy objects (a leaked .env, a DB dump, an SSH key)
    into the buckets so scanners that inspect object contents, not just bucket
    configuration, have something to find.
  EOT
  type        = bool
  default     = true
}

locals {
  suffix = var.bucket_suffix != "" ? "-${var.bucket_suffix}" : ""
  name   = "${var.project}-${var.environment}"

  common_tags = {
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "terraform"
    # Loud, machine-readable marker so nobody ever mistakes these for real
    # assets and so a scanner's fixtures can filter on it.
    Simulation  = "true"
    Fakecloud   = "shoppal-fakecloud"
  }
}
