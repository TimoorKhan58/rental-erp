# Runbook: Viewing Logs

## Compose logs

```bash
# Follow all
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f --tail=200

# Per service
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f app
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f nginx
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f db
```

## What to look for

| Signal | Where |
|--------|-------|
| App errors / requestId | `app` JSON/pretty logs ([LOGGING_POLICY.md](../LOGGING_POLICY.md)) |
| 429 rate limits | `nginx` access/error |
| DB auth / disk | `db` |
| Upstream timeouts | `nginx` `urt=` timing fields |

## Export for incident

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production logs --no-color --tail=5000 app > /tmp/rental-erp-app.log
```

Redact secrets before sharing externally.
