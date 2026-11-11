# Post-Phase-47 Enterprise Gap Audit

**Audit date:** 2026-09-01  
**Scope:** Committed production baseline at `9e0eaf1` only — ~148 WIP files excluded  
**Method:** Independent Phase 47 closure verification, cross-workflow concurrency review, prior-finding revalidation, targeted regression execution, full-suite spot-check

---

## Executive Verdict

**AUDIT COMPLETE — NEXT PHASE IDENTIFIED**

| Severity | Count |
|----------|------:|
| **P0** | **0** |
| **P1** | **0** |
| **P2** | **5** |
| **P3** | **5** |
| **DEFERRED** | **1** |

No P0 findings. Phase 47 closed the sole P1 (N-46-01). All five historical P2 gaps remain open and were revalidated at HEAD. The highest-priority remaining enterprise gap is **N-46-02 — Source-Externally F-02 Stale Read** (P2), recommended as **Phase 48**.

---

## Baseline

| Item | Value |
|------|-------|
| **HEAD** | `9e0eaf1a62b30137db939fd34e215b97823d369f` (`9e0eaf1`) |
| **Commit** | `fix(repair): prevent repair capacity over-commitment` |
| **Branch** | `main` |
| **WIP** | **148** modified/untracked entries (`git status --short \| Measure-Object -Line`) |
| **Staged changes** | **None** (`git diff --cached --stat` empty) |
| **Unstaged diff** | **97 files** (+1017/−281 lines) — accounting/UI/reports WIP, not production baseline |
| **Push** | **NO** |
| **Audit target** | `git show HEAD:` committed tree |

---

## Phase 47 Verification

### N-46-01 — **CLOSED**

**Verified:** Yes — independently confirmed at `9e0eaf1`.

**Implementation chain @ HEAD:**

| Step | Evidence |
|------|----------|
| Lock return inspection row | `CreateRepairService.execute` / `UpdateRepairService.execute` → `returnRepository.lockForRepairCapacity(returnId)` |
| Prisma lock | `PrismaReturnRepository.lockForRepairCapacity` — `SELECT id FROM "return_inspections" WHERE id = … FOR UPDATE` |
| Domain ID alignment | Return aggregate id **is** `ReturnInspectionId` (`IReturnRepository.findById`); repair `returnId` maps to `returnInspectionId` in Prisma |
| Authoritative reread | `findById(returnId)` after lock |
| Prior repair aggregation | `loadPriorRepairsForReturn` → `buildPriorRepairedMap` excludes `CANCELLED` and `excludeRepairId` on update |
| Capacity validation | `validateRepairAgainstReturnItem` — `priorRepaired + quantity ≤ returnItem.damagedQuantity` (DB: `brokenQuantity`) |
| Mutation in same UoW | `repairRepository.create` / `update` within `transactionRunner.run` while lock held |
| Test parity | `repair-capacity-lock.ts` + `runWithRepairCapacityLockScope` in repair transaction test runner |
| Concurrency tests | `repair.capacity-concurrency.47.application.test.ts` — T47.1–T47.6 + cancelled exclusion + update self-exclusion |

**Invariant enforced:**

```text
SUM(non-CANCELLED repair.quantity for returnItemId) + requestedQuantity
≤ ReturnInspectionItem.damagedQuantity (brokenQuantity)
```

**Race classes closed:**

| Race | Status |
|------|--------|
| create/create | **Closed** — serialized on return_inspections row |
| create/update | **Closed** — same lock boundary |
| update/update | **Closed** — same lock boundary |
| cancelled repairs excluded | **Verified** — T47 cancelled test |
| update self-exclusion | **Verified** — `excludeRepairId` in validation |
| lock held through mutation | **Verified** — lock → reread → aggregate → validate → write in one txn |
| CompleteRepair unchanged | **Verified** — Phase 33 claim-before-IN intact |

**Serialization boundary:** `return_inspections` row (`ReturnInspectionId`) — correct 1:1 parent for all repairs on a return.

---

## Finding Summary

| Severity | Count |
|----------|------:|
| P0 | 0 |
| P1 | 0 |
| P2 | 5 |
| P3 | 5 |
| DEFERRED | 1 |

---

## Previous Open Findings — Revalidation

