# Phase 30 — Enterprise Gap Audit

**Audit date:** 2026-08-17  
**Auditor scope:** READ-ONLY — no production, test, schema, or migration changes  
**Parent phase:** Phase 29 — Concurrent-Safe Command Idempotency (`d0ded6c`)

---

## 1. Executive Verdict

**AUDIT COMPLETE — NEXT PHASE IDENTIFIED**

Phase 29 is committed and validated. The highest-priority remaining enterprise gap is **F-05 — CreateDispatch claimed-quantity rollup**, which combines a deterministic under-count defect (`pageSize: 100`) with a concurrent lost-update path on dispatch creation. This is the safest next hardening phase aligned with Phase 29's concurrency semantics.

---

## 2. Repository Baseline

| Attribute | Value |
| --- | --- |
| Branch | `main` |
| HEAD | `d0ded6c5698bc12544ad81d43e78b7697a033ebd` |
| Parent Phase 29 commit | `b78e2578f1f14551c52fd4beceb706ca00a9a486` |
| Phase 29 commit | `d0ded6c` — `feat(concurrency): harden workflow command idempotency` |
| Working tree | Clean (post Phase 29 commit) |
| Ahead of `origin/main` | 8 commits (+1 from Phase 29) |
| Push status | NOT PERFORMED |

---

## 3. Phase 29 Verification

All five in-scope findings from `docs/decisions/CONCURRENT_SAFE_COMMAND_IDEMPOTENCY_29.md` are **resolved** in commit `d0ded6c`. Evidence:

### F-01 — CompleteReturn

- **Atomic claim:** `CompleteReturnService` calls `returnRepository.claimStatusTransition(existing.id, "INSPECTED", …)` **before** inventory RELEASE/IN, external custody, audit, and notifications.
  - Evidence: `src/modules/return/application/services/complete-return.service.ts` (~L115)
- **Repository primitive:** `PrismaReturnRepository.claimStatusTransition` uses `updateMany` with `id` + expected status predicate; returns `null` on 0 rows.
  - Evidence: `src/modules/return/infrastructure/repositories/prisma-return.repository.ts` (~L229–276)
- **Loser behavior:** `ConcurrentUpdateError` (HTTP 409).
- **Tests:** `src/modules/return/application/return.concurrency.29.application.test.ts` (T29.1) — `Promise.allSettled`, 1 success / 1 `ConcurrentUpdateError`.

### F-02 — External Rental counters / settlement

- **Delta workflow:** `applyWorkflowDelta` with `workflowKind`-scoped predicated raw SQL for item counters (`receive`, `allocate`, `dispatch`, `customer-return`, `supplier-return`, `write-off`).
  - Evidence: `src/modules/external-rental/infrastructure/repositories/prisma-external-rental.repository.ts`
- **Settlement:** `applySettlement` enforces `amountPaid + delta <= amountDue` atomically in DB.
- **Services rewired:** Confirm, Receive, Allocate, Supplier Return, Write-off, Settle, Cancel (+ RO cascade cancel).
- **Tests:** `src/modules/external-rental/application/external-rental.concurrency.29.application.test.ts` (T29.3, T29.4).

### F-03 — Inventory OUT / IN / ADJUSTMENT

- **Safe primitives:** `decrementOnHand`, `incrementOnHand`, `applyAdjustment` on `PrismaInventoryRepository` with DB-level non-negative guard for decrements.
  - Evidence: `src/modules/inventory/infrastructure/repositories/prisma-inventory.repository.ts`
- **Stock movement wiring:** `create-stock-movement-in-scope.ts` routes OUT/IN/ADJUSTMENT through these primitives.
- **Tests:** `src/modules/inventory/tests/inventory.concurrency.29.test.ts` (T29.5).

### F-04 — CompleteDispatch

- **Atomic claim:** `claimStatusTransition(existing.id, "READY", dispatched.status, …)` before OUT, external counter, RO ON_RENT, audit, notification.
  - Evidence: `src/modules/dispatch/application/services/complete-dispatch.service.ts` (~L112–117)
- **Tests:** `src/modules/dispatch/application/dispatch.concurrency.29.application.test.ts` (T29.2).

### F-08 — RentalOrder Confirm

- **Atomic claim:** `claimStatusTransition(existing.id, "DRAFT", confirmed.status)` before audit/notification.
  - Evidence: `src/modules/rental-order/application/services/confirm-rental-order.service.ts` (~L75–88)
- **Tests:** `src/modules/rental-order/application/rental-order.concurrency.29.application.test.ts` (T29.6).

