# Production Deployment Checklist — v1.0.2

Use before and after cutting over MT-ERP **v1.0.2** on Render (or equivalent).

---

## Git

- [ ] On branch `main`
- [ ] Working tree clean after commit
- [ ] Commit is maintenance-only (no feature WIP)
- [ ] `origin/main` updated (`git push origin main`)
- [ ] Annotated tag `v1.0.2` created and pushed
- [ ] Tag points at the release commit (`git rev-parse v1.0.2`)

## Version

- [ ] `package.json` version is `1.0.2`
- [ ] `CHANGELOG.md` has `[1.0.2]` entry
- [ ] `docs/production/RELEASE_NOTES_v1.0.2.md` reviewed

## Environment (Render)

- [ ] `APP_ENV=production` / `NODE_ENV=production`
- [ ] `APP_URL` / `BETTER_AUTH_URL` HTTPS
- [ ] `BETTER_AUTH_SECRET` non-placeholder
- [ ] `DATABASE_URL` set
- [ ] `METRICS_BEARER_TOKEN` set **or** `ENABLE_METRICS=false`
- [ ] Optional: `AUTH_COOKIE_CACHE_MAX_AGE_SECONDS=60`

## Render commands

- [ ] Build: `npm ci && npm run build`
- [ ] Pre-Deploy: `npm run db:migrate:deploy`
- [ ] Start: `npm run start`

## Health

- [ ] `GET /api/health/live` → 200
- [ ] `GET /api/health/ready` → 200
- [ ] `GET /api/metrics` without bearer → 401 (when token configured)
- [ ] Login + dashboard load
- [ ] Invalid login `callbackUrl=https://evil.example` lands on dashboard (not external)

## Rollback

- [ ] Previous release tag `v1.0.1` known
- [ ] Rollback path understood ([ROLLBACK.md](./ROLLBACK.md))
