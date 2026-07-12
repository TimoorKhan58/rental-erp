# Environment Variables — Phase 8-003

**Project:** Rental ERP  
**Source of truth:** `src/shared/config/env.schema.ts` + `src/shared/config/env.ts`  
**Config modules:** `src/shared/config/*.config.ts`  
**Templates:** `.env.example`, `.env.staging.example`, `.env.production.example`, `.env.docker.example`

---

## Validation Strategy

1. Process environment is read by `readProcessEnv()` (never logs secret values).
2. Zod schema (`envSchema`) validates types, defaults, and cross-field rules.
3. `parseEnvResult()` returns structured success/failure (used by tests and tooling).
4. Application import of `env` **fails fast** (`process.exit(1)`) with grouped error messages.
5. Staging/production (`APP_ENV`) enforce HTTPS URLs and reject placeholder secrets.
6. `UPLOAD_STORAGE=s3` is rejected until the S3 adapter exists.
7. SMTP fields are required only when `ENABLE_EMAIL=true`.

Run focused validation tests:

```bash
npm run config:check
```

---

## Deployment Environments

| `APP_ENV` | Typical `NODE_ENV` | Purpose |
|-----------|--------------------|---------|
| `local` | `development` | Developer machine / Docker Compose dev |
| `development` | `development` | Shared development hosts |
| `staging` | `production` | Pre-production with hardened settings |
| `production` | `production` | Live system |
| `test` | `test` | Automated tests |

`APP_ENV` drives operational safeguards. `NODE_ENV` drives framework/build mode.

When `APP_ENV` is omitted it defaults from `NODE_ENV` (`production` → `production`, `test` → `test`, else `development`).

---

## Variable Catalog

### Runtime / deployment

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | `development` | `development` \| `test` \| `production` |
| `APP_ENV` | No | derived | `local` \| `development` \| `staging` \| `production` \| `test` |

### Application

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `APP_NAME` | No | `Rental ERP` | Application display name |
| `APP_URL` | No | `http://localhost:3000` | Canonical public origin (**HTTPS required** in staging/production) |
| `APP_LOCALE` | No | `en-PK` | Default locale |
| `TIMEZONE` | No | `UTC` | Application timezone |
| `NEXT_PUBLIC_APP_URL` | No | — | **Deprecated** fallback for `APP_URL` |

### Database (secret)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | **Yes** | — | PostgreSQL connection string |
| `DATABASE_POOL_MAX` | No | `10` | Max connections in the Prisma `pg` adapter pool |
| `DATABASE_POOL_IDLE_TIMEOUT_MS` | No | `30000` | Idle client timeout before release |
| `DATABASE_POOL_CONNECTION_TIMEOUT_MS` | No | `5000` | Time to wait for a new connection |
| `BACKUP_DIR` | No | `./backups` | Directory for `scripts/db/backup.*` dumps |
| `BACKUP_RETENTION_DAYS` | No | `14` | Days to keep compressed backups (`0` disables prune in shell scripts) |

### Authentication (secret: `BETTER_AUTH_SECRET`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `BETTER_AUTH_SECRET` | **Yes** | — | Signing secret; **≥ 32 chars**; placeholders rejected in staging/production |
| `BETTER_AUTH_URL` | No | `APP_URL` | Better Auth base URL |
| `AUTH_SESSION_EXPIRES_IN_SECONDS` | No | `604800` | Session lifetime (7 days) |
| `AUTH_SESSION_UPDATE_AGE_SECONDS` | No | `86400` | Session refresh window (1 day) |
| `AUTH_COOKIE_CACHE_MAX_AGE_SECONDS` | No | `300` | Cookie cache TTL (5 minutes) |
| `AUTH_MIN_PASSWORD_LENGTH` | No | `8` | Minimum password length |
| `AUTH_TRUSTED_ORIGINS` | No | empty | Extra CSRF/redirect origins (comma-separated) |
| `AUTH_RATE_LIMIT_ENABLED` | No | `true` | Enable Better Auth rate limiting |
| `AUTH_RATE_LIMIT_WINDOW_SECONDS` | No | `60` | Default auth rate-limit window |
| `AUTH_RATE_LIMIT_MAX` | No | `100` | Default max requests per window |
| `AUTH_RATE_LIMIT_SIGN_IN_WINDOW_SECONDS` | No | `60` | Sign-in window |
| `AUTH_RATE_LIMIT_SIGN_IN_MAX` | No | `10` | Sign-in max attempts per window |
| `AUTH_RATE_LIMIT_PASSWORD_RESET_WINDOW_SECONDS` | No | `60` | Password-reset window |
| `AUTH_RATE_LIMIT_PASSWORD_RESET_MAX` | No | `5` | Password-reset max per window |

