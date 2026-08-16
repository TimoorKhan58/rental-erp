# Concurrent-Safe Command Idempotency — Phase 29

## 1. Status

| Attribute | Value |
| --- | --- |
| Decision status | **PROPOSED — READY FOR IMPLEMENTATION** |
| Date | 2026-08-14 |
| Baseline commit | `b78e2578f1f14551c52fd4beceb706ca00a9a486` (`feat(external-rental): rental-order picker + next-step hint in UI`) |
| Parent business checkpoint | `e963a8b` (Phase 28.2 — mixed return source × condition attribution) |
| Phase | 29 |
| Scope | Backend hardening of workflow command semantics only |

This document is a decision lock. It is **not** an implementation. Implementation is a separate phase that is only permitted **after this document is accepted**.

---

## 2. Executive Decision

Every once-only workflow command in MT-ERP must be made concurrency-safe by:

1. **Claiming its expected state atomically at the database** using `updateMany({ where: { id, status: <expected>, ... }, data: { status: <next>, ... } })` and rejecting when `count === 0`.
2. **Mutating counters atomically** using either Prisma `{ increment / decrement }` operators or the existing predicated raw-SQL pattern (`UPDATE ... WHERE <invariant>`), never by writing pre-computed absolute values based on a stale in-memory read.
3. **Ordering `CompleteReturnService` and `CompleteDispatchService`** so that the atomic status claim occurs **before** any inventory or external-custody side effects, all inside the existing UoW `$transaction` so that a downstream failure rolls the claim back automatically.
4. **Surfacing lost claims** as a single new domain error `ConcurrentUpdateError` (subclass of the existing `ConflictError`) with a stable machine code `CONCURRENT_UPDATE` and HTTP status **409**.

No schema change, no new UoW layer, no client-side idempotency keys, no version columns, no domain-rule changes.

---

## 3. Problem Statement

Every workflow mutation currently follows the pattern:

```
findById(id) → domain.assertCan*() + domain.withX() → repository.update({ where: { id }, data: <absolute> })
```

Inside a PostgreSQL `$transaction` at **READ COMMITTED** (the default; not overridden — see `src/shared/infrastructure/database/transaction-manager.ts` L12–16). This means:

- Two operators (or a client retry after a network 502, or a page reload during an in-flight `POST`, or a double-click) that fire the same command concurrently both pass the in-memory `assertCan*` guard, both compute a new absolute counter, and both write it. The last writer wins, silently double-mutating inventory, external custody, and money.
- `CompleteReturnService` compounds this by applying **all** inventory and ERA side effects **before** the terminal status flip, so even a synchronous retry after a mid-call crash double-restocks.

This is a class defect that spans at least five mutating services (F-01, F-02, F-03, F-04, F-08) and multiple aggregates (`Inventory`, `ExternalRentalAgreement`, `RentalOrder`, `Dispatch`, `Return`).

---

## 4. Evidence / Findings

All findings were substantiated during the Phase 29 Enterprise Gap Audit by reading production code at HEAD `b78e257`.

### F-01 — CompleteReturnService: side effects before terminal status; no expected-status predicate

- `src/modules/return/application/services/complete-return.service.ts` L174–199 fire owned `RELEASE` + `IN` stock movements.
- Same file L218–284 mutate ERA custody via `externalRentalRepository.updateWorkflow`.
- The terminal `returnRepository.updateStatus(existing.id, { status: completed.status, completedAt })` runs only at L287–290.
- `src/modules/return/infrastructure/repositories/prisma-return.repository.ts` `updateStatus` is a plain `db.return.update({ where: { id } })` — no `status: "INSPECTED"` predicate.
- Domain guard `withCompleted()` requires `INSPECTED` **in memory**; the DB row is never re-checked.

**Impact:** Two concurrent `POST /api/returns/{id}/complete` on the same INSPECTED return both restock owned inventory and both increment ERA `customerReturned`.

### F-02 — ExternalRentalAgreement: absolute counter and money writes with no expected-status predicate

- `src/modules/external-rental/infrastructure/repositories/prisma-external-rental.repository.ts` `updateWorkflow` (L234–248) is a plain `db.externalRentalAgreement.update({ where: { id } })`.
- `src/modules/external-rental/infrastructure/mappers/external-rental.persistence.mapper.ts` `toExternalRentalWorkflowUpdateInput` (L148–172) writes **absolute values** for `status`, `settlementStatus`, `totalHireInCost`, `amountDue`, `amountPaid`, and every item counter (`quantityConfirmed / Received / Allocated / Dispatched / ReturnedFromCustomer / ReturnedToSupplier / WrittenOff` + `lineHireInCost`).
- All eight workflow services (`Create / Confirm / Receive / Allocate / SupplierReturn / WriteOff / Settle / Cancel`) route through this mapper.

**Impact:** Two concurrent Receive/Allocate/SupplierReturn/WriteOff calls silently lose a delta. Two concurrent Settle calls silently lose a **real payment**.

### F-03 — Inventory: OUT / IN / ADJUSTMENT use read → compute → plain absolute write

- `src/modules/inventory/infrastructure/repositories/prisma-inventory.repository.ts` `update` (L186–221) does `findById` → `Inventory.reconstitute` → `db.inventory.update({ where: { id } })`.
- `src/modules/stock-movement/application/services/create-stock-movement-in-scope.ts` L50–58 calls that `update` for every non-RESERVE / non-RELEASE movement (OUT, IN, ADJUSTMENT).
- The safe predicated-SQL pattern already exists in the same repository for RESERVE (`reserveAvailableQuantity`, L227–276) and RELEASE (`releaseReservedQuantity`, L283–331) — it just is not used for the ledger movements.

**Impact:** Two concurrent OUT(3) with `quantityOnHand=10` both read 10 and both write 7 → final on-hand 7 instead of 4. Negative-stock protection depends on a stale read.

