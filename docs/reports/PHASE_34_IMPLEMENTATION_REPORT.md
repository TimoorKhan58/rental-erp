# Phase 34 Implementation Report

## Executive Verdict

**IMPLEMENTED — Phase 34 scope validated**

F-31-03 is fixed in the locked production surface. T34.1 and T34.2 pass. Full test suite passes **3059/3059** (with `.env` loaded via `node -r dotenv/config`). Phase 34–scoped ESLint is clean. Prisma validate and migrations are up to date.

Full-repo **TypeScript** and **production build** are **not green** in the current working tree due to **unrelated uncommitted WIP** (missing imports in `customer-billing-section.tsx`, pre-existing feature typing debt in product/procurement/maintenance, and WIP in `payment-list.query.ts`). These blockers are outside Phase 34 scope and must not be bundled into the Phase 34 commit.

## Decision Lock

Reference: `docs/decisions/INVOICE_DISPATCH_ROLLUP_INTEGRITY_34.md`

Parent audit: `docs/audits/PHASE_34_ENTERPRISE_GAP_AUDIT.md`

## Baseline

| Item | Value |
| --- | --- |
| Branch | `main` |
| Starting HEAD | `a9c9b9b6af3b2f40168e7fa40df6c6b5c72ce46c` |
| Final HEAD (before commit) | `a9c9b9b6af3b2f40168e7fa40df6c6b5c72ce46c` (unchanged — no commit) |
| Origin | Up to date with `origin/main` |
| Working tree | Large unrelated WIP preserved; Phase 34 changes are additive on top |

## Problem

**F-31-03 — Invoice Dispatch Rollup Integrity**

Both `GenerateRentalInvoiceFromOrderService` and `ConvertMissingToLossService` loaded dispatches via `dispatchRepository.findPaged({ page: 1, pageSize: 100, rentalOrderId })`, truncating the dispatch population when a rental order had more than 100 dispatch records. That truncated set drove return flattening, condition-quantity rollups, and missing→loss mutation scope — causing under-billing and incomplete return conversion.

## Implementation

### Shared return-loading helper

Added `src/modules/rental-invoice/application/services/load-rental-order-returns.ts`:

```text
loadReturnsForRentalOrder(rentalOrderId, dispatchRepository, returnRepository)
  → findCompletedDispatchesByRentalOrderId(rentalOrderId)   // Phase 30 Rollup B
  → findByDispatchId per completed dispatch                  // unbounded per dispatch
  → flat()
```

### Affected services

| File | Change |
| --- | --- |
| `generate-rental-invoice-from-order.service.ts` | Replaced capped `findPaged({ pageSize: 100 })` dispatch load with `loadReturnsForRentalOrder`. **Retained** F-33-02 `findPaged({ pageSize: 10 })` active-invoice guard (out of scope — not changed to `findActiveByRentalOrderId`). |
| `convert-missing-to-loss.service.ts` | Replaced capped dispatch load on **initial load** and **post-mutation refresh** with `loadReturnsForRentalOrder`. |

### Post-implementation search (F-31-03 paths)

| Service | `findPaged` dispatch `pageSize: 100` | Status |
| --- | --- | --- |
| `generate-rental-invoice-from-order.service.ts` | **Removed** | Uses `loadReturnsForRentalOrder` |
| `convert-missing-to-loss.service.ts` | **Removed** (both load paths) | Uses `loadReturnsForRentalOrder` |

Remaining `findPaged` in invoice module (intentionally unchanged):

| Location | Classification |
| --- | --- |
| `generate-rental-invoice-from-order.service.ts` L74 `pageSize: 10` | F-33-02 — out of scope |
| `generate-invoice-number.ts` `pageSize: 500` | F-33-01 — out of scope |
| `list-rental-invoices.service.ts` | Administrative listing |

## Tests

