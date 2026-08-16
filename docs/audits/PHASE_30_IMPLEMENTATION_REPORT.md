# Phase 30 — Dispatch Claimed-Quantity Integrity Implementation Report

## Executive Verdict

**IMPLEMENTED AND VALIDATED**

## 1. Baseline

| Field | Value |
|-------|-------|
| Branch | `main` |
| Starting HEAD | `d0ded6c` — feat(concurrency): harden workflow command idempotency |
| Final HEAD | `d0ded6c` (unchanged — no commit) |
| Starting ahead of `origin/main` | 8 |
| Final ahead of `origin/main` | 8 |
| Working tree | 13 modified production/test files + 2 new source files + 1 new test file + pre-existing untracked Phase 30 docs |

## 2. Decision Lock

Implementation follows [docs/decisions/DISPATCH_CLAIMED_QUANTITY_INTEGRITY_30.md](../decisions/DISPATCH_CLAIMED_QUANTITY_INTEGRITY_30.md):

- Rollup A (non-CANCELLED dispatch-item SQL aggregate) for capacity validation
- Rollup B (COMPLETED dispatch `quantity` sum) unchanged for return sync semantics
- No persisted counter / no schema change
- No `findPaged({ pageSize: 100 })` on integrity paths
- Parent `rental_orders` row `SELECT … FOR UPDATE` before aggregate re-read inside existing UoW
- Over-capacity → HTTP 422 (`UnprocessableError`), not Phase 29 `CONCURRENT_UPDATE` 409
- RO cancel → `EXISTS` non-CANCELLED dispatch
- Return sync → unbounded `findCompletedDispatchesByRentalOrderId`
- `CompleteDispatchService` unchanged

## 3. Findings Implemented

| Finding | Resolution |
|---------|------------|
| **F-05** | Exact SQL Rollup A aggregate; parent-row lock; per-line capacity validation on create/update; concurrent over-claim eliminated |
| **F-30-05** | `existsNonCancelledDispatchByRentalOrderId` replaces paged cancel guard |
| **F-30-06** | `findCompletedDispatchesByRentalOrderId` replaces paged completed-dispatch fetch in return sync |

## 4. Implementation Summary

1. **Rollup A aggregate** — `sumClaimedSourceQuantitiesByRentalOrderId` joins `dispatch_items` ↔ `dispatches`, excludes `CANCELLED`, groups by line/product, uses `COALESCE(ownedQuantity, quantity)` and `COALESCE(externalQuantity, 0)`.
2. **Parent-row lock** — `lockForDispatchClaim` runs `SELECT id FROM rental_orders WHERE id = $1 FOR UPDATE` (Prisma raw SQL) before aggregate read in create/update.
3. **Aggregate re-read** — claimed quantities loaded after lock, not from paged list scans.
4. **Per-line validation** — existing `validateRentalOrderForDispatch` / source-split rules unchanged; fed by exact aggregate maps.
5. **Dispatch creation** — create/update proceed only when `claimed + requested ≤ reservation ceiling` per line.
6. **Cancellation EXISTS** — `existsNonCancelledDispatchByRentalOrderId` SQL `EXISTS` query.
7. **Return-sync unbounded COMPLETED rollup** — `findCompletedDispatchesByRentalOrderId` with `status = 'COMPLETED'`, no pagination cap.

In-memory test concurrency uses `dispatch-claim-lock.ts` (AsyncLocalStorage-scoped mutex) mirroring transaction-scoped `FOR UPDATE`.

## 5. Files Changed

| File | Why |
|------|-----|
| `create-dispatch.service.ts` | Lock → SQL aggregate → validate → create |
| `update-dispatch.service.ts` | Same when items change (`excludeDispatchId`) |
| `cancel-rental-order.service.ts` | EXISTS guard instead of paged scan |
| `sync-rental-order-status-from-returns.ts` | Unbounded COMPLETED dispatch fetch |
| `dispatch.repository.interface.ts` | New repository contracts |
| `dispatch.rules.ts` | `toClaimedSourceQuantityMaps` helper |
| `dispatch/domain/index.ts` | Export new types/helper |
| `prisma-dispatch.repository.ts` | SQL aggregate, EXISTS, findCompleted |
| `prisma-rental-order.repository.ts` | `lockForDispatchClaim` FOR UPDATE |
| `rental-order.repository.interface.ts` | `lockForDispatchClaim` contract |
| `in-memory-dispatch.repository.ts` | Mirror new dispatch repo methods |
| `in-memory-rental-order.repository.ts` | In-memory lock via claim mutex |
| `dispatch-claim-lock.ts` | Test/in-memory transaction-scoped mutex |
| `transaction-test-runner.ts` | ALS scope for claim-lock release |
| `dispatch.claimed-quantity.30.application.test.ts` | T30.1–T30.8 + edge tests |

## 6. Repository Changes

