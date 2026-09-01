#!/usr/bin/env bash
#
# Walks the deployed fakecloud the way a scanner would - purely through the
# AWS API, never through Terraform state - and prints what it finds.
#
# The point is to prove two things: the assets exist, and the deliberate
# misconfigurations are actually observable over the API (not just present in
# the .tf files). Invoked by `./fakecloud.sh verify`.

set -uo pipefail

ENDPOINT="${FAKECLOUD_ENDPOINT:-http://127.0.0.1:4566}"
AWSCLI="${AWSCLI:-aws}"

export AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:-test}"
export AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:-test}"
export AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-us-east-1}"

aws_() { "$AWSCLI" --endpoint-url "$ENDPOINT" "$@" 2>/dev/null; }

BOLD=$'\033[1m'; DIM=$'\033[2m'; RED=$'\033[0;31m'; GREEN=$'\033[0;32m'; NC=$'\033[0m'

section() { printf '\n%s%s%s\n' "$BOLD" "$1" "$NC"; }
finding() { printf '  %s!%s %s\n' "$RED" "$NC" "$1"; }
clean()   { printf '  %s+%s %s\n' "$GREEN" "$NC" "$1"; }
note()    { printf '  %s%s%s\n' "$DIM" "$1" "$NC"; }

printf '%sShopPal fakecloud - asset walk%s\n' "$BOLD" "$NC"
note "endpoint: $ENDPOINT"
note "identity: $(aws_ sts get-caller-identity --query Arn --output text)"

# ---------------------------------------------------------------------------
section "EC2 instances"
# Terminated instances stay visible in DescribeInstances for a while (real AWS
# behaves the same), so scope the walk to live ones.
aws_ ec2 describe-instances \
    --filters 'Name=instance-state-name,Values=pending,running,stopping,stopped' \
    --query 'Reservations[].Instances[].[Tags[?Key==`Name`]|[0].Value,InstanceType,PrivateIpAddress,PublicIpAddress,MetadataOptions.HttpTokens]' \
    --output text | sort | while read -r name itype priv pub imds; do
    flags=""
    [ "$pub" != "None" ] && flags="${flags} public-ip"
    [ "$imds" = "optional" ] && flags="${flags} imdsv1"
    if [ -n "$flags" ]; then
        finding "$(printf '%-34s %-11s %-15s %s' "$name" "$itype" "$priv" "$flags")"
    else
        clean "$(printf '%-34s %-11s %s' "$name" "$itype" "$priv")"
    fi
done

section "Security groups reachable from 0.0.0.0/0"
aws_ ec2 describe-security-groups --output json |
    python3 -c '
import json,sys
for sg in json.load(sys.stdin)["SecurityGroups"]:
    for p in sg.get("IpPermissions", []):
        if any(r.get("CidrIp") == "0.0.0.0/0" for r in p.get("IpRanges", [])):
            proto = p.get("IpProtocol")
            if proto == "-1":
                ports = "ALL PORTS / ALL PROTOCOLS"
            else:
                ports = f'"'"'{p.get("FromPort")}-{p.get("ToPort")}/{proto}'"'"'
            print(f'"'"'{sg["GroupName"]}\t{ports}'"'"')
' | sort -u | while IFS=$'\t' read -r sg ports; do
    case "$sg" in
        *alb-sg) clean "$(printf '%-38s %s  (expected for a public ALB)' "$sg" "$ports")" ;;
        *)       finding "$(printf '%-38s %s' "$sg" "$ports")" ;;
    esac
done

section "S3 buckets"
for b in $(aws_ s3api list-buckets --query 'Buckets[].Name' --output text); do
    issues=""
    policy=$(aws_ s3api get-bucket-policy --bucket "$b" --query Policy --output text)
    case "$policy" in *'"Principal":"*"'*|*'"AWS":"*"'*|*'"Principal": "*"'*) issues="${issues} public-policy" ;; esac
    acl=$(aws_ s3api get-bucket-acl --bucket "$b" --query 'Grants[].Grantee.URI' --output text)
    case "$acl" in *AllUsers*) issues="${issues} public-acl" ;; esac
    aws_ s3api get-bucket-encryption --bucket "$b" >/dev/null || issues="${issues} unencrypted"
    ver=$(aws_ s3api get-bucket-versioning --bucket "$b" --query Status --output text)
    [ "$ver" != "Enabled" ] && issues="${issues} no-versioning"
    objs=$(aws_ s3api list-objects-v2 --bucket "$b" --query 'length(Contents)' --output text)
    { [ -z "$objs" ] || [ "$objs" = "None" ]; } && objs=0

    if [ -n "$issues" ]; then
        finding "$(printf '%-44s %2s obj %s' "$b" "$objs" "$issues")"
    else
        clean "$(printf '%-44s %2s obj' "$b" "$objs")"
    fi
