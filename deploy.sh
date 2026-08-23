#!/usr/bin/env bash
set -euo pipefail

REPO_URL="https://github.com/toluinetx/ShopPal"
BRANCH="main"
# Optional: set to a GitHub token if you need authenticated clone/pull
# access (e.g. private fork, higher rate limits). Not required for the
# public toluinetx/ShopPal repo - leave blank to clone anonymously.
GITHUB_TOKEN="${GITHUB_TOKEN:-}"

# Never let git block waiting for a username/password at a hidden prompt -
# fail fast with a clear error instead. ShopPal is public, so a token is
# never required to clone/pull; GITHUB_TOKEN is only honored if it's set,
# and only actually used if it works.
export GIT_TERMINAL_PROMPT=0

# 1. Clone or update
if [ -d "ShopPal/.git" ]; then
  cd ShopPal
  git checkout "$BRANCH"
  git pull origin "$BRANCH"
else
  if [ -n "$GITHUB_TOKEN" ] && git clone "https://${GITHUB_TOKEN}@github.com/toluinetx/ShopPal" 2>/dev/null; then
    cd ShopPal
  else
    git clone "$REPO_URL" && cd ShopPal
  fi
fi

# 2. Build and start the stack (client, server, support, notifications, postgres)
docker compose up --build -d

# 3. Wait for the core API to report ready
echo "Waiting for server to become ready..."
for i in $(seq 1 30); do
  if curl -sf http://localhost:3000/ready > /dev/null; then
    echo "Server is ready."
    break
  fi
  sleep 2
done

echo "Deployed:"
echo "  App:              http://localhost:8080"
echo "  Server API docs:  http://localhost:3000/docs"
echo "  Support API docs: http://localhost:8081/docs"
echo "  Notifications API docs: http://localhost:8082/docs"
