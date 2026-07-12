#!/usr/bin/env bash
# Restore PostgreSQL from a Rental ERP backup (Phase 8-006).
# Requires: psql, gunzip, DATABASE_URL
#
# Usage:
#   ./scripts/db/restore.sh                         # latest backup in BACKUP_DIR
#   ./scripts/db/restore.sh path/to/backup.sql.gz   # selected backup
#
# WARNING: This overwrites the target database. Confirm before running in production.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "[restore] ERROR: DATABASE_URL is required" >&2
  exit 1
fi

BACKUP_DIR="${BACKUP_DIR:-./backups}"
BACKUP_FILE="${1:-}"

if [[ -z "$BACKUP_FILE" ]]; then
  if [[ ! -d "$BACKUP_DIR" ]]; then
    echo "[restore] ERROR: BACKUP_DIR does not exist: ${BACKUP_DIR}" >&2
    exit 1
  fi
  BACKUP_FILE="$(find "$BACKUP_DIR" -type f -name 'rental-erp_*.sql.gz' | sort | tail -n 1 || true)"
  if [[ -z "$BACKUP_FILE" ]]; then
    echo "[restore] ERROR: No backups found in ${BACKUP_DIR}" >&2
    exit 1
  fi
fi

if [[ ! -f "$BACKUP_FILE" ]]; then
  echo "[restore] ERROR: Backup file not found: ${BACKUP_FILE}" >&2
  exit 1
fi

echo "[restore] Restoring from ${BACKUP_FILE}"
echo "[restore] Target DATABASE_URL is set (credentials redacted)"
echo "[restore] Press Ctrl+C within 5 seconds to abort..."
sleep 5

gunzip -c "$BACKUP_FILE" | psql --dbname="$DATABASE_URL" --set ON_ERROR_STOP=1

echo "[restore] Restore finished"
echo "[restore] Validate with: npm run db:status && curl -fsS \$APP_URL/api/health/ready"
