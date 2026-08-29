# Phase 36 — Cancel Maintenance Stock Reversal Integrity Decision Lock

**Document:** Cancel Maintenance Stock Reversal Integrity v1.0  
**Status:** PROPOSED — READY FOR IMPLEMENTATION  
**Date:** 2026-08-27  
**Baseline HEAD:** `bd8b2201edff441c0022114e379ba19852a645e3` (`feat(payment): harden invoice settlement concurrency`)  
**Parent audit:** `docs/audits/PHASE_36_ENTERPRISE_GAP_AUDIT.md`  
**Parent phases:** Phase 29 (`CONCURRENT_SAFE_COMMAND_IDEMPOTENCY_29.md`), Phase 33 (`MAINTENANCE_REPAIR_CLAIM_BEFORE_SIDE_EFFECTS_33.md`), Phases 28–35 (unchanged)

---

## §1 Executive Decision

**PROPOSED — READY FOR IMPLEMENTATION**

Phase 36 closes **F-36-01** by replacing the stale pre-claim reversal guard in `CancelMaintenanceService` with an **authoritative post-claim start signal**:

```
shouldReverseStock = claimed.startedAt !== null
```

After a successful cancellation claim, the service MUST emit exactly one compensating **IN** stock movement when and only when the persisted maintenance row proves that **StartMaintenance** previously completed its status claim (which atomically persisted `startedAt` in the same transaction as the start claim, before OUT).

**No schema change.** **No new concurrency primitive.** **No API change.** Phase 29 `claimStatusTransition` remains the sole workflow concurrency gate.

---

## §2 Finding

**F-36-01 — CancelMaintenanceService can skip required IN stock reversal when StartMaintenance and CancelMaintenance race**

| Attribute | Value |
| --- | --- |
| Severity | **P1** |
| Module | Maintenance / Inventory |
| Defect class | Side-effect predicate derived from stale pre-claim read under cross-command concurrency |
| Location | `src/modules/maintenance/application/services/cancel-maintenance.service.ts` L74, L94–119 |
| Audit reference | `docs/audits/PHASE_36_ENTERPRISE_GAP_AUDIT.md` §12 F-36-01 |
| Phase 33 residual | Phase 33 fixed claim-before-side-effects ordering but left reversal gate on pre-claim `existing.status` |

---

## §3 Root Cause

`CancelMaintenanceService` computes reversal need **before** the atomic cancellation claim:

```typescript
// cancel-maintenance.service.ts L74
const wasInProgress = existing.status === "IN_PROGRESS";
// ...
// L94
if (wasInProgress) { /* IN reversal */ }
```

`existing` is loaded once at L47 and never refreshed before the reversal gate. **StartMaintenance** can mutate status `SCHEDULED → IN_PROGRESS`, persist `startedAt`, and emit **OUT** between Cancel's initial read and its cancellation claim.

Cancel's claim accepts `["SCHEDULED", "IN_PROGRESS"]` and therefore succeeds even when Cancel's initial read was stale `SCHEDULED`. Because `wasInProgress` was computed from the stale read, Cancel skips IN while OUT remains committed — permanent `quantityOnHand` loss.

---

## §4 Impact

| Impact area | Effect |
| --- | --- |
| **Inventory** | Net reduction of `quantityOnHand` equal to maintenance `quantity` |
| **Stock ledger** | Orphan OUT movement with reference `MAINTENANCE_REFERENCE_TYPE` + maintenance id; no compensating IN |
| **Workflow state** | Maintenance row shows `CANCELLED` — appears logically consistent while inventory is wrong |
| **Downstream** | F-02 availability, reserve, dispatch capacity calculations skewed |
| **Trigger** | Realistic concurrent operators or API retries: Start + Cancel on same maintenance while `SCHEDULED` or racing near start |

This is **owned inventory corruption**, not a UX defect.

---

## §5 Scope

### In scope

- **F-36-01** only
- `CancelMaintenanceService` reversal gate correction
- StartMaintenance ∥ CancelMaintenance concurrency semantics
- Phase 29 claim and error semantics preservation
- Transaction rollback semantics for post-claim IN failure
- Acceptance test definitions T36.1–T36.14
- Phase 28–35 regression preservation requirements

