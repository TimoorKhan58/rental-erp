# Phase 31 — Date-Aware Availability Serialization Decision Lock

**Document:** Date-Aware Availability Serialization v1.0  
**Status:** PROPOSED — READY FOR IMPLEMENTATION  
**Date:** 2026-08-17  
**Baseline HEAD:** `bbe89b4420128bf1fdc03f8d874263fbfda4db9c` (`feat(dispatch): harden claimed-quantity integrity`)  
**Parent audit:** `docs/audits/PHASE_31_ENTERPRISE_GAP_AUDIT.md`  
**Parent phases:** Phase 29 (`CONCURRENT_SAFE_COMMAND_IDEMPOTENCY_29.md`), Phase 30 (`DISPATCH_CLAIMED_QUANTITY_INTEGRITY_30.md`)

---

## §1 Executive Verdict

**PROPOSED — READY FOR IMPLEMENTATION**

Phase 31 closes **F-31-01 (F-06)**: the F-02 date-aware availability **TOCTOU race** on `ReserveRentalOrderService` by serializing competing reservations on the **shared physical capacity resource** — the **`inventory` row (product × warehouse)** — using PostgreSQL **`SELECT … FOR UPDATE`**, then **re-reading** the unbounded F-02 commitment projection and validating **before** persisting reservation mutations.

Phase 31 **does not** redesign the F-02 formula, **does not** change commitment status membership (F-31-04 resolved: **CONFIRMED remains excluded**), and **requires no schema change**.

---

## §2 Problem Statement

F-02 date-aware availability is computed correctly in **pure domain code** (`calculateDateAwareAvailabilitySnapshot`) and loaded via an **unbounded** repository projection (`findAvailabilityCommitmentLines`). However, `ReserveRentalOrderService` currently:

1. Reads F-02 availability via `GetDateAwareAvailabilityService` (read-only, outside any capacity lock).
2. Mutates rental order state via `updateReserve`.
3. Mutates global inventory via `RESERVE` stock movements (`reserveAvailableQuantity`).

Steps 1–3 are not atomically coupled to a **shared serialization resource** across **different rental orders** competing for the same product × warehouse and overlapping rental periods.

**Observed defect (F-31-01):** Two concurrent reserve commands (RO-A and RO-B) can both observe the same `dateAwareAvailableQuantity`, both pass validation, both commit, and **over-commit period capacity**.

**Why Phase 30 parent-row lock is insufficient:** Phase 30 locks the **parent `rental_orders` row** for **dispatch claimed quantity** on a **single order**. RO-A and RO-B are **different rental orders**; locking RO-A does not block RO-B. F-02 contention is on **shared inventory capacity**, not a single order row.

Evidence: `reserve-rental-order.service.ts` L111–247 — availability read (L145–169) precedes `updateReserve` (L173–182) and inventory `RESERVE` (L230–246) with no cross-order lock.

---

## §3 Audit Findings Covered

| Finding | Resolution in this lock |
| --- | --- |
| **F-31-01** (F-06) | **IN SCOPE** — inventory-row `FOR UPDATE` + F-02 re-read + 422 on capacity failure |
| **F-31-04** (F-30-08) | **IN SCOPE** — explicit policy: CONFIRMED **excluded** from F-02 commitment (status set unchanged) |

**Explicitly NOT covered (deferred):** F-31-02, F-31-03, F-31-05–F-31-12, F-11, F-09, F-07.

---

## §4 Authoritative Existing Decision Locks

This lock **preserves** and **does not modify**:

| Document | Preserved rules |
| --- | --- |
| `ANALYTICS_METRIC_CONTRACT_v1.0.md` | Active Rental = CONFIRMED + RESERVED (analytics ≠ F-02 commitment) |
| `EXTERNAL_RENTAL_SOURCING_25.5.1.md` | External hire-in never enters owned inventory (BD-3) |
| `EXTERNAL_RENTAL_CANCELLATION_25.5.9.md` | ERA cancel/settlement semantics |
| `RENTAL_ORDER_EXTERNAL_RENTAL_CANCELLATION_25.11.md` | RO cancel ↔ ERA cascade |
| `MIXED_RETURN_SOURCE_CONDITION_ATTRIBUTION_28.md` | Source × condition isolation |
| `CONCURRENT_SAFE_COMMAND_IDEMPOTENCY_29.md` | Phase 29 status-claim / 409 semantics; F-02 formula frozen; F-06 deferred to this phase |
| `DISPATCH_CLAIMED_QUANTITY_INTEGRITY_30.md` | Phase 30 dispatch integrity; Phase 30 §18 deferred F-30-08 to this phase for **policy resolution only** (not formula redesign) |

