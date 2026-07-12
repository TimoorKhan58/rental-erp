# Runbook: Database Outage Incident Response

## Symptoms

- `GET /api/health/ready` → 503 / `connectivity: error`
- Application errors mentioning Prisma / connection refused / timeout
- Compose `db` container unhealthy or restarted
- Nginx upstream OK but app pages fail on data-backed routes

## Immediate triage (first 5 minutes)

1. Check liveness: `GET /api/health` — if down, treat as app/process issue first
2. Check readiness: `GET /api/health/ready` — inspect `checks.database.error`
3. Check Postgres process / Compose: `docker compose -f docker-compose.prod.yml ps`
4. Check disk space on DB host/volume
5. Check `DATABASE_URL` host/port/credentials (no accidental staging URL in production)

## Isolation

| Finding | Action |
|---------|--------|
| Postgres down | Restart DB service; inspect logs; restore if data volume lost |
| Postgres up, auth failures | Rotate/fix credentials; do not commit secrets |
| Pool timeouts | Reduce load; raise `max_connections` carefully or lower `DATABASE_POOL_MAX`; consider PgBouncer later |
| Migrations incomplete | Stop deploys; finish or restore; see [MIGRATIONS.md](./MIGRATIONS.md) |
| Corruption / empty DB | [DISASTER_RECOVERY.md](./DISASTER_RECOVERY.md) |

## Communication

- State: investigating / mitigated / resolved
- Impact: read-only? full outage?
- ETA: based on restore time if DR path is taken

## Close-out

- [ ] Ready probe green
- [ ] Backup taken after recovery
- [ ] Incident notes filed
- [ ] Follow-ups (monitoring alerts in Phase 8-007, pool tuning, backup gaps)
