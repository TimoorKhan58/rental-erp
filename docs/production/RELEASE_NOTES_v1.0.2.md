# MT-ERP Release Notes — v1.0.2

**Product:** Manyar Tent ERP (Rental ERP)  
**Release:** 1.0.2  
**Type:** Patch (maintenance / production hardening)  
**Date:** 2026-08-02  
**Base:** v1.0.1  

---

## Summary

v1.0.2 is a maintenance release. It hardens login redirects, session revocation on role/email changes, metrics auth in hardened environments, API validation error envelopes, dashboard query performance, dependency advisories (Next.js), and operator documentation. No new business modules and no User Management product work.

---

## Security

- Sanitize post-login `callbackUrl` (block open redirects)
- Revoke Better Auth sessions on role change, email change, and deactivation
- Prefer ERP `Role` table over `AuthUser.role` cache for API RBAC
- Enforce active ERP user inside `requireSession` (defense in depth with proxy/API)
- Require `METRICS_BEARER_TOKEN` in staging/production when metrics are enabled
- Bump Next.js to 16.2.12 (clears high-severity advisory chain)

---

## Reliability / API

- Wrap module API handlers so `parseRequest` / JSON errors return `{ error, requestId }` with HTTP 400 instead of uncaught 500
- Dashboard status aggregates use Prisma `groupBy` instead of loading full status tables into memory

---

## UI polish

- Customer list uses shared `PageHeader` (consistent with peer modules)
- Dashboard error state uses `QueryErrorState` with retry

---

## Documentation / DX

- README aligned to v1.0.2, Node 22+, real folder layout, Render commands
- Historical banner on stale roadmap
- Render metrics token + trusted proxies notes in deployment docs
- Production checklist + release notes for v1.0.2
- CI runs `audit:ci` and `secrets:scan`

---

## Deployment Notes

| Item | Value |
|------|--------|
| Build | `npm ci && npm run build` |
| Pre-Deploy | `npm run db:migrate:deploy` |
| Start | `npm run start` |
| Schema | No new migrations in this release |
| New required env (hardened) | `METRICS_BEARER_TOKEN` when `ENABLE_METRICS=true` |

Set `METRICS_BEARER_TOKEN` on Render **before** deploying if metrics remain enabled.

Cookie cache example for production: `AUTH_COOKIE_CACHE_MAX_AGE_SECONDS=60` (shorter privilege lag after demotion).

---

## Out of scope

- User Management UI / invitations / MFA / forgot password
- Phase 22.9 identity product work
- New business modules (supplier payments UI, brands/categories UI, etc.)
- Breaking API or architecture changes

---

## Upgrade from v1.0.1

1. Set `METRICS_BEARER_TOKEN` (or `ENABLE_METRICS=false`)
2. Deploy tag `v1.0.2`
3. Smoke: login, dashboard, one write path, `/api/health/ready`, `/api/metrics` with bearer
