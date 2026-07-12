# Production Security Hardening (Phase 8-009)

Enterprise hardening for Rental ERP without replacing Better Auth, RBAC, or audit logging. No WAF / cloud security services in this phase.

## Architecture

| Layer | Control |
|-------|---------|
| Edge (Nginx) | TLS, security headers, CSP, `limit_req` on `/api/auth/` and `/api/` |
| App (Next.js) | Same header set when `ENABLE_SECURITY_HEADERS=true` (app-only deploys) |
| Auth | Better Auth cookies, CSRF/origin checks, trustedOrigins, rate limits |
| API | Session auth + RBAC (`authenticateApiRequest` / `assertPermission`) |
| UX gate | Root `proxy.ts` (session); legacy `src/middleware.ts` disabled |
| Storage | Path traversal checks + size/MIME/extension allowlist |
| Secrets | `.gitignore`, env validation, `npm run secrets:scan`, optional Gitleaks |

**Header ownership:** With `docker-compose.prod.yml`, prefer Nginx headers and set `ENABLE_SECURITY_HEADERS=false` / `ENABLE_HSTS=false` on the app to avoid duplicates. Keep Next headers enabled for app-only hosting.

## HTTP security headers

Configured in:

- `src/shared/config/security-headers.ts` (Next)
- `nginx/snippets/security-headers.conf` (edge)

| Header | Value / notes |
|--------|----------------|
| CSP | See compromises below |
| HSTS | `max-age=63072000; includeSubDomains; preload` |
| X-Content-Type-Options | `nosniff` |
| X-Frame-Options | `DENY` |
| Referrer-Policy | `strict-origin-when-cross-origin` |
| Permissions-Policy | camera/mic/geo disabled |
| COOP | `same-origin` |
| CORP | `same-origin` |
| X-Permitted-Cross-Domain-Policies | `none` |
| COEP | **Not set** — breaks common third parties; not required |

### CSP compromises

Next.js App Router still injects inline bootstrapping without a wired nonce pipeline in this codebase. Therefore:

- `script-src 'self' 'unsafe-inline'` — required until nonce/`strict-dynamic` is implemented
- `style-src 'self' 'unsafe-inline'` — Tailwind / runtime styles
- `'unsafe-eval'` **omitted** — production Next builds should not need it
- Future: report-only CSP → nonces via middleware → enforce without `unsafe-inline`

## Cookie policy

Better Auth `advanced.defaultCookieAttributes`:

| Attribute | Value |
|-----------|--------|
| HttpOnly | `true` |
| Secure | `SECURE_COOKIES` (true in staging/production by default) |
| SameSite | `lax` |
| Path | `/` |

Session TTLs remain env-driven (`AUTH_SESSION_*`).

## CSRF strategy

Better Auth provides:

1. **Origin validation** against `baseURL` + `trustedOrigins` (`APP_URL`, `BETTER_AUTH_URL`, optional `AUTH_TRUSTED_ORIGINS`)
2. **SameSite=Lax** session cookies
3. Explicit `disableCSRFCheck: false` / `disableOriginCheck: false`

State-changing browser calls are same-origin App Router + cookie session. No separate double-submit CSRF token layer is required while SameSite + origin checks remain enabled. Do **not** set `disableCSRFCheck: true`.

## Rate limiting

| Layer | Scope | Default guidance |
|-------|--------|------------------|
| Better Auth | All auth routes; stricter sign-in / password reset | Window 60s; sign-in max 10; reset max 5 |
| Nginx | `/api/auth/` | `5r/s` burst 20 → 429 |
| Nginx | `/api/` | `30r/s` burst 60 → 429 |
| Health/metrics | Excluded from API zone via exact locations | Unauthenticated probes |

Tune via `AUTH_RATE_LIMIT_*` env and Nginx `limit_req_zone` rates. Multi-instance Auth limits are per process (in-memory) — edge Nginx limits remain authoritative across replicas.

## Input validation

- Module APIs: Zod schemas at application boundary (unchanged)
- Uploads: `validateUploadInput` enforces max size (`UPLOAD_MAX_FILE_SIZE_MB`), MIME allowlist, extension allowlist, path traversal rejection
- Client IP for audit: `resolveClientIp` only trusts `X-Real-IP` / `X-Forwarded-For` when `TRUSTED_PROXIES` is non-empty

## Secret management

- Never commit `.env` / production secrets
- Placeholders only in `*.example`
- `npm run secrets:scan` — portable regex scanner
- `.gitleaks.toml` — for local/CI Gitleaks when installed
- Enable GitHub Secret Scanning on the remote repository when available

## Dependency review

```bash
npm run audit        # production deps
npm run audit:ci     # fail on high+
```

Do not major-upgrade frameworks solely in this phase unless a critical advisory requires it. Track findings in `DEPENDENCY_AUDIT.md`.

## Security testing recommendations

1. Headers: `curl -I https://host/` and confirm CSP/HSTS/COOP
2. Cookies: DevTools → HttpOnly / Secure / SameSite on session cookie
3. Auth brute force: expect 429 from Nginx and/or Better Auth after thresholds
4. Upload: reject oversized / disallowed MIME
5. `npm run secrets:scan` + optional `gitleaks detect`
6. Periodic `npm run audit:ci` in CI (Phase 8-004 workflows can add a job)

## Incident response (auth / abuse)

1. Confirm blast radius (compromised account vs credential stuffing)
2. Rotate `BETTER_AUTH_SECRET` only with coordinated session invalidation plan
3. Disable affected users in identity module; review audit log by `requestId` / `userId`
4. Temporarily tighten Nginx `auth_limit` rates
5. Preserve logs; follow `docs/production/runbooks/INCIDENT_DATABASE.md` if data integrity is involved

## Related

- [SECURITY_CHECKLIST.md](./SECURITY_CHECKLIST.md)
- [REVERSE_PROXY.md](./REVERSE_PROXY.md)
- [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md)
- [DEPENDENCY_AUDIT.md](./DEPENDENCY_AUDIT.md)