### Phase 29 validation (re-run at closeout)

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | PASS |
| `npm run lint` | PASS (0 errors, 42 pre-existing warnings) |
| `npx prisma validate` | PASS |
| `npx prisma migrate status` | Up to date (6 migrations) |
| `npm test` | PASS — 3012 / 3012 |
| `npm run build` | PASS |
| `git diff --check` | PASS |

---

## 4. Existing Decision Locks

| Document | Status | Notes |
| --- | --- | --- |
| `docs/decisions/CONCURRENT_SAFE_COMMAND_IDEMPOTENCY_29.md` | **IMPLEMENTED** (commit `d0ded6c`) | Authoritative for Phase 29 |
| `docs/decisions/MIXED_RETURN_SOURCE_CONDITION_ATTRIBUTION_28.md` | Valid | Phase 28 tests unchanged (14/14) |
| `docs/decisions/EXTERNAL_RENTAL_SOURCING_25.5.1.md` | Valid | Source isolation intact |
| `docs/decisions/EXTERNAL_RENTAL_CANCELLATION_25.5.9.md` | Valid | Cancel uses `claimStatusTransition` post-29 |
| `docs/decisions/RENTAL_ORDER_EXTERNAL_RENTAL_CANCELLATION_25.11.md` | Valid | Cascade cancel unchanged semantically |
| `docs/decisions/ANALYTICS_METRIC_CONTRACT_v1.0.md` | **Partially stale** | §2 states "DISPATCHED / ON_RENT writers — Not found on RentalOrder"; Phase 29 added atomic `ON_RENT` writer in `CompleteDispatchService`. Contract semantics for Active Rental (= CONFIRMED + RESERVED) remain correct; evidence row needs refresh, not metric redefinition. |

No decision locks were modified during this audit.

---

## 5. Domain State Matrix

| Aggregate | Status | Writer | Trigger | Persistence method | Concurrency guard |
| --- | --- | --- | --- | --- | --- |
| **RentalOrder** | DRAFT | Create | API POST | `create` | N/A (new row) |
| | CONFIRMED | ConfirmRentalOrderService | API confirm | `claimStatusTransition(DRAFT→CONFIRMED)` | **Phase 29 atomic claim** |
| | RESERVED | ReserveRentalOrderService | API reserve | `updateReserve` (`updateMany` status=CONFIRMED) + item qty update | Partial — status claim atomic; date-aware check is pre-mutation read (F-06) |
| | ON_RENT | CompleteDispatchService | Dispatch complete | `claimStatusTransition(CONFIRMED\|RESERVED→ON_RENT)` | **Phase 29 atomic claim** |
| | CANCELLED | CancelRentalOrderService | API cancel | `cancelIfCancellable` (`updateMany`) | Atomic expected-status set |
| | COMPLETED / RETURNED | syncRentalOrderStatusFromReturns | Return completion sync | `claimStatusTransition` where applicable | Partial |
| **ExternalRentalAgreement** | DRAFT→…→SETTLED | Workflow services | ERA API commands | `claimStatusTransition` + `applyWorkflowDelta` / `applySettlement` | **Phase 29 predicated SQL + claims** |
| | CANCELLED | Cancel / RO cascade | Cancel API | `claimStatusTransition` | **Phase 29** |
| **Dispatch** | DRAFT / READY | Create / Update / MarkReady | Dispatch API | Plain `create` / `update` / `updateStatus` | **None on create** (F-05) |
| | DISPATCHED | CompleteDispatchService (ephemeral) | Complete | `claimStatusTransition(READY→DISPATCHED)` | **Phase 29 claim before side effects** |
| | COMPLETED | CompleteDispatchService | Complete (same txn) | `updateStatus` (no expected predicate) | Protected by prior claim (single winner) |
| | CANCELLED | CancelDispatchService | Cancel API | `updateStatus` (no expected predicate) | Domain guard only — concurrent cancel risk (P3) |
| **Return** | DRAFT→RECEIVED | ReceiveReturnService | API receive | `updateStatus` (absolute) | **None** (F-30-02) |
| | RECEIVED→INSPECTED | InspectReturnService | API inspect | `updateStatus` (absolute) | **None** (F-30-02) |
| | INSPECTED→COMPLETED | CompleteReturnService | API complete | `claimStatusTransition(INSPECTED→COMPLETED)` | **Phase 29** |
| | *→CANCELLED | CancelReturnService | API cancel | `updateStatus` (absolute) | Domain guard only (P3) |

---

