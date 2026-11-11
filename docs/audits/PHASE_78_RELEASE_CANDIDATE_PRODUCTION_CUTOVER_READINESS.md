# Phase 78 Release Candidate & Production Cutover Readiness

## Status

```text
CONDITIONAL GO — SPECIFIC NON-BLOCKING ITEMS REMAIN
```

## Executive Verdict

The UAT-accepted release candidate **`32a41d4`** builds cleanly, validates Prisma/migrations locally, preserves Phase 76–77 evidence, and has documented deploy/backup/rollback procedures. **No material application defect** was found in Phase 78.

Production cutover is **conditionally ready**: operators must still complete production-side prerequisites (secrets/HTTPS host, pre-migrate backup, F-09 orphan preflight on production DB, and execute the documented cutover order). These are **ops cutover conditions**, not code blockers.

```text
Do NOT deploy from this phase.
Do NOT push.
No production mutations performed.
```

## Phase 77 Baseline

| Field | Value |
| ----- | ----- |
| Status | ACCEPTED — FORMAL UAT PASSED |
| Baseline | `48eaa84` |
| Final HEAD | `32a41d4` |
| Commit | `docs(uat): record phase 77 formal business acceptance` |
| UAT | ACCEPTED |
| Regression | 98/98 PASS |
| Material UAT defects | None |

## Phase 78 Final HEAD

```text
32a41d44cabf73ad62429d36d291dbf6653578c7
```

## Release Candidate

| Field | Value |
| ----- | ----- |
| SHA | `32a41d44cabf73ad62429d36d291dbf6653578c7` |
| Short | `32a41d4` |
| Branch | `main` |
| Package version | `1.1.2` |
| Node engines | `22.x` |
| Lockfile | `package-lock.json` present |
| Ahead of `origin/main` | 43 commits (intentional; Push: NO) |

### RC change inventory (committed)

**Phase 77 vs Phase 76 (`48eaa84..32a41d4`):** documentation-only

- `docs/audits/PHASE_77_FORMAL_UAT_BUSINESS_ACCEPTANCE.md` (+243)

**Production-readiness path since post-Phase-70 tip (`72abd77..HEAD`) — key source:**

| Commit | Nature |
| ------ | ------ |
| `ab855b5` | Dispatch summary exports (Phase 72) |
| `266e95b` | Staging build/migration readiness + `tsconfig` test exclude + typebuild fixes |
| `48eaa84` | Invoice sequence SQL fix (F-76-01) + Phase 76 audit |
| `32a41d4` | Phase 77 UAT acceptance docs |

| Area | Risk note |
| ---- | --------- |
| Source | Dispatch exports; invoice `findMaxSequenceForInvoicePrefix` REPLACE fix; build/type fixes; `tsconfig` excludes tests |
| Migrations | F-09 FK additive (`ON DELETE RESTRICT`) — deployable; **production orphan preflight required** |
| Config | No production secrets in git |
| Docs | Audits + existing `docs/production/*` runbooks |
| Tests | Historical suites; CI uses process env placeholders |

## WIP Status

```text
WIP entries: ~149 (preserved)
payment-list.query.ts: still dirty / unrelated — NOT touched
Forbidden git commands: NOT used
Secrets committed: NO
```

## Commit Status

```text
Commit: NO
Push: NO
```

Per Phase 78 policy: documentation-only audit → no commit required. No release-blocking code fix was discovered.

## Build

```text
Command: npm run build
Result: PASS (exit 0)
Evidence: Next.js production compile + route table; prisma generate included
```

## TypeScript / Lint

| Check | Result | Notes |
| ----- | ------ | ----- |
| `npm run typecheck` | **PASS** (exit 0) | App sources (tests excluded via Phase 75 `tsconfig`) |
| ESLint (RC-touched files) | **PASS** (exit 0) | invoice repository + dispatch barrels |
| Full-repo `npm run lint` | **Not claimed green** | Large unrelated WIP would confound release-scope claim |
| `npm run secrets:scan` | Exit 1 (Compose URL templates) | Variable-interpolated defaults in `docker-compose.yml` — not live prod secrets |

## Prisma

