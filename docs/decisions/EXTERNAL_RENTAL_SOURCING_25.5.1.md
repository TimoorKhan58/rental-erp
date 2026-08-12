# Phase 25.5.1 — External Rental Sourcing Decision Lock & Domain Design

**Document:** External Rental Sourcing (Supplier Hire-In / Cross-Rental) v1.0
**Status:** DECISIONS LOCKED — DESIGN COMPLETE — READY FOR 25.5.2 SCHEMA
**Date:** 2026-08-11
**Baseline HEAD:** `c52dbcd0dcc49d35439bc16da0d0923617ad2518` (`feat(rental-order): implement date-aware availability`)
**Scope:** Decision lock + domain design only. **No production implementation in this phase.**
**Related:** Phase 25.5 readiness audit; F-01 Physical Rental Lifecycle; F-02 Date-Aware Availability

---

## How to read this document

| Layer | Meaning |
| ----- | ------- |
| **LOCKED** | Approved business/architecture decision for MVP — do not reopen without a new decision phase |
| **CONCEPTUAL** | Implementation-ready design; not yet coded/schematized |
| **DEFERRED** | Explicit non-goal for Phase 25.5 MVP |

```text
Phase 25.5.1 Status:
DECISIONS LOCKED — DESIGN COMPLETE — READY FOR 25.5.2 SCHEMA
```

Do **not** start Phase 25.5.2 until this document is explicitly accepted.

---

## 1. Executive Decision

**Verdict: GO for Phase 25.5.2 schema work after acceptance of this lock.**

MT-ERP will introduce a first-class **External Rental Sourcing** capability (module name: `external-rental`) so that a customer rental order with insufficient **company-owned**, F-02 date-aware stock can be fulfilled by **hiring inventory from a supplier/rental provider**.

| Rule | Lock |
| ---- | ---- |
| Legal ownership | Remains with the **supplier** |
| MT-ERP role | Temporary **custody** + fulfillment + return obligation + cost settlement |
| Owned inventory | `Inventory.quantityOnHand` meaning is **unchanged** |
| F-02 | Owned availability formula is **unchanged**; hire-in is **excluded** |
| Procurement | `PurchaseOrder` remains **buy-only**; must **not** represent hire-in |
| Quotation | **Out of MVP** |
| Architecture | Preserve Clean Architecture, DDD modules, Repository, UoW, Prisma, Better Auth |

**Primary business outcome:** When owned availability cannot cover demand for a rental period, the system can source the shortfall externally, fulfill the customer, return hired stock to the supplier, and settle hire-in cost — without corrupting F-01/F-02 owned-fleet semantics.

---

## 2. Locked Business Decisions

### BD-1 — Inventory type (LOCKED)

External inventory is **SUPPLIER-RENTED / HIRED-IN**.

It is **not**: purchased stock, company-owned stock, cost-free borrow, or customer-owned stock.

### BD-2 — Legal ownership (LOCKED)

The external supplier retains legal ownership for the entire hire-in lifecycle. MT-ERP never titles hired units as owned fleet.

### BD-3 — Availability isolation (LOCKED)

Hired-in quantity **must not**:

- increase `Inventory.quantityOnHand`
- increase F-02 `baseCapacity`
- increase F-02 `dateAwareAvailableQuantity`
- affect owned Inventory Value (`quantityOnHand × purchaseCost`)
- appear in owned fleet KPIs

F-02 remains authoritative for **company-owned** stock only.

### BD-4 — Allocation model (LOCKED)

**MVP:** one `ExternalRentalAgreement` → exactly one `RentalOrder`.

No shared external pool across multiple customer orders.

### BD-5 — Supplier identity (LOCKED)

Reuse existing `Supplier` master for provider identity. Do not invent a parallel vendor entity.

### BD-6 — Aggregate ownership (LOCKED)

Hire-in lifecycle is owned by a **new module** `external-rental` (folder: `src/modules/external-rental/`).

**Rejected:** extending `PurchaseOrder` / `procurement` to mean rent/borrow.

**Naming rationale:** repository modules use kebab-case domain nouns (`rental-order`, `stock-movement`, `supplier-payment`). `external-rental` matches that convention better than `hire-in` and states the business capability explicitly. Do **not** rename existing modules.

### BD-7 — Commitment timing (LOCKED)

| Stage | Effect |
| ----- | ------ |
| `DRAFT` | Request only — **not** usable for fulfillment |
| `CONFIRMED` | Commercial commitment with supplier (qty/cost/period locked) |
| `RECEIVED` (+ allocate) | Operational custody usable for the linked rental order |

Draft must never become dispatchable inventory.

### BD-8 — Mixed fulfillment (LOCKED)

A rental order line may be fulfilled by:

- owned quantity, and/or
- external hired quantity

Sources **must remain distinguishable** end-to-end (reserve, dispatch, return, supplier return). Never collapse into one anonymous pool.

### BD-9 — Dual physical return flows (LOCKED)

| Flow | Meaning |
| ---- | ------- |
| Customer return | External units leave customer → return to **MT-ERP custody** |
| Supplier return | External units leave MT-ERP custody → return to **supplier** |

Customer return **does not** automatically close the supplier return obligation.

### BD-10 — Settlement (LOCKED)

Agreement tracks operational hire-in money state:

- `unitCost` (per item)
- quantity basis for cost
- `totalHireInCost`
- `amountDue`
- `amountPaid`
- `outstandingBalance` (derived)
- `settlementStatus`

No Chart of Accounts / JournalEntry / P&L redesign in MVP.

### BD-11 — Cost recognition timing (LOCKED)

**Selected rule:** Hire-in cost becomes **financially recognized for order-level hire-in cost** at **RECEIVE** (actual `quantityReceived × unitCost`).

