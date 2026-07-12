# Runbook: Update Application

Standard update = follow [RELEASE_PROCESS.md](../RELEASE_PROCESS.md) + [DEPLOYMENT.md](../DEPLOYMENT.md).

## Short path (patch, no migration)

```bash
git fetch --tags
git checkout vX.Y.Z
docker compose -f docker-compose.prod.yml --env-file .env.production build app
docker compose -f docker-compose.prod.yml --env-file .env.production up -d app
curl -fsS https://$NGINX_SERVER_NAME/api/health/ready
```

## Path with migrations

1. Backup ([BACKUP.md](./BACKUP.md))  
2. Build new images  
3. `docker compose … --profile migrate run --rm migrate`  
4. `up -d app` (and `nginx` if proxy changed)  
5. Smoke tests ([SMOKE_TESTS.md](../SMOKE_TESTS.md))  

## Nginx-only config change

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production build nginx
docker compose -f docker-compose.prod.yml --env-file .env.production up -d nginx
docker compose -f docker-compose.prod.yml --env-file .env.production exec nginx nginx -t
```

If update fails: [FAILED_DEPLOYMENT.md](./FAILED_DEPLOYMENT.md) · [ROLLBACK.md](../ROLLBACK.md)
