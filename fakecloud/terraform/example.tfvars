# Copy to terraform.tfvars to override defaults. ./fakecloud.sh passes
# fakecloud_endpoint and region on the command line, so you rarely need this.

# fakecloud_endpoint = "http://127.0.0.1:4566"
# region             = "us-east-1"
# project            = "shoppal"
# environment        = "prod"

# Unique bucket names per run instead of stable ones.
# bucket_suffix = "run7"

# Skip the decoy objects (leaked .env, DB dump, SSH key).
# seed_bucket_objects = false