## 6. Invariant Matrix

| Invariant | Enforced where | Mechanism | Concurrency safe? | DB enforced? | Tested? | Violable path |
| --- | --- | --- | --- | --- | --- | --- |
| `quantityOnHand >= 0` | Inventory OUT/ADJUST | Predicated SQL decrement | **Yes** (Phase 29) | Yes (WHERE clause) | T29.5 | Direct `UpdateInventoryService` PATCH bypass (F-30-04) |
| `reservedQuantity <= quantityOnHand` | RESERVE | `reserveAvailableQuantity` predicated update | Yes | Yes | Existing + reserve tests | — |
| ERA `received <= confirmed` | Receive workflow | Predicated raw SQL in `applyWorkflowDelta` | **Yes** (Phase 29) | Statement-level | T29.4 | — |
| ERA `amountPaid + delta <= amountDue` | Settle | Predicated raw SQL in `applySettlement` | **Yes** (Phase 29) | Statement-level | T29.3 | — |
| Dispatch claimed qty ≤ RO reserved qty | CreateDispatch | Read paged dispatches → domain validate | **No** | No | Partial (unit) | pageSize cap + concurrent create (F-05) |
| Date-aware capacity not over-committed | ReserveRentalOrder | Pre-read `GetDateAwareAvailabilityService` | **No** | No | F-02 regression tests (single-thread) | Concurrent overlapping reserves (F-06) |
| Return complete at-most-once | CompleteReturn | `claimStatusTransition` | **Yes** (Phase 29) | `updateMany` predicate | T29.1 | — |
| Dispatch complete at-most-once side effects | CompleteDispatch | `claimStatusTransition(READY→…)` | **Yes** (Phase 29) | `updateMany` predicate | T29.2 | — |
| External GOOD never enters owned inventory | CompleteReturn | Domain + movement routing | Yes (single-thread) | No | Phase 28 (14 tests) | — |
| Repair item belongs to return line | Repair create | Application validation only | Unknown | **No FK** (F-09) | Repair tests | Orphan / wrong item id |

---

## 7. Findings

### F-05 — CreateDispatch claimed-quantity rollup (DEFERRED, STILL VALID)

| Field | Value |
| --- | --- |
| **Severity** | P1 High |
| **Area** | Dispatch / RentalOrder |
| **File(s)** | `src/modules/dispatch/application/services/create-dispatch.service.ts` (L114–122), `src/modules/dispatch/application/services/update-dispatch.service.ts` (~L131), `src/modules/dispatch/domain/dispatch.rules.ts` (L198–234) |
| **Service** | `CreateDispatchService`, `UpdateDispatchService` |
| **Observed behavior** | Claimed dispatch quantities are computed from `dispatchRepository.findPaged({ page: 1, pageSize: 100, rentalOrderId })`. Only the first 100 non-cancelled dispatches contribute to the rollup. |
| **Expected behavior** | All non-cancelled dispatches for the rental order must contribute to claimed-quantity totals before validating a new or updated dispatch. |
| **Business impact** | Orders with >100 dispatches silently under-count existing claims → new dispatch may exceed reserved/allocated quantities. Concurrent creates on the same order can both read identical stale rollups and pass validation (lost update). |
| **Reproduction** | (1) Create 101+ dispatches on one RO; create another dispatch claiming full remaining reserved qty — validation uses incomplete rollup. (2) Two concurrent `CreateDispatch` requests with quantities that individually fit but sum exceeds reserved — both succeed. |
| **Existing safeguard** | Domain validation `validateRentalOrderForDispatch` / `sumClaimedSourceDispatchQuantitiesByRentalOrderItem` — correct logic on **incomplete input set**. |
| **Why insufficient** | Input set truncated by pagination; no DB-level aggregate or serializable guard on create. |
| **Decision-lock status** | **Required** — Phase 29 explicitly deferred F-05 |
| **Schema impact** | None required (repository aggregate query sufficient); optional future CHECK on dispatch item totals |
| **Evidence** | `create-dispatch.service.ts` L114–118: `pageSize: 100`; L120–122: rollup from `existingForOrder.items` only |

---

### F-06 — F-02 date-aware availability serialization (DEFERRED, STILL VALID)

