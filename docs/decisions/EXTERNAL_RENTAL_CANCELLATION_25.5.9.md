# Phase 25.5.9 — External Rental Cancellation & Agreement Re-Creation Decision Lock

**Document:** External Rental Cancellation / Uniqueness Strategy v1.0
**Status:** ACCEPTED FOR IMPLEMENTATION (Phase 25.10)
**Date:** 2026-08-12
**Baseline HEAD:** `9fea5059d793752bf088044a62b819b391e92636` (`feat(external-rental): complete external rental sourcing MVP`)
**Scope:** Decision lock accepted; implementation in Phase 25.10 (cancel + active-only uniqueness).
**Related:** `EXTERNAL_RENTAL_SOURCING_25.5.1.md`; Phase 25.5.2–25.5.8 completed MVP

---

## How to read this document

| Layer | Meaning |
| ----- | ------- |
| **LOCKED (proposed)** | Recommended business/architecture decision for the next implementation phase — do not implement until this document is explicitly accepted |
| **FACT** | Observed from current code / schema / tests at baseline HEAD |
| **CONFLICT** | Tension between 25.5.1 intent and shipped 25.5.2 schema |
| **DEFERRED** | Explicit non-goal for the next cancel implementation slice |

```text
Phase 25.5.9 Status:
ACCEPTED FOR IMPLEMENTATION — Phase 25.10 implements cancel + active-only uniqueness
```

---

## 1. Executive Decision (Proposed)

**Verdict: GO for a focused cancellation/uniqueness implementation phase AFTER acceptance of this lock.**

| Topic | Proposed lock |
| ----- | ------------- |
| Cancel as a workflow | **Yes** — implement cancel for early states only |
| Cancel allowed statuses (MVP) | **`DRAFT` \| `CONFIRMED` only** |
| Post-receive “cancel” | **Not** a `CANCELLED` flip — use supplier return / return flows / settlement (25.5.1 §13 C/D) |
| Forever `@unique(rentalOrderId)` | **Replace** with **active-only uniqueness** (non-`CANCELLED`) |
| Re-create after cancel | **Allowed** for the same `RentalOrder` once prior agreement is `CANCELLED` |
| Multiple **active** ERAs per RO | **Still forbidden** (BD-4 preserved) |
| Soft-delete / nullable FK clear | **Rejected** |
| Supersession graph (`replacesId`) | **Deferred** |
| F-01 / F-02 / Inventory | **Unchanged** — cancel must not mutate owned stock |

**Primary business outcome:** Operators can abandon a wrong/unused hire-in agreement before custody exists, then create a replacement agreement for the same rental order, while cancelled history remains auditable and owned inventory semantics stay isolated.

---

## 2. Baseline Verification (FACT)

| Check | Result |
| ----- | ------ |
| Branch | `main` |
| HEAD | `9fea5059d793752bf088044a62b819b391e92636` |
| Working tree | Clean |
| Commit | `feat(external-rental): complete external rental sourcing MVP` |
| Push | Not required for this phase; local ahead-of-origin state is out of scope |

This phase **must not** disturb the stabilized 25.5.1–25.5.8 baseline.

---

## 3. Current External Rental Lifecycle (FACT)

Inspected: `external-rental.constants.ts`, `external-rental.rules.ts` (`assertCan*`), entity transitions.

```text
DRAFT
  ↓ confirm
CONFIRMED
  ↓ receive (partial / full)
PARTIALLY_RECEIVED / RECEIVED
  ↓ allocate
ALLOCATED
  ↓ external dispatch
IN_USE
  ↓ customer return (external)
RETURN_PENDING
  ↓ supplier return (full close)
RETURNED

CANCELLED  (status exists; terminal; NO cancel workflow implemented)
```

Settlement is **orthogonal**:

```text
UNSETTLED → PARTIALLY_SETTLED → SETTLED
```

Settlement is rejected when operational status is `DRAFT` or `CANCELLED`.

### What exists today for cancel (FACT)

