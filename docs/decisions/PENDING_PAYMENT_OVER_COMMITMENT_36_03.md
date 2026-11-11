# Phase 39 — Pending Payment Over-Commitment Integrity

**Document:** Pending Payment Over-Commitment Integrity v1.0

**Status:** PROPOSED — READY FOR IMPLEMENTATION

**Date:** 2026-08-30

**Baseline HEAD:** `790ccebaf1fc07a85fbcbf6e5a368bc77497bbe7` (`fix(rental-invoice): harden issue and void concurrency`)

**Parent audit:** `docs/audits/PHASE_38_ENTERPRISE_GAP_AUDIT.md`

**Parent phases:** Phase 35 (`PAYMENT_INVOICE_SETTLEMENT_CONCURRENCY_35.md`), Phase 38 (`INVOICE_ISSUE_VOID_CONCURRENCY_35_06.md`)

---

## §1 Executive Decision

**PROPOSED — READY FOR IMPLEMENTATION**

Phase 39 closes **F-36-03** by validating payment create/update against **authoritative pending commitment** on the target rental invoice:

```
availableBalance = invoice.balance - sum(PENDING payments for invoice, excluding self on update)
assert newAmount <= availableBalance
```

Validation MUST occur inside the existing payment transaction/UoW **after** loading the invoice and **before** persisting the payment row.

**No schema change.** **No migration.** Post-time settlement (`applyPaymentDelta` + payment claim from Phase 35) remains unchanged.

---

## §2 Finding

**F-36-03 — Pending payment over-commitment at create/update**

| Attribute | Value |
| --- | --- |
| Severity | **P2** |
| Module | Payment / RentalInvoice |
| Defect class | Stale read validation — each pending payment checked only against full `invoice.balance` |
| Location | `create-payment.service.ts`, `update-payment.service.ts`, `payment-invoice.validation.ts` |
| Audit reference | `docs/audits/PHASE_38_ENTERPRISE_GAP_AUDIT.md` §6 |

---

## §3 Problem Statement

At HEAD (`790cceb`), `CreatePaymentService` and `UpdatePaymentService`:

1. Load invoice snapshot via `findById`
2. Call `validateInvoiceForPayment(invoice, customerId, amount)` which asserts `amount <= invoice.balance`
3. Create/update payment row

Concurrent or sequential creation of multiple **PENDING** payments each passes step 2 independently because `invoice.balance` reflects **posted** settlement only, not outstanding pending commitment.

**Example:** Invoice balance 350. Two PENDING payments of 200 each both succeed. Sum pending = 400 > 350.

**Mitigation already in production:** Phase 35 `applyPaymentDelta` SQL prevents posted over-payment. This defect causes **operator confusion, invalid pending totals, and post-time failures** — not silent posted money corruption.

---

## §4 Current Behavior (@ HEAD)

| Command | Validation | Pending sum considered? |
|---------|------------|-------------------------|
| Create payment | `amount <= invoice.balance` | **No** |
| Update payment (amount) | `nextAmount <= invoice.balance` | **No** |
| Post payment | Pre-check + `applyPaymentDelta` | N/A (settlement authoritative) |

`IPaymentRepository` @ HEAD has **no** `sumPendingAmountByRentalInvoiceId`.

---

## §5 Desired Invariant

For rental invoice `I` with balance `B` (remaining after posted payments):

```
sum(amount of PENDING payments referencing I) + newPendingAmount <= B
```

On **update**, exclude the payment being edited from the pending sum.

Statuses counted as pending commitment: **`PENDING` only** (matches post claim source state).

---

## §6 Status / Transition Matrix

| Invoice status | Create PENDING allowed? | Notes |
|----------------|-------------------------|-------|
| ISSUED | Yes | Existing domain rule |
| PARTIALLY_PAID | Yes | Existing domain rule |
| PAID | No | Existing `assertInvoiceEligibleForPayment` |
| VOID | No | Existing rule |
| DRAFT | No | Existing rule |