| Field | Value |
| --- | --- |
| **Severity** | P1 High |
| **Area** | RentalOrder / F-02 availability |
| **File(s)** | `src/modules/rental-order/application/services/reserve-rental-order.service.ts` (L111–182), `src/modules/rental-order/application/services/get-date-aware-availability.service.ts` (L19–22, L40–74) |
| **Service** | `ReserveRentalOrderService`, `GetDateAwareAvailabilityService` |
| **Observed behavior** | Date-aware capacity is checked via read-only snapshot, then `updateReserve` and inventory `RESERVE` run separately. No atomic coupling between the availability snapshot and the reservation commit. |
| **Expected behavior** | Overlapping rental periods must not over-commit date-aware capacity under concurrent reserve operations. |
| **Business impact** | Two concurrent orders (or concurrent reserve calls) with overlapping event dates can both pass the availability check and reserve — double-booking tents for the same period. |
| **Reproduction** | Two ROs (or two concurrent reserve requests) for same product/warehouse/overlapping dates; each reads `dateAwareAvailableQuantity` sufficient individually; both commit. |
| **Existing safeguard** | `reserveAvailableQuantity` protects **global** `quantityOnHand - reservedQuantity` but **not** per-period F-02 capacity. `updateReserve` atomically claims CONFIRMED→RESERVED for a **single order** only. |
| **Why insufficient** | F-02 commitment is application-computed from a stale read; inventory reservation does not encode event dates. |
| **Decision-lock status** | **Required** — serialization strategy (predicated commit table, advisory scope lock, or date-commit ledger) needs business/architecture sign-off |
| **Schema impact** | **Optional** — may need commitment ledger or date-range constraint table; not strictly required if app-level serializable transaction scope is chosen |
| **Evidence** | `reserve-rental-order.service.ts` L111: comment "must complete before any mutation"; L145–169: availability read; L173–182: separate `updateReserve`; L229+: inventory RESERVE |

---

### F-07 — RentalOrder.DISPATCHED ghost enum (DEFERRED, STILL VALID)

| Field | Value |
| --- | --- |
| **Severity** | P3 Low |
| **Area** | Domain enums / Analytics |
| **File(s)** | `prisma/schema.prisma` (L527, L704), `src/modules/rental-order/domain/rental-order.entity.ts` (L149), `src/modules/dispatch/application/services/complete-dispatch.service.ts` (L283–284) |
| **Observed behavior** | `DISPATCHED` exists on RentalOrder and Dispatch enums. Complete dispatch uses ephemeral in-memory `DISPATCHED` on Dispatch aggregate, persists RO as `ON_RENT`, never persists RO `DISPATCHED`. |
| **Expected behavior** | Enum values should correspond to persisted states or be documented ephemeral transitions. |
| **Business impact** | Low — primarily developer confusion and stale analytics contract references. Reporting treats `DISPATCHED` as non-active for rentals (`isActiveRentalStatus` returns false). |
| **Decision-lock status** | Optional cleanup — coordinate with Analytics Metric Contract refresh |
| **Schema impact** | Migration required to remove enum variant (breaking if any row used it) |
| **Evidence** | `dispatch.application.test.ts`: "sets confirmed rental order to ON_RENT without persisting DISPATCHED"; Analytics contract §2: "Not found on RentalOrder" — still true for persistence |

---

### F-09 — Repair.returnInspectionItemId foreign key (DEFERRED, STILL VALID)

| Field | Value |
| --- | --- |
| **Severity** | P2 Medium |
| **Area** | Database / Repair |
| **File(s)** | `prisma/schema.prisma` (L848–876) |
| **Observed behavior** | `Repair.returnInspectionItemId` is `@db.Uuid` with `@@index` but **no `@relation`** to `ReturnInspectionItem`. |
| **Expected behavior** | FK to `ReturnInspectionItem.id` with explicit `onDelete` behavior. |
| **Business impact** | Orphan repair records referencing non-existent return lines; no DB referential integrity. |
| **Decision-lock status** | **Required** for ON DELETE behavior (Restrict vs SetNull) |
| **Schema impact** | **Required** — migration adding FK; may fail if orphan data exists |
| **Evidence** | `schema.prisma` L853: field without relation; compare L852 parent `returnInspection` which has FK |

---

### F-11 — Authorization granularity (DEFERRED, STILL VALID)

| Field | Value |
| --- | --- |
| **Severity** | P2 Medium |
| **Area** | Authorization / API |
| **File(s)** | See sub-findings below |
| **Observed behavior** | Several mutating endpoints use broader permissions than the action semantics imply. |
| **Business impact** | Users with read/update roles can perform state-changing operations intended for narrower roles (mark-read, submit, delete category, convert invoice, adjust inventory). |
| **Decision-lock status** | **Required** — map actions to permission matrix |
| **Schema impact** | None |

