# Phase 20 RC1 — Production Deployment Validation Report

**Status:** Deployment hardening applied; operator dress rehearsal required before go-live.  
**Scope:** Production deployment surfaces only (no business-feature changes).  
**Date:** 2026-08-01

---

## Summary

MT-ERP (`rental-erp`) was already strongly packaged (multi-stage non-root Docker, Nginx TLS, Zod env fail-fast, health/metrics, migrate profile, backup/restore runbooks). Phase 20 RC1 closed the remaining **startup and orchestration footguns** that could block a first production cutover.

---

## Issues addressed in this phase

| Severity | Issue | Resolution |
|----------|-------|------------|
| Critical | `npm run docker:prod` omitted `--env-file .env.production` | Scripts now pass `--env-file`; added `docker:prod:migrate` |
| High | Metrics token empty + metrics default on → migrate/app crash | Migrate forces `ENABLE_METRICS=false`; app env documents token; docs/examples aligned |
| High | Compose health used liveness only | App Compose healthcheck → `/api/health/ready` |
| High | Uploads volume root-owned → permission denied | `uploads-init` one-shot chown to uid 1001 |
| High | Managed Postgres undocumented as a templated override | `docker-compose.managed-db.override.example.yml` |
| High | Render env checklist omitted metrics token | DEPLOYMENT.md updated |
| Medium | Missing TLS PEMs block Nginx on first boot | `npm run certs:lab` + certs README |
| Medium | No `stop_grace_period` | App 30s / Nginx 15s |
| Medium | Secrets scan not in CI | Added to `ci.yml` and `pull-request.yml` |
| Medium | Doc drift (`AUTH_COOKIE_CACHE` default 300 vs 0) | ENVIRONMENT_VARIABLES.md corrected |

---

## Operator checklist pointers

- Deploy: [DEPLOYMENT.md](./DEPLOYMENT.md)
- Validate: [PRODUCTION_VALIDATION.md](./PRODUCTION_VALIDATION.md) (includes Phase 20 RC1 gates)
- Smoke: [SMOKE_TESTS.md](./SMOKE_TESTS.md) (R1–R14)
- Env: [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md)
- Docker: [DOCKER.md](./DOCKER.md)

---

## Explicit non-goals (unchanged)

- No Prisma replacement, Better Auth replacement, Clean Architecture / DDD / repository changes
- No new business features or schema redesigns
- No registry push / cloud CD (still operator-driven Compose; documented as future)