Phase 39 does **not** change eligibility matrix — only strengthens amount validation for eligible statuses.

---

## §7 Concurrency Strategy

**Read authoritative pending sum inside payment UoW:**

1. `findById(invoice)` — domain eligibility (unchanged)
2. `sumPendingAmountByRentalInvoiceId(invoiceId, excludePaymentId?)` — aggregate query
3. Validate `amount <= invoice.balance - pendingSum`
4. `create` / `update` payment

**Not required for Phase 39:** Invoice row lock or serializable isolation. Post path remains protected by atomic SQL. Create/update race may still allow brief window where two transactions both read the same pending sum before either commits — acceptable residual race if both would fail post anyway; optional hardening with invoice `FOR UPDATE` is **out of scope** unless tests prove otherwise.

**WIP note:** Uncommitted working tree contains a partial implementation — reconcile at implementation time; **committed HEAD is the audit baseline**.

---

## §8 Transaction Boundary

```
transaction begins
  → read invoice
  → domain validation (status, customer)
  → sum pending (authoritative)
  → amount validation against available balance
  → create/update payment
  → audit
transaction commit
```

Do not open nested transactions. Do not modify Phase 35 post/void settlement ordering.

---

## §9 Side-Effect Ordering

Phase 39 is validation-only on create/update paths. No new side effects.

Post path may optionally re-validate with pending sum for consistency (WIP pattern) — **optional enhancement**, not required if create/update are hardened.

---

## §10 Failure Semantics

| Condition | Error |
|-----------|-------|
| Amount exceeds available balance | `UnprocessableError` (existing domain error family) |
| Invoice ineligible | `UnprocessableError` (unchanged) |
| Post settlement predicate fail | `ConcurrentUpdateError` (Phase 35 — unchanged) |

---

## §11 Testing Requirements

Recommended file: `payment.pending-over-commitment.39.application.test.ts`

| Test | Scenario | Expected |
|------|----------|----------|
| **T39.1** | Two concurrent PENDING creates exceeding balance | One success, one `UnprocessableError`; sum pending ≤ balance |
| **T39.2** | Create 200 + create 200 on balance 350 | Second rejected |
| **T39.3** | Update pending amount causing over-commit | Rejected |
| **T39.4** | Post after valid pending | Phase 35 regression — still passes |
| **T39.5** | Update excludes self from pending sum | Increase amount up to available succeeds |

Use genuine concurrent execution (`Promise.allSettled`) for T39.1.

---

## §12 Schema Impact

**NONE**

Aggregate via `SUM(amount) WHERE rentalInvoiceId = ? AND status = 'PENDING'`.

---

## §13 Scope

### In scope

- F-36-03 only
- `sumPendingAmountByRentalInvoiceId` on payment repository (interface + Prisma + in-memory)
- `validateInvoiceForPayment` extension with `pendingAmount` parameter
- `CreatePaymentService`, `UpdatePaymentService`
- Phase 39 tests

### Out of scope

- F-35-08, F-37-R1, F-37-R2
- F-33-01, F-33-03, F-31-08, F-31-05, F-31-10
- Phase 35 post/void settlement redesign
- Issue-journal / operational journal WIP
- Invoice row locking (unless required by failing tests)
- Schema / migration

---

## §14 Open Decisions

| ID | Question | Baseline resolution |
|----|----------|---------------------|
| **OD-39-01** | Count only `PENDING` status? | **Yes** — align with post claim predicate |
| **OD-39-02** | Re-validate pending sum on post? | **Optional** — create/update hardening is minimum; post SQL remains authoritative for money |
| **OD-39-03** | Invoice `FOR UPDATE` on create? | **Deferred** — not required unless concurrency tests fail |

No unresolved business policy blocks implementation.

---

## §15 Explicit Non-Goals

- Do not bundle F-33-03 stock-movement API hardening
- Do not bundle issue-journal WIP
- Do not change Phase 38 issue/void claims
- Do not change Phase 35 `applyPaymentDelta` predicates
