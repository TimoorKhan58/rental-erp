# Phase 47 — Implementation Readiness Assessment

**Assessment date:** 2026-09-01  
**Finding:** N-46-01 — Repair Capacity Concurrency (P1)  
**Scope:** Committed production code at `893a811` only — WIP excluded

---

## Executive Verdict

**READY FOR IMPLEMENTATION**

---

## Baseline

| Item | Value |
|------|-------|
| **HEAD** | `893a8117e3e343a1930619368f465a099c70fcec` (`893a811`) |
| **Commit** | `fix(payment): prevent supplier pending payment over-commitment` |
| **Branch** | `main` |
| **WIP** | **147** modified/untracked entries |
| **Push** | **NO** |
| **Staged** | **None** |

---

## Finding

**N-46-01 — Repair Capacity Concurrency (P1)**

### Confirmed root cause

Repair **create** and **update (quantity)** validate committed repair quantity against `returnItem.damagedQuantity` using a non-atomic read→aggregate→validate→write sequence. There is **no row lock** on the authoritative return aggregate before loading prior repairs.

Two concurrent creates (or updates) on the same return item can each observe the same `priorRepaired` sum, both pass validation, and persist quantities whose **total exceeds** `damagedQuantity`.

**Downstream impact:** `CompleteRepairService` does **not** re-validate capacity. It claims `IN_PROGRESS → COMPLETED` (Phase 33) then posts an **IN** stock movement for `existing.quantity`. Over-committed repair rows therefore produce **phantom `quantityOnHand` inflation** when completed.

**Confirmed:** **YES** — repository evidence supports the Post-Phase-46 audit finding.

---

## Repair Lifecycle

| Operation | Service | Affects capacity? | Concurrency protection |
|-----------|---------|-------------------|------------------------|
| **Create** | `CreateRepairService` | **YES** — sets `quantity` after capacity validation | **NONE** (TOCTOU) |
| **Update** | `UpdateRepairService` | **YES** — when `quantity` changes (PENDING only) | **NONE** (TOCTOU) |
| **Start** | `StartRepairService` | No quantity change | Phase 33 `claimStatusTransition(PENDING → IN_PROGRESS)` |
| **Complete** | `CompleteRepairService` | Uses stored `quantity` for IN movement | Phase 33 claim before stock effect; **no capacity re-check** |
| **Cancel** | `CancelRepairService` | Frees capacity (CANCELLED excluded from prior sum) | Phase 33 claim; no lock needed for over-commit |

**Prerequisite:** Return must be `COMPLETED` (`assertReturnEligibleForRepair` in `repair.rules.ts`).

**Status flow:** `PENDING → IN_PROGRESS → COMPLETED` (or `CANCELLED` from PENDING/IN_PROGRESS).

---

## Authoritative Capacity

**Protected resource:** Remaining repairable damaged quantity per **return inspection item** (`returnItemId` / `returnInspectionItemId`).

**Authoritative source fields:**
- `returnItem.damagedQuantity` — domain field mapped from DB `ReturnInspectionItem.brokenQuantity` (`return.persistence.mapper.ts`)
- Fixed once return is `COMPLETED`; not mutated during repair workflow

**Prior commitment aggregate:**
- All repairs for the same `returnInspectionId` via `repairRepository.findByReturnId`
- Summed per `returnItemId` in `buildPriorRepairedMap` (`repair-return.validation.ts`)
- **Included:** `PENDING`, `IN_PROGRESS`, `COMPLETED` repairs
- **Excluded:** `CANCELLED` repairs; self on update via `excludeRepairId`

---

## Financial / Inventory Invariant

From `validateRepairQuantityAgainstReturn` (`repair.rules.ts`):

```text
priorRepaired + requestedQuantity ≤ returnItem.damagedQuantity
```

Equivalently:

```text
SUM(repair.quantity WHERE returnItemId = X AND status ≠ CANCELLED)
  + requestedQuantity
≤
returnItem.damagedQuantity
```

This is **not** “completed repair quantity ≤ allocated quantity.” It is **total non-cancelled repair commitment** against **inspected damaged quantity** on the return line.

**Inventory invariant (downstream):** On complete, IN movement adds `repair.quantity` to `quantityOnHand`. Over-commitment at create/update breaks the business rule that restored stock cannot exceed damaged units sent for repair.

---

## Concurrency Scenario

```text
Return item damagedQuantity = 10
No existing repairs (priorRepaired = 0)

Concurrent CreateRepair A: quantity = 6
Concurrent CreateRepair B: quantity = 6

Both read priorRepairs → priorRepaired = 0
Both validate: 6 ≤ 10 − 0  → pass
Both create PENDING repairs

Final committed sum = 12 > 10  (invalid)

If both are started and completed:
  Two IN movements × 6 = 12 units restored
  Business cap was 10 damaged units
```

