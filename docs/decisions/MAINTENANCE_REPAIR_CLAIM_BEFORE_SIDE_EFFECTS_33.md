# Phase 33 — Maintenance/Repair Claim-Before-Side-Effects Integrity Decision Lock

**Document:** Maintenance/Repair Claim-Before-Side-Effects Integrity v1.0  
**Status:** PROPOSED — READY FOR IMPLEMENTATION  
**Date:** 2026-08-19  
**Baseline HEAD:** `bbe89b4420128bf1fdc03f8d874263fbfda4db9c` (`feat(dispatch): harden claimed-quantity integrity`)  
**Parent audit:** `docs/audits/PHASE_33_ENTERPRISE_GAP_AUDIT.md`  
**Parent phases:** Phase 29 (`CONCURRENT_SAFE_COMMAND_IDEMPOTENCY_29.md`), Phases 28–32 (unchanged)

---

## §1 Executive Summary

**PROPOSED — READY FOR IMPLEMENTATION**

Phase 33 closes **F-30-07 / F-31-02** by extending the Phase 29 **`claimStatusTransition`** primitive to maintenance and repair workflow commands. Every command that performs inventory stock movements MUST atomically claim its expected workflow status **before** any stock side effect executes.

**Stock-mutating commands (4):** StartMaintenance (OUT), CompleteMaintenance (IN), CancelMaintenance (IN when `IN_PROGRESS`), CompleteRepair (IN).

**Non-stock workflow commands (2):** StartRepair, CancelRepair — MUST also adopt atomic claims for consistent 409 concurrency semantics and duplicate-transition prevention.

**No schema change.** No new concurrency abstraction. No business-process redesign.

---

## §2 Baseline

| Attribute | Value |
| --- | --- |
| Branch | `main` |
| HEAD | `bbe89b4420128bf1fdc03f8d874263fbfda4db9c` |
| Ahead of `origin/main` | 9 commits (not pushed) |
| Phases 28–32 | Implemented (uncommitted Phase 31+32 in working tree) |
| Phase 33 | Decision lock only — implementation not started |

**Observed defect locations:**

| Service | Stock-before-status evidence |
| --- | --- |
| `start-maintenance.service.ts` | L92–107 OUT → L109–112 `updateStatus` |
| `complete-maintenance.service.ts` | L84–99 IN → L101–104 `updateStatus` |
| `cancel-maintenance.service.ts` | L85–100 IN (if `IN_PROGRESS`) → L103–105 `updateStatus` |
| `complete-repair.service.ts` | L90–105 IN → L107–110 `updateStatus` |

**Repository gap:** `IMaintenanceRepository` and `IRepairRepository` expose only unconditional `updateStatus` — zero `claimStatusTransition` in either module (verified by repository grep).

---

## §3 Problem Statement

Phase 29 established **claim-before-side-effects** for return complete, dispatch complete, rental-order confirm, and external-rental workflow commands. Maintenance and repair were explicitly deferred (Phase 30 §16).

Current maintenance/repair mutation services:

1. Read aggregate with `findById`
2. Apply in-memory domain transition (`withStarted` / `withCompleted` / `withCancelled`)
3. Execute stock movement(s) via `executeCreateStockMovementInScope`
4. Persist status with unconditional `repository.updateStatus(id, …)`

Under concurrent duplicate commands, two transactions can both pass step 2 against the same expected status, both execute step 3 (duplicate OUT/IN), and both call step 4 (last writer wins on status). Phase 29 atomic inventory SQL prevents negative per-row stock but does **not** enforce at-most-one workflow movement per maintenance/repair lifecycle.

---

## §4 Audit Evidence

**Finding IDs:** F-30-07 (Phase 30 deferred), F-31-02 (Phase 31 alias)

| Field | Detail |
| --- | --- |
| **Severity** | P1 |
| **Module** | Maintenance / Repair / Inventory |
| **Audit source** | `docs/audits/PHASE_33_ENTERPRISE_GAP_AUDIT.md` §10 |
| **Verified** | Yes — source inspection confirms stock-before-`updateStatus` ordering |
| **Failure mode** | Duplicate OUT/IN stock movements; workflow status vs inventory desync |
| **Trigger** | `Promise.allSettled` concurrent start/complete/cancel on same record |