| Method | Layer | Purpose |
|--------|-------|---------|
| `sumClaimedSourceQuantitiesByRentalOrderId(rentalOrderId, { excludeDispatchId? })` | Dispatch repo | Rollup A exact SQL aggregate |
| `existsNonCancelledDispatchByRentalOrderId(rentalOrderId)` | Dispatch repo | F-30-05 EXISTS guard |
| `findCompletedDispatchesByRentalOrderId(rentalOrderId)` | Dispatch repo | F-30-06 Rollup B source set |
| `lockForDispatchClaim(id)` | Rental order repo | Parent-row FOR UPDATE serialization |

## 7. Concurrency Behavior

For concurrent dispatch **creates** on the same rental order:

1. Both enter the existing dispatch UoW transaction.
2. Both attempt `lockForDispatchClaim` on the parent `rental_orders` row.
3. PostgreSQL serializes; second waits until first commits.
4. Winner reads aggregate, validates capacity, creates dispatch, commits.
5. Loser re-reads aggregate (now includes winner's claim), fails capacity check → `UnprocessableError` (422).
6. Rejected create produces no dispatch row, no inventory movement, no audit success.

Example: `reserved = 10`, concurrent requests A=10 and B=10 → exactly one succeeds; final claimed = 10.

## 8. Error Semantics

| Condition | HTTP | Error type |
|-----------|------|------------|
| Over-capacity dispatch create/update | **422** | `UnprocessableError` |
| Phase 29 status-transition race | **409** | `ConcurrentUpdateError` (unchanged) |

## 9. Cancellation Behavior

`CancelRentalOrderService` now calls `existsNonCancelledDispatchByRentalOrderId` instead of scanning `findPaged({ pageSize: 100 })`. Active dispatch beyond record 100 correctly blocks cancellation with the existing 422 message.

## 10. Return Synchronization

`syncRentalOrderStatusFromReturns` loads all COMPLETED dispatches via `findCompletedDispatchesByRentalOrderId`. Rollup B still sums `item.quantity` from COMPLETED dispatches only. RO status machine semantics (`PARTIALLY_RETURNED`, `RETURNED`, `COMPLETED`) unchanged.

## 11. Schema

**NO SCHEMA CHANGE**

- `git diff -- prisma/schema.prisma` — empty
- `git diff -- prisma/migrations` — empty
- No migration generated or applied

## 12. API Compatibility

Happy-path dispatch create/update/cancel/complete API request and response shapes unchanged. Behavioral change: concurrent over-capacity create correctly returns **422** instead of silently succeeding via truncated aggregate.

## 13. Tests

| Test | Result |
|------|--------|
| T30.1 concurrent over-claim (10+10, reserved=10) | PASS |
| T30.2 concurrent partial (6+6, reserved=10) | PASS |
| T30.3 existing claim + race (7+3+3, reserved=10) | PASS |
| T30.4 >100 dispatches Rollup A | PASS |
| T30.5 RO cancel with active dispatch beyond page 100 | PASS |
| T30.6 return sync with COMPLETED beyond page 100 | PASS |
| T30.7 cancel dispatch releases claim | PASS |
| T30.8 CompleteDispatch Phase 29 regression | PASS |
| T30.9 Phase 28 regression | PASS (included in full suite — `return.source-condition.28.application.test.ts`) |
| Additional edge tests (CANCELLED exclusion, different RO concurrent) | PASS (2/2) |

Phase 30 file: **10/10 passed**.

## 14. Regression Validation

| Suite | Result |
|-------|--------|
| Phase 28 (`return.source-condition.28.application.test.ts`) | PASS |
| Phase 29 dispatch concurrency (`dispatch.concurrency.29.application.test.ts`) | PASS |
| Dispatch module suites | PASS |
| Rental order application suites | PASS |
| Return application suites | PASS |
| **Full suite** | **3022 / 3022 passed** (+10 vs Phase 29 baseline 3012) |

## 15. Validation Gates

| Gate | Result |
|------|--------|
| TypeScript (`npm run typecheck`) | PASS |
| ESLint (`npm run lint`) | PASS — 0 errors, 42 pre-existing warnings |
| Prisma validate | PASS |
| Prisma migrate status | UP TO DATE (6 migrations) |
| Production build (`npm run build`) | PASS |
| `git diff --check` | PASS (line-ending warnings only) |

## 16. Deferred Findings

| Finding | Status |
|---------|--------|
| **F-30-07** Maintenance/repair stock movements before status claims | **DEFERRED** — not implemented |
| **F-30-08** CONFIRMED RO excluded from F-02 commitment lines | **DEFERRED** — not implemented |

## 17. Architecture Safety

- Clean Architecture boundaries preserved (SQL/raw queries in infrastructure repos only)
- No new transaction framework, advisory locks, or serializable isolation
- Phase 29 status-claim primitives untouched
- `CompleteDispatchService` not redesigned
- F-02 availability formula not modified

## 18. Git Safety

- **No commit** performed
- **No push** performed
- Changes limited to Phase 30 scope (+ required test infra + this report)
- Decision lock and Phase 30 audit documents not modified

## 19. Final Verdict

**IMPLEMENTED AND VALIDATED** — all acceptance tests green, full regression suite green, all validation gates green, zero schema changes.