### F-04 — CompleteDispatchService: no atomic claim; combined with F-03, doubles OUT

- `src/modules/dispatch/application/services/complete-dispatch.service.ts` L105–109 status flip and L178–185 OUT.
- `src/modules/dispatch/infrastructure/repositories/prisma-dispatch.repository.ts` `updateStatus` is a plain `update` — no `status: "READY"` predicate.
- The external branch further calls `externalRentalRepository.updateWorkflow` with an absolute new `quantityDispatched` — inherits F-02.

**Impact:** Two concurrent `POST /api/dispatches/{id}/complete` both fire OUT and both bump ERA `quantityDispatched`. If the RO transitions `→ ON_RENT` in one and not the other, the audit and notification trail also duplicate.

### F-08 — RentalOrder: `updateStatus` is a plain update

- `src/modules/rental-order/infrastructure/repositories/prisma-rental-order.repository.ts` `updateStatus` (L406–420) is `db.rentalOrder.update({ where: { id } })`.
- Callers: `confirm-rental-order.service.ts:70`, `complete-dispatch.service.ts:263`, `sync-rental-order-status-from-returns.ts:109`.

**Impact:** Two concurrent Confirm requests both emit `RENTAL_ORDER_CONFIRMED` notifications and audit rows. Duplicate side effects, no state corruption of the RO itself.

### Settlement domain semantics (§23 verification)

- `src/modules/external-rental/domain/external-rental.entity.ts` `withPaymentRecorded` (L708–747) computes `amountPaid = roundMoney(this.amountPaid + paymentAmount)` and asserts `amountPaid <= amountDue`.
- Test `external-rental.domain.test.ts:475–484` confirms two sequential partial payments accumulate (1000 → 2500 SETTLED).

**Verdict:** Settlement is unambiguously **additive**. Multiple concurrent partial payments MUST both be accepted when their sum stays within `amountDue`. This decision lock does **not** treat settlement as a once-only command.

---

## 5. Terminology

| Term | Definition (for this decision lock only) |
| --- | --- |
| **Once-only workflow command** | A workflow command whose domain semantics dictate a single successful application per aggregate lifecycle. Examples: `ConfirmRentalOrder`, `ConfirmExternalRental`, `CompleteDispatch`, `CompleteReturn`, `CancelRentalOrder`, `CancelExternalRental`. |
| **Additive workflow command** | A workflow command that legitimately runs multiple times, each successful call contributing a delta bounded by a domain invariant. Examples: `SettleExternalRental` (adds `paymentAmount`), `ReceiveExternalRental` (adds `quantity` per item, bounded by `confirmed`), `AllocateExternalRental` (bounded by `received`), `SupplierReturnExternalRental` (bounded by company-custody qty), `WriteOffExternalRental` (bounded by company-custody qty), Inventory `OUT` / `IN` / `ADJUSTMENT`. |
| **Command idempotency** (this phase) | Guarantee that a once-only command applies its side effects at most once, and that an additive command's counter cannot lose a legitimate delta or exceed a bounded invariant, regardless of concurrency, retries, or double-submits. This is achieved by DB-side predicates and atomic operators, **not** by client-provided idempotency keys. |
| **Atomic state claim** | An `updateMany({ where: { id, status: <expected>, ...otherPreconditions }, data: { status: <next> } })` executed inside the existing transaction. If the affected row count is `0`, the transaction throws `ConcurrentUpdateError`, which rolls back everything else. If the count is `1`, the transition is safely owned by this call. |
| **Atomic counter mutation** | Either a Prisma `{ increment: delta }` / `{ decrement: delta }` operator, or a predicated raw-SQL `UPDATE ... SET counter = counter + $1 WHERE <invariant on counter>` that returns 1 row on success and 0 on invariant violation. |
| **Concurrency safety** | The property that no interleaving of concurrent transactions can produce a state that violates the domain invariants declared by the entity `assertCan*` / `with*` methods. |
| **`ConcurrentUpdateError`** | New domain-application error to be introduced during implementation. Subclass of the existing `ConflictError` (`src/shared/infrastructure/errors/app-error.ts:88`). Stable machine code `CONCURRENT_UPDATE`. HTTP status 409. |
| **409 Conflict** | The HTTP response returned to API consumers when an atomic state claim or a predicated counter mutation fails because another transaction owned the state or violated the bounded invariant. |

This phase **does not** introduce client-provided idempotency keys, request-hash deduplication, or a global idempotency store.

---

## 6. Goals

- G-1: Every once-only workflow command applies its side effects **exactly once** per aggregate lifecycle under any concurrency, retry, or duplicate-submit pattern.
- G-2: Every additive workflow counter mutation is **loss-free** and enforces its domain invariant at the database.
- G-3: `quantityOnHand` non-negativity is enforced at the DB for every ledger movement, not by a stale application read.
- G-4: `CompleteReturnService` and `CompleteDispatchService` claim their terminal status **before** applying inventory or external-custody side effects, with rollback tied to the existing UoW `$transaction`.
- G-5: Introduce a single new error path (`ConcurrentUpdateError` → HTTP 409 `CONCURRENT_UPDATE`) that API consumers can rely on for retry logic.
- G-6: All existing happy paths and all Phase 28 source × condition tests remain green.

## 7. Non-Goals

Phase 29 explicitly excludes:

- Client-provided idempotency keys.
- A generic idempotency-key store or request-hash deduplication table.
- Optimistic concurrency with an aggregate-wide `version` column.
- F-02 date-aware availability serialization (F-06 — separate phase).
- Create-dispatch claimed-quantity rollup redesign (F-05 — separate phase).
- Cleanup of the ghost `RentalOrder.DISPATCHED` enum (F-07).
- Adding a foreign key to `Repair.returnInspectionItemId` (F-09).
- Authorization granularity improvements — `inventory:adjust` enforcement, `notifications:send`, expense-category delete permission, expense-submit permission, rental-invoice convert-missing-to-loss (F-11).
- Any accounting / GL / SupplierPayment feature.
- Any generic inventory-source abstraction, workflow engine, event-sourcing, or CQRS redesign.
- Any distributed lock, advisory-lock framework, or cross-service coordination.
- Any change to Phase 28 source × condition attribution rules or F-02 formula.
- Frontend redesign or feature-layer refactoring beyond surfacing the new 409 error.
- Any unrelated refactor.

