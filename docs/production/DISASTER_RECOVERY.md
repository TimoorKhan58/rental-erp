# Disaster Recovery Review — Phase 8-010

This page **indexes and verifies** DR assets created in earlier phases. It does not replace the detailed runbooks.

---

## Documentation map

| Topic | Document | Status |
|-------|----------|--------|
| Backup procedure | [runbooks/BACKUP.md](./runbooks/BACKUP.md) | Complete |
| Restore procedure | [runbooks/RESTORE.md](./runbooks/RESTORE.md) | Complete |
| DR checklist | [runbooks/DISASTER_RECOVERY.md](./runbooks/DISASTER_RECOVERY.md) | Complete |
| DB outage incident | [runbooks/INCIDENT_DATABASE.md](./runbooks/INCIDENT_DATABASE.md) | Complete |
| Migrations | [runbooks/MIGRATIONS.md](./runbooks/MIGRATIONS.md) | Complete |
| DB operations overview | [DATABASE_OPERATIONS.md](./DATABASE_OPERATIONS.md) | Complete |
| Auth/security incidents | [SECURITY_HARDENING.md](./SECURITY_HARDENING.md) (IR section) | Complete |
| Application rollback | [ROLLBACK.md](./ROLLBACK.md) | Complete |

---

## RTO / RPO (operator-owned)

Record targets for this deployment (examples only):

| Metric | Target (fill in) | Notes |
|--------|------------------|-------|
| **RPO** | e.g. ≤ 24 h | Driven by backup frequency (`scripts/db/backup.*` + off-host copy) |
| **RTO** | e.g. ≤ 4 h | Restore + migrate catch-up + DNS/Compose restart |

Assumptions from Phase 8-006: no managed multi-AZ failover ships in-repo; recovery is **backup restore** oriented.

---

## Recovery testing

- [ ] Quarterly restore drill on non-production using a recent `.sql.gz`
- [ ] Time the drill; compare to RTO
- [ ] Verify `/api/health/ready` and login after restore
- [ ] Document gaps (missing off-host copy, wrong `DATABASE_URL`, etc.)

---

## Go-live DR gate

- [ ] Backup automation owner named
- [ ] Off-host retention confirmed
- [ ] Restore runbook accessible to on-call
- [ ] RTO/RPO written above (or in the ops wiki) and accepted by stakeholders