#### F-11a — Notification mark-read uses read permission

- **Evidence:** `src/modules/notification/presentation/routes/notification-api.routes.ts` L105: `permission: PERMISSIONS.notifications.read` on PATCH mark-read (L93–108). No `notifications:mark-read` permission exists in `permissions.ts` L171–174.

#### F-11b — Expense submit uses update permission

- **Evidence:** `src/modules/expense/presentation/routes/expense-api.routes.ts` L169: `handleSubmitExpense` uses `PERMISSIONS.expenses.update`; no `expenses.submit` in `permissions.ts` L160–167.

#### F-11c — Expense category delete uses update permission

- **Evidence:** `src/modules/expense/presentation/routes/expense-category-api.routes.ts` L169: DELETE uses `PERMISSIONS.expenses.update`.

#### F-11d — Rental invoice convert-missing-to-loss uses update permission

- **Evidence:** `src/modules/rental-invoice/presentation/routes/rental-invoice-api.routes.ts` L266: `convertMissingToLoss` uses `PERMISSIONS.rentalInvoices.update`.

#### F-11e — Inventory adjust permission orphaned from API

- **Evidence:** `PERMISSIONS.inventory.adjust` defined at `permissions.ts` L43; granted in `role-permissions.ts` L57; UI hook `use-inventory.ts` L43. Stock movement create (including ADJUSTMENT) uses `PERMISSIONS.stockMovements.create` at `stock-movement-api.routes.ts` L70 — **`inventory.adjust` never enforced on API**.

---

### F-30-01 — Return intermediate transitions lack atomic claims

| Field | Value |
| --- | --- |
| **Severity** | P2 Medium |
| **Area** | Return |
| **File(s)** | `src/modules/return/application/services/receive-return.service.ts` (L58–61), `inspect-return.service.ts` (~L82), `src/modules/return/infrastructure/repositories/prisma-return.repository.ts` (L213–226) |
| **Observed behavior** | Receive and Inspect use `updateStatus` with unconditional `update` (no expected-status WHERE). |
| **Expected behavior** | Same once-only semantics as Complete (Phase 29 pattern) for DRAFT→RECEIVED and RECEIVED→INSPECTED. |
| **Business impact** | Concurrent receive/inspect on same return can duplicate audit entries; last writer wins on status timestamps. Lower severity than Complete (no inventory side effects on receive/inspect). |
| **Decision-lock status** | Provisional — extend Phase 29 pattern or defer |
| **Schema impact** | None |

---

### F-30-02 — No database CHECK constraints on aggregate counters

| Field | Value |
| --- | --- |
| **Severity** | P2 Medium |
| **Area** | Database / Prisma |
| **File(s)** | `prisma/schema.prisma` (no `@@check` entries repo-wide) |
| **Observed behavior** | Counter invariants (ERA item quantities, inventory non-negative) enforced only in application/SQL predicates. |
| **Expected behavior** | Defense-in-depth DB constraints where practical. |
| **Business impact** | Direct SQL / future code paths could bypass application guards. Phase 29 predicated SQL mitigates for ERA workflow paths. |
| **Decision-lock status** | Optional — evaluate per invariant |
| **Schema impact** | Optional migrations |

---

### F-30-03 — UpdateInventory allows absolute quantityOnHand bypass

| Field | Value |
| --- | --- |
| **Severity** | P2 Medium |
| **Area** | Inventory |
| **File(s)** | `src/modules/inventory/application/services/update-inventory.service.ts` (L44), `inventory.schemas.ts` (L32–33), `prisma-inventory.repository.ts` (L186–209) |
| **Observed behavior** | PATCH `/inventory/:id` can set `quantityOnHand` / `reservedQuantity` via absolute `repository.update`, bypassing stock-movement audit trail and Phase 29 decrement/increment primitives. |
| **Expected behavior** | Quantity changes should flow through stock movements except controlled admin correction workflow. |
| **Business impact** | Admin/API direct edit can create inventory drift vs movements; concurrent PATCH + OUT can race (absolute write). |
| **Decision-lock status** | Required if tightening — may be intentional admin escape hatch |
| **Schema impact** | None |

---

### F-30-05 — Cancel rental order dispatch guard uses pageSize 100 (F-05 family)

