# Phase 64 Post-Implementation Enterprise Gap Audit

## Executive Verdict

**PASS WITH FINDINGS**

**N-39-PATTERN-01 Batch 1 remains CLOSED.**

Independent code inspection confirms Dispatch, Rental Order, and Payment dashboard summaries are database-authoritative over the complete filtered dataset, read-only, and correctly authorized. Residual findings are test-coverage gaps (documentation severity) and pre-existing Batch 2 / deferred-item queue items — not Batch 1 regressions.

---

## Baseline

| Field         | Value      |
| ------------- | ---------- |
| Starting HEAD | `4d6fa55`  |
| Final HEAD    | `e0767d9`  |
| Branch        | `main`     |
| Push          | NOT PUSHED |
| WIP before    | 149 entries (modified + untracked; unrelated) |
| WIP after     | 149 entries + Phase 64 audit doc only |

### Initial snapshot

```text
git rev-parse HEAD → 4d6fa554c072d5b82af05af501e0b17d9686c35d
git log -5:
  4d6fa55 fix(dashboard): make dispatch order payment summaries authoritative
  742b248 fix(repair): enforce return inspection foreign key
  3d92c7c docs(audit): complete post-phase-59 enterprise gap audit
  eaf16fa fix(rental-invoice): fix summary stats pagination cap
  15cb48d docs(audit): complete post-phase-57 enterprise gap audit
```

HEAD matches expected Phase 63 baseline. Unrelated WIP preserved throughout audit.

---

## Phase 63 Verification

### Dispatch

**Verdict: PASS**

**Evidence:**

- Frontend `useDispatchSummaryStats` calls `getDispatchSummary({})` via `queryKeys.dispatches.summary({})` — no `pageSize: 100` list fetch for summary (`src/features/dispatch/hooks/use-dispatch.ts`).
- API: `GET /api/dispatches/summary` → `handleGetDispatchSummary` with `PERMISSIONS.dispatches.read` (`dispatch-api.routes.ts`).
- Service: `GetDispatchSummaryService` → `dispatchRepository.findSummaryStats` only (`get-dispatch-summary.service.ts`).
- Prisma: parallel `count`, `groupBy`, filtered `count`, `dispatchItem.aggregate(_sum quantity)` — no paginated list (`prisma-dispatch.repository.ts:361-429`).
- Shared filters: `buildDispatchSummaryWhere` reuses `mapDispatchFilter` + search (`dispatch-query.filters.ts`); list repository uses same `mapDispatchFilter` (`prisma-dispatch.repository.ts:121`).
- Tests: `dispatch.summary-stats.63.application.test.ts` proves 100/101/150 completeness, status distribution, filter, empty dataset. API auth test in `dispatch.api.test.ts`.

**No first-page dependency for summary metrics.**

---

### Rental Order

**Verdict: PASS**

**Evidence:**

- Frontend `useRentalOrderSummaryStats` → `getRentalOrderSummary({})` — no list pagination (`use-rental-order.ts`).
- API: `GET /api/rental-orders/summary` with `PERMISSIONS.rentalOrders.read`.
- Service: `GetRentalOrderSummaryService` → `findSummaryStats` only.
- Prisma: `count` + `groupBy` for status counts; unbounded `findMany` with minimal `select` for line-level revenue/reservation derivation, then domain `computeRentalOrderSummaryResult` (`prisma-rental-order.repository.ts:469-529`).
- Shared filters: `buildRentalOrderSummaryWhere` / `mapRentalOrderFilter` (`rental-order-query.filters.ts`).
- Tests: `rental-order.summary-stats.63.application.test.ts` — 100/101/150 boundary, full status/revenue/reservation distribution, customer/warehouse/search filters.

**Completeness:** Status counts are DB-authoritative. Revenue/reservation metrics operate on all matching orders (not first 100). **Performance note:** `findMany` without pagination is a deliberate tradeoff for line-item derivation; not a completeness defect.

**Test gap:** No dedicated summary API authorization test (unlike Dispatch). Application tests are strong; API auth inferred from shared `runRentalOrderApiRoute` pattern.

