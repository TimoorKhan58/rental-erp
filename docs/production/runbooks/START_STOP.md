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

## Restart services

```bash
# Single service
docker compose -f docker-compose.prod.yml --env-file .env.production restart app
docker compose -f docker-compose.prod.yml --env-file .env.production restart nginx
docker compose -f docker-compose.prod.yml --env-file .env.production restart db

# Recreate after env change
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --force-recreate app
```

## Verify

```bash
curl -fsS https://$NGINX_SERVER_NAME/api/health
curl -fsS https://$NGINX_SERVER_NAME/api/health/ready
```