### Out of scope

- F-33-01, F-33-02, F-33-03
- F-35-05, F-35-06, F-35-08, F-35-09
- F-36-02, F-36-03
- F-31-05, F-31-08, F-31-10
- F-11, F-09, F-07
- StartMaintenance reordering (already claim-before-OUT per Phase 33)
- CompleteMaintenance, CompleteRepair, repair cancel paths
- Complete ∥ Cancel maintenance race (not F-36-01; no change in Phase 36)
- Stock-movement API bypass (F-33-03)
- Schema / migration changes

---

## §6 Invariants

The following invariants MUST hold after Phase 36 implementation:

1. **I-36-01 — No OUT-without-IN after cancel:** If a maintenance record is `CANCELLED` and a committed StartMaintenance OUT exists for that maintenance reference, exactly one compensating IN reversal MUST exist (net zero inventory effect from the start/cancel pair).

2. **I-36-02 — No IN without prior start evidence:** Cancellation from never-started maintenance (`startedAt IS NULL` on the post-claim row) MUST NOT emit IN.

3. **I-36-03 — Claim authority:** At most one successful cancellation claim per maintenance lifecycle attempt; concurrent loser MUST receive HTTP 409 / `ConcurrentUpdateError` / `CONCURRENT_UPDATE`.

4. **I-36-04 — Atomicity:** Cancellation status, IN reversal (when required), and audit MUST commit in a single maintenance transaction or roll back entirely.

5. **I-36-05 — Phase 33 claim ordering preserved:** Cancellation claim MUST remain before IN side effect; StartMaintenance claim MUST remain before OUT side effect.

6. **I-36-06 — Quantity integrity:** IN reversal quantity MUST equal `claimed.quantity` (unchanged from current behavior).

7. **I-36-07 — Reference integrity:** IN reversal MUST use `MAINTENANCE_REFERENCE_TYPE` and maintenance id (unchanged).

8. **I-36-08 — Idempotency policy unchanged:** Re-cancel on `CANCELLED` preserves existing domain 422 semantics; no new idempotency table or key.

---

## §7 Current Behavior

### CancelMaintenanceService @ `bd8b220`

```
POST /api/maintenances/:id/cancel
  → CancelMaintenanceService.execute
  → IMaintenanceTransactionRunner.run()              [UoW BEGIN]
    1. findById(id)                                   L47
    2. withCancelled() domain validation              L58–72
    3. wasInProgress = existing.status === "IN_PROGRESS"  L74  ← DEFECT
    4. claimStatusTransition([SCHEDULED|IN_PROGRESS]→CANCELLED)  L77–92
    5. if (wasInProgress) → executeCreateStockMovementInScope(IN)  L94–119
    6. auditLogger.log                                L122–130
  → COMMIT
```

### StartMaintenanceService @ `bd8b220` (context)

```
    1. findById
    2. withStarted() domain
    3. inventory validate
    4. claimStatusTransition(SCHEDULED→IN_PROGRESS, { startedAt })  L93–99
    5. executeCreateStockMovementInScope(OUT)                         L111–126
    6. audit
```

### Domain / persistence facts

- `Maintenance.withCancelled()` sets `status: CANCELLED` only — does **not** clear `startedAt` in memory (`maintenance.entity.ts` L167–175).
- Cancel claim passes `{ status: cancelled.status }` only — Prisma `updateMany` does **not** write `startedAt: null` (`prisma-maintenance.repository.ts` L247–257).
- `claimStatusTransition` reloads full row via `findUnique` after successful claim (L273–274).
- `startedAt` column exists on `maintenances` table (`schema.prisma` L930).

---

## §8 Race Analysis

### Defect interleaving (F-36-01)