---

## 8. Locked Invariants

The following invariants MUST hold under any concurrent, retried, or duplicate-submit workload after Phase 29 lands.

### Inventory (`Inventory` aggregate)

- I-INV-1: `quantityOnHand >= 0` at all times.
- I-INV-2: `reservedQuantity >= 0` at all times (already enforced by `releaseReservedQuantity` predicate).
- I-INV-3: `reservedQuantity + delta <= quantityOnHand` for every RESERVE (already enforced by `reserveAvailableQuantity` predicate).
- I-INV-4: A single stock movement corresponds to exactly one persisted `InventoryTransaction` row and exactly one atomic mutation of `quantityOnHand` / `reservedQuantity`.

### External custody (`ExternalRentalAgreement` + items)

- I-ERA-1: `quantityReceived <= quantityConfirmed` per item.
- I-ERA-2: `quantityAllocated <= quantityReceived` per item.
- I-ERA-3: `quantityDispatched <= quantityAllocated` per item.
- I-ERA-4: `quantityReturnedFromCustomer <= quantityDispatched` per item.
- I-ERA-5: `quantityReturnedToSupplier + quantityWrittenOff <= quantityReturnedFromCustomer` per item (existing domain rule via `withSupplierReturned` / `withWrittenOff`).
- I-ERA-6: A successful additive counter mutation contributes its full delta; no delta is silently discarded.
- I-ERA-7: Cancellation is only reachable when status ∈ {`DRAFT`, `CONFIRMED`} (existing Phase 25.5.9 lock).

### Financial (ERA money)

- I-FIN-1: `amountPaid <= amountDue` at all times (existing domain rule in `withPaymentRecorded`).
- I-FIN-2: Every concurrent `settle` request that passes I-FIN-1 at commit time contributes its full `paymentAmount` to `amountPaid`; **no payment is lost**.
- I-FIN-3: Any concurrent `settle` request whose `paymentAmount` would violate I-FIN-1 at commit time is rejected with 409 (not silently truncated).

### Workflow (Once-only commands)

- I-WF-1: `RentalOrder`: `DRAFT → CONFIRMED` transitions exactly once per RO; `CANCELLED` transitions from {`DRAFT`, `CONFIRMED`, `RESERVED`} exactly once; `ON_RENT` transitions from {`CONFIRMED`, `RESERVED`} exactly once.
- I-WF-2: `ExternalRentalAgreement`: `DRAFT → CONFIRMED`, `→ RETURNED` (via supplier return), `→ CANCELLED` each transition exactly once per lifecycle.
- I-WF-3: `Dispatch`: `READY → DISPATCHED` (via `CompleteDispatchService`) transitions exactly once per dispatch.
- I-WF-4: `Return`: `INSPECTED → COMPLETED` transitions exactly once per return.
- I-WF-5: Every once-only transition produces exactly one audit row and at most one notification.

### Phase 28 (untouched)

- I-P28-*: All Phase 28 source × condition invariants remain enforced by `return.source.rules.ts` unchanged.

---

## 9. Decision — State Transition Claim

**Chosen strategy: Option A — Atomic expected-status predicate via `updateMany`.**

For every once-only workflow status transition, the repository MUST expose an operation of the shape:

```ts
// Conceptual signature — not a template to copy-paste.
async claimStatusTransition(
  id: <AggregateId>,
  expectedStatus: <PreviousStatus>,
  next: { status: <NextStatus>; ...timestamps and monotonic side fields },
): Promise<Aggregate>
```

Implementation MUST use:

```ts
const result = await db.<model>.updateMany({
  where: { id, status: expectedStatus /* + any other declared precondition */ },
  data: { status: next.status, /* ...other atomic fields, e.g. completedAt */ },
});

if (result.count === 0) {
  throw new ConcurrentUpdateError({
    entity: "<Model>",
    id,
    expectedStatus,
    action: "<action-name>",
  });
}
```

Then the aggregate is re-loaded (fresh `findById`) inside the same transaction if the caller needs the updated snapshot (e.g. for audit `newValues`).

**Why not `SELECT ... FOR UPDATE`:**

- The repository already establishes a **precedent** for predicated `UPDATE` (`reserveAvailableQuantity`, `releaseReservedQuantity`). Adding row locking would introduce a second, redundant concurrency primitive.
- `SELECT ... FOR UPDATE` requires holding a lock across application logic and audit writes, extending lock windows and increasing deadlock surface.
- `updateMany` at READ COMMITTED already provides "exactly one claimant" semantics: the first transaction to commit wins; every other concurrent claimant sees `count === 0` because either (a) their `WHERE status = <expected>` no longer matches after the winner commits, or (b) they must wait for the row lock the first transaction implicitly took, then re-evaluate their WHERE predicate against the now-updated status.
- No additional isolation level is required. READ COMMITTED is sufficient because the claim is expressed as a single-row conditional UPDATE.

**Where `SELECT ... FOR UPDATE` MAY be used:** only when a mutation needs to read multiple dependent fields off the same row and compute an update whose invariant cannot be expressed as a single predicate. Phase 29 does **not** identify any such case; if implementation surfaces one, it MUST be justified in the implementation PR with the specific invariant that requires it.

---

## 10. Decision — Counter Mutation

Counters split into two families:

### 10.1 Unbounded-in-DB additive counters (Prisma `{ increment }`)