done

section "Objects in anonymously-reachable buckets"
for b in $(aws_ s3api list-buckets --query 'Buckets[].Name' --output text); do
    policy=$(aws_ s3api get-bucket-policy --bucket "$b" --query Policy --output text)
    acl=$(aws_ s3api get-bucket-acl --bucket "$b" --query 'Grants[].Grantee.URI' --output text)
    case "${policy}${acl}" in
        *'"Principal":"*"'*|*'"AWS":"*"'*|*AllUsers*)
            for k in $(aws_ s3api list-objects-v2 --bucket "$b" --query 'Contents[].Key' --output text); do
                finding "s3://$b/$k"
            done
            ;;
    esac
done

section "RDS instances"
aws_ rds describe-db-instances \
    --query 'DBInstances[].[DBInstanceIdentifier,Engine,EngineVersion,PubliclyAccessible,StorageEncrypted,BackupRetentionPeriod,DeletionProtection]' \
    --output text | while read -r id eng ver pub enc backup delprot; do
    issues=""
    [ "$pub" = "True" ] && issues="${issues} publicly-accessible"
    [ "$enc" = "False" ] && issues="${issues} unencrypted"
    [ "$backup" = "0" ] && issues="${issues} no-backups"
    [ "$delprot" = "False" ] && issues="${issues} no-deletion-protection"
    if [ -n "$issues" ]; then
        finding "$(printf '%-38s %s %s %s' "$id" "$eng" "$ver" "$issues")"
    else
        clean "$(printf '%-38s %s %s' "$id" "$eng" "$ver")"
    fi
done

section "IAM users and keys"
for u in $(aws_ iam list-users --query 'Users[].UserName' --output text); do
    keys=$(aws_ iam list-access-keys --user-name "$u" --query 'length(AccessKeyMetadata[?Status==`Active`])' --output text)
    mfa=$(aws_ iam list-mfa-devices --user-name "$u" --query 'length(MFADevices)' --output text)
    pols=$(aws_ iam list-attached-user-policies --user-name "$u" --query 'AttachedPolicies[].PolicyName' --output text | tr '\t' ',')
    inline=$(aws_ iam list-user-policies --user-name "$u" --query 'PolicyNames' --output text | tr '\t' ',')
    issues=""
    [ "$keys" != "0" ] && issues="${issues} ${keys}-active-key(s)"
    [ "$mfa" = "0" ] && issues="${issues} no-mfa"
    [ -n "$inline" ] && issues="${issues} inline-policy:${inline}"
    finding "$(printf '%-34s %s' "$u" "$issues")"
    note "      attached: ${pols:-none}"
done

section "IAM policies granting Action:* on Resource:*"
for arn in $(aws_ iam list-policies --scope Local --query 'Policies[].Arn' --output text); do
    vid=$(aws_ iam get-policy --policy-arn "$arn" --query 'Policy.DefaultVersionId' --output text)
    doc=$(aws_ iam get-policy-version --policy-arn "$arn" --version-id "$vid" --query 'PolicyVersion.Document' --output json)
    echo "$doc" | python3 -c '
import json,sys
doc=json.load(sys.stdin)
if isinstance(doc,str): doc=json.loads(doc)
for st in doc.get("Statement",[]):
    a=st.get("Action"); r=st.get("Resource")
    a=[a] if isinstance(a,str) else (a or [])
    r=[r] if isinstance(r,str) else (r or [])
    if "*" in a and "*" in r and st.get("Effect")=="Allow":
        sys.exit(0)
sys.exit(1)' && finding "${arn##*/}"
done

section "IAM roles assumable by any principal"
for r in $(aws_ iam list-roles --query 'Roles[].RoleName' --output text); do
    aws_ iam get-role --role-name "$r" --query 'Role.AssumeRolePolicyDocument' --output json |
        python3 -c '
import json,sys
doc=json.load(sys.stdin)
if isinstance(doc,str): doc=json.loads(doc)
for st in doc.get("Statement",[]):
    p=st.get("Principal")
    if p=="*" or (isinstance(p,dict) and p.get("AWS")=="*"):
        sys.exit(0)
