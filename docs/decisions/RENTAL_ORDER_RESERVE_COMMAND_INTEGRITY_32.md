# Phase 32 — Rental Order Reserve Command Integrity Decision Lock

**Document:** Rental Order Reserve Command Integrity v1.0  
**Status:** PROPOSED — READY FOR IMPLEMENTATION  
**Date:** 2026-08-17  
**Baseline HEAD:** `bbe89b4420128bf1fdc03f8d874263fbfda4db9c` (`feat(dispatch): harden claimed-quantity integrity`)  
**Parent audit:** `docs/audits/PHASE_32_ENTERPRISE_GAP_AUDIT.md`  
**Parent phases:** Phase 29 (`CONCURRENT_SAFE_COMMAND_IDEMPOTENCY_29.md`), Phase 30 (`DISPATCH_CLAIMED_QUANTITY_INTEGRITY_30.md`), Phase 31 (`DATE_AWARE_AVAILABILITY_SERIALIZATION_31.md`)

---

## §1 Executive Decision

**PROPOSED — READY FOR IMPLEMENTATION**

Phase 32 closes **F-32-01** by extending the Phase 31 reserve command with **parent `rental_orders` row `SELECT … FOR UPDATE`** (after inventory locks), a **mandatory post-lock RentalOrder re-fetch**, and **domain `withReserved` computed only on fresh state** before `updateReserve` and `RESERVE` movements.

**Cross-order F-02 serialization (Phase 31) remains unchanged** — inventory-row locks are retained.

**Same-order serialization (Phase 32)** — parent rental-order row lock prevents concurrent reserve commands from overwriting each other's line-level `reservedQuantity` using stale snapshots.

**No schema change.**

---

## §2 Baseline

| Attribute | Value |
| --- | --- |
| Branch | `main` |
| HEAD | `bbe89b4420128bf1fdc03f8d874263fbfda4db9c` |
| Ahead of `origin/main` | 9 commits (not pushed) |
| Phase 31 | Implemented, uncommitted |
| Phase 32 | Decision lock only — implementation not started |

**Observed defect location:** `reserve-rental-order.service.ts` L63–82 (`findById` + `withReserved` before locks), L205–214 (`updateReserve` with stale absolute quantities).

---

## §3 Problem Statement

Phase 31 correctly serializes **cross-order** date-aware capacity on shared **inventory** rows. It does **not** prevent **same-order** reserve commands from computing and persisting **absolute** `RentalOrderItem.reservedQuantity` values from a **stale** RentalOrder snapshot.

Because `updateReserve` writes **all line reserved quantities** from the request-derived entity (`prisma-rental-order.repository.ts` L333–337 via `toRentalOrderReserveUpdateInput`), a concurrent reserve on a **different line** of the same order can **revert** another line's committed increment.

---

## §4 Finding F-32-01

| Field | Detail |
| --- | --- |
| **ID** | F-32-01 |
| **Severity** | P1 |
| **Module** | RentalOrder / Reserve |
| **Evidence** | `reserve-rental-order.service.ts` L63–82, L204–214; `applyReserveToItems` L182 (`item.reservedQuantity + delta`); `updateReserve` absolute write |
| **Failure mode** | RO line `reservedQuantity` < sum of committed `RESERVE` movements; F-02 under-commit when status transitions to RESERVED |
| **Trigger** | `Promise.allSettled` concurrent partial reserves on same RentalOrder (same or different lines) |

**Phase 31 test gap:** T31.5 covers concurrent **full** reserve only (`rental-order.availability-serialization.31.application.test.ts`).

---

## §5 Current Reservation Semantics

**Locked domain behavior (unchanged):**