---

## §5 Current F-02 Availability Contract

**Locked formula** (pure domain — `rental-order.availability.rules.ts`):

| Concept | Definition |
| --- | --- |
| **Period** | Inclusive UTC calendar-day `[startDate, endDate]`; overlap iff `startA ≤ endB AND startB ≤ endA` |
| **Commitment statuses** | `AVAILABILITY_COMMITMENT_STATUSES` = `RESERVED`, `ON_RENT`, `PARTIALLY_RETURNED` |
| **Per-line commitment** | `undispatchedHold = max(0, reservedQuantity − non-CANCELLED owned dispatch claims)`; `outstandingOut = max(0, COMPLETED owned dispatch qty − COMPLETED owned return qty)`; `commitmentQty = undispatchedHold + outstandingOut` |
| **Snapshot** | `baseCapacity = quantityOnHand + Σ outstandingOut (all consuming lines)`; `dateAwareCommitted = Σ commitmentQty` of **overlapping** consuming lines; `dateAwareAvailable = max(0, baseCapacity − dateAwareCommitted)` |
| **Owned vs external in claims** | Dispatch/return claims use `ownedQuantity ?? quantity` / `ownedReturnedQuantity ?? returnedQuantity` — external portions do not consume owned hold |
| **Repository projection** | `findAvailabilityCommitmentLines({ productId, warehouseId, excludeRentalOrderId? })` — **unbounded** `findMany`, filtered by commitment statuses |
| **Read service** | `GetDateAwareAvailabilityService` — read-only; no mutations |

**Phase 31 changes:** serialization mechanism only. **Formula and status set unchanged** unless §6 explicitly states otherwise (it does not change the formula).

---

## §6 F-31-04 Commitment Policy Decision

### LOCKED POLICY: **Soft Confirm — CONFIRMED does NOT consume F-02 date-aware commitment**

**Decision:** **`CONFIRMED` rental orders do NOT contribute to F-02 date-aware commitment lines.**

**Rationale (repository-grounded):**

1. **Code:** `AVAILABILITY_COMMITMENT_STATUSES` (`rental-order.availability.rules.ts` L34–38) excludes `CONFIRMED`. Repository filter (`prisma-rental-order.repository.ts` L136–138) uses this set exclusively.
2. **Domain comment:** F-02 commitment is explicitly **distinct from analytics Active Rentals** (L90–93): analytics counts CONFIRMED + RESERVED; F-02 counts only post-reserve operational holds.
3. **Lifecycle:** `withConfirmed()` does not set `reservedQuantity`. CONFIRMED lines have `reservedQuantity = 0`; `commitmentQty` would be 0 even if status were included without a formula change.
4. **Tests:** F-02 regression tests assert `"CONFIRMED filtered → commitment = 0"` (`get-date-aware-availability.service.test.ts`, `f02-date-aware-availability.regression.test.ts`, `reserve-rental-order.date-aware.test.ts`).
5. **Phase 30 lock:** §18 deferred F-30-08 to this phase for **explicit policy confirmation**, not automatic inclusion of CONFIRMED.

**Business meaning:** Confirmation records **commercial intent** (booking pipeline / analytics Active Rental) but **does not bind date-aware owned capacity**. Capacity is consumed when inventory is **reserved** (`RESERVED` status and/or `reservedQuantity > 0` on the line).

**Phase 31 concurrency fix applies at the reserve boundary**, not at confirm.

**Rejected alternative:** Include CONFIRMED in commitment — would require either (a) changing `AVAILABILITY_COMMITMENT_STATUSES`, or (b) using `item.quantity` instead of `reservedQuantity` for CONFIRMED lines — **both are formula/status-set changes forbidden by this lock**.

---

## §7 RentalOrder Status Commitment Matrix

