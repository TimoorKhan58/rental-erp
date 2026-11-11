# Phase 55 — Implementation Report

**Implementation date:** 2026-09-02  
**Finding:** N-51-01 — Invoice P2002 Conflict Retry Message Gap  
**Decision lock:** None required

---

## 1. Executive Verdict

**PHASE 55 COMPLETE — N-51-01 CLOSED**

---

## 2. Baseline

| Item | Value |
|------|-------|
| **HEAD before** | `85e0cd2ca289842cef4c93e34ddfce2c01f25612` |
| **HEAD after** | _(filled post-commit)_ |
| **Branch** | `main` |
| **Push** | NOT PUSHED |
| **WIP** | ~151 unrelated entries preserved |

---

## 3. Finding

| Field | Value |
|-------|-------|
| **ID** | N-51-01 |
| **Title** | Invoice P2002 conflict retry message gap |
| **Severity** | P3 |
| **Status** | **CLOSED** |

---

## 4. Root Cause

`GenerateRentalInvoiceFromOrderService` retries invoice number allocation up to five times when `isInvoiceNumberConflict(error)` is true. Before Phase 55, the inline helper matched only:

```text
ConflictError && message === "Invoice number already exists"
```

Under a TOCTOU race (parallel generate-from-order for different rental orders), the application pre-check can miss an uncommitted invoice number while Prisma still enforces `@unique` on `RentalInvoice.invoiceNumber`. The repository layer maps Prisma `P2002` via `mapPrismaError` to:

```text
ConflictError — "A record with the same unique value already exists"
details: { target: ["invoiceNumber"] }
```

That mapped conflict was **not** recognized as retriable, so the service could fail after a single attempt even though the retry loop was designed to recover from invoice-number collisions.

---

## 5. Implementation

| File | Change |
|------|--------|
| `src/modules/rental-invoice/application/services/is-invoice-number-conflict.ts` | **New** shared detector for invoice-number allocation conflicts: explicit pre-check message, Prisma P2002 cause on `invoiceNumber`, or `ConflictError.details.target` containing `invoiceNumber`. |
| `src/modules/rental-invoice/application/services/generate-rental-invoice-from-order.service.ts` | Import shared helper; remove inline message-only filter. |
| `src/modules/rental-invoice/application/rental-invoice.p2002-retry.55.application.test.ts` | **New** Phase 55 regression suite (T55.1–T55.5, T55.7). |

No schema, migration, route, authorization, or financial logic changes.

---

## 6. Error Contract

| Field | Value |
|-------|-------|
| **Trigger** | Invoice number allocation conflict during generate-from-order (application pre-check **or** Prisma P2002 on `invoiceNumber`) |
| **Retry behavior** | Up to 5 allocation attempts; on exhaustion → `UnprocessableError` |
| **HTTP status (exhausted)** | 422 (via existing `UnprocessableError` mapping) |
| **Safe message (exhausted)** | `Unable to allocate a unique invoice number after multiple attempts` |
| **P2002 mapped message (transient)** | `A record with the same unique value already exists` — retried internally, not exposed as terminal failure when retry succeeds |
| **Raw Prisma leakage** | None in public messages (`P2002`, `PrismaClientKnownRequestError`, constraint names not surfaced) |

---

## 7. Concurrency

Database `@unique` on `invoiceNumber` remains authoritative. Phase 55 broadens **retry recognition only**; it does not weaken locks, remove pre-checks, or allow duplicate invoices. Concurrent winners still produce one committed invoice per number; losers retry with the next sequence.

---

## 8. Transaction / UoW

P2002 still occurs inside the existing UoW/repository boundary. Failed create attempts roll back with the transaction; the outer retry loop allocates a new number and retries. No partial invoice survives a failed attempt.

---

## 9. Authorization

Unchanged. `GenerateRentalInvoiceFromOrderService` still requires authenticated user context before UoW execution (T55.5).

---

## 10. Tests

| ID | Description | Result |
|----|-------------|--------|
| **T55.1** | P2002 / pre-check conflicts recognized for retry | PASS |
| **T55.2** | No raw Prisma leakage in mapped conflict message/details | PASS |
| **T55.3** | Unrelated ConflictError / other-field P2002 / InternalError not retried | PASS |
| **T55.4** | Successful generate after one P2002-mapped conflict; exhausted-allocation message after 5 failures | PASS |
| **T55.5** | Unauthorized generate unchanged | PASS |
| **T55.6** | Phase 49/50/52 invoice/payment regressions | PASS (34/34 targeted) |
| **T55.7** | Service retries after P2002-mapped conflict and succeeds | PASS |

**Targeted Phase 55 file:** 9/9 passed

---

## 11. Regression

| Suite | Result |
|-------|--------|
| `rental-invoice.number-allocation.50.application.test.ts` | PASS |
| `payment-invoice-derived-status-concurrency.49.application.test.ts` | PASS |
| `rental-invoice.void-posted-payment-guard.52.application.test.ts` | PASS |

---

## 12. Full Suite

```text
passed: 3241
failed: 0
skipped: 0
total: 3241
```

Phase 54 baseline: 3232 passed. Delta: **+9** (new Phase 55 tests).

---

## 13. Static Validation

| Check | Result |
|-------|--------|
| **Prisma validate** | PASS |
| **ESLint** | FAIL (5 pre-existing errors in unrelated WIP — React Compiler memoization in feature modules; no Phase 55 file errors) |
| **Typecheck** | FAIL (pre-existing unrelated WIP errors; **no Phase 55 file errors** after unused-variable fix) |
| **git diff --check** | PASS |

---

## 14. Schema

```text
Schema changes: NONE
Migrations: NONE
```

---

## 15. WIP

Unrelated WIP preserved. Only Phase 55 files staged and committed.

---

## 16. Commit

```text
fix(rental-invoice): improve p2002 conflict retry message
```

Hash: _(filled post-commit)_

---

## 17. Push

```text
NOT PUSHED
```

---

## 18. Next Step

Post-Phase-55 Enterprise Gap Audit.
