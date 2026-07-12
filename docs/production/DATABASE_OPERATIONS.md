# Production Database Operations (Phase 8-006)

Operational guide for PostgreSQL + Prisma in Rental ERP. This document does **not** change application architecture, APIs, or schema — it describes how to operate the existing database safely.

## Architecture (operational)

| Layer | Role |
|-------|------|
| PostgreSQL | System of record |
| Prisma Migrate | Schema versioning via `prisma/migrations/` |
| Prisma Client + `@prisma/adapter-pg` | Application access with a configurable `pg` pool |
| `GET /api/health` | Liveness (no DB) |
| `GET /api/health/ready` | Readiness (connectivity + Prisma + `_prisma_migrations`) |
| `scripts/db/*` | Backup / restore / status tooling |

```
Operators ──► backup/restore scripts ──► PostgreSQL
App / Nginx ──► /api/health[/ready] ──► Prisma Client ──► pg pool ──► PostgreSQL
Deploy ──► prisma migrate deploy ──► _prisma_migrations
```

## Migration strategy

### Environments

| Environment | Command | Notes |
|-------------|---------|-------|
| **Local** | `npm run db:migrate` (`prisma migrate dev`) | Creates/applies migrations; interactive |
| **Staging / Production** | `npm run db:migrate:deploy` (`prisma migrate deploy`) | Applies committed migrations only; non-interactive |
| **Any** | `npm run db:status` / `npm run db:validate` | Status and schema validation |

Do **not** run `migrate dev` against production. Do **not** edit applied migration SQL unless you are performing an exceptional, coordinated repair (prefer a new forward migration).

### Safe deployment order

1. **Pre-flight**
   - `npm run db:validate` and `npm run db:generate` on the release artifact
   - Confirm `DATABASE_URL` points at the intended database
   - Take a backup (`npm run db:backup` or `./scripts/db/backup.sh`)
   - Review pending migrations (`npx prisma migrate status`)
2. **Migrate**
   - Stop or drain write traffic if the migration is not online-safe (see downtime guidance)
   - Run `npm run db:migrate:deploy` (or the Docker migrate target)
3. **Verify**
   - `npx prisma migrate status` reports up to date
   - `GET /api/health/ready` returns `200` with `checks.database.migrations.ok: true`
4. **Roll forward application**
   - Deploy / restart app containers that expect the new schema

### Rollback considerations

Prisma does not provide automatic down migrations. Prefer:

1. Restore from the pre-migration backup (see [runbooks/RESTORE.md](./runbooks/RESTORE.md)) if the migration failed mid-way or data is corrupted
2. Or ship a **new forward migration** that undoes a safe schema change
3. Never rewrite history of already-applied migrations in shared environments

### Zero / minimal downtime

- Prefer additive changes (new nullable columns, new tables, new indexes with `CONCURRENTLY` via careful SQL migrations when needed)
- Avoid dropping/renaming columns used by the currently running app version in the same deploy
- Typical pattern: expand → deploy app → contract (separate releases)
- Large table rewrites: schedule a maintenance window

### Pre-deployment validation checklist

- [ ] Migrations reviewed and committed under `prisma/migrations/`
- [ ] `migration_lock.toml` remains `provider = "postgresql"`
- [ ] Backup completed and spot-checked (non-empty `.sql.gz`)
- [ ] Staging applied the same migration set successfully
- [ ] Ready probe healthy after migrate

## Backup strategy

Scripts:

- Linux/macOS/CI: `scripts/db/backup.sh` → `npm run db:backup`
- Windows: `scripts/db/backup.ps1`
- Scheduler example only: `scripts/db/backup.cron.example` (do not enable in this phase)

Behavior:

- Full logical dump via `pg_dump` (plain SQL)
- Compressed with gzip → `rental-erp_YYYYMMDDTHHMMSSZ.sql.gz`
- Location: `BACKUP_DIR` (default `./backups`)
- Retention: delete files matching `rental-erp_*.sql.gz` older than `BACKUP_RETENTION_DAYS` (default 14; set `0` in shell scripts to skip prune)