---

### Payment

**Verdict: PASS**

**Evidence:**

- Frontend `usePaymentSummaryStats` → `getPaymentSummary({})` — no `getPayments({ pageSize: 100 })` for summary.
- API: `GET /api/payments/summary` with `PERMISSIONS.payments.read` (`payment-api.routes.ts:60-89`).
- Service: `GetPaymentSummaryService` → `paymentRepository.findSummaryStats` only — constructor takes `IPaymentRepository` only; no transaction runner, no post/void services.
- Prisma: parallel `count`, `groupBy` (status + method), `aggregate(_sum amount)` for POSTED/PENDING, filtered void count; Decimal converted via `.toString()` (`prisma-payment.repository.ts:257-328`).
- Shared filters: `buildPaymentSummaryWhere` / `mapPaymentFilter` (`payment-query.filters.ts`).
- Tests: `payment.summary-stats.63.application.test.ts` — 100/101/150, status/method/totals, filters, shared filter semantics.

**Read-only call chain verified:** Route → `GetPaymentSummaryService.execute` → `findSummaryStats` → Prisma aggregates. No payment mutation, invoice settlement, or accounting services in chain.

**Test gap:** No dedicated summary API authorization test (Dispatch has one).

---

## Database Authority

| Module       | Metric | DB source | Aggregation | Complete? |
| ------------ | ------ | --------- | ----------- | --------- |
| Dispatch | totalDispatches | `dispatch.count` | SQL COUNT | Yes |
| Dispatch | statusCounts.* | `dispatch.groupBy(status)` | SQL GROUP BY | Yes |
| Dispatch | pendingActionCount | `dispatch.count` filtered DRAFT/READY | SQL COUNT | Yes |
| Dispatch | inTransitCount | `dispatch.count` DISPATCHED | SQL COUNT | Yes |
| Dispatch | completedCount | `dispatch.count` COMPLETED | SQL COUNT | Yes |
| Dispatch | totalUnits | `dispatchItem.aggregate(_sum quantity)` | SQL SUM | Yes |
| Rental Order | totalOrders / statusCounts | `rentalOrder.count` / `groupBy` | SQL | Yes |
| Rental Order | totalRevenue | `findMany` items → domain multiply | App over all matches | Yes |
| Rental Order | reservationStatusCounts | derived from all matching order lines | App over all matches | Yes |
| Rental Order | pendingActionCount | domain rules on full projection | App | Yes |
| Payment | totalPayments / statusCounts / methodCounts | `count` / `groupBy` | SQL | Yes |
| Payment | totalCollected | `aggregate(_sum amount)` POSTED | SQL SUM | Yes |
| Payment | totalPendingAmount | `aggregate(_sum amount)` PENDING | SQL SUM | Yes |
| Payment | voidCount | filtered `count` | SQL COUNT | Yes |

---

## Filter Parity

API-level list and summary endpoints share filter mappers. Frontend list-page hooks currently call summary with `{}` (global unfiltered stats — same pattern as Phase 59 rental invoice).

### Dispatch

| Filter | List | Summary | Same semantics? |
| ------ | ---- | ------- | ------------- |
| Search | Yes | Yes | Yes — shared search fields |
| Status | Yes | Yes | Yes — `mapDispatchFilter` |
| Rental Order | Yes | Yes | Yes |
| Warehouse | Yes | Yes | Yes — via `rentalOrder.warehouseId` |
| Date (dispatchDateFrom/To) | Yes | Yes | Yes |
| Pagination/sort | List only | N/A | Expected |

### Rental Order

| Filter | List | Summary | Same semantics? |
| ------ | ---- | ------- | ------------- |
| Search | Yes | Yes | Yes |
| Status | Yes | Yes | Yes — `mapRentalOrderFilter` |
| Customer | Yes | Yes | Yes |
| Warehouse | Yes | Yes | Yes |
| Date (eventFrom/eventTo) | Yes | Yes | Yes — overlap semantics |
| Pagination/sort | List only | N/A | Expected |

### Payment