| Finding | Status | Severity | Evidence @ `9e0eaf1` |
|---------|--------|----------|----------------------|
| **F-33-03** | **OPEN** | P2 | `POST /api/stock-movements` → `PERMISSIONS.stockMovements.create` (WORKER+); `create-stock-movement-in-scope.ts` accepts all 5 types with optional refs; no dispatch/return/RO/F-02 workflow guards |
| **F-37-R1** | **OPEN** | P2 | `applyPaymentToInvoice` → atomic `applyPaymentDelta` then unconditional `updateStatus`; money SQL predicates block VOID mutation; lifecycle `status` can drift under void∥post |
| **N-44-05** | **OPEN** | P2 | `assertCanVoid` allows `PARTIALLY_PAID`; `withVoided()` preserves `paidAmount`; `VoidRentalInvoiceService` does not lookup/reverse live payments |
| **F-33-01** | **OPEN** | P2 | `generateNextInvoiceNumber` — `pageSize: 500` scan; `@unique` on `invoiceNumber` prevents dup commit |
| **N-46-02** | **OPEN** | P2 | `SourceRentalOrderExternallyService` computes F-02 shortfall outside txn without inventory/RO locks; delegates to `CreateExternalRentalService` without authoritative reread |

---

## Revalidated Closed Findings

### N-46-01 — Repair Capacity Concurrency

**Status:** CLOSED (Phase 47)  
**Evidence:** See Phase 47 Verification above; 9/9 Phase 47 tests pass.

### N-44-06 — Supplier Pending Payment Over-Commitment

**Status:** CLOSED (Phase 46, remains closed)  
**Evidence:** `CreateSupplierPaymentService` → `lockForSupplierPaymentCommitment` → `sumPendingAmountByPurchaseOrderId` → validate → create; T46.1–T46.5 pass @ HEAD.

### F-04 — CompleteDispatch Status/Effect Ordering

**Status:** CLOSED (Phase 29, remains closed)  
**Evidence:** `CompleteDispatchService` — `claimStatusTransition(READY → DISPATCHED)` **before** inventory OUT, external counters, RO transition, audit, notifications.

### F-05 — Concurrent Dispatch Claim Aggregation

**Status:** CLOSED (Phase 29+, remains closed)  
**Evidence:** `UpdateDispatchService` — `lockForDispatchClaim` → `sumClaimedSourceQuantitiesByRentalOrderId` → validate before persist.

### Phase 28–45 Prior Closed Findings

**Status:** CLOSED — no regression observed in targeted review (return capacity Phase 45, customer payment Phase 39, supplier settlement Phase 44, repair complete Phase 33).

---

## Reopened Findings

None. No supposedly closed finding was found reopened at `9e0eaf1`.

---

# Finding Register

## N-46-02 — Source-Externally F-02 Stale Read

**Severity:** P2  
**Status:** OPEN  
**Module:** Rental Order / External Rental

### Root Cause

`SourceRentalOrderExternallyService` reads inventory and F-02 commitment lines, computes shortfall, validates quantity, then calls `CreateExternalRentalService` — all **outside** a serialized transaction with inventory/RO row locks. No authoritative reread at ERA create time.

### Concrete Scenario

**Initial state:** RO item requires qty 20; F-02 date-aware available = 5; shortfall = 15.

**Request A:** `source-externally` reads shortfall 15, begins ERA create qty 15.  
**Request B:** Concurrent `reserve` on same product/warehouse/period commits, reducing available to 0; true shortfall now 20.

**Interleaving:** A validated against stale shortfall 15; B reserves owned capacity. A creates ERA qty 15 while true owned gap may be smaller or zero.

**Result:** External hire quantity exceeds true F-02 shortfall — operational over-commit. Partial unique index on active ERA per RO prevents duplicate active agreement rows but **does not** cap quantity against fresh availability.

### Violated Invariant

F-02 date-aware external sourcing shortfall: external quantity must not exceed remaining owned-inventory shortfall at commit time.

### Existing Protection

- `findActiveByRentalOrderId` blocks second active ERA per RO (ConflictError).
- Reserve path uses `lockForAvailabilityCommit` + `lockForReserveCommand` (sound).
- CreateExternalRentalService enforces ERA domain rules but not fresh F-02 reread.