| Rule | Source |
| --- | --- |
| Reserve input is **incremental delta** per product | `ReserveRentalOrderService` L101–108 comment; `applyReserveToItems` L182 |
| `assertCanReserve` allows **CONFIRMED only** | `rental-order.rules.ts` L225–228 |
| Partial reserve keeps status **CONFIRMED** until all lines full | `computeStatusAfterReserve` L132–143 |
| Full reserve transitions to **RESERVED** | Same |
| Request is **all-or-nothing** per call | Phase 31 §15 |
| `updateReserve` claims `status = CONFIRMED` then writes absolute item quantities | `prisma-rental-order.repository.ts` L318–337 |
| Only production `RESERVE` path | `reserve-rental-order.service.ts` L256–272 |

---

## §6 Authoritative Invariant

After any successful reserve command commits:

1. Each affected `RentalOrderItem.reservedQuantity` equals the **prior committed value plus this command's delta** (cumulative incremental semantics).
2. `inventory.reservedQuantity` equals the sum of committed `RESERVE` movements minus `RELEASE` for that warehouse row.
3. No successful reserve may persist line quantities computed from a RentalOrder snapshot **older than** the post-lock authoritative read.
4. Cross-order F-02 capacity is never over-committed (Phase 31 preserved).

---

## §7 Serialization Resource

### LOCKED: **Dual resource — inventory row (Phase 31) + parent rental_orders row (Phase 32)**

| Contention type | Resource | Mechanism |
| --- | --- | --- |
| **A. Cross-order** (RO-A vs RO-B, same product×warehouse) | `inventory` row | Phase 31 `lockForAvailabilityCommit(inventoryId)` |
| **B. Same-order** (multiple reserve commands, same RentalOrder) | `rental_orders` parent row | Phase 32 **`lockForReserveCommand(rentalOrderId)`** — `SELECT id FROM rental_orders WHERE id = $1 FOR UPDATE` |

**Why inventory alone is insufficient for B:** Multi-line concurrent reserves on one order touch **different inventory rows** (no mutual blocking). Each command still writes **all lines'** absolute `reservedQuantity` via `updateReserve`, clobbering sibling-line updates from stale snapshots.

**Why parent RO lock does not replace inventory lock for A:** Competing orders share **inventory capacity**, not a single rental-order row. Phase 30/31 precedent: parent-row lock serializes **per-order** mutations; inventory-row lock serializes **shared SKU capacity**.

**New repository method:** `IRentalOrderRepository.lockForReserveCommand(id: RentalOrderId): Promise<void>` — same SQL pattern as `lockForDispatchClaim` (`prisma-rental-order.repository.ts` L457–469), **separate method** for reserve-command semantics.

**In-memory tests:** Async mutex keyed by `rentalOrderId` (extend Phase 31 `availability-commit-lock.ts` pattern or sibling `reserve-command-lock.ts`).

---

## §8 Lock Acquisition Order

### LOCKED deterministic global order

```
1. Resolve all inventoryIds for products in the reserve request
2. Sort inventoryIds ascending (lexicographic UUID)
3. FOR EACH inventoryId: lockForAvailabilityCommit(inventoryId)
4. lockForReserveCommand(rentalOrderId)
5. Re-fetch RentalOrder (findById)
6. Domain + F-02 validation on fresh state
7. updateReserve + RESERVE movements
```

**Deadlock prevention:**

| Rule | Detail |
| --- | --- |
| Inventory before rental order | Always acquire all inventory locks **before** parent RO lock |
| Multi-inventory | Ascending `inventoryId` (Phase 31 §10) |
| Cross-command consistency | Any future mutator acquiring both resources must use **inventory ascending → rentalOrderId** |
| Cancel vs reserve | Both contend on **inventory** row(s) first; reserve additionally holds RO lock during mutation window |

**Cancel path (unchanged lock set for RELEASE):** Phase 31 inventory locks only — cancel does **not** acquire `lockForReserveCommand` (see §17).

---

## §9 Transaction Boundary

| Operation | Runner | Boundary |
| --- | --- | --- |
| **Reserve** | `IRentalOrderTransactionRunner` | Single `run()` — inventory locks → RO lock → re-fetch → F-02 → validate → `updateReserve` → `RESERVE` → audit — **one commit** |
| **Cancel RELEASE** | Same runner | Phase 31 sequence unchanged |