| Moment | Money effect |
| ------ | ------------ |
| `CONFIRMED` | Commercial commitment recorded (`quantityConfirmed × unitCost` as provisional `amountDue`) |
| `RECEIVED` | **Recognition event:** `amountDue` and `totalHireInCost` set from **received** quantities (handles under-delivery) |
| Settlement | Reduces `amountPaid`; does not redefine recognition |

**Rationale vs alternatives:**

| Alternative | Why not MVP default |
| ----------- | ------------------- |
| Recognize at CONFIRM only | Overstates cost on under-delivery |
| Recognize at customer DISPATCH | Delays supplier obligation unrealistically after custody taken |
| Recognize at SETTLE only | Hides open cost while stock is in use |

Repository evidence: procurement records `unitCost` on PO items at create; stock and money diverge (receive vs pay). Hire-in mirrors that split: commercial confirm → physical receive adjusts obligation → separate settlement payments.

### BD-12 — Damage/loss MVP policy (LOCKED)

See §15. Minimal MVP: **customer damage/lost charges remain on the customer rental return/invoice path**; **supplier liability for hired units not returned in good condition is recorded on the external agreement** as an open obligation adjustment (qty and/or charge). They are **not** the same transaction.

### BD-13 — Period alignment (LOCKED)

Agreement must carry supplier hire period (`hireStartDate`, `hireEndDate`) and `expectedReturnToSupplierDate`. MVP does not require these dates to equal customer event dates, but UI should default them from the linked rental order period.

---

## 3. Domain Boundaries

### 3.1 New bounded context / module

| Item | Value |
| ---- | ----- |
| Module | `external-rental` |
| Path | `src/modules/external-rental/` (future) |
| Feature UI | `src/features/external-rental/` (future) |
| Permission namespace | `external-rentals:*` |
| Reference type | `EXTERNAL_RENTAL_AGREEMENT` |

### 3.2 Collaborating modules (read/write integration points)

| Module | Role | Must not own |
| ------ | ---- | ------------ |
| `supplier` | Provider master | Hire-in lifecycle |
| `rental-order` | Customer demand + owned reserve (`reservedQuantity`) | Custody ledger |
| `inventory` / `stock-movement` | **Owned** fleet only | Hired custody |
| `dispatch` | Physical outbound to customer; source-aware split | Supplier return |
| `return` | Customer return inspection; source-aware restock | Supplier settlement |
| `procurement` | Buy title-transfer only | Hire-in |
| `supplier-payment` | Today PO-scoped; MVP settlement tracked on agreement (see §16) | — |
| `rental-invoice` / `payment` | Customer revenue | Hire-in cost |
| `reporting` | Preserve owned Inventory Value; future hire-in KPIs | — |

### 3.3 Why existing aggregates cannot safely own this

| Aggregate | Why unsafe as hire-in owner |
| --------- | --------------------------- |
| `Inventory` | `quantityOnHand` = owned fleet; unique `(productId, warehouseId)`; F-01/F-02 depend on that meaning |
| `PurchaseOrder` | Buy → receive → owned `IN`; no return-to-supplier; settlement is purchase payment |
| `RentalOrder` | Customer commercial + owned lifecycle; bloating it with supplier custody violates SRP and F-02 isolation |
| `Expense` | Ad-hoc cost; no `rentalOrderId`, no custody qty, no return obligation |
| `SupplierPayment` | Hard-wired to `purchaseOrderId` in schema today |

---

## 4. Aggregate Design

### 4.1 Aggregate root: `ExternalRentalAgreement`

| Aspect | Design |
| ------ | ------ |
| **Responsibility** | Own the hire-in commercial + custody lifecycle for one supplier and one rental order |
| **Ownership** | Module `external-rental` |
| **Lifecycle** | See §6 |
| **Contains** | `ExternalRentalAgreementItem[]`; settlement money fields; settlement status |
| **Relationships** | `supplierId`, `warehouseId`, `rentalOrderId` (required, MVP 1:1), `createdById` |
| **Invariants** | Exactly one `rentalOrderId`; warehouse matches order warehouse for MVP; status transitions per §6; money non-negative; `amountPaid ≤ amountDue` |
| **Why exists** | First-class hire-in document distinct from buy PO and from customer rental |
| **Why not elsewhere** | See §3.3 |

### 4.2 Entity: `ExternalRentalAgreementItem`

| Aspect | Design |
| ------ | ------ |
| **Responsibility** | Per-product quantity pipeline + unit cost + link to exact rental line |
| **Ownership** | Child of agreement aggregate |
| **Relationships** | `productId`, `rentalOrderItemId` (required) |
| **Invariants** | Quantity chain in §7; `productId` must match linked `RentalOrderItem.productId`; line hire cost = f(received, unitCost) at recognition |
| **Why exists** | Source-distinguishable qty per customer line |
| **Consolidation** | Custody counters live **on the item** for MVP (no separate custody aggregate table required if counters + warehouse on header suffice) |

### 4.3 Custody representation (MVP): counters on item + warehouse on agreement

**LOCKED choice: dedicated external model (Option B), implemented as agreement + item quantity counters**, not a second `Inventory` row and not an ownership discriminator on owned `Inventory`.

Optional future `ExternalRentalCustodyBalance` projection may be added if reporting needs warehouse×product rollups; **not required for MVP** if all queries go through open agreements.

### 4.4 Allocation (MVP): embedded on item

`quantityAllocated` + `rentalOrderItemId` on the item **is** the allocation. No separate `ExternalRentalAllocation` aggregate for MVP (BD-4 makes allocation 1:1 and total).

### 4.5 Settlement (MVP): money fields on agreement