| Field | Value |
| --- | --- |
| **Severity** | P1 High (same rollup class as F-05) |
| **Area** | RentalOrder / Dispatch |
| **File(s)** | `src/modules/rental-order/application/services/cancel-rental-order.service.ts` (L88–97) |
| **Observed behavior** | RO cancel checks for active dispatches via `findPaged({ pageSize: 100 })`. Dispatches beyond page 1 may not block cancellation. |
| **Expected behavior** | Any non-cancelled dispatch on the order must prevent RO cancel (or be handled explicitly). |
| **Business impact** | RO cancelled while active dispatches still exist beyond the first 100 records. |
| **Decision-lock status** | Bundle with F-05 decision lock (shared unbounded dispatch query) |
| **Schema impact** | None |
| **Evidence** | `cancel-rental-order.service.ts` L90: `pageSize: 100` |

---

### F-30-06 — Return-sync dispatch rollup uses pageSize 100 (F-05 family)

| Field | Value |
| --- | --- |
| **Severity** | P1 High (same rollup class as F-05) |
| **Area** | RentalOrder / Return sync |
| **File(s)** | `src/modules/rental-order/application/services/sync-rental-order-status-from-returns.ts` (L27–36) |
| **Observed behavior** | RO completion sync filters `COMPLETED` dispatches from first page only (`pageSize: 100`). |
| **Expected behavior** | All completed dispatches must contribute to returned/dispatched quantity reconciliation. |
| **Business impact** | RO may never reach `COMPLETED` when return/dispatch history exceeds 100 records. |
| **Decision-lock status** | Bundle with F-05 decision lock |
| **Schema impact** | None |
| **Evidence** | `sync-rental-order-status-from-returns.ts` L29: `pageSize: 100` |

---

### F-30-07 — Maintenance / Repair apply stock before status claim

| Field | Value |
| --- | --- |
| **Severity** | P2 Medium |
| **Area** | Maintenance / Repair / Inventory |
| **File(s)** | `src/modules/maintenance/application/services/start-maintenance.service.ts` (~L92–112), `complete-maintenance.service.ts`, `complete-repair.service.ts` (~L90–120) |
| **Observed behavior** | Maintenance start/complete and repair complete apply IN/OUT stock movements before (or without) atomic status claims — same pre–Phase-29 side-effect ordering class as F-01/F-04. |
| **Expected behavior** | Claim expected status before inventory side effects; loser gets 409. |
| **Business impact** | Concurrent complete/start can duplicate IN/OUT movements and audit entries. |
| **Decision-lock status** | Provisional — extend Phase 29 pattern to maint/repair modules |
| **Schema impact** | None |
| **Evidence** | `start-maintenance.service.ts` L109: plain `updateStatus` after stock movement scope |

---

### F-30-08 — F-06: CONFIRMED orders excluded from date-aware commitment lines

| Field | Value |
| --- | --- |
| **Severity** | P1 High (amplifies F-06) |
| **Area** | RentalOrder / F-02 availability |
| **File(s)** | `src/modules/rental-order/domain/rental-order.availability.rules.ts` (L34–38), `reserve-rental-order.date-aware.test.ts` (~L520–540) |
| **Observed behavior** | `AVAILABILITY_COMMITMENT_STATUSES` excludes `CONFIRMED`. A second order can reserve against full on-hand while an overlapping CONFIRMED order exists (test "L: CONFIRMED overlapping ignored"). |
| **Expected behavior** | Business decision: either CONFIRMED commits capacity or confirm is non-binding until reserve — must be explicit in decision lock. |
| **Business impact** | Intentional or not, overlapping CONFIRMED orders do not reduce date-aware availability for peers until one reaches RESERVED. |
| **Decision-lock status** | **Required** as part of F-06 |
| **Schema impact** | Depends on F-06 strategy |
| **Evidence** | `AVAILABILITY_COMMITMENT_STATUSES` = RESERVED \| ON_RENT \| PARTIALLY_RETURNED only |

---

### F-30-04 — Analytics Metric Contract stale evidence row

| Field | Value |
| --- | --- |
| **Severity** | P3 Low |
| **Area** | Documentation / Reporting |
| **File(s)** | `docs/decisions/ANALYTICS_METRIC_CONTRACT_v1.0.md` (§2 L63–64), `complete-dispatch.service.ts` (L307–312) |
| **Observed behavior** | Contract states no ON_RENT writer on RentalOrder; Phase 29 added atomic ON_RENT persistence. |
| **Expected behavior** | Contract evidence table updated; frozen semantics (Active Rental = CONFIRMED + RESERVED) unchanged. |
| **Business impact** | Documentation drift only — reporting rules already exclude ON_RENT from "active rental" KPI. |
| **Decision-lock status** | Doc refresh only |
| **Schema impact** | None |

