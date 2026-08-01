# Runbook: Incident Response

## Scope

Use for production incidents affecting availability, data integrity, or security.

## Severity

- **SEV-1:** Full outage, data corruption risk, or active security event.
- **SEV-2:** Major feature degradation with business impact.
- **SEV-3:** Partial degradation or non-critical malfunction.

## Immediate Steps

1. Declare severity and incident commander.
2. Open incident channel and assign roles (commander, investigator, comms, scribe).
3. Freeze risky actions (manual DB edits, ad-hoc deploys) unless approved by commander.
4. Capture evidence:
   - request IDs / correlation IDs
   - app and proxy logs
   - `/api/health/ready` and `/api/health` responses
   - `npm run db:status` output (for DB incidents)
5. Apply containment:
   - rollback app/config if release-related
   - follow DB runbooks for migration/restore failures
6. Validate recovery via smoke tests and health endpoints.

## Communication Cadence

- SEV-1: stakeholder update every 15 minutes.
- SEV-2: every 30 minutes.
- SEV-3: hourly or on major state change.

## Recovery Verification

- `/api/health/ready` returns 200.
- Core auth flow works.
- One write-path smoke test passes.
- Error rate returns to baseline.

## Post-Incident

1. Publish timeline and root cause within 24 hours.
2. Define corrective actions with owners and due dates.
3. Update relevant runbooks/checklists based on lessons learned.

## Related

- `docs/production/ROLLBACK.md`
- `docs/production/runbooks/FAILED_DEPLOYMENT.md`
- `docs/production/runbooks/INCIDENT_DATABASE.md`
- `docs/production/runbooks/DISASTER_RECOVERY.md`
