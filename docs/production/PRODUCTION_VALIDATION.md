# Production Validation Checklist — Phase 8-010

Final go-live validation. Complete before declaring the environment **production-ready**.

**Host:** _____________ **Tag:** _____________ **Validator:** _____________ **Date:** _____________

---

## Environment & configuration

- [ ] `.env.production` present on host only (not in git)
- [ ] `APP_URL` / `BETTER_AUTH_URL` are HTTPS and match certificate/DNS
- [ ] `BETTER_AUTH_SECRET` ≥ 32 chars, unique, non-placeholder
- [ ] `DATABASE_URL` points at intended DB
- [ ] `SECURE_COOKIES=true`
- [ ] Header ownership decided (`ENABLE_SECURITY_HEADERS` / Nginx) — see [SECURITY_HARDENING.md](./SECURITY_HARDENING.md)
- [ ] `TRUSTED_PROXIES` set if audit IPs must use `X-Forwarded-For`
- [ ] `METRICS_BEARER_TOKEN` set if `/api/metrics` is reachable beyond private scrapers
- [ ] `npm run config:check` (or equivalent) succeeded on release artifact

Ref: [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md) · [CONFIGURATION_GUIDE.md](./CONFIGURATION_GUIDE.md)

---

## Database

- [ ] Postgres healthy (`pg_isready` / Compose health)
- [ ] `prisma migrate status` — all migrations applied
- [ ] Connectivity via `/api/health/ready`
- [ ] Pre-go-live backup completed and stored off-host
- [ ] Restore procedure documented and rehearsed on non-prod

Ref: [DATABASE_OPERATIONS.md](./DATABASE_OPERATIONS.md) · [runbooks/MIGRATIONS.md](./runbooks/MIGRATIONS.md)

---

## Docker & networking

- [ ] `docker compose … ps` — `db` (if used), `app`, `nginx` up/healthy
- [ ] Host publishes only 80/443 (and SSH)
- [ ] App port 3000 not publicly mapped
- [ ] Networks: nginx cannot reach DB (`data` vs `edge`)

Ref: [DOCKER.md](./DOCKER.md) · [DEPLOYMENT.md](./DEPLOYMENT.md)

---

## HTTPS & reverse proxy

- [ ] Valid TLS certificate for `NGINX_SERVER_NAME`
- [ ] HTTP→HTTPS redirect works
- [ ] Security headers present on HTTPS responses
- [ ] WebSocket-capable proxy params retained for Next if needed
- [ ] Rate limits active on `/api/auth/` and `/api/`

Ref: [REVERSE_PROXY.md](./REVERSE_PROXY.md)

---

## Observability

- [ ] Application logs reachable (`docker compose logs`)
- [ ] `LOG_LEVEL` / `LOG_FORMAT` appropriate (`info` / `json` recommended)
- [ ] Health endpoints monitored or scheduled externally
- [ ] Metrics scrape configured **or** explicitly deferred with owner
- [ ] Alerting recommendations reviewed ([ALERTING.md](./ALERTING.md))

Ref: [OBSERVABILITY.md](./OBSERVABILITY.md) · [LOGGING_POLICY.md](./LOGGING_POLICY.md)

---

## Security

- [ ] `npm run secrets:scan` clean on release tree
- [ ] `npm run audit:ci` reviewed
- [ ] Cookie Secure/HttpOnly/SameSite verified in browser
- [ ] Auth rate limiting observed under repeated failed login (staging)

Ref: [SECURITY_CHECKLIST.md](./SECURITY_CHECKLIST.md)

---

## Performance & backups

- [ ] Performance notes acknowledged ([PERFORMANCE.md](./PERFORMANCE.md))
- [ ] Backup script/cron owner assigned
- [ ] Retention policy documented
- [ ] RTO/RPO recorded ([DISASTER_RECOVERY.md](./DISASTER_RECOVERY.md))

---

## Functional

- [ ] [SMOKE_TESTS.md](./SMOKE_TESTS.md) minimal go/no-go set passed
- [ ] Rollback owner and previous image/tag identified ([ROLLBACK.md](./ROLLBACK.md))

---

## Sign-off

| Gate | Owner | Go / No-Go | Date |
|------|-------|------------|------|
| Technical | | | |
| Security | | | |
| Product | | | |
