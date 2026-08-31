# ShopPal Demo Infrastructure (IaC Scan Target)

This folder contains **sample Terraform** for deploying the AWS infrastructure
ShopPal would need (network, compute, database, object storage, IAM).

> ⚠️ **This code is intentionally insecure.**
> It exists purely as a target for testing Infrastructure-as-Code scanning
> tools (KICS, Checkov, tfsec, etc.). It has **not** been applied or tested
> and must **never** be deployed to a real AWS account.

## Files

| File                  | Purpose                                             |
|-----------------------|------------------------------------------------------|
| `provider.tf`         | AWS provider + backend config                        |
| `variables.tf`        | Input variables (includes a hardcoded default secret) |
| `vpc.tf`              | VPC, subnets, route tables (no flow logs)             |
| `security_groups.tf`  | Security groups (open ingress rules)                  |
| `s3.tf`               | S3 buckets (public, unencrypted, unversioned)         |
| `rds.tf`              | RDS Postgres instance (unencrypted, public, weak creds)|
| `ec2.tf`              | EC2 app server (unencrypted EBS, IMDSv1, plaintext user data secret) |
| `iam.tf`              | IAM roles/policies (wildcard permissions)             |
| `cloudtrail.tf`       | CloudTrail (logging disabled / unencrypted)           |
| `outputs.tf`          | Terraform outputs                                     |

## Known/intentional weaknesses (for KICS to catch)

- S3 buckets with public ACLs, no default encryption, no versioning, no access logging
- Security groups allowing inbound `0.0.0.0/0` on SSH (22), RDP (3389) and the DB port
- RDS instance with `publicly_accessible = true`, `storage_encrypted = false`, hardcoded
  master password, no deletion protection, single-AZ, minimal backup retention
- EC2 instance with unencrypted root/EBS volume, IMDSv1 allowed (no
  `http_tokens = "required"`), a plaintext secret embedded in `user_data`
- IAM policy granting `Action = "*"` on `Resource = "*"`
- CloudTrail with logging disabled and no log file validation/encryption
- Hardcoded credentials/secrets committed directly in `.tf` files instead of
  a secrets manager
- No VPC flow logs enabled

Do not remediate these unless you're specifically asked to — the point of
this folder is to give a scanner something to find.
