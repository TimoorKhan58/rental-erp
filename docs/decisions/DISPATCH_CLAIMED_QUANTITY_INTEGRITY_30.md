# Phase 30 — Dispatch Claimed-Quantity Integrity Decision Lock

**Document:** Dispatch Claimed-Quantity Integrity v1.0  
**Status:** PROPOSED — READY FOR IMPLEMENTATION  
**Date:** 2026-08-17  
**Baseline HEAD:** `d0ded6c5698bc12544ad81d43e78b7697a033ebd` (`feat(concurrency): harden workflow command idempotency`)  
**Parent audit:** `docs/audits/PHASE_30_ENTERPRISE_GAP_AUDIT.md`  
**Parent phase:** Phase 29 — Concurrent-Safe Command Idempotency (`docs/decisions/CONCURRENT_SAFE_COMMAND_IDEMPOTENCY_29.md`)

---

## 1. Decision Status

**PROPOSED — READY FOR IMPLEMENTATION**

All mandatory questions in the Phase 30 decision-lock brief are resolved below with explicit choices, evidence, and rejected alternatives.

---

## 2. Problem Statement

Dispatch **claimed-quantity integrity** is currently enforced by application code that:

1. Loads prior dispatch records through **`findPaged({ page: 1, pageSize: 100 })`**
2. Sums claimed quantities **in memory**
3. Validates the new dispatch against `RentalOrderItem.reservedQuantity` (owned) and external rental allocation (external)
4. Inserts the new dispatch

This single defect family manifests as three audited findings:

| ID | Symptom |
| --- | --- |
| **F-05** | `CreateDispatchService` / `UpdateDispatchService` under-count claimed quantity when a rental order has **more than 100** non-cancelled dispatches → over-dispatch allowed |
| **F-30-05** | `CancelRentalOrderService` scans only the first 100 dispatches → may cancel an order that still has active dispatches |
| **F-30-06** | `syncRentalOrderStatusFromReturns` considers only the first 100 dispatches → return-driven RO status (`RETURNED` / `PARTIALLY_RETURNED` / `COMPLETED`) may be wrong |

Additionally, the read → validate → create pattern is **TOCTOU**: two concurrent dispatch creations can observe the same claimed aggregate and both succeed, exceeding permitted quantities even when fewer than 100 dispatches exist.

Phase 29 explicitly deferred this family (Phase 29 decision §21, F-05) pending a decision on authoritative aggregate strategy and concurrency mechanism. This document locks that decision.

---

## 3. Repository Baseline

| Attribute | Value |
| --- | --- |
| Branch | `main` |
| HEAD | `d0ded6c5698bc12544ad81d43e78b7697a033ebd` |
| Phase 29 commit | `d0ded6c5698bc12544ad81d43e78b7697a033ebd` |
| Working tree (at lock authoring) | Clean except untracked audit document |
| Ahead of `origin/main` | 8 commits |
| Push | NOT PERFORMED |

---

## 4. Authoritative Existing Rules

The following rules **MUST NOT change** in Phase 30:

| Lock / rule | Source | Phase 30 impact |
| --- | --- | --- |
| **External rental sourcing isolation** — external qty never enters `Inventory.quantityOnHand` | `docs/decisions/EXTERNAL_RENTAL_SOURCING_25.5.1.md` BD-3 | Preserve owned/external split on dispatch items |
| **Mixed return source × condition** | `docs/decisions/MIXED_RETURN_SOURCE_CONDITION_ATTRIBUTION_28.md` | No change to return completion |
| **ERA cancellation / RO cascade** | `docs/decisions/EXTERNAL_RENTAL_CANCELLATION_25.5.9.md`, `RENTAL_ORDER_EXTERNAL_RENTAL_CANCELLATION_25.11.md` | No change |
| **Phase 29 concurrency primitives** — CompleteReturn, CompleteDispatch, ConfirmRO, ERA workflow deltas, inventory OUT/IN/ADJUSTMENT | `docs/decisions/CONCURRENT_SAFE_COMMAND_IDEMPOTENCY_29.md` | CompleteDispatch remains Phase 29 scope; not redesigned |
| **F-02 date-aware availability formula** | `rental-order.availability.rules.ts` | NOT modified (F-30-08 deferred) |
| **Analytics Metric Contract** — Active Rental = CONFIRMED + RESERVED | `docs/decisions/ANALYTICS_METRIC_CONTRACT_v1.0.md` | No metric redefinition |
| **`RentalOrderItem.reservedQuantity` semantics** — owned-stock reservation only; not reduced on dispatch complete | `prisma/schema.prisma` L585–586; `dispatch.rules.ts` L150–153 | Claim ceiling for **owned** dispatch remains `reservedQuantity` |
| **Dispatch cancel releases claim** — CANCELLED dispatches excluded from rollup | `dispatch.rules.ts` L173–176 | Preserved |
| **Eligible RO statuses for dispatch create** — CONFIRMED, RESERVED, ON_RENT | `dispatch.constants.ts` L34–38 | Preserved |