Settlement state lives on `ExternalRentalAgreement` (`amountDue`, `amountPaid`, `settlementStatus`).

A future `ExternalRentalPayment` entity (analogous to `SupplierPayment` but referencing agreement id) may be added in a later slice if payment posting/void parity with PO payments is required. **MVP may record payments as posted amounts against the agreement** without extending the PO-bound `SupplierPayment` model.

### 4.6 Rejected alternatives

| Alternative | Decision |
| ----------- | -------- |
| A. `Inventory` + ownership discriminator | **Rejected** — high contamination risk to F-01/F-02/valuation |
| C. Shadow warehouse of “borrowed” owned stock | **Rejected** — still mutates owned semantics and analytics |
| Extend `PurchaseOrder` with `orderType=RENT` | **Rejected** — receive still means owned IN today |

---

## 5. Entity / Value Object Design

### 5.1 `ExternalRentalAgreement` (conceptual fields)

| Field | Type (conceptual) | Notes |
| ----- | ----------------- | ----- |
| `id` | UUID | |
| `agreementNumber` | string | Document sequence (future settings integration) |
| `supplierId` | UUID | FK Supplier |
| `warehouseId` | UUID | Physical custody location |
| `rentalOrderId` | UUID | Required; MVP unique among non-cancelled agreements optional soft rule |
| `status` | enum | Operational lifecycle §6 |
| `hireStartDate` / `hireEndDate` | date | Supplier hire period |
| `expectedReturnToSupplierDate` | date | |
| `totalHireInCost` | decimal | Recognized at receive |
| `amountDue` | decimal | |
| `amountPaid` | decimal | default 0 |
| `settlementStatus` | enum | UNSETTLED / PARTIALLY_SETTLED / SETTLED |
| `remarks` | string? | |
| `createdById` | UUID | |
| timestamps | | |

Derived: `outstandingBalance = amountDue − amountPaid`.

### 5.2 `ExternalRentalAgreementItem` (conceptual fields)

| Field | Type | Notes |
| ----- | ---- | ----- |
| `id` | UUID | |
| `agreementId` | UUID | |
| `productId` | UUID | |
| `rentalOrderItemId` | UUID | Exact customer line |
| `quantityRequested` | int | Draft request |
| `quantityConfirmed` | int | Set on confirm |
| `quantityReceived` | int | Cumulative received |
| `quantityAllocated` | int | Cumulative allocated to line (MVP = received) |
| `quantityDispatched` | int | Cumulative sent to customer |
| `quantityReturnedFromCustomer` | int | Cumulative back to MT-ERP custody |
| `quantityReturnedToSupplier` | int | Cumulative returned to supplier |
| `quantityWrittenOff` | int | MVP damage/loss against supplier obligation (default 0) |
| `unitCost` | decimal | Hire cost per unit for recognition basis |
| `lineHireInCost` | decimal | Recognized = `quantityReceived × unitCost` at receive (recomputed on partial receives) |
| `notes` | string? | |

### 5.3 Value objects / pure helpers (future domain)

- `ExternalQuantityPipeline` — invariant checks (§7)
- `HireInMoney` — due/paid/outstanding
- `SourceSplit` — `{ ownedQuantity, externalQuantity }` for a rental line (computed)

### 5.4 Rental order side (smallest extension — conceptual)

**Do not redesign `RentalOrder`.** Preserve:

- `RentalOrderItem.quantity` = **total customer demand**
- `RentalOrderItem.reservedQuantity` = **owned-only** F-01 reserved qty (unchanged meaning)

**Computed / linked (not necessarily new persisted columns on day one):**

| Concept | Source of truth |
| ------- | --------------- |
| `externalAllocatedQuantity` | Σ agreement items for that `rentalOrderItemId` in non-cancelled agreements |
| `ownedTargetQuantity` | `max(0, quantity − externalAllocatedQuantity)` for planning; reserve enforces owned availability |
| Dispatch source split | Derived at dispatch complete from remaining owned reserved vs external allocated |

**Minimal persisted extension candidates (25.5.2+ choose smallest):**

1. **Preferred MVP:** no new columns on `RentalOrderItem`; join via `ExternalRentalAgreementItem.rentalOrderItemId`.
2. **If query pain appears:** optional denormalized `externalAllocatedQuantity` on line — only with sync invariants in UoW.

Dispatch/Return item rows may later gain optional `externalRentalAgreementItemId` **or** source quantities (`ownedQuantity`, `externalQuantity`) — see §9. Prefer adding source fields on dispatch/return **items** over changing rental-order core.

---

## 6. Lifecycle State Machines

### 6.1 Operational status (`ExternalRentalAgreement.status`)

**Chosen states (meaningful only):**

| Status | Meaning |
| ------ | ------- |
| `DRAFT` | Request drafted; not committed |
| `CONFIRMED` | Supplier terms accepted; awaiting custody |
| `PARTIALLY_RECEIVED` | Some but not all confirmed qty received |
| `RECEIVED` | Confirmed qty fully received (or confirm qty reduced to received on close of receiving) |
| `ALLOCATED` | Received qty fully allocated to the linked rental order (MVP: usually immediate with receive) |
| `IN_USE` | Any external qty dispatched to customer |
| `RETURN_PENDING` | External qty back in company custody (from customer) and/or still owed to supplier while not fully closed |
| `RETURNED` | All received qty accounted as returned-to-supplier or written-off |
| `CANCELLED` | Terminal cancel before/at allowed points |

**Not used as separate operational states:** `SETTLED` (money is `settlementStatus`), ephemeral “PARTIALLY_ALLOCATED” (MVP allocates all received).

### 6.2 Allowed transitions

