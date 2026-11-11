# Phase 48 — Implementation Readiness Assessment

**Assessment date:** 2026-09-01  
**Finding:** N-46-02 — Source-Externally F-02 Stale Read  
**Baseline:** Committed HEAD `9e0eaf1` only — ~149 WIP files excluded

---

## Executive Verdict

**READY FOR IMPLEMENTATION**

All material implementation questions are resolved from existing domain code. Phase 48 should mirror the established **inventory lock + rental-order lock → authoritative F-02 reread → validate → mutate** pattern used by `ReserveRentalOrderService`, within a single `IRentalOrderTransactionRunner` UoW.

---

## Baseline

| Item | Value |
|------|-------|
| **HEAD** | `9e0eaf1a62b30137db939fd34e215b97823d369f` (`9e0eaf1`) |
| **Branch** | `main` |
| **Commit** | `fix(repair): prevent repair capacity over-commitment` |
| **WIP** | **149** entries (`git status --short \| Measure-Object -Line`) |
| **Push** | **NO** |
| **Staged** | **None** |

---

## Finding

**N-46-02 — Source-Externally F-02 Stale Read**

| Field | Value |
|-------|-------|
| **Severity** | P2 |
| **Status** | OPEN (confirmed) |
| **Module** | Rental Order / External Rental orchestration |

---

## Root Cause

`SourceRentalOrderExternallyService.execute` performs F-02 shortfall calculation **outside any transaction and without row locks**, then delegates ERA creation to `CreateExternalRentalService`, which runs in a **separate** `IExternalRentalTransactionRunner` UoW.

Between the shortfall read and ERA insert, competing mutations on the same product×warehouse×period (notably **reserve/cancel on other rental orders**) can change `dateAwareAvailableQuantity`, allowing an ERA `quantityRequested` that exceeds the **true remaining shortfall** at commit time.

Evidence:

```119:197:src/modules/rental-order/application/services/source-rental-order-externally.service.ts
    const inventory = await this.inventoryRepository.findByProductAndWarehouse(...);
    const commitmentLines = await this.rentalOrderRepository.findAvailabilityCommitmentLines({...});
    const snapshot = calculateDateAwareAvailabilitySnapshot({...});
    const shortfall = calculateExternalSourcingShortfall({
      requiredQuantity: item.quantity,
      dateAwareAvailableQuantity: snapshot.dateAwareAvailableQuantity,
      alreadyExternallyRequestedQuantity: 0,
    });
    // ... validation ...
    return this.createExternalRental.execute({...});  // separate txn
```

By contrast, `ReserveRentalOrderService` acquires locks **before** F-02 reread:

```107:157:src/modules/rental-order/application/services/reserve-rental-order.service.ts
        for (const inventoryId of sortedInventoryIds) {
          await inventoryRepository.lockForAvailabilityCommit(inventoryId);
        }
        await rentalOrderRepository.lockForReserveCommand(rentalOrderId);
        const fresh = await rentalOrderRepository.findById(rentalOrderId);
        // Authoritative F-02 re-read after all locks are held.
        const availabilityService = new GetDateAwareAvailabilityService(...);
```

---

## Exact Code Path

### Entry points

| Layer | File | Symbol |
|-------|------|--------|
| API route | `src/app/api/rental-orders/[id]/external-rental/route.ts` | `POST` → `handleSourceRentalOrderExternally` |
| Presentation | `src/modules/rental-order/presentation/routes/rental-order-api.routes.ts` | `handleSourceRentalOrderExternally` — permission `PERMISSIONS.externalRentals.create` |
| Application | `src/modules/rental-order/application/services/source-rental-order-externally.service.ts` | `SourceRentalOrderExternallyService.execute` |
| Delegated create | `src/modules/external-rental/application/services/create-external-rental.service.ts` | `CreateExternalRentalService.execute` → `IExternalRentalTransactionRunner.run` |
| DI wiring | `src/modules/rental-order/infrastructure/factories/create-rental-order.services.ts` | constructs orchestrator + `CreateExternalRentalService` |

### Call graph