### Why It Is Insufficient

Shortfall computed from stale snapshot; no lock serializes source-externally against reserve/dispatch/commitment mutators on the same product×warehouse×period.

### Recommended Direction

Mirror reserve pattern: acquire sorted inventory locks + RO lock, authoritative F-02 reread, validate shortfall, create ERA in same UoW.

### Decision Lock

NOT REQUIRED — technical serialization parity with Phases 45–47.

### Schema/Migration

NOT EXPECTED

---

## F-33-03 — Direct Stock Movement API Workflow Bypass

**Severity:** P2  
**Status:** OPEN  
**Module:** Stock Movement / Inventory / Authorization

### Root Cause

Authenticated WORKER+ can `POST /api/stock-movements` for any of `IN | OUT | RESERVE | RELEASE | ADJUSTMENT` via `create-stock-movement-in-scope.ts` without mandatory business-context validation (dispatch, return, rental order, F-02).

### Concrete Scenario

WORKER POSTs `RESERVE` qty 100 on inventory with no rental-order reference while concurrent legitimate reserve holds F-02 capacity — row-level atomic SQL passes but date-aware F-02 capacity and workflow ledger semantics are bypassed.

WORKER POSTs `ADJUSTMENT` to correct on-hand, bypassing Phase 43 UI `inventory.adjust` gate and intended adjustment workflow.

### Violated Invariant

Business workflow integrity — stock movements should originate from authorized domain workflows, not arbitrary API calls.

### Existing Protection

Atomic SQL in `prisma-inventory.repository.ts` (`decrementOnHand`, `reserveAvailableQuantity`, `applyAdjustment` with `quantityOnHand + delta >= reservedQuantity`) — **technical concurrency sound**; prevents negative on-hand/reserve violations.

### Why It Is Insufficient

No workflow guards at API/service layer; Phase 43 increased ADJUSTMENT reliance on this path.

### Recommended Direction

Owner decision on movement-type allowlist, mandatory validated references, ADJUSTMENT RBAC split; optionally internal-only scope for workflow callers.

### Decision Lock

REQUIRED

### Schema/Migration

NOT EXPECTED (policy/RBAC change)

---

## F-37-R1 — Derived Rental Invoice Status TOCTOU

**Severity:** P2  
**Status:** OPEN  
**Module:** Rental Invoice / Customer Payment

### Root Cause

After atomic `applyPaymentDelta`, derived lifecycle status written via unconditional `updateStatus` without expected-status predicate.

### Concrete Scenario

Invoice `ISSUED`, payment post in flight.  
**Request A:** `VoidRentalInvoiceService` claims `VOID`.  
**Request B:** `PostPaymentService` claims payment `PENDING→POSTED`, `applyPaymentDelta` succeeds (invoice still non-VOID at SQL predicate moment), then `updateStatus` sets `PARTIALLY_PAID`.

**Result:** Persisted `status`/`voidedAt`/`paidAmount` can disagree — e.g. VOID with non-zero paidAmount or PARTIALLY_PAID after void claim depending on interleaving.

### Violated Invariant

Derived invoice lifecycle status should reflect authoritative payment state.

### Existing Protection

`applyPaymentDelta` SQL status predicates prevent money mutation on VOID/DRAFT invoices; Phase 38 money consistency tests; no over-payment path.

### Why It Is Insufficient

Reporting/UI/filters reading persisted `status` can show inconsistent lifecycle labels; status is cached not atomically derived with payment delta.

### Recommended Direction

Status claim on derived update (expected-status predicate) or compute status only in read model.

### Decision Lock

NOT REQUIRED

### Schema/Migration

NOT EXPECTED

---

## N-44-05 — Void Partially Paid Invoice With Live Payments

**Severity:** P2  
**Status:** OPEN  
**Module:** Rental Invoice / Customer Payment

### Root Cause

Explicit policy gap — `assertCanVoid` allows `PARTIALLY_PAID`; `withVoided()` sets `status: VOID` preserving `paidAmount`; no payment lookup/reversal in `VoidRentalInvoiceService`.

### Concrete Scenario