```text
DRAFT → CONFIRMED | CANCELLED
CONFIRMED → PARTIALLY_RECEIVED | RECEIVED | CANCELLED
PARTIALLY_RECEIVED → PARTIALLY_RECEIVED | RECEIVED | CANCELLED*
RECEIVED → ALLOCATED
ALLOCATED → IN_USE | CANCELLED** | RETURNED***
IN_USE → RETURN_PENDING | IN_USE
RETURN_PENDING → RETURN_PENDING | RETURNED
RETURNED → (terminal operational)
CANCELLED → (terminal)
```

\* Cancel after partial receive only if undispatched external qty can be returned/written off per cancel matrix (§13).
\*\* Cancel after allocate only if nothing dispatched (else blocked or requires reverse flows).
\*\*\* Edge: received+allocated but customer never takes stock → supplier return without `IN_USE`.

`ALLOCATED → RECEIVED` is **invalid**.
`RETURNED → IN_USE` is **invalid**.
`CANCELLED → *` is **invalid**.

### 6.3 Settlement status (orthogonal)

| Status | Rule |
| ------ | ---- |
| `UNSETTLED` | `amountPaid = 0` and `amountDue > 0` (or due=0 before recognition) |
| `PARTIALLY_SETTLED` | `0 < amountPaid < amountDue` |
| `SETTLED` | `amountDue = 0` or `amountPaid ≥ amountDue` |

Settlement may complete before or after `RETURNED`; MVP does not force ordering, but UI should warn if settling while qty still outstanding to supplier.

---

## 7. Quantity / Invariants Model

All item quantities are **non-negative integers** and **cumulative counters** unless noted.

### 7.1 Pipeline invariants (LOCKED)

```text
0 ≤ quantityConfirmed ≤ quantityRequested
  (confirm may reduce request; may not increase above request without new request revision — MVP: confirmed ≤ requested)

0 ≤ quantityReceived ≤ quantityConfirmed

0 ≤ quantityAllocated ≤ quantityReceived
  (MVP: on allocate/receive-complete, quantityAllocated := quantityReceived)

0 ≤ quantityDispatched ≤ quantityAllocated

0 ≤ quantityReturnedFromCustomer ≤ quantityDispatched

0 ≤ quantityReturnedToSupplier + quantityWrittenOff ≤ quantityReceived

quantityReturnedToSupplier + quantityWrittenOff + quantityStillWithCustomer + quantityInCompanyCustody
  = quantityReceived
```

Where derived balances:

```text
qtyWithCustomer          = quantityDispatched − quantityReturnedFromCustomer
qtyInCompanyCustody      = quantityReceived − quantityDispatched
                           + quantityReturnedFromCustomer
                           − quantityReturnedToSupplier
                           − quantityWrittenOff
qtyOwedToSupplier        = quantityReceived − quantityReturnedToSupplier − quantityWrittenOff
```

### 7.2 Cross-line / order invariants

- Σ `quantityAllocated` for a `rentalOrderItemId` across non-cancelled agreements ≤ `RentalOrderItem.quantity`.
- Owned reserve: `reservedQuantity ≤ owned fulfillable qty` and existing F-01 predicate against `quantityOnHand` **unchanged**.
- Dispatch of owned qty cannot exceed owned reserved/available path; dispatch of external qty cannot exceed `quantityAllocated − quantityDispatched`.

### 7.3 Ambiguity avoidance

| Name | Kind |
| ---- | ---- |
| `quantityRequested` … `quantityReturnedToSupplier` | Cumulative |
| `qtyWithCustomer` / `qtyInCompanyCustody` / `qtyOwedToSupplier` | **Derived balances** (do not persist unless needed) |

---

## 8. Custody Model

### 8.1 Decision (LOCKED)

**Dedicated external custody model (Option B)** via `ExternalRentalAgreement` + item counters + `warehouseId` on the agreement.

**Rejected:** Option A (ownership discriminator on `Inventory`).

### 8.2 What the system knows

| Question | Answer source |
| -------- | ------------- |
| Who owns legally? | Supplier on agreement (`supplierId`) — always |
| Qty in company custody? | Derived `qtyInCompanyCustody` |
| Where physically? | `warehouseId` (MVP single warehouse = rental order warehouse) |
| Allocated to which order/line? | `rentalOrderId` + item `rentalOrderItemId` + `quantityAllocated` |
| With customer? | Derived `qtyWithCustomer` |
| Still to return to supplier? | Derived `qtyOwedToSupplier` |

### 8.3 Isolation from owned stock movements

| Event | Owned `Inventory` / stock-movement | External counters |
| ----- | ---------------------------------- | ----------------- |
| Receive hire-in | **No** `IN` | `quantityReceived` ↑ |
| Allocate | No | `quantityAllocated` ↑ |
| Dispatch owned | RELEASE + OUT (F-01) | No |
| Dispatch external | **No** owned OUT | `quantityDispatched` ↑ |
| Customer return owned good | IN restock | No |
| Customer return external | **No** owned IN | `quantityReturnedFromCustomer` ↑ |
| Return to supplier | **No** owned OUT | `quantityReturnedToSupplier` ↑ |

Violating this table is a **defect** against this contract.

---

## 9. Rental Order Integration

### 9.1 How an order knows it has external fulfillment

- Existence of non-cancelled `ExternalRentalAgreement` with `rentalOrderId = order.id`.
- API/UI projection: `hasExternalFulfillment`, per-line `externalAllocatedQuantity`.

### 9.2 Link to exact rental line

`ExternalRentalAgreementItem.rentalOrderItemId` **required**.

### 9.3 Reserve (F-01)

- Reserve **owned** shortfall coverage only: continue atomic RESERVE against `Inventory` for owned portion.
- External qty is **not** reserved on `Inventory.reservedQuantity`.
- Practical MVP flow: compute owned date-aware availability → reserve owned qty → source external for remainder → receive/allocate external.

