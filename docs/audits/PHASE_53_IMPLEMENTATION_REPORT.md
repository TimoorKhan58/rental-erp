# Phase 53 — Implementation Report

**Implementation date:** 2026-09-02  
**Finding:** N-48-01 — Direct ERA Creation Full F-02 Parity  
**Decision lock:** DL-51-03 Option A @ `1aa422b`

---

## 1. Executive Verdict

**PHASE 53 COMPLETE — N-48-01 CLOSED**

---

## 2. Baseline

| Item | Value |
|------|-------|
| **Previous HEAD** | `70834529b444a126993245ba9eb2789dc6d7cef1` (Post-Phase-52 audit) |
| **Phase 52** | `1596a64` |
| **Branch** | `main` |
| **Push** | NO |
| **WIP** | ~151 unrelated entries preserved |

---

## 3. Decision Lock

```text
DL-51-03 — Option A — Full F-02 parity on all ERA creation paths
```

Direct `POST /api/external-rentals` must enforce the same locks, authoritative reread, and shortfall gate as `SourceRentalOrderExternallyService`.

---

## 4. N-48-01 Finding

| Field | Value |
|-------|-------|
| **ID** | N-48-01 |
| **Severity** | P2 |
| **Status** | **CLOSED** |

**Root cause:** `CreateExternalRentalService` called `executeCreateExternalRentalInScope` without F-02 serialization, allowing MANAGER+ to commit external hire quantity beyond owned shortfall via direct HTTP entry point.

---

## 5. F-02 Contract (Enforced)

Shared gate `assertExternalSourcingF02Gate` enforces:

1. Rental order exists; line items belong to order; optional product/warehouse parity (direct create)
2. Sorted `lockForAvailabilityCommit` per product×warehouse inventory row
3. `lockForReserveCommand(rentalOrderId)`
4. Authoritative rental order reread
5. Status guards: not `CANCELLED`; `isSourceExternallyEligibleStatus` (DRAFT/CONFIRMED/RESERVED)
6. No active ERA (`findActiveByRentalOrderId`)
7. F-02 snapshot via `calculateDateAwareAvailabilitySnapshot`
8. Shortfall via `calculateExternalSourcingShortfall`
9. Reject when `remainingShortfallQuantity <= 0` or requested quantity exceeds remaining

**Invariant:**

```text
quantityRequested ≤ remainingShortfallQuantity
(at commit time, post-lock authoritative state)
```

---

## 6. ERA Creation Paths

| Path | Service | HTTP | F-02 @ HEAD |
|------|---------|------|:-----------:|
| Source externally | `SourceRentalOrderExternallyService` | `POST /rental-orders/:id/external-rental` | Yes (Phase 48) |
| Direct create | `CreateExternalRentalService` | `POST /api/external-rentals` | **Yes (Phase 53)** |

Both delegate to `executeCreateExternalRentalInScope` after shared gate.

---

## 7. Before/After Parity Matrix

| Protection | SourceRentalOrderExternally | CreateExternalRental (before) | CreateExternalRental (after) |
|------------|:---------------------------:|:-------------------------------:|:----------------------------:|
| F-02 shortfall gate | Yes | **No** | **Yes** |
| Inventory lock | Yes | No | **Yes** |
| RO reserve lock | Yes | No | **Yes** |
| Authoritative reread | Yes | No | **Yes** |
| Status guards | Yes | No | **Yes** |
| Active ERA check | Yes (in-scope too) | Yes (in-scope only) | **Yes (gate + in-scope)** |
| Warehouse/product parity | N/A (derived from RO) | No | **Yes** |
| Authorization | `externalRentals.create` | Same | Same |

---

## 8. Implementation Changes

1. **`assert-external-sourcing-f02-gate.ts`** — shared F-02 gate extracted from Phase 48 logic; supports multi-line aggregation for direct create payloads
2. **`CreateExternalRentalService`** — extended UoW scope with RO + inventory repos; invokes gate before in-scope create
3. **`SourceRentalOrderExternallyService`** — refactored to call shared gate (no behavior change)
4. **`ExternalRentalWriteScope`** — adds `rentalOrderRepository`, `inventoryRepository`
5. **`create-external-rental-transaction.runner.ts`** — wires RO + inventory repositories in same UoW

---

## 9. Concurrency Analysis

Lock ordering matches `ReserveRentalOrderService`:

```text
inventory (lockForAvailabilityCommit, sorted by id)
→ rental order (lockForReserveCommand)
→ authoritative reread → shortfall validate → ERA create
```

