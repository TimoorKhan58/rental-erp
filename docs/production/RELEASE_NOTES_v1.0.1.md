# MT-ERP Release Notes — v1.0.1

**Product:** Manyar Tent ERP (Rental ERP)  
**Release:** 1.0.1  
**Type:** Patch (identity / session security)  
**Date:** 2026-08-02  
**Base:** v1.0.0  

---

## Summary

v1.0.1 finalizes the Phase 22.7 Identity Security Patch as a production release. It hardens session and API authentication so inactive users cannot remain operational, closes Owner privilege-escalation paths, and protects the last active Owner account. No schema migrations and no breaking API contract changes are included.

---

## Security Fixes

- **Inactive session creation blocked** — Better Auth `session.create` hook rejects accounts whose linked ERP user is inactive or unlinked.
- **Inactive API/proxy access blocked** — Authenticated API requests and the Next.js edge proxy both require an active ERP user (`ensureActiveErpUser`); failures deny access.
- **Owner assignment restricted** — Only an Owner (or bootstrap with no actor role) may assign the Owner role.
- **Last-Owner protection on demotion** — Demoting the sole active Owner is rejected with the same last-owner semantics used for deactivation.

---

## Identity Improvements

- Actor role is threaded through identity application services / transaction scope for authorization-aware writes.
- Self-profile (`GET /api/users/me`) is authentication-only; Workers no longer need `identity:read`.
- Domain rules added: `assertCanAssignRole`, `assertCanChangeUserRole` (reusing `assertUserIsActive` / last-owner count patterns).
- Expanded unit and API tests covering escalation, demotion, self-profile, and inactive-user enforcement.

---

## Invoice Improvements

No changes in this release.

---

## Inventory Improvements

No changes in this release.

---

## Deployment Notes

| Item | Value |
|------|--------|
| Build Command | `npm ci && npm run build` |
| Pre-Deploy Command | `npm run db:migrate:deploy` |
| Start Command | `npm run start` |
| Migrations | None new in this patch — still run `db:migrate:deploy` so deploy stays idempotent |

**Required Render env**

- `DATABASE_URL`
- `BETTER_AUTH_SECRET` (≥ 32 chars, non-placeholder)
- `APP_URL` (HTTPS in production)
- `BETTER_AUTH_URL` (HTTPS in production)
- `NODE_ENV=production`
- `APP_ENV=production`

After deploy, verify `/api/health`, `/api/health/live`, `/api/health/ready`, then run identity smoke checks (login, inactive user denied, Worker `/api/users/me`, Owner-only Owner assignment).

---

## Known Limitations

- Existing Better Auth sessions for users deactivated *before* this deploy may still hold a cookie until expiry, logout, or next protected request/proxy check — API and proxy now reject inactive users even if a cookie remains.
- `package.json` under historical tag `v1.0.0` remained `0.1.0`; version metadata is corrected starting with `1.0.1`.
- CHANGELOG prior to 1.0.1 still documents only the original `0.1.0` scaffold entry; intermediate release history was not backfilled in this patch.

---

## Upgrade Notes

1. Deploy from tag `v1.0.1` (commit after this release is finalized).
2. No Prisma migration is required for this patch.
3. Confirm Render Pre-Deploy Command is `npm run db:migrate:deploy`.
4. Smoke-test inactive-user denial and Owner role rules after cutover.
5. Optional: force logout / rotate sessions if you need immediate invalidation of any pre-existing inactive-user cookies.

---

## Breaking Changes

None.

Role-assignment and inactive-user behavior is stricter; clients that relied on Managers creating Owners, demoting the last Owner, or inactive users retaining access will now receive authorization / unprocessable errors. That is intentional security hardening, not an API shape break.
