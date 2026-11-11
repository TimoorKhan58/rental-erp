# Post-Phase-32 Enterprise Gap Audit

**Audit date:** 2026-08-17  
**Auditor scope:** Full enterprise workflow surface after Phase 32 (uncommitted)  
**Baseline HEAD:** `bbe89b4420128bf1fdc03f8d874263fbfda4db9c` — `feat(dispatch): harden claimed-quantity integrity`  
**Phase 32 state:** Implemented and validated (uncommitted)  
**Latest full suite (Phase 32 report):** 3046/3046 PASS — not re-run in this read-only audit

---

## 1. Executive Verdict

**PHASES 28–32 VERIFIED CORRECT AT CURRENT HEAD (UNCOMMITTED WORKING TREE)**

Phase 32 closes **F-32-01**. Cross-order F-02 serialization (Phase 31), dispatch claimed-quantity integrity (Phase 30), concurrent-safe command idempotency (Phase 29), and mixed return source×condition attribution (Phase 28) remain intact where previously implemented.

**No P0 open findings.**

**Highest-priority remaining gap:** **F-30-07 / F-31-02** — Maintenance/Repair workflows emit inventory stock movements **before** atomic expected-status claims, enabling duplicate OUT/IN on concurrent commands.

**Recommended next phase:** **Phase 33 — Maintenance/Repair Claim-Before-Side-Effects Integrity** — extend Phase 29 claim-before-side-effects pattern to maintenance and repair mutation services.

---

## 2. Baseline

| Check | Result |
|---|---|
| Branch | `main` |
| HEAD | `bbe89b4420128bf1fdc03f8d874263fbfda4db9c` |
| Ahead of `origin/main` | 9 commits (not pushed) |
| `git diff --check` | **PASS** (CRLF line-ending notices only) |
| Tracked modifications | 9 files — Phase 31 + Phase 32 combined |
| Untracked (implementation) | `availability-commit-lock.ts`, `reserve-command-lock.ts`, Phase 31/32 test files |
| Untracked (docs) | Phase 30–32 audits/decisions; **this report** |
| Production/schema/test modified by audit | **NONE** (audit doc only) |

**Tracked modified files (pre-existing Phase 31 + Phase 32):**

- `src/modules/inventory/domain/inventory.repository.interface.ts`
- `src/modules/inventory/infrastructure/repositories/prisma-inventory.repository.ts`
- `src/modules/inventory/tests/helpers/in-memory-inventory.repository.ts`
- `src/modules/rental-order/application/services/cancel-rental-order.service.ts`
- `src/modules/rental-order/application/services/reserve-rental-order.service.ts`
- `src/modules/rental-order/domain/rental-order.repository.interface.ts`
- `src/modules/rental-order/infrastructure/repositories/prisma-rental-order.repository.ts`
- `src/modules/rental-order/tests/helpers/in-memory-rental-order.repository.ts`
- `src/modules/rental-order/tests/helpers/transaction-test-runner.ts`

**git diff --stat:** 9 files changed, 213 insertions(+), 60 deletions(-)

---

## 3. Phase 28 Verification

**Decision lock:** `docs/decisions/MIXED_RETURN_SOURCE_CONDITION_ATTRIBUTION_28.md`

| Requirement | Evidence | Verdict |
|---|---|---|
| Owned vs external source attribution on complete | `complete-return.service.ts` — `computeReleaseQuantity`, `computeRestockQuantity`, external customer-return delta paths | **PASS** |
| Source×condition matrix preserved | `return.source-condition.28.application.test.ts` (8 tests in regression batch) | **PASS** |
| External GOOD does not enter owned inventory | CompleteReturn movement routing unchanged | **PASS** |
| Phase 29 claim before side effects on complete | `complete-return.service.ts` L115 — `claimStatusTransition(INSPECTED→COMPLETED)` before stock/ERA mutations | **PASS** |

**Verdict:** Phase 28 **HONORED**. No drift detected.

---

## 4. Phase 29 Verification

**Decision lock:** `docs/decisions/CONCURRENT_SAFE_COMMAND_IDEMPOTENCY_29.md`