---

## 5. Current Dispatch Quantity Model

### Data model (unchanged)

```
RentalOrder
  └── RentalOrderItem
        quantity            — commercial line qty
        reservedQuantity    — owned-stock reservation (F-01); NOT reduced on dispatch complete
        └── DispatchItem (via rentalOrderItemId)
              quantity          — total dispatch line qty
              ownedQuantity     — owned portion (nullable → legacy fully-owned)
              externalQuantity  — external portion (nullable → 0)

Dispatch
  status — DRAFT | READY | DISPATCHED | COMPLETED | CANCELLED
  └── DispatchItem[]
```

There is **no** persisted `dispatchedQuantity` counter on `RentalOrderItem` today (`prisma/schema.prisma` L577–601).

### Current create flow

```
CreateDispatchService.execute
  → dispatchRepository.findPaged({ page: 1, pageSize: 100, rentalOrderId })   // DEFECT
  → sumClaimedSourceDispatchQuantitiesByRentalOrderItem(items)                 // domain
  → buildExternalRemainingByItem(ERA, claimed.external)
  → validateRentalOrderForDispatch(RO, newItems, claimed.owned, externalRemaining)
  → dispatchRepository.create(...)
  → audit CREATE
```

Evidence: `create-dispatch.service.ts` L114–153.

### Current update flow (DRAFT only)

Same paged rollup with `{ excludeDispatchId: existing.id }`.  
Evidence: `update-dispatch.service.ts` L129–138.

### Current return-sync flow (separate rollup purpose)

```
syncRentalOrderStatusFromReturns
  → findPaged({ pageSize: 100 })                        // DEFECT
  → filter status === COMPLETED
  → sum item.quantity per rentalOrderItemId
  → compare to completed return quantities
  → claimStatusTransition (Phase 29)
```

Evidence: `sync-rental-order-status-from-returns.ts` L27–52.

---

## 6. Current Defects

### F-05 — Paged rollup + TOCTOU on create/update

| Aspect | Detail |
| --- | --- |
| Files | `create-dispatch.service.ts` L114–118; `update-dispatch.service.ts` L129–133 |
| Deterministic bug | Only first 100 dispatch records participate in `sumClaimedSourceDispatchQuantitiesByRentalOrderItem` |
| Concurrency bug | Two transactions read identical stale aggregate before either inserts |
| Domain logic | Correct **when input set is complete** (`dispatch.rules.ts` L198–234) |

### F-30-05 — Paged active-dispatch guard on RO cancel

| Aspect | Detail |
| --- | --- |
| File | `cancel-rental-order.service.ts` L88–97 |
| Bug | `find(... status !== CANCELLED)` on page-1 only → cancel may succeed while active dispatches exist on page 2+ |

### F-30-06 — Paged completed-dispatch rollup on return sync

| Aspect | Detail |
| --- | --- |
| File | `sync-rental-order-status-from-returns.ts` L27–36 |
| Bug | RO may never reach `COMPLETED` / `RETURNED` when >100 dispatches exist |

### Related (out of Phase 30 scope)

| ID | Reason excluded |
| --- | --- |
| F-30-07 | Maintenance/repair status-claim family — §17 |
| F-30-08 | F-02 date-aware commitment family — §18 |

---

## 7. Claimed-Quantity Definition

### LOCKED: two distinct rollups

Phase 30 locks **two** aggregates. They MUST NOT be conflated.

#### Rollup A — **Dispatch claim against reservation** (create / update validation)

**Purpose:** Prevent dispatching more than permitted owned reservation and external allocation.

**Scope:** All dispatches for a rental order where `Dispatch.status !== 'CANCELLED'`.

**Per `rentalOrderItemId` (fallback `productId` when item id null — legacy only):**

