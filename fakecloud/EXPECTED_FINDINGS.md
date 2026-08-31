# Expected findings

Every misconfiguration in the fakecloud is deliberate and listed here, so you
can score a scanner against a known answer key: anything in this table that it
misses is a **false negative**, and anything it reports that's marked
*expected-clean* at the bottom is a **false positive**.

Severities are one plausible triage, not gospel — adjust them to your own
scoring model. Each row names the Terraform resource so you can trace a finding
back to the code that produced it, and the API call a scanner would use to see
it.

**Total: 56 seeded findings across 17 AWS services, plus 9 expected-clean controls**
(10 critical, 20 high, 17 medium, 9 low / asset hygiene).

---

## Critical

| # | Finding | Resource | Seen via |
|---|---------|----------|----------|
| 1 | RDS Postgres primary is `PubliclyAccessible` and its security group allows `0.0.0.0/0:5432` | `aws_db_instance.primary`, `aws_security_group.database` | `rds:DescribeDBInstances`, `ec2:DescribeSecurityGroups` |
| 2 | S3 bucket policy grants `s3:*` to `Principal: "*"` — the "public" image bucket is anonymously **writable and deletable**, not just readable | `aws_s3_bucket_policy.product_images` | `s3:GetBucketPolicy` |
| 3 | A production `.env` with DB password, JWT secret and IAM keys sits in that anonymously-readable bucket | `aws_s3_object.leaked_env` | `s3:ListBucket` + `s3:GetObject` |
| 4 | Unencrypted `pg_dump` containing customer PII and bcrypt hashes, in a bucket any AWS principal can read | `aws_s3_object.db_dump`, `aws_s3_bucket_policy.db_backups` | `s3:GetObject` |
| 5 | IAM role trust policy allows `Principal: {"AWS": "*"}` with no external ID — any AWS account can assume it, and it carries admin | `aws_iam_role.third_party_monitoring` | `iam:GetRole` |
| 6 | Security group opens **all ports, all protocols** to `0.0.0.0/0` on an internet-facing instance holding an admin instance profile | `aws_security_group.legacy_allow_all`, `aws_instance.legacy_migration` | `ec2:DescribeSecurityGroups`, `ec2:DescribeInstances` |
| 7 | Secrets Manager resource policy lets `Principal: {"AWS": "*"}` call `GetSecretValue` on the DB master credentials | `aws_secretsmanager_secret_policy.db_credentials` | `secretsmanager:GetResourcePolicy` |
| 8 | Customer-managed IAM policy grants `Action: "*"` on `Resource: "*"`, attached to a user, a group and a Lambda role | `aws_iam_policy.god_mode` | `iam:GetPolicyVersion` |
| 9 | Lambda function is anonymously invokable (`lambda:InvokeFunction` to `Principal: "*"`) | `aws_lambda_permission.public_invoke` | `lambda:GetPolicy` |
| 10 | A private SSH key is stored as an S3 object | `aws_s3_object.stray_ssh_key` | `s3:GetObject` |

## High