Invoice `PARTIALLY_PAID`, `paidAmount = 500`, balance = 500. One POSTED payment for 500 exists. Operator voids invoice.

**Result:** Invoice `status = VOID`, `paidAmount = 500` preserved; POSTED payment still references voided invoice. Financial/reporting inconsistency — not a concurrent lost-update defect.

### Violated Invariant

Business expectation that voided invoices should not carry live settlement semantics with non-zero paid balance (policy undefined in code).

### Existing Protection

`assertCanVoid` blocks fully `PAID`; payment settlement paths remain sound; new payments blocked on VOID via `applyPaymentDelta` predicates.

### Why It Is Insufficient

Owner policy on whether void requires zero payments, auto-reverse, or zero derived fields is not enforced.

### Recommended Direction

Decision lock → enforce "no void with posted payments" OR cascade reverse OR zero derived fields with documented semantics.

### Decision Lock

REQUIRED

### Schema/Migration

NOT EXPECTED (policy enforcement)

---

## F-33-01 — Invoice Number Allocation Scan Cap

**Severity:** P2  
**Status:** OPEN  
**Module:** Rental Invoice

### Root Cause

`generateNextInvoiceNumber` derives sequence from max of first 500 descending invoice numbers for year prefix (`pageSize: 500`).

### Concrete Scenario

Tenant has >500 invoices for `INV-2026-*` prefix. Scan misses sequence `INV-2026-501`. Generator proposes reused number. `@unique` rejects commit — operation fails safely, no silent duplicate.

### Violated Invariant

Reliable monotonic invoice number allocation at scale.

### Existing Protection

Database `@unique` on `invoiceNumber`.

### Why It Is Insufficient

Generation fails or retry-loops under high volume; not silent corruption.

### Recommended Direction

Dedicated number-sequence table or monotonic SQL sequence (no scan cap).

### Decision Lock

NOT REQUIRED

### Schema/Migration

UNCERTAIN — sequence table may be preferred

---

## F-37-R2 — Invoice Number Pre-Lock Generation

**Severity:** P3  
**Status:** OPEN  
**Module:** Rental Invoice

### Root Cause

`generate-rental-invoice-from-order.service.ts` generates number before invoice row persistence/lock.

### Concrete Scenario

Concurrent generates produce sequence gaps when one txn rolls back.

### Violated Invariant

None material — gap numbers only.

### Existing Protection

`@unique` prevents corruption.

### Why It Is Insufficient

Cosmetic sequence gaps.

### Recommended Direction

Generate inside invoice UoW after lock (optional hardening).

### Decision Lock

NOT REQUIRED

### Schema/Migration

NOT EXPECTED

---

## F-11 — Broad WORKER Mutation Permissions

**Severity:** P3  
**Status:** OPEN  
**Module:** Authorization

### Root Cause

WORKER authorized for `stockMovements.create`, `inventory.update`, and broad workflow mutate permissions in `role-permissions.ts`.

### Concrete Scenario

Low-privilege operator can invoke F-33-03 bypass paths directly.

### Violated Invariant

Defense-in-depth authorization boundary.

### Existing Protection

Role checks on routes; domain invariants on workflow services.

### Why It Is Insufficient

Amplifies F-33-03.

### Recommended Direction

Tie to F-33-03 policy decision.

### Decision Lock

PARTIAL — ties to F-33-03

### Schema/Migration

NOT EXPECTED

---

## F-09 — Repair returnInspectionItemId No FK

**Severity:** P3  
**Status:** OPEN  
**Module:** Repair / Schema

### Root Cause

`Repair.returnInspectionItemId` indexed UUID without Prisma `@relation` FK to `ReturnInspectionItem`.

### Concrete Scenario

Orphan repair reference if inspection item deleted outside app rules (unlikely under `onDelete: Restrict` chain).

### Violated Invariant

Referential integrity hygiene.

### Existing Protection

App validates on create; parent rows restricted.

### Why It Is Insufficient

Schema-level FK missing.

### Recommended Direction

Add FK relation when migration window available.

### Decision Lock

NOT REQUIRED

### Schema/Migration

EXPECTED (optional hygiene)

---

## F-07 — Ghost RentalOrderStatus.DISPATCHED

**Severity:** P3  
**Status:** OPEN  
**Module:** Rental Order / Dispatch

