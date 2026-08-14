# Phase 28 — Mixed Return Source / Condition Attribution Decision Lock

**Document:** Mixed Return Source & Condition Attribution v1.0  
**Status:** ACCEPTED FOR IMPLEMENTATION  
**Date:** 2026-08-13  
**Baseline HEAD:** `7eb1afcab96f408e7c8c30d7ee854688f6050b24` (`feat(external-rental): add supplier hire-in write-off workflow`)  
**Scope:** Decision lock + documentation only. **No production implementation in this phase.**  
**Related:** `EXTERNAL_RENTAL_SOURCING_25.5.1.md`; Phase 25.5.4 source-aware dispatch/return; Phase 25.10 enterprise audit HIGH finding; Phase 27 write-off; F-01 Physical Rental Lifecycle; F-02 Date-Aware Availability

---

## How to read this document

| Layer | Meaning |
| ----- | ------- |
| **LOCKED** | Approved business decision for the next implementation phase — do not reopen without a new decision phase |
| **DISCOVERED** | Current production behavior (may be unsafe relative to the lock) |
| **DEFERRED** | Explicit non-goal for the next mixed-return implementation |

```text
Phase 28 Status:
ACCEPTED FOR IMPLEMENTATION — DOCUMENTATION ONLY
```

Do **not** start production coding for mixed-return source×condition attribution until this document is explicitly accepted (this phase accepts it).

---

## 1. Title

Mixed Return / Condition Attribution — Source-Safe Customer Return Policy

## 2. Status

**ACCEPTED FOR IMPLEMENTATION**

## 3. Date

2026-08-13

## 4. Baseline commit

`7eb1afc` — `feat(external-rental): add supplier hire-in write-off workflow`

Working tree at decision time: clean. Branch `main` ahead of `origin/main` by 5 commits. No push in this phase.

## 5. Problem statement

Post-Phase-25.10 enterprise audit classified **mixed return condition attribution** as **HIGH**: the system is not source-safe enough for serious production when a rental line is fulfilled from both:

1. **OWNED** company inventory  
2. **EXTERNAL** supplier-hire-in quantity (ERA custody)

A customer return must distinguish:

| Dimension | Required distinction |
| --------- | -------------------- |
| Source | owned vs external |
| Condition | GOOD / DAMAGED / LOST (existing domain terms) |

**Primary safety requirement:** EXTERNAL supplier-hire quantity MUST NEVER be accidentally restocked into owned `Inventory`.

Secondary safety requirement: when both sources are outstanding on a line, the operator must **knowingly** attribute returned quantity — the system must not silently prefer owned or external.

## 6. Existing behavior discovered

### 6.1 Models and fields (already present — no schema change in Phase 28)

| Area | Finding |
| ---- | ------- |
| `DispatchItem` | `ownedQuantity` / `externalQuantity` nullable (Phase 25.5.4). Null = legacy owned-only (`ownedQuantity = quantity`). |
| `ReturnInspectionItem` | `ownedQuantity` / `externalQuantity` nullable; condition counters: `goodQuantity`, `brokenQuantity` (domain: `damagedQuantity`), `lostQuantity`, `missingQuantity`, plus unused/legacy `repairQuantity`. |
| `RentalOrderItem` | No source-split ledger; dispatch/return items carry the split. |
| `Inventory` | Owned-stock ledger only (`quantityOnHand`, `reservedQuantity`, `purchaseCost`). |
| `ExternalRentalAgreementItem` | Custody counters including `quantityDispatched`, `quantityReturnedFromCustomer` / customer-returned, `quantityReturnedToSupplier`, `quantityWrittenOff`. |

### 6.2 Dispatch (source-aware)

- Complete dispatch already splits OUT / reservation effects by owned vs external.
- Owned quantity drives owned stock OUT / reservation consumption.
- External quantity updates ERA `withDispatched` only — no owned inventory mutation.
- T3 matrix covers mixed owned+external dispatch.

### 6.3 Customer return pipeline