---

## 8. Finding Summary

| ID | Severity | Area | Business Risk | Implementation Needed |
| --- | --- | --- | --- | --- |
| F-05 | P1 | Dispatch create/update | Over-dispatch reserved qty; concurrent lost update | Yes — **recommended Phase 30** |
| F-30-05 | P1 | RO cancel dispatch guard | Cancel with active dispatches beyond page 1 | Yes — bundle with F-05 |
| F-30-06 | P1 | RO return-sync rollup | RO stuck not COMPLETED (>100 dispatches) | Yes — bundle with F-05 |
| F-06 / F-30-08 | P1 | RO date-aware reserve | Double-book overlapping periods; CONFIRMED ignored | Yes — decision lock first |
| F-09 | P2 | Repair FK | Orphan repair rows | Yes — migration + data audit |
| F-11 | P2 | Authorization | Over-privileged mutations | Yes — permission matrix |
| F-30-07 | P2 | Maintenance / Repair | Duplicate IN/OUT on concurrent complete | Optional — Phase 29 pattern extension |
| F-30-01 | P2 | Return receive/inspect | Duplicate transition/audit | Optional — Phase 29 pattern extension |
| F-30-02 | P2 | DB constraints | Bypass via non-app paths | Optional |
| F-30-03 | P2 | Inventory PATCH | Drift / absolute-write race | Decision required |
| F-07 | P3 | Enum cleanup | Developer confusion | Optional |
| F-30-04 | P3 | Analytics doc | Stale evidence | Doc update only |

---

## 9. Resolved Findings

| ID | Phase | Resolution evidence |
| --- | --- | --- |
| F-01 | 29 | `claimStatusTransition` in CompleteReturn + T29.1 |
| F-02 (counter/settlement) | 29 | `applyWorkflowDelta` / `applySettlement` + T29.3/T29.4 |
| F-03 | 29 | Inventory safe primitives + stock-movement wiring + T29.5 |
| F-04 | 29 | CompleteDispatch claim-before-effects + T29.2 |
| F-08 | 29 | ConfirmRentalOrder claim + T29.6 |
| Phase 28 source×condition | 28 | Regression 14/14 post-29 |

---

## 10. Deferred Findings

| ID | Status | Notes |
| --- | --- | --- |
| F-05 | **Still valid** | Unchanged by Phase 29; not indirectly fixed |
| F-06 | **Still valid** | Inventory reservation does not protect F-02 capacity |
| F-07 | **Still valid** | Cosmetic / enum hygiene |
| F-09 | **Still valid** | FK still absent |
| F-11 | **Still valid** | All listed permission gaps confirmed |
| F-02 (date-aware) | **Partially addressed** | N/A — F-06 is the date-aware gap; ERA F-02 availability read path unchanged and correct |

---

## 11. NOT GAPS

Verified correct (no finding):

- **Phase 29 terminal transitions:** CompleteReturn, CompleteDispatch, ConfirmRentalOrder, ERA workflow counters, settlement, inventory OUT/IN/ADJUSTMENT.
- **Phase 28 return semantics:** Mixed source×condition attribution, external GOOD isolation, `computeRestockQuantity` — 14 regression tests pass.
- **External rental ownership isolation:** External quantities do not enter `quantityOnHand`.
- **ERA cancellation / RO cascade:** Atomic claims; transactional rollback preserved.
- **Inventory RESERVE/RELEASE:** Pre-existing safe predicated updates unchanged.
- **Reserve status claim (single order):** `updateReserve` uses `updateMany` where `status = CONFIRMED` (`prisma-rental-order.repository.ts` L319–327).
- **RO cancel:** `cancelIfCancellable` uses expected-status `updateMany`.
- **Architecture boundaries:** Clean Architecture, DDD, Repository, UoW, DI, Prisma, Better Auth — no drift detected.
- **Analytics Active Rental semantics:** `isActiveRentalStatus` = CONFIRMED \| RESERVED only (`reporting.rules.ts` L251–257) — consistent with frozen contract.
- **No schema/migration changes in Phase 29.**

---

## 12. Decision-Lock Requirements

| Finding | Requires decision lock? | Key decisions |
| --- | --- | --- |
| **F-05** | **Yes** | Aggregate query vs new repo method; whether to add DB guard on dispatch item insert; concurrent test strategy |
| **F-06** | **Yes** | Serialization scope (product+warehouse+date range); schema vs app-only; interaction with existing F-02 formula (must not change) |
| F-09 | Yes | ON DELETE behavior; orphan data remediation |
| F-11 | Yes | Permission naming; role matrix updates; backward compatibility |
| F-30-01 | Optional | Extend Phase 29 claim pattern to receive/inspect or accept risk |
| F-30-03 | Yes | Remove quantity from PATCH vs require movement vs admin-only role |

