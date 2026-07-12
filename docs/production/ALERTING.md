# Alerting Strategy (Phase 8-007)

Recommendations only — no alertmanager/cloud alerts are configured in-repo.

## Priority legend

| Priority | Meaning |
|----------|---------|
| P1 | Page on-call immediately |
| P2 | Business hours urgent |
| P3 | Ticket / trend review |

## Recommended alerts

| Condition | Signal | Priority | Notes |
|-----------|--------|----------|-------|
| High error rate | `rate(http_request_errors_total[5m])` or 5xx ratio > 5% for 5m | P1 | Exclude synthetic probe noise |
| High latency | `histogram_quantile(0.95, http_request_duration_seconds)` > SLO (e.g. 2s) for 10m | P2 | Tune per endpoint |
| Failed liveness | `/api/health` or `/api/health/live` failing | P1 | Restart / host issue |
| Failed readiness | `/api/health/ready` 503 for > 2m | P1 | Likely DB/config |
| Database unavailable | Ready DB check failing; Postgres down | P1 | See DB incident runbook |
| Low disk space | Node/volume < 15% free | P1 | DB + backup volumes |
| High memory | RSS / heap near limit > 15m | P2 | Leak or undersized instance |
| High CPU | CPU > 85% for 15m | P2 | Hot query / traffic spike |
| Event loop lag | `nodejs_eventloop_lag_seconds` > 0.5 for 10m | P2 | Blocking work on event loop |
| Failed backups | Backup cron exit ≠ 0 or missing nightly artifact | P1 | Phase 8-006 scripts |
| Migration failures | `prisma migrate deploy` non-zero in release job | P1 | Block/rollback release |
| Auth failures spike | 401 rate >> baseline | P2 | Credential stuffing / misconfig |

## Suggested SLO starters

| SLI | Target |
|-----|--------|
| Availability (ready probe) | 99.9% monthly |
| API success (non-5xx) | 99.5% |
| Latency p95 (read APIs) | < 1s |
| Latency p95 (write APIs) | < 2s |

## Notification channels

Route P1 to on-call (PagerDuty/Opsgenie/Teams). Route P2 to engineering Slack/Teams. Keep runbook links in alert annotations (`docs/production/runbooks/`, `OBSERVABILITY_TROUBLESHOOTING.md`).
