# Phase 25.11 — RentalOrder ↔ ExternalRentalAgreement Cancellation Cascade (BD-C9)

**Document:** Rental Order / External Rental Cancellation Interaction v1.0
**Status:** ACCEPTED FOR IMPLEMENTATION
**Date:** 2026-08-13
**Baseline HEAD:** `b4e83d7` (`feat(external-rental): add cancellation and active-only uniqueness`)
**Scope:** Decision lock only. Production implementation is a later phase.
**Related:** `EXTERNAL_RENTAL_SOURCING_25.5.1.md`; `EXTERNAL_RENTAL_CANCELLATION_25.5.9.md` (BD-C9 deferred); Phase 25.10 cancel + active-only uniqueness

```text
Phase 25.11 Status:
ACCEPTED FOR IMPLEMENTATION — this document locks BD-C9 policy.
Do not implement until a dedicated implementation phase is authorized.
```

---

## 1. Title

RentalOrder cancellation cascade to ExternalRentalAgreement (BD-C9).

---

## 2. Status

**ACCEPTED FOR IMPLEMENTATION**

This phase locks business/domain policy only. Implementation strategy (exact UoW wiring, finder calls, error mapping) is **not** approved here.

---

## 3. Date

2026-08-13

---

## 4. Baseline commit

| Check | Result |
| ----- | ------ |
| Branch | `main` |
| HEAD | `b4e83d7` |
| Commit | `feat(external-rental): add cancellation and active-only uniqueness` |
| Previous | `9fea505` — External Rental sourcing MVP |
| Working tree at lock | Clean |
| Remote | `main` ahead of `origin/main` by 2 (no push in this phase) |

---

## 5. Problem statement

Phase 25.10 implemented ERA cancellation (`DRAFT` / `CONFIRMED` → `CANCELLED`) and active-only uniqueness. RentalOrder cancellation remains an independent F-01 workflow.

**Gap:** cancelling a `RentalOrder` does not currently inspect or cancel an associated active `ExternalRentalAgreement`. If the RO is cancelled while the ERA is still `DRAFT` or `CONFIRMED`, the hire-in agreement can remain active against a cancelled customer order.

This is an RO ↔ ERA lifecycle integrity gap. It does not affect owned inventory semantics, but it leaves a supplier-facing agreement open after the customer order is abandoned.

---

## 6. Existing behavior (FACT)

Inspected at baseline `b4e83d7`. No code was changed for this assessment.

### 6.1 RentalOrder cancellation

| Item | Fact |
| ---- | ---- |
| Service | `CancelRentalOrderService` |
| Path | `src/modules/rental-order/application/services/cancel-rental-order.service.ts` |
| Domain | `RentalOrder.withCancelled()` → `assertCanCancel` |
| Allowed RO statuses | `DRAFT` \| `CONFIRMED` \| `RESERVED` |
| Rejected RO statuses | `DISPATCHED` \| `ON_RENT` \| `PARTIALLY_RETURNED` \| `RETURNED` \| `COMPLETED` \| `CANCELLED` |
| Extra guard | Active (non-`CANCELLED`) dispatch blocks RO cancel |
| Persistence | `rentalOrderRepository.cancelIfCancellable` then F-01 `RELEASE` for reserved owned qty, then `clearReservedQuantities` |
| Audit | `action: "CANCEL"` on the rental order |
| Notification | `RENTAL_ORDER_CANCELLED` |
| External rental awareness | **None** — no `ExternalRental` import, finder, or cascade |

Owned F-01 cancel still releases **owned** reservations via stock movements. That existing owned behavior is unchanged by BD-C9.

### 6.2 ExternalRentalAgreement cancellation

| Item | Fact |
| ---- | ---- |
| Service | `CancelExternalRentalService` |
| Domain | `ExternalRentalAgreement.withCancelled()` → `assertCanCancel` |
| Allowed ERA statuses | `DRAFT` \| `CONFIRMED` |
| Rejected | All post-receive statuses, and `CANCELLED` |
| Persistence | `externalRentalRepository.updateWorkflow` through existing ERA UoW |
| Audit | `action: "CANCEL"` on the agreement |
| Inventory | Never mutated |
| Financial (CONFIRMED) | Provisional `amountDue` zeroed; `totalHireInCost` remains 0; `amountPaid` 0; `settlementStatus` `UNSETTLED` (BD-C5) |
| Reverse cascade | Cancelling an ERA does **not** cancel the RentalOrder |

### 6.3 Uniqueness