Lifecycle: `DRAFT → RECEIVED → INSPECTED → COMPLETED` (cancel allowed before complete).

| Step | Behavior |
| ---- | -------- |
| Create/receive return | May carry `ownedQuantity` / `externalQuantity`. |
| Inspect | Operator sets `goodQuantity`, `damagedQuantity`, `lostQuantity`, `missingQuantity` summing to `returnedQuantity`. |
| Complete | Owned path: `RELEASE` (owned returned) + `IN` for restock qty; External path: ERA `withCustomerReturned(externalQty)` in same return UoW. |

Helpers:

- `computeReleaseQuantity` → effective owned returned  
- `computeRestockQuantity` → `min(goodQuantity, ownedReturned)`  
- `computeExternalCustomerReturnQuantity` → effective external returned  

### 6.4 CRITICAL GAP — automatic owned-first inference

`resolveReturnSourceSplit` (return domain) when **both** source fields are omitted:

```text
owned    = min(quantity, ownedRemaining)
external = quantity - owned
```

This is **automatic owned-first allocation**.  
It contradicts **BD-28.20** and is the core of the HIGH audit finding.

The same owned-first pattern exists on dispatch (`resolveDispatchSourceSplit`) when source fields are omitted; dispatch is out of Phase 28 implementation scope but noted for consistency awareness.

When source fields **are** provided:

- `owned + external = quantity` is enforced  
- each source ≤ remaining outstanding for that source  
- negatives rejected  

T4 matrix proves the **happy path when attribution is explicit**: owned restocks; external only increments ERA customer-returned; no external → owned IN.

### 6.5 Condition vs source (orthogonal today)

Source split is captured at return create time.  
Condition split is captured at inspect time.  
They are **orthogonal**, not a joint matrix.

Consequence: `restock = min(good, ownedReturned)` can restock owned units as GOOD even when the operator’s GOOD total partially reflects external GOOD / owned DAMAGED misalignment. External still never receives an owned `IN` (safety for BD-28.4 is partially present), but **joint source×condition truth is not enforced**.

### 6.6 Existing owned condition behavior

| Condition | Owned inventory effect on complete |
| --------- | ---------------------------------- |
| GOOD | Eligible for `IN` restock (capped by owned returned) |
| DAMAGED | No `IN` (not included in `computeRestockQuantity`) |
| LOST | No `IN`; `RELEASE` still clears owned reservation; dedicated `RETURN` audit for lost qty |
| MISSING | Included in inspect sum; no separate restock path (same non-GOOD treatment as non-restock) |

There is **no** damaged-stock / quarantine inventory subsystem. Damaged owned quantity does not enter usable `quantityOnHand` via return complete today.

### 6.7 Existing external condition behavior

All external returned quantity (any inspect condition) increments ERA customer-returned custody only.  
No automatic write-off, no automatic supplier return, no automatic settlement, no owned stock movement.

Phase 27 write-off remains a separate operator workflow against company custody after customer return / receive semantics.

### 6.8 Tests already present

- F-01 dispatch/return application tests (owned-only RELEASE/IN/lost).  
- Source-aware dispatch/return application tests.  
- External scenario matrix T3 (mixed dispatch), T4 (mixed return with **explicit** split), T9 write-off reconstitution / Phase 27 write-off workflow.  
- Custody formulas include written-off in owed/company custody.

### 6.9 Audit / UoW

- Return complete already audits `sourceQuantities` (owned/external effective) and uses the return transaction runner.  
- External customer-return ERA update already runs inside that same complete-return UoW when external qty > 0.  
- Future work must keep atomicity and enrich audit with condition + joint attribution.

### 6.10 Contradiction check vs proposed BD-28

| Topic | Unsafe for locking BD-28? |
| ----- | ------------------------- |
| Owned-first auto inference | **No** — current code is unsafe; BD-28 corrects it. Document as gap to close. |
| External never IN when explicit split used | Aligns with BD-28.4 / T4. |
| GOOD/DAMAGED/LOST terminology | Aligns; reuse existing names. |
| Orthogonal condition vs source | Gap for BD-28.7–12; future implementation must make intersection outcomes enforceable. |
| Schema sufficiency | Fields exist for source split + condition buckets; **no migration required for this decision**. Exact future API shape for a joint matrix may reuse/extend application contracts without inventing a second inventory ledger. |

