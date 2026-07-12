# Runbook: Database Restore

## Purpose

Restore PostgreSQL from a Rental ERP compressed backup. **Destructive** — overwrites objects in the target database.

## Prerequisites

- `psql`, `gunzip` (or PowerShell equivalents)
- `DATABASE_URL` pointing at the **intended restore target** (never guess)
- Confirmed backup file path or known latest dump in `BACKUP_DIR`
- Application traffic stopped or drained for production restores

## Procedure — latest backup

```bash
export DATABASE_URL="postgresql://..."
export BACKUP_DIR="/var/backups/rental-erp"
./scripts/db/restore.sh
```

Script waits 5 seconds before applying (Ctrl+C to abort).

## Procedure — selected backup

```bash
./scripts/db/restore.sh /var/backups/rental-erp/rental-erp_20260711T120000Z.sql.gz
```

Windows:

```powershell
.\scripts\db\restore.ps1 -BackupFile "D:\backups\rental-erp\rental-erp_20260711T120000Z.sql.gz"
```

## Post-restore validation

1. `npm run db:status` or `./scripts/db/status.sh`
2. `curl -fsS "$APP_URL/api/health/ready"` → HTTP 200, `migrations.ok: true`
3. Smoke-test: login, open dashboard, spot-check a known record
4. Review Postgres logs for errors during restore

## Notes

- Restores use plain SQL via `psql` with `ON_ERROR_STOP=1`
- If restore fails mid-stream, treat the database as inconsistent — restore again from a known-good dump or escalate
- After restore to a newer app version, you may still need `prisma migrate deploy` if the dump predates pending migrations
