# Docker Guide — Phase 8-002

**Project:** Rental ERP (`rental-erp/`)  
**Phase:** 8-002 — Docker & Containerization

This guide covers building and running the application with Docker for development and production-style stacks. It does **not** cover Kubernetes, CI/CD, Nginx, or cloud deployment (later phases).

---

## Architecture Overview

| Artifact | Purpose |
|----------|---------|
| `Dockerfile` | Multi-stage **production** image (`deps` → `builder` → `runner`) plus `migrate` target |
| `Dockerfile.dev` | Development image with full deps for hot reload |
| `docker-compose.yml` | Local development: app + PostgreSQL |
| `docker-compose.prod.yml` | Production **example**: nginx + app + optional Postgres + migrate profile |
| `Dockerfile.nginx` | Nginx reverse proxy image (Phase 8-005) |
| `nginx/` | Nginx configs, snippets, TLS cert placeholders |
| `.dockerignore` | Keeps build context small and secret-free |
| `.env.docker.example` / `.env.production.example` | Env templates (no secrets committed) |
| `scripts/docker-entrypoint*.sh` | Dev Prisma generate; migrate DB wait helper |
| `GET /api/health` | Liveness endpoint for container health checks |

Runtime design:

- **Production app** uses Next.js `output: "standalone"` and runs as non-root user `nextjs` (uid 1001).
- **Prisma Client** is generated during image build (`src/generated/prisma`).
- **Migrations** run as a one-off `migrate` container/profile — not baked into the app start by default.

---

## Prerequisites

- Docker Engine 24+ / Docker Desktop
- Docker Compose v2
- Copy env templates before first run (see below)

---

## Environment Setup

### Development

```bash
cp .env.docker.example .env.docker
# Edit BETTER_AUTH_SECRET and POSTGRES_PASSWORD at minimum
```

Compose injects `DATABASE_URL` pointing at the `db` service hostname.

### Production example

```bash
cp .env.production.example .env.production
# Set APP_URL, BETTER_AUTH_*, DATABASE_URL, POSTGRES_* 
```

Never commit `.env.docker` or `.env.production`.

Required application variables (see also `docs/production/ENVIRONMENT_VARIABLES.md`):

| Variable | Notes |
|----------|-------|
| `DATABASE_URL` | Postgres connection string (`@db:5432` inside Compose) |
| `BETTER_AUTH_SECRET` | ≥ 32 characters |
| `APP_URL` / `BETTER_AUTH_URL` | Public origin (HTTPS in real production) |

---

## Development Workflow

Start the stack (app + Postgres) with hot reload:

```bash
npm run docker:dev
# equivalent: docker compose up --build
```