| Pattern | Services verified | Verdict |
|---|---|---|
| `claimStatusTransition` before side effects | `CompleteReturnService`, `CompleteDispatchService`, `ConfirmRentalOrderService`, ERA confirm/receive/allocate/settle/cancel/write-off/supplier-return | **PASS** |
| `ConcurrentUpdateError` → HTTP 409 | Used in above services + external rental workflow | **PASS** |
| Inventory OUT/IN/ADJUSTMENT atomic SQL | `prisma-inventory.repository.ts` — predicated `decrementOnHand`, `incrementOnHand`, `applyAdjustment`, `reserveAvailableQuantity`, `releaseReservedQuantity` | **PASS** |
| ERA counter predicates | `applyWorkflowDelta`, `applySettlement` predicated raw SQL (Phase 29) | **PASS** |
| READ COMMITTED / no schema change | No isolation-level changes; no Phase 29 schema additions | **PASS** |
| Maintenance/Repair in Phase 29 scope | **Not covered** — zero `claimStatusTransition` in maintenance/repair modules | **EXPECTED DEFERRED (F-30-07)** |

**Grep:** `claimStatusTransition` present in return, dispatch, rental-order (confirm/sync/cancel ERA), external-rental — **not** in maintenance or repair.

**Verdict:** Phase 29 **HONORED** on implemented workflows. Maintenance/Repair explicitly out of scope → **F-30-07 OPEN**.

---

## 5. Phase 30 Verification

**Decision lock:** `docs/decisions/DISPATCH_CLAIMED_QUANTITY_INTEGRITY_30.md`

| Requirement | Evidence | Verdict |
|---|---|---|
| **Rollup A** — sum non-CANCELLED dispatch items | `prisma-dispatch.repository.ts` L160–169 — SQL `SUM(COALESCE(ownedQuantity, quantity))`, `SUM(COALESCE(externalQuantity, 0))` WHERE `status <> 'CANCELLED'` | **PASS** |
| **Rollup B** — COMPLETED dispatches only for return sync | `sync-rental-order-status-from-returns.ts` — `findCompletedDispatchesByRentalOrderId()` | **PASS** |
| Parent RO `FOR UPDATE` on dispatch create/update | `create-dispatch.service.ts` L113, `update-dispatch.service.ts` L128 — `lockForDispatchClaim` | **PASS** |
| No pageSize=100 in dispatch integrity paths | Create/update use `sumClaimedSourceQuantitiesByRentalOrderId` — **not** `findPaged` | **PASS** |
| Cancel guard EXISTS not paginated scan | `cancel-rental-order.service.ts` — `existsNonCancelledDispatchByRentalOrderId` | **PASS** |
| Over-capacity → HTTP 422 | Dispatch domain validation unchanged | **PASS** |
| CompleteDispatch Phase 29 preserved | `complete-dispatch.service.ts` L112 — claim before RELEASE/OUT | **PASS** |
| No persisted counter column | Schema unchanged | **PASS** |

**Verdict:** Phase 30 **HONORED**. F-05/F-30-05/F-30-06 **CLOSED**.

---

## 6. Phase 31 Verification

**Decision lock:** `docs/decisions/DATE_AWARE_AVAILABILITY_SERIALIZATION_31.md`

| Requirement | Evidence | Verdict |
|---|---|---|
| Inventory `FOR UPDATE` before F-02 re-read | `reserve-rental-order.service.ts` L111–113 lock, L153+ F-02 | **PASS** |
| Ascending `inventoryId` lock order | L108–113 sort + acquire | **PASS** |
| Locks inside `IRentalOrderTransactionRunner` | Single `run()` callback | **PASS** |
| Cancel RELEASE acquires inventory locks first | `cancel-rental-order.service.ts` L165–167 before L169 RELEASE | **PASS** |
| CONFIRMED excluded from F-02 commitment | `rental-order.availability.rules.ts` L34–38 — `AVAILABILITY_COMMITMENT_STATUSES` = RESERVED, ON_RENT, PARTIALLY_RETURNED | **PASS** |
| Only production RESERVE path | Grep: only `reserve-rental-order.service.ts` emits `movementType: "RESERVE"` in workflow services | **PASS** |
| No schema change | `prisma/schema.prisma` — no Phase 31 diff | **PASS** |

**RESERVE/RELEASE mutation surface (global search):**