### Root Cause

Enum value exists for ephemeral dispatch-complete transition; persisted RO status becomes `ON_RENT`, not `DISPATCHED`.

### Concrete Scenario

UI/mappers/tests reference `DISPATCHED`; DB rows never hold it after complete — confusion only.

### Violated Invariant

Schema/domain alignment.

### Existing Protection

Dispatch complete writes `ON_RENT`.

### Why It Is Insufficient

Drift between enum and persisted semantics.

### Recommended Direction

Enum cleanup migration or document ephemeral-only usage.

### Decision Lock

NOT REQUIRED

### Schema/Migration

EXPECTED (cleanup)

---

## N-39-UI-01 — Active Invoice UI Hint Page Cap

**Severity:** P3  
**Status:** OPEN  
**Module:** Rental Invoice UI

### Root Cause

`rental-order-billing-section.tsx` — `pageSize: 10`, `activeInvoice = invoices.find(status !== VOID)` on first page only.

### Concrete Scenario

Active non-VOID invoice beyond page 1 → UI shows Generate button incorrectly.

### Violated Invariant

None on backend — usability only.

### Existing Protection

Phase 37 active-invoice guard prevents duplicate active invoice creation.

### Why It Is Insufficient

UI misleading only.

### Recommended Direction

Server-side active-invoice flag or paginated scan.

### Decision Lock

NOT REQUIRED

### Schema/Migration

NOT EXPECTED

---

## F-35-08 — Expense Journal Hook Ordering

**Severity:** DEFERRED  
**Status:** DEFERRED  
**Module:** Expense / Accounting

### Root Cause

`create-expense-transaction.runner.ts` @ HEAD uses `NoOpExpenseAccountingHook`; real hook exists in WIP only.

### Concrete Scenario

When real hook activated, latent journal-before-status ordering risk may surface.

### Violated Invariant

None at committed HEAD.

### Existing Protection

NoOp hook — no journal side effects in production baseline.

### Why It Is Insufficient

N/A until hook activated.

### Recommended Direction

Re-audit when WIP expense accounting hook is merged.

### Decision Lock

N/A until hook activated

### Schema/Migration

NOT EXPECTED

---

## Concurrency Hotspot Matrix

| Area | Mutation | Invariant | Protection | Result |
|------|----------|-----------|------------|--------|
| Inventory | IN/OUT/ADJUST/RESERVE/RELEASE | `quantityOnHand ≥ 0`, `reserved ≤ onHand` | Atomic SQL predicates in `prisma-inventory.repository.ts` | **Sound** (direct API policy gap F-33-03) |
| Reservation | reserve/cancel RO | F-02 date-aware capacity | `lockForAvailabilityCommit` + `lockForReserveCommand` | **Sound** |
| Dispatch | create/update/complete/cancel | Claim qty ≤ RO capacity; status once-only | `lockForDispatchClaim` + sum aggregation; `claimStatusTransition` before effects | **Sound** |
| Return | create/update/complete | Return qty ≤ dispatch; status once-only | `lockForReturnCapacity`; `claimStatusTransition` before effects (F-01) | **Sound** |
| Repair | create/update/complete | Repair qty ≤ damaged qty; status once-only | `lockForRepairCapacity` + aggregate (Phase 47); `claimStatusTransition` before IN (Phase 33) | **Sound** |
| Customer Payment | create/post/void | Pending ≤ balance; settlement atomic | `lockForPaymentCommitment` + pending sum (Phase 39); claim + `applyPaymentDelta` (Phase 35) | **Sound** (status drift F-37-R1) |
| Supplier Payment | create/post/void | Pending ≤ PO balance; settlement atomic | `lockForSupplierPaymentCommitment` + pending sum (Phase 46); claim + delta (Phase 44) | **Sound** |
| Invoice | issue/void/generate | Active invoice uniqueness; void policy | `claimStatusTransition`; Phase 37 active guard | **Weak** (N-44-05 policy; F-37-R1 status) |
| External Rental | source-externally / workflow | F-02 shortfall; active ERA uniqueness | Partial unique index; no F-02 lock on source path | **Stale read (N-46-02)** |

---

## Status/Side-Effect Matrix