**Update variant:** Two concurrent updates on different PENDING repairs (or create + update) produce the same stale `priorRepaired` read.

**Complete path alone:** Phase 33 T33.3 proves duplicate concurrent **complete** of the **same** repair is idempotent (one IN movement). N-46-01 is a **capacity** race at create/update, not duplicate completion.

---

## Correct Serialization Boundary

| Item | Value |
|------|-------|
| **Lock target** | **`ReturnInspection` row** (`returnInspectionId` / domain `returnId`) |
| **Repository method (proposed)** | `IReturnRepository.lockForRepairCapacity(returnInspectionId)` |
| **Prisma implementation** | `SELECT id FROM return_inspections WHERE id = … FOR UPDATE` |

**Why this row:**

1. **Aggregation scope** — `loadPriorRepairsForReturn` queries by `returnInspectionId`; capacity validation uses return record + all repairs on that return.
2. **Authoritative reread** — `returnRepository.findById` reloads items including `damagedQuantity` after lock.
3. **Domain ownership** — Return inspection owns damaged quantity attribution; repairs are child commitments against return items.
4. **Established pattern** — Phase 45 locks the parent row whose children are aggregated (`dispatch` for returns); Phase 46 locks `purchase_orders` for supplier pending sums on that PO.
5. **Schema** — `Repair.returnInspectionId` FK → `ReturnInspection`; row exists and is lockable without migration.

**Finer alternative (optional, not required):** Lock `return_inspection_items` row by `returnInspectionItemId` to allow parallel repairs on different items of the same return. Return-row lock is coarser but correct and simpler.

**Do not lock:** Inventory row — atomic SQL protects counters but does not enforce repair-capacity business rule. Repair row — wrong aggregate scope (one repair per row).

---

## Transaction Boundary

Intended critical section for **create** and **update (quantity)**:

```text
BEGIN (repair transactionRunner.run / UoW)
  lockForRepairCapacity(returnInspectionId)
  authoritativeReturn = returnRepository.findById(returnInspectionId)
  priorRepairs = repairRepository.findByReturnId(returnInspectionId)
  validateRepairAgainstReturnItem(..., priorRepairs [, excludeRepairId])
  repairRepository.create / update
  audit
COMMIT
```

**Complete repair** — no change required for N-46-01 if create/update are hardened (quantity frozen after PENDING validation; updates only in PENDING).

**Lock must cover entire** read → aggregate → validate → write sequence. Do not release before `create`/`update`.

---

## Phase 45 Comparison

| Aspect | Phase 45 (Return capacity) | Phase 47 (Repair capacity) |
|--------|---------------------------|---------------------------|
| Finding | N-44-01 | N-46-01 |
| Lock repo | `IDispatchRepository.lockForReturnCapacity` | `IReturnRepository.lockForRepairCapacity` (proposed) |
| Lock row | `dispatches` | `return_inspections` |
| Aggregate | Prior returns per dispatch line | Prior repairs per return item |
| Validation | `validateReturnItemsForDispatch` | `validateRepairAgainstReturnItem` |
| In-memory lock | `dispatch/infrastructure/return-capacity-lock.ts` | New `repair-capacity-lock.ts` (mirror) |
| Test runner | `runWithReturnCapacityLockScope` on return txn runner | `runWithRepairCapacityLockScope` on repair txn runner |

**Similarity:** Parent-row `FOR UPDATE`, authoritative reread, aggregate, validate, mutate in one UoW.

**Difference:** Return capacity is per dispatch **line** across multiple returns; repair capacity is per return **item** within one return (return-row lock slightly coarser than necessary).

---

## Phase 46 Comparison

| Aspect | Phase 46 (Supplier pending) | Phase 47 (Repair capacity) |
|--------|----------------------------|---------------------------|
| Lock | `lockForSupplierPaymentCommitment` on PO | `lockForRepairCapacity` on return inspection |
| Sum method | `sumPendingAmountByPurchaseOrderId` | Existing `findByReturnId` + `buildPriorRepairedMap` (optional dedicated sum helper) |
| Validation | `availableBalance = balance − pending` | `remaining = damagedQuantity − priorRepaired` |
| Mutations | create only | create + update quantity |

Same architecture: **lock → reread → aggregate → validate → write** in one transaction.

---

## Existing Mitigations