**Verdict for Phase 28:** no blocking contradiction. Policy is **ACCEPTED**.

## 7. Source attribution decision

### BD-28.1 — Return quantity must be source-attributed (LOCKED)

Every customer return line that has **both** outstanding owned and outstanding external quantity must **explicitly** attribute:

- `ownedReturnedQuantity`
- `externalReturnedQuantity`

Do **not** infer attribution from total returned quantity alone when both sources are outstanding.

### BD-28.2 — Source quantities must reconcile (LOCKED)

For each returned line:

```text
ownedReturnedQuantity + externalReturnedQuantity = totalReturnedQuantity
ownedReturnedQuantity <= outstandingOwnedQuantity
externalReturnedQuantity <= outstandingExternalQuantity
ownedReturnedQuantity >= 0
externalReturnedQuantity >= 0
```

Reject negatives, over-return, and sum mismatches.

### BD-28.13 — Outstanding caps (LOCKED)

Reject if owned returned > outstanding owned **or** external returned > outstanding external.

### BD-28.20 — No automatic inference on mixed lines (LOCKED)

For mixed lines (both sources outstanding):

- Do **not** silently compute `external = total - owned` without explicit operator-provided attribution.  
- Do **not** allocate owned-first or external-first.  
- Current `resolveReturnSourceSplit` owned-first fallback for omitted fields on mixed remaining capacity is **non-compliant** and must be removed/replaced in the future implementation phase.

### BD-28.19 — Backward compatibility (LOCKED)

Owned-only returns (no external outstanding / legacy null source fields with external remaining = 0) must continue to behave as today’s F-01 owned return path.  
Do not require external source fields when no external quantity exists.

## 8. Owned return rules

### BD-28.3 — Owned returned quantity (LOCKED)

Only owned returned quantity may affect owned inventory.  
Reuse existing F-01 return behaviors:

- RELEASE semantics for owned returned quantity  
- IN stock movement only where existing restock rules allow  
- No F-01 formula redesign  

### BD-28.7 — GOOD + OWNED (LOCKED)

Uses existing F-01 restock behavior (`IN` for good owned quantity).  
No new inventory semantics.

### BD-28.8 — DAMAGED + OWNED (LOCKED)

Do **not** automatically add damaged quantity to usable `quantityOnHand` unless/until an explicit damaged-stock capability exists (it does **not** today).  
Future implementation must preserve non-usable treatment; do **not** invent damaged inventory tables in the next bounded phase unless a later decision explicitly opens that scope.

### BD-28.9 — LOST + OWNED (LOCKED)

Must **not** create inventory `IN`.  
Preserve that the item was not returned to usable owned stock (existing lost path + RELEASE/audit pattern).  
Do not invent a loss-accounting / GL workflow in the next phase.

## 9. External return rules

### BD-28.4 — External returned quantity (LOCKED)

External returned quantity MUST NOT:

- increase `Inventory.quantityOnHand`  
- create owned stock `IN`  
- modify `Inventory.purchaseCost`  
- modify `RentalOrderItem.reservedQuantity` as an owned reservation restock path  
- alter F-02 capacity / date-aware availability  
- alter owned inventory valuation  

Instead, update the existing ERA custody pipeline:

```text
quantityCustomerReturned  (domain: quantityReturnedFromCustomer)
qtyWithCustomer = dispatched − customerReturned
```

### BD-28.10 — GOOD + EXTERNAL (LOCKED)

Updates external customer-return custody only.  
Later available for supplier return via existing supplier-return workflow.  
Never enters owned Inventory.

### BD-28.11 — DAMAGED + EXTERNAL (LOCKED)

Must not enter owned Inventory.  
Remains supplier-owned custody resolvable later via supplier return and/or write-off per existing ERA rules.  
**Do not** auto-write-off merely because damaged.