| RentalOrder status | Counts toward date-aware F-02 commitment? | Reason |
| --- | --- | --- |
| **DRAFT** | **No** | Not in `AVAILABILITY_COMMITMENT_STATUSES`; no operational hold |
| **CONFIRMED** | **No** | **Locked policy §6** — soft confirm; excluded from repository filter and domain status gate |
| **RESERVED** | **Yes** | In `AVAILABILITY_COMMITMENT_STATUSES`; `reservedQuantity > 0` drives `undispatchedHold` |
| **DISPATCHED** | **No** | Ephemeral / non-lasting for RO (`isAvailabilityCommitmentStatus` false); not in commitment status set |
| **ON_RENT** | **Yes** | In commitment set; dispatch/return claims affect `commitmentQty` via formula |
| **PARTIALLY_RETURNED** | **Yes** | In commitment set |
| **RETURNED** | **No** | Terminal; not in commitment status set |
| **COMPLETED** | **No** | Terminal; not in commitment status set |
| **CANCELLED** | **No** | Terminal; excluded; `clearReservedQuantitiesOnCancel` releases holds |

**Partial reservation:** An order may remain **CONFIRMED** when some lines have `0 < reservedQuantity < quantity` (`computeStatusAfterReserve` returns CONFIRMED until all lines fully reserved). Only the **reserved portion** contributes via `reservedQuantity` once status transitions to consuming statuses.

---

## §8 Serialization Strategy

### LOCKED: **PostgreSQL row lock on `inventory` (product × warehouse parent row)**

**Selected mechanism:** `SELECT id FROM inventory WHERE id = $inventoryId FOR UPDATE` (via new repository helper) inside the **existing** rental-order UoW transaction.

**Rejected alternatives:**

| Candidate | Verdict | Reason |
| --- | --- | --- |
| **A. Parent `rental_orders` FOR UPDATE** | **REJECTED** | Serializes only one order; **does not** block RO-A vs RO-B (§2) |
| **B. PostgreSQL advisory lock** | **REJECTED** | Phase 29 default prohibition; unnecessary when a natural row lock exists; Phase 30/31 precedent is table `FOR UPDATE` |
| **C. Serializable isolation** | **REJECTED** | Phase 29 §22 prohibits as default; not required for predicated row-lock pattern |
| **D. Dedicated capacity/commitment row** | **REJECTED** | Requires schema change; F-02 already derived from existing tables |
| **E. Inventory row FOR UPDATE** | **SELECTED** | Natural shared resource for product × warehouse; one row per SKU per warehouse; aligns with Phase 30 `FOR UPDATE` precedent on authoritative parent row |

**Clarification vs Phase 29:** Phase 29 discouraged `FOR UPDATE` as the **default status-transition** mechanism. Phase 30/31 use `FOR UPDATE` for **aggregate/capacity serialization** where cross-command contention shares a parent row — same architectural exception documented in Phase 30 lock.

---

## §9 Shared Capacity Lock Resource

| Attribute | Value |
| --- | --- |
| **Resource** | **`inventory` table row** — one row per `(productId, warehouseId)` |
| **Why authoritative** | F-02 `baseCapacity` derives from `inventory.quantityOnHand` + outstanding-out restoration; global `reserveAvailableQuantity` mutates the same row's `reservedQuantity` |
| **Lock granularity** | One lock per distinct inventory row touched by the reserve (or cancel-release) command |
| **Cross-order serialization** | RO-A and RO-B reserving the same product in the same warehouse contend on the **same inventory row** |
| **New repository method** | `IInventoryRepository.lockForAvailabilityCommit(inventoryId: InventoryId): Promise<void>` — infrastructure only; raw SQL `FOR UPDATE` |
| **In-memory tests** | Async mutex keyed by `inventoryId` scoped to UoW (same pattern as Phase 30 `dispatch-claim-lock.ts`) |

**Not locked:** Individual `rental_order_items` rows — unnecessary when inventory parent row serializes capacity decisions for the SKU.

---

## §10 Lock Acquisition Ordering

### LOCKED deterministic order

When a command requires **more than one** inventory row (multi-product reserve on one rental order — single `warehouseId`):

1. Resolve all target `inventoryId` values for products in the reserve request.
2. **Sort by `inventoryId` ascending** (lexicographic UUID order).
3. Acquire `lockForAvailabilityCommit` **in sorted order** — no interleaving with other commands.

**Existing precedent:** `reserve-rental-order.service.ts` L226–228 already sorts `reserveTargets` by `inventoryId` before `RESERVE` movements. Phase 31 extends this ordering to **lock acquisition before F-02 re-read**.