### 9.4 Dispatch

Complete-dispatch becomes **source-aware**:

1. Determine for each line how much of this dispatch is owned vs external (explicit input or default: consume owned reserved first, then external).
2. Owned portion: existing RELEASE + OUT.
3. External portion: increment `quantityDispatched` only; **no** `quantityOnHand` change.
4. Transition agreement `ALLOCATED → IN_USE` when first external qty dispatches.

### 9.5 Customer return

Complete-return becomes **source-aware**:

1. Attribute returned qty to owned vs external (explicit split or policy: return external first / owned first — **MVP policy: operator enters split; default propose external-first up to `qtyWithCustomer`**).
2. Owned good qty: existing restock `IN`.
3. External returned qty: `quantityReturnedFromCustomer` ↑; agreement → `RETURN_PENDING` when custody awaits supplier return.
4. Damage/lost on external: see §15 (`quantityWrittenOff` and/or customer `damageCharge` separately).

### 9.6 Supplier return closes obligation

New application service: `returnExternalRentalToSupplier`:

- Requires qty ≤ `qtyInCompanyCustody` (external units physically at warehouse).
- Increments `quantityReturnedToSupplier`.
- When `qtyOwedToSupplier = 0` → status `RETURNED`.

---

## 10. F-02 Compatibility Contract (LOCKED)

```text
F-02 OWNED AVAILABILITY CONTRACT — UNCHANGED

baseCapacity = quantityOnHand + Σ outstandingOut(owned consuming lines)
dateAwareCommitted = Σ overlapping owned commitmentQuantity
dateAwareAvailableQuantity = max(0, baseCapacity − dateAwareCommitted)

EXTERNAL HIRE-IN MUST NOT ENTER:
  - quantityOnHand
  - baseCapacity
  - dateAwareCommitted (owned)
  - dateAwareAvailableQuantity
```

**Order-scoped external fulfillment:**

```text
Example:
  Demand chairs = 500
  Owned dateAwareAvailable = 300
  External shortfall = 200

  Owned availability remains 300 (never “becomes” 500).
  External agreement covers 200 for this order only.
```

Informational UI may show:

- `ownedDateAwareAvailableQuantity` (F-02)
- `externalShortfallQuantity`
- `externalAllocatedQuantity` (order-scoped)

These are **different metrics**.

---

## 11. F-01 Compatibility Contract (LOCKED)

| F-01 behavior | External impact |
| ------------- | --------------- |
| Atomic RESERVE/RELEASE on owned inventory | Unchanged; applies only to owned qty |
| Cancel-after-reserve | Unchanged for owned; external cancel matrix §13 |
| Dispatch lifecycle / multi-dispatch | Remains; plus source split for external |
| DISPATCHED → ON_RENT | Unchanged order status machine |
| Return compatibility | Remains; plus source split; no owned IN for external |
| Inventory integrity | Owned movements unchanged |
| Analytics Active Rentals contract | Unchanged (CONFIRMED+RESERVED semantics) |

**Hard rule:** Completing dispatch/return for external qty must not create owned `OUT`/`IN` movements for that external qty.

---

## 12. Customer 500-Chair Scenario (Acceptance Design)

**Demand:** 500 chairs, 100 tables; period 10 Aug → 12 Aug.
**Owned F-02 availability:** 300 chairs, 100 tables.
**Shortfall:** chairs 200; tables 0.

| Step | Expected design behavior |
| ---- | ------------------------ |
| 1 | F-02 shows chairs available 300; shortfall 200 |
| 2 | Operator selects supplier (existing Supplier master) |
| 3 | Create `ExternalRentalAgreement` DRAFT for 200 chairs, linked to order + chair line |
| 4 | CONFIRM cost/period → commercial commitment |
| 5 | RECEIVE 200 into custody at order warehouse — **no** `quantityOnHand` ↑ |
| 6 | ALLOCATE 200 to chair `rentalOrderItemId` (MVP with receive) |
| 7 | Reserve owned 300 chairs via F-01; tables 100 owned as available |
| 8 | Dispatch 500 chairs = 300 owned OUT + 200 external counter dispatch; 100 tables owned OUT |
| 9 | Order ON_RENT |
| 10 | Customer returns 500 chairs + 100 tables |
| 11 | Split: 300 chairs owned restock IN; 200 chairs external `quantityReturnedFromCustomer`; tables owned IN |
| 12 | Return 200 chairs to supplier → `quantityReturnedToSupplier=200` → `RETURNED` |
| 13 | Settle hire-in cost (`amountDue` from 200 × unitCost) |
| 14 | Customer invoice/revenue unchanged path; hire-in cost separate on agreement |
| 15 | F-02 owned math never used 500 as owned capacity |

---

## 13. Cancellation Matrix

| ID | Scenario | External allocation | Custody | Rental order | Supplier cost owed? | Supplier return required? |
| -- | -------- | ------------------- | ------- | ------------ | ------------------- | ------------------------- |
| A | Customer cancels before external confirm | Delete/cancel DRAFT | None | Cancel per F-01 rules | No | No |
| B | Customer cancels after CONFIRMED, before receive | Cancel agreement | None | Cancel if F-01 allows | Commercial: MVP **no** recognized cost if never received; optional supplier fee **out of MVP** | No |
| C | Customer cancels after RECEIVED/ALLOCATED, before dispatch | Cancel allocation intent; agreement remains with custody | Still in company custody | Cancel if no blocking dispatch | Yes — recognized at receive; settle or credit later | **Yes** — return all received to supplier |
| D | Customer cancels after dispatch | Not a simple cancel; use return flows | Qty with customer / after return in custody | Follow existing cancel guards (dispatch blocks cancel) | Yes | Yes after customer return |
| E | Supplier cancels before receive | Cancel agreement from CONFIRMED | None | Order remains; shortfall reappears | No recognized cost | No |
| F | Supplier under-delivers | Confirm stays; receive partial | Partial custody | May fulfill partial external; remaining shortfall visible | Recognized on **received** qty only | Return only what was received |

