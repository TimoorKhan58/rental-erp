# Observability Troubleshooting

## Structured logs not JSON

- Check `LOG_FORMAT` (`json` vs `pretty`)
- Staging/production default to `json` when unset
- Confirm container logging driver is not wrapping lines unexpectedly

## Missing request / correlation IDs

- Clients and Nginx should forward `X-Request-Id` / `X-Correlation-Id`
- API responses echo both headers via `toJsonResponse`
- Body also includes `requestId` on success/error envelopes

## `/api/health/ready` returns 503

1. Inspect `checks.configuration` — missing env keys (names only)
2. Inspect `checks.prisma` — client construction failure
3. Inspect `checks.database` — connectivity / migrations
4. Follow [INCIDENT_DATABASE.md](./runbooks/INCIDENT_DATABASE.md)

## `/api/metrics` 404

- `ENABLE_METRICS=false` disables the endpoint

## `/api/metrics` 401

- Set matching `Authorization: Bearer <METRICS_BEARER_TOKEN>`

## Metrics look empty / reset

- In-process registry resets on process restart
- Multi-replica: scrape all instances

## Error tracker silent

- `ERROR_TRACKER_PROVIDER=none` uses noop
- Non-`none` uses logging bridge until a vendor SDK is wired in `instrumentation.ts`

## Sensitive data in logs

- Confirm callers are not passing secrets in `meta`
- Redaction covers common key names; extend `log-redaction.ts` if a new pattern appears
- Rotate exposed credentials immediately