**Multi-warehouse:** A single rental order has one `warehouseId` (`existing.warehouseId`). Multi-warehouse contention across orders is serialized per inventory row independently.

**Deadlock prevention:** Any code path acquiring multiple inventory locks MUST use the same **`inventoryId` ascending** rule (reserve, cancel-release, and future capacity mutators).

---

## §11 Transaction Boundary

| Operation | Transaction runner | Boundary |
| --- | --- | --- |
| **Reserve** | `IRentalOrderTransactionRunner` | Single existing `run()` callback — lock, F-02 re-read, validate, `updateReserve`, `RESERVE` movements, audit — **one commit** |
| **Cancel (inventory RELEASE)** | `IRentalOrderTransactionRunner` | Same runner; inventory row lock(s) acquired **before** RELEASE movements that affect `reservedQuantity` |

**Prohibited:**

- F-02 read outside the locked transaction section for reserve validation
- Nested transactions or separate lock transaction
- External I/O (notifications) before commit — notifications remain post-commit or unchanged existing placement

**Rollback:** Any failure after lock acquisition rolls back the entire UoW — no partial reservation, no partial `updateReserve`, no partial stock movement.

---

## §12 Reservation Command Sequence

**Derived from** `ReserveRentalOrderService` + this lock. **Mandatory order:**

```
BEGIN IRentalOrderTransactionRunner
  1. findById(rentalOrderId) — 404 if missing
  2. Domain pre-validation: withReserved(reserveItems) — status/line rules (unchanged)
  3. Aggregate deltaByProduct from request (unchanged)
  4. Resolve inventory row per productId + warehouseId
  5. Sort inventoryIds ascending
  6. FOR EACH inventoryId: lockForAvailabilityCommit(inventoryId)
  7. FOR EACH product delta:
       a. assertValidAvailabilityPeriod(line dates)
       b. GetDateAwareAvailabilityService.execute({ productId, warehouseId, period, excludeRentalOrderId })
       c. IF deltaQuantity > dateAwareAvailableQuantity → 422 (stop)
  8. updateReserve (atomic CONFIRMED→RESERVED claim + item reservedQuantity persist)
       — IF null → 422 (status no longer CONFIRMED)
  9. FOR EACH reserveTarget (inventoryId sorted):
       executeCreateStockMovementInScope(RESERVE) → reserveAvailableQuantity
       — IF null → fail transaction (422 or existing inventory error mapping)
 10. auditLogger.log SUCCESS
COMMIT
```

**Key invariant:** Step 7 **must** run **after** step 6 (locks held). Step 8–9 **must** run **after** step 7 passes.

**Preserved from current code:** `updateReserve` before per-line `RESERVE` movements (L173 before L230) — both remain inside one transaction; rollback covers ordering risk.

---

## §13 Availability Re-Read Requirement

| Rule | Detail |
| --- | --- |
| **When** | After all required `inventory` row locks acquired, **before** any reservation mutation |
| **What** | Full `GetDateAwareAvailabilityService.execute` per product delta — includes fresh `findAvailabilityCommitmentLines` + `calculateDateAwareAvailabilitySnapshot` |
| **Exclude self** | `excludeRentalOrderId: existing.id` — unchanged; reserving order must not double-count its prior hold |
| **Unbounded** | Commitment lines query remains **unpaged** — no `pageSize` cap |
| **No caching** | Pre-lock reads (current L145–169) are superseded by post-lock re-read for **mutation authority**; post-lock snapshot is the only authority for step 7 validation |

---

## §14 Concurrent Outcome Semantics

**Scenario:** `dateAwareAvailableQuantity = 5` after locks.

| Request | Outcome |
| --- | --- |
| RO-A reserve delta 5 | **Success** — commits RESERVED + RESERVE movement |
| RO-B reserve delta 5 (concurrent) | **Blocks on inventory lock** → re-read shows 0 available → **422 failure** |

**Losers MUST NOT:**

- Call `updateReserve` successfully (or if `updateReserve` ran in same txn, entire txn rolls back)
- Increment `inventory.reservedQuantity`
- Create `RESERVE` stock movements
- Emit success audit for reserve

**Same rental order concurrent reserve:** `updateReserve` `updateMany WHERE status = CONFIRMED` — only one winner; loser gets `null` → **422** (existing behavior).