### BD-28.12 — LOST + EXTERNAL (LOCKED)

Must not enter owned Inventory.  
Eventually resolved through existing external write-off / custody mechanisms (Phase 27).  
**Do not** auto-settle supplier payment.

### BD-28.14 — External custody remains authoritative (LOCKED)

ERA counters remain the only external quantity system.  
Do not create a second external inventory ledger.

### BD-28.15 — Inventory remains owned-only (LOCKED)

`Inventory` remains an owned-stock ledger.  
External hire-in must never be represented as owned Inventory.

## 10. Condition attribution rules

### BD-28.6 — Condition attribution (LOCKED)

Reuse existing domain terminology:

| Business condition | Existing names |
| ------------------ | -------------- |
| GOOD | `GOOD` / `goodQuantity` |
| DAMAGED | `DAMAGED` / `damagedQuantity` (DB: `brokenQuantity`) |
| LOST | `LOST` / `lostQuantity` |

`RETURN_CONDITIONS = ["GOOD", "DAMAGED", "LOST"]` already exists in return domain constants.

**Do not invent duplicate terminology.**  
**Do not add enums/schema in Phase 28.**

### Condition is return-event classification (LOCKED product posture)

For MVP, do **not** introduce a complex item-condition inventory subsystem.  
Condition attribution classifies the return event; it is not a new inventory architecture.

### MISSING bucket (DEFERRED naming policy)

Production inspect UI/API also has `missingQuantity`, which participates in the inspect sum with good/damaged/lost.  
`RETURN_CONDITIONS` does not list MISSING.

**Deferred decision for implementation design:**

- Prefer treating MISSING as operationally equivalent to LOST for ownership/restock outcomes (no `IN`), **or**  
- Keep MISSING as a fourth inspect bucket that still maps to the LOST external/owned non-restock outcomes.

Do not rename columns or invent a fifth inventory state in the next phase without need.

### Joint source×condition outcomes (LOCKED)

Future implementation must make the BD-28.7–12 intersection outcomes true and testable.  
Exact API shape (full 2D cells vs staged source-then-condition with enforceable constraints) is an implementation design choice, but **orthogonal silent composition that can mis-restock owned GOOD is non-compliant** when both sources and mixed conditions exist.

Minimum safety invariant that must always hold:

```text
owned inventory IN quantity
  <= ownedReturnedQuantity
  AND only from GOOD owned returned quantity
external quantity never contributes to owned IN
```

## 11. Mixed return example

```text
Owned dispatched     = 60
External dispatched  = 40
Customer returns     = 50

Operator explicitly attributes:
  owned returned     = 30
  external returned  = 20

Expected:
  owned inventory return effects apply to 30 only
  ERA customerReturned += 20
  total returned     = 50
```

Never automatically assign all 50 to owned stock.  
Never automatically assign all 50 to external.

## 12. Custody reconciliation

After external customer return:

```text
qtyWithCustomer      = dispatched − customerReturned
qtyInCompanyCustody  = received − dispatched + customerReturned
                       − supplierReturned − writtenOff
qtyOwedToSupplier    = received − supplierReturned − writtenOff
```

Use existing custody helpers — do not duplicate formulas.  
Supplier return / write-off remain separate post-customer-return workflows.

## 13. Ownership / inventory isolation

| Action | Allowed for external qty? |
| ------ | ------------------------- |
| `Inventory.quantityOnHand` ↑ | **No** |
| Owned stock `IN` | **No** |
| Owned stock `OUT` | **No** (external was never owned OUT) |
| `purchaseCost` mutation | **No** |
| New external inventory table | **No** |
| ERA customer-returned counter | **Yes** |

## 14. F-01 isolation

- Do not modify F-01 formulas.  
- Owned-only GOOD returns keep existing RELEASE/IN behavior.  
- Mixed returns apply F-01 effects **only** to the owned attributed portion.

## 15. F-02 isolation

