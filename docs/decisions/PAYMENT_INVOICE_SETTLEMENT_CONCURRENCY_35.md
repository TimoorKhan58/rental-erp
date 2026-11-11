# Payment Invoice Settlement Concurrency — Phase 35

## Status

**LOCKED / VALIDATED**

Validated against repository HEAD `6fc20be811c1170ae9b1b41b82f45f37840c0981` (`feat(rental-invoice): fix dispatch rollup truncation`) and audit `docs/audits/PHASE_35_ENTERPRISE_GAP_AUDIT.md` on 2026-08-26.

Implementation, acceptance tests, commit, and push are **NOT** authorized until this lock passes stakeholder review. This document authorizes Phase 35 implementation only.

---

## Finding

**F-35-01 — Payment Invoice Settlement Concurrency**

| Attribute | Value |
| --- | --- |
| Severity | **P1** |
| Module | Payment / RentalInvoice |
| Defect class | Read-modify-write absolute counter write under concurrency (Phase 29 §10.3 prohibited pattern) |
| Committed call sites (HEAD `6fc20be`) | `applyPaymentToInvoice`; callers `PostPaymentService`, `VoidPaymentService` (posted reverse branch) |
| Audit reference | `docs/audits/PHASE_35_ENTERPRISE_GAP_AUDIT.md` § F-35-01 |

---

## Repository Baseline

| Attribute | Value |
| --- | --- |
| Branch | `main` |
| HEAD | `6fc20be811c1170ae9b1b41b82f45f37840c0981` |
| Phase 34 | **COMPLETE** — F-31-03 closed |
| Phase 35 audit | **COMPLETE** |
| Ahead of `origin/main` | 1 commit (Phase 34) |
| Working tree | ~138 unrelated modified/untracked WIP files — **not** used as evidence |

---

## Problem Statement

Payment posting settles a rental invoice by reading `invoice.paidAmount`, adding the payment amount in application memory, and writing **absolute** `paidAmount`, `balance`, and derived `status` through unconditional `rentalInvoiceRepository.updateStatus`.

Concurrent payment posts against the same invoice (different pending payments, or duplicate post retries) execute the same read → calculate → absolute write pattern inside separate transactions at PostgreSQL **READ COMMITTED**. The last writer wins; the other payment’s delta is **silently discarded** from invoice aggregates even though the payment row may become `POSTED`.

This is **financial data corruption**, not a UX defect.

Phase 29 closed the identical defect class for external-rental settlement (`applySettlement` predicated SQL) and inventory counters, but **did not** extend the pattern to rental-invoice payment settlement.

---

## Evidence

### Verified at committed HEAD (not WIP)

**Settlement helper — absolute write:**

```typescript
// src/modules/payment/application/services/payment-invoice.validation.ts
export async function applyPaymentToInvoice(...) {
  const delta = direction === "apply" ? payment.amount : -payment.amount;
  const updatedInvoice = invoice.withPaymentApplied(invoice.paidAmount + delta);

  return rentalInvoiceRepository.updateStatus(invoice.id, {
    status: updatedInvoice.status,
    paidAmount: updatedInvoice.paidAmount,
    balance: updatedInvoice.balance,
  });
}
```

**Post path — stale read then settlement:**

```typescript
// src/modules/payment/application/services/post-payment.service.ts
const invoice = await rentalInvoiceRepository.findById(...);
validateInvoiceForPayment(invoice, existing.customerId, existing.amount);
const updatedInvoice = await applyPaymentToInvoice(..., invoice, existing, "apply");
const updated = await paymentRepository.updateStatus(existing.id, { status: posted.status, ... });
```

**Repository — no predicate, no lock, no increment:**

```typescript
// src/modules/rental-invoice/infrastructure/repositories/prisma-rental-invoice.repository.ts
db.rentalInvoice.update({ where: { id }, data: toRentalInvoiceStatusUpdateInput(data) })
```

**Payment repository — unconditional status update (no `claimStatusTransition`):**

```typescript
// src/modules/payment/infrastructure/repositories/prisma-payment.repository.ts
db.payment.update({ where: { id }, data: toPaymentStatusUpdateInput(data) })
```

### Verification checklist (committed HEAD)