For counters whose upper bound is already enforced by a **separate** atomic state claim (typically the workflow status transition, e.g. "you can only allocate if status is `RECEIVED`"), the counter itself uses `{ increment: delta }` / `{ decrement: delta }`. The status claim happens once; the counter increment cannot double because the status claim guards it.

Applies to:
- `ExternalRentalAgreementItem.quantityConfirmed`, `quantityReceived`, `quantityAllocated`, `quantityDispatched`, `quantityReturnedFromCustomer`, `quantityReturnedToSupplier`, `quantityWrittenOff` — when they participate in a status-gated transition.
- `Inventory.quantityOnHand` for **IN** (restock does not need a floor invariant beyond `delta > 0`; the ceiling `maximumStock` is not currently enforced by domain).

### 10.2 Bounded counters requiring an in-predicate invariant (raw-SQL predicated `UPDATE`)

For counters whose invariant must be enforced **atomically inside the same UPDATE** (because there is no separate state claim guarding them, or because the counter itself is the bound), use the same raw-SQL pattern as `reserveAvailableQuantity` / `releaseReservedQuantity`.

Applies to:
- `Inventory.quantityOnHand` for **OUT** (invariant `quantityOnHand >= delta`).
- `Inventory.quantityOnHand` for **ADJUSTMENT** (invariant `quantityOnHand + signedDelta >= 0`).
- `ExternalRentalAgreement.amountPaid` (invariant `amountPaid + delta <= amountDue`).

### 10.3 Prohibited pattern

Application services MUST NOT write pre-computed absolute counter values through `db.<model>.update({ where: { id }, data: { counter: <absoluteFromMemory> } })`. This is the class defect Phase 29 removes.

---

## 11. Decision — Inventory Mutation

Introduce three new repository methods on `IInventoryRepository`, mirroring the shape and safety guarantees of `reserveAvailableQuantity` / `releaseReservedQuantity`:

| Method | Purpose | Invariant enforced in predicate |
| --- | --- | --- |
| `decrementOnHand(id, quantity)` | OUT movement | `quantityOnHand >= quantity AND isActive = true` |
| `incrementOnHand(id, quantity)` | IN movement | `quantity > 0` (checked in app layer; DB update is unconditional additive) |
| `applyAdjustment(id, signedDelta)` | ADJUSTMENT movement | `quantityOnHand + signedDelta >= 0` |

Each returns the updated `Inventory` aggregate on success, or `null` when the invariant fails (mirroring existing `reserveAvailableQuantity` return contract). The application-layer stock-movement service (`create-stock-movement-in-scope`) MUST translate `null` into `ConcurrentUpdateError` (or the existing `UnprocessableError` for "insufficient stock" — the implementation phase will pick one **stable** mapping and hold it).

**Do not** change:
- `reserveAvailableQuantity` (already safe).
- `releaseReservedQuantity` (already safe).
- Inventory ownership semantics (owned only).
- F-02 date-aware availability formula.
- External inventory isolation (BD-3 of Phase 25.5.1 remains locked).
- Phase 28 source / condition rules.

The existing generic `PrismaInventoryRepository.update(id, data)` MAY continue to exist for non-quantity fields (`minimumStock`, `maximumStock`, `isActive`), but MUST NOT be called with `quantityOnHand` or `reservedQuantity` in the `data` after Phase 29. This is a code-review invariant, not a runtime block.

---

## 12. Decision — External Rental Counters

Introduce a new persistence surface on `IExternalRentalRepository` (or extend `updateWorkflow` to accept a "delta payload" — the implementation phase picks the exact API shape) that:

1. **Claims the status transition atomically** via `db.externalRentalAgreement.updateMany({ where: { id, status: expectedStatus }, data: { status: nextStatus, updatedAt: ... } })`.
2. **Applies each item counter delta** via a nested `updateMany({ where: { id: <itemId>, agreementId: id }, data: { <counter>: { increment: delta } } })`, or via a raw predicated SQL update where a bounded invariant must be enforced in the same statement (currently only `amountPaid`).
3. **Applies `amountPaid` delta** via a predicated raw SQL update:
   ```
   UPDATE "external_rental_agreements"
   SET "amountPaid" = "amountPaid" + $1
   WHERE "id" = $2 AND "amountPaid" + $1 <= "amountDue"
   RETURNING ...
   ```
4. **Recomputes `settlementStatus`** from the DB-returned `amountPaid` (using the existing `deriveSettlementStatus` rule) and writes it in the same transaction — either as part of the raw SQL RETURNING via a follow-up `update`, or wrapped so the sequence is atomic. The implementation phase MUST NOT split settlement into two transactions.

Application services already have deltas at hand today (`data.items.map(item => ({ rentalOrderItemId, quantity }))` — `quantity` IS the delta). The domain `withReceived / withAllocated / …` methods internally cap the deltas against domain invariants; this cap can be re-expressed in the DB predicate for I-ERA-1..5 (implementation phase decides whether to enforce each invariant in the DB or rely on the fact that a single-claimant transition guards it).

Per-command mapping:

| Command | Status claim | Counter mutations |
| --- | --- | --- |
| `ConfirmExternalRentalService` | `DRAFT → CONFIRMED` | `quantityConfirmed` per item set-absolute (once-only) |
| `ReceiveExternalRentalService` | `CONFIRMED\|PARTIALLY_RECEIVED → PARTIALLY_RECEIVED\|RECEIVED` | `quantityReceived += delta` per item |
| `AllocateExternalRentalService` | `PARTIALLY_RECEIVED\|RECEIVED\|ALLOCATED → ALLOCATED` | `quantityAllocated += delta` per item |
| `SupplierReturnExternalRentalService` | see existing `assertCan*` | `quantityReturnedToSupplier += delta` per item, terminal `RETURNED` when custody hits zero |
| `WriteOffExternalRentalService` | see existing `assertCan*` | `quantityWrittenOff += delta` per item, may reach `RETURNED` per existing custody-close logic |
| `SettleExternalRentalService` | **no status claim** — orthogonal to operational status | `amountPaid += delta` with predicate `amountPaid + delta <= amountDue`, then derive `settlementStatus` |
| `CancelExternalRentalService` | `DRAFT\|CONFIRMED → CANCELLED` | zero counters as domain already does |
| External customer-return branch (called by `CompleteReturnService`) | `IN_USE → RETURN_PENDING` (or stays `RETURN_PENDING`) | `quantityReturnedFromCustomer += delta` per item |
| External dispatch branch (called by `CompleteDispatchService`) | `ALLOCATED → IN_USE` (or stays `IN_USE`) | `quantityDispatched += delta` per item |

