# Runbook: Start / Stop / Restart

## Start (production Compose)

```bash
cd /path/to/rental-erp
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
docker compose -f docker-compose.prod.yml --env-file .env.production ps
```

First-time or after DB wipe: run migrations before relying on readiness — see [DEPLOYMENT.md](../DEPLOYMENT.md).

## Stop

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production stop
# or full teardown (keeps volumes by default):
docker compose -f docker-compose.prod.yml --env-file .env.production down
```

**Warning:** `down -v` deletes volumes (Postgres data, uploads) — never use in production without explicit approval.

## Restart services (rolling)

Single-host Compose does not do multi-replica rolling deploys. Prefer recreate with health gating:

```bash
# App has stop_grace_period: 30s — SIGTERM allows in-flight requests to drain
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --no-deps --force-recreate app

# Wait until readiness before considering the restart complete
until curl -fsS https://$NGINX_SERVER_NAME/api/health/ready; do sleep 3; done

# Recreate Nginx only if proxy config/certs changed
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --no-deps --force-recreate nginx
```

Quick restart (same image/env):

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production restart app
docker compose -f docker-compose.prod.yml --env-file .env.production restart nginx
docker compose -f docker-compose.prod.yml --env-file .env.production restart db
```

After env-only changes:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --force-recreate app
```

## Verify

```bash
curl -fsS https://$NGINX_SERVER_NAME/api/health
curl -fsS https://$NGINX_SERVER_NAME/api/health/ready
```