**Final committed capacity:** Sum of overlapping `commitmentQty` after winners ≤ `baseCapacity` — never over-committed.

---

## §15 Partial Reservation Semantics

### LOCKED: **Incremental partial reserve supported; no auto-fill**

| Behavior | Detail |
| --- | --- |
| **Multiple reserve calls** | Supported — `applyReserveToItems` cumulates `reservedQuantity` (`rental-order.rules.ts` L182) |
| **Status after partial** | `computeStatusAfterReserve` → stays **CONFIRMED** until all lines `reservedQuantity >= quantity` |
| **Request delta vs availability** | **All-or-nothing per request:** if `deltaQuantity > dateAwareAvailableQuantity` → **422**; system does **not** auto-reserve only the available portion |
| **Line ceiling** | `updatedReservedQuantity > item.quantity` → domain error (unchanged) |

**Example:** available = 6, request delta = 10 → **reject 10** (422). Operator must submit a new request with delta ≤ 6.

---

## §16 Cancellation Interaction

**Scope:** `CancelRentalOrderService` inventory **RELEASE** path must participate in the same serialization.

**Locked sequence (capacity-relevant portion):**

```
BEGIN IRentalOrderTransactionRunner
  … existing cancel guards (existsNonCancelled dispatch, etc.) …
  cancelIfCancellable (atomic status claim)
  Resolve inventory rows for release lines (product × warehouse)
  Sort inventoryIds ascending
  FOR EACH: lockForAvailabilityCommit(inventoryId)
  FOR EACH: executeCreateStockMovementInScope(RELEASE)
  clearReservedQuantities
  … audit, ERA cascade …
COMMIT
```

**Outcomes:**

- Cancel **releases** commitment; a concurrent reserve blocked on the same inventory lock waits, then re-reads **updated** (lower) `dateAwareCommitted` — may succeed.
- **CANCELLED** orders never appear in commitment projection — no stale capacity consumption.
- Cancel and reserve **cannot** both commit contradictory capacity — serialized on inventory row lock.

---

## §17 Confirmation Interaction

**Under locked §6 policy (CONFIRMED excluded):**

| Question | Answer |
| --- | --- |
| Does Confirm change F-02 commitment? | **No** — DRAFT→CONFIRMED; no `reservedQuantity` change; not in commitment status set |
| Does Confirm require inventory lock? | **No** — no capacity mutation |
| Confirm concurrent with Reserve on another RO? | Confirm does not affect F-02; Reserve uses inventory lock independently |

**Confirm concurrency:** Phase 29 `claimStatusTransition(DRAFT→CONFIRMED)` unchanged — 409 on concurrent confirm races.

---

## §18 Dispatch and Return Interaction

**No Phase 31 changes** to dispatch, complete-dispatch, or return workflows (Phase 29/30 locks preserved).

**F-02 commitment already reflects dispatch/return via formula:**

| Event | F-02 effect |
| --- | --- |
| Reserve | Adds `undispatchedHold` via `reservedQuantity` |
| Dispatch (non-CANCELLED) | Increases dispatch claims → reduces `undispatchedHold` |
| Complete dispatch (COMPLETED) | Moves qty to `outstandingOut` side of formula |
| Complete return (COMPLETED owned) | Reduces `outstandingOut` |
| ON_RENT / PARTIALLY_RETURNED | Status in commitment set — lines remain in projection |

**Phase 31 does not** add reservation locks to dispatch/return — those paths use Phase 30 dispatch parent-row lock and Phase 29 return claims respectively.

---

## §19 External Rental Isolation

**LOCKED unchanged (BD-3 / Phase 28 / External Rental Sourcing 25.5.1):**

- External hire-in quantities **never** increase owned `quantityOnHand` or owned F-02 `baseCapacity`.
- F-02 dispatch/return claims use **owned portions only** in commitment math (`ownedQuantity ?? quantity`).
- External rental agreement counters, custody, and settlement remain **Phase 29** atomic primitives — **not modified** in Phase 31.
- Sourcing shortfall reads (`GetRentalOrderShortfallService`, `SourceRentalOrderExternallyService`) remain **read-only**; Phase 31 does not add locks to external rental writes.

**T31.7** verifies external isolation regression.

---

## §20 Date and Time Semantics

**LOCKED — preserve existing F-02 contract:**