```text
POST /api/rental-orders/:id/external-rental
  → handleSourceRentalOrderExternally
    → SourceRentalOrderExternallyService.execute          [NO TXN]
      → rentalOrderRepository.findById
      → isSourceExternallyEligibleStatus / item lookup
      → supplierRepository.findById
      → externalRentalRepository.findActiveByRentalOrderId   [pre-txn, unlocked]
      → inventoryRepository.findByProductAndWarehouse        [unlocked]
      → rentalOrderRepository.findAvailabilityCommitmentLines  [unlocked]
      → calculateDateAwareAvailabilitySnapshot               [F-02]
      → calculateExternalSourcingShortfall
      → validate remainingShortfall / requested quantity
      → CreateExternalRentalService.execute                [SEPARATE TXN]
          → externalRentalTransactionRunner.run
            → findByAgreementNumber
            → findActiveByRentalOrderId
            → externalRentalRepository.create
            → auditLogger.log
```

### Supporting read model (informational, same F-02 math)

| File | Symbol |
|------|--------|
| `get-rental-order-shortfall.service.ts` | `GetRentalOrderShortfallService.execute` — correctly aggregates `alreadyExternallyRequestedQuantity` from active ERA items (orchestrator hardcodes `0`) |
| `get-date-aware-availability.service.ts` | `GetDateAwareAvailabilityService` — F-02 snapshot used by reserve path |

### Domain rules

| File | Symbol |
|------|--------|
| `rental-order.shortfall.rules.ts` | `calculateExternalSourcingShortfall`, `isSourceExternallyEligibleStatus` |
| `rental-order.availability.rules.ts` | `calculateDateAwareAvailabilitySnapshot`, `AVAILABILITY_COMMITMENT_STATUSES` |

---

## Business Invariant

From locked formula in `rental-order.shortfall.rules.ts`:

```text
shortfallQuantity = max(0, requiredQuantity − dateAwareAvailableQuantity)

remainingShortfallQuantity = max(0, shortfallQuantity − alreadyExternallyRequestedQuantity)

INVARIANT at ERA create:
  quantityRequested ≤ remainingShortfallQuantity
```

Where:

- `requiredQuantity` = `RentalOrderItem.quantity` for the targeted line
- `dateAwareAvailableQuantity` = F-02 snapshot for `(productId, warehouseId, item.startDate..item.endDate)` with **current RO excluded** from commitment lines (`excludeRentalOrderId: order.id`)
- `alreadyExternallyRequestedQuantity` = sum of active (non-`CANCELLED`) ERA item `quantityRequested` for the same `rentalOrderItemId` (or `0` when no active ERA exists)

**Operational constraint (separate from shortfall math):** at most one non-`CANCELLED` ERA per rental order (partial unique index + `findActiveByRentalOrderId`).

**Explicit non-invariant:** ERA quantity does **not** consume F-02 capacity lines — external sourcing never mutates `quantityOnHand` / `reservedQuantity` (documented in service comment and test M/N).

---

## Authoritative Capacity

| Concept | Domain field | DB / derivation |
|---------|--------------|-----------------|
| Required quantity | `RentalOrderItem.quantity` | `rental_order_items.quantity` |
| Owned fulfillable (F-02) | `dateAwareAvailableQuantity` | Derived: `max(0, baseCapacity − dateAwareCommittedQuantity)` where `baseCapacity = quantityOnHand + outstandingOutQuantity` from **other** overlapping RO commitment lines |
| Already externally requested | `ExternalRentalAgreementItem.quantityRequested` on active ERA | `external_rental_agreement_items.quantityRequested` where agreement `status <> 'CANCELLED'` |
| Remaining shortfall (gate) | `remainingShortfallQuantity` | Derived by `calculateExternalSourcingShortfall` |

**Authoritative rows for serialization:**

1. **`inventory` row** (product×warehouse) — F-02 inputs (`quantityOnHand`, `reservedQuantity`) and cross-RO commitment visibility
2. **`rental_orders` row** (target RO) — active ERA uniqueness and RO status eligibility

---

## Competing Mutations

| Mutation | Service | Quantity effect on F-02 shortfall | Status filter | Same capacity? |
|----------|---------|-----------------------------------|---------------|----------------|
| Reserve rental order | `ReserveRentalOrderService` | Decreases `dateAwareAvailable` for **other** overlapping ROs; increases `inventory.reservedQuantity` | RO → `RESERVED` | **Yes** — locks inventory + RO |
| Cancel rental order | `CancelRentalOrderService` | Increases `dateAwareAvailable` (RELEASE + clears reserved qty on cancelled RO) | RO → `CANCELLED` | **Yes** — locks inventory on release |
| Confirm / update RO | `ConfirmRentalOrderService`, `UpdateRentalOrderService` | May change item qty (not F-02 locked on source path) | Pre-dispatch | Partial — item qty change affects `requiredQuantity` |
| Dispatch complete | `CompleteDispatchService` | Changes on-hand + commitment breakdown | `ON_RENT` etc. | **Yes** — overlapping period |
| Source externally (this finding) | `SourceRentalOrderExternallyService` | Creates ERA `quantityRequested` (must satisfy shortfall gate) | ERA `DRAFT` | **Yes** — currently **unlocked** |
| Direct ERA create | `CreateExternalRentalService` via `POST /api/external-rentals` | Bypasses shortfall gate entirely | Any eligible create | **Analogous bypass** — out of N-46-02 scope |
| ERA cancel | `CancelExternalRentalService` | Frees active ERA slot; does not affect F-02 math | → `CANCELLED` | No F-02 effect |
| ERA workflow (confirm/receive/…) | various | Mutates custody counters, **not** `quantityRequested` | post-create | No shortfall re-check needed |

