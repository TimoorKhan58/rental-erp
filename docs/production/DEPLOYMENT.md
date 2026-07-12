# Production Deployment Guide — Phase 8-010

**Project:** Rental ERP  
**Stack:** Docker Compose + Nginx + PostgreSQL + Next.js standalone  
**Constraint:** This guide prepares operators to deploy. It does **not** deploy to a live production environment from the repository.

Cross-references: [DOCKER.md](./DOCKER.md) · [REVERSE_PROXY.md](./REVERSE_PROXY.md) · [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md) · [DATABASE_OPERATIONS.md](./DATABASE_OPERATIONS.md) · [SECURITY_HARDENING.md](./SECURITY_HARDENING.md)

---

## 1. Server requirements

### Operating system

| Recommendation | Notes |
|----------------|-------|
| **Ubuntu Server 22.04/24.04 LTS** or **RHEL/Rocky 9** | Best Docker Engine support |
| Linux x86_64 | Primary target |
| Windows Server + Docker Desktop | Acceptable for lab only — prefer Linux for production |

### Sizing (single-host Compose)

| Profile | vCPU | RAM | Disk | Use |
|---------|------|-----|------|-----|
| Small | 2 | 4 GB | 40 GB SSD | Pilot / low concurrent users |
| **Recommended** | 4 | 8 GB | 80–100 GB SSD | Typical tent/event rental SME |
| Growth | 8 | 16 GB | 200 GB+ SSD | Heavier reporting + uploads |

Allocate separate headroom for:

- PostgreSQL data volume
- Upload volume (`app_uploads`)
- Compressed backups (off-host preferred)
- Docker image layers

### Network

- Public **80/443** only (via Nginx)
- SSH restricted (bastion / key-only)
- App (`3000`) and Postgres (`5432`) **not** published to the internet (`docker-compose.prod.yml` already follows this)

---

## 2. Prerequisites

1. Docker Engine 24+ and Compose v2  
2. Git access to the release tag  
3. TLS certificates for the public hostname (`nginx/certs/fullchain.pem`, `privkey.pem`) — see [REVERSE_PROXY.md](./REVERSE_PROXY.md)  
4. Secrets ready (not committed): `BETTER_AUTH_SECRET`, `POSTGRES_PASSWORD`, optional `METRICS_BEARER_TOKEN`

```bash
# Verify tooling
docker version
docker compose version
```

---

## 3. Environment variable setup

```bash
cd rental-erp
cp .env.production.example .env.production
# Edit .env.production — never commit this file
```

Minimum required for Compose production:

| Variable | Purpose |
|----------|---------|
| `APP_URL` / `BETTER_AUTH_URL` | Public HTTPS origin |
| `BETTER_AUTH_SECRET` | ≥ 32 chars, unique, non-placeholder |
| `DATABASE_URL` | `postgresql://USER:PASS@db:5432/DB` inside Compose |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Database service |
| `NGINX_SERVER_NAME` | Certificate CN/SAN hostname |
| `SECURE_COOKIES=true` | Production cookies |
| `ENABLE_SECURITY_HEADERS=false` | Prefer Nginx edge headers when proxy is used |
| `ENABLE_HSTS=false` | HSTS emitted by Nginx on HTTPS |

Full catalog: [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md). Validate locally before cutover:

```bash
# On a build host with Node (optional preflight)
export $(grep -v '^#' .env.production | xargs)  # carefully — secrets in shell
npm run config:check
```

---

## 4. SSL/TLS and reverse proxy

1. Place PEMs in `nginx/certs/` (see `nginx/certs/README.md`)  
2. Set `NGINX_SERVER_NAME` to the public hostname  
3. Confirm DNS A/AAAA points at the host  
4. Follow ACME or org CA steps in [REVERSE_PROXY.md](./REVERSE_PROXY.md)

Nginx terminates TLS; the app listens on an internal network only.

---

## 5. Database preparation

### Compose-managed Postgres (default)

1. Ensure `POSTGRES_*` and `DATABASE_URL` agree (same user/password/db; host `db`)  
2. Data persists in volume `postgres_data`  
3. Take a baseline backup after first successful migrate ([runbooks/BACKUP.md](./runbooks/BACKUP.md))

### Managed Postgres (optional)

1. Remove or disable the `db` service  
2. Point `DATABASE_URL` at the managed instance (`sslmode=require` as required)  
3. Ensure the app network can reach the managed host  
4. Migrations still run via the `migrate` profile against that URL

---

## 6. Prisma migration execution

Migrations are **not** applied by the app container by default. Use the migrate profile:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production \
  --profile migrate run --rm migrate
```

Equivalent semantics: `prisma migrate deploy` (see [runbooks/MIGRATIONS.md](./runbooks/MIGRATIONS.md)).

**Order:** backup → migrate → start/restart app → verify readiness.

---

## 7. Docker Compose deployment sequence

```bash
# 1) Build images
docker compose -f docker-compose.prod.yml --env-file .env.production build

# 2) Start database (if using Compose db)
docker compose -f docker-compose.prod.yml --env-file .env.production up -d db

# 3) Wait until healthy, then migrate
docker compose -f docker-compose.prod.yml --env-file .env.production \
  --profile migrate run --rm migrate

# 4) Start application + Nginx
docker compose -f docker-compose.prod.yml --env-file .env.production up -d app nginx

# 5) Status
docker compose -f docker-compose.prod.yml --env-file .env.production ps
```

Convenience scripts (from package.json): `npm run docker:prod` / `docker:prod:down` (still require a valid `.env.production` and certs).

---

## 8. Application startup & health verification

| Check | Command / URL | Expect |
|-------|---------------|--------|
| Containers | `docker compose … ps` | `db`, `app`, `nginx` healthy/up |
| Liveness | `https://<host>/api/health` | `200` `{ "status": "ok" }` |
| Liveness alias | `/api/health/live` | `200` |
| Readiness | `/api/health/ready` | `200` with DB + config OK |
| Startup | `/api/health/startup` | `200` |
| Metrics (optional) | `/api/metrics` | Prometheus text; bearer if configured |
| HTTPS headers | `curl -sI https://<host>/` | HSTS, CSP, COOP present |

```bash
curl -fsS https://$NGINX_SERVER_NAME/api/health
curl -fsS https://$NGINX_SERVER_NAME/api/health/ready
```

---

## 9. Post-deployment validation

1. Complete [PRODUCTION_VALIDATION.md](./PRODUCTION_VALIDATION.md)  
2. Run [SMOKE_TESTS.md](./SMOKE_TESTS.md) against the environment  
3. Confirm a backup job is scheduled ([runbooks/BACKUP.md](./runbooks/BACKUP.md))  
4. Confirm log shipping / metrics scrape per [OBSERVABILITY.md](./OBSERVABILITY.md)  
5. Record the release tag and image digests (see [RELEASE_PROCESS.md](./RELEASE_PROCESS.md))

---

## 10. Assumptions

- Operators provide the VM/host, DNS, and certificates  
- This repository does not push images to a registry by default (CI builds with `push: false`)  
- Single-host Compose is the supported production topology for Phase 8; Kubernetes is out of scope  
- Docker Desktop on Windows may be used for rehearsal only; production should be Linux