**Cross-command race (IN_PROGRESS maintenance):** Concurrent **complete** + **cancel** both pass domain checks; without claim, interleaved stock IN movements and status writes produce inconsistent final state.

---

## §5 Affected Workflows

### Complete affected-command matrix

| Command | Service | Current status gate | Stock side effect | Required claim | Claim timing | Phase 33 class |
| --- | --- | --- | --- | --- | --- | --- |
| **Start maintenance** | `StartMaintenanceService` | `assertCanStart` → SCHEDULED | OUT `existing.quantity` | `SCHEDULED → IN_PROGRESS` | **Before OUT** | **A — required** |
| **Complete maintenance** | `CompleteMaintenanceService` | `assertCanComplete` → IN_PROGRESS | IN `existing.quantity` | `IN_PROGRESS → COMPLETED` | **Before IN** | **A — required** |
| **Cancel maintenance** | `CancelMaintenanceService` | `assertCanCancel` → SCHEDULED or IN_PROGRESS | IN `existing.quantity` **iff** pre-claim `IN_PROGRESS` | `SCHEDULED \| IN_PROGRESS → CANCELLED` | **Before IN** (when applicable) | **A — required** |
| **Complete repair** | `CompleteRepairService` | `assertCanComplete` → IN_PROGRESS | IN `existing.quantity` | `IN_PROGRESS → COMPLETED` | **Before IN** | **A — required** |
| **Start repair** | `StartRepairService` | `assertCanStart` → PENDING | None | `PENDING → IN_PROGRESS` | Before audit | **A — required (no stock)** |
| **Cancel repair** | `CancelRepairService` | `assertCanCancel` → PENDING or IN_PROGRESS | None | `PENDING \| IN_PROGRESS → CANCELLED` | Before audit | **A — required (no stock)** |
| Create maintenance | `CreateMaintenanceService` | Creates SCHEDULED | None | — | — | **C — no change** |
| Update maintenance | `UpdateMaintenanceService` | SCHEDULED only | None | — | — | **C — no change** |
| Create repair | `CreateRepairService` | Creates PENDING | None | — | — | **C — no change** |
| Update repair | `UpdateRepairService` | PENDING only | None | — | — | **C — no change** |
| List/Get | read services | — | None | — | — | **C — no change** |

**Class legend:** A = claim-before-side-effects required; C = unchanged; D = none identified.

---

## §6 Current Failure Sequence

### StartMaintenance (representative stock-before-status defect)

```
POST /api/maintenances/:id/start
  → StartMaintenanceService.execute
  → IMaintenanceTransactionRunner.run()          [UoW BEGIN]
    1. findById(id)                               L47
    2. withStarted() domain (expects SCHEDULED)   L59
    3. inventory find + validate                    L74–88
    4. executeCreateStockMovementInScope OUT      L92–107  ← SIDE EFFECT
    5. maintenanceRepository.updateStatus         L109–112 ← UNCONDITIONAL
    6. auditLogger.log                            L114–122
  → COMMIT
```

**Concurrent duplicate start:** T1 and T2 both read `SCHEDULED`, both pass L59, both emit OUT at L92, both call L109 — **two OUT movements**, one status write.

### CompleteMaintenance / CompleteRepair

Same pattern: IN movement (L84–99 / L90–105) **before** unconditional `updateStatus`.

### CancelMaintenance

If `existing.status === "IN_PROGRESS"`: IN at L85–100 **before** `updateStatus` at L103. If `SCHEDULED`: no stock, but still unconditional status write (duplicate cancel possible).

### StartRepair / CancelRepair

No stock, but unconditional `updateStatus` at L58–61 / L58–60 — duplicate transition + duplicate audit under concurrency.

---

## §7 Maintenance Semantics

**Locked — existing business behavior unchanged:**

| Status | Meaning |
| --- | --- |
| `SCHEDULED` | Created, not started (`maintenance.constants.ts` L4–8) |
| `IN_PROGRESS` | Maintenance underway; stock removed from warehouse |
| `COMPLETED` | Maintenance finished; stock returned to warehouse |
| `CANCELLED` | Terminated |

