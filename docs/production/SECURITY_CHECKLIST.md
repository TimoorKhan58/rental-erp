# Security Checklist — Phase 8-009

**Project:** Rental ERP  
**Updated:** 2026-07-11 (Phase 8-009)  
**Status legend:** Pass · Partial · Fail · N/A

---

## Authentication

| Check | Status | Notes |
|-------|--------|-------|
| Session-based auth (Better Auth) | Pass | Unchanged |
| Sign-up disabled | Pass | `disableSignUp: true` |
| Password minimum length | Pass | `AUTH_MIN_PASSWORD_LENGTH` ≥ 8 |
| Secure cookies | Pass | `SECURE_COOKIES` + explicit `httpOnly` / `sameSite=lax` |
| Session expiry / rotation | Pass | Env-driven TTLs |
| Auth secret validation | Pass | ≥ 32 chars; placeholders rejected in staging/prod |
| Trusted origins | Pass | `APP_URL` / `BETTER_AUTH_URL` + `AUTH_TRUSTED_ORIGINS` |
| CSRF / origin checks | Pass | Better Auth enabled; not disabled |
| Auth rate limiting | Pass | Better Auth + Nginx `/api/auth/` |
| UX gate | Pass | `proxy.ts` session validation; legacy cookie middleware disabled |
| ERP identity bridge | Partial | Unlinked sessions rejected — ops must link users |

## Authorization / RBAC

| Check | Status | Notes |
|-------|--------|-------|
| Permission catalog + role map | Pass | Unchanged |
| API enforcement | Pass | Route runners + `assertPermission` |
| Frontend gates | Pass | Unchanged |
| Role field not client-writable | Pass | `input: false` |

## Input / Output Validation

| Check | Status | Notes |
|-------|--------|-------|
| Zod request validation | Pass | Module schemas |
| Upload size / MIME / extension | Pass | `validateUploadInput` + `storageConfig` allowlists |
| Path traversal on storage keys | Pass | Rejects `..` |
| React XSS posture | Pass | No unsafe HTML sinks found |

## Web Security

| Check | Status | Notes |
|-------|--------|-------|
| Security headers (Next and/or Nginx) | Pass | CSP, HSTS, COOP, CORP, frame/options, etc. |
| CSP | Partial | `unsafe-inline` retained for Next/Tailwind; no `unsafe-eval`; nonce roadmap documented |
| CSRF | Pass | Origin + SameSite strategy documented |
| HTTPS | Pass | Hardened env requires HTTPS URLs; Nginx TLS |
| Rate limiting (API) | Pass | Nginx `/api/`; Auth stricter |
| COEP | N/A | Intentionally omitted |

## Secrets & Logging

| Check | Status | Notes |
|-------|--------|-------|
| `.env` gitignored | Pass | |
| Example envs placeholders only | Pass | |
| Env fail-fast | Pass | |
| Log redaction | Pass | Phase 8-007 redaction |
| Secret scan tooling | Pass | `npm run secrets:scan` + `.gitleaks.toml` |
| Audit logging | Pass | Unchanged domain audit |

## Dependencies

| Check | Status | Notes |
|-------|--------|-------|
| `npm run audit` / `audit:ci` scripts | Pass | Added Phase 8-009 |
| Major upgrades | N/A | Only if critical CVE requires |

## Storage

| Check | Status | Notes |
|-------|--------|-------|
| Local uploads | Pass | Hardened validation |
| S3 | Fail (deferred) | Still rejected by env schema |

## Residual risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| CSP `unsafe-inline` | Medium | Nonce/`strict-dynamic` follow-up |
| Auth rate limit in-memory per process | Low | Nginx edge limits across replicas |
| Single-tenant product | Info | Explicit tenancy phase if SaaS multi-tenant |
| Transitive npm advisories | Medium | `npm run audit:ci` in CI |

## Go-live checklist

- [ ] TLS certs installed; HSTS observed on HTTPS
- [ ] `SECURE_COOKIES=true` in staging/production
- [ ] `ENABLE_SECURITY_HEADERS` ownership decided (Nginx vs Next)
- [ ] `TRUSTED_PROXIES` set when forwarding client IPs for audit
- [ ] `METRICS_BEARER_TOKEN` set if `/api/metrics` is internet-reachable
- [ ] `npm run secrets:scan` clean
- [ ] `npm run audit:ci` reviewed
- [ ] Every production user has Auth ↔ ERP link