**Prohibited:** `withReserved` / `updateReserve` / `RESERVE` before steps 3–4 complete.

**Rollback:** Any failure after lock acquisition rolls back entire UoW — no partial line write, no partial movement.

---

## §10 Safe Reserve Command Sequence

**Mandatory order (derived from current service + this lock):**

```
BEGIN IRentalOrderTransactionRunner
  1. findById(rentalOrderId) — 404 if missing; read warehouseId / line metadata only
  2. Aggregate deltaByProduct from request
  3. Resolve inventory row per productId + warehouseId
  4. Sort inventoryIds ascending
  5. FOR EACH inventoryId: lockForAvailabilityCommit(inventoryId)
  6. lockForReserveCommand(rentalOrderId)
  7. fresh = findById(rentalOrderId) — MUST re-read inside transaction after locks
  8. reservedOrder = fresh.withReserved(reserveItems) — domain validation (422 on failure)
  9. FOR EACH product delta:
       a. assertValidAvailabilityPeriod
       b. GetDateAwareAvailabilityService.execute (excludeRentalOrderId: fresh.id)
       c. IF delta > dateAwareAvailableQuantity → 422
 10. updateReserve(fresh.id, { status, items reservedQuantity from reservedOrder })
       — IF null → 422
 11. FOR EACH reserveTarget (inventoryId sorted): executeCreateStockMovementInScope(RESERVE)
 12. auditLogger.log SUCCESS
COMMIT
```

**Removed from authoritative path:** Pre-lock `withReserved` on initial `existing` snapshot (current L77–82) — may remain as optional fast-fail **only if** it does not drive persistence; **persistence authority is step 7–8**.

---

## §11 Same-Order Concurrency Proof

**Initial state:**

- RentalOrder **CONFIRMED**, one line `quantity = 10`, `reservedQuantity = 0`
- Inventory `quantityOnHand = 10`, `reservedQuantity = 0`

**Concurrent commands (genuine parallel):**

- **T1:** reserve delta **+4**
- **T2:** reserve delta **+3**

**Unsafe (current Phase 31 code):**

| Step | T1 | T2 |
| --- | --- | --- |
| Snapshot | reserved = 0 | reserved = 0 |
| withReserved | computes 4 | computes 3 |
| updateReserve | writes 4 | writes 3 |
| RESERVE | +4 | +3 |
| **Final line** | **3** (last writer) | |
| **Final inventory.reserved** | **7** | |
| **Desync** | line 3 ≠ inventory hold 7 | |

**Safe (Phase 32):**

| Step | T1 | T2 |
| --- | --- | --- |
| Inventory lock | acquires | waits |
| RO lock | acquires | waits |
| Re-fetch + withReserved | 0+4=4 | (blocked) |
| Commits | line=4, inv=4 | |
| T2 continues | | re-fetch 4, 4+3=7 |
| Commits | | line=7, inv=7 |

**Final:** `reservedQuantity = 7`, `inventory.reservedQuantity = 7`, two `RESERVE` movements (+4, +3).

**Multi-line clobber proof (different products, same RO):**

- Line A and Line B both start at 0
- T1 reserves +4 on A; T2 reserves +3 on B **without RO lock** would write absolute snapshot resetting A to 0
- **With RO lock:** serialized; T2 re-fetch sees A=4 before applying B+3

---

## §12 Cross-Order Concurrency Preservation

Phase 31 behavior **unchanged:**

- RO-A and RO-B competing on same `inventory` row block on `lockForAvailabilityCommit`
- F-02 re-read after inventory locks remains authoritative for capacity
- Post-lock F-02 validation → 422 on over-capacity
- Parent RO locks are **per order** — RO-A and RO-B do **not** block each other on rental_orders row unless same order id

**Composition:** T1 (RO-A) holds inv lock + RO-A lock; T2 (RO-B) waits on inv lock only — correct cross-order sequencing.

---

## §13 F-02 Availability Interaction

