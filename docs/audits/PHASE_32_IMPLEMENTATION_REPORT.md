# Phase 32 Implementation Report — Rental Order Reserve Command Integrity

**Date:** 2026-08-17  
**Baseline HEAD:** `bbe89b4420128bf1fdc03f8d874263fbfda4db9c` (`feat(dispatch): harden claimed-quantity integrity`)  
**Decision lock:** `docs/decisions/RENTAL_ORDER_RESERVE_COMMAND_INTEGRITY_32.md`  
**Final HEAD:** `bbe89b4420128bf1fdc03f8d874263fbfda4db9c` (unchanged — not committed)

---

## 1. Executive Verdict

**IMPLEMENTED AND VALIDATED**

Phase 32 closes **F-32-01** (same-order concurrent partial reserve lost-update) by adding parent `rental_orders` row `SELECT … FOR UPDATE`, mandatory post-lock RentalOrder re-fetch, and authoritative `withReserved` on fresh state. Phase 31 cross-order inventory serialization is preserved unchanged.

---

## 2. Baseline HEAD

| Attribute | Value |
| --- | --- |
| Branch | `main` |
| HEAD | `bbe89b4420128bf1fdc03f8d874263fbfda4db9c` |
| Ahead of `origin/main` | 9 commits (not pushed) |
| Phase 31 | Present (uncommitted) |
| Phase 32 production changes | Applied (uncommitted) |

---

## 3. Findings Implemented

| ID | Summary | Status |
| --- | --- | --- |
| **F-32-01** | Same-order concurrent partial reserve lost-update on stale RentalOrder snapshot | **CLOSED** |

---

## 4. F-32-01 Root Cause

`ReserveRentalOrderService` previously called `existing.withReserved(...)` **before** acquiring locks (pre-Phase-32 L77–82). Concurrent commands on the same RentalOrder read identical `reservedQuantity = 0`, computed absolute line totals independently, and `updateReserve` last-writer-won — e.g. +4 then +3 yielding final line **3** instead of **7**.

Multi-line orders were worse: commands targeting different inventory rows did not block each other, yet each wrote **all lines'** absolute quantities from stale snapshots, clobbering sibling-line updates.

---

## 5. Exact Locking Strategy

| Contention | Resource | Mechanism |
| --- | --- | --- |
| **A. Cross-order F-02** (Phase 31) | `inventory` row | `lockForAvailabilityCommit(inventoryId)` — `SELECT … FOR UPDATE` |
| **B. Same-order reserve** (Phase 32) | `rental_orders` parent row | `lockForReserveCommand(rentalOrderId)` — `SELECT … FOR UPDATE` |

Production uses PostgreSQL row-level locks inside the existing `IRentalOrderTransactionRunner` transaction. In-memory tests use scoped async mutexes: `availability-commit-lock.ts` (inventory) + `reserve-command-lock.ts` (rental order).

---

## 6. Exact Lock Ordering

```
1. findById — 404 / warehouseId only (not used for persistence)
2. Aggregate deltaByProduct
3. Resolve inventoryIds per product
4. Sort inventoryIds ascending
5. FOR EACH inventoryId: lockForAvailabilityCommit
6. lockForReserveCommand(rentalOrderId)
7. fresh = findById(rentalOrderId)
8. reservedOrder = fresh.withReserved(...)
9. F-02 re-read + validate on fresh state
10. updateReserve(fresh.id, ...)
11. RESERVE movements (inventoryId sorted)
12. Audit + commit
```

---

## 7. Fresh-State / Reload Behavior

After steps 5–6, the service **must not** use the pre-lock `existing` entity for reservation math. Step 7 re-fetches the RentalOrder; step 8 applies incremental deltas via domain `withReserved` on **fresh** items. `previousValues` audit baseline is taken from `fresh` immediately before `updateReserve`.

---

## 8. Transaction Boundary

Single `IRentalOrderTransactionRunner.run()` — inventory locks, RO lock, re-fetch, F-02 validation, `updateReserve`, `RESERVE` movements, and audit commit or roll back atomically. No new transaction layer introduced.