| Path | Locking | Verdict |
|---|---|---|
| `ReserveRentalOrderService` | Inventory + RO locks (Phase 32) | **PASS** |
| `CancelRentalOrderService` | Inventory locks before RELEASE | **PASS** |
| `CompleteDispatchService` / `CompleteReturnService` | Phase 29 claim + atomic SQL | **PASS** |
| `CreateStockMovementService` (API) | Atomic SQL only — no workflow lock | **BYPASS (F-31-08 family)** |
| `UpdateInventoryService` (PATCH) | Absolute write — no movement | **BYPASS (F-31-08)** |

**Verdict:** Phase 31 cross-order F-31-01 **CLOSED**. F-31-04 policy **LOCKED**.

---

## 7. Phase 32 Verification

**Decision lock:** `docs/decisions/RENTAL_ORDER_RESERVE_COMMAND_INTEGRITY_32.md`

| Requirement | Evidence | Verdict |
|---|---|---|
| Inventory locks preserved (Phase 31) | `reserve-rental-order.service.ts` L111–113 | **PASS** |
| Inventory IDs ascending | L108–113 | **PASS** |
| Parent RO `FOR UPDATE` after inventory locks | L115 `lockForReserveCommand` | **PASS** |
| RentalOrder re-fetched after parent lock | L117 `findById` → `fresh` | **PASS** |
| Fresh state for `withReserved` | L129 — `fresh.withReserved(...)` | **PASS** |
| F-02 uses fresh entity | L160–187 — `fresh.items`, `fresh.warehouseId`, `fresh.id` | **PASS** |
| `updateReserve` from fresh-derived `reservedOrder` | L214+ | **PASS** |
| RESERVE movements = request deltas | Per-item `reserveItem.quantity` in movement loop | **PASS** |
| Cancel unchanged (no RO reserve lock) | `cancel-rental-order.service.ts` — inventory locks only | **PASS** |
| Confirm unchanged | `confirm-rental-order.service.ts` — no inventory/reserve locks | **PASS** |
| No alternate reserve workflow bypass | No other service calls `updateReserve` | **PASS** |
| In-memory test mutex | `reserve-command-lock.ts` + `transaction-test-runner.ts` nested scopes | **PASS** |
| T32.1–T32.9 concurrency tests | `rental-order.reserve-command-integrity.32.application.test.ts` — `Promise.allSettled` | **PASS (per Phase 32 report)** |

**F-32-01 status:** **CLOSED** — stale pre-lock `withReserved` removed; post-lock re-fetch authoritative.

**Verdict:** Phase 32 **HONORED**.

---

## 8. Historical Finding Reconciliation