sys.exit(1)' && finding "$r  (trust policy allows Principal:*)"
done

section "Secrets and parameters"
for s in $(aws_ secretsmanager list-secrets --query 'SecretList[].Name' --output text); do
    rot=$(aws_ secretsmanager describe-secret --secret-id "$s" --query 'RotationEnabled' --output text)
    [ "$rot" = "True" ] && clean "$s (rotation on)" || finding "$s (no rotation)"
done
aws_ ssm describe-parameters --query 'Parameters[].[Name,Type]' --output text |
    while read -r n t; do
        case "$n" in
            *PASSWORD*|*SECRET*|*KEY*)
                [ "$t" = "String" ] && finding "$n stored as plaintext String" || clean "$n ($t)" ;;
            *) clean "$n ($t)" ;;
        esac
    done

section "Lambda functions with secrets in environment variables"
for f in $(aws_ lambda list-functions --query 'Functions[].FunctionName' --output text); do
    runtime=$(aws_ lambda get-function-configuration --function-name "$f" --query Runtime --output text)
    aws_ lambda get-function-configuration --function-name "$f" --query 'Environment.Variables' --output json |
        python3 -c '
import json,sys,re
v=json.load(sys.stdin) or {}
hits=[k for k in v if re.search(r"SECRET|PASSWORD|KEY|TOKEN|CONNECTION_URL",k,re.I)]
print(",".join(hits))' | while read -r hits; do
        [ -n "$hits" ] && finding "$f (runtime $runtime) exposes: $hits" || clean "$f"
    done
done

section "Other exposed resources"
# A wildcard principal is only a finding when nothing scopes it back down.
# AWS's *default* SNS topic policy names Principal AWS:* but pins it with an
# AWS:SourceOwner condition, so matching on the principal alone reports every
# topic in the account. Treat a statement as open only if it has no condition.
is_open_policy() {
    python3 -c '
import json, sys
raw = sys.stdin.read().strip()
if not raw or raw == "None":
    sys.exit(1)
try:
    doc = json.loads(raw)
except ValueError:
    sys.exit(1)
if isinstance(doc, str):
    doc = json.loads(doc)
for st in doc.get("Statement", []):
    if st.get("Effect") != "Allow" or st.get("Condition"):
        continue
    p = st.get("Principal")
    if p == "*" or (isinstance(p, dict) and "*" in (
        p.get("AWS") if isinstance(p.get("AWS"), list) else [p.get("AWS")]
    )):
        sys.exit(0)
sys.exit(1)'
}

aws_ sqs list-queues --query 'QueueUrls' --output text | tr '\t' '\n' | while read -r q; do
    [ -z "$q" ] || [ "$q" = "None" ] && continue
    aws_ sqs get-queue-attributes --queue-url "$q" --attribute-names Policy \
        --query 'Attributes.Policy' --output text | is_open_policy \
        && finding "sqs ${q##*/} - policy allows Principal:* with no condition"
done
for t in $(aws_ sns list-topics --query 'Topics[].TopicArn' --output text); do
    aws_ sns get-topic-attributes --topic-arn "$t" \
        --query 'Attributes.Policy' --output text | is_open_policy \
        && finding "sns ${t##*:} - policy allows Principal:* with no condition"
done
for r in $(aws_ ecr describe-repositories --query 'repositories[].repositoryName' --output text); do
    scan=$(aws_ ecr describe-repositories --repository-names "$r" --query 'repositories[0].imageScanningConfiguration.scanOnPush' --output text)
    mut=$(aws_ ecr describe-repositories --repository-names "$r" --query 'repositories[0].imageTagMutability' --output text)
    finding "ecr $r - scanOnPush=$scan tagMutability=$mut"
done

section "Audit coverage"
aws_ cloudtrail describe-trails --query 'trailList[].[Name,IsMultiRegionTrail,LogFileValidationEnabled]' --output text |
    while read -r n multi validation; do
        [ "$multi" = "True" ] && [ "$validation" = "True" ] \
            && clean "cloudtrail $n" \
            || finding "cloudtrail $n - multiRegion=$multi logFileValidation=$validation"
    done
flows=$(aws_ ec2 describe-flow-logs --query 'length(FlowLogs)' --output text)
[ "$flows" = "0" ] && finding "no VPC flow logs configured" || clean "$flows VPC flow log(s)"

printf '\n%sWalk complete.%s Cross-check against EXPECTED_FINDINGS.md.\n' "$BOLD" "$NC"