Recommendations:

- Production: daily (or more frequent) off-host copies; retain 14–30 days locally + longer cold storage
- Always backup before `migrate deploy` and before major restores
- Store backups outside the database volume (and outside the app container filesystem when possible)

## Restore strategy

Scripts:

- `scripts/db/restore.sh` / `scripts/db/restore.ps1`
- Latest backup: no argument
- Selected backup: pass path to `.sql.gz`

After restore:

1. `npm run db:status` (or `./scripts/db/status.sh`)
2. `GET /api/health/ready`
3. Spot-check critical tables / login

See [runbooks/RESTORE.md](./runbooks/RESTORE.md) and [runbooks/DISASTER_RECOVERY.md](./runbooks/DISASTER_RECOVERY.md).

## Connection pooling

The app uses Prisma’s driver adapter with a **`pg` pool** configured via:

| Variable | Default | Guidance |
|----------|---------|----------|
| `DATABASE_POOL_MAX` | `10` | Start at 10 per app instance; keep `(instances × max) < Postgres max_connections` (leave headroom for admin/backups) |
| `DATABASE_POOL_IDLE_TIMEOUT_MS` | `30000` | Release idle clients |
| `DATABASE_POOL_CONNECTION_TIMEOUT_MS` | `5000` | Fail fast under pool exhaustion |

Production recommendations:

- Single-instance Compose: defaults are fine
- Multiple app replicas: lower `DATABASE_POOL_MAX` or raise Postgres `max_connections` deliberately
- Prefer SSL (`sslmode=require`) for remote Postgres

### PgBouncer (documentation only — not installed)

When you outgrow per-process pools (many replicas, connection storms):

1. Place PgBouncer in front of PostgreSQL on the private `data` network
2. Point `DATABASE_URL` at PgBouncer
3. Use **transaction** pooling for typical Prisma workloads; avoid session-only features through transaction mode
4. Keep a direct (non-pooled) URL for migrations/admin if your PgBouncer mode requires it
5. Re-tune `DATABASE_POOL_MAX` downward (app pool + PgBouncer pool should not multiply carelessly)

This phase does **not** add a PgBouncer service to Compose.

## Health verification

| Endpoint | Purpose | DB? |
|----------|---------|-----|
| `GET /api/health` | Process liveness | No |
| `GET /api/health/ready` | Readiness for LB / ops | Yes — `SELECT 1`, Prisma client, `_prisma_migrations` |

Nginx exposes both exact locations. Use `/api/health` for container HEALTHCHECK; use `/api/health/ready` before routing traffic after migrate/restore.

## Maintenance guidance

See [runbooks/MAINTENANCE.md](./runbooks/MAINTENANCE.md) for `VACUUM` / `ANALYZE`, index hygiene, and [runbooks/INCIDENT_DATABASE.md](./runbooks/INCIDENT_DATABASE.md) for outages.

## Production database checklist

- [ ] `DATABASE_URL` uses strong credentials and is not committed
- [ ] Pool settings sized for replica count
- [ ] Automated backups scheduled by ops (using provided scripts)
- [ ] Off-host backup retention verified
- [ ] Restore drill completed at least once on non-prod
- [ ] Migrations applied only via `migrate deploy`
- [ ] `/api/health` and `/api/health/ready` monitored
- [ ] Runbooks accessible to on-call

## Related runbooks

- [BACKUP.md](./runbooks/BACKUP.md)
- [RESTORE.md](./runbooks/RESTORE.md)
- [MIGRATIONS.md](./runbooks/MIGRATIONS.md)
- [MAINTENANCE.md](./runbooks/MAINTENANCE.md)
- [DISASTER_RECOVERY.md](./runbooks/DISASTER_RECOVERY.md)
- [INCIDENT_DATABASE.md](./runbooks/INCIDENT_DATABASE.md)
