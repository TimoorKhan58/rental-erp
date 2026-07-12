# Runbook: Database Maintenance

## Purpose

Routine PostgreSQL hygiene for Rental ERP without changing application schema.

## Vacuum / Analyze

PostgreSQL autovacuum normally handles dead tuples. Operators may still run:

```sql
-- Lightweight statistics refresh (safe, short locks)
ANALYZE;

-- Targeted when a hot table shows bloat / stale stats
ANALYZE "TableName";

-- Full vacuum only during maintenance windows (exclusive lock)
-- VACUUM FULL "TableName";
```

Prefer `VACUUM (ANALYZE)` over `VACUUM FULL` unless disk reclaim requires it.

## Index maintenance

- Prefer additive indexes via Prisma migrations in low-traffic windows
- Monitor unused / duplicate indexes with `pg_stat_user_indexes` before dropping anything (drops require a migration)
- Rebuild only when corruption or severe bloat is confirmed:

```sql
REINDEX INDEX CONCURRENTLY "index_name";  -- PostgreSQL 12+
```

## Operational cadence

| Cadence | Action |
|---------|--------|
| Daily | Automated backup; review backup size trend |
| Weekly | Confirm ready probe + migrate status on staging/prod |
| Monthly | Review slow queries / table sizes; restore drill on non-prod |
| As needed | `ANALYZE` after large imports or restores |

## Application notes

- Do not change Prisma models for “tuning” without a formal schema change
- Connection pool settings: see `docs/production/DATABASE_OPERATIONS.md`