| Transition | Domain rule | Stock movement | Quantity | Inventory field | Reference |
| --- | --- | --- | --- | --- | --- |
| **Start** | `SCHEDULED → IN_PROGRESS` | **OUT** | `existing.quantity` | `quantityOnHand -= qty` | `MAINTENANCE_REFERENCE_TYPE` + maintenance id |
| **Complete** | `IN_PROGRESS → COMPLETED` | **IN** | `existing.quantity` | `quantityOnHand += qty` | same |
| **Cancel (SCHEDULED)** | `→ CANCELLED` | **None** | — | — | — |
| **Cancel (IN_PROGRESS)** | `→ CANCELLED` | **IN** (reversal of start OUT) | `existing.quantity` | `quantityOnHand += qty` | same |

**Start validation (unchanged):** `validateInventoryForMaintenance` — quantity vs available on-hand before OUT (`start-maintenance.service.ts` L83–88).

**Cancel stock guard (unchanged):** IN movement only when pre-claim status is `IN_PROGRESS` (`cancel-maintenance.service.ts` L75).

**No RESERVE/RELEASE/ADJUSTMENT** in maintenance workflow paths.

---

## §8 Repair Semantics

**Locked — existing business behavior unchanged:**

| Status | Meaning |
| --- | --- |
| `PENDING` | Created, not started |
| `IN_PROGRESS` | Repair underway |
| `COMPLETED` | Repair finished |
| `CANCELLED` | Terminated |

| Transition | Domain rule | Stock movement | Quantity | Inventory resolution |
| --- | --- | --- | --- | --- |
| **Start** | `PENDING → IN_PROGRESS` | **None** | — | — |
| **Complete** | `IN_PROGRESS → COMPLETED` | **IN** | `existing.quantity` | `findByProductAndWarehouse(productId, warehouseId)` |
| **Cancel** | `PENDING \| IN_PROGRESS → CANCELLED` | **None** | — | — |

**Design note (preserved, not Phase 33 scope):** Repair does not emit OUT on start — damaged goods were already removed from owned inventory during return complete (Phase 28). Complete repair restocks repaired units via IN only.

**No stock on cancel repair** — even when `IN_PROGRESS` (`cancel-repair.service.ts` has no stock path). Phase 33 does not add reversal movements.

---

## §9 Phase 29 Pattern

**Authoritative primitive:** `claimStatusTransition(id, expected, data) → Entity | null`

**Reference implementation:** `prisma-return.repository.ts` L229–277:

```typescript
const claimed = await db.returnInspection.updateMany({
  where: { id, status: { in: expectedList } },
  data: update,
});
if (claimed.count !== 1) return null;
return findUnique(...);
```

**Reference service usage:** `complete-return.service.ts` L115–131 — claim **before** any stock movement; `null` → `ConcurrentUpdateError`.

| Aspect | Phase 29 behavior | Phase 33 reuse |
| --- | --- | --- |
| Expected status enforcement | `updateMany WHERE id AND status IN (expected)` | **Same** |
| Loser outcome | Returns `null` | **Same** |
| Service mapping | `ConcurrentUpdateError` | **Same** |
| HTTP status | 409 | **Same** |
| Stable code | `CONCURRENT_UPDATE` | **Same** — no new code |
| Audit duplication | Prevented — loser throws before audit | **Same** |
| Transaction | Existing module UoW runner | **Same** — `IMaintenanceTransactionRunner` / `IRepairTransactionRunner` |

**Existing modules with `claimStatusTransition`:** return, dispatch, rental-order, external-rental. Maintenance and repair are the gap.

---

## §10 Claim Strategy

### LOCKED: Atomic expected-status claim first → then stock side effects

**Mechanism:** Add `claimStatusTransition` to `IMaintenanceRepository` and `IRepairRepository`. Production implementation uses Prisma `updateMany` with expected-status predicate — identical pattern to Phase 29 return repository.

**NOT used:** SELECT FOR UPDATE, advisory locks, Redis, serializable isolation, version columns, idempotency tables.

**Cancel commands with multiple source statuses:** Use expected-status **array** — `["SCHEDULED", "IN_PROGRESS"]` for maintenance cancel; `["PENDING", "IN_PROGRESS"]` for repair cancel — matching `claimStatusTransition` overload already used elsewhere (e.g. rental-order sync, ERA cancel).

**Post-claim stock decision for cancel maintenance:** Use **pre-claim** `existing.status === "IN_PROGRESS"` (from step-1 `findById`) to determine whether IN movement runs **after** successful claim. Only the claim winner executes side effects; pre-claim status on the winner matches the row state the claim consumed.