- One **active** (non-`CANCELLED`) ERA per `RentalOrder` (PostgreSQL partial unique index).
- Historical `CANCELLED` ERAs may share the same `rentalOrderId`.
- Item uniqueness: `@@unique([agreementId, rentalOrderItemId])`.

### 6.4 Transaction scopes (FACT)

| Runner | Ports in write scope |
| ------ | -------------------- |
| `IRentalOrderTransactionRunner` | rental order, inventory, stock movement, dispatch, audit, notifications |
| `IExternalRentalTransactionRunner` | external rental repository, audit |

RO UoW does **not** currently include an external-rental repository. ERA UoW does **not** include rental-order/inventory ports.

### 6.5 Partial cascade / block today

**None.** There is no existing cascade, no RO-cancel block based on ERA status, and no ERA-cancel block based on RO status.

---

## 7. BD-C9 decision (LOCKED)

**Direction of cascade:** RentalOrder cancel → ERA cancel. Not the reverse.

When a `RentalOrder` is successfully cancelled:

1. If the associated **active** ERA is `DRAFT` or `CONFIRMED`, it **MUST** be cancelled using existing ERA domain cancellation (`withCancelled` / `assertCanCancel`).
2. That ERA cancel **MUST** be audited as `CANCEL`.
3. If the associated ERA is already post-receive, RO cancel **MUST NOT** flip it to `CANCELLED`.
4. If the associated ERA is already `CANCELLED`, cascade is a no-op (not a production error).
5. Cancelling an ERA still does **not** auto-cancel the RentalOrder (25.5.9 BD-C9, first bullet, remains locked).

RentalOrder cancellability remains governed by **existing F-01 rules** (RO status allowlist + active-dispatch block). BD-C9 does not relax those rules and does not invent a new RO status machine.

---

## 8. Allowed cascade states

Cascade ERA to `CANCELLED` **only** when the active ERA status is:

| ERA status | Cascade? |
| ---------- | -------- |
| `DRAFT` | **Yes** |
| `CONFIRMED` | **Yes** |

Use existing ERA cancellation semantics. Do not invent a second cancel path.

---

## 9. Forbidden cascade states

Do **not** convert the following ERA statuses to `CANCELLED` as a side effect of RO cancel:

| ERA status | Reason |
| ---------- | ------ |
| `PARTIALLY_RECEIVED` | Supplier custody exists |
| `RECEIVED` | Supplier custody exists |
| `ALLOCATED` | External qty allocated to the order |
| `IN_USE` | External qty with customer (typically also blocked at RO by active dispatch) |
| `RETURN_PENDING` | Customer-returned external qty still owed to supplier |
| `RETURNED` | Operational close; not a cancel |
| `CANCELLED` | Already terminal; treat as idempotent no-op, not a re-cancel |

Post-receive handling:

- Do not destroy or invalidate supplier custody / return-to-supplier / settlement obligations.
- ERA remains persisted and operationally traceable.
- Existing supplier-return and settlement workflows remain authoritative.
- Do not invent supersession, soft-delete, nullable FK clearing, or force-close.

**RO cancel itself** when a post-receive ERA exists:

- Remains subject to existing F-01 guards (including active dispatch).
- If F-01 allows the RO cancel (for example `CONFIRMED`/`RESERVED` with a `RECEIVED` ERA and no active dispatch), the RO may become `CANCELLED` **without** cascading the ERA.
- Whether a later phase should **block** RO cancel while a post-receive ERA is open is deferred (see §20). It is **not** part of this cascade lock.

---

## 10. Ownership / inventory isolation (LOCKED)

ERA cascade cancellation must **NEVER** mutate:

- `Inventory.quantityOnHand`
- `Inventory.reservedQuantity`
- `RentalOrderItem.reservedQuantity` (beyond the existing owned F-01 cancel path already performed for the RO)
- `Inventory.purchaseCost`
- stock movements (beyond existing owned `RELEASE` on RO cancel)
- F-01 owned formulas (`RESERVE` / `RELEASE` / `OUT` / `IN`)
- F-02 availability formulas (`baseCapacity`, `dateAwareAvailableQuantity`, commitment math)
- owned inventory valuation (`quantityOnHand × purchaseCost`)

Existing owned RO cancel **may still** `RELEASE` owned reserved quantity. That is F-01, not ERA cascade. ERA cascade adds **no** additional inventory or availability effects.

External hire-in quantities remain on ERA item counters only.

---

## 11. Financial isolation (LOCKED)

