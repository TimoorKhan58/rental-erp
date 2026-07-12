# Runbook: Migration Deployment

## Purpose

Apply committed Prisma migrations safely to staging or production.

## Commands

| Step | Command |
|------|---------|
| Validate schema | `npm run db:validate` |
| Generate client | `npm run db:generate` |
| Check status | `npm run db:status` |
| Deploy | `npm run db:migrate:deploy` |

Local development only: `npm run db:migrate` (`prisma migrate dev`).

## Staging / production sequence

1. Backup (`./scripts/db/backup.sh`)
2. `npx prisma migrate status` — note pending migrations
3. Drain or announce write freeze if migration is not online-safe
4. `npm run db:migrate:deploy`
5. Confirm status is up to date
6. Deploy application revision that expects the new schema
7. Confirm `GET /api/health/ready`

Docker: use the migrate image target / one-shot migrate service from Phase 8-002 docs (`docs/production/DOCKER.md`) with the same `migrate deploy` semantics.

## Rollback

- Prefer restore from the pre-migration backup if the migrate failed or left the DB unusable
- Prefer a new forward migration for reversible, non-destructive corrections
- Do not delete or rewrite applied migration folders in shared environments

## Forbidden

- `prisma migrate reset` in staging/production
- `prisma db push` as a substitute for migrate in shared environments
- Editing historical `migration.sql` files that are already applied