| Layer | Present? |
| ----- | -------- |
| Status enum value `CANCELLED` | Yes |
| `isCancelled()` helper | Yes |
| Reject-if-cancelled on confirm/receive/allocate/supplier-return/settle | Yes (allowlists / explicit denies) |
| `assertCanCancel` / `withCancelled()` | **No** |
| Cancel application service | **No** |
| `POST /api/external-rentals/:id/cancel` | **No** |
| Permission `external-rentals:cancel` | **No** |
| UI cancel action | **No** |

---

## 4. The Uniqueness Problem (FACT + CONFLICT)

### Shipped schema (FACT)

```prisma
model ExternalRentalAgreement {
  rentalOrderId String @unique @db.Uuid
  // ...
}

model ExternalRentalAgreementItem {
  rentalOrderItemId String @unique @db.Uuid
  // ...
}
```

Create path (`CreateExternalRentalService`) conflicts if **any** agreement exists for the `rentalOrderId`, including `CANCELLED`.

### 25.5.1 intent (LOCKED in prior doc)

- BD-4: one agreement → one rental order (MVP; no multi-order pools).
- Field note: `rentalOrderId` — “MVP unique among **non-cancelled** agreements optional soft rule”.
- Aggregates: “non-cancelled agreements” for external allocated qty / fulfillment flags.
- §13 Matrix B/E: cancel after confirm / supplier cancel before receive, then order may need re-sourcing.

### Conflict statement

```text
25.5.1 language: unique among ACTIVE (non-cancelled) agreements
25.5.2 schema:   unique FOREVER (including CANCELLED)

Result: cancelling an ERA (even if cancel were implemented) would
permanently block a replacement ERA for the same RentalOrder.
```

This is the defect this decision phase resolves **as policy**, not as silent code change.

---

## 5. Peer Patterns in MT-ERP (FACT)

| Document | Cancel / void | Parent uniqueness | Re-create after terminal? |
| -------- | ------------- | ----------------- | ------------------------- |
| PurchaseOrder | Status `CANCELLED` | Unique `poNumber` only | Yes (new PO) |
| RentalOrder | Status `CANCELLED` (+ F-01 RELEASE if reserved) | Unique `orderNumber` | N/A |
| Dispatch | Status `CANCELLED`; claims ignore cancelled | Many per RO | Yes |
| Return | Status `CANCELLED`; aggregates ignore cancelled | Many per RO | Yes |
| RentalInvoice | Status `VOID` + `voidedAt` | Many per RO | Yes |

**Convention:** keep the row; terminal status; exclude from operational aggregates.
**Soft-delete (`deletedAt`):** explicitly deferred across the platform.
**Partial unique indexes:** not used elsewhere today — but “ignore CANCELLED in aggregates” is established.

ERA’s forever `@unique(rentalOrderId)` is the **outlier** relative to sibling transactional documents.

---

## 6. Options Analyzed

### Option A — Keep forever `@unique`; cancel only `DRAFT`

| | |
| -- | -- |
| Pros | Matches shipped schema; minimal change |
| Cons | Blocks §13 B/E re-source; wrong CONFIRMED agreement bricks hire-in for that RO; conflicts with 25.5.1 “non-cancelled” language |
| Verdict | **Reject** as long-term policy (acceptable only as temporary freeze with explicit debt) |

### Option B — Keep `@unique`; on cancel null out `rentalOrderId`

| | |
| -- | -- |
| Pros | Allows re-create without partial indexes |
| Cons | No MT-ERP precedent; weakens audit/history FK; must also clear item `rentalOrderItemId` uniques; breaks required relationship model |
| Verdict | **Reject** |

### Option C — Active-only uniqueness (partial unique / equivalent)

| | |
| -- | -- |
| Pros | Matches 25.5.1; preserves cancelled history + FK; enables re-create; still enforces **one active** ERA per RO (BD-4) |
| Cons | Requires migration + Prisma model adjustment (`@unique` → raw partial unique or app+DB hybrid); `RentalOrder.externalRentalAgreement?` becomes list + “active” accessor |
| Verdict | **RECOMMENDED** |