```text
npx prisma validate → PASS
npx prisma migrate status (local non-prod DB) → Database schema is up to date! (7 migrations)
```

## Migration Readiness

| Item | Status |
| ---- | ------ |
| Migration count | 7 (`0_baseline` … `20260903120000_repair_return_inspection_item_fkey`) |
| Latest | F-09 repair→return_inspection_item FK |
| Local/staging alignment | ALIGNED (Phase 75/76 verified; reconfirmed Phase 78) |
| Production migrate status | **NOT VERIFIED** from this environment (no production connection) |
| Destructive migrations in set | F-09 is **additive FK** only |
| Deploy command | `prisma migrate deploy` / Compose migrate profile / `npm run db:migrate:deploy` |
| Order | **backup → migrate → start app → ready/smoke** ([DEPLOYMENT.md](../production/DEPLOYMENT.md)) |

## F-09 Readiness

| Check | Result |
| ----- | ------ |
| Migration SQL | `repairs_returnInspectionItemId_fkey` → `return_inspection_items(id)` |
| ON DELETE | **RESTRICT** |
| ON UPDATE | **CASCADE** |
| Staging orphan count | **0** (Phase 75) |
| Staging FK verified | Yes (Phase 75/76) |
| Production orphan audit | **PENDING PRODUCTION PREFLIGHT** |

Preflight SQL (production, read-only):

```sql
SELECT COUNT(*) FROM repairs r
LEFT JOIN return_inspection_items rii ON rii.id = r."returnInspectionItemId"
WHERE rii.id IS NULL;
-- must be 0 before migrate deploy
```

## Production Environment Checklist

| Variable | Classification | Production note |
| -------- | -------------- | --------------- |
| `DATABASE_URL` | **REQUIRED** | Secret; Compose `db` host or managed Postgres |
| `BETTER_AUTH_SECRET` | **REQUIRED** | ≥32 chars; non-placeholder; secret store |
| `BETTER_AUTH_URL` | REQUIRED (or defaults to `APP_URL`) | HTTPS |
| `APP_URL` | **REQUIRED** (effective) | HTTPS public origin |
| `APP_ENV` | **REQUIRED** for hardening | Must be `production` |
| `NODE_ENV` | REQUIRED (runtime) | `production` |
| `POSTGRES_USER` / `PASSWORD` / `DB` | REQUIRED (Compose) | Secrets |
| `NGINX_SERVER_NAME` | REQUIRED (Compose+Nginx) | **PENDING OPERATOR CONFIGURATION** (domain) |
| `SECURE_COOKIES` | DEFAULTED true in prod | Keep true |
| `ENABLE_SECURITY_HEADERS` / `ENABLE_HSTS` | DEFAULTED / proxy-dependent | Follow DEPLOYMENT (often Nginx edge) |
| SMTP_* | OPTIONAL / conditional | Only if `ENABLE_EMAIL=true` |
| `METRICS_BEARER_TOKEN` | OPTIONAL | Secret if metrics protected |
| `BACKUP_DIR` / `BACKUP_RETENTION_DAYS` | OPTIONAL / defaulted | Ops path |

Templates: `.env.production.example` (no real secrets). Never commit `.env.production`.

## Secret Hygiene

| Check | Result |
| ----- | ------ |
| `.env*` tracked in git | **NO** (`git ls-files` empty for `.env` family) |
| Placeholder rejection in staging/prod schema | Present (`env.schema.ts`) |
| Operator must supply production secret | Yes — do **not** paste into chat |
| CI placeholders | CI-only; must not be reused in production |
| Docs/source hardcoded prod secrets | None identified in release review |

## Authentication Readiness

| Check | Result |
| ----- | ------ |
| Better Auth email/password | Enabled; sign-up disabled |
| CSRF / origin checks | Enabled |
| Secure cookies in hardened envs | Default true |
| HTTPS enforcement | Required when `APP_ENV=staging\|production` |
| Session / rate limits | Configured via env |
| UAT owner auth evidence | Phase 77 PASS |

Production domain: **PENDING OPERATOR CONFIGURATION**.

## Authorization Readiness