```
ownedClaimed(itemKey) =
  Σ dispatch_item.ownedQuantity
    ?? dispatch_item.quantity          -- legacy null-owned rows count fully owned
  over all non-CANCELLED dispatches for the rental order

externalClaimed(itemKey) =
  Σ dispatch_item.externalQuantity ?? 0
  over all non-CANCELLED dispatches for the rental order
```

**Validation ceilings:**

```
ownedClaimed + newOwned  ≤  RentalOrderItem.reservedQuantity
externalClaimed + newExternal  ≤  ExternalRentalAgreementItem.quantityAllocated - externalClaimed
                                 (via buildExternalRemainingByItem pattern)
```

**Authoritative domain implementation today:**  
`sumClaimedSourceDispatchQuantitiesByRentalOrderItem` — `dispatch.rules.ts` L150–154, L198–234.

**Included dispatch statuses:** `DRAFT`, `READY`, `DISPATCHED`, `COMPLETED` — all except `CANCELLED`.

**Excluded:** `CANCELLED` only.

**Not included in owned claim:** `DispatchItem.quantity` total when `ownedQuantity`/`externalQuantity` are set — owned and external are validated separately.

#### Rollup B — **Completed dispatch quantity for return reconciliation** (return sync)

**Purpose:** Determine whether all physically completed dispatch quantities have been returned.

**Scope:** Dispatches where `Dispatch.status === 'COMPLETED'`.

**Per `rentalOrderItemId`:**

```
dispatchedCompletedQty(itemId) =
  Σ dispatch_item.quantity
  over COMPLETED dispatches for the rental order
```

**Authoritative implementation today:**  
`sync-rental-order-status-from-returns.ts` L44–52 (logic correct; input set truncated).

**Note:** Return sync uses **total `quantity`**, not owned/external split — return reconciliation is line-total based. This matches existing behavior and Phase 28 return semantics.

---

## 8. Authoritative Aggregate Strategy

### LOCKED choice: **Derived SQL aggregate from `dispatch_items` (no new counter column)**

| Option | Verdict |
| --- | --- |
| **A. Derived SUM from `dispatch_items` ⋈ `dispatches` (SELECT)** | **SELECTED** |
| B. Persist `RentalOrderItem.dispatchedQuantity` counter | **REJECTED** — see §26 |
| C. Continue `findPaged` with higher pageSize | **REJECTED** — does not fix concurrency; still truncates eventually |
| D. Client-side full unpaged `findMany` into memory | **REJECTED** — wasteful; duplicates DB capability; still TOCTOU without serialization |

### Rationale

1. **Dispatch items are already the business source of truth** for what was claimed (`dispatch.rules.ts` L150–153).
2. **Cancel releases claims automatically** by setting `Dispatch.status = CANCELLED` — no counter decrement sync.
3. **Update DRAFT dispatch** replaces item rows — derived SUM reflects edits without counter maintenance.
4. **Phase 29 deferred** counter placement precisely because duplication creates sync burden (Phase 29 §21 F-05).
5. **PostgreSQL aggregate SUM** eliminates silent truncation with no migration.

### New repository primitives (implementation phase — names locked)

| Method | Purpose | SQL shape |
| --- | --- | --- |
| `sumClaimedSourceQuantitiesByRentalOrderId(rentalOrderId, { excludeDispatchId? })` | Rollup A | `GROUP BY rental_order_item_id` with `status <> 'CANCELLED'` filter; separate owned/external sums with `COALESCE(owned_quantity, quantity)` |
| `existsNonCancelledDispatchByRentalOrderId(rentalOrderId)` | F-30-05 guard | `EXISTS (SELECT 1 FROM dispatches WHERE rental_order_id = $1 AND status <> 'CANCELLED')` |
| `findCompletedDispatchesByRentalOrderId(rentalOrderId)` | Rollup B | `WHERE rental_order_id = $1 AND status = 'COMPLETED'` — **unbounded**, include items |

**Rule:** Integrity paths MUST NOT call `findPaged` with a page cap. `findPaged` remains for UI list screens only.

In-memory repositories in tests MUST mirror the same aggregate semantics (consistent with Phase 29 test strategy).

---

## 9. Concurrency Strategy

### LOCKED choice: **Parent-row PostgreSQL lock + derived aggregate re-read within existing UoW**