| Rule | Status |
| --- | --- |
| F-02 formula | **Frozen** — no change |
| CONFIRMED excluded from commitment | **Frozen** — Phase 31 §6 |
| F-02 re-read timing | **After inventory locks, before mutation** — unchanged |
| `excludeRentalOrderId` | Fresh re-fetched order id — unchanged |
| Partial CONFIRMED holds | Do not appear in F-02 commitment until status ∈ `AVAILABILITY_COMMITMENT_STATUSES` — existing policy |

**Note:** Post-lock re-fetch improves line accuracy; F-02 commitment for **other** orders still flows through `findAvailabilityCommitmentLines` inside the locked transaction.

---

## §14 Partial Reservation Semantics

### LOCKED — unchanged from Phase 31

| Behavior | Detail |
| --- | --- |
| Multiple reserve calls | **Supported** — cumulative |
| Status while partial | **CONFIRMED** |
| All-or-nothing per request | delta > post-lock F-02 available → **422** |
| Line ceiling | `updatedReservedQuantity > item.quantity` → **422** |

Phase 32 adds **correct cumulative persistence**, not a policy change.

---

## §15 Inventory Mutation Semantics

| Rule | Detail |
| --- | --- |
| **RESERVE** | Unchanged — `reserveAvailableQuantity` atomic SQL after F-02 pass |
| **Lock** | Phase 31 `lockForAvailabilityCommit` before F-02 and before RESERVE |
| **Quantity** | Movement quantity = request **delta** (not cumulative line total) |
| **Ordering** | RESERVE targets sorted by `inventoryId` ascending |

Inventory mutation **must not** occur before step 9 passes.

---

## §16 RentalOrderItem Mutation Semantics

| Rule | Detail |
| --- | --- |
| **Computation** | `applyReserveToItems(fresh.items, deltas)` — incremental on **fresh** base |
| **Persistence** | `updateReserve` writes absolute per-line `reservedQuantity` from `reservedOrder` |
| **Status** | `computeStatusAfterReserve` on fresh-derived items |
| **Claim** | `updateMany WHERE status = CONFIRMED` — unchanged |

**Concurrent full reserve (same order):** After T1 transitions to **RESERVED**, T2 re-fetch → `assertCanReserve` fails (**422**) — preserves Phase 31 T31.5 intent.

**Concurrent partial (same order):** Serialized by RO lock; both may succeed cumulatively.

**Rejected:** SQL `increment` on `rental_order_items.reservedQuantity` alone — bypasses domain status computation and multi-line atomic update shape.

---

## §17 Cancel Interaction

**Cancel path unchanged (Phase 31):**

```
cancelIfCancellable → inventory locks (ascending) → RELEASE → clearReservedQuantities
```

**Cancel does NOT acquire `lockForReserveCommand`.**

| Race | Outcome |
| --- | --- |
| Cancel wins `cancelIfCancellable` first | Reserve re-fetch shows **CANCELLED** → `withReserved` / `assertCanReserve` → **422** |
| Reserve holds inventory + RO locks | Cancel blocks on inventory lock until reserve completes or rolls back |
| Reserve completes partial | Cancel still allowed (CONFIRMED or RESERVED in cancel predicate) — existing business rules |

**Inventory lock** remains the shared serialization point for cancel RELEASE vs reserve RESERVE on the same SKU.

---

## §18 Confirm Interaction

**No Phase 32 change.**

- Confirm uses Phase 29 `claimStatusTransition(DRAFT→CONFIRMED)`
- CONFIRMED does not consume F-02 commitment (Phase 31)
- Confirm does not acquire inventory or reserve locks
- Concurrent confirm + reserve: independent (reserve requires CONFIRMED)

---

## §19 Failure and HTTP Semantics