| Mechanism | Protects | Gap |
|-----------|----------|-----|
| `validateRepairQuantityAgainstReturn` | Sequential over-cap rejection | No serialization — stale read under concurrency |
| `assertCanUpdate` (PENDING only) | Post-start quantity changes | Create/update race remains |
| Phase 33 `claimStatusTransition` on start/complete/cancel | Duplicate workflow commands | Does not guard capacity at create |
| Phase 33 complete before IN movement | Duplicate complete → one IN | Assumes stored quantity is valid |
| Atomic inventory SQL on IN movement | Negative on-hand / row races | Business over-repair still posts valid SQL |
| Sequential tests in `repair.application.test.ts` | Functional validation | No concurrent create/update tests |

---

## Expected Implementation Surface

| File | Change |
|------|--------|
| `src/modules/return/domain/return.repository.interface.ts` | Add `lockForRepairCapacity(returnInspectionId)` |
| `src/modules/return/infrastructure/repositories/prisma-return.repository.ts` | `SELECT … FOR UPDATE` on `return_inspections` |
| `src/modules/return/tests/helpers/in-memory-return.repository.ts` | Delegate to in-memory mutex |
| `src/modules/repair/infrastructure/repair-capacity-lock.ts` | **NEW** — mirror `return-capacity-lock.ts` |
| `src/modules/repair/application/services/create-repair.service.ts` | Lock before `loadPriorRepairsForReturn` |
| `src/modules/repair/application/services/update-repair.service.ts` | Lock when `quantity` changes |
| `src/modules/repair/tests/helpers/transaction-test-runner.ts` | `runWithRepairCapacityLockScope` |
| `src/modules/repair/application/repair.capacity-concurrency.47.application.test.ts` | **NEW** — T47.x concurrency tests |

**Not expected to change:** `CompleteRepairService`, `StartRepairService`, `CancelRepairService`, Prisma schema, repair repository interface (unless optional sum helper added), Phase 33 tests.

---

## Schema

```text
Schema changes expected: NONE
Migration changes expected: NONE
```

Repair capacity is enforced at application layer via return-row serialization. No CHECK constraint or new column required. `ReturnInspectionItem.brokenQuantity` and `Repair.quantity` already exist.

---

## Test Plan

File: `repair.capacity-concurrency.47.application.test.ts`

Use `Promise.allSettled`, `createPassThroughTransactionRunner` with lock scope, `resetRepairCapacityLockForTests` in `beforeEach` — mirror Phase 45/46.

| ID | Scenario | Expected |
|----|----------|----------|
| **T47.1** | `damagedQuantity = 10`; concurrent create 6 + 4 | Both succeed; sum = 10 |
| **T47.2** | `damagedQuantity = 10`; concurrent create 6 + 6 | One succeeds, one rejects; sum = 6 |
| **T47.3** | Existing repair 6; concurrent create 6 on cap 10 | Reject |
| **T47.4** | Existing repair 6; create 4 on cap 10 | Success; sum = 10 |
| **T47.5** | Existing repair 9; create 2 on cap 10 | Reject (one unit over) |
| **T47.6** | Concurrent update quantity on two PENDING repairs (e.g. 5+5→7+7 on cap 10) | At least one rejects; sum ≤ 10 |

**Fixtures:** `buildCompletedReturnForRepair({ damagedQuantity })` from `repair.fixtures.ts`.

**Regression:** Phase 33 repair concurrency suite, full `repair.application.test.ts`, Phase 45/46 unrelated modules.

At least **T47.1** and **T47.2** must use genuine concurrent execution.

---

## Risk Assessment

| Risk | Level | Notes |
|------|-------|-------|
| Implementation complexity | **Low** | Direct mirror of Phase 45/46 patterns already in repo |
| WIP collision | **Low** | Touch return repo interface + repair services; WIP mostly UI/accounting — avoid staging unrelated files |
| Phase 44/46 regression | **None** | Different modules/domains |
| Inventory regression | **Low** | Complete path unchanged; only create/update serialization added |
| Over-serialization | **Low** | Return-row lock serializes all repairs on one return; acceptable for correctness |

---

## Decision Lock

**Decision lock: NOT REQUIRED**

The invariant is already defined in domain code (`validateRepairQuantityAgainstReturn`). Implementation is technical serialization parity — no new business policy choices.

---

## Additional Observations (Out of Scope)

| Item | Classification |
|------|----------------|
| Duplicate complete | **CLOSED** — Phase 33 T33.3 |
| Cancel after complete | Blocked by `assertCanCancel` |
| Complete without capacity re-check | **By design** — quantity committed at create/update |
| `Repair.returnInspectionItemId` no FK (F-09) | P3 schema hygiene — separate from N-46-01 |

No scope expansion required for Phase 47.

---

## Final Verdict

**READY FOR IMPLEMENTATION**

N-46-01 is confirmed at `893a811`. The fix is a well-precedented return-row lock with authoritative reread and existing validation helpers. No schema migration. No decision lock. Proceed to Phase 47 implementation.

---

*End of Phase 47 Implementation Readiness Assessment*
