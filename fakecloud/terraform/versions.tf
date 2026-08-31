# ---------------------------------------------------------------------------
# Terraform / provider pinning for the ShopPal "fakecloud".
#
# This root module NEVER talks to real AWS. Every AWS API call is redirected
# to a local emulator (see providers.tf). See ../README.md before running.
# ---------------------------------------------------------------------------

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.100"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.4"
    }
  }
}