- `DRAFT` / `CONFIRMED` ERA cascade uses existing BD-C5 semantics (`amountDue` discarded on `CONFIRMED`; `totalHireInCost` remains 0; no settlement).
- Do not introduce `SupplierPayment`.
- Do not introduce GL / journal posting.
- Do not redesign settlement.
- Do not auto-settle, auto-refund, or record cancellation fees.

---

## 12. Multiple-ERA behavior (LOCKED)

- At most one **active** ERA per RentalOrder (Phase 25.10 partial unique index).
- Historical `CANCELLED` ERAs may exist for the same RO.
- Cascade targets the **active** (non-`CANCELLED`) ERA, if any.
- Do not walk historical cancelled rows to re-cancel them.
- Do not introduce a supersession graph (`replacesId` or equivalent).
- Shared ERA across multiple ROs remains forbidden.

---

## 13. Audit expectations (LOCKED)

Future implementation must produce two distinct, existing-style audit records when both documents cancel:

| Entity | Action | Required |
| ------ | ------ | -------- |
| RentalOrder | `CANCEL` | Already exists; preserve |
| ExternalRentalAgreement | `CANCEL` | Required when cascade actually cancels a `DRAFT`/`CONFIRMED` ERA |

ERA audit must include agreement id, old state, new state, and relevant agreement values per existing ERA audit conventions.

Do not invent a new audit architecture or a combined “cascade” action type.

If cascade is a no-op (ERA already `CANCELLED`, or no ERA, or post-receive ERA left intact), do not emit a fake ERA `CANCEL` event.

---

## 14. Transaction / UoW expectations (LOCKED as intent)

- RentalOrder cancellation and `DRAFT`/`CONFIRMED` ERA cascade should execute in the **same UoW / database transaction** where practical, so one cannot persist without the other.
- Use existing Unit of Work / repository architecture. No Prisma in domain or API handlers.
- Exact wiring (for example extending `RentalOrderWriteScope` with an external-rental port) is an **implementation** choice for the next phase, not approved in this lock.
- Do not call Prisma from `CancelRentalOrderService` directly.
- Do not bypass ERA domain cancellation rules.

---

## 15. Idempotency expectations (LOCKED)

| Situation | Expected behavior |
| --------- | ----------------- |
| No ERA for the RO | RO cancel proceeds unchanged |
| Active ERA `DRAFT` / `CONFIRMED` | Cascade cancel once |
| Active ERA already `CANCELLED` | No-op; not a production error |
| Historical extra `CANCELLED` ERAs | Ignore; do not re-cancel |
| Concurrent RO cancel | Existing `cancelIfCancellable` claim remains the RO integrity mechanism; do not redesign concurrency in this slice |
| Post-receive ERA | Do not cascade; do not treat leftover ERA as a cancel-path error |

---

## 16. Explicitly rejected alternatives (MVP)

| Alternative | Verdict |
| ----------- | ------- |
| Cancel every ERA regardless of status | **Rejected** |
| Auto-cancel post-receive ERAs | **Rejected** |
| Delete ERAs | **Rejected** |
| Soft-delete ERAs (`deletedAt`) | **Rejected** |
| Clear `rentalOrderId` / nullable FK | **Rejected** |
| Supersession graph | **Rejected** |
| Automatically return supplier inventory | **Rejected** |
| Automatically settle supplier payment | **Rejected** |
| Modify owned inventory as part of ERA cascade | **Rejected** |
| Modify F-02 availability | **Rejected** |
| Generic inventory-source abstraction | **Rejected** |
| SupplierPayment / GL in this cascade | **Rejected** |
| ERA cancel auto-cancels the RentalOrder | **Rejected** (already locked in 25.5.9) |
| Bypass ERA `assertCanCancel` / `withCancelled` | **Rejected** |

---

## 17. Implementation scope for the NEXT phase

The next implementation phase **may** change only what is required to enforce BD-C9:

- `CancelRentalOrderService` (or its UoW scope) to locate the active ERA and cascade `DRAFT`/`CONFIRMED` via existing ERA domain semantics
- Transaction/UoW wiring necessary to persist RO cancel + ERA cancel atomically
- Audit emission for the ERA `CANCEL` when cascade occurs
- Focused tests for scenarios A–H in §19
- Minimal DI/factory adjustments if the RO write scope must gain an external-rental repository port

The next phase **must not** change ERA cancel API/UI as a substitute for cascade (manual ERA cancel remains independently valid).

Exact files are not prescribed here.

---

## 18. Explicitly out of scope