---

## §11 Claim Transition Matrix

| Command | Expected source status(es) | Target status | Timestamp fields on claim | Stock after claim | Loser HTTP | Loser stock |
| --- | --- | --- | --- | --- | --- | --- |
| StartMaintenance | `SCHEDULED` | `IN_PROGRESS` | `startedAt` | OUT | 409 | **Zero** |
| CompleteMaintenance | `IN_PROGRESS` | `COMPLETED` | `completedAt` | IN | 409 | **Zero** |
| CancelMaintenance | `SCHEDULED`, `IN_PROGRESS` | `CANCELLED` | — | IN iff pre-claim was `IN_PROGRESS` | 409 | **Zero** |
| StartRepair | `PENDING` | `IN_PROGRESS` | `startedAt` | None | 409 | **Zero** |
| CompleteRepair | `IN_PROGRESS` | `COMPLETED` | `completedAt` | IN | 409 | **Zero** |
| CancelRepair | `PENDING`, `IN_PROGRESS` | `CANCELLED` | — | None | 409 | **Zero** |

**Concurrent cross-command on same IN_PROGRESS maintenance:** Complete vs Cancel — exactly one claim succeeds (`IN_PROGRESS → COMPLETED` or `IN_PROGRESS → CANCELLED`); loser receives 409; **at most one** IN movement commits.

**Retry after successful completion:** Second invocation fails at domain `assertCanComplete` / claim — see §16.

---

## §12 Side-Effect Ordering

### LOCKED mandatory sequence (all six workflow commands)

```
BEGIN module UoW transaction
  1. findById → 404 if missing
  2. Domain transition (withStarted / withCompleted / withCancelled) → 422 if invalid status
  3. Business validation (inventory lookup, validateInventoryForMaintenance, etc.) → 404/422
  4. claimStatusTransition(expected → target) → 409 if null
  5. Stock side effects (if applicable) via executeCreateStockMovementInScope
  6. auditLogger.log (SUCCESS) using claimed entity for newValues
COMMIT
```

**Removed from authoritative path:** Unconditional `updateStatus` after stock on workflow commands. `updateStatus` remains for non-workflow use if any; workflow commands use `claimStatusTransition` exclusively for status persistence.

**Validation timing (locked):** Steps 2–3 **before** claim (422 for business-invalid). Step 4 is concurrency authority. Step 5 **only after** successful claim.

---

## §13 Transaction Boundary

| Module | Runner | Boundary |
| --- | --- | --- |
| Maintenance | `IMaintenanceTransactionRunner` | Single `run()` — claim → stock → audit — one commit |
| Repair | `IRepairTransactionRunner` | Single `run()` — claim → stock (complete only) → audit — one commit |

**Prohibited:** Stock movement before claim. Stock movement outside UoW.

**Isolation:** PostgreSQL READ COMMITTED unchanged. No new isolation level.

---

## §14 Concurrency Semantics

| Scenario | Expected outcome |
| --- | --- |
| Two concurrent **start** on same SCHEDULED maintenance | One claim wins; one OUT; loser 409; zero loser stock |
| Two concurrent **complete** on same IN_PROGRESS maintenance | One claim wins; one IN; loser 409 |
| Two concurrent **complete** on same IN_PROGRESS repair | One claim wins; one IN; loser 409 |
| Concurrent **complete** vs **cancel** on IN_PROGRESS maintenance | One transition wins; at most one IN; loser 409 |
| Concurrent commands on **different** records | Independent — no cross-record lock |
| Concurrent **start** + **cancel** on SCHEDULED maintenance | One wins (IN_PROGRESS or CANCELLED); loser 409 |

**Inventory row locking:** Not required for Phase 33. Phase 29 per-movement atomic SQL (`decrementOnHand` / `incrementOnHand`) remains sufficient **after** claim serializes workflow commands.

---

## §15 Error Semantics