| # | Finding | Resource | Seen via |
|---|---------|----------|----------|
| 11 | RDS primary storage is unencrypted at rest | `aws_db_instance.primary` | `rds:DescribeDBInstances` |
| 12 | RDS primary has automated backups disabled (`BackupRetentionPeriod = 0`) | `aws_db_instance.primary` | `rds:DescribeDBInstances` |
| 13 | Both RDS instances have deletion protection off | `aws_db_instance.primary`, `.reporting` | `rds:DescribeDBInstances` |
| 14 | SSH (22) open to `0.0.0.0/0` **and** `::/0` on the bastion | `aws_security_group.bastion` | `ec2:DescribeSecurityGroups` |
| 15 | Lambda environment variables carry the DB connection string, JWT secret and a static IAM secret key | `aws_lambda_function.thumbnailer` | `lambda:GetFunctionConfiguration` |
| 16 | EC2 `user_data` embeds the DB password and static IAM credentials — readable with read-only EC2 access | `aws_instance.fleet["server"]` | `ec2:DescribeInstanceAttribute` |
| 17 | DB master password stored as a plaintext SSM `String` parameter instead of `SecureString` | `aws_ssm_parameter.db_password_plaintext` | `ssm:GetParameter` |
| 18 | IAM secret access key stored as a plaintext SSM `String` parameter | `aws_ssm_parameter.aws_key_plaintext` | `ssm:GetParameter` |
| 19 | `iam:PassRole` on `Resource: "*"` combined with `ec2:RunInstances` — a privilege-escalation primitive | `aws_iam_policy.pass_role_wildcard` | `iam:GetPolicyVersion` |
| 20 | SQS queue carrying order PII has a policy allowing `sqs:*` to `Principal: "*"` | `aws_sqs_queue_policy.order_events` | `sqs:GetQueueAttributes` |
| 21 | SNS topic allows anyone to publish **and** subscribe — ticket contents leak, forged notifications fan out | `aws_sns_topic_policy.ticket_notifications` | `sns:GetTopicAttributes` |
| 22 | ECR repository policy grants push (`PutImage`, `UploadLayerPart`) to `Principal: "*"` — production images are overwritable | `aws_ecr_repository_policy.server_public` | `ecr:GetRepositoryPolicy` |
| 23 | KMS key policy names `Principal: "*"` for `Encrypt`/`Decrypt` | `aws_kms_key.shared_legacy` | `kms:GetKeyPolicy` |
| 24 | ALB is internet-facing with an HTTP-only listener — JWTs cross the internet in cleartext, though a matching ACM cert exists and is unused | `aws_lb_listener.http`, `aws_acm_certificate.shop` | `elasticloadbalancing:DescribeListeners` |
| 25 | Public S3 bucket has a world-readable ACL (`AllUsers: READ`) *and* all four public-access blocks disabled | `aws_s3_bucket_acl.product_images`, `aws_s3_bucket_public_access_block.product_images` | `s3:GetBucketAcl`, `s3:GetPublicAccessBlock` |
| 26 | Terraform state containing a `sensitive` DB password sits in a bucket with no encryption and no versioning | `aws_s3_object.tf_state_blob`, `aws_s3_bucket.tf_state` | `s3:GetObject` |
| 27 | Backup and state buckets have no server-side encryption configured | `aws_s3_bucket.db_backups`, `.tf_state` | `s3:GetBucketEncryption` |
| 28 | Dormant contractor IAM user, never offboarded, with an active key and account-wide secret-read rights | `aws_iam_user.contractor` | `iam:ListUsers`, `iam:ListAccessKeys` |
| 29 | Core API instance runs in a **public** subnet with a public IP | `aws_instance.fleet["server"]` | `ec2:DescribeInstances` |
| 30 | Postgres endpoint published in public DNS as `db.shoppal-demo.example.com` | `aws_route53_record.db_public_cname` | `route53:ListResourceRecordSets` |

## Medium

| # | Finding | Resource | Seen via |
|---|---------|----------|----------|
| 31 | IMDSv1 permitted (`HttpTokens: optional`) on three instances — an SSRF in the app mints role credentials | `aws_instance.fleet["server"]`, `["support"]`, `aws_instance.legacy_migration` | `ec2:DescribeInstances` |
| 32 | Unencrypted EBS root volumes on four instances | `aws_instance.fleet["server"]`, `["support"]`, `.bastion`, `.legacy_migration` | `ec2:DescribeVolumes` |
| 33 | Account-level EBS encryption-by-default is off | `aws_ebs_encryption_by_default.off` | `ec2:GetEbsEncryptionByDefault` |
| 34 | Two simultaneously active access keys on one IAM user — an unfinished rotation | `aws_iam_access_key.ci_deployer_primary`, `.ci_deployer_stale` | `iam:ListAccessKeys` |
| 35 | No IAM user has an MFA device | all `aws_iam_user` | `iam:ListMFADevices` |
| 36 | Account password policy is 6 chars, no complexity, no expiry, no reuse prevention | `aws_iam_account_password_policy.weak` | `iam:GetAccountPasswordPolicy` |
| 37 | Inline user policy grants `s3:*` on `*` — invisible to a scanner that only walks *attached* managed policies | `aws_iam_user_policy.app_service_account_inline` | `iam:ListUserPolicies` |
| 38 | Service account authenticates with a static access key instead of an instance role | `aws_iam_user.app_service_account` | `iam:ListAccessKeys` |
| 39 | CloudTrail is single-region, with log file validation off and no data-event selectors — S3 object reads are never recorded | `aws_cloudtrail.main` | `cloudtrail:DescribeTrails`, `GetEventSelectors` |
| 40 | No VPC flow logs anywhere in the account | *(absence)* | `ec2:DescribeFlowLogs` |
| 41 | KMS key rotation disabled on both CMKs | `aws_kms_key.app`, `.shared_legacy` | `kms:GetKeyRotationStatus` |
| 42 | Neither Secrets Manager secret has rotation configured | `aws_secretsmanager_secret.jwt`, `.db_credentials` | `secretsmanager:DescribeSecret` |
| 43 | RDS parameter group sets `rds.force_ssl = 0` and disables statement logging | `aws_db_parameter_group.postgres16` | `rds:DescribeDBParameters` |
| 44 | DB subnet group includes the public subnets, which is what makes `publicly_accessible` bite | `aws_db_subnet_group.main` | `rds:DescribeDBSubnetGroups` |
| 45 | Node.js debug port 9229 open to `0.0.0.0/0` on the app tier | `aws_security_group.app` | `ec2:DescribeSecurityGroups` |
| 46 | ECR repositories use mutable tags with `scanOnPush` disabled | `aws_ecr_repository.service` | `ecr:DescribeRepositories` |
| 47 | Lambda runs the end-of-life `nodejs16.x` runtime with no DLQ and no reserved concurrency | `aws_lambda_function.thumbnailer` | `lambda:GetFunctionConfiguration` |