---

## 14. Partial Fulfillment Matrix

| Case | State | Remaining obligations |
| ---- | ----- | --------------------- |
| Requested 200, received 150 | `PARTIALLY_RECEIVED` or closed receive by reducing confirmed to 150 → `RECEIVED` | Cost on 150; owed-to-supplier 150; order still short 50 unless re-sourced |
| Received 200, allocated 150 | **Disallowed in MVP** (allocate all received). If forced later: 50 unallocated custody still `qtyOwedToSupplier` | — |
| Received 200, customer returns 100 | `qtyWithCustomer=100` (if 200 dispatched); custody holds 100 returned | Still owe supplier 200 until supplier returns / write-off |
| Supplier return 80 (of 200 received, 200 back in custody) | `quantityReturnedToSupplier=80` | Still owe supplier 120; status `RETURN_PENDING` |

---

## 15. Damage / Loss Policy Decision

### 15.1 LOCKED MVP policy

1. **Customer-facing damage/lost charges** continue via existing return inspection → rental invoice path (`damageCharge`, lost quantities).
2. **Supplier obligation** for hired units: any external unit not returned to supplier in acceptable condition increments `quantityWrittenOff` (closes qty owed) **and may increase `amountDue`** by a supplier claim amount (manual field on settle/adjust — keep minimal).
3. Customer charge and supplier claim are **separate**. Collecting from customer does not auto-pay supplier; paying supplier does not auto-invoice customer.

### 15.2 Alternatives (DEFERRED choice beyond MVP defaults)

| Policy | When to consider |
| ------ | ---------------- |
| Company absorbs supplier liability | If commercial policy never back-charges customers |
| Contractual split % | Needs richer claim documents |
| Serial-level liability | Needs asset tracking (non-goal) |

---

## 16. Financial / Settlement Model

### 16.1 Minimal operational money state (on agreement)

| Field | Meaning |
| ----- | ------- |
| Item `unitCost` | Hire cost per unit |
| `lineHireInCost` / `totalHireInCost` | Recognized at receive = Σ received × unitCost |
| `amountDue` | Equals recognized total unless adjusted for claims |
| `amountPaid` | Cumulative payments recorded |
| `outstandingBalance` | `amountDue − amountPaid` |
| `settlementStatus` | UNSETTLED / PARTIALLY_SETTLED / SETTLED |

### 16.2 Links

- Required: `rentalOrderId`
- Required: `rentalOrderItemId` on each item (line-level cost attribution)

### 16.3 Explicitly not redesigned

Chart of Accounts, JournalEntry, financial-report P&L, Better Auth, payment method enums (reuse existing `PaymentMethod` when payment entity added).

### 16.4 Supplier payment reuse

**MVP:** do **not** force `SupplierPayment.purchaseOrderId` to point at fake POs. Record settlement on the agreement (and optionally a future `ExternalRentalPayment`). Extending `SupplierPayment` to polymorphic targets is a **later** optional refactor.

---

## 17. Permissions (conceptual — do not add to production yet)

Follow existing `module:action` pattern (`src/shared/application/authorization/permissions.ts`).

| Permission | Intent |
| ---------- | ------ |
| `external-rentals:read` | View agreements |
| `external-rentals:create` | Create/update DRAFT |
| `external-rentals:confirm` | Confirm commercial terms |
| `external-rentals:receive` | Receive custody |
| `external-rentals:allocate` | Allocate to order (may merge with receive in API) |
| `external-rentals:return-to-supplier` | Close supplier qty obligation |
| `external-rentals:settle` | Record payments / mark settlement |
| `external-rentals:cancel` | Cancel agreement when allowed |

Role mapping (future): owner/manager for confirm/settle; worker for receive/return; viewer read-only — align with `role-permissions.ts` style when implementing.

---

## 18. Audit Events

Reuse existing `IAuditLogger` / UoW audit context (Phase 4B). Entity name e.g. `ExternalRentalAgreement`.

| Transition / action | Audit required |
| ------------------- | -------------- |
| Create DRAFT | Yes |
| Confirm | Yes |
| Receive (partial/full) | Yes |
| Allocate | Yes (if separate) |
| Linkage to rental order/line | Yes (on create/confirm) |
| External portion of customer dispatch | Yes (dispatch service + external counters) |
| External portion of customer return | Yes |
| Return to supplier | Yes |
| Settlement payment / status change | Yes |
| Cancel | Yes |
| Write-off / amountDue adjustment | Yes |

Do not invent a new audit framework.

---

## 19. Concurrency Risks

**No full race-safety claim** (consistent with accepted F-02 concurrent limitation).

| Risk | MVP mitigation (design only) |
| ---- | ---------------------------- |
| Double allocation beyond line qty | Conditional update: allocate only if Σ allocated + delta ≤ line quantity inside UoW |
| Duplicate receive | Persist received cumulatively with `≤ confirmed` check in UoW |
| Duplicate supplier return | `returnedToSupplier + delta ≤ owed` check |
| Cancel during sourcing | Status guards; optimistic status predicate on update |
| Concurrent F-02 owned reserve + external create | Owned reserve remains source of truth for owned; external cannot increase owned capacity — worst case oversell owned still F-02 race, not solved here |
| Two agreements for same order line overselling demand | Unique active agreement per order MVP soft rule + Σ allocated ≤ line qty |