---

## 9. Repository Changes

| Component | Change |
| --- | --- |
| `IRentalOrderRepository` | Added `lockForReserveCommand(id)` |
| `PrismaRentalOrderRepository` | Raw SQL `SELECT id FROM rental_orders WHERE id = $1 FOR UPDATE` |
| `InMemoryRentalOrderRepository` | Delegates to `acquireReserveCommandLock` |
| `reserve-command-lock.ts` | **New** — in-memory test mutex keyed by `rentalOrderId` |

No schema, migration, version column, or idempotency table added.

---

## 10. Service Changes

**`ReserveRentalOrderService`** rewired per decision lock §10:

- Removed authoritative pre-lock `withReserved` on initial snapshot
- Added `lockForReserveCommand` after inventory locks
- Added post-lock `findById` → `withReserved` on fresh entity
- F-02 validation uses `fresh` (items, warehouseId, excludeRentalOrderId)
- `updateReserve`, RESERVE movements, and audit reference fresh state

**Unchanged:** `CancelRentalOrderService`, `ConfirmRentalOrderService`, F-02 formulas, CONFIRMED exclusion policy.

---

## 11. Test Coverage

| File | Scope |
| --- | --- |
| `rental-order.reserve-command-integrity.32.application.test.ts` | **New** — T32.1–T32.9 |
| `rental-order.availability-serialization.31.application.test.ts` | Phase 31 regression (T32.12) |
| `rental-order.concurrency.29.application.test.ts` | Phase 29 regression (T32.11) |
| `dispatch.claimed-quantity.30.application.test.ts` | Phase 30 regression (T32.12) |
| `return.source-condition.28.application.test.ts` | Phase 28 regression (T32.10) |
| F-02 suites | `f02-date-aware-availability.regression.test.ts`, `reserve-rental-order.date-aware.test.ts` |

All T32 concurrency tests use genuine `Promise.allSettled([...])` parallelism.

---

## 12. Concurrency Proof

| Test | Scenario | Result |
| --- | --- | --- |
| **T32.1** | Same RO concurrent +4 / +3 | Both succeed; final reserved **7**; inv **7**; 2 RESERVE movements |
| **T32.2** | Cumulative proof | Final **7**, not 4 or 3 |
| **T32.3** | Line at 8/10, concurrent +3/+3 | ≥1 **422**; final ≤ 10 |
| **T32.9** | Multi-line same RO, line A +4 ∥ line B +3 | Both lines preserved (4 + 3); no clobber |

---

## 13. Regression Results

| Suite | Result |
| --- | --- |
| T32.1–T32.9 (Phase 32) | **9/9 PASS** |
| T31.* (Phase 31) | **15/15 PASS** |
| T29.6 (Phase 29) | **PASS** |
| T30.* (Phase 30) | **PASS** |
| Phase 28 source×condition | **PASS** (8 tests) |
| F-02 date-aware | **40/40 PASS** |

---

## 14. TypeScript Result

**PASS** (`tsc --noEmit`)

---

## 15. ESLint Result

**PASS** — 0 errors on Phase 32 changed files; full-repo lint: 0 errors, 42 pre-existing warnings (unchanged from Phase 31 baseline)

---

## 16. Prisma Validation

**PASS** — `prisma validate` succeeded

---

## 17. Migration Status

**Up to date** — 6 migrations, database schema current, **no new migrations**

---

## 18. Production Build

**PASS** (`prisma generate && next build`)

---

## 19. Git Diff Check

**PASS** (`git diff --check` — no conflict markers or whitespace errors; CRLF line-ending notices only)

---

## 20. Schema / Migration Confirmation

**NO SCHEMA CHANGE** — `prisma/schema.prisma` and `prisma/migrations/` have zero Phase 32 diffs

---

## 21. Deferred Findings

Not implemented (per decision lock §25): F-30-07, F-31-03, F-31-05–F-31-11, F-11, F-09, F-07.

