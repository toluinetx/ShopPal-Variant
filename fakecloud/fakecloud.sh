#!/usr/bin/env bash
#
# ShopPal fakecloud - a simulated AWS account for security-scanner testing.
#
#   ./fakecloud.sh up        start the emulator and apply the Terraform estate
#   ./fakecloud.sh apply     re-apply Terraform against a running emulator
#   ./fakecloud.sh verify    enumerate the estate the way a scanner would
#   ./fakecloud.sh env       print the env vars to point a scanner at it
#   ./fakecloud.sh status    is the emulator up, and what's deployed
#   ./fakecloud.sh destroy   terraform destroy, leave the emulator running
#   ./fakecloud.sh down      stop the emulator (state is in-memory, so this
#                            discards the whole estate)
#   ./fakecloud.sh reset     wipe emulator state and re-apply from scratch
#
# Nothing here touches the real ShopPal deployment (docker-compose.yml, k8s/)
# and nothing here can reach real AWS - see the guard in terraform/providers.tf.

set -euo pipefail

FAKECLOUD_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TF_DIR="$FAKECLOUD_DIR/terraform"
VENV_DIR="${FAKECLOUD_VENV:-$FAKECLOUD_DIR/.venv}"
STATE_DIR="$FAKECLOUD_DIR/.run"
PID_FILE="$STATE_DIR/emulator.pid"
LOG_FILE="$STATE_DIR/emulator.log"

HOST="${FAKECLOUD_HOST:-127.0.0.1}"
PORT="${FAKECLOUD_PORT:-4566}"
ENDPOINT="http://${HOST}:${PORT}"
REGION="${FAKECLOUD_REGION:-us-east-1}"

# Dummy credentials. The emulator accepts anything.
export AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:-test}"
export AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:-test}"
export AWS_DEFAULT_REGION="$REGION"
export AWS_REGION="$REGION"

# Terraform's version check is noise here and fails on air-gapped machines.
export CHECKPOINT_DISABLE=1

RED=$'\033[0;31m'; GREEN=$'\033[0;32m'; YELLOW=$'\033[0;33m'
BLUE=$'\033[0;34m'; BOLD=$'\033[1m'; NC=$'\033[0m'

log()  { printf '%s==>%s %s\n' "$BLUE" "$NC" "$*"; }
ok()   { printf '%s  ok%s %s\n' "$GREEN" "$NC" "$*"; }
warn() { printf '%s warn%s %s\n' "$YELLOW" "$NC" "$*"; }
die()  { printf '%serror%s %s\n' "$RED" "$NC" "$*" >&2; exit 1; }

# ---------------------------------------------------------------------------

need_python() {
    command -v python3 >/dev/null 2>&1 || die "python3 is required but not on PATH"
}

need_terraform() {
    if command -v terraform >/dev/null 2>&1; then
        TF_BIN=terraform
    elif command -v tofu >/dev/null 2>&1; then
        TF_BIN=tofu
    else
        die "terraform (or tofu) is required but not on PATH - https://developer.hashicorp.com/terraform/install"
    fi
}

ensure_venv() {
    need_python
    if [ ! -x "$VENV_DIR/bin/python" ]; then
        log "creating virtualenv at $VENV_DIR"
        python3 -m venv "$VENV_DIR"
        "$VENV_DIR/bin/pip" install --quiet --upgrade pip
    fi
    if ! "$VENV_DIR/bin/python" -c "import moto" >/dev/null 2>&1; then
        log "installing moto[server] + awscli (one-off, a few hundred MB)"
        "$VENV_DIR/bin/pip" install --quiet "moto[server]>=5.0" awscli
    fi
    PY="$VENV_DIR/bin/python"
    AWSCLI="$VENV_DIR/bin/aws"
}

emulator_healthy() {
    curl -sf -o /dev/null --max-time 3 "$ENDPOINT/moto-api/" 2>/dev/null
}

