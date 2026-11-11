# Phase 47 — Repair Capacity Concurrency

## Executive Verdict

**PHASE 47 COMPLETE — N-46-01 CLOSED**

Repair create/update capacity commitment is now serialized on the return inspection row with authoritative reread, prior-repair aggregation, and validation before mutation within the same UoW.

---

## Baseline

| Item | Value |
|------|-------|
| Previous HEAD | `893a811` — Phase 46 supplier pending payment over-commitment |
| Branch | `main` |
| WIP | ~147 modified/untracked files preserved |
| Push | **NO** |

---

## Finding

**N-46-01 — Repair Capacity Concurrency (P1)**

### Root cause

`CreateRepairService` and `UpdateRepairService` (quantity) used read→aggregate→validate→write without row lock. Concurrent operations on the same return item could each pass validation against stale `priorRepaired` sums and exceed `returnItem.damagedQuantity`.

### Downstream impact

`CompleteRepairService` posts IN stock movements for stored `repair.quantity` without capacity re-check (Phase 33 prevents duplicate complete only). Over-committed repairs could inflate `quantityOnHand`.

---

## Authoritative Capacity

**Domain:** `returnItem.damagedQuantity`  
**Database:** `ReturnInspectionItem.brokenQuantity` (via `return.persistence.mapper.ts`)

---

## Invariant

```text
SUM(non-CANCELLED repair.quantity for returnItemId)
+
requestedQuantity
≤
returnItem.damagedQuantity
```

Non-`CANCELLED` repairs consume capacity (`buildPriorRepairedMap` in `repair-return.validation.ts`).

---

## Serialization Boundary

**Lock target:** `ReturnInspection` row (`return_inspections`)

**Why:** Repair aggregation uses `findByReturnId(returnInspectionId)`; damaged quantity lives on return items loaded via authoritative `returnRepository.findById`. Parent row lock serializes all repair capacity mutations for that return inspection in one UoW — mirrors Phase 45 dispatch lock and Phase 46 PO lock patterns.

---

## Implementation

| File | Purpose |
|------|---------|
| `return.repository.interface.ts` | Added `lockForRepairCapacity(returnInspectionId)` |
| `prisma-return.repository.ts` | `SELECT id FROM return_inspections WHERE id = … FOR UPDATE` |
| `in-memory-return.repository.ts` | Test lock via `acquireRepairCapacityLock` |
| `repair-capacity-lock.ts` | **NEW** — ALS/mutex in-memory lock |
| `create-repair.service.ts` | Lock → authoritative reread → prior repairs → validate → create |
| `update-repair.service.ts` | Lock when `quantity` changes → reread → validate with `excludeRepairId` → update |
| `transaction-test-runner.ts` | `runWithRepairCapacityLockScope` for test parity |
| `repair.capacity-concurrency.47.application.test.ts` | **NEW** — T47.1–T47.6 + cancelled/self-exclusion |

No new repair repository aggregation method — reused `loadPriorRepairsForReturn` + `validateRepairAgainstReturnItem`.

---

## Transaction Boundary

```text
BEGIN (repair UoW)
  lockForRepairCapacity(returnInspectionId)
  authoritativeReturn = findById(returnInspectionId)
  priorRepairs = findByReturnId(returnInspectionId)
  validateRepairAgainstReturnItem(... [, excludeRepairId on update])
  create / update repair
  audit
COMMIT
```

Lock held until mutation completes.

---

## Create Path

`CreateRepairService`: early return existence/eligibility check, then lock, authoritative reread, rental-order cross-checks, prior repair load, capacity validation, create.

---

## Update Path

`UpdateRepairService`: when `quantity` is present, lock return inspection, reread return, aggregate with `excludeRepairId: existing.id`, validate new quantity, update.

---

## Completion

**`CompleteRepairService` — UNCHANGED.** Phase 33 claim-before-IN remains intact. N-46-01 closed at create/update commitment boundary.

---

## Inventory Interaction

Over-capacity repairs can no longer be created/updated concurrently. Therefore completion IN movements cannot restock quantities exceeding `damagedQuantity` commitment.

---

## Tests

### Phase 47

File: `repair.capacity-concurrency.47.application.test.ts`

| ID | Scenario | Result |
|----|----------|--------|
| T47.1 | Concurrent create 4 + 6 on cap 10 | PASS — both succeed, total 10 |
| T47.2 | Concurrent create 6 + 6 on cap 10 | PASS — one succeeds, one rejects, total 6 |
| T47.3 | Existing 6 + create 4 on cap 10 | PASS — total 10 |
| T47.4 | Existing 6 + create 5 on cap 10 | PASS — rejects |
| T47.5 | Concurrent create 4 + update 3→7 on cap 10 | PASS — at least one rejects, total ≤ 10 |
| T47.6 | Concurrent update 3→7 on two repairs (cap 10) | PASS — at least one rejects, total ≤ 10 |
| Cancelled | CANCELLED 8 + create 10 on cap 10 | PASS |
| Self-exclusion | Update 4→7 with peer 3 on cap 10 | PASS; 4→8 rejects |

T47.1/T47.2/T47.5/T47.6 use `Promise.allSettled`.

### Phase 33 regression

`repair.concurrency.33.application.test.ts` — **PASS** (included in repair application suite)

### Phase 45 regression

`return.capacity-concurrency.45.application.test.ts` — **7/7 PASS**

### Phase 46 regression

`supplier-payment.pending-over-commitment.46.application.test.ts` — **6/6 PASS**

### Phase 44 regression

`supplier-payment-settlement-concurrency.44.application.test.ts` — **PASS**

### Targeted application regression

Repair + Phase 33/44/45/46/39 application tests — **92/92 PASS**

### Full suite

**NOT fully green in this environment:** 2415 tests passed in 160 files; 54 suites failed on missing `DATABASE_URL` / `BETTER_AUTH_SECRET` (env bootstrap via `database.config.ts` import chain — unrelated to Phase 47). Phase 46 completion reported 3163/3163 with env configured.

---

## Static Gates

| Gate | Result |
|------|--------|
| `npx prisma validate` | Valid |
| ESLint (Phase 47 files) | No errors |
| TypeScript | Not run full project (unrelated WIP TS errors) |
| `git diff --check` (Phase 47 paths) | Clean |
| Build | Not run |

---

## Schema

**Schema changes: NONE**

**Migration changes: NONE**

---

## Git

| Item | Value |
|------|-------|
| Previous HEAD | `893a811` |
| New HEAD | *(set at commit)* |
| Commit | `fix(repair): prevent repair capacity over-commitment` |
| Push | NO |
| WIP preserved | YES |

---

## Remaining Findings

Not re-audited. From Post-Phase-46 audit:

- N-46-02 (source-externally stale F-02 read)
- F-33-03, N-44-05, F-37-R1, F-33-01, F-37-R2, F-11, F-09, F-07, N-39-UI-01, F-35-08 (deferred)

---

## Next Step

**Post-Phase-47 Enterprise Gap Audit**