| Filter | List | Summary | Same semantics? |
| ------ | ---- | ------- | ------------- |
| Search | Yes | Yes | Yes |
| Status | Yes | Yes | Yes — `mapPaymentFilter` |
| Payment method | Yes | Yes | Yes |
| Customer | Yes | Yes | Yes |
| Rental Invoice | Yes | Yes | Yes |
| Date (paymentDateFrom/To) | Yes | Yes | Yes — end-of-day on `paymentDateTo` |
| Pagination/sort | List only | N/A | Expected |

**Note:** List-page UI does not pass active table filters into summary hooks (global dashboard cards). This is pre-existing UX, not introduced by Phase 63, and matches Phase 59 rental-invoice behavior.

---

## Authorization

| Endpoint | Permission | Infrastructure |
| -------- | ---------- | -------------- |
| `GET /api/dispatches/summary` | `dispatches.read` | `runDispatchApiRoute` |
| `GET /api/rental-orders/summary` | `rentalOrders.read` | `runRentalOrderApiRoute` |
| `GET /api/payments/summary` | `payments.read` | `runPaymentApiRoute` |

- Summary endpoints require authentication and existing read permissions.
- No new permissions; `ROLE_PERMISSIONS` unchanged in Phase 63 commit.
- Phase 57 regression: `worker-mutation-permissions.57.test.ts` — **PASS** (134 tests in combined regression run including this file).
- Payment summary uses read permission only; WORKER cannot mutate financial state through summary path.

---

## Payment Read-Only Safety

**Call chain (verified):**

```text
GET /api/payments/summary
  → handleGetPaymentSummary
  → GetPaymentSummaryService.execute
  → IPaymentRepository.findSummaryStats
  → Prisma count / groupBy / aggregate (read)
```

**Does NOT invoke:** `CreatePaymentService`, `PostPaymentService`, `UpdatePaymentService`, payment transaction runner, invoice settlement, `amountPaid` updates, accounting hooks, or journal posting.

---

## Performance

| Module | DB aggregation | First-page dependency | Full-row fetch | N+1 |
| ------ | -------------- | --------------------- | -------------- | --- |
| Dispatch | count, groupBy, aggregate | None | No | No |
| Rental Order | count, groupBy + minimal findMany | None for counts; all matches for line metrics | Yes — all matching orders, minimal select | No |
| Payment | count, groupBy, aggregate | None | No | No |

No `findMany(pageSize: 100)` used for Batch 1 complete metrics.

---

## Concurrency

- Read-only endpoints; no application locks added in Phase 63.
- Parallel aggregate queries per request; no shared mutable accumulators.
- Independent aggregate queries may reflect slightly different snapshots under concurrent writes — acceptable for dashboard reporting; not a defect.

---

## Test Verification

### Full suite

```text
Total:   3328
Passed:  3328
Failed:  0
Skipped: 0
```

Matches Phase 63 baseline.

### Phase 63 test quality

| Module | >100 completeness | Status/method counts | Filters | Authorization | Empty | Rating |
| ------ | ----------------- | -------------------- | ------- | ------------- | ----- | ------ |
| Dispatch | Strong | Strong | Strong (status) | API test present | Strong | **Strong** |
| Rental Order | Strong | Strong (+ reservation) | Strong | Missing API test | Not explicit | **Adequate** |
| Payment | Strong | Strong (+ financial totals) | Strong | Missing API test | Not explicit | **Adequate** |
| Payment read-only | N/A | N/A | N/A | Code inspection | N/A | **Adequate** |

### Regression revalidation

