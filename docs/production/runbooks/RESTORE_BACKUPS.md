# Runbook: Restore Backups (Ops Index)

Primary restore procedure: **[RESTORE.md](./RESTORE.md)**

## Quick path

```bash
export DATABASE_URL="postgresql://…"
export BACKUP_DIR="/var/backups/rental-erp"

# Latest
./scripts/db/restore.sh

# Or specific file
./scripts/db/restore.sh /var/backups/rental-erp/rental-erp_YYYYMMDDTHHMMSSZ.sql.gz
```

## After restore

1. `npm run db:status` or migrate status  
2. `curl -fsS "$APP_URL/api/health/ready"`  
3. Login + smoke ([SMOKE_TESTS.md](../SMOKE_TESTS.md))  
4. If app expects newer schema than dump: `migrate deploy`  

Full DR checklist: [DISASTER_RECOVERY.md](../DISASTER_RECOVERY.md) · [runbooks/DISASTER_RECOVERY.md](./DISASTER_RECOVERY.md)
