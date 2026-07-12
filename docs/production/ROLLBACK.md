# Rollback Plan — Phase 8-010

Use when a production release fails health checks, smoke tests, or causes unacceptable regressions.

**Critical:** Prisma does not auto-generate down migrations. Prefer **forward fixes** or **restore from pre-release backup** for schema-breaking failures.

---

## Decision guide

| Failure mode | Preferred action |
|--------------|------------------|
| App bug, **no** migration in release | Roll back app image/containers only |
| Migration applied, additive & compatible with old app | Roll back app; leave DB forward (old app must still work) |
| Migration applied, **breaks** old app | Restore DB from pre-migrate backup **or** ship hotfix forward migration |
| Bad config/env | Restore previous `.env.production` and recreate containers |
| Bad TLS/Nginx config | Restore prior `nginx/` certs/config; reload/restart nginx |

---

## 1. Application / Docker image rollback

```bash
# Note currently running image IDs
docker compose -f docker-compose.prod.yml --env-file .env.production ps
docker images

# Check out previous known-good tag
git checkout vX.Y.Z-previous

# Rebuild/repull previous images
docker compose -f docker-compose.prod.yml --env-file .env.production build app
# Or: docker tag rental-erp:vX.Y.Z-previous … && retarget compose

docker compose -f docker-compose.prod.yml --env-file .env.production up -d app
# Restart nginx if needed
docker compose -f docker-compose.prod.yml --env-file .env.production up -d nginx
```

Validate: [SMOKE_TESTS.md](./SMOKE_TESTS.md) minimal set (auth + health + one module).

---

## 2. Configuration rollback

1. Restore previous `.env.production` from secure backup (not git)  
2. Recreate app (and nginx if env affects proxy):  

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --force-recreate app nginx
```

3. Confirm `SECURE_COOKIES`, `APP_URL`, `DATABASE_URL` match the intended environment  

---

## 3. Database considerations

### Before every migrate-containing release

```bash
# From host with DATABASE_URL and client tools
./scripts/db/backup.sh
```

Store the filename in the release ticket.

### If rollback requires prior schema

1. Stop app write traffic (`docker compose … stop app` or maintenance page)  
2. Follow [runbooks/RESTORE.md](./runbooks/RESTORE.md) using the **pre-migration** dump  
3. Confirm `npm run db:status` / migrate status matches the rolled-back app tag  
4. Start previous app image  
5. Run readiness + smoke tests  

Never delete rows from `_prisma_migrations` ad hoc without a restore plan.

---

## 4. Nginx / certificate rollback

- Revert `nginx/` config from git tag  
- Restore previous PEMs into `nginx/certs/`  
- `docker compose … exec nginx nginx -t && docker compose … exec nginx nginx -s reload`  
  or recreate the nginx service  

---

## 5. Validation after rollback

- [ ] `/api/health` and `/api/health/ready` = 200  
- [ ] Login succeeds  
- [ ] Critical path smoke (orders or invoices) OK  
- [ ] Error rates normalized  
- [ ] Incident notes updated; root cause scheduled  

---

## Related

- [RELEASE_PROCESS.md](./RELEASE_PROCESS.md)  
- [runbooks/FAILED_DEPLOYMENT.md](./runbooks/FAILED_DEPLOYMENT.md)  
- [runbooks/MIGRATIONS.md](./runbooks/MIGRATIONS.md)  
- [runbooks/DISASTER_RECOVERY.md](./runbooks/DISASTER_RECOVERY.md)
