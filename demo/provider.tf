terraform {
  required_version = ">= 1.3.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # No backend encryption configured, and state would be stored locally
  # by default (fine for a demo, flagged as a weakness by some scanners
  # when paired with sensitive values in state).
}

provider "aws" {
  region = var.aws_region

  # Hardcoded static credentials instead of using an IAM role / profile.
  access_key = "AKIAIOSFODNN7EXAMPLE"
  secret_key = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
}