---

## Concrete Concurrency Scenario

**CONFIRMED over-sourcing race (stale F-02 read when availability increases):**

| Step | State |
|------|-------|
| **Initial** | RO-A item requires **20** units. F-02 `dateAwareAvailableQuantity = 5` (excluding RO-A). `shortfallQuantity = 15`, `remainingShortfallQuantity = 15`. No active ERA on RO-A. |
| **Request A** | `source-externally` qty **15**. Reads shortfall **15**, passes validation. |
| **Request B** | Concurrent **cancel** of overlapping RO-B releases reserved capacity. F-02 available for RO-A's period rises to **15**. True `remainingShortfallQuantity` is now **5**. |
| **A validation** | Against stale snapshot: `15 ≤ 15` ✓ |
| **B mutation** | RO-B cancel commits (inventory lock held on B's path). |
| **A mutation** | `CreateExternalRentalService` creates ERA `quantityRequested = 15`. |
| **Final state** | RO-A has ERA 15 external + can still own up to 15 F-02 → **30 total vs 20 required** → **10 units over-sourced externally**. |
| **Violated invariant** | `quantityRequested (15) ≤ remainingShortfallQuantity (5)` at commit time. |

**Not a duplicate-ERA race:** partial unique index `external_rental_agreements_rentalOrderId_active_key WHERE status <> 'CANCELLED'` prevents two active ERAs per RO; N-46-02 is **quantity vs shortfall**, not duplicate-row corruption.

**Reserve on same RO does not shrink shortfall** (self excluded from commitment lines) — reserve+source on same RO is a separate business-composition concern, not this stale-read defect.

---

## Current Transaction Boundary

| Phase | Boundary |
|-------|----------|
| **Shortfall calculation** | **Outside** any transaction — multiple unlocked reads |
| **ERA create** | **Inside** `IExternalRentalTransactionRunner.run` only |
| **Combined critical section** | **Split across two UoWs** — defect |

```text
Transaction starts:  CreateExternalRentalService → transactionRunner.run (ERA repo only)
Transaction ends:    after ERA create + audit

Shortfall calc:      BEFORE CreateExternalRentalService — no shared txn with locks
```

---

## Current Locking

| Path | Locks held |
|------|------------|
| `SourceRentalOrderExternallyService` | **None** |
| `CreateExternalRentalService` | Implicit txn only; `findActiveByRentalOrderId` without `FOR UPDATE` on RO/inventory |
| `ReserveRentalOrderService` (reference) | `lockForAvailabilityCommit(inventoryId)` + `lockForReserveCommand(rentalOrderId)` |

Existing lock methods usable by Phase 48:

| Method | Row | Prisma |
|--------|-----|--------|
| `lockForAvailabilityCommit` | `inventory` | `SELECT id FROM inventory WHERE id = … FOR UPDATE` |
| `lockForReserveCommand` | `rental_orders` | `SELECT id FROM rental_orders WHERE id = … FOR UPDATE` |

`RentalOrderWriteScope` already includes `externalRentalRepository` — single UoW is architecturally supported (`create-rental-order-transaction.runner.ts`).

---

## Recommended Serialization Boundary

```text
Primary:   inventory row (product × warehouse) — lockForAvailabilityCommit
Secondary: rental_orders row (target RO)       — lockForReserveCommand (reuse)
```

### Why this boundary is correct

- F-02 `dateAwareAvailableQuantity` is derived from **inventory on-hand** plus **other RO commitment lines** for the same product×warehouse×period. Competing reserve/cancel on **any** overlapping RO mutates inputs guarded by the inventory row lock (same as Phase 31 reserve hardening).
- Target RO lock serializes `source-externally` vs **reserve on same RO** and vs **active ERA uniqueness** check+insert.
- Partial unique index on `rentalOrderId` (active ERA) provides backup enforcement for duplicate ERA, not shortfall quantity.

### Why not other candidates

| Candidate | Why not sufficient alone |
|-----------|-------------------------|
| `ExternalRentalAgreement` row | Does not exist yet at create time; does not serialize cross-RO F-02 changes |
| `RentalOrderItem` row | No existing `FOR UPDATE`; F-02 is cross-RO at inventory scope |
| ERA-only lock | Misses inventory/commitment races from other rental orders |

---

## Recommended Transaction Sequence

```text
BEGIN  (IRentalOrderTransactionRunner.run)

  1. lockForAvailabilityCommit(inventoryId)     // product × warehouse
  2. lockForReserveCommand(rentalOrderId)      // target RO — reuse existing method

  3. Authoritative reread:
       - rentalOrderRepository.findById
       - re-validate status eligibility + item + supplier
       - externalRentalRepository.findActiveByRentalOrderId  // inside txn
       - inventoryRepository.findByProductAndWarehouse
       - findAvailabilityCommitmentLines(excludeRentalOrderId)
       - calculateDateAwareAvailabilitySnapshot
       - calculateExternalSourcingShortfall(
           alreadyExternallyRequestedQuantity from active ERA items OR 0)

  4. Validate:
       - remainingShortfallQuantity > 0
       - data.quantity ≤ remainingShortfallQuantity

  5. Create ERA in-scope (same UoW):
       - externalRentalRepository.create
       - auditLogger.log

COMMIT
```

**Implementation note:** Extract `executeCreateExternalRentalInScope(scope, input)` from `CreateExternalRentalService` (mirror `executeCreateStockMovementInScope`). Do **not** nest `CreateExternalRentalService.execute` — that starts a separate txn.

Document number resolution (`resolveDocumentCode`) may remain pre-txn (same pattern as repair/payment create services).

---

## Status Semantics

### External rental agreement

| Category | Statuses |
|----------|----------|
| **Counting as active (blocks second ERA)** | All except `CANCELLED` — `findActiveByRentalOrderId` uses `status: { not: 'CANCELLED' }` |
| **Excluded from active** | `CANCELLED` |
| **Partial unique index** | One non-`CANCELLED` ERA per `rentalOrderId` |

Operational lifecycle statuses (`DRAFT`, `CONFIRMED`, `PARTIALLY_RECEIVED`, … `RETURNED`) do not affect shortfall math — only `quantityRequested` on the active agreement matters for `alreadyExternallyRequestedQuantity`.

### Rental order (source eligibility)

| Eligible | `DRAFT`, `CONFIRMED`, `RESERVED` (`SOURCE_EXTERNALLY_ELIGIBLE_STATUSES`) |
| Ineligible | `CANCELLED`, `ON_RENT`, `DISPATCHED`, etc. |

### F-02 commitment lines (other ROs)

| Counting | `RESERVED`, `ON_RENT`, `PARTIALLY_RETURNED` |
| Excluded | `DRAFT`, `CONFIRMED`, `CANCELLED`, `COMPLETED`, etc. |

---

## Create Path

- **Only create path** sets `quantityRequested` for F-02 gating.
- `SourceRentalOrderExternallyService` validates then delegates.
- `CreateExternalRentalService` validates domain invariants + active ERA uniqueness in its own txn.
- **Phase 48:** move shortfall validation + create into single `IRentalOrderTransactionRunner` scope.

---

## Update Path

**No quantity-update mutation exists at current HEAD** for `ExternalRentalAgreementItem.quantityRequested` after create.

Workflow services mutate custody counters (`quantityConfirmed`, `quantityReceived`, etc.) via `UpdateExternalRentalWorkflowData` — not the shortfall gate field.

**T48.5:** Not applicable unless a future update path is added.

---

## Cancellation Path

- `CancelExternalRentalService` → `withCancelled()` → status `CANCELLED`.
- Cancelled agreements **excluded** from `findActiveByRentalOrderId` and partial unique index — **frees ERA slot** for re-source.
- Cancellation **does not** mutate inventory / F-02 capacity (custody counters reset per cancel service; no owned-inventory effect).
- `alreadyExternallyRequestedQuantity` becomes **0** after cancel — consistent with `GetRentalOrderShortfallService`.

---

## Comparison With Existing Patterns

### Phase 39 (customer payment pending)

| Phase 39 | N-46-02 equivalent |
|----------|-------------------|
| `lockForPaymentCommitment(invoice)` | `lockForAvailabilityCommit(inventory)` + `lockForReserveCommand(rentalOrder)` |
| `sumPendingAmountByRentalInvoiceId` | `calculateExternalSourcingShortfall` (derived, not SQL sum) |
| validate against `balance − pending` | validate `quantity ≤ remainingShortfallQuantity` |
| create payment in same UoW | create ERA in same `RentalOrderWriteScope` |

Same **lock → reread → aggregate/derive → validate → create** shape; different serialization rows and aggregate function.

### Phase 44/46 (supplier payment)

| Phase 44/46 | N-46-02 equivalent |
|-------------|-------------------|
| `lockForSupplierPaymentCommitment(PO)` | inventory + RO locks |
| pending sum on PO | F-02 shortfall derivation |
| separate post/void claim pattern | not applicable at source-create |

Informs UoW discipline; supplier payment is financial not F-02.

### Phase 45/47 (return/repair capacity)

| Phase 45/47 | N-46-02 equivalent |
|-------------|-------------------|
| parent row `FOR UPDATE` | inventory + RO `FOR UPDATE` |
| sum prior commitments | F-02 shortfall derivation |
| validate capacity | validate `remainingShortfallQuantity` |
| create/update in same txn | create ERA in same txn |

**Closest pattern:** Phase 45/47 capacity serialization, but F-02 capacity is **derived cross-aggregate** rather than a single parent counter — hence inventory row lock (as reserve already does) rather than a single child row.

---

## Decision Lock

**NOT REQUIRED**

Reason: Business policy is already defined in:

- `rental-order.shortfall.rules.ts` (locked formula comment)
- `rental-order.availability.rules.ts` (F-02 commitment statuses)
- `external-rental` active-only uniqueness (Phase 25.10 migration)
- `GetRentalOrderShortfallService` (reference aggregation for `alreadyExternallyRequestedQuantity`)

Phase 48 is technical serialization parity — no new business rule selection.

---

## Schema

**NONE**

---

## Migrations

**NONE**

Existing `inventory`, `rental_orders`, and partial unique index are sufficient.

---

## API / Worker Entry Points

| Entry | Protected path | Shortfall gate |
|-------|--------------|----------------|
| `POST /api/rental-orders/:id/external-rental` | `SourceRentalOrderExternallyService` | **Yes** (to be serialized in Phase 48) |
| `GET /api/rental-orders/:id/shortfall` | `GetRentalOrderShortfallService` | Read-only |
| `POST /api/external-rentals` | `CreateExternalRentalService` directly | **No** — bypasses shortfall (analogous; not N-46-02) |

No worker/scheduled entry points found for source-externally.

---

## Authorization

| Route | Permission | Roles @ HEAD |
|-------|------------|--------------|
| Source externally | `external-rentals:create` | **OWNER**, **MANAGER** only (`ALL_PERMISSIONS` / `MANAGER_PERMISSIONS`) |
| Direct ERA create | `external-rentals:create` | Same |

WORKER cannot invoke source-externally. No material authorization gap discovered for N-46-02 path.

---

## Inventory Interaction

**NONE on source-externally path.**

Confirmed by service comment, test M/N in `rental-order.source-externally.application.test.ts`, and absence of stock movement calls.

F-02 uses inventory **read-only** for snapshot; ERA custody lives on `ExternalRentalAgreementItem` counters.

---

## Financial Interaction

**NONE at source-create time.**

`unitCost` captured on ERA item; supplier settlement is post-workflow. No invoice/payment/PO mutation in source-externally orchestrator.

---

## Analytics Impact

**NONE IDENTIFIED**

Fixing serialization does not change Analytics Metric Contract v1.0 (BD-1–BD-9) or F-02 formula — only closes TOCTOU on an existing gate.

---

## Test Strategy

Use `Promise.allSettled` + existing `createPassThroughTransactionRunner` with `runWithAvailabilityCommitLockScope` + `runWithReserveCommandLockScope` (`rental-order/tests/helpers/transaction-test-runner.ts`).

### T48.1 — Full shortfall source succeeds under serialization

- RO-A: item qty 20, on-hand 300, no overlapping commitments → shortfall 0 → **skip** OR use on-hand 5 → shortfall 15, source qty 15 → **success**.
- Concurrent source attempts on **same RO** are blocked by active ERA check / unique index (secondary assertion).

### T48.2 — Stale-read over-source prevented (primary defect)

- RO-A: item qty 20, F-02 available 5, shortfall 15.
- RO-B: overlapping RESERVED order holding capacity that will be cancelled.
- Concurrent: `source-externally` qty 15 **vs** `cancel` RO-B.
- **Expected:** After locks, at most one path succeeds with valid shortfall; final ERA qty ≤ **fresh** `remainingShortfallQuantity` (likely 5 if cancel wins first).

### T48.3 — Request exceeds post-lock remaining shortfall

- Setup: shortfall 10 after lock.
- Request qty 11 → `UnprocessableError` / exceeds remaining shortfall.

### T48.4 — Cancelled ERA excluded from alreadyExternallyRequested

- Seed cancelled ERA with prior qty; verify `alreadyExternallyRequestedQuantity = 0` and re-source allowed.

### T48.5 — Update path

**N/A** — no `quantityRequested` update mutation at HEAD.

### T48.6 — Competing reserve on same inventory serializes

- RO-A source-externally concurrent with RO-B reserve on same product×warehouse/period.
- **Expected:** serialized via `lockForAvailabilityCommit`; no F-02 stale read.

---

## Regression Scope

| Suite | Purpose |
|-------|---------|
| `rental-order.source-externally.application.test.ts` | Existing functional tests A–P must pass |
| Phase 26 shortfall API tests | Read model unchanged |
| Reserve F-02 tests | Ensure no regression from shared lock reuse |
| External rental create tests | In-scope create extraction must preserve behavior |
| Phase 47 / unrelated | Smoke — no coupling |

---

## Expected Implementation Surface

| File | Change |
|------|--------|
| `source-rental-order-externally.service.ts` | Inject `IRentalOrderTransactionRunner`; lock → reread → validate → in-scope create |
| `create-external-rental-in-scope.ts` (new) | Extract create+audit from `CreateExternalRentalService` |
| `create-external-rental.service.ts` | Delegate to in-scope helper (thin wrapper) |
| `create-rental-order.services.ts` | Wire transaction runner into orchestrator |
| `rental-order.source-externally-concurrency.48.application.test.ts` (new) | T48.1–T48.4, T48.6 |
| `transaction-test-runner.ts` | **Reuse as-is** (already has ALS lock scopes) |

**Not required:**

- New repository lock methods (reuse `lockForAvailabilityCommit` + `lockForReserveCommand`)
- Prisma schema / migrations
- New decision lock document

**Minor consistency fix (optional within Phase 48):** Replace hardcoded `alreadyExternallyRequestedQuantity: 0` with active ERA item sum (matches `GetRentalOrderShortfallService`) — functionally equivalent at first create, correct for policy consistency.

---

## Risk Assessment

| Risk | Level | Mitigation |
|------|-------|------------|
| Nested txn if delegating to `CreateExternalRentalService.execute` | **High** | In-scope create only |
| Deadlock with reserve (multiple inventory locks) | **Low** | Single inventory row per source call; reserve uses sorted multi-lock — source uses one product |
| Reusing `lockForReserveCommand` name confusion | **Low** | Document as general RO command serialization; optional alias in future |
| Direct `POST /api/external-rentals` bypass | **Medium** (pre-existing) | Out of N-46-02 scope; note for future policy phase |

---

## Analogous Paths (broader pattern)

| Path | Relation to N-46-02 |
|------|---------------------|
| `POST /api/external-rentals` → `CreateExternalRentalService` | Bypasses shortfall entirely — **separate policy finding**, not N-46-02 |
| `GetRentalOrderShortfallService` | Read-only stale reads OK for UI |
| `GetDateAwareAvailabilityService` | Used correctly inside reserve txn |

N-46-02 is **isolated** to the source-externally orchestration path.

---

## Readiness Checklist

- [x] Root cause known
- [x] Invariant known
- [x] Authoritative capacity known
- [x] Competing mutations known
- [x] Serialization boundary known
- [x] Transaction boundary known
- [x] Lock strategy known
- [x] Status semantics known
- [x] Create/update semantics known
- [x] Cancellation semantics known
- [x] Decision lock resolved — NOT REQUIRED
- [x] Schema impact resolved — NONE
- [x] Test strategy defined
- [x] Regression scope defined

---

## Final Verdict

**READY FOR IMPLEMENTATION**

---

## Recommended Next Step

**Phase 48 Implementation** — N-46-02 Source-Externally F-02 Serialization

---

**Assessment note:** No production code modified. WIP preserved. No commit. No push.
