# Runbook: Rotating Secrets

## Better Auth secret (`BETTER_AUTH_SECRET`)

Rotating this invalidates existing sessions (users must sign in again).

1. Generate: `openssl rand -base64 32`  
2. Update `.env.production` on the host (secure channel only)  
3. Recreate app:  

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --force-recreate app
```

4. Verify login works with a test account  
5. Record rotation in the ops change log  

## Database password

1. Change password in Postgres (`ALTER USER …`) **or** managed console  
2. Update `POSTGRES_PASSWORD` and `DATABASE_URL` together  
3. Recreate `db` (if Compose-managed) only with a plan for volume/auth; prefer rolling password with both old/new if supported  
4. Recreate `app` (+ migrate job env) with new `DATABASE_URL`  
5. Confirm `/api/health/ready`  

## Metrics bearer token

Update `METRICS_BEARER_TOKEN`; recreate `app`; update scraper config.

## SMTP password

Update `SMTP_PASSWORD` when email enabled; recreate `app`; send a test notification if applicable.

**Never** commit rotated secrets. Prefer a secret manager for long-term ops.