| Time | Cancel (T1) | Start (T2) |
| --- | --- | --- |
| t0 | `findById` → **SCHEDULED** | |
| t1 | | validate inventory |
| t2 | | `claimStatusTransition(SCHEDULED→IN_PROGRESS, startedAt=now)` ✓ |
| t3 | | `executeCreateStockMovementInScope(OUT)` ✓ |
| t4 | | COMMIT |
| t5 | `wasInProgress = false` (stale) | |
| t6 | `claimStatusTransition` → **CANCELLED** ✓ | |
| t7 | **Skip IN** | |
| t8 | COMMIT | |

**Result:** OUT committed; CANCELLED committed; no IN → **inventory leak**.

### Cases locked in Phase 36 (see §12–§13 for full ordering)

| Case | Description | Locked outcome |
| --- | --- | --- |
| **A** | Cancel from SCHEDULED (no concurrent start) | CANCELLED; no IN |
| **B** | Cancel from IN_PROGRESS (sequential after start) | CANCELLED; one IN |
| **C** | Start ∥ Cancel from SCHEDULED | Never OUT-without-IN after cancel |
| **D** | Cancel wins before Start | CANCELLED; Start claim fails 409; no OUT/IN |
| **E** | Start wins before Cancel | OUT then IN; net zero qty delta |
| **F** | IN failure after cancel claim | Full TX rollback; not CANCELLED |
| **G** | Duplicate concurrent cancel | One success; one 409; ≤ one IN |
| **H** | Cancel already CANCELLED | Existing 422 domain error |

---

## §9 Authoritative Evidence

### Question 1 — What proves StartMaintenance successfully started?

**Answer:** Persisted `startedAt !== null` on the maintenance row **after** StartMaintenance's transaction commits.

StartMaintenance atomically writes `status = IN_PROGRESS` and `startedAt = now` in a single `claimStatusTransition` call (`start-maintenance.service.ts` L93–99) **before** OUT (L111). If OUT fails, the entire Start transaction rolls back — `startedAt` is not committed.

Therefore, at READ COMMITTED, any row visible to Cancel with `startedAt !== null` proves StartMaintenance completed claim + OUT in a committed transaction.

### Question 2 — Is `startedAt` persisted?

**Yes.** Column `startedAt DateTime?` on `Maintenance` model (`schema.prisma` L930). Written by Start claim (`start-maintenance.service.ts` L98).

### Question 3 — When is `startedAt` written relative to claim and OUT?

**Order within StartMaintenance transaction:**

1. Domain `withStarted()` computes `startedAt = now` in memory (L60)
2. `claimStatusTransition(SCHEDULED, { status: IN_PROGRESS, startedAt })` — **persisted before OUT**
3. `executeCreateStockMovementInScope(OUT)` — after claim
4. Audit
5. Commit

### Question 4 — Can cancellation observe it after its own claim?

**Yes.** Cancel's `claimStatusTransition` reloads the full row after successful `updateMany` (`prisma-maintenance.repository.ts` L273–274). Cancel's update sets only `status: CANCELLED`; it does **not** pass `startedAt`, so PostgreSQL preserves the existing `startedAt` value. The returned `claimed` entity therefore reflects whether start occurred regardless of Cancel's initial read.

### Question 5 — Race where cancel claims CANCELLED while missing OUT evidence?

**No committed case.**

| Scenario | startedAt on claimed row | OUT committed? | Phase 36 IN? |
| --- | --- | --- | --- |
| Never started; cancel wins | `null` | No | No — correct |
| Start committed fully | non-null | Yes | Yes — correct |
| Start TX in flight (uncommitted) | Cancel blocks on row lock or sees prior committed state | No until Start commits | Cancel either waits or claims after Start commits with startedAt set |
| Start claim succeeds, OUT fails | TX rolls back | No | startedAt not visible — correct |

Cancel cannot observe `startedAt !== null` without a committed Start transaction that included OUT (Start orders claim-before-OUT in same TX).

### Question 6 — Transaction rollback preserves correctness?

**Yes.** Maintenance UoW wraps claim, IN (if any), and audit. Failure after claim rolls back status change and inventory delta together (existing runner behavior).

### Question 7 — Is movement-reference evidence required?

**No.** Stock-movement lookup by reference is unnecessary for Phase 36. `startedAt` is sufficient, already persisted, reloaded post-claim, and transactionally coupled to Start's OUT in the Start transaction. Movement-reference checks add query cost and do not improve correctness given Start's locked ordering.