| ID | Original Sev | Current Status | Verified at HEAD? | Evidence | Exploitable? | Decision lock | Deferred? | Notes |
|---|---|---|---|---|---|---|---|---|
| **F-01** | P0 | **CLOSED** | Yes | `complete-return.service.ts` L115 claim before side effects | No | Phase 29 | No | — |
| **F-02** | — | **CLOSED (frozen)** | Yes | F-02 formula unchanged; Phase 31/32 serialization only | N/A | Phase 31 §6 | No | Formula not reopened |
| **F-03** | P1 | **CLOSED** | Yes | Atomic inventory SQL primitives | No | Phase 29 | No | — |
| **F-04** | P0 | **CLOSED** | Yes | `complete-dispatch.service.ts` claim before side effects | No | Phase 29 | No | — |
| **F-05** | P1 | **CLOSED** | Yes | `sumClaimedSourceQuantitiesByRentalOrderId` + `lockForDispatchClaim` | No | Phase 30 | No | Was pre-Phase-30 paginated rollup |
| **F-06** | P1 | **CLOSED** | Yes | Phase 31 inventory lock + post-lock F-02 | No | Phase 31 | No | Alias F-31-01 cross-order |
| **F-07** | P3 | **OPEN** | Yes | `RentalOrderStatus.DISPATCHED` in schema L527; ephemeral writer only | Low | None | Yes | F-31-09; shortfall rules exclude DISPATCHED |
| **F-08** | P1 | **CLOSED** | Yes | `confirm-rental-order.service.ts` L75 `claimStatusTransition` | No | Phase 29 | No | — |
| **F-09** | P2 | **OPEN** | Yes | `schema.prisma` L853 — `returnInspectionItemId` indexed, no `@relation`/FK | Medium | None | Yes | F-31-07 alias |
| **F-11** | P2 | **OPEN** | Yes | Module-level `PERMISSIONS.*` only — e.g. `maintenance-api.routes.ts` L38; no resource-level checks | Medium | None | Yes | F-31-06 alias |
| **F-30-05** | P1 | **CLOSED** | Yes | Dispatch create/update SQL aggregate | No | Phase 30 | No | — |
| **F-30-06** | P1 | **CLOSED** | Yes | EXISTS cancel guard + unbounded completed dispatch query | No | Phase 30 | No | — |
| **F-30-07** | P1 | **OPEN** | Yes | Maintenance/repair stock before `updateStatus` — see §10 | **Yes** | None | Yes | F-31-02 alias |
| **F-30-08** | P1 | **SUPERSEDED** | Yes | Locked as F-31-04 CONFIRMED exclusion policy | N/A | Phase 31 §6 | No | Not an open business decision |
| **F-31-01** | P1 | **CLOSED** | Yes | Phase 31 inventory serialization | No | Phase 31 | No | Cross-order F-02 |
| **F-31-02** | P1 | **OPEN** | Yes | Same as F-30-07 | **Yes** | None | Yes | Alias |
| **F-31-03** | P1 | **OPEN** | Yes | Invoice services `pageSize: 100` — see §11 | **Yes** (edge) | None | Yes | >100 dispatches/order |
| **F-31-04** | P1 | **CLOSED (policy)** | Yes | `AVAILABILITY_COMMITMENT_STATUSES` excludes CONFIRMED | N/A | Phase 31 | No | Intentional soft confirm |
| **F-31-05** | P2 | **OPEN** | Yes | `inspect-return.service.ts` L82, `receive-return.service.ts` L58 — unconditional `updateStatus` | Low | None | Yes | No inventory side effects |
| **F-31-06** | P2 | **OPEN** | Yes | Same as F-11 | Medium | None | Yes | Alias |
| **F-31-07** | P2 | **OPEN** | Yes | Same as F-09 | Medium | None | Yes | Alias |
| **F-31-08** | P2 | **OPEN** | Yes | `update-inventory.service.ts` absolute PATCH | Medium | None | Yes | Admin bypass |
| **F-31-09** | P3 | **OPEN** | Yes | Same as F-07 | Low | None | Yes | Alias |
| **F-31-10** | P3 | **OPEN** | Yes | `cancel-dispatch.service.ts` L58 — unconditional `updateStatus` | Low | None | Yes | No stock side effects |
| **F-31-11** | P3 | **OPEN** | Yes | No DB CHECK on reserved≤onHand | Low | None | Yes | Optional hardening |
| **F-31-12** | — | **N/A** | — | Monitoring placeholder | — | — | Yes | — |
| **F-32-01** | P1 | **CLOSED** | Yes | Phase 32 RO lock + fresh re-fetch | No | Phase 32 | No | Fixed in uncommitted work |

---

## 9. New Findings

### F-33-01 — Invoice number sequence capped at pageSize 500

| Field | Value |
|---|---|
| **Severity** | **P2** |
| **Module** | RentalInvoice |
| **File** | `generate-invoice-number.ts` L10–15 |
| **Observed behavior** | `findPaged({ page: 1, pageSize: 500, sortBy: "invoiceNumber", sortOrder: "desc" })` — max sequence derived from first page only |
| **Impact** | >500 invoices/year → duplicate invoice numbers possible |
| **Decision-lock status** | Provisional — unbounded max-sequence query or DB sequence |
| **Schema impact** | None required for SQL MAX approach |

### F-33-02 — Duplicate active-invoice guard capped at pageSize 10

| Field | Value |
|---|---|
| **Severity** | **P2** |
| **Module** | RentalInvoice |
| **File** | `generate-rental-invoice-from-order.service.ts` L73–78 |
| **Observed behavior** | Only first 10 invoices per order checked for non-VOID active invoice |
| **Impact** | Orders with >10 invoices could allow duplicate active invoice creation |
| **Decision-lock status** | Provisional — EXISTS query or unbounded lookup |
| **Schema impact** | None |

### F-33-03 — Direct stock-movement API bypasses workflow locks

| Field | Value |
|---|---|
| **Severity** | **P2** |
| **Module** | StockMovement / Inventory |
| **File** | `create-stock-movement.service.ts` → `create-stock-movement-in-scope.ts` |
| **Observed behavior** | `POST /stock-movements` accepts RESERVE/RELEASE without RO lock, F-02, or line `reservedQuantity` update |
| **Impact** | Authenticated users with stock-movement permission can desync warehouse holds from RO lines |
| **Decision-lock status** | Policy decision — restrict types, require reference workflow, or admin-only |
| **Schema impact** | None |