- Do not modify F-02 formulas.  
- External returned/dispatched quantity must not change date-aware availability capacity.  
- Owned restock may affect future availability only through existing owned on-hand / reservation semantics.

## 16. Valuation isolation

- Do not modify inventory valuation.  
- External quantity must not change owned inventory value (`quantityOnHand × purchaseCost`).

## 17. Settlement isolation

### BD-28.16 (LOCKED)

Mixed returns must not automatically:

- settle ERA  
- modify `amountPaid`  
- create `SupplierPayment`  
- create GL entries  
- alter hire-in cost  

Existing settlement remains authoritative and orthogonal.

## 18. Audit expectations

### BD-28.17 (LOCKED)

Future successful mixed/conditioned returns must audit (existing audit architecture):

- total returned quantity  
- owned returned quantity  
- external returned quantity  
- condition attribution (GOOD / DAMAGED / LOST [+ MISSING if still used])  
- resulting source quantities / restock & ERA effects  

Do **not** create a new audit framework.

## 19. Transaction / UoW expectations

### BD-28.18 (LOCKED)

Future implementation must execute, atomically, inside the existing return UoW / transaction runner:

1. Source attribution validation  
2. Condition classification validation  
3. Owned stock movements (as applicable)  
4. External ERA counter update (as applicable)  
5. Audit  

Do **not** implement in Phase 28.

## 20. Backward compatibility

- Owned-only legacy returns (`ownedQuantity`/`externalQuantity` null, external remaining = 0) remain valid.  
- Existing owned F-01 tests must remain green.  
- Explicit mixed attribution already used by T4 remains the compliant pattern.

## 21. Rejected alternatives

Explicitly reject:

1. Treating every customer return as owned inventory.  
2. Treating every customer return as external.  
3. Automatically allocating mixed returns to owned first *(current non-compliant fallback)*.  
4. Automatically allocating mixed returns to external first.  
5. Using a generic inventory-source abstraction framework.  
6. Creating a second external inventory ledger.  
7. Adding a new inventory table for external stock.  
8. Automatically writing off damaged external quantity.  
9. Automatically settling supplier payment for damaged/lost quantity.  
10. Automatically changing F-02 availability.  
11. Changing inventory valuation.  
12. Changing F-01 formulas.  
13. Adding SupplierPayment / GL as part of return complete.  
14. Creating marketplace / supplier pools.  
15. Creating a supersession graph.  
16. Soft-delete.  
17. Replacing the existing ERA custody model.  

## 22. NEXT implementation scope

Bounded future phase (not this phase) should:

1. Require explicit source attribution whenever both owned and external outstanding quantities exist on a return line.  
2. Remove/replace owned-first silent inference for those mixed lines.  
3. Enforce BD-28.2 / BD-28.13 reconciliation.  
4. Preserve owned-only backward compatibility (BD-28.19).  
5. Enforce source×condition outcomes A–F (section 24) without inventing damaged-stock tables.  
6. Keep external path on ERA customer-returned only.  
7. Keep complete-return UoW atomicity.  
8. Enrich audit with source + condition attribution.  
9. Extend UI/API only as needed for explicit mixed attribution (and joint condition safety).  
10. Add focused acceptance tests for A–O; keep F-01/F-02/external matrix regressions green.

## 23. Explicitly out-of-scope items

| Item | Status |
| ---- | ------ |
| Phase 28 production code | Out of scope |
| Schema / migration | Out of scope (fields already exist) |
| API / frontend / permissions changes | Out of scope for Phase 28 |
| Damaged-stock inventory subsystem | Deferred |
| Loss accounting / GL / SupplierPayment | Deferred |
| Automatic write-off on damaged/lost external | Rejected |
| Automatic supplier settlement on return | Rejected |
| F-01 / F-02 / valuation / analytics redesign | Rejected |
| Marketplace / supplier pools / generic source framework | Rejected |
| Dispatch owned-first inference redesign | Deferred (noted; not required to lock return policy) |
| Write-off reversal | Rejected / out of scope |
| Concurrency / idempotency redesign | Out of scope |

## 24. Future acceptance criteria

