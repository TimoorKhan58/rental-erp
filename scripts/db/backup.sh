#!/usr/bin/env bash
# Full PostgreSQL backup for Rental ERP (Phase 8-006).
# Requires: pg_dump, gzip, DATABASE_URL
#
# Usage:
#   ./scripts/db/backup.sh
#   BACKUP_DIR=/var/backups/rental-erp ./scripts/db/backup.sh
#
# Optional env:
#   BACKUP_DIR              default: ./backups
#   BACKUP_RETENTION_DAYS   default: 14 (0 disables pruning)
#   DATABASE_URL            required

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "[backup] ERROR: DATABASE_URL is required" >&2
  exit 1
fi

BACKUP_DIR="${BACKUP_DIR:-./backups}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FILENAME="rental-erp_${TIMESTAMP}.sql.gz"
TARGET="${BACKUP_DIR%/}/${FILENAME}"

mkdir -p "$BACKUP_DIR"

echo "[backup] Writing compressed dump to ${TARGET}"
pg_dump --dbname="$DATABASE_URL" --format=plain --no-owner --no-acl \
  | gzip -c > "$TARGET"

BYTES="$(wc -c < "$TARGET" | tr -d ' ')"
echo "[backup] Completed (${BYTES} bytes): ${TARGET}"

if [[ "$BACKUP_RETENTION_DAYS" != "0" ]]; then
  echo "[backup] Pruning backups older than ${BACKUP_RETENTION_DAYS} day(s) in ${BACKUP_DIR}"
  find "$BACKUP_DIR" -type f -name 'rental-erp_*.sql.gz' -mtime "+${BACKUP_RETENTION_DAYS}" -print -delete || true
fi

echo "[backup] Done"