## Low / asset hygiene

These test *inventory* rather than misconfiguration — orphaned resources that
cost money and widen the attack surface without appearing in any deployment.

| # | Finding | Resource | Seen via |
|---|---------|----------|----------|
| 48 | Security group attached to nothing, opening RDP (3389) to the world on a Linux-only estate | `aws_security_group.unused_rdp` | `ec2:DescribeSecurityGroups` |
| 49 | Unattached, unencrypted 100 GB EBS volume holding a database restore | `aws_ebs_volume.orphaned_db_copy` | `ec2:DescribeVolumes` |
| 50 | Allocated Elastic IP associated with nothing | `aws_eip.orphaned` | `ec2:DescribeAddresses` |
| 51 | Untracked "legacy migration" instance with no owner tag, running since 2023 | `aws_instance.legacy_migration` | `ec2:DescribeInstances` |
| 52 | Log groups with `retention_in_days = 0` (never expire) and no KMS encryption | `aws_cloudwatch_log_group.service` | `logs:DescribeLogGroups` |
| 53 | Network ACL on the private subnets allows all traffic from `0.0.0.0/0` | `aws_network_acl.permissive` | `ec2:DescribeNetworkAcls` |
| 54 | Public subnets set `map_public_ip_on_launch = true` | `aws_subnet.public` | `ec2:DescribeSubnets` |
| 55 | Bastion advertised in public DNS | `aws_route53_record.bastion` | `route53:ListResourceRecordSets` |
| 56 | Whole fleet boots a 2017 Amazon Linux AMI, years past end of life | `data.aws_ami.amazon_linux` | `ec2:DescribeInstances` + `DescribeImages` |

---

## Expected-clean controls (false-positive checks)

An estate where *everything* is broken doesn't test precision. These resources
are configured correctly and are tagged `Expected = "true"`. **A scanner that
reports any of them is over-reporting.**

| Resource | Why it's fine |
|----------|---------------|
| `aws_security_group.alb` | 80/443 from `0.0.0.0/0` is the entire purpose of a public ALB |
| `aws_s3_bucket.user_avatars` | All four public-access blocks on, KMS-encrypted, versioned |
| `aws_instance.fleet["notifications"]` | Private subnet, no public IP, encrypted root, IMDSv2 required |
| `aws_iam_policy.avatars_readwrite` | Scoped to one bucket and one prefix, with a `s3:prefix` condition |
| `aws_iam_role.bastion` | Trust limited to `ec2.amazonaws.com`; inline policy is SSM session only |
| `aws_ssm_parameter.support_db_url_secure` | `SecureString` encrypted with a CMK |
| `aws_sqs_queue.support_events` | SSE with a CMK, plus a dead-letter queue |
| `aws_sns_topic.ops_alerts` | KMS-encrypted; its only wildcard principal is AWS's default policy, **scoped by an `AWS:SourceOwner` condition** — a naive principal-only match reports this, a correct one doesn't |
| `aws_cloudwatch_log_group.service["alb"]` | 30-day retention, KMS-encrypted |

The `ops_alerts` topic is the sharpest of these: matching on `Principal: "*"`
without reading the `Condition` block is a common scanner bug, and this row
catches it.

---

## Tag conventions

Every deliberately broken resource carries an `Insecure` tag naming the
weakness, and every control carries `Expected = "true"`. Both are visible over
the API, so you can build an automated scorecard:

```bash
aws --endpoint-url http://127.0.0.1:4566 ec2 describe-instances \
  --query 'Reservations[].Instances[].[Tags[?Key==`Name`]|[0].Value,Tags[?Key==`Insecure`]|[0].Value]' \
  --output text
```

Every resource also carries `Simulation = "true"` and
`Fakecloud = "shoppal-fakecloud"`, so nothing here can be confused with a real
asset.