### Security

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `TRUSTED_PROXIES` | No | empty | Comma-separated trusted proxy list |
| `SECURE_COOKIES` | No | `true` in staging/production | Force secure auth cookies |
| `ENABLE_SECURITY_HEADERS` | No | `true` in staging/production | Emit security headers from Next config |
| `ENABLE_HSTS` | No | `true` in staging/production | Emit HSTS header |

### Logging

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `LOG_LEVEL` | No | `info` hardened / `debug` otherwise | `debug` \| `info` \| `warn` \| `error` |
| `LOG_FORMAT` | No | `json` hardened / `pretty` otherwise | Structured JSON vs human-readable console |

### Observability

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ENABLE_METRICS` | No | `true` | Expose Prometheus text at `GET /api/metrics` |
| `METRICS_BEARER_TOKEN` | No | — | Optional bearer token required for metrics scrape |
| `ERROR_TRACKER_PROVIDER` | No | `none` | `none` \| `sentry` \| `datadog` \| `newrelic` \| `azure` \| `otlp` |
| `ERROR_TRACKER_DSN` | No | — | Vendor DSN / connection string (never commit) |

### Storage

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `UPLOAD_STORAGE` | No | `local` | `local` only for now (`s3` rejected) |
| `UPLOAD_PATH` | No | `./uploads` | Local upload root |
| `UPLOAD_MAX_FILE_SIZE_MB` | No | `10` | Max upload size (MB) |

### Cache

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CACHE_TTL_SECONDS` | No | `300` | Reserved TTL for future server-side caches; unused in Phase 8-008 (see PERFORMANCE.md) |

### Email / SMTP (secret: `SMTP_PASSWORD`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SMTP_HOST` | Conditional | — | Required if `ENABLE_EMAIL=true` |
| `SMTP_PORT` | Conditional | — | Required if email enabled |
| `SMTP_USER` | No | — | SMTP username |
| `SMTP_PASSWORD` | No | — | SMTP password (**secret**) |
| `SMTP_FROM` | Conditional | — | From address; required if email enabled |
| `SMTP_SECURE` | No | `true` | Prefer TLS |

### Feature flags

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ENABLE_EMAIL` | No | `false` | Enable email notifications path |
| `ENABLE_SMS` | No | `false` | SMS feature flag |

---

## Secrets (never commit)

| Secret | Notes |
|--------|-------|
| `DATABASE_URL` | Includes DB credentials |
| `BETTER_AUTH_SECRET` | Auth signing key |
| `SMTP_PASSWORD` | Only when email enabled |
| Compose `POSTGRES_PASSWORD` | Docker stacks only |

Generate auth secret:

```bash
openssl rand -base64 32
```

Use a secret manager / platform env injection in staging and production. Local files (`.env`, `.env.staging`, `.env.production`, `.env.docker`) are gitignored.

---

## Example Profiles

| Profile | Template |
|---------|----------|
| Local / development | `.env.example` |
| Staging | `.env.staging.example` |
| Production | `.env.production.example` |
| Docker Compose (dev) | `.env.docker.example` |

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `Invalid environment configuration` on boot | Missing/invalid vars | Read grouped errors; compare with `.env.example` |
| Placeholder secret rejected | `APP_ENV=staging\|production` | Generate a real `BETTER_AUTH_SECRET` |
| APP_URL must use HTTPS | Hardened environment | Use `https://` origins |
| Docker build fails env validation | Build used production hardening | Ensure build `APP_ENV=local` (Dockerfile default) |
| SMTP_* required | `ENABLE_EMAIL=true` | Provide host/port/from or disable email |

---

## Related

- [CONFIGURATION_GUIDE.md](./CONFIGURATION_GUIDE.md)
- [DOCKER.md](./DOCKER.md)
- [SECURITY_CHECKLIST.md](./SECURITY_CHECKLIST.md)
