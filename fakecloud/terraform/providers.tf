# ---------------------------------------------------------------------------
# Provider wiring.
#
# Every service endpoint is pinned at the local emulator. Credentials are the
# well-known dummy pair, and all three credential/metadata lookups that would
# otherwise reach out to 169.254.169.254 or sts.amazonaws.com are disabled.
# ---------------------------------------------------------------------------

provider "aws" {
  region = var.region

  # Dummy credentials. The emulator accepts anything; these are the canonical
  # placeholder values so nothing here resembles a real key.
  access_key = "test"
  secret_key = "test"

  # Don't call the real STS / IMDS / EC2 metadata services.
  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_requesting_account_id  = true
  skip_region_validation      = true

  # The emulator serves S3 on the same host:port as everything else, so
  # virtual-host style addressing (bucket.s3.amazonaws.com) can't work.
  s3_use_path_style = true

  default_tags {
    tags = local.common_tags
  }

  endpoints {
    acm            = var.fakecloud_endpoint
    cloudtrail     = var.fakecloud_endpoint
    cloudwatch     = var.fakecloud_endpoint
    cloudwatchlogs = var.fakecloud_endpoint
    dynamodb       = var.fakecloud_endpoint
    ec2            = var.fakecloud_endpoint
    ecr            = var.fakecloud_endpoint
    elbv2          = var.fakecloud_endpoint
    events         = var.fakecloud_endpoint
    iam            = var.fakecloud_endpoint
    kms            = var.fakecloud_endpoint
    lambda         = var.fakecloud_endpoint
    rds            = var.fakecloud_endpoint
    route53        = var.fakecloud_endpoint
    s3             = var.fakecloud_endpoint
    secretsmanager = var.fakecloud_endpoint
    sns            = var.fakecloud_endpoint
    sqs            = var.fakecloud_endpoint
    ssm            = var.fakecloud_endpoint
    sts            = var.fakecloud_endpoint
  }
}

data "aws_caller_identity" "current" {}

locals {
  account_id = data.aws_caller_identity.current.account_id
}