---

## 13. Recommended Next Phase

### Phase 30 — Dispatch Claimed-Quantity Integrity (F-05)

**Findings addressed:** F-05 (primary)

**Why highest priority:**

1. **Deterministic defect** — `pageSize: 100` causes incorrect rollup without any concurrency required.
2. **Direct operational impact** — over-dispatch against reserved quantities affects physical fulfillment and inventory OUT.
3. **Architectural alignment** — same enterprise hardening lineage as Phase 29; fix uses existing repository/UoW patterns (aggregate query + optional predicated create guard).
4. **Clear scope** — no F-02 formula change, no schema required for minimal fix.

**Why other findings deferred:**

- **F-06** requires broader architecture decision on date-range serialization; higher design risk.
- **F-11** is security hygiene but not data-corruption class.
- **F-09** is independent schema migration; safe but unrelated to dispatch integrity.
- **F-30-01** lower business impact (no inventory side effects).

**Expected scope:**

- Replace paged dispatch fetch with complete rollup query (`findClaimedQuantitiesByRentalOrderId` or unbounded fetch by RO id) in **CreateDispatch**, **UpdateDispatch**, **CancelRentalOrder** dispatch guard, and **syncRentalOrderStatusFromReturns**.
- Mirror fix in `UpdateDispatchService`.
- Add concurrent create dispatch tests (two parallel creates exceeding reserved total → one succeeds, one fails).
- Add test for >100 existing dispatches rollup correctness.

**Explicit non-goals:**

- F-06 date-aware serialization
- F-07 enum removal
- F-09 Repair FK
- F-11 permission realignment
- Return receive/inspect claims
- Schema migrations (unless decision lock approves optional guard)

---

## 14. Proposed Acceptance Tests

### T30.1 — Full rollup (>100 dispatches)

Given rental order with 101 non-cancelled dispatches claiming quantities, when creating dispatch #102, then validation must include all 101 prior claims (not just first 100).

### T30.2 — Concurrent dispatch create (owned quantity)

Given RO item with `reservedQuantity = 10`, two concurrent `CreateDispatch` each requesting owned qty 6: exactly one succeeds; loser receives conflict/unprocessable; total claimed ≤ 10.

### T30.3 — Concurrent dispatch create (external quantity)

Given ERA allocated qty 10 with 0 prior dispatch claims, two concurrent creates each requesting external qty 6: exactly one succeeds; ERA dispatched counter incremented once (if applicable path).

### T30.4 — Update dispatch rollup

Given existing dispatches, `UpdateDispatchService` must use same complete rollup (not pageSize 100) when revalidating quantities.

### T30.5 — Regression

All Phase 29 concurrency tests (T29.1–T29.6) and Phase 28 return tests remain green.

---

## 15. Architecture Safety

The following must remain unchanged in any Phase 30 (F-05) implementation:

- Next.js / TypeScript / Prisma / PostgreSQL / Better Auth
- Clean Architecture / DDD / Repository Pattern / Unit of Work / DI
- REST + Zod validation
- Existing transaction runners (no new transaction layer)
- F-02 date-aware availability formula
- Phase 28 source×condition rules
- Phase 29 concurrency primitives (no weakening)
- No CQRS, event sourcing, distributed locks, idempotency-key tables, or version columns

---

## 16. Schema / Migration Impact

| Phase 30 (F-05) recommended scope | **None** |
| --- | --- |
| Optional future guard on dispatch items | Optional |
| F-09 (if pursued separately) | Required |
| F-06 (if pursued separately) | Optional to Required depending on strategy |

No migration created during this audit.

---

## 17. Git Safety

| Check | Result |
| --- | --- |
| Phase 29 committed | Yes — `d0ded6c` |
| Audit document only new file | Yes — this file |
| Production code modified during audit | No |
| Tests modified during audit | No |
| Schema modified | No |
| Migration created | No |
| Audit committed | No |
| Push performed | No |

---

## 18. Final Recommendation

**READY FOR DECISION LOCK**

Proceed with decision lock for **Phase 30 — Dispatch Claimed-Quantity Integrity (F-05)** before implementation. Do not implement F-06, F-09, or F-11 in the same phase.

---

*End of Phase 30 Enterprise Gap Audit*
