# Phase 74 Production Readiness Baseline & Staging Gate

## Executive Verdict

```text
YELLOW — STAGING VALIDATION CONTINUES
```

```text
NO — STAGING VALIDATION CONTINUES
```

**Enterprise Hardening remains COMPLETE** (Phase 73). Phase 74 successfully committed Phase 72 and established a production-readiness baseline. Staging gate is **not yet green** because:

1. **`npm run build` fails** on committed TypeScript (`serviceType` unused in `maintenance-list-table.tsx`).
2. **Local DB migration history diverges** from `prisma/migrations` (pending F-09 FK migration; many DB-only historical migrations not present locally).
3. **Process env not loaded for tests**; `.env` has a **placeholder** `BETTER_AUTH_SECRET` (name-only classification).
4. Full interactive auth/ERP smoke against a production-like staging stack was **not completed** in this phase (blocked by build + env/migration readiness).

These are **staging/ops blockers**, not reopenings of closed enterprise hardening findings.

---

## Phase Objective

Establish a safe production-readiness baseline and staging gate after Phase 73 cleared material P0/P1/actionable-P2 hardening findings.

---

## Baseline

| Field | Value |
| ----- | ----- |
| Branch | `main` |
| Starting HEAD | `72abd77bd79da42c36b7968ddba20d38ddca8c79` |
| Starting WIP | ~150 short-status entries |
| Mode | Production Readiness (not hardening) |

---

## Final HEAD

```text
ab855b5ef0ea323d476d5ad0469d4fb3e02300b8
fix(dispatch): export dispatch summary contract
```

```text
Commit: YES
Push: NO
```

Branch is **ahead of `origin/main`** (includes prior unpushed history + this commit). No push performed.

---

## Phase 72 Commit Verification

| Check | Result |
| ----- | ------ |
| Files committed | `src/features/dispatch/services/index.ts`, `src/features/dispatch/types/index.ts` only |
| Diff | `+4` lines — exports only |
| Unrelated WIP staged | **NO** |
| Audits included in commit | **NO** (Phase 71/72/73 docs remain untracked/uncommitted) |
| Secrets committed | **NO** |

Exports verified in commit:

- `getDispatchSummary`
- `DispatchSummaryResponse`
- `DispatchSummaryStats`
- `GetDispatchSummaryParams`

---

## WIP Safety

| | |
|--|--|
| Before | ~150 dirty entries @ `72abd77` |
| After | ~148 dirty entries @ `ab855b5` (−2 committed Phase 72 files) |
| Unrelated WIP changed | **NO** |
| Forbidden git ops | Not used |

---

## Environment Inventory

Templates present: `.env.example`, `.env.staging.example`, `.env.production.example`, `.env.docker.example`

Required / critical variable **names** (from docs + templates; values not disclosed):