Within the existing `IDispatchTransactionRunner.run` / `IRentalOrderTransactionRunner.run` transaction:

```
BEGIN (existing UoW)
  1. SELECT id FROM rental_orders WHERE id = $rentalOrderId FOR UPDATE
  2. claimed := sumClaimedSourceQuantitiesByRentalOrderId(rentalOrderId [, excludeDispatchId])
  3. domain validate new/edited items against claimed + RO + ERA
  4. IF validation fails → ROLLBACK → HTTP 422
  5. dispatchRepository.create / update items
  6. audit (existing)
COMMIT
```

### Why this strategy

| Criterion | Assessment |
| --- | --- |
| PostgreSQL + Prisma + READ COMMITTED | Compatible — `FOR UPDATE` row lock on `rental_orders` serializes creators for the same order |
| Existing UoW | Preserved — lock lives inside current transaction runner |
| Phase 29 patterns | Complementary — Phase 29 hardened **terminal transitions**; Phase 30 hardens **aggregate claim before insert** |
| No schema change | Satisfied |
| No advisory / distributed locks | Satisfied |
| No client idempotency keys | Satisfied |

### Rejected concurrency alternatives

| Alternative | Rejection reason |
| --- | --- |
| Persisted counter + `{ increment: delta }` predicate | Requires migration; duplicate state; must sync on cancel, DRAFT edit, delete; Phase 29 deferred this explicitly |
| `SERIALIZABLE` isolation default | Not project convention; broader blast radius |
| Advisory locks | Phase 29 / Phase 30 brief prohibit unless absolutely necessary |
| Optimistic version column | Phase 29 deferred; not needed when parent-row lock suffices |
| Predicated INSERT subquery only (no lock) | Two concurrent INSERTs can still race under READ COMMITTED without serialization |
| `SELECT FOR UPDATE` on each `rental_order_items` row | Acceptable variant but parent RO lock is simpler and sufficient (one order serialized at a time) |

**Clarification vs Phase 29:** Phase 29 prohibited `SELECT FOR UPDATE` as the **default status-transition** mechanism. Phase 30 uses row lock for **aggregate claim serialization**, not for status predicates. Status claims remain `updateMany` expected-status pattern from Phase 29.

---

## 10. Dispatch Creation Semantics

### Successful path (unchanged API contract)

1. Parse + domain-validate input (existing).
2. **Lock** rental order row (`FOR UPDATE`).
3. **SQL aggregate** Rollup A (complete, not paged).
4. Resolve external remaining from ERA (existing `buildExternalRemainingByItem`).
5. `validateRentalOrderForDispatch` (existing domain — unchanged formulas).
6. Conflict check on `dispatchNumber` uniqueness (existing).
7. `dispatchRepository.create`.
8. Audit CREATE (existing).
9. Return `DispatchDto` (unchanged shape).

**No inventory mutation on create** — unchanged.

### Rejected concurrent create — explicit outcomes

#### Scenario 1: `reservedQuantity = 10`, two concurrent creates each request owned qty 10

| Transaction | Result |
| --- | --- |
| T1 (first to acquire lock) | Validates `0 + 10 ≤ 10` → succeeds → claimed owned = 10 |
| T2 (waits on lock) | After T1 commit, reads aggregate owned = 10 → validates `10 + 10 ≤ 10` → **fails** |
| Final state | Exactly **one** dispatch created; **ownedClaimed = 10** |

#### Scenario 2: `reservedQuantity = 10`, existing ownedClaimed = 7, two concurrent creates each request owned qty 3

| Transaction | Result |
| --- | --- |
| T1 | `7 + 3 ≤ 10` → succeeds → ownedClaimed = 10 |
| T2 | `10 + 3 ≤ 10` → **fails** |
| Final state | ownedClaimed = **10** (never 13) |

#### Scenario 3: >100 existing non-cancelled dispatches, new create within remaining capacity

Aggregate SUM includes **all** rows — validation uses true claimed total (T30.3).

### HTTP error on rejected create (capacity exceeded)

**HTTP 422 Unprocessable Entity** — existing domain validation path via `UnprocessableError` / `DispatchInvalidItemError`.

**NOT HTTP 409 `CONCURRENT_UPDATE`** for capacity exhaustion — the loser after serialization failed a **business capacity rule**, not a status claim race. This matches existing create validation behavior.

---

## 11. Dispatch Cancellation Semantics

