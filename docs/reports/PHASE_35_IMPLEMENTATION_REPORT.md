# Phase 35 Implementation Report

## Executive Verdict

**IMPLEMENTED — F-35-01 ready for pre-commit validation**

Payment invoice settlement concurrency is fixed via atomic payment status claim and predicated invoice money delta, mirroring Phase 29 ERA `applySettlement`. Locked tests T35.1–T35.6 pass. Full test suite passes **3067/3067** (baseline 3059 + 8 new Phase 35 tests). Phase 35–scoped ESLint is clean. Phase 35–scoped TypeScript is clean on touched production and test files. Prisma validate and migrations are up to date.

Full-repo **TypeScript** and **production build** remain **not green** due to **unrelated uncommitted WIP** (e.g. missing imports in `customer-billing-section.tsx`). These blockers are outside Phase 35 scope and must not be bundled into the Phase 35 commit.

## Decision Lock

Reference: `docs/decisions/PAYMENT_INVOICE_SETTLEMENT_CONCURRENCY_35.md`

Parent audit: `docs/audits/PHASE_35_ENTERPRISE_GAP_AUDIT.md`

## Baseline

| Item | Value |
| --- | --- |
| Branch | `main` |
| Starting HEAD | `6fc20be` |
| Working tree | Large unrelated WIP preserved; Phase 35 changes are additive on top |

## Problem

**F-35-01 — Payment Invoice Settlement Concurrency (P1)**

Concurrent payment posts against the same invoice used read → calculate → absolute write on `paidAmount` / `balance` inside separate transactions. Under PostgreSQL READ COMMITTED, last writer wins: invoice settlement deltas were lost while payment rows could still become `POSTED`. Duplicate concurrent post of the same payment could apply the invoice delta more than once.

## Root Cause

`applyPaymentToInvoice` computed new totals from a stale invoice read and persisted absolute values via `updateStatus`. `PostPaymentService` updated payment status with unconditional `updateStatus` after the invoice write, with no atomic `PENDING → POSTED` claim before settlement.

## Implementation

### Payment claim

Added `claimStatusTransition` to `IPaymentRepository` / `PrismaPaymentRepository` / `InMemoryPaymentRepository` using predicated `updateMany` on expected status (Phase 29 maintenance pattern).

`PostPaymentService` now:

1. Soft validation (`withPosted`, `validateInvoiceForPayment`)
2. **`claimStatusTransition(id, "PENDING", { status: POSTED, postedAt })`**
3. On `null` → `ConcurrentUpdateError` (HTTP 409)
4. Then invoice settlement

`VoidPaymentService` now claims void after invoice reversal (posted path):

- **`claimStatusTransition(id, POSTED | PENDING, { status: VOID, voidedAt })`**

### Invoice delta

Added `applyPaymentDelta(invoiceId, delta)` to `IRentalInvoiceRepository` / Prisma / in-memory implementations.

**Apply (+delta):** predicated raw SQL

- `paidAmount = paidAmount + delta`
- `balance = balance - delta`
- WHERE status IN (`ISSUED`, `PARTIALLY_PAID`, `PAID`)
- AND `paidAmount + delta <= grandTotal`
- AND `delta > 0`

**Reverse (−delta, void):**

- Same increment form with negative delta
- WHERE status NOT IN (`DRAFT`, `VOID`)
- AND `paidAmount + delta >= 0`

`applyPaymentToInvoice` refactored to call `applyPaymentDelta`, reload derived entity, then persist status only via `withPaymentApplied` + `updateStatus(status)` when status changes. Money fields are no longer written from stale reads.

### Transaction boundary

All post/void mutations remain inside existing `runWithRepositoryUnitOfWork` via `IPaymentTransactionRunner`. Payment claim, invoice delta, status update, audit, and notification (and existing WIP journal hook when `userId` is present) share one transaction; rollback restores payment and invoice state together.

### Invoice status

After atomic delta, status is derived from reloaded invoice using existing `withPaymentApplied(paidAmount)` rules (`ISSUED` / `PARTIALLY_PAID` / `PAID`). Status is persisted only when it differs from the post-delta row.

### Void

Posted-payment void order (locked):

1. `applyPaymentToInvoice(..., "reverse")` → `applyPaymentDelta(-amount)` with `paidAmount >= amount` predicate
2. Re-derive invoice status
3. `claimStatusTransition` → `VOID`
4. Audit

Pending void skips invoice reversal; claim expects `PENDING`.

## Files Changed (Phase 35 scope)

| File | Change |
| --- | --- |
| `payment.repository.interface.ts` | `claimStatusTransition` |
| `prisma-payment.repository.ts` | Prisma `updateMany` claim |
| `in-memory-payment.repository.ts` | Test double claim |
| `rental-invoice.repository.interface.ts` | `applyPaymentDelta` |
| `prisma-rental-invoice.repository.ts` | Predicated raw SQL delta |
| `in-memory-rental-invoice.repository.ts` | Test double delta |
| `payment-invoice.validation.ts` | Atomic delta + status derivation |
| `post-payment.service.ts` | Claim-before-settle ordering |
| `void-payment.service.ts` | Reverse-before-void claim ordering |
| `payment-invoice-settlement-concurrency.35.application.test.ts` | T35.1–T35.6 + void regression |

## Tests

| Test | Result |
| --- | --- |
| **T35.1** | **PASS** — two concurrent posts, same invoice; `paidAmount` 220, `balance` 130 |
| **T35.2** | **PASS** — sequential partial post; money + status correct |
| **T35.3** | **PASS** — three concurrent posts; sum amounts = `paidAmount`, balance = `grandTotal - paidAmount` |
| **T35.4** | **PASS** — concurrent partial + full → `PAID`, balance 0 |
| **T35.5** | **PASS** — audit failure rolls back payment `PENDING` and invoice unchanged |
| **T35.6** | **PASS** — duplicate concurrent post; one success, one `ConcurrentUpdateError`; delta once |
| **Void regression** | **PASS** — posted void reverses totals/status; duplicate concurrent void succeeds once |
| **Existing payment tests** | **PASS** — `payment.application.test.ts` (38 tests) |

## Validation

| Check | Result |
| --- | --- |
| Targeted Phase 35 + payment tests | **46/46 PASS** |
| Full suite | **3067/3067 PASS** (`node -r dotenv/config vitest run`) |
| Phase 35 ESLint (touched files) | **Clean** |
| Phase 35 TypeScript (touched files) | **Clean** (no errors on Phase 35 paths; full `tsc` fails on unrelated WIP) |
| Prisma validate | **Valid** |
| Migrations | **Up to date** (6 migrations) |
| Production build | **FAIL** — unrelated WIP (`customer-billing-section.tsx` module-not-found) |

## Regression Search

Payment settlement no longer uses read-then-write absolute `paidAmount` / `balance` updates. Remaining `withPaymentApplied` usage in payment module is status derivation only after atomic delta.

Callers of `applyPaymentToInvoice`: `PostPaymentService`, `VoidPaymentService` — both updated.

## Unrelated WIP

Preserved exactly. Phase 35 did not modify unrelated modified/untracked files. Other payment-module WIP (journal posting, `sumPendingAmountByRentalInvoiceId`, etc.) was preserved where already present in the working tree.

## Out of Scope (Not Implemented)

F-35-02, F-35-05, F-33-01, F-33-02, F-33-03, F-35-06 through F-35-09

## Commit / Push

**NOT CREATED / NOT PERFORMED** — await selective pre-commit staging.

## Next Step

**PHASE 35 PRE-COMMIT VALIDATION** — stage only Phase 35 files, then commit.