### Question 8 — Is an additional lock required?

**No.** Phase 29 `claimStatusTransition` serializes competing status mutations. Cross-command Start vs Cancel ordering is resolved by PostgreSQL row-level locking on concurrent `updateMany` against the same maintenance id plus post-claim authoritative read.

### Question 9 — Can Phase 29 `claimStatusTransition` remain authoritative?

**Yes.** Phase 36 changes only the reversal predicate input, not the claim primitive or expected-status sets.

### Question 10 — Schema change required?

**No.** Existing `startedAt` column is sufficient.

### Locked reversal signal

```typescript
const shouldReverseStock = claimed.startedAt !== null;
```

Replace `wasInProgress` and gate IN on `shouldReverseStock`. Use `claimed.quantity`, `claimed.inventoryId`, and `claimed.id` for reversal parameters (not stale `existing`).

---

## §10 Claim Semantics

Phase 36 **preserves** existing claim definitions:

| Command | Expected status(es) | Next status | Additional fields on claim |
| --- | --- | --- | --- |
| **StartMaintenance** | `SCHEDULED` | `IN_PROGRESS` | `startedAt: now` |
| **CancelMaintenance** | `SCHEDULED`, `IN_PROGRESS` | `CANCELLED` | **status only** — `startedAt` preserved by omission |

**Cancel claim failure (`claimed === null`):**

- Throw `ConcurrentUpdateError` with `entity: MAINTENANCE_ENTITY_NAME`, maintenance id, `expectedStatus: "SCHEDULED|IN_PROGRESS"`, `action: "cancel"`.
- HTTP **409**, code **`CONCURRENT_UPDATE`** (existing mapping).
- **Zero** stock side effects.

**Start claim failure when Cancel won:**

- Start expects `SCHEDULED`; row is `CANCELLED`.
- `claimed.count !== 1` → `ConcurrentUpdateError`, action `"start"`, HTTP 409.
- **Zero** OUT movement.

Phase 29 `claimStatusTransition` implementation in `prisma-maintenance.repository.ts` and `in-memory-maintenance.repository.ts` — **unchanged**.

---

## §11 Reversal Semantics

### When to reverse

| Post-claim condition | IN reversal |
| --- | --- |
| `claimed.startedAt === null` | **MUST NOT** emit IN |
| `claimed.startedAt !== null` | **MUST** emit exactly one IN |

### IN movement contract (unchanged from Phase 33)

| Field | Value |
| --- | --- |
| `movementType` | `IN` |
| `quantity` | `claimed.quantity` |
| `inventoryId` | `claimed.inventoryId` |
| `referenceType` | `MAINTENANCE_REFERENCE_TYPE` |
| `referenceId` | `claimed.id` |
| `remarks` | `Maintenance cancelled for ${claimed.maintenanceNumber}` |

### Inventory effect

- One IN restores `quantityOnHand` by `claimed.quantity` via atomic `incrementOnHand` SQL inside `executeCreateStockMovementInScope`.
- Net effect of committed Start + Cancel pair: **zero** `quantityOnHand` delta.

### Explicit prohibition

**MUST NOT** derive reversal need from:

- Pre-claim `existing.status`
- Pre-claim `existing.startedAt`
- In-memory `wasInProgress` snapshot

---

## §12 Transaction Ordering

### Locked CancelMaintenance sequence

```
1. Authorization / userId check
2. findById(existing)                         — soft read for domain validation only
3. withCancelled() domain transition          — 422 if COMPLETED/CANCELLED
4. claimStatusTransition → claimed            — atomic; null → 409, stop
5. shouldReverseStock = claimed.startedAt !== null
6. if shouldReverseStock:
     inventory findById(claimed.inventoryId)
     executeCreateStockMovementInScope(IN)
7. auditLogger.log
8. return toMaintenanceDto(claimed)
— single IMaintenanceTransactionRunner.run() transaction
```

### Locked StartMaintenance sequence (unchanged — reference only)

```
validate → claim(SCHEDULED→IN_PROGRESS, startedAt) → OUT → audit
```