---

## 22. Changed Files

### Phase 32–specific (new / modified for F-32-01)

| File | Change |
| --- | --- |
| `src/modules/rental-order/infrastructure/reserve-command-lock.ts` | **New** — test mutex |
| `src/modules/rental-order/domain/rental-order.repository.interface.ts` | `lockForReserveCommand` |
| `src/modules/rental-order/infrastructure/repositories/prisma-rental-order.repository.ts` | PostgreSQL `FOR UPDATE` |
| `src/modules/rental-order/tests/helpers/in-memory-rental-order.repository.ts` | Test mutex delegate |
| `src/modules/rental-order/tests/helpers/transaction-test-runner.ts` | `runWithReserveCommandLockScope` nested with availability scope |
| `src/modules/rental-order/application/services/reserve-rental-order.service.ts` | Post-lock re-fetch + fresh `withReserved` |
| `src/modules/rental-order/application/rental-order.reserve-command-integrity.32.application.test.ts` | **New** — T32.1–T32.9 |

### Pre-existing Phase 31 (preserved, uncommitted)

| File | Change |
| --- | --- |
| `src/modules/inventory/domain/inventory.repository.interface.ts` | `lockForAvailabilityCommit` |
| `src/modules/inventory/infrastructure/repositories/prisma-inventory.repository.ts` | Inventory `FOR UPDATE` |
| `src/modules/inventory/infrastructure/availability-commit-lock.ts` | Test mutex |
| `src/modules/inventory/tests/helpers/in-memory-inventory.repository.ts` | Test delegate |
| `src/modules/rental-order/application/services/cancel-rental-order.service.ts` | Inventory lock before RELEASE |
| `src/modules/rental-order/application/rental-order.availability-serialization.31.application.test.ts` | T31.1–T31.12 |

### Documentation (untracked)

| File | Change |
| --- | --- |
| `docs/audits/PHASE_32_IMPLEMENTATION_REPORT.md` | **This report** |
| `docs/decisions/RENTAL_ORDER_RESERVE_COMMAND_INTEGRITY_32.md` | Decision lock (pre-existing) |

**Modified tracked files:** 9 (+2 untracked Phase 32 source files)

---

## 23. Known Limitations

None identified for Phase 32 scope. Cancel path intentionally does not acquire `lockForReserveCommand` per decision lock §17.

---

## 24. Final Verdict

**IMPLEMENTED AND VALIDATED**

All acceptance criteria satisfied. No commit. No push.

---

## Final Git Status

```
 M src/modules/inventory/domain/inventory.repository.interface.ts
 M src/modules/inventory/infrastructure/repositories/prisma-inventory.repository.ts
 M src/modules/inventory/tests/helpers/in-memory-inventory.repository.ts
 M src/modules/rental-order/application/services/cancel-rental-order.service.ts
 M src/modules/rental-order/application/services/reserve-rental-order.service.ts
 M src/modules/rental-order/domain/rental-order.repository.interface.ts
 M src/modules/rental-order/infrastructure/repositories/prisma-rental-order.repository.ts
 M src/modules/rental-order/tests/helpers/in-memory-rental-order.repository.ts
 M src/modules/rental-order/tests/helpers/transaction-test-runner.ts
?? docs/audits/PHASE_32_IMPLEMENTATION_REPORT.md
?? src/modules/inventory/infrastructure/availability-commit-lock.ts
?? src/modules/rental-order/application/rental-order.availability-serialization.31.application.test.ts
?? src/modules/rental-order/application/rental-order.reserve-command-integrity.32.application.test.ts
?? src/modules/rental-order/infrastructure/reserve-command-lock.ts
(+ pre-existing untracked decision/audit docs)
```

**git diff --stat:** 9 files changed, 213 insertions(+), 60 deletions(-)  
**HEAD:** `bbe89b4 feat(dispatch): harden claimed-quantity integrity`  
**Ahead of origin/main:** 9 commits