`totalHireInCost`, `amountDue`, `lineHireInCost` are computed from `quantityReceived × unitCost` in the existing domain code. When the underlying `quantityReceived` mutation becomes an atomic `{ increment }`, the derived money fields MUST be recomputed inside the same transaction (either via a follow-up update after re-reading the fresh counter, or by expressing the arithmetic in raw SQL). The implementation phase decides the exact SQL shape; the invariant is **`amountDue = Σ(quantityReceived_i × unitCost_i)` at commit time**.

---

## 13. Decision — Complete Return Ordering

`CompleteReturnService` MUST be reordered to:

1. Load the `Return` aggregate and validate domain preconditions (`assertCanComplete` on the in-memory snapshot — cheap fail-fast).
2. **Claim** the terminal status atomically:
   ```
   returnRepository.claimStatusTransition(id, expectedStatus="INSPECTED", { status: "COMPLETED", completedAt })
   ```
   If the claim returns 0 rows → throw `ConcurrentUpdateError` → transaction rolls back before any side effect fires.
3. **Only then**, in the same `$transaction`, apply:
   - owned `RELEASE` + `IN` movements via the new atomic inventory methods,
   - external customer-return counter increments via the new atomic ERA path,
   - any Phase 28 source-condition-driven restock computation (unchanged),
   - audit and notification writes.
4. If any side effect throws (e.g. inventory `decrement` returns null because owned reserved qty is insufficient), the transaction rolls back — the terminal status flip is reverted along with everything else.
5. Commit.

**Why this is safe:** The status claim and the side effects share the same `$transaction`. A rollback for any reason unwinds them together. There is no window in which the status is `COMPLETED` on disk while side effects have not run (nor vice versa) — even under READ COMMITTED, the isolation of a single transaction guarantees all-or-nothing visibility to other transactions.

**Two concurrent completes:** Exactly one wins the claim. The other sees `count === 0`, throws `ConcurrentUpdateError`, rolls back, and returns HTTP 409. Side effects fire exactly once. Audit rows: exactly one.

---

## 14. Decision — Complete Dispatch

`CompleteDispatchService` mirrors §13:

1. Load `Dispatch` + `RentalOrder`, validate `assertCanComplete` in memory.
2. Claim `Dispatch` `READY → DISPATCHED` atomically via `dispatchRepository.claimStatusTransition(id, "READY", { status: "DISPATCHED", dispatchedAt })`. `count === 0` → `ConcurrentUpdateError`.
3. In the same transaction:
   - fire owned `OUT` movements via `decrementOnHand` (§11),
   - increment ERA `quantityDispatched` for external lines via the new atomic ERA path (§12), transitioning ERA `ALLOCATED → IN_USE` on the first such delta,
   - transition `RentalOrder` to `ON_RENT` **conditionally** via `rentalOrderRepository.claimStatusTransition(roId, expectedStatus ∈ {CONFIRMED, RESERVED}, { status: "ON_RENT" })` **only when the RO is not already `ON_RENT`**. If the claim returns 0 for a reason other than "already `ON_RENT`", throw.
   - audit and notification writes.
4. Rollback on any failure.

**Concurrent RO status flip note:** Two dispatches on the same RO completing in parallel may both attempt `CONFIRMED\|RESERVED → ON_RENT`. Exactly one wins; the other sees `count === 0`, re-reads the RO to check whether the reason is "already `ON_RENT`" (in which case skip silently), otherwise throws `ConcurrentUpdateError`. This preserves the "ON_RENT written at most once" audit invariant (I-WF-1).

**Ghost `DISPATCHED`:** Not addressed by Phase 29. `withDispatched().withOnRent()` chained in memory remains as-is; only `ON_RENT` is ever persisted. F-07 will be a separate cleanup phase.

---

## 15. Decision — Rental Order Confirmation

`ConfirmRentalOrderService`:

1. Load RO, validate `assertCanConfirm` in memory.
2. Claim `DRAFT → CONFIRMED` via `rentalOrderRepository.claimStatusTransition(id, "DRAFT", { status: "CONFIRMED" })`. `count === 0` → `ConcurrentUpdateError`.
3. Emit exactly one audit row and one notification, inside the same transaction.

Two concurrent Confirms: exactly one succeeds; the other returns 409. No duplicate audit or notification.

Cancel (`CancelRentalOrderService`) already uses `cancelIfCancellable` with a predicated `updateMany` and is already correct; it MAY be refactored to reuse the shared `claimStatusTransition` primitive for consistency but that is not strictly required by Phase 29.

Reserve (`ReserveRentalOrderService`) is out of scope for the status-claim change: it already uses `updateMany(where: { id, status: 'CONFIRMED' })` for the status claim (`prisma-rental-order.repository.ts` L312–340). Its remaining defect — absolute writes of item `reservedQuantity` — is F-05 territory and is **deferred**.

---

## 16. Decision — Error Semantics

Introduce a single new domain-application error:

```ts
// Conceptual — do not implement in this phase.
export class ConcurrentUpdateError extends ConflictError {
  constructor(options: {
    entity: string;
    id: string;
    expectedStatus?: string;
    action?: string;
    message?: string;
  }) {
    super({
      message: options.message ?? `Concurrent update on ${options.entity}(${options.id})`,
      code: "CONCURRENT_UPDATE",
      details: { entity: options.entity, id: options.id, expectedStatus: options.expectedStatus, action: options.action },
    });
  }
}
```

Rationale for stable code choice:

- `CONCURRENT_UPDATE` describes the observable cause (another transaction changed the row) rather than the wire-level status (`PRECONDITION_STALE` conflates with HTTP 412 semantics and does not exist in the current error catalog).
- The parent `ConflictError` at `src/shared/infrastructure/errors/app-error.ts:88` already maps to HTTP 409 with code `CONFLICT` in the base error handler. The new subclass overrides only the code.
- One code, one HTTP status. Do not introduce `PRECONDITION_STALE`, `RETRY_AFTER`, or hierarchical variants.

**API contract for consumers:**

- HTTP status: `409`
- Response body: `{ code: "CONCURRENT_UPDATE", message: "...", details: { entity, id, expectedStatus?, action? } }`
- Meaning: "The requested workflow transition could not be applied because another transaction already changed the relevant state. Refetch the aggregate and, if the state still permits the action, retry."

Do **not** expose Prisma error text, PostgreSQL SQLSTATE codes, or raw driver messages to API consumers.

---

## 17. Decision — Transaction / UoW

**Locked:**

- All Phase 29 changes remain **inside the existing** `$transaction` runners:
  - `src/modules/rental-order/application/services/rental-order-transaction.runner.ts`
  - `src/modules/dispatch/application/services/dispatch-transaction.runner.ts`
  - `src/modules/return/application/services/return-transaction.runner.ts`
  - `src/modules/external-rental/application/services/external-rental-transaction.runner.ts`
  - The shared `PrismaTransactionManager` (`src/shared/infrastructure/database/transaction-manager.ts`) — unchanged.
- Isolation level remains **READ COMMITTED** (Prisma / PostgreSQL default). No `Isolation.SERIALIZABLE`, no `Isolation.REPEATABLE READ`, no per-transaction override. All Phase 29 guarantees are achievable at READ COMMITTED because they are expressed as single-row conditional UPDATEs and atomic counter operators, not as multi-statement invariants.
- No new transaction layer, no distributed transactions, no advisory locks, no cross-service coordination.
- **Rollback behavior:** Any error inside the transaction — including `ConcurrentUpdateError` from a lost claim, `UnprocessableError` from a predicated counter update returning 0 rows, or any downstream side-effect failure — rolls back **all** DB mutations made so far in that transaction. The atomic status claim and its side effects are all-or-nothing.

---

## 18. Decision — Schema

**NO schema change.**

Verified against `prisma/schema.prisma` and all six migrations under `prisma/migrations/*/migration.sql`:

- No new columns, tables, indexes, or constraints are required to implement §9–§16.
- Existing `updatedAt` timestamps and integer counters are sufficient for `{ increment }` operators.
- The active-only unique index on `ExternalRentalAgreement` (migration `20260812180000`) already provides create-time uniqueness for §12 create path.
- **Optimistic version columns are deferred** to a possible Phase 30. They are not required for Phase 29 because expected-status predicates + atomic counter operators cover every once-only and additive case identified in the audit.

If the implementation phase discovers a specific counter mutation that cannot be expressed as either `{ increment }` or a predicated raw SQL update without a schema change, that constitutes a decision-lock deviation and MUST pause implementation for review. As of this document, no such case is known.

---

## 19. Acceptance Test Contract

Concurrency tests MUST use genuine parallel execution against the same transactional database (e.g. `Promise.all` on two service invocations sharing the same repository instances backed by a real `PrismaClient`, or a lightweight harness that opens two concurrent transactions on the same connection pool). Sequential `await A(); await B();` MUST NOT be used as a stand-in for concurrency.

### T29.1 — Complete Return: two concurrent completes on same INSPECTED return

Setup: one `Return` in status `INSPECTED` with a mixed source×condition inspection covering owned + external qty.

Execution: `Promise.all([completeReturn(id), completeReturn(id)])`.

Expected:
- Exactly one call resolves 200 with status `COMPLETED`.
- Exactly one call rejects with `ConcurrentUpdateError` → HTTP 409, code `CONCURRENT_UPDATE`.
- Owned `IN` movement recorded **exactly once**; `quantityOnHand` incremented by exactly the restock delta.
- ERA `quantityReturnedFromCustomer` incremented **exactly once** by the external delta.
- Exactly one `RETURN` audit event of `action=UPDATE, status=SUCCESS` on the return.
- Phase 28 source×condition invariants still hold on the persisted `ReturnInspectionItem` row.

### T29.2 — Complete Dispatch: two concurrent completes on same READY dispatch

Setup: one `Dispatch` in status `READY` for an RO in `CONFIRMED` or `RESERVED`, with owned and external items.

Execution: `Promise.all([completeDispatch(id), completeDispatch(id)])`.

Expected:
- Exactly one 200 with dispatch status `DISPATCHED`.
- Exactly one 409.
- `Inventory.quantityOnHand` decremented by the owned qty **exactly once** (never twice, never zero).
- ERA `quantityDispatched` incremented by the external qty **exactly once**.
- RO transitions `CONFIRMED\|RESERVED → ON_RENT` **exactly once**; second attempt observes RO already `ON_RENT` and MUST NOT emit a duplicate notification or audit row.
- Exactly one `DISPATCHED` audit row on the dispatch.

### T29.3 — External Settlement: two concurrent additive payments

Setup: ERA with `amountDue = 2500`, `amountPaid = 0`.

Execution: `Promise.all([settle(id, { paymentAmount: 1000 }), settle(id, { paymentAmount: 500 })])`.

