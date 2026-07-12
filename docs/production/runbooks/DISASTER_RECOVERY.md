# Runbook: Disaster Recovery Checklist

## Scope

Loss of the primary PostgreSQL instance, corrupted data volume, or failed migration that cannot be rolled forward.

## RTO / RPO (set by ops)

Document target Recovery Time Objective and Recovery Point Objective for your deployment. Defaults assumed by tooling: last successful compressed backup in `BACKUP_DIR` (or off-host copy).

## Checklist

1. **Declare incident** — notify stakeholders; freeze writes to any surviving replica/primary if split-brain risk exists
2. **Preserve evidence** — capture Postgres logs, last migrate status, last known-good backup filename
3. **Provision target** — new empty Postgres (same major version preferred) with credentials matching `DATABASE_URL` plan
4. **Restore** — follow [RESTORE.md](./RESTORE.md) from the chosen backup
5. **Migrate catch-up** — if app expects newer schema: `npm run db:migrate:deploy`
6. **Verify** — `db:status`, `/api/health/ready`, business smoke tests
7. **Repoint** — update `DATABASE_URL` / Compose / DNS; restart app
8. **Resume traffic** — confirm Nginx upstream healthy
9. **Post-mortem** — root cause, backup gaps, improve retention/off-host copies

## Assumptions

- This project does not ship managed-cloud failover or streaming replicas in Phase 8-006
- Operators are responsible for off-host backup copies and scheduler configuration
- Schema is restored from dump; Prisma migrations table must remain consistent with applied SQL

## Related runbooks

- [BACKUP.md](./BACKUP.md)
- [RESTORE.md](./RESTORE.md)
- [DISASTER_RECOVERY.md](../DISASTER_RECOVERY.md) (Phase 8-010 index)
- [INCIDENT_DATABASE.md](./INCIDENT_DATABASE.md)