| Check | Result |
| --- | --- |
| 1. Where `paidAmount` read | `rentalInvoiceRepository.findById` in `PostPaymentService` / `VoidPaymentService` |
| 2. Where `balance` read | Same entity snapshot; validation uses `invoice.balance` in `validateInvoiceForPayment` |
| 3. Where new values calculated | In-memory `invoice.withPaymentApplied(invoice.paidAmount + delta)` |
| 4. Where update occurs | `rentalInvoiceRepository.updateStatus` — absolute fields |
| 5. Status predicate on update | **No** |
| 6. Version predicate | **No** |
| 7. Atomic SQL increment/decrement | **No** |
| 8. Row locking | **No** |
| 9. Payment idempotency / uniqueness | `paymentNumber @unique`; **no** atomic PENDING→POSTED claim |
| 10. Inside transaction | **Yes** — `runWithRepositoryUnitOfWork` / `createPaymentTransactionRunner` |
| 11. Concurrent payments same invoice | **Yes** — two transactions can interleave reads before writes |

**Audit accuracy note:** Phase 35 audit mentions `sumPendingAmountByRentalInvoiceId` as existing protection. At **committed HEAD**, `IPaymentRepository` has **no** such method (`git grep` on HEAD returns no matches). Overpayment prevention at create/post time uses **stale** `invoice.balance` only.

### Material discrepancy

**None.** Committed code matches the audit’s core F-35-01 claim (read → absolute write, no atomic settlement).

---

## Business Invariants

### I-01 — Payment conservation

For rental invoice `X`, after any number of successful **posted** (non-void) payment applications:

```text
invoice.paidAmount = roundMoney( Σ payment.amount
  | payment.rentalInvoiceId = X
  | payment.status = 'POSTED' )
```

minus reversals from voiding previously posted payments (see void path).

No posted payment amount may be absent from `invoice.paidAmount` because of concurrency.

### I-02 — Balance conservation

Using existing domain rules (`computeInvoiceTotals` in `rental-invoice.rules.ts`):

```text
invoice.balance = roundMoney(invoice.grandTotal - invoice.paidAmount)
```

`grandTotal` is derived from line items and is **not** mutated by payment posting at HEAD.

### I-03 — No overpayment

**Existing policy (unchanged):** `assertPaymentAmountWithinBalance(amount, invoiceBalance)` rejects `amount > invoiceBalance` at validation time (`payment.rules.ts`).

Domain also enforces non-negative paid amount in `computeInvoiceTotals`.

**Commit-time enforcement required:** atomic settlement MUST reject any delta that would yield `paidAmount > grandTotal` (equivalently `balance < 0`), even if validation used a stale balance snapshot.

Partial payments are **explicitly allowed** (existing tests: partial post → `PARTIALLY_PAID`).

### I-04 — Status correctness

Existing transitions from `withPaymentApplied` (`rental-invoice.entity.ts`):

| Condition | Result status |
| --- | --- |
| Invoice `VOID` or `DRAFT` | Reject (no payment) |
| After apply: `paidAmount <= 0` | If was `PARTIALLY_PAID` → `ISSUED`; else unchanged |
| After apply: `balance <= 0` | `PAID` |
| Else | `PARTIALLY_PAID` |

Eligible invoice statuses for payment: `ISSUED`, `PARTIALLY_PAID` (`ELIGIBLE_INVOICE_PAYMENT_STATUSES`).

Concurrent partial posts MUST converge to the same final status as sequential posts with the same payment set.

### I-05 — Payment post uniqueness (related, same phase)

Posting a payment is a **once-only** command (`PENDING → POSTED`). Duplicate concurrent post of the **same** payment must yield exactly one successful settlement and **409** (`ConcurrentUpdateError`) for losers — Phase 29 once-only semantics.

This is **not** the same defect as F-35-01 lost additive delta, but Phase 35 implementation **MUST** fix both in the same transaction ordering (payment claim before invoice settlement).

**Out of scope:** client idempotency keys, duplicate HTTP retry deduplication store.

---

## Authoritative Settlement Flow

### Create payment (no invoice mutation at HEAD)

```text
POST /api/payments
  → CreatePaymentService
  → findById invoice
  → validateInvoiceForPayment (eligibility + amount <= balance snapshot)
  → paymentRepository.create (PENDING)
```

Invoice aggregates **unchanged** until post.

### Post payment (F-35-01 defect path)

```text
POST /api/payments/:id/post
  → PostPaymentService
  → runWithRepositoryUnitOfWork (single DB transaction)
      1. paymentRepository.findById
      2. in-memory withPosted() validation
      3. rentalInvoiceRepository.findById
      4. validateInvoiceForPayment
      5. applyPaymentToInvoice  ← absolute read-modify-write (DEFECT)
      6. paymentRepository.updateStatus → POSTED
      7. audit (payment + invoice)
      8. notification
```

**No journal / GL side effects at committed HEAD.** (Uncommitted WIP may add journals — out of scope.)

### Void posted payment (reverse settlement)