Expected:
- **Both succeed** (settlement is additive per §4 and I-FIN-2).
- Final `amountPaid = 1500`. Never `1000`, never `500`.
- `settlementStatus` derived deterministically from the final `amountPaid` (`PARTIALLY_SETTLED` in this case).
- Two `SETTLE` audit rows, one per successful settlement (existing behavior).

### T29.3b — External Settlement: two concurrent payments that would breach `amountDue`

Setup: ERA with `amountDue = 2500`, `amountPaid = 2000`.

Execution: `Promise.all([settle(id, { paymentAmount: 400 }), settle(id, { paymentAmount: 300 })])`.

Expected:
- Exactly one succeeds (whichever commits first), bringing `amountPaid` within `amountDue`.
- The other fails with 409 (`CONCURRENT_UPDATE`) or 422 (`UnprocessableError` "amountPaid cannot exceed amountDue"). The **stable choice** is picked by the implementation phase and held; this test asserts the code returned is deterministic and non-2xx.
- Final `amountPaid` is either `2400` or `2300`. Never `2700`, never overrides.

### T29.4 — External Receive: two concurrent additive receives

Setup: ERA in `CONFIRMED`, one item with `quantityConfirmed = 10`, `quantityReceived = 0`.

Execution: `Promise.all([receive({ items: [{ ..., quantity: 4 }] }), receive({ items: [{ ..., quantity: 3 }] })])`.

Expected:
- Both succeed.
- Final `quantityReceived = 7`. Never `4`, never `3`.
- Status becomes `PARTIALLY_RECEIVED` (`7 < 10`).
- I-ERA-1 (`quantityReceived <= quantityConfirmed`) preserved at every intermediate DB snapshot.

### T29.4b — External Receive: two concurrent receives that would breach `quantityConfirmed`

Setup: ERA item with `quantityConfirmed = 10`, `quantityReceived = 6`.

Execution: `Promise.all([receive({ item, quantity: 3 }), receive({ item, quantity: 4 })])`.

Expected:
- Exactly one succeeds (bringing `quantityReceived` to 9 or 10).
- The other fails deterministically (409 or 422 — implementation phase picks one; test asserts non-2xx).
- Final `quantityReceived <= 10`.

### T29.5 — Inventory OUT: two concurrent OUTs against limited stock

Setup: Inventory row with `quantityOnHand = 10`.

Execution: `Promise.all([createStockMovement({ type: OUT, qty: 6 }), createStockMovement({ type: OUT, qty: 6 })])`.

Expected:
- Exactly one succeeds. `quantityOnHand = 4`.
- The other fails with either 409 (`CONCURRENT_UPDATE`) or 422 ("insufficient stock") — implementation phase picks one; test asserts non-2xx.
- `quantityOnHand` is **never** negative at any observable DB snapshot.

### T29.5b — Inventory OUT + IN: no lost update

Setup: `quantityOnHand = 10`.

Execution: `Promise.all([createStockMovement({ type: OUT, qty: 3 }), createStockMovement({ type: OUT, qty: 3 })])`.

Expected:
- Both succeed. Final `quantityOnHand = 4`. Never `7`.

### T29.6 — Rental Order Confirm: two concurrent confirmations

Setup: RO in `DRAFT`.

Execution: `Promise.all([confirm(id), confirm(id)])`.

Expected:
- Exactly one 200, RO becomes `CONFIRMED`.
- Exactly one 409 (`CONCURRENT_UPDATE`).
- Exactly one `RENTAL_ORDER_CONFIRMED` notification.
- Exactly one `CONFIRM` audit row.

### T29.7 — Regression

- All existing Phase 28 tests (`src/modules/return/application/return.source-condition.28.application.test.ts` — T28.1..T28.14 + Phase 28.1 critical scenario) remain green with **zero modifications**.
- All existing external-rental scenario tests (`src/modules/external-rental/application/external-rental.scenario-matrix.25.5.7.test.ts` — T1..T11) remain green.
- All existing dispatch, return, rental-order, inventory application tests remain green.
- `npx tsc --noEmit` remains exit 0.
- `pnpm lint` / `npm run lint` (whichever the project uses) remains 0 errors.
- `npx prisma validate` remains OK.

---

## 20. Backward Compatibility

- **Happy paths:** unchanged. Every 2xx response for a single, non-concurrent, non-retried command remains identical in shape and status. Audit rows, notifications, and inventory / custody effects are byte-identical for the happy path.
- **Failure paths that change:** what previously succeeded silently and corrupted state (concurrent double-submit, retry after 502, double-click) now returns HTTP 409 with `{ code: "CONCURRENT_UPDATE" }`. This is a **strict correctness improvement**, not a breaking contract change, because no legitimate consumer relied on silent state corruption.
- **API contract addition:** consumers should treat 409 `CONCURRENT_UPDATE` as "safe to refetch and retry". Existing consumers that don't implement retry logic simply see a 409 error surface where before they saw a spurious 200 with corrupt data.
- **No frontend redesign required.** The UI may optionally add a friendlier retry banner on 409, but this is not a Phase 29 deliverable.

---

## 21. Deferred Work

Explicitly deferred to future phases (do not fold into Phase 29):

| Deferred | Reason |
| --- | --- |
| **F-05** — CreateDispatch claimed-quantity rollup redesign | Requires a decision on where to persist the per-RO-item "dispatchedQuantity" counter (RO item vs. derived from Dispatch aggregate). Separate business decision. |
| **F-06** — F-02 date-aware availability serialization | Requires a decision on locking granularity (per-product-warehouse, per-period, or advisory lock). Separate architectural decision. F-02 formula itself remains frozen. |
| **F-07** — `RentalOrder.DISPATCHED` enum cleanup / Analytics contract refresh | Cosmetic + a documentation refresh. Separate phase. |
| **F-09** — `Repair.returnInspectionItemId` foreign key | Requires a schema migration + `onDelete` decision. Separate phase. |
| **F-11** — Authorization granularity (`inventory:adjust`, `notifications:send`, expense submit/category delete permission, rental-invoice convert-missing-to-loss permission) | Independent security-hygiene cleanup. Separate phase. |
| **Optimistic aggregate `version` column** | Not needed for the Phase 29 findings. May be considered later if additional invariants surface that cannot be expressed as predicated updates. |
| **Client-provided idempotency keys / request-hash dedup** | Explicitly out of Phase 29 scope. This phase solves server-side concurrency; client-hint idempotency is a separate design question. |

