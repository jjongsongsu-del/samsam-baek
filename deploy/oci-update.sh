#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

HTTP_CHECK_PORT="${HTTP_PORT:-80}"
if [ -f deploy/.env ]; then
  ENV_HTTP_PORT="$(grep -E '^HTTP_PORT=' deploy/.env | tail -n 1 | cut -d= -f2- || true)"
  HTTP_CHECK_PORT="${ENV_HTTP_PORT:-$HTTP_CHECK_PORT}"
fi

echo "[1/6] Updating source"
git pull --ff-only

echo "[2/6] Building and restarting containers"
docker compose --env-file deploy/.env -f deploy/docker-compose.prod.yml up -d --build

echo "[3/6] Updating encyclopedia data volume"
docker compose --env-file deploy/.env -f deploy/docker-compose.prod.yml cp services/bff/data/encyclopedia.json bff:/app/data/encyclopedia.json
docker compose --env-file deploy/.env -f deploy/docker-compose.prod.yml restart bff

echo "[4/6] Container status"
docker compose --env-file deploy/.env -f deploy/docker-compose.prod.yml ps

echo "[5/6] Health check"
curl -fsS "http://localhost:${HTTP_CHECK_PORT}/health"
echo

echo "[6/6] Encyclopedia count"
docker compose --env-file deploy/.env -f deploy/docker-compose.prod.yml exec -T bff node -e "fetch('http://localhost:8080/v1/encyclopedia').then(r=>r.json()).then(j=>console.log(j.items.length))"
