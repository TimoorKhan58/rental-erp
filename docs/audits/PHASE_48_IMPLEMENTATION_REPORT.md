# Phase 48 — Implementation Report

**Implementation date:** 2026-09-01  
**Finding:** N-46-02 — Source-Externally F-02 Stale Read

---

## Executive Verdict

**PHASE 48 COMPLETE**

---

## Finding

**N-46-02 — Source-Externally F-02 Stale Read**

| Field | Value |
|-------|-------|
| **Severity** | P2 |
| **Status** | **CLOSED** |

---

## Baseline

| Item | Value |
|------|-------|
| **Previous HEAD** | `9e0eaf1a62b30137db939fd34e215b97823d369f` |
| **Branch** | `main` |
| **WIP** | ~150 unrelated files preserved |

---

## Root Cause

`SourceRentalOrderExternallyService` computed F-02 shortfall from unlocked reads outside any transaction, then delegated to `CreateExternalRentalService.execute`, which opened a **separate** UoW. Concurrent reserve/cancel on overlapping product×warehouse×period could change `dateAwareAvailableQuantity` between shortfall validation and ERA insert.

---

## Fix

1. **`executeCreateExternalRentalInScope`** — reusable ERA create+audit within an existing UoW (no nested transaction).
2. **`SourceRentalOrderExternallyService`** — refactored to use `IRentalOrderTransactionRunner.run`:
   - `lockForAvailabilityCommit(inventoryId)` when inventory row exists
   - `lockForReserveCommand(rentalOrderId)`
   - authoritative reread of order, inventory, commitment lines, active ERA
   - F-02 shortfall validation
   - in-scope ERA create
3. **`CreateExternalRentalService`** — thin wrapper delegating to in-scope helper (normal API callers unchanged).
4. **DI wiring** — `create-rental-order.services.ts` injects transaction runner + number sequences into source-externally service.

---

## Serialization

| Lock | Row | Method |
|------|-----|--------|
| Inventory | `inventory` (product×warehouse) | `lockForAvailabilityCommit` |
| Rental order | `rental_orders` (target RO) | `lockForReserveCommand` |

---

## Transaction Boundary

Single `IRentalOrderTransactionRunner.run` spans lock → reread → calculate → validate → ERA create → audit.

No nested `IExternalRentalTransactionRunner.run` on the source-externally path.

---

## Lock Ordering

Matches `ReserveRentalOrderService`:

```text
inventory (lockForAvailabilityCommit)
→ rental order (lockForReserveCommand)
```

---

## Invariant

```text
quantityRequested
≤
max(0, max(0, item.quantity − dateAwareAvailableQuantity) − alreadyExternallyRequestedQuantity)
```

Enforced on authoritative post-lock state.

---

## Create Path

Serialized in `SourceRentalOrderExternallyService` → `executeCreateExternalRentalInScope`.

---

## Update Path

**N/A** — no `quantityRequested` update mutation at HEAD.

---

## Cancellation

Unchanged. `CANCELLED` ERA excluded from `findActiveByRentalOrderId`; T48.4 verifies re-source allowed.

---

## Files Changed

| File | Purpose |
|------|---------|
| `src/modules/external-rental/application/services/create-external-rental-in-scope.ts` | **NEW** — in-scope ERA create + audit |
| `src/modules/external-rental/application/services/create-external-rental.service.ts` | Delegate to in-scope helper |
| `src/modules/rental-order/application/services/source-rental-order-externally.service.ts` | Lock → reread → validate → in-scope create in one UoW |
| `src/modules/rental-order/infrastructure/factories/create-rental-order.services.ts` | Wire transaction runner into source-externally |
| `src/modules/rental-order/application/rental-order.source-externally.application.test.ts` | Updated harness for new constructor |
| `src/modules/rental-order/application/rental-order.source-externally-concurrency.48.application.test.ts` | **NEW** — T48.1–T48.4, T48.6 |
| `docs/audits/PHASE_48_IMPLEMENTATION_REPORT.md` | This report |

---

## Tests

| Test | Result |
|------|--------|
| T48.1 valid full source | **PASS** |
| T48.2 cancel then source rejects | **PASS** |
| T48.2b concurrent cancel ∥ source | **PASS** |
| T48.3 exceeds post-lock shortfall | **PASS** |
| T48.4 cancelled ERA excluded | **PASS** |
| T48.5 update | **N/A** |
| T48.6 reserve ∥ source | **PASS** |
| Source-externally application (15) | **PASS** |
| External rental create-list | **PASS** |
| Phase 39/45/46/47 regression spot-check | **PASS** |

**Combined targeted regression:** **59/59 PASS** (with `DATABASE_URL` / `BETTER_AUTH_SECRET` set for cancel/reserve import chain)

---

## Regression

| Suite | Result |
|-------|--------|
| `rental-order.source-externally.application.test.ts` | 15/15 |
| `rental-order.source-externally-concurrency.48.application.test.ts` | 6/6 |
| `external-rental.create-list.application.test.ts` | PASS |
| Phase 39/45/46/47 spot-check | PASS |

Full Vitest suite not re-run (pre-existing env import failures on unrelated suites without env vars).

---

## Static Gates

| Check | Result |
|-------|--------|
| `npx prisma validate` | **PASS** |
| ESLint (Phase 48 paths) | **No linter errors** |
| `git diff --check` | **PASS** (Phase 48 files) |

---

## Schema

**NONE**

---

## Migrations

**NONE**

---

## WIP

**PRESERVED** — only Phase 48 files modified/staged

---

## Push

**NO**

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Nested UoW | Eliminated — in-scope create only on source path |
| Deadlock | Same lock order as reserve (inventory → RO) |
| Direct `POST /api/external-rentals` bypass | Out of scope (pre-existing); source-externally path hardened |

---

## Final Verdict

**PHASE 48 COMPLETE — N-46-02 CLOSED**

**Recommended next step:** Post-Phase-48 Enterprise Gap Audit
