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
#   ./fakecloud.sh down      stop the emulator (state is in-memory by default,
#                            so this discards the whole estate)
#   ./fakecloud.sh reset     tear down and rebuild from scratch
#
# The AWS API is emulated by fakecloud (https://github.com/faiscadev/fakecloud),
# a single-binary open-source AWS emulator, listening on port 4566.
#
# Nothing here touches the real ShopPal deployment (docker-compose.yml, k8s/)
# and nothing here can reach real AWS - see the guard in terraform/variables.tf.

set -euo pipefail

FAKECLOUD_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TF_DIR="$FAKECLOUD_DIR/terraform"
BIN_DIR="$FAKECLOUD_DIR/.bin"
VENV_DIR="${FAKECLOUD_VENV:-$FAKECLOUD_DIR/.venv}"
STATE_DIR="$FAKECLOUD_DIR/.run"
PID_FILE="$STATE_DIR/emulator.pid"
LOG_FILE="$STATE_DIR/emulator.log"

HOST="${FAKECLOUD_HOST:-127.0.0.1}"
PORT="${FAKECLOUD_PORT:-4566}"
ENDPOINT="http://${HOST}:${PORT}"
REGION="${FAKECLOUD_REGION:-us-east-1}"

# Optional hardening, passed straight through to the emulator:
#   FAKECLOUD_IAM=soft|strict   evaluate IAM policies on every call
#   FAKECLOUD_SIGV4=1           verify request signatures
IAM_MODE="${FAKECLOUD_IAM:-}"
VERIFY_SIGV4="${FAKECLOUD_SIGV4:-}"

# Dummy credentials. The emulator accepts anything unless SigV4 verification
# is turned on.
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
# Dependencies
# ---------------------------------------------------------------------------

need_terraform() {
    if command -v terraform >/dev/null 2>&1; then
        TF_BIN=terraform
    elif command -v tofu >/dev/null 2>&1; then
        TF_BIN=tofu
    else
        die "terraform (or tofu) is required - https://developer.hashicorp.com/terraform/install"
    fi
}

# Locate the fakecloud binary, installing it if we can. Honour FAKECLOUD_BIN
# so you can point at a build of your own.
ensure_fakecloud() {
    if [ -n "${FAKECLOUD_BIN:-}" ]; then
        [ -x "$FAKECLOUD_BIN" ] || die "FAKECLOUD_BIN=$FAKECLOUD_BIN is not executable"
        FC_BIN="$FAKECLOUD_BIN"; return
    fi
    if command -v fakecloud >/dev/null 2>&1; then
        FC_BIN="$(command -v fakecloud)"; return
    fi
    if [ -x "$BIN_DIR/fakecloud" ]; then
        FC_BIN="$BIN_DIR/fakecloud"; return
    fi

    log "fakecloud not found - installing"
    mkdir -p "$BIN_DIR"

    # The upstream installer, pointed at our own bin dir.
    if curl -fsSL --max-time 120 https://fakecloud.dev/install.sh 2>/dev/null \
        | FAKECLOUD_INSTALL_DIR="$BIN_DIR" INSTALL_DIR="$BIN_DIR" PREFIX="$BIN_DIR" bash >/dev/null 2>&1 \
        && [ -x "$BIN_DIR/fakecloud" ]; then
        FC_BIN="$BIN_DIR/fakecloud"; ok "installed via fakecloud.dev/install.sh"; return
    fi
    if command -v fakecloud >/dev/null 2>&1; then
        FC_BIN="$(command -v fakecloud)"; ok "installed via fakecloud.dev/install.sh"; return
    fi

    if command -v brew >/dev/null 2>&1 && brew install fakecloud >/dev/null 2>&1 \
        && command -v fakecloud >/dev/null 2>&1; then
        FC_BIN="$(command -v fakecloud)"; ok "installed via Homebrew"; return
    fi

    if command -v cargo >/dev/null 2>&1; then
        log "building from source with cargo (this takes a while)"
        if cargo install fakecloud --root "$FAKECLOUD_DIR/.cargo" >/dev/null 2>&1 \
            && [ -x "$FAKECLOUD_DIR/.cargo/bin/fakecloud" ]; then
            FC_BIN="$FAKECLOUD_DIR/.cargo/bin/fakecloud"; ok "installed via cargo"; return
        fi
    fi

    die "could not install fakecloud automatically. Install it yourself and re-run:
    curl -fsSL https://fakecloud.dev/install.sh | bash
    brew install fakecloud
    cargo install fakecloud
    docker run -p 4566:4566 ghcr.io/faiscadev/fakecloud
  Then set FAKECLOUD_BIN=/path/to/fakecloud, or put it on PATH."
}

# The AWS CLI is only needed by `verify` and `status`. Prefer a system one.
ensure_awscli() {
    if command -v aws >/dev/null 2>&1; then
        AWSCLI="$(command -v aws)"; return
    fi
    if [ -x "$VENV_DIR/bin/aws" ]; then
        AWSCLI="$VENV_DIR/bin/aws"; return
    fi
    command -v python3 >/dev/null 2>&1 || die "need either the AWS CLI or python3 on PATH"
    log "installing the AWS CLI into $VENV_DIR (used only by verify/status)"
    python3 -m venv "$VENV_DIR"
    "$VENV_DIR/bin/pip" install --quiet --upgrade pip
    "$VENV_DIR/bin/pip" install --quiet awscli
    AWSCLI="$VENV_DIR/bin/aws"
}

# ---------------------------------------------------------------------------
# Emulator lifecycle
# ---------------------------------------------------------------------------