### LOCKED: cancellation releases claim immediately

`CancelDispatchService` sets `Dispatch.status = 'CANCELLED'` (`cancel-dispatch.service.ts` L42–60).

Rollup A excludes `CANCELLED` (`dispatch.rules.ts` L206–208).

**Effect:** Owned and external claimed quantities from that dispatch **stop counting** toward reservation ceilings **immediately** on cancel commit.

**No counter decrement** required (derived aggregate model).

**Inventory:** Cancel dispatch (DRAFT/READY only) does not perform OUT/RELEASE today — unchanged.

**Phase 30 note:** Cancel dispatch still uses plain `updateStatus` (pre–Phase 29 pattern). Concurrent cancel-vs-complete on the **same dispatch** is out of Phase 30 scope (CompleteDispatch is Phase 29–safe). Optional future hardening — not Phase 30.

---

## 12. RentalOrder Cancellation Guard

### LOCKED: existence query — not paged rollup

Replace:

```typescript
dispatchRepository.findPaged({ page: 1, pageSize: 100, ... })
```

With:

```typescript
dispatchRepository.existsNonCancelledDispatchByRentalOrderId(rentalOrderId)
```

**Semantics:** If **any** dispatch with `status <> 'CANCELLED'` exists for the rental order → reject RO cancel with existing `UnprocessableError` message (`cancel-rental-order.service.ts` L100–108).

**Rationale:** Cancel guard is boolean existence, not quantity aggregation. `EXISTS` is exact, O(1) with index on `(rentalOrderId, status)`, and cannot truncate.

**Lock ordering:** Unchanged — guard runs before `cancelIfCancellable` claim (existing L113–118).

---

## 13. Return Synchronization

### LOCKED: unbounded COMPLETED dispatch fetch — reuse repository primitive

Replace paged fetch in `syncRentalOrderStatusFromReturns` with:

```typescript
dispatchRepository.findCompletedDispatchesByRentalOrderId(rentalOrderId)
```

Then apply existing Rollup B logic unchanged (L44–106).

**Reuse rule:** Return sync MUST NOT implement a separate SQL aggregate with different filters. It uses the same repository access pattern as integrity paths — one method, one filter (`status = 'COMPLETED'`), unbounded.

**Phase 29 compatibility:** RO status transition inside sync remains `claimStatusTransition` (L114–118) — unchanged.

---

## 14. Reservation Interaction

| Concept | Meaning | Phase 30 relationship |
| --- | --- | --- |
| `RentalOrderItem.quantity` | Commercial line quantity | Upper bound for reservation, not directly dispatch claim ceiling |
| `RentalOrderItem.reservedQuantity` | **Owned-stock reservation** on the line (warehouse pool held for this order) | **Ceiling for Rollup A owned claim** — `ownedClaimed + newOwned ≤ reservedQuantity` |
| Rollup A owned claim | Sum of owned dispatch qty on non-cancelled dispatches | Derived from `dispatch_items`; must not exceed `reservedQuantity` |
| Rollup A external claim | Sum of external dispatch qty | Validated against ERA `quantityAllocated - externalClaimed`; never touches `Inventory` |
| `Inventory.reservedQuantity` | Physical warehouse reservation pool | Mutated by RESERVE/RELEASE stock movements on reserve/cancel RO — **separate layer** |
| `Inventory.quantityOnHand` | Physical stock | Mutated on dispatch **complete** (OUT), not on dispatch **create** |

**Locked invariant:**

```
∀ line: ownedClaimed(line) ≤ reservedQuantity(line)
```

**NOT Phase 30 scope:** Changing how `reservedQuantity` is set (reserve flow), F-02 date-aware capacity, or inventory pool semantics.

**Complete dispatch does not reduce `RentalOrderItem.reservedQuantity`** — existing (`dispatch.rules.ts` L152–153). Claim totals remain after complete; return reconciliation uses Rollup B on COMPLETED dispatches.

---

## 15. Source / Ownership Semantics

### LOCKED: preserve Phase 25.5 / Phase 28 source split

| Dimension | Rule |
| --- | --- |
| Owned claim | `ownedQuantity ?? quantity` per item — legacy null fields = fully owned |
| External claim | `externalQuantity ?? 0` |
| Validation | `resolveDispatchSourceSplit` + `validateDispatchItemsAgainstRentalOrder` — unchanged |
| External remaining | `quantityAllocated - externalClaimed` from ERA — unchanged |
| Inventory | Only **owned** portions drive warehouse OUT on **complete** — unchanged (Phase 29) |
| External custody | External portions increment ERA `quantityDispatched` on complete — unchanged (Phase 29) |

