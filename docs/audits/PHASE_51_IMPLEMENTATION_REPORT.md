# Phase 51 Implementation Report — F-33-03 Stock Movement Public POST Policy

## Executive Verdict

**PHASE 51 COMPLETE — F-33-03 CLOSED**

Public `POST /api/stock-movements` is restricted to **ADJUSTMENT-only** with dual permission enforcement per DL-51-01 Option C. Internal workflow movement types remain available through `executeCreateStockMovementInScope`.

---

## Baseline

| Item | Value |
|------|-------|
| HEAD before | `1aa422b` — `docs(decision): lock phase-51 enterprise policies` |
| Decision lock | `1aa422b` — DL-51-01 Option C |
| Phase 50 | `c5292a9` |
| WIP count | ~155 entries (preserved) |
| Push | NO |

---

## Finding — F-33-03 Root Cause

`POST /api/stock-movements` accepted all five movement types (`IN`, `OUT`, `RESERVE`, `RELEASE`, `ADJUSTMENT`) for any caller with `stockMovements.create` (WORKER+), without workflow guards. This allowed bypass of F-02 reservation serialization, dispatch/return context, and Phase 43 ADJUSTMENT permission intent (`inventory.adjust` not required at API layer).

Atomic inventory SQL prevented counter corruption, but workflow integrity was not enforced at the public boundary.

---

## Locked Policy — DL-51-01 Option C

| Movement type | Public POST |
|---------------|-------------|
| ADJUSTMENT | Allowed with `stockMovements.create` **AND** `inventory.adjust` |
| IN | Rejected (422) |
| OUT | Rejected (422) |
| RESERVE | Rejected (422) |
| RELEASE | Rejected (422) |

Internal workflows continue via `executeCreateStockMovementInScope` without this restriction.

---

## Implementation

| File | Change |
|------|--------|
| `application/services/public-stock-movement-create.policy.ts` | **NEW** — `assertPublicStockMovementCreateAllowed` |
| `presentation/routes/stock-movement-api.routes.ts` | Invoke policy in `handleCreateStockMovement` handler after auth |
| `application/stock-movement.public-post-policy.51.application.test.ts` | **NEW** — T51.1–T51.12 |
| `presentation/stock-movement.api.test.ts` | Updated POST tests for ADJUSTMENT-only policy |

### Algorithm

1. Route authenticates session and asserts `stockMovements.create` (existing).
2. Handler calls `assertPublicStockMovementCreateAllowed(ctx, input)`:
   - Non-ADJUSTMENT → `UnprocessableError` (422)
   - ADJUSTMENT → `assertAll(create, inventory.adjust)` → `ForbiddenError` (403) if missing
3. On success → `CreateStockMovementService.execute` → `executeCreateStockMovementInScope` (unchanged)

### Why in-scope primitive unchanged

Workflow services (dispatch, return, reserve, repair, maintenance, PO receive) call `executeCreateStockMovementInScope` directly. Public POST policy is enforced only at the HTTP handler boundary.

---

## Public API Contract

```text
ADJUSTMENT → allowed with inventory.adjust + stockMovements.create
IN          → rejected (422)
OUT         → rejected (422)
RESERVE     → rejected (422)
RELEASE     → rejected (422)
```

---

## Internal Workflow Preservation

| Type | Path | Status |
|------|------|--------|
| IN | `executeCreateStockMovementInScope` | Verified T51.8 |
| OUT | `executeCreateStockMovementInScope` | Verified T51.9 |
| RESERVE | `executeCreateStockMovementInScope` | Verified T51.10 |
| RELEASE | `executeCreateStockMovementInScope` | Verified T51.11 |

`CreateStockMovementService` remains unrestricted for in-process/test callers simulating workflow paths (Phase 43 T43.9 RESERVE via service unchanged).

---

## Test Matrix

| Test | Result |
|------|--------|
| T51.1 ADJUSTMENT both permissions | PASS |
| T51.2 ADJUSTMENT without inventory.adjust | PASS |
| T51.3 ADJUSTMENT without stockMovements.create | PASS |
| T51.4 IN rejected | PASS |
| T51.5 OUT rejected | PASS |
| T51.6 RESERVE rejected | PASS |
| T51.7 RELEASE rejected | PASS |
| T51.8 internal IN | PASS |
| T51.9 internal OUT | PASS |
| T51.10 internal RESERVE | PASS |
| T51.11 internal RELEASE | PASS |
| T51.12 Phase 43 PATCH regression | PASS |
| T51.13 Phase 29 stock movement suite | PASS (included in regression run) |

---

## Regression Results

| Suite | Command | Result |
|-------|---------|--------|
| Phase 51 focused | `stock-movement.public-post-policy.51.application.test.ts` | 20/20 PASS |
| Stock movement API | `stock-movement.api.test.ts` | PASS |
| Phase 43 | `inventory.patch-ledger-integrity.43.application.test.ts` | PASS |
| Phase 29 | `stock-movement.application.test.ts` | PASS |
| Combined targeted | 4 files | 76/76 PASS |
| Full suite | `npm test` | **3215/3215 PASS** (+20 vs Phase 50) |

---

## Static Validation

| Check | Result |
|-------|--------|
| `npx prisma validate` | PASS |
| ESLint (Phase 51 files) | PASS |
| `npm run typecheck` | Pre-existing unrelated WIP failures only |

---

## Schema / Migration

```text
Schema changes: NONE
Migrations: NONE
```

---

## WIP Preservation

~155 unrelated WIP entries unchanged. Only Phase 51 files committed.

---

## Git

| Item | Value |
|------|-------|
| Commit | `eeb0c6f` — `fix(stock-movement): restrict public post to adjustments` |
| Message | `fix(stock-movement): restrict public post to adjustments` |
| Push | NO |

---

## Remaining Enterprise Queue

| ID | Status |
|----|--------|
| N-44-05 | OPEN — DL-51-02 locked, Phase 52 candidate |
| N-48-01 | OPEN — DL-51-03 locked, Phase 53 candidate |
| F-35-08 | DEFERRED |

## Recommended Next Step

Post-Phase-51 Enterprise Gap Audit, then Phase 52 — N-44-05.