emulator_running() {
    [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null
}

start_emulator() {
    ensure_venv
    mkdir -p "$STATE_DIR"

    if emulator_healthy; then
        ok "emulator already serving on $ENDPOINT"
        return 0
    fi

    log "starting AWS API emulator on $ENDPOINT"
    setsid nohup "$PY" "$FAKECLOUD_DIR/scripts/fakecloud_server.py" \
        -H "$HOST" -p "$PORT" > "$LOG_FILE" 2>&1 < /dev/null &
    echo $! > "$PID_FILE"

    for _ in $(seq 1 40); do
        if emulator_healthy; then
            ok "emulator up (pid $(cat "$PID_FILE")), logs at $LOG_FILE"
            return 0
        fi
        sleep 0.5
    done

    die "emulator did not become healthy - see $LOG_FILE"
}

stop_emulator() {
    if emulator_running; then
        local pid; pid="$(cat "$PID_FILE")"
        log "stopping emulator (pid $pid)"
        kill "$pid" 2>/dev/null || true
        sleep 1
        kill -9 "$pid" 2>/dev/null || true
        rm -f "$PID_FILE"
        ok "emulator stopped - in-memory estate discarded"
    else
        warn "emulator is not running"
    fi
}

terraform_apply() {
    need_terraform
    emulator_healthy || die "emulator is not reachable at $ENDPOINT - run './fakecloud.sh up' first"

    log "terraform init"
    (cd "$TF_DIR" && $TF_BIN init -input=false -no-color >/dev/null)

    log "terraform apply (136 resources; the two RDS instances take ~90s)"
    (cd "$TF_DIR" && $TF_BIN apply -auto-approve -input=false -no-color \
        -var "fakecloud_endpoint=$ENDPOINT" \
        -var "region=$REGION")
    ok "estate deployed"
}

terraform_destroy() {
    need_terraform
    if [ ! -f "$TF_DIR/terraform.tfstate" ]; then
        warn "no terraform state - nothing to destroy"
        return 0
    fi
    log "terraform destroy"
    (cd "$TF_DIR" && $TF_BIN destroy -auto-approve -input=false -no-color \
        -var "fakecloud_endpoint=$ENDPOINT" \
        -var "region=$REGION")
    ok "estate destroyed"
}

print_env() {
    cat <<EOF
# Point your security scanner at the fakecloud:
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=$REGION
export AWS_REGION=$REGION
export AWS_ENDPOINT_URL=$ENDPOINT

# Older SDKs that ignore AWS_ENDPOINT_URL need a per-service override, e.g.
#   aws --endpoint-url $ENDPOINT ec2 describe-instances
#   boto3.client("s3", endpoint_url="$ENDPOINT")
EOF
}

# ---------------------------------------------------------------------------

cmd_up() {
    start_emulator
    terraform_apply
    echo
    printf '%sFakecloud is live.%s\n\n' "$BOLD" "$NC"
    print_env
    echo
    printf 'Next: %s./fakecloud.sh verify%s to see the estate, or read EXPECTED_FINDINGS.md\n' "$BOLD" "$NC"
}

cmd_status() {
    if emulator_healthy; then
        ok "emulator healthy at $ENDPOINT"
    else
        warn "emulator not reachable at $ENDPOINT"
        return 0
    fi
    ensure_venv
    printf '\n%sDeployed inventory%s\n' "$BOLD" "$NC"
    # Terminated instances linger in DescribeInstances (real AWS does this too),
    # so filter them out - the count should reflect live assets.
    printf '  ec2 instances    %s\n' "$($AWSCLI --endpoint-url "$ENDPOINT" ec2 describe-instances --filters 'Name=instance-state-name,Values=pending,running,stopping,stopped' --query 'length(Reservations[].Instances[])' --output text 2>/dev/null || echo '?')"
    printf '  s3 buckets       %s\n' "$($AWSCLI --endpoint-url "$ENDPOINT" s3api list-buckets --query 'length(Buckets)' --output text 2>/dev/null || echo '?')"
    printf '  rds instances    %s\n' "$($AWSCLI --endpoint-url "$ENDPOINT" rds describe-db-instances --query 'length(DBInstances)' --output text 2>/dev/null || echo '?')"
    printf '  security groups  %s\n' "$($AWSCLI --endpoint-url "$ENDPOINT" ec2 describe-security-groups --query 'length(SecurityGroups)' --output text 2>/dev/null || echo '?')"
    printf '  iam users        %s\n' "$($AWSCLI --endpoint-url "$ENDPOINT" iam list-users --query 'length(Users)' --output text 2>/dev/null || echo '?')"
    printf '  iam roles        %s\n' "$($AWSCLI --endpoint-url "$ENDPOINT" iam list-roles --query 'length(Roles)' --output text 2>/dev/null || echo '?')"
    printf '  lambda functions %s\n' "$($AWSCLI --endpoint-url "$ENDPOINT" lambda list-functions --query 'length(Functions)' --output text 2>/dev/null || echo '?')"
    printf '  secrets          %s\n' "$($AWSCLI --endpoint-url "$ENDPOINT" secretsmanager list-secrets --query 'length(SecretList)' --output text 2>/dev/null || echo '?')"
}

cmd_verify() {
    ensure_venv
    emulator_healthy || die "emulator is not reachable at $ENDPOINT"
    FAKECLOUD_ENDPOINT="$ENDPOINT" AWSCLI="$AWSCLI" \
        bash "$FAKECLOUD_DIR/scripts/verify.sh"
}

cmd_reset() {
    emulator_healthy || die "emulator is not reachable at $ENDPOINT"
    log "wiping emulator state"
    curl -sf -X POST "$ENDPOINT/moto-api/reset" >/dev/null
    rm -f "$TF_DIR/terraform.tfstate" "$TF_DIR/terraform.tfstate.backup"
    ok "state wiped"
    terraform_apply
}

case "${1:-up}" in
    up)      cmd_up ;;
    apply)   terraform_apply ;;
    verify)  cmd_verify ;;
    env)     print_env ;;
    status)  cmd_status ;;
    destroy) terraform_destroy ;;
    down)    stop_emulator ;;
    reset)   cmd_reset ;;
    *)       sed -n '3,20p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//' ; exit 1 ;;
esac