- Write-off workflow
- SupplierPayment / GL / accounting integration
- RO shortfall → Source Externally wizard
- Post-receive ERA `CANCELLED` flip
- Mixed-return condition source-split
- F-01 / F-02 formula changes
- Analytics / inventory valuation changes
- Soft-delete, supersession, marketplace, multi-active pools
- Concurrency / idempotency redesign beyond using existing UoW + `cancelIfCancellable` + active-only unique index
- Blocking RO cancel solely because a post-receive ERA exists (deferred product decision)
- Notifications for ERA cascade (optional later; not required by this lock)
- Frontend redesign (optional later: surface that an ERA was cancelled with the RO)

---

## 19. Acceptance criteria for the future implementation

Do **not** implement these in Phase 25.11. They are the contract for the next phase.

### A. Cancelling RO with DRAFT ERA

- RO becomes `CANCELLED`.
- ERA becomes `CANCELLED`.
- ERA audit contains `CANCEL`.
- No inventory movement from the ERA cascade.
- Owned F-01 `RELEASE` occurs only if the RO had owned reserved quantity (existing behavior).

### B. Cancelling RO with CONFIRMED ERA

- RO becomes `CANCELLED`.
- ERA becomes `CANCELLED`.
- Existing provisional `amountDue` cancellation (BD-C5) remains respected.
- ERA audit contains `CANCEL`.
- No inventory movement from the ERA cascade.

### C. Cancelling RO with post-receive ERA

- RO cancellation does **not** convert ERA to `CANCELLED`.
- Supplier custody remains intact.
- Existing ERA operational lifecycle (allocate / dispatch / customer return / supplier return / settle) remains available subject to current ERA rules and F-01 dispatch/return guards.

### D. Cancelled ERA

- Does not block creation of a replacement active ERA for the same RO (Phase 25.10 BD-C4 unchanged).
- Note: a cancelled **RentalOrder** still cannot be a target for a new operational hire-in in any useful sense; replacement create remains a same-RO rule for **non-cancelled** orders. BD-C4 is not reopened here.

### E. Existing owned-only RentalOrder

- Cancellation behavior remains unchanged when no ERA exists.

### F. Mixed owned/external scenarios

- No external cascade may alter owned inventory semantics.
- Owned `RELEASE` on RO cancel remains owned-qty-only.

### G. Audit

- Both RO and ERA cancellation events are traceable when cascade actually cancels an ERA.

### H. Transaction

- Future implementation uses the existing UoW / transaction architecture.
- RO cancel and ERA cascade for `DRAFT`/`CONFIRMED` succeed or fail together.

---

## 20. Open / deferred decisions

| Item | Status | Note |
| ---- | ------ | ---- |
| Block RO cancel while a post-receive ERA is open | **Deferred** | Not required to close the DRAFT/CONFIRMED integrity gap |
| Write-off for post-receive loss | **Deferred** | Unchanged from 25.5.9 / 25.10 |
| SupplierPayment / GL | **Deferred** | Agreement-level settlement remains MVP |
| Shortfall → Source Externally wizard | **Deferred** | Product UX, not cancel integrity |
| Exact UoW port wiring | **Implementation** | Policy requires same transaction; mechanism is next-phase |
| ERA cascade notification | **Deferred** | RO notification already exists |
| Mixed-return condition source-split | **Deferred** | Separate HIGH finding from post-25.10 audit |

---

## Evidence index

| Topic | Path |
| ----- | ---- |
| RO cancel service | `src/modules/rental-order/application/services/cancel-rental-order.service.ts` |
| RO cancel rules | `src/modules/rental-order/domain/rental-order.rules.ts` (`assertCanCancel`) |
| RO UoW scope | `src/modules/rental-order/application/services/rental-order-transaction.runner.ts` |
| ERA cancel service | `src/modules/external-rental/application/services/cancel-external-rental.service.ts` |
| ERA cancel rules | `src/modules/external-rental/domain/external-rental.rules.ts` (`assertCanCancel`) |
| ERA entity cancel | `src/modules/external-rental/domain/external-rental.entity.ts` (`withCancelled`) |
| Prior BD-C9 deferral | `docs/decisions/EXTERNAL_RENTAL_CANCELLATION_25.5.9.md` §7 |
| Active-only uniqueness | `prisma/migrations/20260812180000_external_rental_active_only_uniqueness` |

---

## Git safety (this phase)

- **No production code changes**
- **No tests**
- **No schema / migration**
- **No commit**
- **No push**

Only this decision document may be added under `docs/decisions/`.

```text
Phase 25.11 Deliverable:
BD-C9 DECISION LOCK — ACCEPTED FOR IMPLEMENTATION
```