---

## 22. Implementation Constraints

The implementation phase MUST:

- Preserve the frozen architecture (Next.js / TypeScript / Prisma / PostgreSQL / Better Auth / Clean Architecture / DDD / Repository / UoW / DI / Zod / REST / TanStack Query / React Hook Form).
- Preserve every existing decision lock (Analytics Metric Contract, External Rental Sourcing 25.5.1, External Rental Cancellation 25.5.9, RO ↔ ERA Cascade 25.11, Mixed Return Source × Condition 28).
- Preserve F-02 formula.
- Preserve Phase 28 source × condition rules.
- Preserve BD-3 (external inventory isolation) — Phase 29 changes MUST NOT allow external qty to enter owned inventory.
- Preserve existing UoW / transaction runner shapes.
- Preserve existing authorization contract (permissions checked at route runners).

The implementation phase MUST NOT:

- Redesign the state machine of any aggregate.
- Rename modules, services, or repositories.
- Introduce a new transaction layer or split existing transactions.
- Introduce advisory locks, application-level distributed locks, or SERIALIZABLE isolation.
- Introduce a version column, idempotency-key table, or workflow-lock table.
- Modify Phase 28 rules or add new source × condition constraints.
- Modify the analytics contract or F-02 formula.
- Perform unrelated refactoring or "opportunistic" tidying.

---

## 23. Implementation Checklist

For the future implementation phase, in order:

1. **New shared error type**
   - Add `ConcurrentUpdateError` in `src/shared/infrastructure/errors/app-error.ts` (or new file), extending `ConflictError`, with stable code `CONCURRENT_UPDATE`.
   - Add `CONCURRENT_UPDATE` to `error-codes.ts` if the pattern requires it.
   - Ensure the base error handler (`error-handler.ts`) surfaces it as HTTP 409.
2. **Repository primitives**
   - `PrismaInventoryRepository.decrementOnHand(id, quantity)` — raw SQL `UPDATE ... WHERE quantityOnHand >= $qty AND isActive = true`.
   - `PrismaInventoryRepository.incrementOnHand(id, quantity)` — raw SQL or Prisma `{ increment }`.
   - `PrismaInventoryRepository.applyAdjustment(id, signedDelta)` — raw SQL `UPDATE ... WHERE quantityOnHand + $delta >= 0`.
   - `PrismaRentalOrderRepository.claimStatusTransition(id, expected, next)` — `updateMany`.
   - `PrismaExternalRentalRepository.claimStatusTransition(id, expected, next)` — `updateMany`.
   - `PrismaDispatchRepository.claimStatusTransition(id, expected, next)` — `updateMany`.
   - `PrismaReturnRepository.claimStatusTransition(id, expected, next)` — `updateMany`.
   - New atomic-delta shape for `ExternalRentalAgreement` (`updateWorkflowDelta` or extended `updateWorkflow`) that expresses counters as `{ increment }` and `amountPaid` as a predicated raw SQL update.
3. **Application service rewires**
   - `CompleteReturnService`: claim status **before** side effects (§13).
   - `CompleteDispatchService`: claim dispatch status and RO `ON_RENT` transition atomically (§14).
   - `ConfirmRentalOrderService`: use `claimStatusTransition` (§15).
   - `Receive/Allocate/SupplierReturn/WriteOff/Confirm/CancelExternalRentalService`: use the new delta / claim path (§12).
   - `SettleExternalRentalService`: use the predicated `amountPaid` increment (§12, §16).
   - `CreateStockMovementInScope`: switch OUT/IN/ADJUSTMENT to `decrementOnHand` / `incrementOnHand` / `applyAdjustment`.
4. **HTTP mapping**
   - Verify the shared route runners return 409 for `ConcurrentUpdateError` without new plumbing (subclass of `ConflictError` should inherit its handler).
5. **Tests**
   - Add T29.1–T29.6, T29.3b, T29.4b, T29.5b using real concurrent execution (`Promise.all` against a real `PrismaClient` connected to a test DB or in-memory-equivalent that enforces predicated UPDATE semantics).
   - Do NOT modify Phase 28 tests.
   - Do NOT modify existing sequential tests.
6. **Validation gates**
   - `npx tsc --noEmit` → 0.
   - Lint → 0 errors.
   - `npx prisma validate` → OK.
   - `npx prisma migrate status` → no drift.
   - Full test suite for `return`, `external-rental`, `dispatch`, `rental-order`, `inventory`, `stock-movement`, `reporting` → all green.
7. **Commit + no push** (per project convention).

---

## 24. Final Decision

**READY FOR IMPLEMENTATION.**

No open business decisions remain:
- Settlement semantics = **additive** (verified in domain code, §4).
- Claim strategy = **`updateMany` expected-status predicate** (§9).
- Counter strategy = **Prisma `{ increment }` when status-gated; predicated raw SQL when invariant must be in-predicate** (§10).
- Inventory strategy = **mirror `reserveAvailableQuantity` / `releaseReservedQuantity`** (§11).
- Error surface = **`ConcurrentUpdateError extends ConflictError`, stable code `CONCURRENT_UPDATE`, HTTP 409** (§16).
- Transaction / UoW = **unchanged; single `$transaction` per command**, all Phase 29 mutations inside it (§17).
- Schema = **no change** (§18).

The next chat session is authorized to open the Phase 29 implementation task using this decision lock as the source of truth.