| Phase | Finding | Test file | Result |
| ----- | ------- | --------- | ------ |
| 52 | N-44-05 POSTED payment → invoice VOID rejected | `rental-invoice.void-posted-payment-guard.52.application.test.ts` | 8/8 PASS |
| 53 | Direct ERA F-02 parity | `rental-order.source-externally.application.test.ts` | PASS (in regression batch) |
| 43 | Inventory PATCH ledger bypass | `inventory.public-patch-policy.43.application.test.ts` | PASS |
| 51 | Stock movement POST ADJUSTMENT only | `stock-movement.public-post-policy.51.application.test.ts` | PASS |
| 57 | WORKER financial mutations blocked | `worker-mutation-permissions.57.test.ts` | PASS |
| 59 | Rental invoice summary DB-authoritative | `rental-invoice.summary-stats.59.application.test.ts` | PASS |
| 61 | Repair returnInspectionItemId FK | `repair.fk-hygiene.61.application.test.ts` | PASS |
| Payment void/settlement | Core payment tests | `payment.application.test.ts` | PASS |

No Phase 63 regressions detected.

---

## Static Validation

| Check | Result | Notes |
| ----- | ------ | ----- |
| Prisma validate | **PASS** | Schema valid |
| TypeScript | **FAIL (pre-existing WIP)** | Errors in WIP files (payment write scope, stock-movement tests, return tests, etc.); Phase 63 commit files clean |
| ESLint | **FAIL (pre-existing WIP)** | 5 errors, 52 warnings repo-wide; **0 errors in Phase 63 summary files** |
| Full test suite | **PASS** | 3328/3328 |

No schema/migration changes during audit.

---

## Remaining N-39-PATTERN-01 Candidates (Batch 2)

| Module | Defect remains? | User-visible? | Severity | Recommended? |
| ------ | --------------- | ------------- | -------- | ------------ |
| **Repair** | Partial — `totalRepairCost` from `pageSize: 100` sample; status counts use `meta.total` (complete) | Yes — cost card incomplete when >100 repairs | P3 | Batch 2 |
| **Return** | Partial — `totalReturnedUnits` from 100-row sample; status counts complete via `meta.total` | Yes — units metric incomplete | P3 | Batch 2 |
| **Maintenance** | Partial — cost/service metrics from 100-row sample; status/service-type counts complete | Yes — cost incomplete | P3 | Batch 2 |
| **Inventory** | Full — `useInventorySummaryStats` aggregates `getInventoryList({ pageSize: 100 })` | Yes | P3 | Batch 2 (high clarity) |
| **Expense** | Full — `useExpenseSummaryStats` → `getExpenses({ pageSize: 100 })` | Yes | P3 | Batch 2 (high clarity) |
| **Asset** | Full — `useAssetSummaryStats` → `getAssets({ pageSize: 100 })` | Yes | P3 | Batch 2 (high clarity) |

### pageSize:100 re-scan classification

- **D — Already fixed:** Rental Invoice, Dispatch, Rental Order, Payment dashboard summaries.
- **A — Dashboard completeness defects:** Expense, Asset, Inventory (full); Repair, Return, Maintenance (partial cost/units).
- **B — Lookup/dropdown pagination:** Customer/product/warehouse lists in form hooks — not defects.
- **C — Legitimate bounded queries:** Detail-page scoped lists (e.g. returns by dispatchId) — intentional.

---

## Deferred Findings Reassessment

### F-35-08 — Expense accounting hook ordering (P2 DEFERRED)

**Status: Remains latent in committed code; active in unmerged WIP.**

- **Committed HEAD (`4d6fa55`):** `create-expense-transaction.runner.ts` uses `NoOpExpenseAccountingHook` — no journal side effects in production.
- **Unmerged WIP:** Same factory file wires `ExpenseAccountingHook` with real account/journal repositories.
- **`PayExpenseService` (committed):** calls `accountingHook.onExpensePaid(paid)` **before** `expenseRepository.updateStatus(...)` (lines 70–78). If status persistence fails after journal creation, orphan journal risk exists when real hook is active.
- **WIP still unmerged:** Defect remains latent in deployed/committed behavior.
- **Recommendation:** Remain **P2 DEFERRED** until expense accounting WIP merge is planned. **Decision lock required** before merging accounting WIP without reordering hook vs. status persist (or transactional compensation).

### F-07 — RentalOrder DISPATCHED not persisted (P3 DEFERRED)

**Status: Unchanged.**