| Rule | Source |
| --- | --- |
| Comparison basis | **UTC calendar-day** keys (`toUtcCalendarDay`) |
| Period validity | Inclusive `[startDate, endDate]`; `start = end` valid (one day) |
| Overlap | Inclusive: `startA ≤ endB AND startB ≤ endA` |
| Line dates | Per `RentalOrderItem.eventStartDate` / `eventEndDate` (mapped from item `startDate`/`endDate` in projection) |
| Timezone | **UTC** for F-02 overlap; `@db.Date` / ISO date-only values must not shift via local TZ |
| Adjacent periods | Non-overlapping if one ends before other starts on calendar-day boundary |
| Same-day rental | Valid; overlap if periods share calendar days |

**No redesign** of date fields, timezone policy, or overlap function.

---

## §21 Deadlock Prevention

| Rule | Detail |
| --- | --- |
| **Multi-lock ordering** | Always `inventoryId` ascending |
| **Lock before read** | `lockForAvailabilityCommit` before F-02 re-read |
| **Lock before mutate** | All locks acquired before `updateReserve` / `RESERVE` / `RELEASE` |
| **No lock during I/O** | No notification enqueue or external API calls while holding inventory locks |
| **Single transaction** | All steps in one `IRentalOrderTransactionRunner` callback |
| **Consistent across workflows** | Reserve and cancel-release use **identical** ordering rule |

---

## §22 Error / HTTP Semantics

| Failure | HTTP | Error type | When |
| --- | --- | --- | --- |
| F-02 capacity exhausted (post-lock) | **422** | `UnprocessableError` | `deltaQuantity > dateAwareAvailableQuantity` — **same message family** as today (`"Insufficient date-aware availability for the requested rental period"`) |
| RO not CONFIRMED at `updateReserve` | **422** | `UnprocessableError` | `updateReserve` returns null — unchanged |
| Global inventory RESERVE failure after F-02 pass | **422** | `UnprocessableError` or existing inventory error | `reserveAvailableQuantity` returns null — transaction rolls back |
| Phase 29 status claim race (Confirm, Complete, etc.) | **409** | `ConcurrentUpdateError` | **Unchanged** — not used for F-02 capacity |
| Phase 30 dispatch capacity | **422** | `UnprocessableError` | **Unchanged** |

**No new stable error code** required for Phase 31.

**Capacity vs concurrency:** F-02 over-commit is a **business capacity failure (422)**, not a Phase 29 status-transition race (409).

---

## §23 Schema Decision

### LOCKED: **NO SCHEMA CHANGE**

- No new Prisma models
- No migrations
- No capacity ledger / commitment counter table
- No idempotency table
- No optimistic version column
- No new CHECK constraints (optional defense-in-depth remains deferred)

Serialization uses existing `inventory` row + existing F-02 derived aggregates.

---

## §24 API Contract

| Aspect | Decision |
| --- | --- |
| **Happy-path request/response** | Unchanged — same reserve endpoint, same DTO shapes |
| **Success semantics** | Unchanged |
| **New failure visibility** | Concurrent over-capacity reserve returns **422** (correct behavior; previously silent over-commit) |
| **409** | Reserved for Phase 29 status claims only |
| **Client retry** | On 422 capacity, refetch date-aware availability and adjust requested delta |

---

## §25 Architecture Safety

**Preserved:**

- Clean Architecture / DDD / Repository / UoW / DI
- Prisma + PostgreSQL
- Better Auth + route-level permissions (unchanged)
- Zod validation at application boundary
- Existing transaction runners (`IRentalOrderTransactionRunner`, `IDispatchTransactionRunner`, etc.)

**Prohibited:**

- Generic concurrency framework
- Redis / distributed locks
- Serializable isolation as default
- New transaction layer
- F-02 formula or status-set redesign
- Phase 28 / Phase 30 semantic changes

**Allowed implementation surface:**

- `IInventoryRepository.lockForAvailabilityCommit`
- `PrismaInventoryRepository` raw SQL `FOR UPDATE`
- In-memory inventory mutex for tests
- `ReserveRentalOrderService` reorder: lock → re-read → validate → mutate
- `CancelRentalOrderService` inventory lock before RELEASE
- New concurrency acceptance tests T31.x

---

## §26 Acceptance Tests T31.1–T31.12

