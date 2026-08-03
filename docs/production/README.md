# Production Documentation Index — Phase 8

Central index for Rental ERP production engineering (Phases 8-001 → 8-010).

---

## Start here (go-live)

| Document | Description |
|----------|-------------|
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Server sizing, Compose deploy, TLS, migrate, health |
| [RELEASE_PROCESS.md](./RELEASE_PROCESS.md) | Versioning, tagging, approval, post-release checks |
| [ROLLBACK.md](./ROLLBACK.md) | App/image/config/DB rollback |
| [SMOKE_TESTS.md](./SMOKE_TESTS.md) | Module-by-module smoke checklist |
| [PRODUCTION_VALIDATION.md](./PRODUCTION_VALIDATION.md) | Final go-live gate checklist |
| [DISASTER_RECOVERY.md](./DISASTER_RECOVERY.md) | DR index, RTO/RPO, testing gate |

---

## Phase 8 foundation

| Phase | Document |
|-------|----------|
| 8-001 | [PRODUCTION_READINESS_REPORT.md](./PRODUCTION_READINESS_REPORT.md) · [SECURITY_CHECKLIST.md](./SECURITY_CHECKLIST.md) · [CONFIGURATION_AUDIT.md](./CONFIGURATION_AUDIT.md) · [DEPENDENCY_AUDIT.md](./DEPENDENCY_AUDIT.md) · [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md) |
| 8-002 | [DOCKER.md](./DOCKER.md) |
| 8-003 | [CONFIGURATION_GUIDE.md](./CONFIGURATION_GUIDE.md) |
| 8-004 | [CICD.md](./CICD.md) |
| 8-005 | [REVERSE_PROXY.md](./REVERSE_PROXY.md) |
| 8-006 | [DATABASE_OPERATIONS.md](./DATABASE_OPERATIONS.md) |
| 8-007 | [OBSERVABILITY.md](./OBSERVABILITY.md) · [LOGGING_POLICY.md](./LOGGING_POLICY.md) · [ALERTING.md](./ALERTING.md) · [OBSERVABILITY_TROUBLESHOOTING.md](./OBSERVABILITY_TROUBLESHOOTING.md) |
| 8-008 | [PERFORMANCE.md](./PERFORMANCE.md) |
| 8-009 | [SECURITY_HARDENING.md](./SECURITY_HARDENING.md) · [SECURITY_CHECKLIST.md](./SECURITY_CHECKLIST.md) |
| 8-010 | This index + deployment/release/rollback/smoke/validation/DR |

---

## Operational runbooks

| Runbook | Path |
|---------|------|
| Start / stop / restart | [runbooks/START_STOP.md](./runbooks/START_STOP.md) |
| Logs | [runbooks/LOGS.md](./runbooks/LOGS.md) |
| Update application | [runbooks/UPDATE_APPLICATION.md](./runbooks/UPDATE_APPLICATION.md) |
| Rotate secrets | [runbooks/SECRETS_ROTATION.md](./runbooks/SECRETS_ROTATION.md) |
| Rotate certificates | [runbooks/CERTIFICATES.md](./runbooks/CERTIFICATES.md) |
| Failed deployment | [runbooks/FAILED_DEPLOYMENT.md](./runbooks/FAILED_DEPLOYMENT.md) |
| Backup | [runbooks/BACKUP.md](./runbooks/BACKUP.md) |
| Restore | [runbooks/RESTORE.md](./runbooks/RESTORE.md) · [runbooks/RESTORE_BACKUPS.md](./runbooks/RESTORE_BACKUPS.md) |
| Migrations | [runbooks/MIGRATIONS.md](./runbooks/MIGRATIONS.md) |
| DB maintenance | [runbooks/MAINTENANCE.md](./runbooks/MAINTENANCE.md) |
| DB incident | [runbooks/INCIDENT_DATABASE.md](./runbooks/INCIDENT_DATABASE.md) |
| Disaster recovery checklist | [runbooks/DISASTER_RECOVERY.md](./runbooks/DISASTER_RECOVERY.md) |

---

## Project-level

| Document | Path |
|----------|------|
| Project completion report | [../PROJECT_COMPLETION_REPORT.md](../PROJECT_COMPLETION_REPORT.md) |
| Master specification | [../ERP_MASTER_SPEC.md](../ERP_MASTER_SPEC.md) |
| Remaining roadmap (future) | [../ERP_REMAINING_ROADMAP.md](../ERP_REMAINING_ROADMAP.md) |
