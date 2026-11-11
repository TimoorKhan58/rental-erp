# Phase 46 — Supplier Pending Payment Commitment Integrity

## Executive Verdict

**PHASE 46 COMPLETE — N-44-06 CLOSED**

Concurrent supplier payment creation is now serialized on the purchase-order row with authoritative reread, pending aggregation, and validation before PENDING payment creation within the same UoW.

---

## Baseline

| Item | Value |
|------|-------|
| Previous HEAD | `43036b2` — Phase 45 return capacity concurrency |
| Branch | `main` |
| WIP status | ~146 modified/untracked files preserved (unrelated accounting, UI, seeds, reports, etc.) |

---

## Finding

**N-44-06 — Supplier Pending Payment Over-Commitment (P2)**

### Root cause

`CreateSupplierPaymentService` validated each new payment against a snapshot of `purchaseOrder.getBalance()` without locking the PO row or summing existing PENDING supplier payments. Concurrent creates could each pass validation independently and over-commit PO payable capacity.

### Business impact

Multiple concurrent PENDING supplier payments could sum above the PO's remaining payable balance (`getOrderTotal() - paidAmount`), creating financial commitments the PO cannot honor at settlement.

---

## Decision Lock

**Decision lock: NOT REQUIRED**

Mirrors Phase 39 customer pending-payment commitment pattern; no new business rule beyond the established invariant.

---

## Financial Invariant

```text
SUM(PENDING supplier payments for PO)
+
requested pending amount
≤
PO.getBalance()
```

where `PO.getBalance() = getOrderTotal() - paidAmount`.

This invariant is now concurrency-safe because the critical section holds a PO row lock (`FOR UPDATE`) through authoritative reread, pending sum, validation, and PENDING payment creation in a single transaction/UoW.

---

## Implementation

| File | Purpose |
|------|---------|
| `purchase-order.repository.interface.ts` | Added `lockForSupplierPaymentCommitment(purchaseOrderId)` |
| `prisma-purchase-order.repository.ts` | PostgreSQL `SELECT id FROM purchase_orders WHERE id = … FOR UPDATE` |
| `in-memory-purchase-order.repository.ts` | Test lock via `acquireSupplierPaymentCommitmentLock` |
| `supplier-payment-commitment-lock.ts` | **NEW** — ALS/mutex in-memory lock (mirrors `payment-commitment-lock.ts`) |
| `supplier-payment.repository.interface.ts` | Added `sumPendingAmountByPurchaseOrderId(purchaseOrderId, excludePaymentId?)` |
| `prisma-supplier-payment.repository.ts` | Prisma aggregate `SUM(amount) WHERE status = PENDING` |
| `in-memory-supplier-payment.repository.ts` | In-memory pending sum (PENDING only; VOID/POSTED excluded) |
| `supplier-payment-purchase-order.validation.ts` | Optional `pendingAmount`; `availableBalance = max(0, balance - pending)` |
| `create-supplier-payment.service.ts` | Lock → reread → sum pending → validate → create |
| `transaction-test-runner.ts` | `runWithSupplierPaymentCommitmentLockScope` for test parity |
| `supplier-payment.pending-over-commitment.46.application.test.ts` | **NEW** — T46.1–T46.5 + non-PENDING regression |

---

## Concurrency

```text
BEGIN (UoW)
  lockForSupplierPaymentCommitment(purchaseOrderId)   // FOR UPDATE
  authoritativePurchaseOrder = findById(purchaseOrderId)
  pendingAmount = sumPendingAmountByPurchaseOrderId(purchaseOrderId)
  validatePurchaseOrderForSupplierPayment(..., { pendingAmount })
  create PENDING supplier payment
COMMIT
```

The PO lock remains held until payment creation completes. No unlock-before-mutate pattern.

---

## Phase 44 Interaction

**UNCHANGED.** POST/VOID settlement continues to use `claimStatusTransition()` and `applyPaymentDelta()` with existing Phase 44 transaction boundaries and atomic predicates. Phase 46 applies only to **CREATE PENDING**.

---

## Tests

### Phase 46

File: `supplier-payment.pending-over-commitment.46.application.test.ts`

| ID | Scenario | Result |
|----|----------|--------|
| T46.1 | Concurrent 300 + 200 on PO balance 500 | PASS — both succeed, PENDING total 500 |
| T46.2 | Concurrent 300 + 300 on PO balance 500 | PASS — one succeeds, one rejects, PENDING total 300 |
| T46.3 | Existing pending 300 + create 300 on balance 500 | PASS — rejects |
| T46.4 | Existing pending 300 + create 200 on balance 500 | PASS — success, PENDING total 500 |
| T46.5 | Existing pending 499 + create 2 on balance 500 | PASS — rejects |
| Extra | POSTED payment excluded from pending sum | PASS |

T46.1 and T46.2 use `Promise.allSettled` for genuine concurrent execution.

### Supplier Payment Regression

`src/modules/supplier-payment` — **28/28 passed**

### Phase 44 Regression

`supplier-payment-settlement-concurrency.44.application.test.ts` — **passed** (included in supplier-payment suite)

### Phase 39 Regression

`payment.pending-over-commitment.39.application.test.ts` — **10/10 passed**

### Enterprise Regression

Phase 45 return capacity — **7/7 passed**

### Full Suite

**3163/3163 passed** (+6 vs 3157 at Phase 45 completion)

---

## Static Gates

| Gate | Result |
|------|--------|
| `npx prisma validate` | Valid |
| ESLint (Phase 46 files) | No errors |
| TypeScript (`npm run typecheck`) | **Pre-existing WIP failures** in unrelated files (UI, dispatch test scope, payment test scope, etc.) — no Phase 46 file errors |
| `git diff --check` (Phase 46 paths) | Clean |
| Build | Not run — full build would compile unrelated WIP; Phase 46 changes are backend-only and fully covered by vitest |

---

## Schema

**Schema changes: NONE**

**Migration changes: NONE**

---

## Git

| Item | Value |
|------|-------|
| Previous HEAD | `43036b2` |
| New HEAD | *(set at commit)* |
| Commit | `fix(payment): prevent supplier pending payment over-commitment` |
| Push | NO |
| WIP preserved | YES |

---

## Remaining Findings

Not re-audited in this phase. Known open items from post-Phase-45 audit:

- F-33-03
- N-44-05
- F-37-R1
- F-33-01
- F-37-R2
- F-11
- F-09
- F-07
- N-39-UI-01
- F-35-08 (deferred)

---

## Next Step

**Post-Phase-46 Enterprise Gap Audit**
