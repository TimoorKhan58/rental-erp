# Phase 49 Implementation Report

**Implementation date:** 2026-09-01  
**Finding:** F-37-R1 — Derived Invoice Status Atomicity

---

## Executive Verdict

**PHASE 49 COMPLETE — F-37-R1 CLOSED**

---

## Baseline

| Item | Value |
|------|-------|
| **HEAD before** | `2aab8cdf958739dee26a7adc83f82fe80c48231d` (`2aab8cd`) |
| **New HEAD** | `41c27b3` |
| **Branch** | `main` |
| **WIP** | ~151 unrelated files preserved |

---

## Finding

**F-37-R1 — Derived Invoice Status Atomicity**

| Field | Value |
|-------|-------|
| **Severity** | P2 |
| **Status** | **CLOSED** |

**Root cause:** After atomic `applyPaymentDelta`, derived lifecycle status was persisted via unconditional `updateStatus`, allowing a concurrent void (or other lifecycle claim) to be overwritten by a stale worker's derived status write.

---

## Implementation

### Files changed

| File | Change |
|------|--------|
| `src/modules/payment/application/services/payment-invoice.validation.ts` | Conditional derived-status claim + retry |
| `src/modules/payment/application/payment-invoice-derived-status-concurrency.49.application.test.ts` | Phase 49 tests T49.1–T49.7 |

### Repository changes

**None.** Reused existing `claimStatusTransition` on `IRentalInvoiceRepository`.

### Service changes

- Extracted `claimDerivedPaymentStatus` helper in `payment-invoice.validation.ts`
- Replaced `updateStatus` with `claimStatusTransition(invoiceId, afterDelta.status, { status: derived })`
- On failed claim: authoritative re-read; if derived status already matches, return idempotently; else retry claim from refreshed status; if still fails, throw `ConcurrentUpdateError`
- VOID invoice after concurrent void throws `ConcurrentUpdateError` via `derivePaymentStatus`, rolling back payment UoW in production

### Transaction changes

**None.** Status hardening remains inside existing payment post/void UoW (`IPaymentTransactionRunner.run`).

---

## Concurrency Strategy

### Before

```text
applyPaymentDelta (atomic)
→ derive status
→ updateStatus (unconditional)
```

### After

```text
applyPaymentDelta (atomic, unchanged)
→ derive status
→ claimStatusTransition(expected = post-delta status)
→ on miss: re-read → idempotent return OR retry claim from refreshed status
→ on final miss: ConcurrentUpdateError (txn rollback)
```

---

## Expected-State Predicate

Derived status update uses:

```text
claimStatusTransition(invoiceId, afterDelta.status, { status: statusDerived.status })
```

Equivalent to:

```text
UPDATE rental_invoices SET status = derived
WHERE id = ? AND status = afterDelta.status
```

Retry path uses `refreshed.status` after authoritative re-read when concurrent payment posts advance lifecycle first.

---

## Race Prevented

**POST ∥ VOID invoice:**

1. Worker A applies payment delta while invoice is `ISSUED`
2. Worker B voids invoice (`ISSUED` → `VOID`)
3. Worker A attempts derived status claim `ISSUED` → `PARTIALLY_PAID`
4. Claim returns 0 rows → re-read sees `VOID` → `ConcurrentUpdateError` → payment UoW rolls back

**No stale overwrite:** `VOID` cannot be replaced by `PARTIALLY_PAID` from a stale worker.

---

## Tests

| Test | Result |
|------|--------|
| T49.1 Normal payment → PARTIALLY_PAID | PASS |
| T49.2 Partial payment balance | PASS |
| T49.3 Full payment → PAID | PASS |
| T49.4 Payment void reverses status | PASS |
| T49.5 Concurrent POST ∥ VOID invoice | PASS |
| T49.6 Concurrent POST ∥ POST additive | PASS |
| T49.7 Stale status claim after void | PASS |

---

## Regression

### Focused (Phase 35/38/39/46/48 + Phase 49)

**45/45 PASS**

### Full suite

**3186/3186 PASS** (216 files, with `DATABASE_URL` + `BETTER_AUTH_SECRET`)

---

## Static Validation

| Check | Result |
|-------|--------|
| Prisma validate | **PASS** |
| ESLint (Phase 49 files) | **PASS** |
| Typecheck (repo-wide) | Pre-existing failures in unrelated WIP test files — not introduced by Phase 49 |

---

## Schema

**NONE**

---

## Migration

**NONE**

---

## WIP

**PRESERVED** (~151 files unstaged)

---

## Commit

`41c27b3` — `fix(rental-invoice): harden derived status transition`

---

## Push

**NO**

---

## Remaining Findings

| Finding | Status |
|---------|--------|
| F-33-03 | OPEN |
| N-44-05 | OPEN |
| F-33-01 | OPEN |
| N-48-01 | OPEN |
| F-35-08 | DEFERRED |

---

## Next Step

Post-Phase-49 Enterprise Gap Audit
