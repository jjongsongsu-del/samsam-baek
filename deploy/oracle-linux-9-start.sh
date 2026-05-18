#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

if [ ! -f deploy/.env ]; then
  cp deploy/.env.example deploy/.env
  echo "Created deploy/.env from deploy/.env.example."
  echo "Edit deploy/.env before starting the service, then run this script again."
  exit 1
fi

echo "[1/3] Building and starting Samsam Baekgwa services"
docker compose --env-file deploy/.env -f deploy/docker-compose.prod.yml up -d --build

echo "[2/3] Service status"
docker compose --env-file deploy/.env -f deploy/docker-compose.prod.yml ps

echo "[3/3] Local health check"
docker compose --env-file deploy/.env -f deploy/docker-compose.prod.yml exec -T bff node -e "fetch('http://localhost:8080/health').then(r=>r.text()).then(console.log)"

echo
echo "Samsam Baekgwa is running."
echo "Use: docker compose --env-file deploy/.env -f deploy/docker-compose.prod.yml logs -f"
