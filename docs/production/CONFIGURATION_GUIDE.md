# Configuration Guide — Phase 8-003

**Project:** Rental ERP  
**Scope:** Environment-driven production configuration (no architecture redesign)

---

## Approach

Configuration is **environment-variable driven** and validated once at process startup.

```
process.env
    → readProcessEnv()
    → envSchema (Zod) + fail-fast
    → env
    → logical config modules (app, auth, database, security, …)
    → application / infrastructure consumers
```

Rules:

- No environment-specific business logic branches outside config modules.
- No secrets in source control or logs (`getPublicEnvSnapshot` redacts secrets).
- Local → staging → production differ by **env values**, not code changes.

---

## Config Modules

| Module | Path | Responsibility |
|--------|------|----------------|
| Env schema | `src/shared/config/env.schema.ts` | Types, defaults, cross-field rules, groups |
| Env loader | `src/shared/config/env.ts` | Read, validate, fail-fast, public snapshot |
| Application | `app.config.ts` | Name, URLs, locale, timezone, deployment flags |
| Database | `database.config.ts` | `DATABASE_URL`, pool (`DATABASE_POOL_*`), backup directory/retention accessors |
| Auth | `auth.config.ts` | Better Auth secret/URL/session/password policy |
| Security | `security.config.ts` | Cookies, headers, trusted proxies, HSTS |
| Logging | `logging.config.ts` | Log level |
| Storage | `storage.config.ts` | Upload provider/path/size limits |
| Email | `email.config.ts` | SMTP settings |
| Notifications | `notifications.config.ts` | Email/SMS enablement |
| Cache | `cache.config.ts` | Default TTL |
| Features | `features.config.ts` | Feature flags |

Legacy nested fields on `appConfig.logging` / `uploads` / `notifications` remain for existing call sites; prefer the dedicated modules for new code.

Auth runtime wiring: `src/lib/auth/config.ts` consumes `authConfig` (session lifetimes and secure cookies are env-driven).

---

## Production Runtime Settings

| Concern | Source | Hardened default (staging/production) |
|---------|--------|----------------------------------------|
| `NODE_ENV` | env | `production` |
| `APP_ENV` | env | `staging` / `production` |
| Application URL | `APP_URL` | HTTPS required |
| Auth URL | `BETTER_AUTH_URL` | HTTPS required (defaults to `APP_URL`) |
| Timezone | `TIMEZONE` | set explicitly (e.g. `Asia/Karachi`) |
| Locale | `APP_LOCALE` | `en-PK` |
| Logging | `LOG_LEVEL` | `info` |
| Secure cookies | `SECURE_COOKIES` | `true` |
| Security headers | `ENABLE_SECURITY_HEADERS` | `true` (Next `headers()`) |
| HSTS | `ENABLE_HSTS` | `true` |
| Upload limits | `UPLOAD_MAX_FILE_SIZE_MB` | `10` |
| Cache TTL | `CACHE_TTL_SECONDS` | `300` |
| Session TTL | `AUTH_SESSION_*` | 7d / 1d / 5m cookie cache |
| Trusted proxies | `TRUSTED_PROXIES` | empty unless behind a reverse proxy |

Next.js production settings in `next.config.ts`:

- `output: "standalone"` (Docker)
- `poweredByHeader: false`
- `reactStrictMode: true`
- Conditional security headers / HSTS

---

## Secret Management Guidelines

1. Keep secrets only in platform secret stores or gitignored env files.
2. Commit **templates only** (`.env*.example`) with empty or obviously fake placeholders.
3. Rotate `BETTER_AUTH_SECRET` carefully (invalidates sessions).
4. Never print `DATABASE_URL`, `BETTER_AUTH_SECRET`, or `SMTP_PASSWORD` in logs.
5. Staging/production reject known placeholder secret patterns at startup.

---

## Switching Environments Without Code Changes

```bash
# Local
cp .env.example .env
# edit secrets → npm run dev

# Staging host / container
export $(grep -v '^#' .env.staging | xargs)   # or platform env injection
npm run start

# Production
# inject .env.production values via orchestrator / Compose --env-file
```

Docker image builds use `APP_ENV=local` so compile-time placeholders do not trip production HTTPS/secret checks. Runtime containers must set `APP_ENV=staging|production` with real secrets.

---

## Verification Checklist

- [ ] `npm run config:check` passes
- [ ] App starts with a valid `.env`
- [ ] App exits with clear grouped errors when a required secret is missing
- [ ] Staging/production reject `http://` `APP_URL` and placeholder secrets
- [ ] `npm run lint` / `typecheck` / `build` succeed with valid env
- [ ] Prisma validate/generate succeed with valid `DATABASE_URL`

---

## Related Docs

- [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md)
- [DOCKER.md](./DOCKER.md)
- [PRODUCTION_READINESS_REPORT.md](./PRODUCTION_READINESS_REPORT.md)