- `DISPATCHED` exists in Prisma enum and domain (`rental-order.constants.ts`, `schema.prisma`).
- Dispatch completion transitions order to `ON_RENT` directly; test asserts `order?.status).not.toBe("DISPATCHED")` after complete (`dispatch.application.test.ts:815-816`).
- `DISPATCHED` is ephemeral in domain workflow, not a lasting persisted rental-order state in the dispatch-complete path.
- **Severity/priority unchanged:** P3 deferred documentation/semantic gap, not data corruption.

### F-37-R2 — Invoice number sequence gaps (P3 DEFERRED)

**Status: Unchanged.**

- Uniqueness enforced; P2002 retry tested (`rental-invoice.p2002-retry.55.application.test.ts`).
- `findMaxSequenceForInvoicePrefix` uses SQL max on numeric suffix — concurrent generation may leave gaps.
- Audit/financial impact remains low (cosmetic sequence gaps, not duplicate numbers).
- **Remains P3 DEFERRED.** No schema change required.

---

## New Findings

### DOC-64-01 — Batch 1 summary API authorization test gap

```text
Finding ID: DOC-64-01
Severity: Documentation
Module: Payment, Rental Order
Status: OPEN

Title: Missing dedicated summary API authorization tests for Payment and Rental Order

Evidence: dispatch.api.test.ts includes handleGetDispatchSummary auth test;
payment-api.routes.ts and rental-order-api.routes.ts have no equivalent test files.

Impact: Authorization behavior relies on shared route runner convention; lower regression confidence.

Reproduction / proof: grep payment.api.test / rental-order.api.test for summary handler — absent.

Current mitigation: Shared run*ApiRoute pattern identical to list endpoints; Phase 57 tests unchanged.

Why existing controls are insufficient: Future route wiring mistakes would lack module-specific guard.

Recommended remediation: Add summary handler API tests in a future documentation/hardening phase.

Schema change required: No
Decision lock required: No
```

No new P0/P1/P2 findings from Phase 63 verification.

---

## Finding Summary

| Severity      | Count |
| ------------- | ----: |
| P0            | 0 |
| P1            | 0 |
| P2            | 0 (1 deferred: F-35-08) |
| P3            | 0 (3 deferred: F-07, F-37-R2, Batch 2 queue) |
| Deferred      | 3 |
| Documentation | 1 (DOC-64-01) |

---

## Recommended Next Phase

**Target: F-35-08 — Expense accounting hook ordering / orphan-journal risk**

**Why it ranks first:**

1. **Severity:** P2 latent defect outweighs P3 reporting completeness (Batch 2).
2. **Imminence:** Unmerged WIP already wires `ExpenseAccountingHook`; merging without fix activates orphan-journal risk on failed status persist.
3. **Financial impact:** Journal entries are authoritative accounting records; reporting caps (Batch 2) do not corrupt ledger state.
4. **Scope:** Focused reorder or transactional compensation in `PayExpenseService` / hook wiring — no schema change expected.

**Decision lock:** Do not merge expense accounting WIP until F-35-08 is remediated or explicitly accepted.

**Alternative if WIP merge deferred indefinitely:** N-39-PATTERN-01 **Batch 2** starting with **Expense**, **Inventory**, and **Asset** (full first-page aggregation defects; clearest parity with Phase 63 pattern).

---

## WIP Preservation

- WIP entry count unchanged at **149** (audit added one doc file only).
- No application code modified.
- No git reset/restore/stash/clean used.

---

## Commit

```text
e0767d9 docs(audit): complete post-phase-63 enterprise gap audit
```

## Push

NOT PUSHED

---

## Final Enterprise Verdict

```text
P0: 0
P1: 0
P2: 0 active (F-35-08 deferred latent)
P3: 0 active (F-07, F-37-R2, N-39 Batch 2 deferred)

Deferred: F-35-08, F-07, F-37-R2
Documentation: DOC-64-01

N-39-PATTERN-01 Batch 1: CLOSED

Next recommended target: F-35-08 (expense accounting hook ordering before WIP merge)
```

No implementation performed during Phase 64.  
No schema/migration changes.  
No unrelated WIP modified.  
Push: NOT PUSHED
