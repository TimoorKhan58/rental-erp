# Runbook: Administrator Bootstrap

## Purpose

Provision or recover an ERP administrator account in production using the supported script.

## Preconditions

- Production environment variables loaded (`.env.production`).
- Database reachable with correct `DATABASE_URL`.
- Operator has approved break-glass access request.

## Commands

Interactive mode:

```bash
npm run create:admin
```

Non-interactive mode (example):

```bash
ADMIN_NAME="Primary Admin" \
ADMIN_EMAIL="admin@example.com" \
ADMIN_PASSWORD="<strong-password>" \
npm run create:admin
```

## Verification

1. Login succeeds with newly created admin.
2. Admin has expected role/permissions.
3. Audit logs include bootstrap/update action.

## Security Requirements

- Use a unique, strong password and rotate immediately if shared.
- Do not store bootstrap passwords in shell history or tickets.
- After emergency bootstrap, rotate credentials and review session activity.

## Break-Glass Recovery

If all admins are inaccessible:

1. Execute admin bootstrap as above.
2. Verify access and restore least-privilege ownership model.
3. Revoke stale sessions for compromised/inactive accounts.
4. Document incident in post-mortem.