Open [http://localhost:3000](http://localhost:3000).

What Compose does:

- Builds `Dockerfile.dev`
- Mounts the project source into `/app`
- Uses named volumes for `node_modules`, `.next`, and uploads (avoids host/container conflicts)
- Waits for Postgres health before starting the app
- Runs `prisma generate` on container start via `scripts/docker-entrypoint.dev.sh`

Apply migrations (dev):

```bash
docker compose --profile migrate run --rm migrate
# or, inside the running app container:
docker compose exec app npx prisma migrate deploy
# for local schema iteration:
docker compose exec app npx prisma migrate dev
```

Stop:

```bash
npm run docker:dev:down
```

---

## Production Image Build

Build the optimized runtime image:

```bash
docker build -t rental-erp:latest .
# explicit target:
docker build --target runner -t rental-erp:latest .
```

Build the migrate image:

```bash
docker build --target migrate -t rental-erp-migrate:latest .
```

### Build stages

1. **deps** — `npm ci` (cached layer)
2. **builder** — `prisma generate` + `next build` (standalone)
3. **runner** (default) — copies standalone server, static assets, public files, generated Prisma client; non-root; healthcheck
4. **migrate** — Prisma CLI + schema/migrations for one-off `migrate deploy`

Build-time `DATABASE_URL` / `BETTER_AUTH_SECRET` ARG defaults are **placeholders** so the image can compile. Runtime must inject real secrets.

---

## Production Compose Example

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up --build -d
```

Run migrations before or after first boot:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production --profile migrate run --rm migrate
```

Stop:

```bash
npm run docker:prod:down
# or: docker compose -f docker-compose.prod.yml --env-file .env.production down
```

### Managed Postgres

If the database is external:

1. Set `DATABASE_URL` in `.env.production` to the managed instance.
2. Remove or comment out the `db` service and `depends_on` for `db` in a private override file (do not commit secrets).
3. Keep using the `migrate` profile against the managed URL.

---

## Prisma Migration Workflow (Containers)

| Goal | Command |
|------|---------|
| Generate client (dev entrypoint does this) | `npx prisma generate` |
| Deploy migrations (prod/CI) | `npx prisma migrate deploy` |
| Create migration (dev only) | `npx prisma migrate dev` |
| Validate schema | `npx prisma validate` |

Recommended production order:

1. Start Postgres (healthy)
2. Run `migrate` profile once
3. Start / roll out `app`

Do **not** run `migrate dev` against production databases.

---

## Health Checks

- HTTP: `GET /api/health` → `{ status: "ok", service: "rental-erp", timestamp }`
- Unauthenticated; excluded from business RBAC
- Wired into Dockerfile `HEALTHCHECK` and Compose `healthcheck` blocks
- Postgres uses `pg_isready`

Manual check:

```bash
curl -s http://localhost:3000/api/health
docker inspect --format='{{json .State.Health}}' <container>
```

---

## Networking & Volumes

**Development (`docker-compose.yml`)**

| Resource | Purpose |
|----------|---------|
| Network `rental-erp` | Bridge network for app ↔ db |
| Volume `postgres_data` | Postgres data |
| Volume `app_node_modules` | Container node_modules |
| Volume `app_next` | Next.js cache |
| Volume `app_uploads` | Local upload storage |

**Production example (`docker-compose.prod.yml`)**

| Resource | Purpose |
|----------|---------|
| Network `rental-erp` | Internal bridge |
| Volume `postgres_data` | DB persistence (if self-hosted) |
| Volume `app_uploads` | Upload persistence |

Postgres ports are published in **dev** only. The production example keeps Postgres internal.

---

## Common Commands

```bash
# Validate Compose files (no daemon required for basic config render)
docker compose -f docker-compose.yml config
docker compose -f docker-compose.prod.yml --env-file .env.production config

# Build only
docker compose build
docker build -t rental-erp:latest .

# Logs
docker compose logs -f app
docker compose logs -f db

# Shell
docker compose exec app sh

# Rebuild without cache
docker compose build --no-cache
```

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `Invalid environment configuration` | Missing/short `BETTER_AUTH_SECRET` or empty `DATABASE_URL` | Fix `.env.docker` / `.env.production` |
| App unhealthy / connection refused to DB | DB not ready or wrong host | Use hostname `db` inside Compose; wait for health |
| Prisma client missing after bind mount | Host overwrote `src/generated` | Entrypoint runs `prisma generate`; restart app |
| `permission denied` on uploads | Volume ownership | App runs as uid 1001; recreate volume if needed |
| CRLF script errors on Windows | Shell scripts checked out as CRLF | `.gitattributes` forces LF for `scripts/*.sh`; re-checkout scripts |
| Docker Desktop engine / WSL errors | Daemon not running or WSL disk issue | Start Docker Desktop; if VHDX errors persist, restart Docker Desktop/WSL and retry |
| Port 3000 / 5432 in use | Host conflict | Set `APP_PORT` / `POSTGRES_PORT` in env file (e.g. `POSTGRES_PORT=5433`) |

---

## Security Notes

- Images run as non-root (`nextjs:nodejs`).
- Secrets are supplied at runtime via Compose env files — not `COPY`’d into layers.
- `.dockerignore` excludes `.env*` secret files from the build context.
- Prefer HTTPS `APP_URL` / `BETTER_AUTH_URL` in real production.
- Do not publish Postgres ports on production hosts without a firewall / private network.

---

## Related Docs

- [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md)
- [PRODUCTION_READINESS_REPORT.md](./PRODUCTION_READINESS_REPORT.md)
- [CONFIGURATION_AUDIT.md](./CONFIGURATION_AUDIT.md)