| Workflow | Atomic claim | Side effects after claim | Same transaction | Risk |
|----------|:------------:|:------------------------:|:----------------:|:----:|
| Return completion | Yes (`INSPECTED→COMPLETED`) | Yes — RELEASE/IN, external counters, RO sync | Yes | **Low** |
| Dispatch completion | Yes (`READY→DISPATCHED`) | Yes — OUT, external counters, RO transition | Yes | **Low** |
| Repair completion | Yes (`IN_PROGRESS→COMPLETED`) | Yes — inventory IN | Yes | **Low** |
| Customer payment post | Yes (`PENDING→POSTED`) | Yes — `applyPaymentDelta`, journal | Yes | **Low** (status F-37-R1) |
| Customer payment void | Yes (`POSTED→VOID`) | Yes — reverse delta, journal | Yes | **Low** |
| Supplier payment post | Yes (`PENDING→POSTED`) | Yes — PO delta | Yes | **Low** |
| Supplier payment void | Yes (`POSTED→VOID`) | Yes — reverse PO delta | Yes | **Low** |
| External rental workflow | Partial (per-service claims) | Varies by transition | Mostly yes | **Medium** (source-externally pre-txn) |

---

## Inventory Integrity Matrix

| Operation | quantityOnHand | reservedQuantity | Stock movement | Concurrency safe |
|-----------|:--------------:|:----------------:|:--------------:|:----------------:|
| IN | Atomic increment | — | Created in txn | **Yes** |
| OUT | Atomic decrement (≥0) | — | Created in txn | **Yes** |
| ADJUSTMENT | Atomic delta (≥ reserved) | — | Created in txn | **Yes** |
| RESERVE | — | Atomic increment (≤ available) | Created in txn | **Yes** |
| RELEASE | — | Atomic decrement (≤ reserved) | Created in txn | **Yes** |
| Dispatch complete | OUT via movement | — | Workflow + claim | **Yes** |
| Return complete | IN/RELEASE via movement | — | Workflow + claim | **Yes** |
| Repair complete | IN via movement | — | Workflow + claim | **Yes** |
| Direct API POST | All types | All types | Optional refs | **Atomic yes / policy no (F-33-03)** |

---

## Repository Lock Catalog @ HEAD

| Lock method | Row | Used by | Held through mutation |
|-------------|-----|---------|----------------------|
| `lockForPaymentCommitment` | `rental_invoices` | Create/update customer payment | Yes |
| `lockForSupplierPaymentCommitment` | `purchase_orders` | Create supplier payment | Yes |
| `lockForReturnCapacity` | `dispatches` | Create/update return | Yes |
| `lockForRepairCapacity` | `return_inspections` | Create/update repair (Phase 47) | Yes |
| `lockForDispatchClaim` | `rental_orders` | Create/update dispatch | Yes |
| `lockForReserveCommand` | `rental_orders` | Reserve/cancel RO | Yes |
| `lockForInvoiceCommand` | `rental_orders` | Create rental invoice | Yes |
| `lockForAvailabilityCommit` | `inventory` | Reserve/cancel RO | Yes |

**Gap:** No lock serializes `source-rental-order-externally` against reserve/dispatch/commitment mutators.

---

## Regression Verification

### Targeted Phase Suites (executed this audit)

| Suite | Result |
|-------|--------|
| Phase 33 repair concurrency | **PASS** |
| Phase 39 customer pending | **PASS** |
| Phase 44 supplier settlement | **PASS** |
| Phase 45 return capacity | **PASS** |
| Phase 46 supplier pending | **PASS** |
| Phase 47 repair capacity | **PASS** |
| **Combined** | **43/43 PASS** |

### Full Vitest Suite (executed this audit)

| Metric | Result |
|--------|--------|
| Tests passed | **2415** |
| Test files failed | **54** (env import — `DATABASE_URL` / `BETTER_AUTH_SECRET` via `database.config.ts`) |
| Test files passed | **160** |
| Production regression from Phase 47 | **None observed** in passing suites |

### Static Verification

| Check | Result |
|-------|--------|
| `npx prisma validate` | **PASS** |

---

## Analytics Contract & Decision Locks