*Note: F-33-01/02/03 were not in prior audits; classified here. F-31-03 remains the primary P1 invoice finding.*

---

## 10. Maintenance / Repair Findings

**F-30-07 / F-31-02 — CONFIRMED OPEN**

| Service | Transition | Stock | Stock lines | Status lines | Stock before claim? |
|---|---|---|---|---|---|
| `StartMaintenanceService` | SCHEDULED→IN_PROGRESS | OUT | L92–107 | L109–112 | **YES** |
| `CompleteMaintenanceService` | IN_PROGRESS→COMPLETED | IN | L84–99 | L101–104 | **YES** |
| `CancelMaintenanceService` | →CANCELLED | IN (if IN_PROGRESS) | L85–100 | L103–105 | **YES** |
| `CompleteRepairService` | IN_PROGRESS→COMPLETED | IN | L90–105 | L107–110 | **YES** |
| `StartRepairService` | PENDING→IN_PROGRESS | — | — | L58–61 | N/A (no stock) |
| `CancelRepairService` | →CANCELLED | — | — | L58–60 | N/A (no stock) |

**Repository:** `prisma-maintenance.repository.ts` / `prisma-repair.repository.ts` — unconditional `update({ where: { id } })`; **zero** `claimStatusTransition`.

**Failure mode:** Concurrent duplicate `StartMaintenance` → 2× OUT movements; atomic SQL prevents negative on-hand per row but **not** duplicate workflow consumption.

**Phase 29 applicability:** Direct — same claim-before-side-effects pattern as `CompleteReturnService`.

**Test gap:** No `Promise.allSettled` concurrency tests in maintenance/repair application suites.

---

## 11. Invoice / Dispatch Rollup Findings

**F-31-03 — CONFIRMED OPEN (P1)**

| Service | Lines | Pattern |
|---|---|---|
| `GenerateRentalInvoiceFromOrderService` | L94–99 | `findPaged({ page: 1, pageSize: 100, rentalOrderId })` → returns flatten → invoice lines |
| `ConvertMissingToLossService` | L79–84 | Same capped dispatch load |

**Phase 30 fixed paths (verified clean):** dispatch create/update rollup, RO cancel EXISTS guard, RO return sync — all use unbounded SQL or EXISTS.

**Additional invoice pagination (F-33-01, F-33-02):** See §9.

---

## 12. RentalOrder State Machine Findings

| Status | Writer(s) | Side effects | Claim pattern |
|---|---|---|---|
| DRAFT | Create, Update | None | — |
| CONFIRMED | Confirm (claim DRAFT→CONFIRMED) | Notification | **Atomic claim** |
| CONFIRMED (partial) | Reserve (partial) | RESERVE movements | RO lock + CONFIRMED `updateMany` |
| RESERVED | Reserve (full) | RESERVE | RO lock + status transition |
| ON_RENT | CompleteDispatch → RO claim | RELEASE/OUT | **Atomic claim** |
| PARTIALLY_RETURNED | Return sync | — | Claim on sync |
| COMPLETED | Return sync | — | Claim on sync |
| CANCELLED | Cancel | RELEASE, ERA cascade | **Atomic claim** |

**F-07 / F-31-09:** `DISPATCHED` exists on `RentalOrderStatus` enum (`schema.prisma` L527) but is ephemeral during dispatch complete — not a durable RO status. Shortfall rules exclude it. **P3 cleanup debt.**

**No invalid direct status PATCH** exposed via API for rental orders.

---

## 13. Inventory Integrity Findings

**Authoritative mutations (via `create-stock-movement-in-scope.ts` + atomic SQL):** RESERVE, RELEASE, IN, OUT, ADJUSTMENT — predicated updates enforce `quantityOnHand >= 0`, `reserved <= onHand` on RESERVE.

**Workflow-aligned paths:** Reserve (Phase 32), Cancel RELEASE (Phase 31), CompleteDispatch, CompleteReturn, Maintenance/Repair (ordering gap F-30-07), Receive PO.

**Bypass paths (F-31-08 / F-33-03):**

- `UpdateInventoryService` — absolute PATCH of `quantityOnHand` / `reservedQuantity`
- `CreateStockMovementService` — direct RESERVE/RELEASE without RO coupling

