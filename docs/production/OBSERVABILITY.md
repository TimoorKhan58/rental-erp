# Observability (Phase 8-007)

Vendor-neutral monitoring, logging, and tracing for Rental ERP. This phase prepares production observability **without** deploying Grafana, Prometheus, OpenTelemetry collectors, or cloud agents.

## Architecture

```
Client / Nginx
  │  X-Request-Id / X-Correlation-Id / X-Tenant-Id
  ▼
API route runners
  │  authenticateApiRequest → RequestContext + request logger
  │  toJsonResponse → metrics + response tracing headers
  ▼
┌─────────────────┬──────────────────┬────────────────────┐
│ Structured logs │ /api/health/*    │ /api/metrics       │
│ (JSON/pretty)   │ live/ready/start │ Prometheus text    │
└────────┬────────┴────────┬─────────┴─────────┬──────────┘
         │                 │                   │
         ▼                 ▼                   ▼
   Log shipper        LB / k8s probes     Prometheus / Grafana
   (CloudWatch, …)                      (operator-managed)
```

Domain **audit logs** (database) remain separate from application structured logs. Correlate both via `requestId`.

## Health endpoints

| Probe | Path | Checks | Failure |
|-------|------|--------|---------|
| Liveness | `GET /api/health` or `/api/health/live` | Process up | 5xx only if process broken |
| Readiness | `GET /api/health/ready` | Config + Prisma client + DB (`SELECT 1` + migrations) | 503 |
| Startup | `GET /api/health/startup` | Config + Prisma client (no DB round-trip) | 503 |

Keep probes lightweight. Do not put business logic behind health routes.

## Metrics

`GET /api/metrics` — Prometheus exposition format when `ENABLE_METRICS=true`.

Included series (process-local):

- `http_requests_total`, `http_request_duration_seconds`, `http_request_errors_total`, `http_requests_in_flight`
- `db_queries_total`, `db_query_duration_seconds` (via repository observability hook)
- `process_uptime_seconds`, memory/heap gauges, CPU time, `nodejs_eventloop_lag_seconds`

Optional auth: `METRICS_BEARER_TOKEN` → `Authorization: Bearer <token>`.

**Note:** Counters are per Node process. Behind multiple replicas, scrape each instance or use a pull agent sidecar.

## Structured logging

- Factory: `createAppLogger()` (`LOG_LEVEL`, `LOG_FORMAT`)
- Request bindings: `requestId`, `correlationId`, `tenantId?`, `userId?`, `route`, `httpMethod`
- Sensitive fields redacted (`password`, `token`, `secret`, connection strings, etc.)
- Optional `pino` if installed; otherwise built-in JSON/pretty console logger

## Request tracing

| Field | Source |
|-------|--------|
| `requestId` | `X-Request-Id` or generated UUID |
| `correlationId` | `X-Correlation-Id` or same as requestId |
| `tenantId` | Optional `X-Tenant-Id` (single-tenant today) |
| `userId` | Authenticated ERP user |
| Duration | `RequestContext.startedAtMs` → metrics / logs |

Nginx forwards tracing headers (`nginx/snippets/proxy-params.conf`). Responses echo `X-Request-Id` and `X-Correlation-Id`.

### OpenTelemetry (future — not required)

Documented integration path:

1. Initialize OTel SDK in `src/instrumentation.ts` `register()`
2. Export traces/metrics to a collector
3. Propagate W3C `traceparent` alongside existing correlation headers
4. Keep `ILogger` / `IErrorTracker` as facades

Do **not** require OTel packages in this phase.

## Error tracking integration points

| Provider | Env |
|----------|-----|
| None (default) | `ERROR_TRACKER_PROVIDER=none` |
| Sentry | `sentry` + `ERROR_TRACKER_DSN` |
| Datadog | `datadog` + DSN/site config |
| New Relic | `newrelic` + license key via DSN field |
| Azure App Insights | `azure` + connection string |
| OTLP | `otlp` + endpoint in DSN |

Hooks:

- `IErrorTracker` / `getErrorTracker()` / `reportRouteError()`
- `src/instrumentation.ts` → `onRequestError`
- Logging error tracker when provider ≠ `none` (SDK install remains operator-owned)

## Dashboard recommendations

| Dashboard | Signals |
|-----------|---------|
| Golden signals | Request rate, latency p95, error rate, saturation (CPU/mem/event-loop) |
| Health | Ready/live probe success from blackbox or LB |
| Database | `db_query_duration_seconds`, Postgres connections, disk |
| Auth | 401/403 rates from nginx or app logs |
| Backups | Job success (from Phase 8-006 scripts / cron logs) |

Example Prometheus scrape (operator-managed):

```yaml
- job_name: rental-erp
  metrics_path: /api/metrics
  scheme: https
  bearer_token: "<METRICS_BEARER_TOKEN>"
  static_configs:
    - targets: ["erp.example.com"]
```

## Related docs

- [LOGGING_POLICY.md](./LOGGING_POLICY.md)
- [ALERTING.md](./ALERTING.md)
- [OBSERVABILITY_TROUBLESHOOTING.md](./OBSERVABILITY_TROUBLESHOOTING.md)
- [DATABASE_OPERATIONS.md](./DATABASE_OPERATIONS.md)