### Ordering rules

| Rule | Locked |
| --- | --- |
| Domain validation before claim | **Yes** — `withCancelled()` before claim |
| Claim before IN reversal | **Yes** — Phase 33 preserved |
| Post-claim evidence before IN | **Yes** — `claimed.startedAt` check after claim |
| Audit after side effects | **Yes** — unchanged |
| No stock mutation on failed claim | **Yes** |
| No partial commit on IN failure | **Yes** — full rollback |

---

## §13 Concurrency Model

**Isolation:** PostgreSQL READ COMMITTED (unchanged).

**Serialization mechanism:** Predicate `updateMany` claims on maintenance `status` — same as Phase 29/33.

### Case A — Normal cancel from SCHEDULED

Sequential: maintenance `SCHEDULED`, `startedAt = null` → claim → `claimed.startedAt === null` → no IN → `CANCELLED`.

### Case B — Normal cancel from IN_PROGRESS

Sequential after start: `startedAt !== null` → claim → IN → `CANCELLED`; `quantityOnHand` restored.

### Case C — Start ∥ Cancel (both valid orderings)

**Ordering 1 — Cancel wins (Case D):** Cancel claims `SCHEDULED→CANCELLED`; `startedAt` null; no IN. Start loses claim → 409; no OUT.

**Ordering 2 — Start wins (Case E):** Start claims, OUT commits with `startedAt` set. Cancel claim succeeds on `IN_PROGRESS`; `claimed.startedAt !== null`; IN emitted; net zero inventory.

**Forbidden outcome eliminated:** Start OUT committed + Cancel CANCELLED + no IN.

### Case D — Cancel wins before Start

Locked in Ordering 1 above.

### Case E — Start wins before Cancel

Locked in Ordering 2 above.

### Case F — Post-claim IN failure

IN movement or inventory SQL throws → maintenance transaction aborts → `CANCELLED` status not committed → no partial IN → existing error propagation.

Implementation tests use rollback transaction runner (T36.6 pattern from Phase 33 T33.5).

### Case G — Duplicate concurrent cancellation