**Advisory read note:** Dispatch/return use `Math.min(requested, inventory.reservedQuantity)` from pre-movement snapshot — mutation atomic; possible under-release vs intent (P3).

---

## 14. Stock Movement Findings

| Type | Primary creators | Duplicate-safe? |
|---|---|---|
| RESERVE | `ReserveRentalOrderService` only (workflow) | Yes (Phase 32 serialization) |
| RELEASE | Cancel RO, CompleteDispatch, CompleteReturn | Yes (Phase 29 claims on complete paths) |
| OUT | CompleteDispatch, StartMaintenance | Complete: yes; Maintenance: **no (F-30-07)** |
| IN | CompleteReturn, CompleteMaintenance, CancelMaintenance, CompleteRepair, Receive PO | Return: yes; Maintenance/Repair: **no (F-30-07)** |
| ADJUSTMENT | CreateStockMovement API | Atomic only |

No unique constraint on `(referenceType, referenceId, movementType)` — duplicate workflow movements possible where claims absent.

Phase 28 source×condition routing on CompleteReturn **unchanged**.

---

## 15. External Rental Findings

Phase 25.5 / 25.9 / 25.11 / 28 decisions **HONORED**:

- Atomic workflow claims on confirm/receive/allocate/settle/cancel (Phase 29)
- Owned vs external quantity isolation in dispatch rollup (Phase 30)
- RO cancel ERA cascade (`cancel-rental-order.service.ts` L202+)
- External quantities excluded from owned F-02 (T31.10)

No new ERA concurrency gaps beyond deferred authorization (F-11).

---

## 16. Return / Inspection Findings

| Step | Service | Claim? | Side effects |
|---|---|---|---|
| Receive | `ReceiveReturnService` | **No** (F-31-05) | None |
| Inspect | `InspectReturnService` | **No** (F-31-05) | None |
| Complete | `CompleteReturnService` | **Yes** (Phase 29) | RELEASE/IN, ERA delta |

Phase 28 source×condition attribution on complete **intact**.

Concurrent receive/inspect: duplicate audit / last-writer timestamps — **P2**, no inventory corruption.

---

## 17. Dispatch Findings

| Operation | Integrity | Verdict |
|---|---|---|
| Create | `lockForDispatchClaim` + SQL Rollup A | **PASS** |
| Update | Same | **PASS** |
| Complete | Phase 29 claim + RELEASE/OUT | **PASS** |
| Cancel | Unconditional `updateStatus` (F-31-10) | **P3** — no stock reversal on cancel (by design) |

Rollup A formula verified: owned `SUM(COALESCE(ownedQuantity, quantity))`, external `SUM(COALESCE(externalQuantity, 0))`, excludes CANCELLED.

---

## 18. Cancellation Findings

| Entity | Claim pattern | Inventory release | Notes |
|---|---|---|---|
| RentalOrder | `cancelIfCancellable` atomic | RELEASE after claim + inventory locks | Phase 31 |
| ExternalRental | Phase 29 claim | N/A (workflow counters) | BD-C5 zeroing preserved |
| Dispatch | Unconditional update | None | Status-only cancel |
| Return | Unconditional update | None until complete | F-31-10 |
| Maintenance/Repair | Unconditional update | IN on maintenance cancel (IN_PROGRESS) — **before claim (F-30-07)** | — |

Phase 25.11 RO↔ERA cascade **unchanged**.

---

## 19. Pagination / Aggregate Findings

| Location | pageSize | Classification |
|---|---|---|
| `generate-rental-invoice-from-order.service.ts` L94 | 100 | **DANGEROUS** (F-31-03) |
| `convert-missing-to-loss.service.ts` L79 | 100 | **DANGEROUS** (F-31-03) |
| `generate-rental-invoice-from-order.service.ts` L73 | 10 | **DANGEROUS** (F-33-02) |
| `generate-invoice-number.ts` L10 | 500 | **DANGEROUS** (F-33-01) |
| Dispatch create/update/cancel/sync | unbounded SQL | **SAFE** (Phase 30) |
| All `list-*.service.ts` | caller pageSize | **SAFE** (UI listing) |
| Feature hooks `pageSize: 100` | 100 | **SAFE** (presentation) |
| Reporting repositories | slice after full compute | **SAFE** |

---

## 20. Concurrency / TOCTOU Findings

