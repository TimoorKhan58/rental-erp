# Phase 52 Implementation Report — N-44-05 Invoice Void POSTED Payment Guard

## Executive Verdict

**PHASE 52 COMPLETE — N-44-05 CLOSED**

Invoice void is blocked when any live **POSTED** payment references the invoice. Concurrency with payment posting is serialized on the invoice row (`lockForPaymentCommitment`).

---

## Baseline

| Item | Value |
|------|-------|
| HEAD before | `454ee6d` — Post-Phase-51 enterprise gap audit |
| Phase 51 | `eeb0c6f` |
| Audit | `454ee6d` |
| Decision lock | `1aa422b` — DL-51-02 Option 1 |
| WIP count | ~156 entries (preserved) |
| Push | NO |

---

## Finding — N-44-05 Root Cause

`VoidRentalInvoiceService` allowed `PARTIALLY_PAID → VOID` without inspecting payment rows. `paidAmount`/`balance` were preserved while POSTED payments remained linked, creating a settlement dead-end (no new payments, payment void reverse blocked on VOID invoice).

---

## Locked Decision — DL-51-02 Option 1

```text
Block invoice void when any POSTED payment exists.
Operator must void payments first, then void invoice.
```

---

## Business Invariant

```text
VOID allowed ⇔ count(POSTED payments for invoice) = 0
```

Not substituted with `paidAmount == 0`.

---

## Implementation

| File | Change |
|------|--------|
| `assert-invoice-void-without-posted-payments.ts` | **NEW** — guard helper; `UnprocessableError` with payment ids |
| `void-rental-invoice.service.ts` | Lock invoice → assert no POSTED → existing void claim |
| `payment.repository.interface.ts` | `countPostedPaymentsByRentalInvoiceId` |
| `in-memory-payment.repository.ts` | In-memory count implementation |
| `prisma-payment.repository.ts` | Prisma `payment.count` WHERE status=POSTED |
| `rental-invoice-transaction.runner.ts` | Add `paymentRepository` to write scope |
| `create-rental-invoice-transaction.runner.ts` | Wire payment repository in UoW |
| `post-payment.service.ts` | Lock + authoritative invoice re-read before validate/post (concurrency) |
| `transaction-test-runner.ts` (invoice) | Payment-commitment lock scope for test serialization |
| Test harness updates | `paymentRepository` in invoice write scopes (37/38/49/application) |
| `rental-invoice.void-posted-payment-guard.52.application.test.ts` | **NEW** — T52.1–T52.8 |
| `payment-invoice-derived-status-concurrency.49.application.test.ts` | T49.5 invariant assertion |

### Void algorithm

1. Load invoice (404 if missing)
2. `lockForPaymentCommitment(invoiceId)` — same boundary as payment create/post
3. `countPostedPaymentsByRentalInvoiceId` — reject if > 0
4. Domain `withVoided()` + `claimStatusTransition` (unchanged)
5. Audit (unchanged)

Side effects occur only after guard passes; rejected void writes no audit entry.

---

## Transaction / Concurrency Strategy

| Aspect | Mechanism |
|--------|-----------|
| Authoritative payment state | Payment row `status = POSTED` |
| Serialization boundary | `rentalInvoiceRepository.lockForPaymentCommitment` (PostgreSQL `FOR UPDATE` / in-memory mutex) |
| Void path | Lock → count POSTED → void claim |
| Post path | Lock → **re-read invoice** → validate → claim POSTED → apply delta |
| Race prevented | `POST payment ∥ VOID invoice` cannot commit `invoice.status = VOID` with live POSTED payment |

---

## API Behavior

- Unpaid / no POSTED payments: void unchanged (DRAFT/ISSUED/PARTIALLY_PAID without POSTED)
- POSTED payment exists: **422** `UnprocessableError` — *Cannot void rental invoice while POSTED payments exist. Void the payments first.*
- PAID / already VOID: existing domain lifecycle errors preserved
- Authorization: unchanged (`rentalInvoices.void`)

---

## Test Matrix

| Test | Result |
|------|--------|
| T52.1 unpaid void | PASS |
| T52.2 PARTIALLY_PAID + POSTED blocked | PASS |
| T52.3 PAID + POSTED domain block | PASS |
| T52.4 non-POSTED does not block | PASS |
| T52.5 multiple POSTED blocked | PASS |
| T52.6 lifecycle restrictions preserved | PASS |
| T52.7 authorization regression | PASS |
| T52.8 POST ∥ VOID concurrency | PASS |

---

## Regression Results

| Suite | Result |
|-------|--------|
| Phase 52 focused | **8/8** |
| Phase 35 settlement concurrency | Included in **75/75** targeted |
| Phase 38 issue/void concurrency | Included in **75/75** targeted |
| Phase 39 pending over-commitment | Included in **75/75** targeted |
| Phase 49 derived status | **8/8** (T49.5 invariant updated) |
| Targeted invoice/payment combined | **75/75** |
| Full suite | **3223/3223** (+8 vs Post-Phase-51) |

---

## Static Validation

| Check | Result |
|-------|--------|
| `npx prisma validate` | PASS |
| ESLint (Phase 52 core files) | PASS |
| `npm run typecheck` | Pre-existing unrelated WIP failures only |

---

## Schema / Migration

```text
Schema changes: NONE
Migrations: NONE
```

---

## WIP Preservation

~156 unrelated WIP entries unchanged. Only Phase 52 files committed.

---

## Git

| Item | Value |
|------|-------|
| Commit | _(filled after commit)_ |
| Message | `fix(rental-invoice): block void with posted payments` |
| Push | NO |

---

## Next Step

Post-Phase-52 Enterprise Gap Audit — then Phase 53 (N-48-01) if queue unchanged.