| Check | Result |
| ----- | ------ |
| Roles unchanged | `owner` / `manager` / `worker` (+ accountant/viewer) |
| Worker mutation unit tests | Spot-check PASS (Phase 78) |
| Financial / inventory controls | Preserved (UAT + unit evidence) |
| HTTP multi-role matrix | Non-blocker from Phase 77 (optional) |

## Backup Status

| Item | Status |
| ---- | ------ |
| Runbook | `docs/production/runbooks/BACKUP.md` |
| Scripts | `scripts/db/backup.sh`, `backup.ps1` |
| Artifact | `rental-erp_*.sql.gz` |
| Cutover requirement | **Mandatory** before migrate ([DEPLOYMENT.md](../production/DEPLOYMENT.md)) |
| Drill executed in Phase 78 | **NOT YET DRILLED** |

Classification: **CONDITIONAL RELEASE ITEM** — procedure exists; operator must execute verified pre-cutover backup (and preferably a staging restore drill).

## Restore Drill Status

| Item | Status |
| ---- | ------ |
| Runbook | `docs/production/runbooks/RESTORE.md` |
| Scripts | `scripts/db/restore.sh` / `.ps1` |
| Drill | **NOT YET DRILLED** |
| Classification | Operational follow-up / conditional — do not run destructive restore on production during Phase 78 |

## Rollback Status

| Item | Status |
| ---- | ------ |
| Documented | Yes — `docs/production/ROLLBACK.md` |
| Strategy | App image rollback; DB via **pre-migrate backup restore** (no Prisma down migrations) |
| Post-rollback checks | Health + smoke documented |
| Drill | **UNTESTED** (documented only) |

Classification: **CONDITIONAL** — documentation sufficient for cutover planning; first real use is the cutover window.

## CI/CD Readiness

| Workflow | Purpose | Deploy? |
| -------- | ------- | ------- |
| `ci.yml` | Quality + build + Docker build (no push) | No |
| `pull-request.yml` | PR gates | No |
| `release.yml` | Tag `v*` validation + local image (no registry push) | No |

Local RC gates: build PASS, typecheck PASS, prisma PASS, focused regressions PASS.

Remote CI against `32a41d4`: **NOT EXECUTED** (branch unpushed by policy). Treat “push tag / run `release.yml` on `32a41d4`” as a cutover prep step when operators choose to publish.

## Observability Readiness

| Endpoint | Role |
| -------- | ---- |
| `/api/health` | Liveness (no DB) |
| `/api/health/live` | Liveness alias |
| `/api/health/ready` | Config + Prisma + DB |
| `/api/health/startup` | Config + Prisma client (no DB round-trip) |

Logging: structured env-driven; do not log secrets (env loader redacts). Metrics optional via bearer token.

## Production Smoke Plan (post-deploy — SAFE)

Execute after cutover; prefer read-only / controlled synthetic:

1. `GET /api/health` → 200 `ok`
2. `GET /api/health/live` → 200 `ok`
3. `GET /api/health/ready` → 200 `ready` (DB ok)
4. `GET /api/health/startup` → 200 `started`
5. Auth: invalid login rejected; valid **staging/test** owner login (not real customer accounts)
6. Authz: unauthenticated `/api/payments` → 401
7. DB connectivity: implied by ready probe
8. Representative **GET** lists: customers, rental-orders, inventory, invoices, payments (pageSize=1)
9. Summaries: `/api/dispatches/summary`, `/api/rental-invoices/summary`, `/api/payments/summary`
10. Logs: confirm no secret/token leakage; error rate normal

Optional controlled synthetic (non-production customer data only): follow `docs/production/SMOKE_TESTS.md` minimal set.

**Do not** mutate real customer financial/rental data for smoke.

## Security Review (release-focused)

| Check | Result |
| ----- | ------ |
| Committed `.env` | None |
| Placeholder prod secret in templates | Examples only — rejected at runtime when hardened |
| Debug/test credentials for prod | Not used |
| Auth CSRF/origin | Enforced |
| Secure cookies / HTTPS | Required in production `APP_ENV` |
| CORS/debug weakenings | None found for release |
| Material release blocker | **None** |
| `npm run secrets:scan` | Flags Compose `DATABASE_URL` templates using `${POSTGRES_*:-rental}` interpolation — **not** committed plaintext production credentials; treat as known scanner noise, ensure production overrides defaults |