| Failure | HTTP | Error | Side effects |
| --- | --- | --- | --- |
| F-02 capacity exhausted (post-lock) | **422** | `UnprocessableError` | None committed |
| Domain reserve invalid (status, line ceiling) | **422** | `UnprocessableError` | None committed |
| `updateReserve` returns null | **422** | `UnprocessableError` | None committed |
| `reserveAvailableQuantity` null | **422** | `UnprocessableError` / existing inventory error | Rollback all |
| Phase 29 status claim race (Confirm, etc.) | **409** | `ConcurrentUpdateError` | **Unchanged** |
| Phase 30 dispatch capacity | **422** | `UnprocessableError` | **Unchanged** |

**No new stable error code.**

---

## §20 Idempotency Semantics

| Concept | Phase 32 behavior |
| --- | --- |
| **Duplicate command** | Not introduced — no idempotency keys |
| **Concurrent partial reserve** | Serialized; both deltas may commit cumulatively |
| **Concurrent full reserve same order** | Second fails **422** (status no longer CONFIRMED-eligible) |
| **Status transitions** | Phase 29 governs Confirm/Complete/Cancel claims — unchanged |

**Prohibited:** Idempotency tables, client request IDs, Redis, advisory locks.

---

## §21 Schema Decision

### LOCKED: **NO SCHEMA CHANGE**

- No version column on `rental_orders` or `rental_order_items`
- No idempotency table
- No new reservation ledger
- Serialization uses existing `rental_orders` + `inventory` rows + existing `updateReserve` shape

---

## §22 Architecture Safety

**Preserved:** Clean Architecture, DDD, Repository, UoW, DI, Prisma, PostgreSQL, Better Auth, Zod, REST, existing transaction runners, Phase 29/30/31 semantics.

**Allowed implementation surface:**

- `IRentalOrderRepository.lockForReserveCommand`
- `PrismaRentalOrderRepository` raw SQL `FOR UPDATE` on `rental_orders`
- In-memory RO mutex for tests
- `ReserveRentalOrderService` reorder: move `withReserved` after locks + re-fetch
- T32 concurrency tests

**Prohibited:** New transaction framework, Redis, serializable isolation default, F-02 redesign, removing Phase 31 inventory locks.

---

## §23 Rejected Alternatives

| Alternative | Verdict | Reason |
| --- | --- | --- |
| **Re-fetch only (no RO lock)** | **REJECTED** | Fails multi-line same-order concurrent reserves on different inventory rows |
| **Parent RO lock only (no inventory lock)** | **REJECTED** | Fails cross-order F-02 (Phase 31) |
| **SQL increment on line reservedQuantity** | **REJECTED** | Bypasses `computeStatusAfterReserve` and domain ceiling checks |
| **Stale read + absolute write (status quo)** | **REJECTED** | F-32-01 defect |
| **Advisory locks / Redis / SERIALIZABLE** | **REJECTED** | Phase 29/31 precedent; natural row locks exist |
| **Version column / idempotency table** | **REJECTED** | Schema change unnecessary |
| **Application mutex only** | **REJECTED** | Production must use PostgreSQL `FOR UPDATE` |
| **Replace Phase 31 inventory lock** | **REJECTED** | Cross-order capacity requires inventory serialization |

---

## §24 Acceptance Tests T32.1–T32.12

**Mandatory:** Genuine parallel execution — `Promise.allSettled([...])`. Sequential `await A(); await B();` is **NOT** concurrency coverage.