| Failure | HTTP | Error class | Stable code | Side effects |
| --- | --- | --- | --- | --- |
| Not found | 404 | `NotFoundError` | existing | None |
| Invalid status / domain rule | 422 | `UnprocessableError` | existing | None |
| Inventory validation failure | 422 | `UnprocessableError` / `MaintenanceInvalidInventoryError` | existing | None |
| Concurrent status claim lost | **409** | **`ConcurrentUpdateError`** | **`CONCURRENT_UPDATE`** | **None** |
| Stock movement predicate failure (post-claim) | 422 | existing inventory errors | existing | **Rollback entire UoW** |
| Unauthorized | 401 | `UnauthorizedError` | existing | None |

**No new stable error code.**

Loser of concurrent claim MUST NOT execute step 5 (stock) or step 6 (audit SUCCESS for the transition).

---

## §16 Retry / Idempotency Semantics

**Locked — Phase 29 policy applies:**

| Situation | Behavior |
| --- | --- |
| Retry after **successful** transition (status already advanced) | Domain guard fails first → **422** (`MaintenanceInvalidStatusError` / `RepairInvalidStatusError`) **OR** claim returns null → **409** if domain re-check passes on stale read |
| Concurrent duplicate while status unchanged | Claim serializes → one success, one **409** |
| Idempotent no-op on completed record | **NOT introduced** — second call is **422** or **409**, not silent success |
| Client retry after 409 | Safe to refetch and retry **if** status still permits action |

Phase 33 adds concurrency integrity; it does **not** introduce idempotency keys or request deduplication.

---

## §17 Rollback Semantics

If any step after successful claim fails (stock movement, audit, downstream error):

- Entire UoW transaction **rolls back**
- Status claim reverts (PostgreSQL transaction rollback)
- Stock movement reverts
- No partial committed state

**T33.5** must prove rollback after claim when stock movement fails (use rollback test runner pattern from Phase 31/32).

---

## §18 Repository/Application Surface

### Allowed implementation surface

| Layer | Change |
| --- | --- |
| `IMaintenanceRepository` | Add `claimStatusTransition(id, expected, data): Promise<Maintenance \| null>` |
| `IRepairRepository` | Add `claimStatusTransition(id, expected, data): Promise<Repair \| null>` |
| `PrismaMaintenanceRepository` | `updateMany` expected-status claim + re-fetch |
| `PrismaRepairRepository` | Same |
| In-memory test repositories | Equivalent predicate semantics |
| `StartMaintenanceService` | Reorder: claim → OUT |
| `CompleteMaintenanceService` | Reorder: claim → IN |
| `CancelMaintenanceService` | Reorder: claim → conditional IN |
| `StartRepairService` | Add claim; remove unconditional `updateStatus` |
| `CompleteRepairService` | Reorder: claim → IN |
| `CancelRepairService` | Add claim; remove unconditional `updateStatus` |
| New concurrency tests | `maintenance.concurrency.33.application.test.ts`, `repair.concurrency.33.application.test.ts` (or combined) |

### Prohibited

- Schema/migration changes
- New transaction runners
- Replacing `claimStatusTransition` with row locks
- Changing stock movement types, quantities, or reference semantics
- Modifying return/dispatch/rental-order/external-rental services

---

## §19 Domain Invariants

**Preserved (unchanged):**

| Invariant | Source |
| --- | --- |
| `assertCanStart` → SCHEDULED only (maintenance) | `maintenance.rules.ts` L55–58 |
| `assertCanComplete` → IN_PROGRESS only | L61–64 |
| `assertCanCancel` → not COMPLETED/CANCELLED | L67–70 |
| `assertCanStart` → PENDING only (repair) | `repair.rules.ts` L41–44 |
| `assertCanComplete` → IN_PROGRESS only | L47–50 |
| `assertCanCancel` → not COMPLETED/CANCELLED | L53–56 |
| Start maintenance: qty ≤ available on-hand | `validateInventoryForMaintenance` |
| Complete repair: inventory by product×warehouse | `complete-repair.service.ts` L75–78 |

**New workflow invariant (Phase 33):**

> At most one successful status claim per workflow transition per maintenance/repair record; stock side effects run **zero or one** time per successful transition.

---

## §20 API Contract

| Aspect | Phase 33 impact |
| --- | --- |
| Successful response DTOs | **Unchanged** |
| Request payloads | **Unchanged** |
| Happy-path HTTP 200 | **Unchanged** |
| Validation errors | **422** — unchanged |
| New concurrent-loss surface | **409** `CONCURRENT_UPDATE` where duplicate concurrent commands previously succeeded silently |
| Breaking change classification | Correctness improvement per Phase 29 §API — consumers should refetch on 409 |