| Pattern | Location | Status |
|---|---|---|
| Lock → re-fetch → mutate | `ReserveRentalOrderService` | **Fixed (Phase 32)** |
| Lock → F-02 → mutate | Reserve + Cancel | **Correct** |
| Lock → SQL aggregate → validate | Dispatch create/update | **Correct (Phase 30)** |
| Claim → side effects | CompleteReturn/Dispatch, ERA, Confirm | **Correct (Phase 29)** |
| Side effect → updateStatus | Maintenance/Repair | **P1 OPEN (F-30-07)** |
| findPaged → aggregate → write | Rental invoice services | **P1 OPEN (F-31-03)** |
| Absolute PATCH → write | UpdateInventory | **P2 OPEN (F-31-08)** |

---

## 21. Authorization Findings

**F-11 / F-31-06 — OPEN (P2)**

- API routes authenticate session (`authenticate-api-request.ts`) and check **module-level** permissions (e.g. `PERMISSIONS.maintenances.create`)
- No resource-level authorization (warehouse scope, order ownership, supplier tenancy)
- Service layer checks `UnauthorizedError` for missing userId only — not role granularity beyond API gate

No new authorization regressions from Phases 29–32.

---

## 22. Data Model Findings

| Item | Status | Severity |
|---|---|---|
| `Repair.returnInspectionItemId` — no FK | **OPEN** (F-09) | P2 |
| `DISPATCHED` enum without durable workflow | **OPEN** (F-07) | P3 |
| Application-enforced `reserved <= onHand` | No DB CHECK (F-31-11) | P3 |
| No version columns on RO/items | By design (Phase 32) | N/A |
| Counters on inventory | Mutated only via atomic SQL in movement paths | OK |
| Drift risk via PATCH inventory | **OPEN** (F-31-08) | P2 |

No new schema integrity gaps requiring immediate migration.

---

## 23. Test Coverage Findings

**Genuine concurrency tests present:**

- Phase 29: return, dispatch, RO confirm, inventory, external-rental — `Promise.allSettled`
- Phase 30: dispatch claimed-quantity — `Promise.allSettled`
- Phase 31: cross-order F-02 — `Promise.allSettled`
- Phase 32: same-order partial reserve, multi-line — `Promise.allSettled`

**Missing race coverage:**

| Gap | Severity |
|---|---|
| Maintenance/Repair concurrent start/complete | **P1** — matches F-30-07 |
| Invoice generation with >100 dispatches | **P1** — matches F-31-03 |
| Receive/Inspect concurrent duplicate | P2 |
| Cancel dispatch/return concurrent | P3 |
| Direct stock-movement API RESERVE bypass | P2 |
| UpdateInventory PATCH bypass | P2 |

Phase 32 tests would **fail** on pre-Phase-32 code (T32.1 cumulative 7) — tests appear meaningful, not sequential disguised as parallel.

---

## 24. API Contract Findings

Phases 29–32 preserved error semantics per decision locks:

| Failure class | HTTP | Code |
|---|---|---|
| Capacity / domain validation | 422 | `UnprocessableError` |
| Status claim race | 409 | `ConcurrentUpdateError` / `CONCURRENT_UPDATE` |
| Not found | 404 | unchanged |
| Auth | 401 | unchanged |

No accidental happy-path breaking changes detected in reserve/dispatch/return/confirm APIs.

---

## 25. Severity Matrix

| ID | Sev | Area | Exploitable now? | Next phase candidate? |
|---|---|---|---|---|
| **F-30-07 / F-31-02** | **P1** | Maintenance/Repair inventory double-fire | **Yes** | **Yes — recommended** |
| **F-31-03** | **P1** | Invoice dispatch rollup truncation | Yes (edge: >100 dispatches) | Yes — after Phase 33 |
| **F-33-01** | P2 | Invoice number sequence | Yes (edge: >500/year) | Invoice integrity phase |
| **F-33-02** | P2 | Duplicate invoice guard | Yes (edge: >10 invoices/order) | Invoice integrity phase |
| **F-33-03** | P2 | Stock movement API bypass | Yes (privileged user) | Hardening phase |
| **F-31-05** | P2 | Return receive/inspect claims | Low | Deferred |
| **F-31-06 / F-11** | P2 | Authorization granularity | Medium | Deferred |
| **F-31-07 / F-09** | P2 | Repair FK | Medium | Deferred (schema) |
| **F-31-08** | P2 | UpdateInventory PATCH | Medium | Deferred |
| **F-31-09 / F-07** | P3 | DISPATCHED enum | Low | Deferred |
| **F-31-10** | P3 | Dispatch/return cancel claims | Low | Deferred |
| **F-31-11** | P3 | DB CHECK constraints | Low | Deferred |