### Option D — Multiple ERAs + supersession graph

| | |
| -- | -- |
| Pros | Rich replacement history |
| Cons | Exceeds BD-4 MVP; new fields; planning/Σ complexity |
| Verdict | **Defer** beyond next cancel slice |

### Option E — Sibling-doc pattern (many docs, no unique)

| | |
| -- | -- |
| Pros | Matches dispatch/return/invoice recreate freedom |
| Cons | Without active uniqueness, two active ERAs could violate BD-4 |
| Verdict | Adopt **cancel semantics** from E; keep **active uniqueness** from C |

---

## 7. Locked Decisions (Proposed)

### BD-C1 — Cancellation is a first-class workflow (LOCKED proposed)

Implement cancel as:

- domain: `assertCanCancel` + `withCancelled()`
- application service + UoW + audit
- API: `POST /api/external-rentals/:id/cancel`
- permission: `external-rentals:cancel`
- UI: status-gated action

Do **not** treat cancel as delete.

### BD-C2 — Cancel allowed statuses (LOCKED proposed)

MVP cancel transitions:

```text
DRAFT → CANCELLED
CONFIRMED → CANCELLED
```

**Disallowed as simple cancel (use other flows):**

| Current status | Required path instead |
| -------------- | --------------------- |
| `PARTIALLY_RECEIVED` / `RECEIVED` / `ALLOCATED` with custody | Supplier return (and settlement as needed) — §13 C |
| `IN_USE` / `RETURN_PENDING` | Customer return and/or supplier return — §13 D |
| `RETURNED` | Terminal operational success — not cancel |
| `CANCELLED` | Already terminal |

Rationale: after receive, hire-in cost is recognized (BD-11) and supplier obligation / company custody exist. Flipping to `CANCELLED` would orphan custody and money rules (`assertCanRecordSettlement` already rejects `CANCELLED`).

### BD-C3 — Active uniqueness replaces forever uniqueness (LOCKED proposed)

Replace:

```text
UNIQUE (rentalOrderId)           -- forever
UNIQUE (rentalOrderItemId)       -- forever
```

With active-only uniqueness conceptually:

```text
UNIQUE (rentalOrderId)     WHERE status <> 'CANCELLED'
UNIQUE (rentalOrderItemId) WHERE agreement.status <> 'CANCELLED'
  -- item enforcement may be partial index via join, or application claim
  -- + DB check in the same UoW as create
```

**BD-4 preserved:** at most **one non-cancelled** `ExternalRentalAgreement` per `RentalOrder`.

Cancelled rows **retain** `rentalOrderId` / `rentalOrderItemId` for audit.

### BD-C4 — Re-creation after cancel (LOCKED proposed)

After an agreement is `CANCELLED`, creating a new `ExternalRentalAgreement` for the same `RentalOrder` is **allowed** and is the supported recovery path for §13 B/E.

Create service must claim the **active** slot (not “any row”).

### BD-C5 — Money on early cancel (LOCKED proposed)

| Prior status | On cancel |
| ------------ | --------- |
| `DRAFT` | No money impact (`amountDue` / `totalHireInCost` already 0) |
| `CONFIRMED` | Provisional `amountDue` is discarded for recognition purposes; `totalHireInCost` remains 0; `settlementStatus` stays / becomes irrelevant; **no settlement** on cancelled |

Supplier cancellation fees: **out of MVP** (same as 25.5.1 §13 B).

### BD-C6 — Ownership isolation (LOCKED proposed)

Cancel must **never**:

- mutate `Inventory.quantityOnHand`
- mutate `RentalOrderItem.reservedQuantity`
- create stock movements
- inflate F-02 `baseCapacity` / `dateAwareAvailableQuantity`
- affect owned inventory valuation

### BD-C7 — Historical preservation (LOCKED proposed)