Routes unchanged: `POST /api/maintenances/:id/start|complete|cancel`, `POST /api/repairs/:id/start|complete|cancel`.

---

## §21 Schema Decision

### LOCKED: **NO SCHEMA CHANGE**

- No version column on `maintenances` or `repairs`
- No idempotency table
- No unique index on stock movement references (optional future hardening — **not Phase 33**)
- No status enum changes
- Serialization uses existing rows + `updateMany` expected-status predicate

Verified: Phase 33 fix requires only repository method + service reordering.

---

## §22 Deferred Findings

| ID | Summary | Phase 33 action |
| --- | --- | --- |
| **F-31-03** | Invoice dispatch rollup pageSize 100 | **DEFERRED** |
| **F-33-01** | Invoice number pageSize 500 | **DEFERRED** |
| **F-33-02** | Duplicate active-invoice guard pageSize 10 | **DEFERRED** |
| **F-33-03** | Direct `POST /stock-movements` RESERVE/RELEASE bypass | **DEFERRED** — documented dependency; does not block Phase 33 |
| **F-31-05** | Return receive/inspect claims | **DEFERRED** |
| **F-31-06 / F-11** | Authorization granularity | **DEFERRED** |
| **F-31-07 / F-09** | Repair.returnInspectionItemId FK | **DEFERRED** |
| **F-31-08** | UpdateInventory absolute PATCH | **DEFERRED** |
| **F-31-09 / F-07** | DISPATCHED ghost enum | **DEFERRED** |
| **F-31-10** | Dispatch/return cancel claims | **DEFERRED** |
| **F-31-11** | DB CHECK constraints | **DEFERRED** |

**Closed by Phase 33:** F-30-07, F-31-02.

---

## §23 Scope Boundaries

**In scope:**

- Six maintenance/repair workflow services listed in §5
- `claimStatusTransition` on maintenance and repair repositories
- Concurrency acceptance tests T33.1–T33.7
- Regression verification T33.8–T33.12

**Out of scope:**

- Invoice/billing pagination fixes
- Stock movement API restriction
- Return receive/inspect claims
- Authorization redesign
- Repair FK migration
- Inventory PATCH hardening
- Enum cleanup
- F-02 / reservation / dispatch rollup changes

**F-33-03 dependency note:** Direct stock-movement API can still mutate inventory without maintenance/repair workflow. Phase 33 closes the **workflow command** gap; API bypass remains deferred.

---

## §24 Acceptance Tests

**Mandatory:** Genuine parallel execution — `Promise.allSettled([...])`. Sequential `await A(); await B();` is **NOT** concurrency coverage.

| ID | Description | Parallel ops | Expected |
| --- | --- | --- | --- |
| **T33.1** | Concurrent maintenance start | Two start on SCHEDULED | One success; one **409**; exactly **one OUT**; status `IN_PROGRESS` |
| **T33.2** | Concurrent maintenance complete | Two complete on IN_PROGRESS | One success; one **409**; exactly **one IN**; status `COMPLETED` |
| **T33.3** | Concurrent repair complete | Two complete on IN_PROGRESS | One success; one **409**; exactly **one IN**; status `COMPLETED` |
| **T33.4** | Valid vs invalid concurrent | Start + complete on SCHEDULED (complete invalid) | Start wins; complete **422**; no spurious stock |
| **T33.5** | Rollback after claim | Force stock failure after claim (rollback runner) | Status unchanged; zero movements committed |
| **T33.6** | Retry after success | Sequential second start/complete after first succeeded | **422** or **409**; no duplicate stock |
| **T33.7** | Different records | Parallel start on two maintenance records | Both succeed independently |
| **T33.8** | Phase 28 regression | `return.source-condition.28.application.test.ts` | All pass |
| **T33.9** | Phase 29 regression | Concurrency 29 suites | All pass |
| **T33.10** | Phase 30 regression | `dispatch.claimed-quantity.30.application.test.ts` | All pass |
| **T33.11** | Phase 31 regression | `rental-order.availability-serialization.31.application.test.ts` | All pass |
| **T33.12** | Phase 32 regression | `rental-order.reserve-command-integrity.32.application.test.ts` | All pass |

