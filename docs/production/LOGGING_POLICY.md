# Logging Policy (Phase 8-007)

## Log levels

| Environment | Default `LOG_LEVEL` | Default `LOG_FORMAT` |
|-------------|---------------------|----------------------|
| local / development | `debug` | `pretty` |
| staging / production | `info` | `json` |
| test | typically `error` in fixtures | `json` |

Use `warn`/`error` for actionable conditions. Avoid `debug` in production except temporary incident windows.

## Retention & rotation

| Stream | Recommendation |
|--------|----------------|
| Application stdout/stderr (container) | Ship to central log store; retain **30 days** hot |
| Security / auth failures | Retain **90 days** |
| Domain audit log (database) | Product retention policy — **not** rotated with app logs |
| Backup job logs | Align with backup retention (14–30 days+) |

Rotation is handled by the platform (Docker logging driver, journald, CloudWatch, etc.). The app writes to stdout only.

## Sensitive data policy

**Never log:**

- Passwords, password hashes, session tokens, API keys
- `DATABASE_URL` / connection strings
- `BETTER_AUTH_SECRET`, SMTP passwords, bearer tokens
- Full payment card data, government IDs
- Raw `Cookie` / `Authorization` header values

Built-in redaction (`redactSensitiveFields`) masks common secret key names and connection-string shaped values. Redaction is defense-in-depth — do not pass secrets into `meta` deliberately.

## PII handling

| Allowed (when needed) | Avoid |
|-----------------------|-------|
| Internal user UUID (`userId`) | Email, phone, full name in routine logs |
| Request/correlation IDs | Request bodies with customer PII |
| Route + method | Untruncated search queries containing PII |

Prefer IDs over personal attributes. Domain audit entries may store business field diffs under existing audit rules — that is separate from application logs.

## Audit log separation

| Channel | Purpose | Storage |
|---------|---------|---------|
| Application logs | Ops diagnostics, errors, timings | stdout → log platform |
| Audit logs | Who did what to which entity | PostgreSQL `auditLog` |

Correlate with `requestId`. Do **not** replace audit infrastructure with application logging.

## Production checklist

- [ ] `LOG_FORMAT=json` in staging/production
- [ ] `LOG_LEVEL=info` (or `warn` if volume is high)
- [ ] Log shipper attached to container stdout
- [ ] Secrets scanners / access controls on log stores
- [ ] Audit UI/API still used for compliance trails