| Test | File | Result |
| --- | --- | --- |
| **T34.1** | `rental-invoice.dispatch-rollup.34.application.test.ts` | **PASS** — 101 COMPLETED dispatches; return on dispatch index 0 (excluded by legacy page-100 cap) contributes `missingQuantity: 3` to generated invoice lines |
| **T34.2** | Same file | **PASS** — return on dispatch index 0 mutated (`missing → lost`); invoice rebuilt with `LOST_ITEM_CHARGE` qty 2, line total 1000 |
| **Full suite** | All modules | **3059/3059 PASS** (`node -r dotenv/config vitest run`) |

Fixtures: `src/modules/rental-invoice/tests/helpers/phase-34-dispatch-rollup.fixtures.ts`

### Typing cleanup (pre-commit)

The isolation review identified two strict TypeScript errors in `rental-invoice.dispatch-rollup.34.application.test.ts`:

| Issue | Resolution |
| --- | --- |
| `replacementCost: 500` not assignable to branded `ReplacementCost` | Use `createReplacementCost(500)` per product domain convention |
| Mock object not assignable to `CreateRentalInvoiceService` | Cast via `as unknown as CreateRentalInvoiceService` per project test pattern |

After cleanup: **0 TypeScript errors in all five Phase 34 files**.

## Validation

| Gate | Phase 34 scope | Full repo (current working tree) |
| --- | --- | --- |
| T34.1 / T34.2 | **PASS** | **PASS** |
| Full tests | **3059/3059 PASS** (dotenv required) | **3059/3059 PASS** |
| ESLint (Phase 34 files) | **PASS** (0 issues) | — |
| ESLint (project) | — | **FAIL** (5 errors in unrelated files) |
| TypeScript | **0 errors in Phase 34 files** (after typing cleanup) | **FAIL** (unrelated WIP + pre-existing HEAD feature typing debt; `.next/dev/types/routes.d.ts` is **not** the current root cause after `prisma generate`) |
| Prisma validate | **PASS** | **PASS** |
| Migrations | **Up to date** | **Up to date** |
| Production build | — | **FAIL** (`customer-billing-section.tsx` module-not-found — unrelated WIP) |

## Scope Compliance

| Constraint | Status |
| --- | --- |
| No schema change | **Confirmed** — `prisma/schema.prisma` untouched by Phase 34 |
| No new locks | **Confirmed** |
| No SQL aggregate for condition qty | **Confirmed** — unbounded record retrieval |
| No page-size increase | **Confirmed** |
| F-33-02 not implemented | **Confirmed** — reverted WIP `findActiveByRentalOrderId`; kept `findPaged({ pageSize: 10 })` |
| Unrelated WIP not included | **Confirmed** — Phase 34 commit must stage only the five files listed below |

## Phase 34 Files (intended commit surface)

```text
src/modules/rental-invoice/application/services/load-rental-order-returns.ts          (new)
src/modules/rental-invoice/application/services/generate-rental-invoice-from-order.service.ts
src/modules/rental-invoice/application/services/convert-missing-to-loss.service.ts
src/modules/rental-invoice/application/rental-invoice.dispatch-rollup.34.application.test.ts   (new)
src/modules/rental-invoice/tests/helpers/phase-34-dispatch-rollup.fixtures.ts               (new)
```

Documentation (optional in same commit or separate docs commit):

```text
docs/decisions/INVOICE_DISPATCH_ROLLUP_INTEGRITY_34.md
docs/audits/PHASE_34_ENTERPRISE_GAP_AUDIT.md
docs/reports/PHASE_34_IMPLEMENTATION_REPORT.md
```

## Remaining Findings (deferred — not resolved)

| ID | Status |
| --- | --- |
| **F-33-01** | Open — `generate-invoice-number.ts` `pageSize: 500` |
| **F-33-02** | Open — active-invoice guard `pageSize: 10` |
| **F-33-03** | Open — direct stock-movement API bypass |
| **F-31-05+** | Open — per prior phase decision locks |

## Phase 28–33 Regression

No modifications to dispatch create/update, return complete, reserve, maintenance/repair, or external-rental modules. Full suite **3059/3059** green confirms no regressions detected.

## Commit / Push

**NOT CREATED** — awaiting human review per Phase 34 workflow.

**NOT PUSHED**
