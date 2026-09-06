# Phase 76 Staging Smoke Completion

## Status

```text
GREEN — STAGING OPERATIONAL / READY FOR FORMAL UAT
```

```text
YES — READY FOR FORMAL UAT
```

## Executive Verdict

Operator configuration unblocked Phase 76. Authenticated production-like smoke against `next start` completed successfully, including the full rental lifecycle through payment. A material invoice-number allocation defect was discovered during smoke, fixed with a minimal Prisma SQL change, rebuilt, and re-verified.

| Gate | Result |
| ---- | ------ |
| Non-placeholder `BETTER_AUTH_SECRET` | **READY** |
| E2E owner account authenticates | **PASS** |
| Health / ready / live / startup | **PASS** |
| Authenticated module lists + summaries | **PASS** |
| Inventory PATCH / stock-movement guards | **PASS** |
| Rental lifecycle → invoice → payment | **PASS** |
| Posted payment blocks invoice VOID | **PASS** |
| Focused authz / invoice / dispatch regressions | **PASS** |

## Baseline

| Field | Value |
| ----- | ----- |
| Branch | `main` |
| Starting HEAD | `266e95bd7aea64d7a64589dbb9eb71dd73f65e89` |
| Starting message | `fix(staging): align build and migration readiness` |
| WIP | ~150 unrelated entries (preserved) |
| Mode | Staging Smoke Completion |

## Final HEAD

Recorded after Phase 76 commit (see Commit).

## Commit

```text
Commit: YES
Push: NO
```

## WIP Safety

| | |
|--|--|
| Unrelated WIP modified | **NO** |
| `payment-list.query.ts` touched | **NO** |
| Forbidden git commands | **NO** |
| Secrets committed | **NO** |

## Environment Validation

| Variable | Status |
| -------- | ------ |
| `BETTER_AUTH_SECRET` | Present; **placeholder=NO** (length classified only) |
| `APP_ENV` | `local` (production build used for smoke) |
| `E2E_USER_EMAIL` / `E2E_USER_PASSWORD` | Present; email exists in auth + ERP tables |
| E2E role | `owner` (auth + ERP), active |
| `DATABASE_URL` | Present; Prisma migrate status up to date |

Secrets and passwords were never printed or committed.

## Secret Status

```text
BETTER_AUTH_SECRET: READY (non-placeholder)
```

## E2E Account Status

```text
E2E auth user: EXISTS
E2E ERP user: EXISTS / ACTIVE
E2E role: owner
Password: present (not disclosed)
```

Multi-role HTTP accounts (`manager` / `worker`) were not required for the critical-path owner smoke. Worker financial restrictions remain covered by unit regression (`worker-mutation-permissions.57`).

## Build Result

```text
npm run build → PASS (after invoice allocation fix)
```

## Migration Result

```text
npx prisma migrate status → Database schema is up to date! (7 migrations)
F-09 remains VERIFIED from Phase 75
```

## Health / Readiness / Liveness / Startup

Against `http://127.0.0.1:3001` (`next start`):

| Probe | Result |
| ----- | ------ |
| `GET /api/health` | PASS (200, ok) |
| `GET /api/health/live` | PASS (200, ok) |
| `GET /api/health/ready` | PASS (200, ready) |
| `GET /api/health/startup` | PASS (200, started) |

## Authentication Smoke

| Check | Result |
| ----- | ------ |
| Invalid credentials | PASS (401) |
| Valid sign-in + session | PASS |
| Unauthenticated protected API | PASS (401) |
| Sign-out + cleared cookie jar | PASS (401 on customers) |
| Cookie-cache note | Better Auth `cookieCache` may keep old jar valid until clients honor `Set-Cookie` / cache TTL — known config tradeoff, not treated as smoke failure |

## Authorization Smoke

| Check | Result |
| ----- | ------ |
| Unit: WORKER mutation permissions | PASS |
| Unit: expense pay accounting atomicity | PASS |
| Owner authenticated API access | PASS |
| HTTP multi-role matrix | Not executed (no separate manager/worker E2E accounts) |

## Core ERP Smoke

Authenticated list endpoints — all **PASS** (200):

Customer, Rental Order, Inventory, Dispatch, Return, Invoice, Payment, External Rental, Expense, Repair, Maintenance.

## Rental Lifecycle Result

```text
Customer → RO create → confirm → reserve → dispatch create/complete
→ return create/receive/inspect/complete → invoice generate/issue
→ payment create/post → PASS
```

