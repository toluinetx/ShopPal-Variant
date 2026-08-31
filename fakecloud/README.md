# ShopPal fakecloud

A simulated AWS account, provisioned with Terraform, modelling the
infrastructure ShopPal would run on if it were deployed to AWS instead of
Docker Compose. It exists to give a cloud security scanner something to
traverse: real AWS API responses, a realistic asset graph, and 56 deliberate,
documented security gaps to find.

**It does not touch the existing deployment.** Nothing here modifies
`docker-compose.yml`, `k8s/`, `deploy.sh`, or any service code — the fakecloud
runs beside them as a separate, self-contained thing you start and stop on its
own.

**It cannot reach real AWS.** Every AWS API call is redirected to a local
emulator, and the `fakecloud_endpoint` variable is validated to be a loopback
or RFC1918 address — anything else fails the plan before the AWS provider is
even configured.

---

## Quick start

```bash
cd fakecloud
./fakecloud.sh up
```

That will:

1. create a Python virtualenv in `fakecloud/.venv` and install the emulator
   (a one-off download of a few hundred MB),
2. start the AWS API emulator on `http://127.0.0.1:4566`,
3. `terraform apply` the estate — 136 resources, about two minutes, most of it
   waiting on the two RDS instances to report `available`.

Then point your scanner at it:

```bash
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=us-east-1
export AWS_ENDPOINT_URL=http://127.0.0.1:4566
```

`./fakecloud.sh env` prints exactly that. Credentials are ignored — the
emulator accepts any key and reports account `123456789012`.

### Commands

| Command | Effect |
|---------|--------|
| `./fakecloud.sh up` | Start the emulator and apply the estate |
| `./fakecloud.sh verify` | Walk the estate over the AWS API and print what's there |
| `./fakecloud.sh status` | Health check plus an inventory count |
| `./fakecloud.sh env` | Print the environment variables for your scanner |
| `./fakecloud.sh apply` | Re-apply after editing the Terraform |
| `./fakecloud.sh reset` | Wipe emulator state and rebuild from scratch |
| `./fakecloud.sh destroy` | `terraform destroy`, emulator stays up |
| `./fakecloud.sh down` | Stop the emulator (state is in-memory, so this discards everything) |

**Requirements:** `python3` (3.9+), `terraform` (or `tofu`) 1.5+, `curl`. No
Docker needed.

---

## What gets deployed

The estate mirrors ShopPal's actual six-service architecture — see
[`../ARCHITECTURE.md`](../ARCHITECTURE.md) — as it would look on AWS.

```
                      Route53  shoppal-demo.example.com
                          │
                          ▼
            ┌──────────── ALB (internet-facing, HTTP only) ────────────┐
            │                                                          │
   ┌────────┴────────┐  VPC 10.42.0.0/16                    ┌──────────┴────────┐
   │ public subnets  │                                      │  private subnets  │
   │  10.42.1-2.0/24 │                                      │ 10.42.11-12.0/24  │
   ├─────────────────┤                                      ├───────────────────┤
   │ client          │                                      │ support           │
   │ admin           │                                      │ notifications     │
   │ server  ◄── in the *public* tier, deliberately         │                   │
   │ bastion (:22 open to the world)                        │                   │
   │ legacy-migration (all ports open, admin profile)       │                   │
   └─────────────────┘                                      └───────────────────┘
                          │
                          ▼
              RDS Postgres 16  ──  primary (public, unencrypted, no backups)
                               └─  reporting (private, encrypted)

   S3: product-images (anonymous read+write) · user-avatars (locked down)
       db-backups (open policy, unencrypted dumps) · alb-logs
       terraform-state (unencrypted) · cloudtrail

   IAM: 3 users, 4 roles, 4 access keys, an Action:*/Resource:* policy
   Plus: Lambda · SQS · SNS · ECR · KMS · Secrets Manager · SSM · CloudTrail
         · CloudWatch Logs · ACM
```

