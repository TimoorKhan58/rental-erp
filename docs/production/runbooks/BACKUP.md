# Runbook: Database Backup

## Purpose

Create a compressed, timestamped full logical backup of the Rental ERP PostgreSQL database.

## Prerequisites

- `pg_dump` and `gzip` (Linux) or PostgreSQL client tools (Windows)
- `DATABASE_URL` set to the target database
- Optional: `BACKUP_DIR`, `BACKUP_RETENTION_DAYS`

## Procedure (Linux / macOS / Git Bash)

```bash
export DATABASE_URL="postgresql://..."
export BACKUP_DIR="/var/backups/rental-erp"   # optional
export BACKUP_RETENTION_DAYS="14"             # optional; 0 skips prune

cd /path/to/rental-erp
./scripts/db/backup.sh
# or: npm run db:backup
```

## Procedure (Windows PowerShell)

```powershell
$env:DATABASE_URL = "postgresql://..."
$env:BACKUP_DIR = "D:\backups\rental-erp"
.\scripts\db\backup.ps1
```

## Verify

- File exists: `rental-erp_YYYYMMDDTHHMMSSZ.sql.gz`
- Size is non-trivial (not 0 bytes)
- Optional: `gunzip -t path/to/file.sql.gz`

## Automation (example only)

See `scripts/db/backup.cron.example`. Operators own crontab / Task Scheduler setup — this phase does not configure production schedulers.

## Failure modes

| Symptom | Action |
|---------|--------|
| `DATABASE_URL is required` | Export connection string |
| `pg_dump: command not found` | Install PostgreSQL client tools |
| Empty / tiny file | Check auth, network, disk space |
| Permission denied on `BACKUP_DIR` | Fix directory ownership / path |
