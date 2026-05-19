#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "[1/4] Updating source"
git pull --ff-only

echo "[2/4] Building and restarting containers"
docker compose --env-file deploy/.env -f deploy/docker-compose.prod.yml up -d --build

echo "[3/4] Container status"
docker compose --env-file deploy/.env -f deploy/docker-compose.prod.yml ps

echo "[4/4] Health check"
curl -fsS http://localhost/health
echo