| Lock | Status @ HEAD |
|------|---------------|
| Analytics Metric Contract v1.0 (BD-1–BD-9) | **Conforms** — no workflow change invalidates frozen metrics |
| External Rental Sourcing 25.5.1 | **Conforms** — N-46-02 is concurrency hardening, not rule change |
| External Rental Cancellation 25.5.9 | **Conforms** |
| RO ↔ ERA Cancellation Cascade 25.11 | **Conforms** |
| Mixed Return Source × Condition 28 | **Conforms** — Phase 28 tests present; return chain intact |
| Payment Invoice Settlement Concurrency 35 | **Conforms** — customer post/void sound |

---

## Next Phase

### Recommended next phase

**Phase 48 — Source-Externally F-02 Serialization**

| Item | Value |
|------|-------|
| **Primary finding** | N-46-02 |
| **Severity** | P2 |
| **Decision lock** | NOT REQUIRED |
| **Schema** | NONE |

### Why N-46-02 over other P2s

Phase ordering criteria applied:

1. **Data-integrity risk** — N-46-02 can violate F-02 shortfall at commit (sourcing over-commit).
2. **Financial correctness** — N-44-05 is policy ambiguity requiring decision lock first.
3. **Inventory correctness** — N-46-02 directly affects owned vs external sourcing balance.
4. **Concurrency exploitability** — Legitimate parallel operators (reserve + source-externally) produce stale-read TOCTOU.
5. **Workflow corruption** — ERA quantity can exceed true gap; partial unique index does not cap quantity.
6. **Breadth** — Single orchestration service; contained fix surface.
7. **Ease of containment** — Proven pattern from Phases 45–47 (lock → reread → validate → mutate).

F-33-03 has broader blast radius but **requires decision lock** before implementation. N-44-05 requires **policy decision lock**. F-37-R1 and F-33-01 are lower immediate integrity risk (money safe / unique constraint safe).

### Implementation guidance (audit only — not implemented)

| Item | Direction |
|------|-----------|
| **Finding** | N-46-02 |
| **Why it matters** | External hire can exceed true F-02 shortfall under concurrency |
| **Affected workflow** | `SourceRentalOrderExternallyService` → `CreateExternalRentalService` |
| **Likely serialization boundary** | `rental_orders` row + product×warehouse inventory lock(s) |
| **Likely transaction boundary** | Single UoW: lock → F-02 reread → shortfall validate → ERA create |
| **Expected schema impact** | NONE |
| **Decision-lock status** | NOT REQUIRED |
| **Expected test strategy** | T48.x concurrent reserve∥source-externally; shortfall edge cases; active ERA conflict unchanged |

---

## Final Audit Checklist

- [x] Baseline verified (`9e0eaf1`, main, ~148 WIP, no push)
- [x] WIP preserved (no reset/stash/clean)
- [x] Phase 47 independently verified
- [x] N-46-01 closure verified
- [x] Previous P2 findings revalidated (all five still OPEN)
- [x] Inventory audited
- [x] Stock movement audited (F-33-03)
- [x] Dispatch audited (F-04/F-05 closed)
- [x] Return audited (Phase 45 closed)
- [x] Repair audited (Phase 47 closed)
- [x] Rental order audited (reserve sound; N-46-02 open)
- [x] External rental audited
- [x] Customer payment audited
- [x] Supplier payment audited (N-44-06 closed)
- [x] Invoice audited (F-37-R1, N-44-05, F-33-01)
- [x] Accounting audited (NoOp expense hook deferred)
- [x] Authorization audited (F-11 P3)
- [x] API bypasses audited
- [x] Status races audited (matrices populated)
- [x] Transaction boundaries audited
- [x] Repository locks cataloged
- [x] Capacity races audited (repair closed; external open)
- [x] Create/update asymmetry audited (repair symmetric post-47)
- [x] Cancellation/release audited
- [x] Idempotency audited (claim patterns on terminal workflows)
- [x] Analytics contract checked
- [x] Decision locks checked
- [x] Focused regressions checked (43/43)
- [x] Full-suite status checked (2415 pass / 54 env-fail files)
- [x] No production changes
- [x] No commit
- [x] No push

---

**Auditor note:** This report is the only file created/modified during this audit. All ~148 WIP files remain untouched.