## Inventory Integrity Result

| Check | Result |
| ----- | ------ |
| PATCH `quantityOnHand` rejected | PASS (400; schema `.strict()`) |
| PATCH `reservedQuantity` rejected | PASS (400) |
| Public stock-movement POST blocked | PASS (400) |
| Unit: stock-movement public POST policy | PASS (with dotenv-loaded env) |

## Financial Integrity Result

| Check | Result |
| ----- | ------ |
| Invoice generate/issue | PASS |
| Payment create/post | PASS |
| VOID invoice blocked after posted payment | PASS (422) |
| Invoice number allocation after fix | PASS (`INV-2026-006`) |

## Reporting Result

Authenticated summaries — all **PASS** (200), including Phase 72 dispatch summary (`data.stats`, `statusCounts`).

## Phase 72 Regression Result

| Check | Result |
| ----- | ------ |
| `getDispatchSummary` barrel export | Present |
| `dispatch.summary-stats.63` tests | PASS |
| `GET /api/dispatches/summary` authenticated | PASS |

## Application Defect Fixed in Phase 76

### F-76-01 — Invoice number max-sequence SQL always returned 0

| Field | Value |
| ----- | ----- |
| Classification | **APPLICATION DEFECT** |
| Symptom | `Unable to allocate a unique invoice number after multiple attempts` |
| Root cause | `findMaxSequenceForInvoicePrefix` used parameterized `SUBSTRING(... FROM $n)`; PostgreSQL prepared statements treat the bound argument as a regex pattern form, so MAX stayed `0` and allocation repeatedly tried `INV-YYYY-001` |
| Fix | Replace with `REPLACE("invoiceNumber", prefix, '')` numeric MAX (minimal repository change) |
| File | `src/modules/rental-invoice/infrastructure/repositories/prisma-rental-invoice.repository.ts` |
| Verification | Rebuild + lifecycle smoke PASS; number-allocation / P2002-retry unit suites PASS |

## Relevant Regression Tests

| Suite | Result |
| ----- | ------ |
| `dispatch.summary-stats.63` | PASS |
| `worker-mutation-permissions.57` | PASS |
| `expense.pay-accounting-atomicity.65` | PASS |
| `stock-movement.public-post-policy.51` | PASS (env loaded via dotenv) |
| `rental-invoice.number-allocation.50` | PASS |
| `rental-invoice.p2002-retry.55` | PASS |

## Failures and Classification

| Item | Classification | Outcome |
| ---- | -------------- | ------- |
| Pre-fix invoice allocation failure | APPLICATION DEFECT (F-76-01) | Fixed + verified |
| Initial smoke harness response parsing | TEST HARNESS | Fixed locally; not committed |
| Customer phone 409 on reuse | TEST DATA | Unique phone in smoke |
| Better Auth cookie-cache after logout | Known config tradeoff | Documented; clients honor Set-Cookie |

## Deferred Findings

Unchanged: `F-66-P3-01`, `F-66-P3-02`, `F-07`, `F-37-R2`.

## Remaining Non-Blockers

1. Formal backup/restore drill still pending (ops readiness, not UAT entry blocker).
2. Optional: provision `manager` / `worker` E2E users for HTTP multi-role matrix.
3. Optional: run the same smoke under `APP_ENV=staging` with HTTPS URLs when a true staging host exists.
4. Process env still needs dotenv/CI injection for suites that import hardened `env.ts` (documented previously).

## Final Gate

```text
Build: PASS
Migration: ALIGNED
F-09: VERIFIED (Phase 75)
Environment: READY
Secrets: READY
Application: STARTED
Health/Ready/Live/Startup: PASS
Authentication: PASS
Authorization: PASS (unit + owner HTTP)
Core ERP: PASS
Rental lifecycle: PASS
Inventory: PASS
Financial: PASS
Reporting: PASS
Phase 72 dispatch summary: PASS
```

```text
GREEN — STAGING OPERATIONAL / READY FOR FORMAL UAT
```

## Recommendation / Next Phase

> **Phase 77 — Formal UAT & End-to-End Business Acceptance**

Execute business acceptance against the staging dress-rehearsal stack using `docs/production/SMOKE_TESTS.md` and stakeholder scenarios. Optionally close backup/restore drill and multi-role HTTP matrix as ops adjuncts without reopening enterprise hardening.