- Cancelled agreements are **retained**
- No soft-delete
- No clearing of FKs
- Audit log records cancel action (mirror existing PO/dispatch cancel audit style)

### BD-C8 — Relationship cardinality (LOCKED proposed)

| Rule | Lock |
| ---- | ---- |
| Active ERAs per RO | **0 or 1** |
| Historical (cancelled) ERAs per RO | **0..N** (enabled by BD-C3) |
| Shared ERA across multiple ROs | **Forbidden** (BD-4 unchanged) |
| Supersession fields | **Deferred** |

### BD-C9 — Interaction with RentalOrder cancel (LOCKED proposed)

- Cancelling ERA does **not** auto-cancel the `RentalOrder`.
- Cancelling `RentalOrder` remains governed by F-01 rules (blocked by active dispatch, etc.).
- If RO is cancelled while ERA is `DRAFT`/`CONFIRMED`, ERA should also be cancellable / cancelled in the same product policy in a later slice — **defer auto-cascade** to keep MVP cancel scope small (document as follow-up).

### BD-C10 — Item uniqueness strategy (LOCKED proposed)

`ExternalRentalAgreementItem.rentalOrderItemId` forever `@unique` has the same re-create blocker.

**Lock:** active-only uniqueness at item level as well (same phase as agreement uniqueness), so a replacement agreement can attach to the same rental order lines.

---

## 8. Explicit Non-Goals (DEFERRED)

Do **not** implement in the cancel slice:

- Write-off workflow
- SupplierPayment / GL
- Cancellation after receive via status `CANCELLED`
- Nullable FK clearing
- Soft-delete
- Supersession / replacement entity graph
- Multi-active agreements / marketplace / pools
- Race-hardening beyond normal UoW claim checks
- RO shortfall wizard
- Changing F-01 or F-02 formulas

---

## 9. Implementation Slice Guidance (CONCEPTUAL — not this phase)

Suggested next phase after acceptance (name TBD, e.g. 25.5.10):

1. Decision acceptance recorded.
2. Migration: drop forever uniques; add partial uniques / supporting indexes; adjust Prisma relation typing (`ExternalRentalAgreement[]` on RO + active finder).
3. Domain cancel + create active-claim.
4. Application service + audit + permission.
5. API + minimal UI action.
6. Tests: cancel DRAFT/CONFIRMED; reject cancel after receive; re-create after cancel; forever-unique regression removed; F-01/F-02 isolation unchanged; T1–T11 remain green.

---

## 10. Acceptance Checklist

This document is accepted when stakeholders agree:

- [ ] BD-C1 … BD-C10 as written (or with recorded amendments)
- [ ] Forever `@unique` is acknowledged as incorrect long-term relative to 25.5.1
- [ ] Post-receive cancel remains operational closure via return/settlement, not `CANCELLED`
- [ ] No implementation starts before acceptance

---

## 11. Evidence Index

| Topic | Path |
| ----- | ---- |
| Prior decision lock | `docs/decisions/EXTERNAL_RENTAL_SOURCING_25.5.1.md` (§BD-4, §5.1, §6, §13) |
| Schema uniques | `prisma/schema.prisma` `ExternalRentalAgreement` / `Item` |
| Migration uniques | `prisma/migrations/20260811190000_external_rental_agreements/migration.sql` |
| Status guards | `src/modules/external-rental/domain/external-rental.rules.ts` |
| Create conflict | `src/modules/external-rental/application/services/create-external-rental.service.ts` |
| API routes | `src/modules/external-rental/presentation/routes/external-rental.routes.ts` |
| Permissions | `src/shared/application/authorization/permissions.ts` |
| Peer cancel | PO / RO / Dispatch / Return cancel services |

---

## 12. Git Safety (this phase)

- **No commit**
- **No push**
- **No schema / migration / API / UI / permission code changes** in Phase 25.5.9

Only this decision document may be added under `docs/decisions/`.

---

```text
Phase 25.5.9 Deliverable:
DECISION LOCK DOCUMENT READY FOR ACCEPTANCE
```