**Closed:** F-01–F-06 (incl. F-05/F-31-01), F-08, F-30-05, F-30-06, F-31-04, F-32-01.

---

## 26. Deferred Findings

Explicitly deferred per Phase 32 decision lock §25 and this audit:

F-31-03, F-31-05, F-31-06, F-31-07, F-31-08, F-31-09, F-31-10, F-31-11, F-11, F-09, F-07, F-33-01, F-33-02, F-33-03 (new, defer unless bundled).

**Not deferred:** F-30-07 / F-31-02 — recommended for immediate next phase.

---

## 27. Recommended Next Phase

### Phase 33 — Maintenance/Repair Claim-Before-Side-Effects Integrity

**Findings included:** F-30-07, F-31-02 (aliases)

**Findings deferred:** F-31-03 (invoice rollup), F-33-01/02 (invoice pagination family), F-31-05+, authorization, schema FK, PATCH bypass

**Why this is next:**

1. **Data corruption risk:** Duplicate OUT/IN on concurrent maintenance/repair commands directly mutates `quantityOnHand` — active corruption, not edge-case truncation.
2. **Concurrency risk:** Reproducible with `Promise.allSettled` duplicate start/complete — no row lock or status claim today.
3. **Inventory integrity:** Stock movements occur before workflow terminal state is claimed — violates Phase 29 invariant established across return/dispatch/ERA.
4. **Scope isolation:** Contained to `maintenance` and `repair` modules — no F-02, billing, or schema changes required.
5. **Dependency:** Phases 29–32 complete; pattern is proven (`claimStatusTransition` + 409 loser).

**Why it outranks F-31-03:** Invoice truncation requires >100 dispatches per order (rare); maintenance duplicate OUT is reachable on any concurrent double-click/retry on a common operation.

**Expected decision-lock scope:**

- Add `claimStatusTransition` to maintenance/repair repositories (expected-status `updateMany`)
- Reorder: claim **before** `executeCreateStockMovementInScope` on Start/Complete/Cancel maintenance and Complete repair
- Loser → HTTP 409 `ConcurrentUpdateError`
- Optional: claim-only on Start/Cancel repair (no stock) for consistency
- No schema change; no new tables; no Redis
- Concurrency acceptance tests with genuine `Promise.allSettled`

---

## 28. Decision-Lock Readiness

**READY FOR DECISION LOCK**

| Criterion | Status |
|---|---|
| Root cause proven | Yes — stock before unconditional `updateStatus`; zero claims in modules |
| Affected paths enumerated | 4 stock-mutating services + 2 non-stock workflow services |
| Unresolved business policy | **None** — Phase 29 precedent applies directly |
| Schema change required | **No** |

**DECISION REQUIRED:** None for Phase 33 scope.

---

## 29. Git Safety

| Check | Result |
|---|---|
| Production code modified by audit | **NO** |
| Tests modified | **NO** |
| Schema/migrations modified | **NO** |
| Decision locks modified | **NO** |
| Prior audits modified | **NO** |
| New artifact | `docs/audits/PHASE_33_ENTERPRISE_GAP_AUDIT.md` only |
| Commit / push | **NOT performed** |

**git status --short (unchanged from baseline):**

```
 M (9 Phase 31+32 source files)
?? docs/audits/PHASE_33_ENTERPRISE_GAP_AUDIT.md
?? (other pre-existing untracked docs/tests)
```

---

## 30. Final Verdict

**AUDIT COMPLETE — PHASES 28–32 VERIFIED; F-32-01 CLOSED**

**Open P1:** F-30-07 / F-31-02 (maintenance/repair), F-31-03 (invoice dispatch rollup)

**Recommended next phase:** Phase 33 — Maintenance/Repair Claim-Before-Side-Effects Integrity

**Decision-lock readiness:** **READY**

**No P0 findings. No regressions detected in Phases 28–32 implementation at current HEAD.**

---

*End of Post-Phase-32 Enterprise Gap Audit*
