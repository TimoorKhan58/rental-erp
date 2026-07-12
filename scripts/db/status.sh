#!/usr/bin/env bash
# Report Prisma migration status (Phase 8-006).
# Requires: npx prisma, DATABASE_URL, and auth env for prisma.config.ts

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "[db-status] ERROR: DATABASE_URL is required" >&2
  exit 1
fi

: "${BETTER_AUTH_SECRET:=ops-status-placeholder-secret-32chars!!}"
: "${APP_URL:=http://localhost:3000}"
: "${APP_ENV:=local}"

export DATABASE_URL BETTER_AUTH_SECRET APP_URL APP_ENV

echo "[db-status] prisma validate"
npx prisma validate

echo "[db-status] prisma migrate status"
npx prisma migrate status