**136 resources across 17 AWS services.** `terraform output summary` gives the
counts.

### Where the mapping to ShopPal is deliberate

The estate isn't generic filler — each piece corresponds to something the app
actually does, which is what makes the findings tell a story:

- `server`'s `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` (already in
  `docker-compose.yml` for S3 image uploads) become a real IAM user with real
  access keys, and those keys turn up again in EC2 user_data, in a Lambda's
  environment, and in a plaintext SSM parameter.
- `JWT_SECRET` becomes a Secrets Manager secret — with a resource policy anyone
  can read.
- The Postgres that `server` (TypeORM) and `support` (pgx) share becomes an RDS
  instance, reachable from `0.0.0.0/0`.
- The five service images from `docker-compose.yml` get ECR repositories.
- `support` → `notifications` HTTP calls become SQS and SNS.

So a scanner that follows relationships rather than checking resources in
isolation has a genuine path to walk: *public bucket → leaked `.env` → IAM key
→ admin policy → database credentials*.

---

## The security gaps

All 56 are catalogued in **[EXPECTED_FINDINGS.md](./EXPECTED_FINDINGS.md)**,
with the Terraform resource that produces each one and the API call that
reveals it. Use it as an answer key: anything missed is a false negative.

Nine resources are deliberately configured *correctly* and tagged
`Expected = "true"` — reporting those is a false positive. The sharpest one is
the `ops-alerts` SNS topic, whose wildcard principal is scoped by an
`AWS:SourceOwner` condition; matching on the principal without reading the
condition is a common scanner bug.

In the Terraform source, every deliberate weakness is marked with a `!! GAP`
comment explaining both what's wrong and why someone would plausibly have done
it. Grep for them:

```bash
grep -rn '!! GAP' terraform/
```

`./fakecloud.sh verify` performs its own pass over the API and prints findings
in red, controls in green — useful as a sanity check that the estate came up
intact before you blame your scanner.

---

## How it works