---

## 20. Analytics Contract

### 20.1 Preserve (LOCKED)

From Analytics Metric Contract / inventory reporting:

```text
Inventory Value = owned quantityOnHand × purchaseCost
```

External custody **must not** inflate Inventory Value, owned qty, F-02 capacity, or owned fleet KPIs.

### 20.2 Future reporting candidates (DO NOT IMPLEMENT NOW)

- External hired quantity (received / in custody / with customer)
- Open supplier return obligation
- Hire-in cost recognized / outstanding
- External fulfillment agreement count
- Order-level hire-in margin proxy: customer line revenue − line hire-in cost (operational, not GL)

---

## 21. Prisma Schema Concept (NOT APPLIED)

Conceptual only — **no migration in 25.5.1**.

```prisma
enum ExternalRentalAgreementStatus {
  DRAFT
  CONFIRMED
  PARTIALLY_RECEIVED
  RECEIVED
  ALLOCATED
  IN_USE
  RETURN_PENDING
  RETURNED
  CANCELLED
}

enum ExternalRentalSettlementStatus {
  UNSETTLED
  PARTIALLY_SETTLED
  SETTLED
}

model ExternalRentalAgreement {
  id                           String                         @id @default(uuid()) @db.Uuid
  agreementNumber              String                         @unique
  supplierId                   String                         @db.Uuid
  warehouseId                  String                         @db.Uuid
  rentalOrderId                String                         @db.Uuid
  status                       ExternalRentalAgreementStatus  @default(DRAFT)
  settlementStatus             ExternalRentalSettlementStatus @default(UNSETTLED)
  hireStartDate                DateTime                       @db.Date
  hireEndDate                  DateTime                       @db.Date
  expectedReturnToSupplierDate DateTime                       @db.Date
  totalHireInCost              Decimal                        @default(0) @db.Decimal(12, 2)
  amountDue                    Decimal                        @default(0) @db.Decimal(12, 2)
  amountPaid                   Decimal                        @default(0) @db.Decimal(12, 2)
  remarks                      String?
  createdById                  String                         @db.Uuid
  createdAt                    DateTime                       @default(now())
  updatedAt                    DateTime                       @updatedAt
  items                        ExternalRentalAgreementItem[]
  // relations: Supplier, Warehouse, RentalOrder, User
}

model ExternalRentalAgreementItem {
  id                            String  @id @default(uuid()) @db.Uuid
  agreementId                   String  @db.Uuid
  productId                     String  @db.Uuid
  rentalOrderItemId             String  @db.Uuid
  quantityRequested             Int
  quantityConfirmed             Int     @default(0)
  quantityReceived              Int     @default(0)
  quantityAllocated             Int     @default(0)
  quantityDispatched            Int     @default(0)
  quantityReturnedFromCustomer  Int     @default(0)
  quantityReturnedToSupplier    Int     @default(0)
  quantityWrittenOff            Int     @default(0)
  unitCost                      Decimal @db.Decimal(12, 2)
  lineHireInCost                Decimal @default(0) @db.Decimal(12, 2)
  notes                         String?
}
```

**Optional later (dispatch/return integration):**

```prisma
// On DispatchItem / ReturnInspectionItem (future slice):
ownedQuantity    Int?
externalQuantity Int?
externalRentalAgreementItemId String? @db.Uuid
```

**Explicitly do not change:** `Inventory.quantityOnHand` meaning; `PurchaseOrder` model purpose.

---

## 22. API Concept (NOT IMPLEMENTED)

Align with existing REST style (`/api/purchase-orders`, `/api/rental-orders`).

| Method | Path | Permission |
| ------ | ---- | ---------- |
| GET | `/api/external-rentals` | read |
| POST | `/api/external-rentals` | create |
| GET | `/api/external-rentals/:id` | read |
| PATCH | `/api/external-rentals/:id` | create (draft update) |
| POST | `/api/external-rentals/:id/confirm` | confirm |
| POST | `/api/external-rentals/:id/receive` | receive |
| POST | `/api/external-rentals/:id/allocate` | allocate (optional if merged) |
| POST | `/api/external-rentals/:id/return-to-supplier` | return-to-supplier |
| POST | `/api/external-rentals/:id/settle` | settle |
| POST | `/api/external-rentals/:id/cancel` | cancel |

Rental-order read DTO may later include external fulfillment summary (non-breaking additive fields).

Shortfall helper (optional read): extend availability response with `externalShortfallQuantity = max(0, requested − dateAwareAvailableQuantity)` — **informational only**.

---

## 23. UI Concept (NOT IMPLEMENTED)

Follow `src/features/*` page patterns.

1. Rental order detail / reserve: show F-02 owned availability + shortfall.
2. Action: **Source Externally** → create agreement wizard (supplier, qty, unit cost, dates).
3. Agreement detail: status timeline, receive, allocate, return-to-supplier, settle.
4. Dispatch/return forms: show owned vs external remaining; capture source split when completing.
5. No quotation UI; no marketplace UI.

---

## 24. Test / Acceptance Matrix (future)

| ID | Scenario | Pass criteria |
| -- | -------- | ------------- |
| T1 | Receive hire-in | `quantityOnHand` unchanged; counters ↑ |
| T2 | F-02 after receive | `dateAwareAvailableQuantity` unchanged by hire-in |
| T3 | Mixed dispatch | Owned OUT+RELEASE only for owned qty; external counters only for external |
| T4 | Mixed return | Owned IN only for owned good; external customer-return counter only for external |
| T5 | Supplier return | Obligation closes; owned inventory unchanged |
| T6 | 500-chair scenario | §12 end-to-end |
| T7 | Cancel A–F | §13 matrix |
| T8 | Under-delivery | Cost on received only |
| T9 | Inventory Value | Unchanged by custody |
| T10 | F-01 regression | Existing reserve/cancel/dispatch/return tests remain green |
| T11 | F-02 regression | Scenario matrix remains green; no borrow API on owned availability |