emulator_healthy() {
    curl -sf -o /dev/null --max-time 3 "$ENDPOINT/_fakecloud/health" 2>/dev/null
}

emulator_running() {
    [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null
}

start_emulator() {
    mkdir -p "$STATE_DIR"

    if emulator_healthy; then
        ok "emulator already serving on $ENDPOINT"
        return 0
    fi

    ensure_fakecloud

    local args=()
    [ -n "$IAM_MODE" ] && args+=(--iam "$IAM_MODE")
    [ -n "$VERIFY_SIGV4" ] && args+=(--verify-sigv4)

    log "starting fakecloud on $ENDPOINT${IAM_MODE:+ (IAM enforcement: $IAM_MODE)}"
    FAKECLOUD_PORT="$PORT" FAKECLOUD_REGION="$REGION" \
        setsid nohup "$FC_BIN" "${args[@]}" > "$LOG_FILE" 2>&1 < /dev/null &
    echo $! > "$PID_FILE"

    for _ in $(seq 1 60); do
        if emulator_healthy; then
            ok "emulator up (pid $(cat "$PID_FILE")), logs at $LOG_FILE"
            if grep -q "No container runtime" "$LOG_FILE" 2>/dev/null; then
                warn "no container runtime detected - RDS will fail. Start Docker,"
                warn "or run with -var 'enable_rds=false' (see README)."
            fi
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

# ---------------------------------------------------------------------------
# Terraform
# ---------------------------------------------------------------------------

tf_vars() {
    printf '%s' "-var fakecloud_endpoint=$ENDPOINT -var region=$REGION"
}

terraform_apply() {
    need_terraform
    emulator_healthy || die "emulator is not reachable at $ENDPOINT - run './fakecloud.sh up' first"

    log "terraform init"
    (cd "$TF_DIR" && $TF_BIN init -input=false -no-color >/dev/null)

    log "terraform apply"
    # shellcheck disable=SC2046
    (cd "$TF_DIR" && $TF_BIN apply -auto-approve -input=false -no-color $(tf_vars) "$@")
    ok "estate deployed"
}

terraform_destroy() {
    need_terraform
    if [ ! -f "$TF_DIR/terraform.tfstate" ]; then
        warn "no terraform state - nothing to destroy"
        return 0
    fi
    log "terraform destroy"
    # shellcheck disable=SC2046
    (cd "$TF_DIR" && $TF_BIN destroy -auto-approve -input=false -no-color $(tf_vars) "$@")
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
    terraform_apply "$@"
    echo
    printf '%sFakecloud is live.%s\n\n' "$BOLD" "$NC"
    print_env
    echo
    printf 'Next: %s./fakecloud.sh verify%s to see the estate, or read EXPECTED_FINDINGS.md\n' "$BOLD" "$NC"
}

cmd_status() {
    if emulator_healthy; then
        ok "emulator healthy at $ENDPOINT (fakecloud $(curl -sf "$ENDPOINT/_fakecloud/health" | sed -n 's/.*"version":"\([^"]*\)".*/\1/p'))"
    else
        warn "emulator not reachable at $ENDPOINT"
        return 0
    fi
    ensure_awscli
    a() { "$AWSCLI" --endpoint-url "$ENDPOINT" "$@" 2>/dev/null || echo '?'; }
    printf '\n%sDeployed inventory%s\n' "$BOLD" "$NC"
    # Terminated instances linger in DescribeInstances (real AWS does this too),
    # so filter them out - the count should reflect live assets.
    printf '  ec2 instances    %s\n' "$(a ec2 describe-instances --filters 'Name=instance-state-name,Values=pending,running,stopping,stopped' --query 'length(Reservations[].Instances[])' --output text)"
    printf '  s3 buckets       %s\n' "$(a s3api list-buckets --query 'length(Buckets)' --output text)"
    printf '  rds instances    %s\n' "$(a rds describe-db-instances --query 'length(DBInstances)' --output text)"
    printf '  security groups  %s\n' "$(a ec2 describe-security-groups --query 'length(SecurityGroups)' --output text)"
    printf '  iam users        %s\n' "$(a iam list-users --query 'length(Users)' --output text)"
    printf '  iam roles        %s\n' "$(a iam list-roles --query 'length(Roles)' --output text)"
    printf '  lambda functions %s\n' "$(a lambda list-functions --query 'length(Functions)' --output text)"
    printf '  secrets          %s\n' "$(a secretsmanager list-secrets --query 'length(SecretList)' --output text)"
}

cmd_verify() {
    ensure_awscli
    emulator_healthy || die "emulator is not reachable at $ENDPOINT"
    FAKECLOUD_ENDPOINT="$ENDPOINT" AWSCLI="$AWSCLI" \
        bash "$FAKECLOUD_DIR/scripts/verify.sh"
}

cmd_reset() {
    terraform_destroy || true
    stop_emulator || true
    rm -f "$TF_DIR/terraform.tfstate" "$TF_DIR/terraform.tfstate.backup"
    start_emulator
    terraform_apply "$@"
}

CMD="${1:-up}"; shift || true
case "$CMD" in
    up)      cmd_up "$@" ;;
    apply)   terraform_apply "$@" ;;
    verify)  cmd_verify ;;
    env)     print_env ;;
    status)  cmd_status ;;
    destroy) terraform_destroy "$@" ;;
    down)    stop_emulator ;;
    reset)   cmd_reset "$@" ;;
    *)       sed -n '3,21p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//' ; exit 1 ;;
esac