**Mandatory:** Genuine parallel execution — `Promise.allSettled([...])` or equivalent. **Sequential `await A(); await B();` is NOT concurrency coverage.**

| ID | Description |
| --- | --- |
| **T31.1** | Concurrent overlapping reserves: capacity 5, RO-A delta 5 + RO-B delta 5 → exactly one success, one **422**, final committed = 5 |
| **T31.2** | Concurrent partial deltas exercising all-or-nothing rejection (e.g. available 6, two concurrent requests for 10 — one succeeds only if combined fits; verify no over-commit) |
| **T31.3** | Multi-product reserve: one RO two products; concurrent RO competes on one SKU — deterministic lock order, no deadlock |
| **T31.4** | Multi-warehouse: two ROs same product different warehouses — independent success (separate inventory rows) |
| **T31.5** | Cancel vs reserve race: cancel releases capacity; concurrent reserve may succeed after cancel — no contradictory final state |
| **T31.6** | CONFIRMED policy: overlapping CONFIRMED orders do **not** reduce F-02 availability; overlapping **RESERVED** orders **do** |
| **T31.7** | External rental isolation: external dispatch/return claims do not reduce owned F-02 availability incorrectly |
| **T31.8** | Date boundaries: same-day, adjacent non-overlap, partial overlap per existing F-02 matrix |
| **T31.9** | Rollback: forced failure after lock (e.g. `reserveAvailableQuantity` null) — no `RESERVE` movement, no `updateReserve` persist |
| **T31.10** | Phase 28 source×condition regression — all tests pass unchanged |
| **T31.11** | Phase 29 concurrency regression — T29.1–T29.6 pass unchanged |
| **T31.12** | Phase 30 dispatch integrity — T30.1–T30.8 pass unchanged |

---

## §27 Non-Goals / Deferred Findings

| ID | Summary | Status |
| --- | --- | --- |
| **F-31-02** (F-30-07) | Maintenance/repair stock before status claim | **DEFERRED** — separate phase |
| **F-31-03** | Rental invoice `pageSize: 100` dispatch rollup | **DEFERRED** |
| **F-31-05** | Return receive/inspect atomic claims | **DEFERRED** |
| **F-31-06** (F-11) | Authorization granularity | **DEFERRED** |
| **F-31-07** (F-09) | Repair.returnInspectionItemId FK | **DEFERRED** |
| **F-31-08** | UpdateInventory absolute PATCH bypass | **DEFERRED** |
| **F-31-09** (F-07) | DISPATCHED ghost enum cleanup | **DEFERRED** |
| **F-31-10** | Dispatch/return cancel concurrent claims | **DEFERRED** (P3) |
| **F-31-11** | DB CHECK constraints | **DEFERRED** (optional) |
| Include CONFIRMED in F-02 commitment | Alternative policy | **REJECTED** — §6 |

---

## §28 Implementation Constraints

Implementation MUST:

1. Add `lockForAvailabilityCommit` to inventory repository interface + Prisma + in-memory test double.
2. Rewire `ReserveRentalOrderService` to lock → F-02 re-read → validate → mutate (§12).
3. Rewire `CancelRentalOrderService` RELEASE path to acquire same locks (§16).
4. Preserve F-02 formula, status set, date semantics, and external isolation.
5. Map capacity failures to **422** (§22).
6. Add T31.1–T31.9 concurrency tests with genuine parallel execution.
7. Run T31.10–T31.12 regression suites.

Implementation MUST NOT:

- Modify Phase 29/30 workflow semantics outside reserve/cancel-release locking
- Add schema/migrations
- Change `AVAILABILITY_COMMITMENT_STATUSES`
- Use parent `rental_orders` lock as the cross-order serialization mechanism
- Introduce advisory locks or serializable isolation

---

## §29 Open Decisions

**OPEN DECISIONS: NONE**

All implementation choices required for Phase 31 are locked in §6–§25.

---

## §30 Final Decision-Lock Verdict

**PROPOSED — READY FOR IMPLEMENTATION**

Phase 31 eliminates F-31-01 by **inventory-row `FOR UPDATE`**, **post-lock F-02 re-read**, and **422 on capacity failure**, without changing the F-02 formula. F-31-04 is resolved: **CONFIRMED remains excluded** from date-aware commitment (soft-confirm policy). **No schema change.**

Implementation may proceed after this lock is accepted.

---

*End of Phase 31 Decision Lock*