```text
POST /api/payments/:id/void
  → VoidPaymentService
  → if payment.isPosted():
      applyPaymentToInvoice(..., "reverse")  ← same absolute pattern (DEFECT)
  → paymentRepository.updateStatus → VOID
```

### External rental

No shared payment-settlement infrastructure with rental invoices at HEAD. Phase 29 `applySettlement` on ERA is the **architectural precedent**, not a coupling requirement.

---

## Transaction Boundary

**Single transaction** — existing `createPaymentTransactionRunner` → `runWithRepositoryUnitOfWork` → PostgreSQL `$transaction` (READ COMMITTED, unchanged from Phase 29).

All steps below MUST remain in **one** transaction so failure rolls back payment claim, invoice settlement, and audit together.

### Locked ordering — Post payment

| Step | Operation |
| --- | --- |
| 1 | Load payment + invoice (validation inputs) |
| 2 | Domain pre-checks (`withPosted`, `validateInvoiceForPayment`) — **soft** guards only |
| 3 | **`claimStatusTransition` payment `PENDING → POSTED`** — atomic `updateMany`; `count === 0` → `ConcurrentUpdateError` |
| 4 | **`applyInvoicePaymentDelta(invoiceId, +amount)`** — predicated atomic SQL (Decision below) |
| 5 | Re-load invoice; derive `status` using existing domain rules from updated `paidAmount` / `balance` |
| 6 | Persist invoice status if changed (may use `updateStatus` on status/timestamps only — money fields already committed in step 4) |
| 7 | Audit + notification |

**Invoice settlement MUST NOT run before payment claim succeeds.**

### Locked ordering — Void posted payment

| Step | Operation |
| --- | --- |
| 1 | Load payment |
| 2 | If posted: **`applyInvoicePaymentDelta(invoiceId, -amount)`** with `paidAmount >= amount` predicate |
| 3 | **`claimStatusTransition` payment → VOID** (expected status per domain: POSTED or PENDING per existing rules) |
| 4 | Audit |

Exact void claim expected-status set MUST match existing `withVoided` domain rules — implementation MUST NOT broaden/narrow void semantics.

---

## Concurrency Strategy

Phase 35 extends Phase 29’s two-part model to rental-invoice payment settlement:

1. **Once-only claim** on payment post (Phase 29 §9).
2. **Additive bounded counter mutation** on invoice money fields (Phase 29 §10.2 — same family as ERA `applySettlement`).

---

## Chosen Remediation

### Primary strategy: **Option A — Atomic predicated SQL increment/decrement on invoice settlement**

Introduce a repository method on `IRentalInvoiceRepository` (name illustrative: **`applyPaymentDelta`**) implemented in `prisma-rental-invoice.repository.ts` using **predicated raw SQL**, mirroring `ExternalRentalRepository.applySettlement` (Phase 29).

**Apply (+delta) predicate (conceptual):**

```sql
UPDATE "rental_invoices"
SET
  "paidAmount" = "paidAmount" + $delta,
  "balance" = "balance" - $delta,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = $invoiceId
  AND "status" IN ('ISSUED', 'PARTIALLY_PAID', 'PAID')  -- PAID allows edge top-up only if domain permits; implementation MUST match I-03
  AND "paidAmount" + $delta <= "grandTotal"
  AND $delta > 0
RETURNING "paidAmount", "balance", "grandTotal", "status", ...
```

**Reverse (−delta) predicate (void):**

```sql
... WHERE "paidAmount" - $delta >= 0 AND $delta > 0 ...
```

On zero rows updated → throw `ConcurrentUpdateError` (or map to existing eligibility error if invariant violation — implementation picks **one** stable mapping per Phase 29).

**Status derivation:** After successful SQL, re-load invoice (or use RETURNING), compute status via **existing** `computeInvoiceTotals` + `withPaymentApplied` status rules (extract shared helper if needed — **no new business rules**). Write status in the same transaction.

**Application layer:** `applyPaymentToInvoice` MUST be refactored to call `applyPaymentDelta` instead of absolute `updateStatus` on money fields. Domain `withPaymentApplied` remains the authority for status logic but MUST NOT drive absolute persistence of `paidAmount` from stale reads.

### Required companion (same phase, not a separate strategy)

**Payment `claimStatusTransition`** — `updateMany({ where: { id, status: 'PENDING' }, data: { status: 'POSTED', postedAt } })` before invoice delta application on post.

This satisfies I-05 and prevents double-settlement of the same payment record.

---

## Rejected Alternatives

### Option B — SELECT FOR UPDATE only

