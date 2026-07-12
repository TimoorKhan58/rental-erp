# Release Process — Phase 8-010

Repeatable release process for Rental ERP. Complements [CICD.md](./CICD.md) (validate/build) and [DEPLOYMENT.md](./DEPLOYMENT.md) (host cutover).

---

## Versioning strategy

| Element | Convention |
|---------|------------|
| Application version | SemVer in `package.json` (`MAJOR.MINOR.PATCH`) |
| Git tags | `vX.Y.Z` matching `package.json` |
| Docker image tags | `rental-erp:vX.Y.Z` and optionally `rental-erp:git-<sha>` |
| Migrations | Timestamped Prisma folders under `prisma/migrations/` (never rewrite applied migrations) |

- **MAJOR** — incompatible API/schema/contract changes (rare; requires migration plan)  
- **MINOR** — backward-compatible features  
- **PATCH** — fixes and hardening  

Phase 8 releases are typically **MINOR** or **PATCH**.

---

## Pre-release validation

On the release candidate (CI green + local confirmation):

```bash
npm run lint
npm run typecheck
npm test
npm run config:check
npm run build
npm run secrets:scan
npm run audit:ci
npm run db:validate
```

Optional: `npm run analyze` for bundle review; Compose `config` render:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production config > /dev/null
```

---

## Release approval checklist

- [ ] CI workflows green on the release commit (`ci`, `pull-request` as applicable)
- [ ] Changelog / release notes drafted (features, fixes, ops notes, migration notes)
- [ ] Database migrations reviewed; staging applied successfully
- [ ] Backup of target DB completed and verified non-empty
- [ ] Secrets/env diffs reviewed (no accidental secret commits)
- [ ] Security headers / TLS still valid on staging
- [ ] Rollback owner identified ([ROLLBACK.md](./ROLLBACK.md))
- [ ] Go/No-Go approved by product + ops

---

## Release tagging

```bash
git checkout <release-commit>
# ensure package.json version matches
git tag -a vX.Y.Z -m "Release vX.Y.Z"
git push origin vX.Y.Z
```

Build deployable images from that tag:

```bash
git checkout vX.Y.Z
docker compose -f docker-compose.prod.yml --env-file .env.production build
docker tag rental-erp-prod-app:latest rental-erp:vX.Y.Z   # adjust image names to local compose naming
```

Record image IDs: `docker images --digests | grep rental`

---

## Deployment sequence (summary)

1. Announce maintenance window if migrations are not online-safe  
2. Backup database  
3. Pull/build release tag  
4. `migrate deploy` via migrate profile  
5. Roll app (+ nginx if config changed)  
6. Health + smoke tests  
7. Announce completion / monitor alerts  

Detailed steps: [DEPLOYMENT.md](./DEPLOYMENT.md) · [runbooks/UPDATE_APPLICATION.md](./runbooks/UPDATE_APPLICATION.md)

---

## Post-release verification

- [ ] `/api/health` and `/api/health/ready` = 200  
- [ ] Login works; one write path smoke (e.g. create draft rental order) succeeds  
- [ ] `prisma migrate status` up to date  
- [ ] Error rate / latency within baseline ([OBSERVABILITY.md](./OBSERVABILITY.md))  
- [ ] No unexpected 5xx in Nginx/app logs for 30–60 minutes  
- [ ] Tag release as **successful** in the ops log