Phase 30 changes **how claimed totals are loaded and serialized**, not **how source split is calculated**.

---

## 16. Phase 29 Concurrency Compatibility

| Area | Phase 29 guarantee | Phase 30 impact |
| --- | --- | --- |
| `CompleteDispatchService` | `claimStatusTransition(READY→DISPATCHED)` before OUT/RELEASE/ERA/audit | **No change** |
| RO → `ON_RENT` | Atomic claim | **No change** |
| `CompleteReturnService` | Claim before side effects | **No change** |
| ERA dispatch counter | Predicated SQL increment | **No change** |
| Inventory OUT/IN | Safe primitives | **No change** |
| `CreateDispatchService` | Not in Phase 29 scope | **Phase 30 adds lock + SQL aggregate** |
| `UpdateDispatchService` | Not in Phase 29 scope | **Phase 30 adds lock + SQL aggregate (DRAFT edit path)** |
| `CancelRentalOrderService` dispatch guard | Not in Phase 29 scope | **Phase 30 fixes EXISTS query** |
| `syncRentalOrderStatusFromReturns` | Phase 29 RO claim | **Phase 30 fixes dispatch input set** |

**CompleteDispatch MUST NOT be modified** except if a regression test requires import path adjustment — no semantic change.

---

## 17. F-30-07 Scope Decision

### **DEFERRED**

**Finding:** Maintenance/repair services apply stock IN/OUT before atomic status claims (`start-maintenance.service.ts`, `complete-repair.service.ts`).

**Reason:** This belongs to the **terminal transition / side-effect ordering** family hardened in Phase 29 (F-01, F-04), not dispatch claimed-quantity accounting. Different aggregates, different repositories, different acceptance tests.

**Follow-up reference:** Phase 31 candidate — "Maintenance/Repair claim-before-side-effect" (same pattern as Phase 29 F-01).

**Phase 30 MUST NOT** modify maintenance or repair modules.

---

## 18. F-30-08 Scope Decision

### **DEFERRED**

**Finding:** `AVAILABILITY_COMMITMENT_STATUSES` excludes `CONFIRMED` (`rental-order.availability.rules.ts` L34–38). Overlapping CONFIRMED orders do not reduce each other's date-aware availability until reserve.

**Reason:** This is the **F-06 / F-02 date-aware availability serialization** family (`docs/decisions/CONCURRENT_SAFE_COMMAND_IDEMPOTENCY_29.md` §21 F-06). It concerns **period capacity commitment**, not **dispatch item quantity rollup**.

**Phase 30 MUST NOT:**

- Add CONFIRMED to commitment statuses
- Change F-02 formula
- Modify `ReserveRentalOrderService` availability checks

**Follow-up reference:** Phase 31+ decision lock for F-06.

---

## 19. Schema / Migration Decision

### LOCKED: **NONE**

No new columns, constraints, indexes, or migrations in Phase 30.

**Rationale:** Derived SQL aggregates + parent-row lock achieve exact semantics without duplicated counter state.

**Optional future (non–Phase 30):** PostgreSQL CHECK constraints on dispatch item source split (`owned + external = quantity`) — not required for this phase.

---

## 20. Error Semantics

| Failure | HTTP | Stable code | When |
| --- | --- | --- | --- |
| Dispatch would exceed owned reservation | **422** | `UNPROCESSABLE_ENTITY` (existing) | After lock + aggregate, domain validation fails |
| Dispatch would exceed external allocation | **422** | existing | Same |
| Duplicate dispatch number | **409** | `CONFLICT` (existing) | Unchanged uniqueness check |
| RO cancel with active dispatch | **422** | existing | Unchanged message |
| Concurrent status claim races | **409** | `CONCURRENT_UPDATE` | Phase 29 paths only — not introduced for dispatch create capacity |

**No new stable error code** is required for Phase 30.

**API consumers:** After 422 on create, refetch dispatches and remaining capacity before retry. No idempotency-key header contract.

---

## 21. Transaction / UoW Decision

### LOCKED: preserve existing transaction runners

