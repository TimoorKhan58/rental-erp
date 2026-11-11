# Phase 36 Implementation Report

**Date:** 2026-08-27  
**Decision lock:** `docs/decisions/CANCEL_MAINTENANCE_REVERSAL_INTEGRITY_36.md`  
**Parent audit:** `docs/audits/PHASE_36_ENTERPRISE_GAP_AUDIT.md`  
**Baseline HEAD:** `bd8b2201edff441c0022114e379ba19852a645e3`

---

## 1. Executive Verdict

**IMPLEMENTED AND VALIDATED**

F-36-01 is closed in code and covered by T36.1–T36.7. Full Vitest suite passes **3074/3074** (baseline 3067 + 7 new Phase 36 tests). Phase 36–scoped ESLint is clean. Phase 36 production/test paths have no TypeScript errors.

Full-repo **TypeScript** and **production build** remain **not green** due to **unrelated pre-existing WIP** (e.g. `customer-billing-section.tsx` missing imports). These blockers are outside Phase 36 scope and were not modified.

---

## 2. Finding

**F-36-01 — CancelMaintenanceService can skip required IN stock reversal when StartMaintenance and CancelMaintenance race (P1)**

---

## 3. Root Cause

`CancelMaintenanceService` derived reversal need from a **stale pre-claim read**:

```typescript
const wasInProgress = existing.status === "IN_PROGRESS";
// ... claim ...
if (wasInProgress) { /* IN */ }
```

When StartMaintenance committed `IN_PROGRESS`, `startedAt`, and OUT between Cancel's initial read and its cancellation claim, `wasInProgress` remained `false` and IN was skipped.

---

## 4. Fix

Replaced stale guard with **authoritative post-claim signal** per decision lock §9:

```typescript
const shouldReverseStock = claimed.startedAt !== null;
```

IN reversal now uses **`claimed`** entity fields (`inventoryId`, `quantity`, `id`, `maintenanceNumber`) instead of stale `existing`.

**File:** `src/modules/maintenance/application/services/cancel-maintenance.service.ts`

---

## 5. Transaction Ordering

Unchanged framework; corrected reversal gate only:

```
1. findById (validation read)
2. withCancelled() domain validation
3. claimStatusTransition([SCHEDULED|IN_PROGRESS] → CANCELLED)
4. if claimed === null → ConcurrentUpdateError (409)
5. shouldReverseStock = claimed.startedAt !== null
6. if shouldReverseStock → executeCreateStockMovementInScope(IN)
7. auditLogger.log
8. commit via IMaintenanceTransactionRunner.run()
```

StartMaintenance ordering unchanged: claim (`startedAt` persisted) → OUT → audit.

---

## 6. Concurrency Semantics

| Case | Behavior after fix |
| --- | --- |
| Cancel SCHEDULED (never started) | `claimed.startedAt === null` → no IN |
| Cancel after Start committed | `claimed.startedAt !== null` → exactly one IN |
| Start ∥ Cancel (stale read) | Gate test simulates Start completing before Cancel claim; IN emitted; inventory restored |
| Cancel wins before Start | Cancel succeeds; Start fails domain validation (422) on `CANCELLED` — existing semantics |
| Duplicate cancel | One claim success; one 409; ≤ one IN |
| IN failure after claim | Rollback runner restores `IN_PROGRESS`; no movement; no audit |

---

## 7. Tests

**New file:** `src/modules/maintenance/application/maintenance.cancel-reversal-integrity.36.application.test.ts`

| Test | Result |
| --- | --- |
| **T36.1** Start ∥ Cancel (gated stale-read simulation + `Promise.allSettled`) | **PASS** |
| **T36.2** Cancel from SCHEDULED | **PASS** |
| **T36.3** Cancel from IN_PROGRESS | **PASS** |
| **T36.4** Cancel wins before Start | **PASS** (Start → 422 `UnprocessableError`, not 409 — domain validation before claim on `CANCELLED`) |
| **T36.5** Start wins before Cancel | **PASS** |
| **T36.6** Post-claim IN failure rollback | **PASS** |
| **T36.7** Duplicate concurrent cancel | **PASS** |

---

## 8. Regression

| Phase | Suite | Result |
| --- | --- | --- |
| Phase 28 | `return.source-condition.28.application.test.ts` | **PASS** |
| Phase 29 | `return.concurrency.29.application.test.ts`, `dispatch.concurrency.29.application.test.ts` | **PASS** |
| Phase 30 | (included in dispatch concurrency suite) | **PASS** |
| Phase 31 | `rental-order.availability-serialization.31.application.test.ts` | **PASS** |
| Phase 32 | `rental-order.reserve-command-integrity.32.application.test.ts` | **PASS** |
| Phase 33 | `maintenance.concurrency.33.application.test.ts` | **PASS** |
| Phase 34 | `rental-invoice.dispatch-rollup.34.application.test.ts` | **PASS** |
| Phase 35 | `payment-invoice-settlement-concurrency.35.application.test.ts` | **PASS** |
| Maintenance functional | `maintenance.application.test.ts` | **PASS** |
| **Full suite** | `vitest run` | **3074/3074 PASS** |

---

## 9. Validation

| Check | Result |
| --- | --- |
| T36.1–T36.7 | **7/7 PASS** |
| Phase 28–35 targeted regression | **50/50 PASS** |
| Full suite | **3074/3074 PASS** |
| Phase 36 ESLint (touched files) | **Clean** |
| Phase 36 TypeScript (touched paths) | **Clean** (no errors on Phase 36 files) |
| Full `tsc --noEmit` | **FAIL** — unrelated WIP (`customer-billing-section.tsx`, product/procurement UI) |
| `prisma validate` | **Valid** |
| Migrations | **Up to date** (6 migrations) |
| Production build | **FAIL** — unrelated WIP (`customer-billing-section.tsx` module-not-found) |
| `git diff --check` (Phase 36 files) | **PASS** (CRLF warnings only) |

---

## 10. Schema

**NO SCHEMA CHANGE**

---

## 11. Deferred Findings

Unchanged — not implemented in Phase 36:

F-33-01, F-33-02, F-33-03, F-35-05, F-35-06, F-35-08, F-36-02, F-36-03, F-31-05, F-31-08, F-31-10, F-11, F-09, F-07

---

## 12. Git Status

| Item | Value |
| --- | --- |
| HEAD | `bd8b220` (unchanged — not committed) |
| Phase 36 modified | `cancel-maintenance.service.ts` |
| Phase 36 new | `maintenance.cancel-reversal-integrity.36.application.test.ts`, this report |
| Commit | **NOT PERFORMED** |
| Push | **NOT PERFORMED** |
| Pre-existing WIP | **PRESERVED** (~100+ modified/untracked files) |

---

**End of Phase 36 Implementation Report**