Documented for the future implementation phase — **DO NOT IMPLEMENT NOW**.

| ID | Criterion |
| -- | --------- |
| **A** | Owned-only GOOD return: existing F-01 IN behavior unchanged. |
| **B** | Owned-only DAMAGED return: no automatic usable-stock increase; no F-02 contamination via invented damaged stock. |
| **C** | Owned-only LOST return: no inventory IN. |
| **D** | External-only GOOD return: ERA customerReturned increases; no owned inventory mutation. |
| **E** | External-only DAMAGED return: ERA custody preserved for later supplier return/write-off; no owned inventory mutation; no auto write-off. |
| **F** | External-only LOST return: no owned inventory mutation; eventual resolution via existing write-off/custody; no auto settlement. |
| **G** | Mixed return example (60/40 dispatch, return 50 as 30/20): owned effects = 30; ERA customerReturned = 20; total = 50. |
| **H** | Over-attribution rejected (source > outstanding). |
| **I** | Under/over reconciliation rejected (`owned + external != total`). |
| **J** | No automatic settlement / amountPaid / hire-in cost changes. |
| **K** | Audit traces source + condition attribution. |
| **L** | Attribution + owned movements + ERA update are atomic. |
| **M** | Owned-only F-01 regression suite remains green. |
| **N** | External quantity does not affect F-02 date-aware availability. |
| **O** | External quantity does not affect inventory valuation. |

## 25. Open / deferred decisions

| Item | Status | Note |
| ---- | ------ | ---- |
| Exact API/UI shape for joint source×condition cells vs constrained orthogonal entry | **Implementation design** | Outcomes A–F are locked; wire format is next-phase design |
| Treat `missingQuantity` as LOST-equivalent for restock/ownership | **Deferred** | UI already collects MISSING; map outcomes, avoid rename churn |
| Damaged owned quarantine / repair stock ledger | **Deferred** | No damaged inventory tables in next bounded phase |
| Dispatch omitted-source owned-first inference | **Deferred** | Symmetric risk; separate from return lock unless needed for consistency |
| Whether create-return or inspect (or both) owns final source confirmation UX | **Implementation** | Must still be operator-explicit for mixed lines |
| Charge/`damageCharge` economics on mixed lines | **Deferred** | Existing charge fields remain; no GL/SupplierPayment expansion |
| Post-receive ERA cancellation | **Deferred** | Unrelated |
| Analytics contract changes | **Rejected / out of scope** | |

---

## Evidence index

| Topic | Path |
| ----- | ---- |
| Return source split / owned-first gap | `src/modules/return/domain/return.source.rules.ts` (`resolveReturnSourceSplit`) |
| Return attach-to-dispatch validation | `src/modules/return/domain/return.rules.ts` |
| Restock / release / external qty helpers | `src/modules/return/domain/return.rules.ts` (`computeRestockQuantity`, `computeReleaseQuantity`, `computeExternalCustomerReturnQuantity`) |
| Condition constants | `src/modules/return/domain/return.constants.ts` (`RETURN_CONDITIONS`) |
| Complete return UoW | `src/modules/return/application/services/complete-return.service.ts` |
| Dispatch source split | `src/modules/dispatch/domain/dispatch.source.rules.ts` |
| Complete dispatch source effects | `src/modules/dispatch/application/services/complete-dispatch.service.ts` |
| Prisma return/dispatch source fields | `prisma/schema.prisma` (`DispatchItem`, `ReturnInspectionItem`) |
| T3/T4 matrix | `src/modules/external-rental/application/external-rental.scenario-matrix.25.5.7.test.ts` |
| Prior deferral note | `docs/decisions/RENTAL_ORDER_EXTERNAL_RENTAL_CANCELLATION_25.11.md` (mixed-return condition source-split deferred) |

---

## Phase 28 closure

```text
Phase 28:
ACCEPTED FOR IMPLEMENTATION
DOCUMENTATION ONLY
NO PRODUCTION CODE
NO SCHEMA / MIGRATION
NO COMMIT
NO PUSH
```
