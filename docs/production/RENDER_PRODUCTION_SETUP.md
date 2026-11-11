# Render Production Setup — MT-ERP

**Audience:** Operators preparing production on [Render](https://render.com).  
**Release candidate to deploy:** `32a41d4` (do **not** deploy arbitrary WIP).  
**Companion docs:** [DEPLOYMENT.md](./DEPLOYMENT.md) · [ROLLBACK.md](./ROLLBACK.md) · [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md) · [runbooks/MIGRATIONS.md](./runbooks/MIGRATIONS.md) · [runbooks/BACKUP.md](./runbooks/BACKUP.md)

This guide prepares Render. It does **not** authorize production migrate/deploy by itself.

---

## Architecture

```text
Internet (HTTPS)
    ↓
Render Web Service (Node 22, next start)
    ↓  DATABASE_URL (Render internal URL preferred)
Render PostgreSQL
```

| Component | Choice |
|-----------|--------|
| Service type | **Web Service** |
| Runtime | **Node** |
| Node version | **22.x** (`package.json` `engines`) |
| Package manager | **npm** (`package-lock.json`) |
| Artifact | Native Next.js (`npm run start`) — **not** Docker standalone |
| Database | **Render PostgreSQL** (or other managed Postgres with `sslmode=require`) |
| Health check | `GET /api/health` |

Docker Compose (`docker-compose.prod.yml`) remains supported for self-hosted cutovers. Render uses the **native Node** path documented in DEPLOYMENT.md.

---

## Dashboard settings (must match)

| Setting | Value |
|---------|--------|
| Build Command | `npm ci && npm run build` |
| Start Command | `npm start` |
| Health Check Path | `/api/health` |
| Pre-Deploy Command | See [First cutover vs ongoing](#first-cutover-vs-ongoing-deploys) |

Optional Blueprint: root `render.yaml` (names only; secrets via Dashboard / `sync: false`).

---

## First cutover vs ongoing deploys

### First production cutover (F-09 / empty or existing prod DB)

**Do not** rely on Pre-Deploy migrate until backup + F-09 orphan preflight + explicit operator approval succeed.

Safe sequence:

```text
1. Provision Render Web Service + PostgreSQL
2. Set all required env vars (Dashboard)
3. Attach custom domain + wait for HTTPS
4. Take / verify production DB backup (off-host)
5. F-09 orphan preflight → ORPHAN_COUNT must be 0
6. Explicit operator approval
7. Run: npm run db:migrate:deploy  (against production DATABASE_URL only)
8. Deploy / start release candidate 32a41d4
9. Verify /api/health|ready|live|startup + smoke
10. Optionally enable Pre-Deploy Command for future deploys
```

### Ongoing deploys (after schema is aligned)

Pre-Deploy Command may be:

```text
npm run db:migrate:deploy
```

(idempotent `prisma migrate deploy`). Still take backups before releases that introduce new migrations.

---

## Environment variables (names only)

Set in **Render Dashboard → Environment**. Never commit values.

### Required (runtime)

| Variable | Secret? | Notes |
|----------|---------|-------|
| `NODE_ENV` | No | `production` |
| `APP_ENV` | No | `production` |
| `APP_URL` | No | `https://<real-production-domain>` |
| `BETTER_AUTH_URL` | No | Same HTTPS origin as `APP_URL` |
| `BETTER_AUTH_SECRET` | **Yes** | ≥ 32 chars; non-placeholder; generate with `openssl rand -base64 32` |
| `DATABASE_URL` | **Yes** | Render Postgres **internal** connection string when Web Service and DB are in the same region/account |

### Strongly recommended

| Variable | Secret? | Notes |
|----------|---------|-------|
| `SECURE_COOKIES` | No | `true` |
| `TIMEZONE` | No | e.g. `Asia/Karachi` |
| `APP_LOCALE` | No | e.g. `en-PK` |
| `LOG_LEVEL` | No | `info` |
| `LOG_FORMAT` | No | `json` |

### Optional / defaulted

| Variable | Notes |
|----------|-------|
| `DATABASE_POOL_*` | Pool sizing |
| `BACKUP_DIR` / `BACKUP_RETENTION_DAYS` | Meaningful if backup jobs run with disk access; on Render prefer managed backups + off-host dump |
| `AUTH_*` session/rate-limit vars | Defaults in schema |
| `TRUSTED_PROXIES` | Only if your edge requires explicit list |
| `METRICS_BEARER_TOKEN` | Secret if scraping `/api/metrics` |
| `ENABLE_EMAIL` + `SMTP_*` | Only if email enabled |
| `UPLOAD_*` | Local disk on Render is ephemeral unless a disk is attached |

### Forbidden in production

| Pattern | Why |
|---------|-----|
| `localhost` / `127.0.0.1` URLs | Not public HTTPS |
| HTTP `APP_URL` / `BETTER_AUTH_URL` | Rejected when `APP_ENV=production` |
| Placeholder `BETTER_AUTH_SECRET` | Rejected by env schema |
| Staging DB URL | Wrong environment |
| Developer laptop `.env` | Not production |

---

## Domain and HTTPS

1. In Render: Custom Domain → add hostname.  
2. Configure DNS (CNAME/A as Render instructs).  
3. Wait until Render TLS is **Active**.  
4. Set:

```text
APP_URL=https://<real-production-domain>
BETTER_AUTH_URL=https://<real-production-domain>
```

5. Confirm `SECURE_COOKIES=true` (or rely on hardened defaults).

Do not go live on `*.onrender.com` alone if the business requires a branded HTTPS origin—operators may use the Render URL only for temporary plumbing checks.

---

## Health endpoints

| Path | Purpose |
|------|---------|
| `/api/health` | Liveness (use as Render Health Check Path) |
| `/api/health/live` | Liveness alias |
| `/api/health/ready` | Config + Prisma + DB |
| `/api/health/startup` | Config + Prisma client |

---

## Database plan

```text
Render PostgreSQL
      ↓  (internal DATABASE_URL)
MT-ERP Web Service
```

- Prefer **internal** DB URL for the Web Service.  
- External URL only for operator tooling (backup clients, one-off migrate shells) with TLS.  
- Never point production at local or staging databases.

### F-09 orphan preflight (read-only; production)

```sql
SELECT COUNT(*) AS orphan_count
FROM repairs r
LEFT JOIN return_inspection_items rii ON rii.id = r."returnInspectionItemId"
WHERE rii.id IS NULL;
```

Required: `orphan_count = 0`. If greater than zero → **STOP** — do not migrate, do not delete orphans automatically.

Migration (after backup + approval only):

```bash
npm run db:migrate:deploy
```

Forbidden: `prisma migrate reset`, dropping DB/schema, rewriting `_prisma_migrations`.

---

## Backup / restore

| Item | Guidance |
|------|----------|
| Method | Logical dump (`pg_dump` / `scripts/db/backup.*`) **and/or** Render managed backups |
| Location | Off-host / object storage (not only the instance filesystem) |
| Verify | Non-empty artifact; optional `gunzip -t` / restore to disposable DB |
| Restore | [runbooks/RESTORE.md](./runbooks/RESTORE.md) |
| Rollback | [ROLLBACK.md](./ROLLBACK.md) — prefer forward fix or restore pre-migrate dump |

Pre-migration backup is **mandatory**. Restore drill status must not be claimed unless performed.

---

## Deploying exactly `32a41d4`

1. Ensure Git remote contains commit `32a41d4` (may require **operator-approved** `git push` — see below).  
2. In Render: Manual Deploy → select commit / tag pointing at `32a41d4`.  
3. Do **not** deploy dirty WIP or unreviewed tip commits unless they are intentional docs-only and explicitly approved.

### Push gate

```text
PUSH REQUIRED FOR RENDER DEPLOYMENT
```

If `origin` does not yet contain `32a41d4`, an operator must explicitly approve push. Never force-push. Never rewrite history.

Current local tip may include later **docs-only** commits (e.g. Phase 79 report). Production **application** cutover still targets RC **`32a41d4`** unless operators explicitly choose a newer docs-only SHA (no app delta).

---

## Rollback reference

Follow [ROLLBACK.md](./ROLLBACK.md):

- App-only regression → redeploy previous known-good commit on Render.  
- Bad migration → restore from **pre-migrate** backup (no Prisma down migrations).  
- Bad env → fix Dashboard env; redeploy/restart.

---

## Operator checklist

```text
[ ] Render account/project ready
[ ] Web Service created (Node 22, build/start/health as above)
[ ] Render PostgreSQL created
[ ] DATABASE_URL configured (internal)
[ ] APP_ENV=production
[ ] NODE_ENV=production
[ ] APP_URL=https://<real-domain>
[ ] BETTER_AUTH_URL=https://<real-domain>
[ ] BETTER_AUTH_SECRET set (non-placeholder)
[ ] Remaining required env configured
[ ] Custom domain + HTTPS active
[ ] Health check = /api/health
[ ] Build/typecheck/prisma validate known green on RC
[ ] Production DB reachable
[ ] Production backup completed + verified + off-host
[ ] F-09 orphan preflight = 0
[ ] Explicit approval for migrate
[ ] migrate deploy succeeded
[ ] Deploy 32a41d4
[ ] /api/health|ready|live|startup PASS
[ ] Smoke (auth + core path) PASS
[ ] Rollback procedure reviewed
```

---

## Related audits

- Phase 78 CONDITIONAL GO — cutover prerequisites  
- Phase 79 FAILED — cutover blocked (no prod env/HTTPS yet)