| Piece | Choice |
|-------|--------|
| AWS API | [moto](https://github.com/getmoto/moto) in standalone server mode, on port 4566 |
| Provisioning | Terraform with `hashicorp/aws ~> 5.100`, every service endpoint overridden |
| State | In-memory in the emulator; Terraform state is a local file in `terraform/` |

Port 4566 is LocalStack's conventional port, so tools that already expect a
local AWS endpoint work unchanged.

moto was chosen over LocalStack for one decisive reason: **RDS is a LocalStack
Pro feature**, and a database is central to what this estate needs to model.
moto covers RDS, ELBv2, CloudTrail and ECR in its open-source build, so the
whole estate comes up with no licence key. If you'd rather use LocalStack, the
Terraform is portable — point `fakecloud_endpoint` at it and drop
`database.tf`, `logging.tf` and the ELB resources in `compute.tf`.

### The one emulator patch

`scripts/moto_patches.py` monkey-patches a single moto bug before the server
starts. moto (through 5.2.x) assigns every RDS instance the *same*
`DbiResourceId`:

```python
# moto/rds/models.py
self.dbi_resource_id = "db-M5ENSHXFPU6XHZ4G4ZEI5QIO2U"
```

The Terraform AWS provider uses `DbiResourceId` as the resource's Terraform ID
and reads the instance back through a `dbi-resource-id` filter. With a shared
value that filter matches every instance at once, the provider can't resolve
one, and the post-create read fails with `couldn't find resource` — so any
config with more than one `aws_db_instance` cannot apply. The patch assigns a
unique, correctly-shaped ID per instance, which is what real RDS does. If moto
fixes this upstream, deleting that function is the whole migration.

### Limitations

- **RDS is metadata only.** `rds:DescribeDBInstances` returns a complete,
  accurate instance description, but nothing listens on the endpoint — there's
  no Postgres process behind it. That's the right trade-off here: a scanner
  traversing the account reads the *control plane*, and the control plane is
  faithful. If you need a live Postgres to point at, the existing
  `docker-compose.yml` already runs one on `localhost:5432`.
- **EC2 instances don't boot.** They're API objects: describable, tagged, with
  readable `user_data` and metadata options, but no guest OS. Anything that
  tries to SSH in or scan a port will find nothing listening.
- **State is in-memory.** `./fakecloud.sh down` discards the estate. Use
  `destroy` if you want to keep the emulator up between runs.

None of these limits what the fakecloud is for. Asset discovery and
configuration analysis run entirely against the AWS API, and that surface is
real.

---

## Safety

This module creates resources that are insecure on purpose. Three things stop
that from becoming a problem:

1. **Endpoint guard.** `fakecloud_endpoint` carries a `validation` block in
   `terraform/variables.tf` asserting it's loopback or RFC1918. Pointing it at
   `amazonaws.com` fails with `Error: Invalid value for variable` before a
   single API call is made. (A `check` block would only *warn* and let the
   apply proceed — verified, which is why this is variable validation.)
2. **Explicit endpoints.** All 20 service endpoints are overridden, so no
   service can silently fall through to the real AWS API.
3. **Dummy credentials, no metadata lookups.** `access_key = "test"`, with
   `skip_credentials_validation`, `skip_metadata_api_check` and
   `skip_requesting_account_id` all set — the provider never contacts IMDS or
   the real STS.

Every resource is tagged `Simulation = "true"` and
`Fakecloud = "shoppal-fakecloud"`.

The credentials in the seeded S3 objects, SSM parameters and Lambda
environment are non-functional placeholders — AWS's own documented
`AKIAIOSFODNN7EXAMPLE` key, and synthetic passwords and bcrypt hashes. No real
key material appears anywhere in this directory. The "private SSH key" is a
BEGIN/END marker wrapped around a note saying so, which is enough for a
secret-scanning rule to match on.

**Do not run `terraform apply` in `terraform/` against real AWS credentials.**
Use `./fakecloud.sh`, which sets the endpoint for you.

---

## Layout

```
fakecloud/
├── fakecloud.sh              driver: up / verify / destroy / down
├── EXPECTED_FINDINGS.md      the answer key — all 56 findings
├── scripts/
│   ├── fakecloud_server.py   emulator entry point (applies patches first)
│   ├── moto_patches.py       the RDS DbiResourceId shim
│   └── verify.sh             API-only asset walk
└── terraform/
    ├── versions.tf           provider pinning
    ├── providers.tf          endpoint overrides, dummy credentials
    ├── variables.tf          endpoint (+ its localhost guard), region, naming
    ├── network.tf            VPC, subnets, gateways, security groups, NACLs
    ├── compute.tf            EC2 fleet, EBS, key pair, ALB
    ├── storage.tf            S3 buckets and their policies
    ├── storage_objects.tf    decoy objects (leaked .env, DB dump, SSH key)
    ├── database.tf           RDS Postgres primary + reporting
    ├── identity.tf           IAM users, groups, roles, policies, keys
    ├── secrets.tf            KMS, Secrets Manager, SSM parameters
    ├── messaging.tf          SQS queues, SNS topics
    ├── serverless.tf         Lambda + its source
    ├── logging.tf            CloudTrail, CloudWatch log groups
    ├── registry.tf           ECR repositories
    ├── dns.tf                Route53 zone and records, ACM certificate
    └── outputs.tf            IDs, endpoints, seeded access keys, summary
```

## Tuning it

```bash
# a fresh, uniquely-named estate per run (default is stable names)
terraform apply -var 'bucket_suffix=run7'

# skip the decoy objects
terraform apply -var 'seed_bucket_objects=false'

# different port
FAKECLOUD_PORT=4599 ./fakecloud.sh up
```

`terraform output seeded_access_key_ids` prints the access key IDs the emulator
minted — useful for testing a "given this leaked key, what can it reach?" flow.