| ID | Description | Initial state | Parallel ops | Expected |
| --- | --- | --- | --- | --- |
| **T32.1** | Same-order concurrent partial reserve | CONFIRMED, qty 10, reserved 0, inv 10 | T1 +4, T2 +3 | Both succeed; final reserved **7**; inv **7** |
| **T32.2** | Exact cumulative proof | reserved 0 | T1 +4, T2 +3 | Final line **7** (not 4 or 3) |
| **T32.3** | Exceeds remaining line qty | reserved 8, qty 10 | T1 +3, T2 +3 | One **422**; final reserved ≤ 10 |
| **T32.4** | Cross-order regression | Phase 31 fixture capacity 5 | RO-A +5, RO-B +5 | One success, one **422**; committed **5** |
| **T32.5** | Cancel vs reserve | RESERVED/CONFIRMED with hold | cancel + reserve parallel | Consistent; no desync |
| **T32.6** | Confirm vs reserve | DRAFT + CONFIRMED neighbor | confirm + reserve | No change to confirm semantics |
| **T32.7** | Rollback after RO lock | Normal reserve | Force RESERVE failure | No line change, no movement |
| **T32.8** | Sequential partial cumulative | reserved 0 | await +4 then +3 | Final **7** |
| **T32.9** | Multi-line same-order concurrent | 2 lines, 2 products | T1 lineA +4, T2 lineB +3 parallel | Both lines correct; no clobber |
| **T32.10** | Phase 28 source×condition | — | Regression suite | All pass unchanged |
| **T32.11** | Phase 29 concurrency | — | T29.1–T29.6 | All pass unchanged |
| **T32.12** | Phase 30 + 31 regression | — | T30.* + T31.* | All pass unchanged |

---

## §25 Deferred Findings

| ID | Summary | Status |
| --- | --- | --- |
| **F-30-07** / **F-31-02** | Maintenance/repair stock before status claim | **DEFERRED** |
| **F-31-03** | Rental invoice dispatch `pageSize: 100` | **DEFERRED** |
| **F-31-05** | Return receive/inspect atomic claims | **DEFERRED** |
| **F-31-06** / **F-11** | Authorization granularity | **DEFERRED** |
| **F-31-07** / **F-09** | Repair.returnInspectionItemId FK | **DEFERRED** |
| **F-31-08** | UpdateInventory absolute PATCH | **DEFERRED** |
| **F-31-09** / **F-07** | DISPATCHED enum cleanup | **DEFERRED** |
| **F-31-10** | Dispatch/return cancel concurrent claims | **DEFERRED** |
| **F-31-11** | DB CHECK constraints | **DEFERRED** |

**Preserved closed:** F-31-01, F-31-04, Phase 28/29/30.

---

## §26 Implementation Constraints

Implementation MUST:

1. Add `lockForReserveCommand` to rental order repository interface + Prisma + in-memory test double.
2. Rewire `ReserveRentalOrderService` to Phase 32 sequence (§10).
3. Preserve Phase 31 inventory lock + F-02 re-read ordering.
4. Move authoritative `withReserved` to after RO lock + re-fetch.
5. Add T32.1–T32.9 concurrency tests with genuine parallel execution.
6. Run T32.10–T32.12 regression suites.

Implementation MUST NOT:

- Remove or weaken Phase 31 inventory locks
- Change F-02 formula or CONFIRMED policy
- Change `updateReserve` CONFIRMED claim semantics without explicit new lock
- Add schema/migrations
- Modify cancel RELEASE lock sequence (Phase 31)

---

## §27 Required Validation Gates

Post-implementation:

1. T32.1–T32.9 targeted tests (genuine parallelism)
2. Phase 28/29/30/31 regression suites
3. Full test suite
4. `tsc --noEmit`
5. ESLint (0 errors)
6. `prisma validate`
7. `prisma migrate status`
8. Production build
9. `git diff --check`

---

## §28 Git Safety / Stop Conditions

**Stop and report** if:

- `updateReserve` cannot write cumulative state safely without RO lock + re-fetch
- Inventory + RO lock ordering cannot be enforced in existing UoW
- Schema change appears necessary
- F-02 formula or CONFIRMED policy would need to change

This decision-lock task: **documentation only** — no commit, no push.

---

## §29 OPEN DECISIONS

**OPEN DECISIONS: NONE**

All implementation choices required for Phase 32 are locked in §7–§20.

---

## §30 Final Verdict

**PROPOSED — READY FOR IMPLEMENTATION**

Phase 32 closes F-32-01 by **inventory locks (Phase 31) + parent rental_orders `FOR UPDATE` + post-lock re-fetch + fresh `withReserved`**, preserving cross-order F-02 serialization and cumulative partial-reserve semantics. **No schema change.**

Implementation may proceed after this lock is accepted.

---

*End of Phase 32 Decision Lock*
