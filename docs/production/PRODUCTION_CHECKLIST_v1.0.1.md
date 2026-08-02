# Production Deployment Checklist — v1.0.1

Use before and after cutting over MT-ERP **v1.0.1** on Render (or equivalent).

---

## Git

- [ ] On branch `main`
- [ ] Working tree clean after commit
- [ ] Commit includes Phase 22.7 identity security + version metadata
- [ ] No merge conflict markers / no in-progress rebase/merge
- [ ] `origin/main` updated (`git push origin main`)
- [ ] Annotated tag `v1.0.1` created and pushed
- [ ] Tag points at the release commit (`git rev-parse v1.0.1`)

## Version

- [ ] `package.json` version is `1.0.1`
- [ ] `CHANGELOG.md` has `[1.0.1]` entry
- [ ] `docs/production/RELEASE_NOTES_v1.0.1.md` reviewed

## Tag

- [ ] `git tag -a v1.0.1 -m "Release v1.0.1 — Identity Security Patch"`
- [ ] `git push origin v1.0.1`
- [ ] GitHub Release created from notes (optional but recommended)

## CI

- [ ] `ci` / `pull-request` workflows green on release commit (if PR path used)
- [ ] `release.yml` green for tag `v1.0.1`
- [ ] No high-severity audit failures blocking deploy policy

## Render

- [ ] Build Command: `npm ci && npm run build`
- [ ] Pre-Deploy Command: `npm run db:migrate:deploy`
- [ ] Start Command: `npm run start`
- [ ] Auto-deploy from `main` or manual deploy of `v1.0.1` confirmed
- [ ] Deploy succeeded; instance healthy

## Database

- [ ] Production `DATABASE_URL` points at intended Postgres
- [ ] Pre-deploy backup completed and verified non-empty
- [ ] No unexpected schema drift (`prisma migrate status` clean)

## Migration

- [ ] Pre-Deploy ran `npm run db:migrate:deploy` successfully
- [ ] This patch introduces **no new migrations** (confirm in deploy logs)

## Environment

- [ ] `DATABASE_URL` set
- [ ] `BETTER_AUTH_SECRET` set (≥ 32 chars, non-placeholder)
- [ ] `APP_URL` HTTPS
- [ ] `BETTER_AUTH_URL` HTTPS
- [ ] `NODE_ENV=production`
- [ ] `APP_ENV=production`

## Health endpoint

- [ ] `GET /api/health` → 200
- [ ] `GET /api/health/live` → 200
- [ ] `GET /api/health/ready` → 200 (`migrations.ok` true)

## Smoke tests

- [ ] Valid login succeeds
- [ ] Inactive user cannot log in / cannot use protected routes or APIs
- [ ] Worker can open `/api/users/me` (self profile)
- [ ] Worker cannot list users
- [ ] Manager cannot create/promote Owner
- [ ] Cannot demote the last active Owner
- [ ] Core modules load (dashboard, rentals, invoices, inventory) — regression only

## Rollback plan

- [ ] Rollback owner identified
- [ ] Previous tag known: `v1.0.0`
- [ ] Procedure: redeploy `v1.0.0` image/commit; no DB down-migration required for this patch
- [ ] Post-rollback health + login smoke
- [ ] See `docs/production/ROLLBACK.md` and `docs/production/runbooks/FAILED_DEPLOYMENT.md`
