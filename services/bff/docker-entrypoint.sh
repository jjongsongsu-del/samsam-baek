#!/bin/sh
set -eu

DATA_DIR="${SAMSAM_DATA_DIR:-/app/data}"
SEED_DIR="${SAMSAM_SEED_DATA_DIR:-/app/seed-data}"

mkdir -p "$DATA_DIR"

if [ ! -f "$DATA_DIR/map-data.json" ] && [ -f "$SEED_DIR/map-data.json" ]; then
  cp "$SEED_DIR/map-data.json" "$DATA_DIR/map-data.json"
  echo "Seeded map-data.json into $DATA_DIR"
fi

if [ ! -f "$DATA_DIR/encyclopedia.json" ] && [ -f "$SEED_DIR/encyclopedia.json" ]; then
  cp "$SEED_DIR/encyclopedia.json" "$DATA_DIR/encyclopedia.json"
  echo "Seeded encyclopedia.json into $DATA_DIR"
fi

exec "$@"
