# Runbook: Failed Deployment

## Symptoms

- Compose service unhealthy / restart loop  
- `/api/health/ready` = 503  
- Migrate container exited non-zero  
- Smoke tests failing after cutover  
- Spike in 5xx  

## Immediate actions

1. **Stop the blast radius** — do not continue rolling forward blindly  
2. Capture logs ([LOGS.md](./LOGS.md)) and the release tag/image ID  
3. Check which step failed: build · migrate · app start · nginx · smoke  

## Branching

| Failed step | Action |
|-------------|--------|
| Build | Fix Dockerfile/context; do not touch production DB |
| Migrate | Do **not** start new app if schema half-applied; restore backup or fix forward — [MIGRATIONS.md](./MIGRATIONS.md) |
| App unhealthy | `docker compose logs app`; verify env; [ROLLBACK.md](../ROLLBACK.md) app image |
| Nginx | `nginx -t`; cert paths; [CERTIFICATES.md](./CERTIFICATES.md) |
| Smoke only | Decide hotfix vs rollback with product |

## Communication

- State: investigating / rolled back / mitigated  
- Impact window and user-facing effects  
- Next update time  

## Close-out

- [ ] Service healthy  
- [ ] Root cause noted  
- [ ] Follow-up ticket filed  
- [ ] Backup taken after recovery