**Rejected.** Phase 29 §9 explicitly rejects row locking as the primary primitive. Holding locks across validation, domain math, and audit widens deadlock surface without adding invariant enforcement beyond predicated UPDATE. READ COMMITTED + predicated UPDATE is the established project pattern.

### Option C — Optimistic concurrency / version column

**Rejected.** Phase 29 §7 Non-Goals excludes aggregate-wide version columns. No version field exists on `RentalInvoice`. Adding schema solely for this phase violates Phase 35 schema decision.

### Option D — Derive `paidAmount` from payment rows at read time

**Rejected.** Would require redesigning invoice aggregates, list/report queries, and historical audit semantics. Performance and transaction boundaries differ from current denormalized `paidAmount` / `balance` columns used throughout the app. Existing architecture intentionally maintains invoice settlement fields on the invoice row (symmetric to ERA `amountPaid` denormalization fixed via `applySettlement`, not via runtime SUM).

### Absolute write with transaction only

**Rejected.** Single-transaction absolute write still loses updates under concurrent transactions at READ COMMITTED — the core F-35-01 failure mode.

---

## Schema Decision

**NO SCHEMA CHANGE**

Existing columns suffice:

- `RentalInvoice.paidAmount` — `Decimal(12, 2)`
- `RentalInvoice.balance` — `Decimal(12, 2)`
- `RentalInvoice.grandTotal` — `Decimal(12, 2)`
- `Payment.amount` — `Decimal(12, 2)`
- `Payment.status` — enum

No migration required for Phase 35.

Optional future hardening (partial unique indexes, version columns) is **explicitly out of scope** — see F-35-02 / F-35-05.

---

## Status Transition Decision

| Entity | Mechanism |
| --- | --- |
| **Payment post** | Atomic **`claimStatusTransition`** `PENDING → POSTED` **before** invoice delta |
| **Payment void** | Atomic claim to `VOID` per existing domain rules **after** reverse delta when posted |
| **Invoice money** | **`applyPaymentDelta`** predicated SQL — not status-claim-gated separately; money invariants in SQL WHERE |
| **Invoice status** | Derived post-delta using existing `withPaymentApplied` status rules; persisted in same transaction |

Invoice status MUST NOT be computed from stale pre-delta `paidAmount`.

---

## Money Semantics

Locked to existing project conventions:

| Rule | Source |
| --- | --- |
| Storage | PostgreSQL `Decimal(12, 2)` via Prisma |
| Domain arithmetic | JavaScript `number` with **`roundMoney`** (`Math.round(value * 100) / 100`) |
| Balance formula | `balance = roundMoney(grandTotal - paidAmount)` |
| Payment amount validation | `amount > 0`; `amount <= invoiceBalance` at soft validation |
| Overpayment at commit | SQL predicate `paidAmount + delta <= grandTotal` |
| Currency | Single-currency ERP — no FX in this path |
| Floating point | **Prohibited** for persistence — use Decimal in SQL; domain rounding before DTO mapping unchanged |

Void reverse uses same `roundMoney` amounts; SQL predicates operate on Decimal columns.

---

## Test Lock

Implementation MUST NOT be accepted without:

### T35.1 — Concurrent payment settlement

Two **different** pending payments against the same issued invoice, posted concurrently (`Promise.all` / parallel service calls against shared repositories simulating concurrent transactions).

**Assert persisted values:**

- `sum(posted payment amounts) === invoice.paidAmount` (Decimal-safe)
- `invoice.balance === roundMoney(invoice.grandTotal - invoice.paidAmount)`
- Both payments `POSTED`

**Must NOT** pass by asserting only `status === 'PAID'`.

### T35.2 — Sequential payment regression

Existing happy-path post tests (`payment.application.test.ts` partial + full pay) MUST remain green without weakening assertions.

### T35.3 — Multiple concurrent payments

Three or more concurrent posts (different pending payments, amounts splitting balance) — conservation invariant I-01/I-02 holds.

### T35.4 — Invoice status transition under concurrency

Scenario: concurrent partial posts that should end `PARTIALLY_PAID`, and concurrent posts that fully clear balance → `PAID`. Assert **status + money fields** together.

### T35.5 — Rollback safety

Force failure after invoice delta (mock repository throw / audit failure hook) — verify invoice `paidAmount` / `balance` and payment status unchanged (transaction rollback). No partial settlement.

### T35.6 — Duplicate concurrent post same payment (I-05)

Two concurrent post commands on the **same** pending payment — exactly one succeeds; other returns **409** `ConcurrentUpdateError`; invoice receives **single** delta.

*(Added — required by I-05; implementation phase MUST include.)*

---

## Scope Lock

### IN scope (Phase 35 implementation)

