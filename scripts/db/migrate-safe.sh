#!/usr/bin/env bash
# Safe production/staging migration wrapper:
# backup -> migrate deploy -> migration status

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "[migrate-safe] ERROR: DATABASE_URL is required" >&2
  exit 1
fi

: "${BETTER_AUTH_SECRET:=ops-migrate-placeholder-secret-32chars!!}"
: "${APP_URL:=http://localhost:3000}"
: "${APP_ENV:=local}"
export DATABASE_URL BETTER_AUTH_SECRET APP_URL APP_ENV

echo "[migrate-safe] Step 1/3: create verified backup"
./scripts/db/backup.sh

echo "[migrate-safe] Step 2/3: apply migrations"
npm run db:migrate:deploy

echo "[migrate-safe] Step 3/3: verify migration status"
./scripts/db/status.sh

echo "[migrate-safe] Done"