Concurrent direct create ∥ reserve (T53.7) and source-externally tests (Phase 48) remain passing. Two direct creates for same RO serialize on RO lock; BD-4 active ERA uniqueness prevents double commit.

---

## 10. Transaction / Unit-of-Work

Single `IExternalRentalTransactionRunner.run` spans gate + `executeCreateExternalRentalInScope`. No nested transaction. Rollback on gate failure prevents partial ERA insert.

---

## 11. Authorization Verification

Unchanged — `externalRentals.create` (MANAGER+) at route. Gate is business invariant, not auth substitution.

---

## 12. Test Coverage

| Test | Coverage |
|------|----------|
| T53.1 | Valid direct create within shortfall |
| T53.2 | Over-shortfall rejected post-lock |
| T53.3 | No shortfall rejected |
| T53.4 | Ineligible RO status rejected |
| T53.5 | Warehouse mismatch rejected |
| T53.6 | Product mismatch rejected |
| T53.7 | Concurrent direct create ∥ reserve |
| T53.8 | Active ERA conflict |
| T53.9 | Missing rental order |
| Phase 48 T48.* | Source path regression (unchanged) |
| Scenario matrix T1/T11 | Direct create with shortfall-backed RO qty |

---

## 13. Test Results

| Suite | Result |
|-------|--------|
| Phase 53 (`create-f02-parity.53`) | **9/9 PASS** |
| Phase 48 source-externally concurrency | **PASS** |
| Phase 48 + source application | **PASS** |
| Full suite | **3232/3232 PASS** (+9 vs Phase 52 audit baseline 3223) |

```text
passed:  3232
failed:  0
skipped: 0
total:   3232
```

---

## 14. Static Validation

| Check | Result |
|-------|--------|
| `npx prisma validate` | **PASS** |
| ESLint (Phase 53 core files) | **PASS** |
| `npm run typecheck` | **FAIL** (pre-existing unrelated WIP — unchanged from Post-Phase-52 audit) |
| `git diff --check` | **PASS** (Phase 53 staged files) |

---

## 15. Schema / Migration Status

```text
Schema changes: NONE
Migrations: NONE
```

---

## 16. Regression Verification

Phase 48, 51, 52, rental-order reserve/cancel, external-rental workflow/cancel/scenario-matrix tests pass with shortfall-backed direct create harness updates.

---

## 17. Files Changed

| File | Purpose |
|------|---------|
| `src/modules/rental-order/application/services/assert-external-sourcing-f02-gate.ts` | **NEW** — shared F-02 gate |
| `src/modules/external-rental/application/services/create-external-rental.service.ts` | Gate + extended scope |
| `src/modules/rental-order/application/services/source-rental-order-externally.service.ts` | Use shared gate |
| `src/modules/external-rental/application/services/external-rental-transaction.runner.ts` | Scope interface |
| `src/modules/external-rental/infrastructure/factories/create-external-rental-transaction.runner.ts` | DI wiring |
| `src/modules/external-rental/application/external-rental.create-f02-parity.53.application.test.ts` | **NEW** — T53.1–T53.9 |
| `src/modules/external-rental/tests/helpers/external-rental-write-scope.factory.ts` | **NEW** — test harness |
| `src/modules/external-rental/tests/helpers/transaction-test-runner.ts` | Lock scopes + scope factory |
| Test harness updates (create-list, cancel, scenario-matrix, write-off) | Shortfall-backed create |
| `src/modules/rental-order/tests/helpers/rental-order.fixtures.ts` | `warehouseId` override for tests |
| `docs/audits/PHASE_53_IMPLEMENTATION_REPORT.md` | This report |

---

## 18. Finding Closure

```text
N-48-01 = CLOSED
```

Direct ERA creation enforces full F-02 parity per DL-51-03 Option A. Proven by T53.1–T53.9 and full regression suite.

---

## 19. Final Verdict

**PHASE 53 COMPLETE**

P2 queue item N-48-01 closed. No P0/P1 regressions. Remaining work: Post-Phase-53 Enterprise Gap Audit; P3 queue unchanged.

---

## 20. Recommended Next Step

```text
NEXT: Post-Phase-53 Enterprise Gap Audit
Then: P3 queue (N-51-01, F-37-R2, F-11, F-09, F-07, N-39-UI-01) or F-35-08 deferred re-audit
```

---

## Git

| Item | Value |
|------|-------|
| Commit | _(filled after commit)_ |
| Message | `feat(external-rental): enforce full F-02 parity on direct ERA creation` |
| Push | NO |