| Operation | Runner | Change |
| --- | --- | --- |
| Create dispatch | `IDispatchTransactionRunner` | Add lock + aggregate inside existing `run` callback |
| Update dispatch (items) | `IDispatchTransactionRunner` | Same |
| Cancel rental order | `IRentalOrderTransactionRunner` | Replace paged guard only |
| Return sync | Called inside return complete UoW | Replace paged fetch only |

**Prohibited:** New transaction framework, nested transactions, split lock transaction.

**Lock scope:** One `rental_orders` row per create/update. Lock duration: from aggregate read through dispatch insert/update — typically milliseconds.

---

## 22. API Compatibility

| Endpoint | Request | Response | Change |
| --- | --- | --- | --- |
| `POST /dispatches` | Unchanged schema | Unchanged `DispatchDto` on success | None on happy path |
| `PATCH /dispatches/:id` | Unchanged | Unchanged on success | None on happy path |
| Failure paths | — | 422 where over-capacity (existing type) | **Stricter correctness** — previously silent over-dispatch now rejected |

No DTO shape changes. No new query parameters. No new headers.

---

## 23. Audit / Notification Safety

### Create / update dispatch

| Side effect | Ordering |
| --- | --- |
| Audit CREATE/UPDATE | **After** successful lock + validation + persist |
| Notification | None on create today — unchanged |
| Inventory | None on create — unchanged |
| Document number | Generated before insert (existing); duplicate number still 409 before lock waste — acceptable |

**Rejected concurrent create produces:**

- ❌ No dispatch row
- ❌ No audit row
- ❌ No inventory mutation
- ❌ No notification

### RO cancel / return sync

Existing audit/notification ordering preserved. Only dispatch **queries** change.

---

## 24. Acceptance Tests

All concurrency scenarios MUST use **`Promise.allSettled`** (or equivalent genuine parallel execution). Sequential await is **not** acceptable for T30.1, T30.2.

| ID | Scenario | Expected outcome |
| --- | --- | --- |
| **T30.1** | RO line `reservedQuantity=10`; two parallel `CreateDispatch` each owned qty 10 | Exactly **1 fulfilled**, **1 rejected** (422); final ownedClaimed = **10** |
| **T30.2** | `reservedQuantity=10`, existing ownedClaimed=7; two parallel creates each owned qty 3 | Exactly **1 fulfilled**, **1 rejected**; final ownedClaimed = **10** (not 13) |
| **T30.3** | RO with **>100** non-cancelled dispatches; create within true remaining capacity | **Success** — validation uses full aggregate |
| **T30.3b** | RO with **>100** dispatches; create exceeding true remaining | **422** rejection |
| **T30.4** | RO with **>101** dispatches (one active on page 2+) | **Cancel RO rejected** (422 active dispatch) |
| **T30.5** | RO with **>100** dispatches all COMPLETED; returns complete for all | `syncRentalOrderStatusFromReturns` → RO **COMPLETED** |
| **T30.6** | Create dispatch (claimed=5) → cancel dispatch | Rollup A ownedClaimed **decreases by 5**; new create with remaining capacity **succeeds** |
| **T30.7** | Parallel `CompleteDispatch` same dispatch | Phase 29 regression — **1 success, 1 × 409**; single OUT |
| **T30.8** | Phase 28 source×condition suite | **14/14 pass** — zero modifications |
| **T30.9** | External-source dispatch create + complete | External qty **never** increases `quantityOnHand`; ERA counter predicated increment unchanged |

**Test infrastructure:** In-memory repositories must mirror SQL aggregate + lock semantics (consistent with Phase 29 concurrency tests).

---

## 25. Non-Goals

Phase 30 explicitly does **NOT**:

- Implement F-06 / F-30-08 (date-aware serialization)
- Implement F-30-07 (maintenance/repair claims)
- Implement F-07 (DISPATCHED enum cleanup)
- Implement F-09 (Repair FK)
- Implement F-11 (authorization granularity)
- Add `RentalOrderItem.dispatchedQuantity` or any counter column
- Add client idempotency keys or idempotency tables
- Add optimistic version columns
- Add advisory locks or distributed locks
- Change F-02 availability formula or commitment status set
- Change Phase 28 source×condition rules
- Change analytics KPI definitions
- Redesign dispatch / rental-order domain model
- Harden `CancelDispatchService` status claim (optional future)
- Modify frontend (optional better 422 messaging — not required)

---