## Dependency / Package Review

| Check | Result |
| ----- | ------ |
| `package-lock.json` | Present |
| Opportunistic upgrades | Not performed |
| Node | `22.x` |

## UAT Evidence Preservation

Phase 77 evidence intact at `32a41d4`:

- Lifecycle Customer→Payment accepted
- Inventory / financial / ERA cancel / expense / maintenance / reporting / negatives
- F-76-01 invoice sequence fix in tree (`48eaa84`)
- Phase 78 spot regressions: **63 PASS** (invoice allocation, worker authz, dispatch summary)

## Known Non-Blockers (from Phase 77 — classified)

| Item | Phase 78 classification |
| ---- | ------------------------ |
| Repair damage-path UAT | Post-launch operational follow-up |
| Worker/manager HTTP matrix | Post-launch / optional ops |
| Backup/restore drill | **Conditional cutover prerequisite** (backup mandatory at cutover; restore drill recommended) |
| Remote HTTPS staging host | Ops / environment (production domain separate) |

## Risks

1. Production DB may still need F-09 migrate — orphan preflight must be 0.
2. First production backup/restore un-drilled — mitigate with verified pre-migrate backup + off-host copy.
3. 43 local commits ahead of origin — release tag must be cut from intended SHA deliberately.
4. Cookie-cache after logout (known Better Auth tradeoff) — clients must honor Set-Cookie.

## Final Release Checklist

### Code

- [x] UAT-accepted commit identified (`32a41d4`)
- [x] Production build passes
- [x] Typecheck passes for release scope
- [x] Lint passes for RC-touched files (full-repo not claimed)
- [x] Prisma validation passes
- [x] No unintended Phase 78 source changes

### Database

- [x] Migration history understood
- [x] F-09 migration ready (additive)
- [x] Production orphan verification requirement identified (**PENDING PREFLIGHT**)
- [x] Migration deployment procedure documented
- [x] Backup requirement identified (**execute at cutover**)

### Security

- [x] Production secret requirements documented
- [x] No placeholder production secret in committed config
- [x] No committed secrets
- [x] HTTPS configuration identified (operator domain pending)
- [x] Auth configuration reviewed
- [x] Authorization preserved

### Operations

- [x] Deployment procedure documented
- [x] Rollback procedure documented
- [x] Health checks documented
- [x] Monitoring/logging reviewed
- [x] Post-deployment smoke documented
- [ ] Backup/restore **drill** completed — **NOT YET DRILLED**

### Business

- [x] Formal UAT accepted
- [x] Critical lifecycle accepted
- [x] Financial / inventory / reporting accepted
- [x] Known non-blockers documented

## Final Gate

```text
CONDITIONAL GO — SPECIFIC NON-BLOCKING ITEMS REMAIN
```

### Conditions (must be cleared by operators before/at cutover)

1. **Configure production env** (gitignored): `APP_ENV=production`, HTTPS `APP_URL` / `BETTER_AUTH_URL`, unique `BETTER_AUTH_SECRET`, `DATABASE_URL`, Compose/Postgres/Nginx vars — **do not paste secrets into chat**.
2. **Take and verify pre-migrate production backup** (`scripts/db/backup.*`); store off-host; record filename in release ticket.
3. **Run F-09 orphan preflight on production** (count must be 0) then `prisma migrate deploy`.
4. **Deploy artifact = `32a41d4`** (or tag pointing at it); start app; pass production smoke plan above.
5. **Recommended:** staging restore drill before first production restore reliance; optional tag + `release.yml` validation when push policy allows.

## Exact Next Action

> **Phase 79 — Production Cutover Execution** (operator-led)

Follow `docs/production/DEPLOYMENT.md` cutover order on the production host using RC `32a41d4`, clearing the five conditions above. Do not start cutover until conditions 1–4 are satisfied.

## Recommendation

Proceed to production cutover planning under **CONDITIONAL GO**. Application/UAT/build evidence supports release; remaining items are operational prerequisites at the cutover window—not code defects.