Two cancels: first claim succeeds; second `updateMany` count 0 → 409. At most one IN (only if first cancel's `claimed.startedAt !== null`).

### Case H — Cancel already CANCELLED

`withCancelled()` on `CANCELLED` → `MaintenanceInvalidStatusError` → HTTP 422 `UnprocessableError`. No claim attempted. **No change.**

---

## §14 Lock/Serialization Analysis

| Mechanism | Phase 36 use | Verdict |
| --- | --- | --- |
| `claimStatusTransition` (`updateMany` + status predicate) | Start, Cancel, Complete maintenance | **Retained — authoritative** |
| `SELECT FOR UPDATE` on maintenance row | Not used | **Not required** |
| PostgreSQL advisory locks | Not used | **Rejected** |
| SERIALIZABLE isolation | Not used | **Rejected** |
| Distributed locks | Not used | **Rejected** |
| Inventory row locks | Delegated to atomic IN/OUT SQL inside movement executor | **Unchanged** |

**Cross-command contention:** Start and Cancel both invoke `updateMany` on the same maintenance primary key. Under READ COMMITTED, concurrent updates serialize; one transaction's claim succeeds; the other observes updated status and fails claim or proceeds with post-claim evidence.

**No new lock primitive is required.**

---

## §15 Error Semantics

| Condition | HTTP | Error | Code |
| --- | --- | --- | --- |
| Concurrent claim failure (duplicate cancel, start after cancel, etc.) | **409** | `ConcurrentUpdateError` | **`CONCURRENT_UPDATE`** |
| Invalid status for cancel (COMPLETED, already CANCELLED) | **422** | `UnprocessableError` | existing |
| Maintenance not found | **404** | `NotFoundError` | existing |
| Inventory not found for reversal | **404** | `NotFoundError` | existing |
| Missing userId | **401** | `UnauthorizedError` | existing |
| IN movement / inventory predicate failure after claim | propagates; TX rollback | existing infrastructure error | existing |

**No new error codes.**

---

## §16 Rollback Semantics

All CancelMaintenance mutations occur inside `IMaintenanceTransactionRunner.run()`.

| Failure point | Committed state after rollback |
| --- | --- |
| Before claim | Unchanged |
| Claim returned null (409) | Unchanged — claim did not commit |
| After claim, during IN | Status revert to pre-cancel; no IN; no audit |
| After IN, during audit | Full rollback including claim and IN |

StartMaintenance rollback (reference): claim + OUT atomic within Start TX — if OUT fails, `startedAt` not committed, so Cancel never sees false-positive `startedAt`.

---

## §17 API Contract

| Aspect | Phase 36 change |
| --- | --- |
| Endpoint | `POST /api/maintenances/:id/cancel` — **unchanged** |
| Request body | **unchanged** |
| Success response DTO | **unchanged** — `MaintenanceDto` |
| Error codes | **unchanged** — 409 for concurrent claim only |
| Permissions | `PERMISSIONS.maintenances.cancel` — **unchanged** |

Clients observe correct inventory behavior; no contract migration.

---

## §18 Domain Rules

**Unchanged domain transitions:**

| From | Cancel allowed | Stock on cancel |
| --- | --- | --- |
| `SCHEDULED` | Yes | None if never started (`startedAt null`) |
| `IN_PROGRESS` | Yes | IN reversal if started (`startedAt non-null`) |
| `COMPLETED` | No — 422 | — |
| `CANCELLED` | No — 422 | — |

**Domain entity changes:** **None required.**

`withCancelled()` continues to set only `status: CANCELLED`. Persisted `startedAt` retention is a repository/claim behavior already satisfied by omitting `startedAt` from cancel claim data.

**Phase 36 rule (application layer):** Reversal eligibility is **`claimed.startedAt !== null`**, not domain status at read time.

---

## §19 Repository Responsibilities

| Repository | Phase 36 change |
| --- | --- |
| `IMaintenanceRepository` | **No interface change** |
| `PrismaMaintenanceRepository.claimStatusTransition` | **No change** — already reloads full entity post-claim |
| `InMemoryMaintenanceRepository.claimStatusTransition` | **No change** — preserves `startedAt` when not in update data (L187–190) |

Repository MUST continue returning post-claim entity with accurate persisted `startedAt`.

---

## §20 Service Responsibilities

### CancelMaintenanceService (only file modified in Phase 36 implementation)

| Responsibility | Action |
| --- | --- |
| Remove stale guard | Delete `wasInProgress = existing.status === "IN_PROGRESS"` |
| Add authoritative guard | `shouldReverseStock = claimed.startedAt !== null` after successful claim |
| Reversal parameters | Use `claimed` entity fields |
| Claim / audit / error mapping | **Unchanged** |

### StartMaintenanceService

**No change.**

### All other services

**No change.**

---

## §21 Schema Decision

**NO SCHEMA CHANGE**

- No new columns
- No new tables
- No counters
- No version fields
- No idempotency tables
- No movement ledger tables

Existing `maintenances.startedAt` is the authoritative reversal signal.

---

## §22 Migration Decision

**NO MIGRATION**

`prisma/migrations` — **untouched**.

---

## §23 Test Strategy

1. Add `maintenance.reversal-integrity.36.application.test.ts` (or extend `maintenance.concurrency.33.application.test.ts` with T36 section — implementer choice; tests MUST cover T36.1–T36.7).
2. **Genuine concurrency required** for T36.1, T36.4, T36.5, T36.7 — use `Promise.allSettled([...])`, not sequential `await`.
3. Use existing in-memory repositories + pass-through / rollback transaction runners (Phase 33 pattern).
4. T36.6 uses rollback runner that aborts TX on audit or injected IN failure.
5. Regression T36.8–T36.14 run existing suite files — no modification in Phase 36 decision-lock task.

---

## §24 Acceptance Tests

| ID | Description | Concurrency | Pass criteria |
| --- | --- | --- | --- |
| **T36.1** | Start ∥ Cancel from SCHEDULED | `Promise.allSettled` | Never OUT-without-IN: if final status `CANCELLED` and OUT count ≥ 1, IN count ≥ 1; net `quantityOnHand` equals pre-race baseline |
| **T36.2** | Cancel from SCHEDULED (no start) | Sequential | `CANCELLED`; stock movement count 0; inventory unchanged |
| **T36.3** | Cancel from IN_PROGRESS | Sequential after start | Exactly 1 IN; `quantityOnHand` restored to pre-start level |
| **T36.4** | Cancel wins before Start | `Promise.allSettled` | Cancel succeeds; Start rejected with `ConcurrentUpdateError`; OUT count 0; IN count 0 |
| **T36.5** | Start wins before Cancel | `Promise.allSettled` | Start succeeds with 1 OUT; Cancel succeeds with 1 IN; net zero qty delta |
| **T36.6** | Post-claim IN failure | Sequential with rollback runner | Transaction rolls back; status not `CANCELLED`; inventory unchanged |
| **T36.7** | Duplicate concurrent cancel | `Promise.allSettled` | Exactly 1 success; 1 `ConcurrentUpdateError`; at most 1 IN |
| **T36.8** | Phase 33 maintenance regression | Run `maintenance.concurrency.33.application.test.ts` | All pass |
| **T36.9** | Phase 29 concurrency regression | Run Phase 29 concurrency suites (dispatch/return/RO/external-rental) | All pass |
| **T36.10** | Phase 30 dispatch integrity | Run `dispatch.concurrency.29.application.test.ts` + dispatch integrity tests | All pass |
| **T36.11** | Phase 31 availability | Run `rental-order.availability-serialization.31.application.test.ts` | All pass |
| **T36.12** | Phase 32 reserve command | Run `rental-order.reserve-command-integrity.32.application.test.ts` | All pass |
| **T36.13** | Phase 34 invoice dispatch rollup | Run Phase 34 targeted tests / invoice generation tests | All pass |
| **T36.14** | Phase 35 payment settlement | Run `payment-invoice-settlement-concurrency.35.application.test.ts` | All pass |

---

## §25 Regression Requirements

Post-implementation MUST pass:

1. T36.1–T36.7 (new)
2. T36.8–T36.14 (existing suites)
3. `maintenance.application.test.ts` functional tests
4. Full Vitest suite
5. Phase 36–scoped ESLint clean on touched files
6. Phase 36–scoped TypeScript clean on touched files
7. `prisma validate`
8. `git diff --check`

Phase 28–35 behavior MUST remain unchanged outside CancelMaintenance reversal gate.

---

## §26 Deferred Findings

Explicitly **not** addressed by Phase 36:

| ID | Severity | Summary |
| --- | --- | --- |
| F-33-01 | P2 | Invoice number sequence cap 500 |
| F-33-02 | P2 | Active invoice guard cap 10 |
| F-33-03 | P2 | Direct stock-movement API bypass |
| F-35-05 | P2 | Create invoice active guard bypass |
| F-35-06 | P2 | Issue/void invoice TOCTOU |
| F-35-08 | P2 | Pay expense journal before status |
| F-36-02 | P2 | Generate invoice split-transaction TOCTOU |
| F-36-03 | P2 | Pending payment over-commitment at create |
| F-31-05 | P2 | Return receive/inspect TOCTOU |
| F-31-08 | P2 | Inventory PATCH bypass |
| F-31-10 | P3 | Cancel dispatch TOCTOU |
| F-11 | P3 | Authorization granularity |
| F-09 | P3 | Repair.returnInspectionItemId missing FK |
| F-07 | P3 | RentalOrder.DISPATCHED ghost enum |

---

## §27 Rejected Alternatives

| # | Alternative | Verdict | Reason |
| --- | --- | --- | --- |
| 1 | Stale `wasInProgress = existing.status === "IN_PROGRESS"` | **REJECTED** | Root cause of F-36-01 |
| 2 | Check status only before claim | **REJECTED** | Same stale-read class |
| 3 | Check status only after claim (`claimed.status` before cancel was IN_PROGRESS) | **REJECTED** | Post-claim status is always `CANCELLED`; status alone cannot distinguish started vs not-started |
| 4 | Post-claim status inference without start evidence | **REJECTED** | Insufficient — cancel overwrites status |
| 5 | New persisted counter (e.g. `outMovementCount`) | **REJECTED** | Schema change unnecessary; `startedAt` exists |
| 6 | New schema field | **REJECTED** | `startedAt` sufficient |
| 7 | PostgreSQL advisory locks | **REJECTED** | Phase 29 predicate claims sufficient |
| 8 | SERIALIZABLE isolation as default | **REJECTED** | Phase 29–35 precedent READ COMMITTED |
| 9 | Distributed locks / Redis | **REJECTED** | Out of architecture |
| 10 | Idempotency keys / table | **REJECTED** | Phase 29 decision — no idempotency table |
| 11 | Replace `claimStatusTransition` | **REJECTED** | Primitive is correct; guard input is wrong |
| 12 | Change transaction framework / UoW | **REJECTED** | Existing runner sufficient |
| 13 | Stock movement reference lookup for reversal decision | **REJECTED** | Extra query; `startedAt` transactionally equivalent for committed starts |
| 14 | Reorder Cancel to IN before claim | **REJECTED** | Violates Phase 33 claim-before-side-effects |
| 15 | Clear `startedAt` on cancel claim | **REJECTED** | Unnecessary; would complicate audit trail without benefit |

---

## §28 Architecture Safety

**Preserved unchanged:**

| Phase | Invariant |
| --- | --- |
| **28** | Mixed return source × condition attribution |
| **29** | Claim-before-side-effects; `ConcurrentUpdateError` / 409 / `CONCURRENT_UPDATE` |
| **30** | Dispatch claimed-quantity SQL aggregate integrity |
| **31** | Inventory-row serialization; F-02 post-lock re-read |
| **32** | Rental-order reserve command lock order |
| **33** | Maintenance/repair claim-before-side-effects (Phase 36 **completes** cancel reversal guard only) |
| **34** | Invoice dispatch rollup unbounded load |
| **35** | Payment invoice settlement atomicity |

**Stack preserved:** Next.js, TypeScript, Prisma, PostgreSQL, Better Auth, Clean Architecture, DDD, Repository, UoW, DI, Zod, REST.

**Implementation footprint:** One service file + one test file (or test section) — minimal additive hardening.

---

## §29 Open Decisions

**OPEN DECISIONS: NONE**

All implementation choices required for Phase 36 are locked:

- Reversal signal: `claimed.startedAt !== null`
- Claim primitive: Phase 29 `claimStatusTransition` unchanged
- Transaction ordering: §12
- Error semantics: §15
- Schema: none
- API: unchanged
- Tests: T36.1–T36.14 per §24

---

## §30 Final Decision / Implementation Contract

### Final decision

**PROPOSED — READY FOR IMPLEMENTATION**

Phase 36 closes **F-36-01** by replacing the stale pre-claim `wasInProgress` guard with **`claimed.startedAt !== null`** after successful cancellation claim. This guarantees that whenever StartMaintenance has committed (persisting `startedAt` and OUT), CancelMaintenance emits exactly one compensating IN. **No schema change. No API change. No new concurrency primitive.**

### Implementation contract

**Files to modify (implementation task only):**

| File | Change |
| --- | --- |
| `src/modules/maintenance/application/services/cancel-maintenance.service.ts` | Replace reversal guard per §9, §11, §20 |
| `src/modules/maintenance/application/maintenance.reversal-integrity.36.application.test.ts` (new) OR extend concurrency test file | T36.1–T36.7 |

**Files MUST NOT modify:**

- Prisma schema / migrations
- Maintenance repository interfaces or implementations
- StartMaintenanceService
- Other maintenance/repair services
- Existing decision locks
- Phase 28–35 unrelated modules

**Verification before commit:**

1. T36.1–T36.14 pass
2. Full suite pass
3. ESLint / TypeScript clean on touched paths
4. `prisma validate`
5. `git diff --check`

**Git safety (decision-lock task):**

- This document only — no commit, no push, no WIP destruction

---

**End of Phase 36 Decision Lock**