## 26. Decision Alternatives Rejected

| Alternative | Why rejected |
| --- | --- |
| **Persist `dispatchedQuantity` on `RentalOrderItem`** | Duplicates `dispatch_items`; requires sync on cancel, DRAFT item edit, and migration; Phase 29 deferred pending this decision; SUM is authoritative without drift |
| **Raise `pageSize` to 1000 / 10000** | Still truncates; does not fix TOCTOU |
| **Application-level unpaged `findMany` into memory** | Memory-heavy; still TOCTOU without lock; wrong layer for aggregate |
| **`SERIALIZABLE` default** | Not existing convention; performance / deadlock risk |
| **Advisory lock on rental order id** | Brief prohibits unless necessary; row lock sufficient |
| **HTTP 409 for capacity failure** | Semantically a business rule violation (422), not a concurrent state claim |
| **Include F-30-07 / F-30-08 in Phase 30** | Different defect families — would blur scope and violate audit prioritization |

---

## 27. Architecture Safety

Unchanged:

- Next.js, TypeScript, Prisma, PostgreSQL, Better Auth
- Clean Architecture, DDD, Repository Pattern, Unit of Work, DI
- Zod validation, REST API route runners
- Module boundaries (`dispatch`, `rental-order`, `return`, `external-rental`)
- Phase 29 concurrency primitives
- All prior decision locks (§4)

---

## 28. Implementation Boundaries

### Expected production changes (implementation phase only)

| File / area | Change |
| --- | --- |
| `dispatch.repository.interface.ts` | Add `sumClaimedSourceQuantitiesByRentalOrderId`, `existsNonCancelledDispatchByRentalOrderId`, `findCompletedDispatchesByRentalOrderId` |
| `prisma-dispatch.repository.ts` | Implement SQL aggregate + EXISTS + unbounded completed fetch; implement `lockRentalOrderForDispatchClaim(rentalOrderId)` or equivalent on rental-order repo |
| `prisma-rental-order.repository.ts` | Parent-row `FOR UPDATE` helper (if not on dispatch repo) |
| `create-dispatch.service.ts` | Replace `findPaged` with lock + aggregate |
| `update-dispatch.service.ts` | Same (DRAFT item edit path) |
| `cancel-rental-order.service.ts` | Replace paged guard with `existsNonCancelled...` |
| `sync-rental-order-status-from-returns.ts` | Replace paged fetch with `findCompletedDispatchesByRentalOrderId` |
| In-memory test repositories | Mirror new methods |

### MUST NOT change

- `complete-dispatch.service.ts` semantics
- `complete-return.service.ts` semantics
- `prisma/schema.prisma`
- Phase 29 ERA / inventory repository primitives
- Authorization routes
- Frontend

### Expected test additions

- `dispatch.concurrency.30.application.test.ts` (T30.1, T30.2, T30.3)
- `rental-order.cancel-dispatch-guard.30.application.test.ts` (T30.4)
- `rental-order.return-sync.30.application.test.ts` (T30.5)
- Extensions to existing cancel/create suites (T30.6)

---

## 29. Final Decision

Phase 30 locks **dispatch claimed-quantity integrity** as follows:

1. **Claimed quantity** remains **derived from non-cancelled `dispatch_items`**, split owned/external per existing domain rules — no new counter column.
2. **All integrity paths** use **exact SQL aggregates or EXISTS** — never paged rollups.
3. **Concurrent dispatch create/update** serializes on the **parent `rental_orders` row (`FOR UPDATE`)** inside the existing UoW, then re-reads aggregate, then validates, then persists.
4. **Over-capacity rejection** returns **HTTP 422** (existing business error) — not 409.
5. **RO cancel** uses **`EXISTS` active dispatch** — not paged scan.
6. **Return sync** uses **unbounded COMPLETED dispatch fetch** — Rollup B logic unchanged.
7. **Cancel dispatch** releases claims by `CANCELLED` status — no counter maintenance.
8. **Complete dispatch**, **Phase 29 paths**, **F-02**, **Phase 28**, and **schema** remain untouched.
9. **F-30-07** and **F-30-08** are **DEFERRED**.

---

## 30. Decision-Lock Readiness

**READY FOR IMPLEMENTATION**

No open business ambiguities remain. Implementation may proceed after explicit approval of this document without further architectural decisions.

---

*End of Phase 30 Decision Lock*