**Additional recommended (same file):**

- T33.1b: Concurrent cancel on IN_PROGRESS maintenance — one IN max
- T33.1c: Concurrent start repair — one claim, one 409

---

## §25 Regression Requirements

Post-implementation MUST pass:

1. T33.1–T33.7 (genuine parallelism)
2. T33.8–T33.12 regression suites
3. Existing `maintenance.application.test.ts` and `repair.application.test.ts` functional tests
4. Full test suite
5. `tsc --noEmit`
6. ESLint (0 errors)
7. `prisma validate`
8. Production build
9. `git diff --check`

Phase 28 source×condition, Phase 29 claims, Phase 30 dispatch rollup, Phase 31 F-02 serialization, Phase 32 reserve integrity — **must remain unchanged**.

---

## §26 Implementation Constraints

Implementation MUST:

1. Add `claimStatusTransition` to maintenance and repair repository interfaces + Prisma + in-memory implementations
2. Rewire six workflow services to §12 sequence
3. Map claim `null` → `ConcurrentUpdateError` with entity/id/expectedStatus/action
4. Remove post-stock unconditional `updateStatus` on workflow commands
5. Add T33.1–T33.7 with `Promise.allSettled`
6. Run T33.8–T33.12 regression suites

Implementation MUST NOT:

- Change maintenance/repair stock semantics (OUT/IN types, quantities, reference types)
- Add schema/migrations
- Modify Phase 28–32 services
- Weaken existing tests
- Convert 422 domain failures to 409
- Introduce new error codes

---

## §27 Rejected Alternatives

| Alternative | Verdict | Reason |
| --- | --- | --- |
| **Stock movement first (status quo)** | **REJECTED** | F-30-07 defect — duplicate movements |
| **SELECT FOR UPDATE on maintenance/repair row** | **REJECTED** | Phase 29 precedent — `updateMany` claim is sufficient |
| **Unique index on stock reference (referenceType, referenceId, movementType)** | **REJECTED for Phase 33** | Schema change; claim-before-side-effects solves root cause |
| **Application mutex only** | **REJECTED** | Production must use PostgreSQL predicate via repository |
| **Skip claim on repair start/cancel (no stock)** | **REJECTED** | Duplicate status/audit; inconsistent 409 surface |
| **Reorder only stock, keep updateStatus** | **REJECTED** | Unconditional updateStatus is not concurrency-safe |
| **Serializable isolation** | **REJECTED** | Phase 29/30/31/32 precedent |
| **Fix F-33-03 API bypass in same phase** | **REJECTED** | Out of scope; separate phase |

---

## §28 Safety / Architecture Preservation

**Preserved:**

- Next.js, TypeScript, Prisma, PostgreSQL, Better Auth
- Clean Architecture, DDD, Repository, UoW, DI, Zod, REST
- Existing `IMaintenanceTransactionRunner` / `IRepairTransactionRunner`
- `executeCreateStockMovementInScope` + atomic inventory SQL
- Phase 28 return source×condition
- Phase 29 claim/error semantics
- Phase 30 dispatch claimed-quantity integrity
- Phase 31 F-02 cross-order serialization
- Phase 32 same-order reserve integrity

---

## §29 Final Decision / OPEN DECISIONS

### Final decision

**PROPOSED — READY FOR IMPLEMENTATION**

Phase 33 closes F-30-07 / F-31-02 by adding **`claimStatusTransition`** to maintenance and repair repositories and enforcing **claim → stock → audit** ordering on all six workflow mutation services, reusing Phase 29 `ConcurrentUpdateError` / HTTP 409 / `CONCURRENT_UPDATE`. **No schema change.**

### OPEN DECISIONS

**OPEN DECISIONS: NONE**

All implementation choices required for Phase 33 are locked in §10–§17.

---

## §30 Validation / Git Safety

**Decision-lock task constraints:**

- Modify only `docs/decisions/MAINTENANCE_REPAIR_CLAIM_BEFORE_SIDE_EFFECTS_33.md`
- Do not implement, commit, or push
- Do not modify prior decision locks or audit reports

**Implementation-phase git safety (future):**

- Preserve uncommitted Phase 31+32 work
- No schema/migration commits in Phase 33

---

*End of Phase 33 Decision Lock*
