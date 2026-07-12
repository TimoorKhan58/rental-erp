# Runbook: Rotating TLS Certificates

## Files

| Path | Content |
|------|---------|
| `nginx/certs/fullchain.pem` | Certificate + chain |
| `nginx/certs/privkey.pem` | Private key |

Never commit real PEMs (gitignored).

## Replace certificates

1. Install new PEMs into `nginx/certs/` (atomic replace preferred)  
2. Test and reload:  

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production exec nginx nginx -t
docker compose -f docker-compose.prod.yml --env-file .env.production exec nginx nginx -s reload
```

3. Verify in browser / `openssl s_client -connect host:443`  
4. Confirm HSTS and HTTPS smoke still pass  

## Let's Encrypt renewal

Follow [REVERSE_PROXY.md](../REVERSE_PROXY.md) ACME notes. After renew, copy/symlink into `nginx/certs/` and reload.

## Rollback

Restore previous PEMs from secure backup; reload Nginx ([ROLLBACK.md](../ROLLBACK.md)).
