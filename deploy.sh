#!/usr/bin/env bash
set -euo pipefail

REPO_URL="https://github.com/toluinetx/ShopPal"
BRANCH="main"

# 1. Clone or update
if [ -d "ShopPal/.git" ]; then
  cd ShopPal
  git checkout "$BRANCH"
  git pull origin "$BRANCH"
else
  if [ -n "${GITHUB_TOKEN:-}" ]; then
    git clone "https://${GITHUB_TOKEN}@github.com/toluinetx/ShopPal" && cd ShopPal
  else
    git clone "$REPO_URL" && cd ShopPal
  fi
fi

# 2. Build and start the stack (client, admin, server, support, notifications, postgres)
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
echo "  App:              http://localhost:8087"
echo "  Admin panel:      http://localhost:8090  (login: admin / Admin123!)"
echo "  Server API docs:  http://localhost:3000/docs"
echo "  Support API docs: http://localhost:8086/docs"
echo "  Notifications API docs: http://localhost:8085/docs"