| Category | Names |
| -------- | ----- |
| Database | `DATABASE_URL`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, pool vars |
| Auth | `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, session/rate-limit vars |
| App | `APP_URL`, `APP_ENV`, `APP_NAME`, `NODE_ENV`, `NEXT_PUBLIC_APP_URL` |
| Security | `SECURE_COOKIES`, `ENABLE_SECURITY_HEADERS`, `ENABLE_HSTS`, `TRUSTED_PROXIES` |
| Ops | `LOG_LEVEL`, `LOG_FORMAT`, `BACKUP_DIR`, `BACKUP_RETENTION_DAYS`, `ENABLE_METRICS` |
| Optional | SMTP (`ENABLE_EMAIL` + SMTP_*), upload, E2E_* |

Authoritative catalog: `docs/production/ENVIRONMENT_VARIABLES.md` + `src/shared/config/env.schema.ts`.

---

## Environment Configuration

| Check | Result | Classification |
| ----- | ------ | -------------- |
| Process `DATABASE_URL` / `BETTER_AUTH_SECRET` | **UNSET** in shell process | Environment Configuration Gap (tests importing `env.ts` fail-fast) |
| `.env` file | Present; keys include required names | Local config file exists |
| `.env` `DATABASE_URL` | Present non-empty (Prisma connected to `127.0.0.1:5432` / `rental_erp`) | Local DB reachable |
| `.env` `BETTER_AUTH_SECRET` | Classified **PLACEHOLDER** (pattern match only; value not printed) | Staging/production blocker until replaced |
| Staging/production templates | Present | Documented |

---

## Staging Architecture

Documented intended path (not redesigned):

| Item | Evidence |
| ---- | -------- |
| Runtime | Node **22.x**, Next.js standalone |
| Package manager | npm |
| Build | `npm run build` → `prisma generate && next build` |
| Start | `npm start` / Docker Compose prod |
| Migrate | `npm run db:migrate:deploy` (`prisma migrate deploy`) |
| Compose | `docker-compose.yml` (dev), `docker-compose.prod.yml` + Nginx |
| CI | `.github/workflows/ci.yml` — validate, lint, typecheck, test, build |
| Deploy docs | `docs/production/DEPLOYMENT.md`, `DOCKER.md`, `CICD.md` |
| Health | `/api/health`, `/live`, `/ready`, `/startup` |

---

## Build Verification

| Command | Result |
| ------- | ------ |
| `npm run build` | **FAIL** |

**Root cause (application/code):** Next.js production typecheck fails:

```text
src/features/maintenance/tables/maintenance-list-table.tsx:53
'serviceType' is declared but its value is never read.
```

Committed file (blame shows historical commit). Compile step succeeded; typecheck step failed.

**Classification:** **Staging Blocker** (prevents production-like artifact).

Not fixed in Phase 74 (no opportunistic code changes).

---

## TypeScript

| Metric | Result |
| ------ | ------ |
| `tsc --noEmit` total `error TS` | **10** (unrelated/pre-existing) |
| Phase 72 symbols | **0** |
| Build-integrated typecheck | **FAIL** (unused `serviceType`) |

Phase 72 TypeScript symbols verified clean post-commit.

---

## ESLint

Focused on Phase 72 barrels: **PASS**

---

## Prisma

`npx prisma validate`: **PASS**

---

## Database Migration Readiness

| Check | Result |
| ----- | ------ |
| Migration folders locally | **7** under `prisma/migrations` |
| `prisma migrate status` | **FAIL / DIVERGED** |
| Datasource | PostgreSQL `rental_erp` @ `127.0.0.1:5432` (from project `.env`) |
| Pending (local not applied) | `20260903120000_repair_return_inspection_item_fkey` (F-09) |
| DB-only migrations not in local tree | Many historical names (e.g. `0_init_auth`, module migrations) — history mismatch |

**Classification:** **Staging Blocker** — migration deploy is not clean/deterministic against this local DB history until alignment strategy is executed (baseline resolve / controlled remapping / fresh staging DB from current migration set).

Do **not** run destructive reset in this phase.

---

## F-09 Database Integrity Verification

| State | Result |
| ----- | ------ |
| Implementation (schema FK definition) | **VERIFIED** (Phase 61/73) |
| Local DB orphan preflight | **`ORPHAN_COUNT=0`** |
| Local DB FK constraint present | **`F09_FK_EXISTS=0`** (migration not applied yet) |
| Staging database verified | **PARTIAL** (orphans clear; FK pending) |
| Production database verified | **PENDING** — no production access |

```text
F-09 production verification remains a deployment prerequisite.
```

Local orphan=0 means the F-09 migration is **safe to apply** on this database once migration history divergence is resolved.

---

## Application Startup

| Mode | Result |
| ---- | ------ |
| Production build → `next start` | **BLOCKED** (build failed) |
| Health routes exist in source | **YES** |
| Live health probe against running server | **NOT RUN** (no production build artifact) |

---

## Health / Readiness

Present:

- `GET /api/health`
- `GET /api/health/live`
- `GET /api/health/ready`
- `GET /api/health/startup`

Runtime verification pending successful staging start.

---

## Authentication Smoke Test

**BLOCKED** — no production-like staging server from this phase’s build; process env incomplete for suite paths that import `env.ts`.

Documented E2E login path exists (`npm run test:e2e:login`) but requires configured env + running app.

---

## Authorization Smoke Test

**PARTIAL (unit-level PASS)**

Focused WORKER permission regression: included in **61/61 PASS** bundle (`worker-mutation-permissions.57.test.ts`).

Interactive role smoke against staging UI/API: **BLOCKED** (startup/build).

---

## Core ERP Smoke Test

**BLOCKED** for interactive E2E staging.

Focused non-env unit regressions **PASS** (dispatch summary, expense atomicity, WORKER auth).

---

## Financial Smoke Test

**BLOCKED** interactive; expense accounting atomicity unit tests **PASS** (T65 included in focused set).

---

## Inventory Smoke Test

**BLOCKED** interactive. Policy locks remain as code (Phase 43 / DL-51-01) — not re-broken by Phase 72 commit.

---

## Concurrency Regression

Focused expense atomicity + historical unit protections: **PASS** in focused set. Full concurrency suite still subject to env import blocker for some API tests.

---

## Reporting Smoke Test

Dispatch summary barrel committed. Summary unit tests for dispatch: **PASS**. HTTP summary smoke against running server: **BLOCKED**.

---

## Frontend Smoke Test

**BLOCKED** — no successful production build/start in this phase.

---

## Production Configuration Audit

| Observation | Class |
| ----------- | ----- |
| Extensive production docs exist | Strength |
| `.env` secret placeholder pattern | Staging/production config gap |
| Process env not injected for local test runners | Test infrastructure gap |
| CI injects placeholder env for build/test | Documented in `ci.yml` |
| Unrelated WIP may affect local typecheck noise | Ops hygiene |

No new speculative security redesign.

---

## Security Baseline

| Area | Assessment |
| ---- | ---------- |
| Env fail-fast / Zod schema | Present |
| Staging/prod HTTPS + placeholder rejection | Documented in env schema docs |
| Health endpoints without oversharing secrets | Present by design |
| WORKER financial restrictions | Unit-verified |
| Secrets in git | `.env` ignored; not committed this phase |
| Local placeholder secret | Must not ship to staging/production |

**Security Baseline:** **PARTIAL** (code controls present; staging secret hygiene incomplete)

---

## Logging / Observability

Documented: structured logging policy, health probes, optional metrics. Monitoring/alerting deployment is an **ops readiness task**.

---

## CI/CD

`.github/workflows/ci.yml`: quality (prisma validate, lint, typecheck, unit/UI tests, config:check) → production build. Release/PR workflows present. Deploy not automatic from this workflow.

**Note:** CI typecheck may also fail on the same unused `serviceType` once run against current `main` tip — treat as staging gate input.

---

## Rollback Readiness

Documented in `docs/production/ROLLBACK.md` + backup/restore runbooks. Prisma has no auto down-migrations; prefer forward-fix or restore-from-backup. **Documentation READY; drill NOT executed this phase.**

---

## UAT Readiness

**PARTIAL / NOT READY for formal UAT** until:

1. Production build succeeds
2. Staging env uses real non-placeholder secrets
3. Migration history is clean on a staging DB
4. Auth + core rental lifecycle smoke pass on staging

UAT checklist (for next phase) remains the Phase 73/74 lifecycle paths (RO→Dispatch→Return→Invoice→Payment, ERA, Expense, Inventory).

---

## Performance Baseline

No load test infrastructure exercised. Recorded as **Production Readiness Task**.

---

## Data Initialization

Seed scripts and `create:admin` documented (`db:seed`, demo seeds). Staging initialization procedure exists in docs; not re-run as a full staging bootstrap this phase.

---

## Environment Separation

Templates distinguish local / staging / production. Local `.env` must not be reused as production. Separation is **documented**; live staging/production isolation **not proven** in this phase (no remote staging deploy).

---

## Production Blockers

None proven as **live production** failures (no production deploy attempted).

---

## Staging Blockers

1. **Build failure** — unused `serviceType` in committed `maintenance-list-table.tsx`
2. **Migration history divergence** + pending F-09 FK apply
3. **Placeholder auth secret** in local `.env` unsuitable for staging/production
4. **Process env unset** for many automated suites importing `env.ts`

---

## UAT Blockers

All Staging Blockers above plus incomplete interactive smoke suite.

---

## Production Readiness Tasks

1. Unblock production build (minimal unused-var / typecheck fixes)
2. Create clean staging database from current migration set **or** reconcile migration history safely
3. Apply F-09 migration after orphan=0 confirmation (local orphan already 0)
4. Configure staging secrets (non-placeholder `BETTER_AUTH_SECRET`, HTTPS URLs)
5. Start staging (`docker compose` prod profile or equivalent) and probe `/api/health/ready`
6. Run auth + core ERP smoke / Playwright login
7. Backup/restore drill
8. Monitoring/alerting wiring
9. Commit policy for audit docs / WIP triage
10. Optional later: deferred P3 hardening backlog

---

## Deferred Hardening

Unchanged (not escalated):

- F-66-P3-01
- F-66-P3-02
- F-07
- F-37-R2

---

## Final Gate

```text
Application Build: FAIL
TypeScript: FAIL (build path) / Phase-72 symbols PASS
ESLint: PASS (focused)
Prisma: PASS (validate)
Database Migration Readiness: BLOCKED (history divergence + pending F-09)
Application Startup: BLOCKED
Authentication: BLOCKED
Authorization: PARTIAL (unit PASS)
Core ERP Smoke Tests: BLOCKED
Financial Smoke Tests: BLOCKED (unit partial PASS)
Inventory Smoke Tests: BLOCKED
Reporting: PARTIAL (unit PASS; HTTP BLOCKED)
F-09 Database Verification: PENDING production / PARTIAL local (orphan=0, FK absent)
Security Baseline: PARTIAL
Operational Readiness: NOT READY
UAT Readiness: NOT READY
Staging Gate: FAIL / BLOCKED
```

---

## Recommendation

```text
YELLOW — STAGING VALIDATION CONTINUES
```

Keep enterprise hardening closed. Focus the next phase on the **smallest concrete staging unblockers**: production build + migration alignment + staging env secrets + health/smoke.

---

## Next Phase

**Phase 75 — Staging Build & Migration Alignment**

Scope (evidence-driven, minimal):

1. Fix committed production-build typecheck failure(s) blocking `npm run build` (starting with unused `serviceType`).
2. Establish a clean staging DB strategy and apply pending migrations including F-09 FK (`orphan_count` already 0 locally).
3. Configure non-placeholder staging secrets and verify `/api/health/ready`.
4. Re-run build + focused smoke; do not reopen deferred P3 hardening.

---

## Answer to Final Executive Question

> **Can MT-ERP now enter formal UAT using a production-like staging environment?**

```text
NO — STAGING VALIDATION CONTINUES
```

---

*Phase 74: Phase 72 committed. No push. Unrelated WIP preserved. No schema/migration edits. No hardening reopen without evidence.*