| Item | Detail |
| --- | --- |
| F-35-01 | Atomic invoice settlement for post + void reverse |
| Payment post claim | `PENDING → POSTED` before settlement |
| Repository API | `applyPaymentDelta` (+ payment `claimStatusTransition`) |
| Refactor | `applyPaymentToInvoice`, `PostPaymentService`, `VoidPaymentService` |
| Tests | T35.1–T35.6 |
| Error surface | `ConcurrentUpdateError` → HTTP 409 per Phase 29 |

### OUT of scope (explicit deferrals)

| ID | Topic |
| --- | --- |
| F-35-02 | Active-invoice guard `pageSize: 10` |
| F-35-05 | Direct create invoice bypass |
| F-33-01 | Invoice number `pageSize: 500` |
| F-33-02 | Duplicate guard cluster (unless merged by separate stakeholder decision) |
| F-33-03 | Stock-movement API bypass |
| F-35-06 | Issue/void invoice TOCTOU |
| F-35-07 | Inventory PATCH bypass |
| F-35-08 | Pay expense journal ordering |
| F-35-09 | Side-effect ordering hygiene beyond settlement fix |
| Journal / GL posting | Not present at HEAD on payment post |
| Schema / migrations | None |
| WIP features | Customer billing UI, operational journal dedup, pending-payment aggregate WIP |

---

## Compatibility With Previous Decision Locks

| Prior lock | Relationship |
| --- | --- |
| **Phase 29** (`CONCURRENT_SAFE_COMMAND_IDEMPOTENCY_29.md`) | Phase 35 **extends** §10.2 additive money pattern to `RentalInvoice`; adopts §9 claim for payment post. **No contradiction.** |
| **Phase 28** mixed return attribution | Unrelated — no change |
| **Phase 30–34** dispatch / invoice rollup | F-31-03 closed; Phase 35 does not reopen |
| **Phase 33** maintenance claims | Independent — closed |
| **Phase 34** invoice dispatch rollup | Independent — closed |

Phase 29 explicitly classified ERA settlement as **additive** with concurrent partial payments allowed when bounded — invoice customer payments follow the **same classification**.

---

## Implementation Constraints

1. **No absolute money writes** from stale reads on invoice settlement paths after Phase 35.
2. **No schema change.**
3. **No new generic concurrency framework** — reuse `claimStatusTransition` + predicated SQL patterns only.
4. **No change** to payment eligibility business rules (I-03 policy) beyond commit-time enforcement of existing rules.
5. **No bundling** of F-33 / F-35-02 / invoice pagination fixes.
6. **Preserve** existing audit actions and notification events on successful post.
7. **In-memory repository** test doubles MUST implement `applyPaymentDelta` + payment claim with equivalent semantics for T35.x.
8. **Do not** modify unrelated WIP files during implementation commit.

---

## Validation Requirements

Before Phase 35 commit:

| Gate | Requirement |
| --- | --- |
| T35.1–T35.6 | **PASS** |
| Full test suite | **PASS** (3059+ tests; count may increase by locked tests only) |
| Phase 35 scoped ESLint | **PASS** on touched files |
| Prisma validate | **PASS** (no schema change expected) |
| F-35-01 paths | No remaining absolute `paidAmount` / `balance` write from stale invoice read on post/void |
| Regression | Phase 29–34 closed paths untouched |

Full-repo unrelated WIP failures do not block Phase 35 if scoped validation passes (same rule as Phase 34).

---

## Next Phase

```text
GO TO PHASE 35 IMPLEMENTATION
```

Implement F-35-01 per this lock, then run T35.1–T35.6 and scoped validation before commit.

---

## Decision Lock Validation Checklist

| # | Check | Result |
| --- | --- | --- |
| 1 | F-35-01 exists at committed HEAD | **PASS** |
| 2 | Reproducible from code | **PASS** |
| 3 | Business invariants I-01–I-05 defined | **PASS** |
| 4 | Strategy technically compatible | **PASS** — mirrors Phase 29 `applySettlement` |
| 5 | Transaction boundary explicit | **PASS** |
| 6 | Status behavior explicit | **PASS** |
| 7 | Money semantics explicit | **PASS** |
| 8 | Schema decision explicit | **PASS** — no change |
| 9 | T35.1–T35.5 (+ T35.6 for I-05) locked | **PASS** |
| 10 | Alternatives rejected | **PASS** |
| 11 | Related findings remain separate | **PASS** |
| 12 | No contradiction with prior locks | **PASS** |
| 13 | WIP not used as evidence | **PASS** |

**Status: LOCKED / VALIDATED**