---

## 25. Explicit Non-Goals (LOCKED OUT OF MVP)

- Quotation / proforma module
- Marketplace / supplier discovery / bidding / price comparison
- Multi-provider optimization
- Multi-order shared external pools
- Asset serial tracking
- Full job-cost GL redesign
- Global borrowed inventory pool
- F-02 merging of external stock into owned capacity
- Replacing or overloading `PurchaseOrder`
- Full concurrency/race redesign system-wide
- Soft-delete master data
- Implementing permissions/API/UI/schema in 25.5.1

---

## 26. Implementation Slice Plan 25.5.2–25.5.6

| Slice | Scope | Exit criteria |
| ----- | ----- | ------------- |
| **25.5.2** | Prisma schema + migration for agreement/items; module skeleton (domain types/constants only as needed) | Schema merged; owned Inventory untouched semantically |
| **25.5.3** | Domain + application services: create/update draft, confirm, receive, allocate; UoW; audit; permissions | Can confirm/receive/allocate without touching `quantityOnHand` |
| **25.5.4** | Rental-order shortfall projection; dispatch/return source-aware integration; F-01 owned path preserved | Mixed fulfill works; F-01/F-02 regression green |
| **25.5.5** | Return-to-supplier; settlement; API + minimal UI | §12 steps 12–14 operable |
| **25.5.6** | Scenario tests (T1–T11); analytics isolation asserts | Hardening complete; ready to close F-03 MVP |

---

## 27. Risks

| Risk | Level | Mitigation |
| ----- | ----- | ---------- |
| Accidental owned `IN`/`OUT` for hire-in | High | Contract tests T1/T3/T4; code review checklist |
| F-02 contamination | High | T2/T11; no inventory writes on receive |
| Dispatch/return split UX errors | Medium | Explicit split fields + defaults |
| Settlement vs PO payment confusion | Medium | Keep money on agreement; document non-use of PO |
| Scope creep into quotation/GL | Medium | Non-goals §25 |
| Cancel-after-dispatch complexity | Medium | Defer to return flows; keep F-01 cancel guards |
| Denormalized line fields drifting | Low | Prefer join-only MVP |

---

## 28. Final Go / No-Go Recommendation

### GO for Phase 25.5.2 (schema) **after product acceptance of this lock**

| Check | Result |
| ----- | ------ |
| Business capability correct after F-01/F-02 | Yes — external hire-in |
| Custody isolated from `quantityOnHand` | Yes — dedicated agreement/item counters |
| F-01 contract preserved | Yes |
| F-02 contract preserved | Yes |
| PO not overloaded | Yes |
| Quotation not required first | Yes |
| Architecture preservation | Yes |
| Production code changed in 25.5.1 | **Must remain No** |

### NO-GO for feature coding until

1. This document is accepted.
2. BD-1…BD-13 remain locked.
3. Slice 25.5.2 starts from clean `main` with explicit implementation brief.

---

## Appendix A — Repository grounding (evidence)

| Area | Evidence |
| ---- | -------- |
| Owned inventory fields | `prisma/schema.prisma` `model Inventory` — `quantityOnHand`, `reservedQuantity`; `@@unique([productId, warehouseId])` |
| F-02 formula | `src/modules/rental-order/domain/rental-order.availability.rules.ts` — `baseCapacity = quantityOnHand + outstandingOut` |
| F-01 reserve | `reserve-rental-order.service.ts` + inventory reserve predicates |
| Dispatch stock effect | `complete-dispatch.service.ts` — RELEASE then OUT |
| Return restock | `complete-return.service.ts` / `computeRestockQuantity` — owned IN for good qty |
| PO buy receive | `receive-purchase-order.service.ts` — stock IN to owned inventory |
| Supplier payment PO coupling | `SupplierPayment.purchaseOrderId` required in schema |
| Expense lacks rental link | `Expense` has optional `supplierId`, no `rentalOrderId` |
| Permissions pattern | `src/shared/application/authorization/permissions.ts` |
| Audit pattern | `IAuditLogger` via UoW / shared DI (Phase 4B) |
| F-03 absence guard | `f02-scenario-matrix.25.4.6.test.ts` |
| Decision doc convention | `docs/decisions/ANALYTICS_METRIC_CONTRACT_v1.0.md` |

---

## Appendix B — Decision summary table

| ID | Decision | Status |
| -- | -------- | ------ |
| BD-1 | Supplier-rented / hired-in | LOCKED |
| BD-2 | Supplier retains legal ownership | LOCKED |
| BD-3 | Excluded from F-02 owned availability | LOCKED |
| BD-4 | One agreement → one rental order | LOCKED |
| BD-5 | Reuse Supplier master | LOCKED |
| BD-6 | New module `external-rental` | LOCKED |
| BD-7 | Usable only after confirm + receive/allocate | LOCKED |
| BD-8 | Mixed fulfillment; distinguishable sources | LOCKED |
| BD-9 | Customer return ≠ supplier return | LOCKED |
| BD-10 | Agreement-level settlement fields | LOCKED |
| BD-11 | Cost recognized at RECEIVE | LOCKED |
| BD-12 | Customer charge ≠ supplier liability auto-link | LOCKED |
| BD-13 | Hire period fields on agreement | LOCKED |
| Custody | Dedicated external model (not Inventory flag) | LOCKED |

---

*End of Phase 25.5.1 Decision Lock / Domain Design*
