# Decision Lock — Invoice Dispatch Rollup Integrity (Phase 34)

## Status

**LOCKED / VALIDATED**

Validated against repository HEAD `a9c9b9b6af3b2f40168e7fa40df6c6b5c72ce46c` (`main`, up to date with `origin/main`) and audit `docs/audits/PHASE_34_ENTERPRISE_GAP_AUDIT.md` on 2026-08-23.

Implementation, acceptance tests, commit, and push are **NOT** authorized until this lock passes stakeholder review. This document authorizes Phase 34 implementation only.

---

## Problem

Rental invoice integrity workflows load dispatch records through capped list pagination:

```typescript
dispatchRepository.findPaged({
  page: 1,
  pageSize: 100,
  rentalOrderId,
  sortOrder: "desc",
});
```

`runRepositoryPagedQuery` applies `skip: 0, take: pageSize`. When a rental order has more than 100 dispatch records, dispatch 101 and beyond are never loaded. The services then flatten returns per loaded dispatch and feed that incomplete return set into authoritative financial calculations (condition-quantity rollups, missing→loss conversion, invoice line rebuild).

This is a **deterministic correctness defect**, not a concurrency defect. It is the same defect class Phase 30 closed for dispatch create/update (Rollup A), rental-order cancel guard (F-30-05), and return-sync Rollup B (F-30-06). Phase 30 explicitly **deferred** the rental-invoice paths; Phase 33 decision lock lists F-31-03 as **DEFERRED**.

---

## Finding

**F-31-03 — Invoice Dispatch Rollup Integrity**

| Attribute | Value |
| --- | --- |
| Severity | **P1 — High** |
| Area | RentalInvoice / Dispatch / Return |
| Defect class | Correctness-critical pagination truncation (F-05 family) |
| Committed call sites (HEAD `a9c9b9b`) | Exactly **two** — see Decision 1 |
| Audit reference | `docs/audits/PHASE_34_ENTERPRISE_GAP_AUDIT.md` |
| Prior deferrals | Phase 30 §Deferred, Phase 31 §27, Phase 32 §25, Phase 33 §Deferred |

**Business impact:** Orders with **>100 dispatches** may under-bill damage/loss/missing charges; `ConvertMissingToLossService` may skip return mutations on omitted dispatches, leaving invoice and return inspection state inconsistent.

---

## Business Invariant

For a rental order with status **`COMPLETED`**, invoice generation and draft missing→loss conversion **MUST** derive return/condition quantities from **every** return record reachable through **every** `COMPLETED` dispatch belonging to that rental order — **independent of repository page size**.

Formally:

```text
returns_for_invoice(rentalOrderId) =
  ⋃ { returnRepository.findByDispatchId(d.id)
      | d ∈ dispatchRepository.findCompletedDispatchesByRentalOrderId(rentalOrderId) }
```

Both `buildRentalInvoiceLinesFromOrder(...)` and `ConvertMissingToLossService` return mutations **MUST** operate on the complete `returns_for_invoice` set.

**Domain rules that MUST NOT change:**

| Rule | Source |
| --- | --- |
| Invoice eligibility requires rental order `COMPLETED` | `assertRentalOrderEligibleForInvoice` |
| Dispatch input set: `status = 'COMPLETED'` only | Phase 30 Rollup B — `findCompletedDispatchesByRentalOrderId` |
| `CANCELLED` dispatches excluded from integrity rollups | Phase 30 Rollup A/B family |
| Return condition rollup in invoice builder: `returnRecord.status === 'COMPLETED'` only | `build-rental-invoice-lines.ts` → `buildConditionByOrderItemId` |
| Phase 28 mixed return source × condition attribution on **complete-return write path** | Unchanged — invoice paths are read-only for returns except convert-missing-to-loss item mutation |
| Owned/external dispatch-item split | Not used in invoice condition rollup (return items carry condition qty) |

**Semantic correction vs legacy defect path:** Committed `findPaged` loads **all dispatch statuses** (no status filter). Phase 34 **MUST NOT** preserve that behavior. The fix **MUST** align with Phase 30 Rollup B (`COMPLETED` dispatches only), matching `syncRentalOrderStatusFromReturns`.

---

## Decision 1 — Scope

Phase 34 implements **F-31-03 only**.

### In scope — production files

| # | File | Change |
| --- | --- | --- |
| 1 | `src/modules/rental-invoice/application/services/generate-rental-invoice-from-order.service.ts` | Replace capped dispatch-derived return loading with authoritative completed-dispatch retrieval |
| 2 | `src/modules/rental-invoice/application/services/convert-missing-to-loss.service.ts` | Replace capped dispatch-derived return loading on **initial load** and **post-mutation refresh/reload** |
| 3 | `src/modules/rental-invoice/application/services/load-rental-order-returns.ts` | Add shared application helper (new file) **OR** equivalent minimal helper with identical semantics |

### In scope — tests

| Test ID | Target |
| --- | --- |
| **T34.1** | `GenerateRentalInvoiceFromOrderService` — >100 dispatch edge |
| **T34.2** | `ConvertMissingToLossService` — >100 dispatch edge |

Recommended new test file: `src/modules/rental-invoice/application/rental-invoice.dispatch-rollup.34.application.test.ts` (name may vary; tests **MUST** be labeled T34.1 / T34.2).

### Locked production surface

Repository search at HEAD confirms **only** the two services above perform correctness-critical dispatch rollup for invoice/return financial logic. No other rental-invoice application service (`issue`, `void`, `update`, `create`, `get`, `list`) reads dispatch data for rollups.

**No modifications** to dispatch create/update/complete/cancel, return complete, rental-order reserve/cancel, maintenance/repair, external-rental, inventory, or reporting modules except import/wiring required by the shared loader.

---

## Decision 2 — Authoritative Dispatch Retrieval

Phase 34 **MUST** reuse the existing Phase 30 repository primitive:

```typescript
dispatchRepository.findCompletedDispatchesByRentalOrderId(rentalOrderId): Promise<Dispatch[]>
```

**Contract (locked — matches Phase 30 decision §8 and `prisma-dispatch.repository.ts`):**

| Property | Value |
| --- | --- |
| Filter | `WHERE rentalOrderId = $id AND status = 'COMPLETED'` |
| Pagination | **None** — unbounded `findMany` |
| Includes | Full dispatch graph (`DISPATCH_INCLUDE`) |
| Interface | `IDispatchRepository` — `dispatch.repository.interface.ts` L42–44 |
| Prisma impl | `prisma-dispatch.repository.ts` L243–259 |
| In-memory impl | `in-memory-dispatch.repository.ts` L208–218 |

**Prohibited on F-31-03 integrity paths:**

```typescript
dispatchRepository.findPaged({ pageSize: 100 | 500 | 1000 | …, rentalOrderId })
```

**Prohibited:** Creating a parallel "get all completed dispatches" abstraction when `findCompletedDispatchesByRentalOrderId` already satisfies the requirement.

---

## Decision 3 — COMPLETED-Only Semantics

Phase 34 **MUST** load dispatches with:

```text
status = 'COMPLETED'
```

**MUST NOT** load or roll up from:

| Status / pattern | Rationale |
| --- | --- |
| `DRAFT`, `READY`, `DISPATCHED` | Not Rollup B; not invoice-authoritative |
| `CANCELLED` | Excluded from Phase 30 integrity rollups |
| Unfiltered paginated lists | Legacy defect behavior |
| Arbitrary `findPaged` without status filter | Legacy defect behavior |

This matches Phase 30 Rollup B used by `syncRentalOrderStatusFromReturns` and the Phase 30 decision lock §13.

---

## Decision 4 — Return Loading

Phase 34 **MUST** implement the following application-layer shape:

```text
loadReturnsForRentalOrder(rentalOrderId, dispatchRepository, returnRepository)
        ↓
findCompletedDispatchesByRentalOrderId(rentalOrderId)
        ↓
for each completed dispatch: returnRepository.findByDispatchId(dispatch.id)   // unbounded per dispatch
        ↓
flatten → Return[]
        ↓
invoice / missing-to-loss business logic
```

**Return repository:** `findByDispatchId` is already unbounded (`prisma-return.repository.ts` L123–133 — `findMany` with `where: { dispatchId }`, no `take` cap).

**Shared helper:** `loadReturnsForRentalOrder` is the locked name. It lives in the rental-invoice application layer and accepts repository interfaces from the existing UoW — **no new repository interface methods required** for Phase 34 correctness.

**Convert-missing-to-loss reload:** After mutating returns, the service **MUST** reload returns through the same authoritative path. **MUST NOT** leave a second capped `findPaged({ pageSize: 100 })` reload behind. Implementation **MUST** search the entire service for all dispatch/return loading call sites before sign-off.

**Optional future optimization (NOT Phase 34):** A single `findReturnsByRentalOrderId` repository method may reduce N+1 queries. It is **not required** for correctness and **MUST NOT** block Phase 34.

---

## Decision 5 — No SQL Aggregate

Phase 34 **MUST NOT** replace this workflow with a SQL aggregate of condition quantities (e.g. `SUM(damagedQuantity)` grouped by rental-order line).

**Reason:** `ConvertMissingToLossService` iterates individual return records to mutate `missingQuantity → lostQuantity` and persists per-return updates. `buildRentalInvoiceLinesFromOrder` aggregates inspection notes from individual return items. A SQL aggregate would duplicate domain rules and cannot serve the mutation path.

SQL aggregates remain appropriate elsewhere (Phase 30 Rollup A). They are **not** the authoritative solution for F-31-03.

---

## Decision 6 — No Page-Size Increase

The following are **explicitly rejected**:

```typescript
pageSize: 101
pageSize: 500
pageSize: 1000
pageSize: 10000
// or any other arbitrary cap increase
```

**Reason:** Moving the truncation boundary does not eliminate the defect. Phase 30 decision lock §Rejected alternatives established that correctness-critical rollups **MUST NOT** depend on list pagination caps. Business results **MUST** be independent of page size.

---

## Decision 7 — No New Concurrency Locks

F-31-03 is a **deterministic pagination/truncation defect**, not a concurrency defect (Phase 34 audit §Concurrency Assessment).

Phase 34 **MUST NOT** introduce:

| Mechanism | Status |
| --- | --- |
| `SELECT … FOR UPDATE` on rental orders for invoice read rollup | **Prohibited** |
| Advisory locks | **Prohibited** |
| New parent-row locks | **Prohibited** |
| New inventory locks | **Prohibited** |
| Optimistic version columns | **Prohibited** |
| New idempotency infrastructure | **Prohibited** |

**Preserved:** Existing `runWithRepositoryUnitOfWork` transaction boundaries on both affected services. Reads remain consistent within one transaction snapshot.

**Concurrency tests:** **NOT required** for Phase 34 acceptance of F-31-03. Sequential application tests T34.1 and T34.2 are sufficient.

---

## Decision 8 — No Schema Change

Phase 34 is explicitly:

```text
NO Prisma schema change
NO migration
NO new database table
NO new persisted counter
NO new unique constraint for this finding
```

The defect is in **retrieval logic**, not data modeling.

---

## Decision 9 — Acceptance Tests

Phase 34 **MUST** add exactly these acceptance tests before the phase is considered complete.

### T34.1 — Invoice generation beyond 100 dispatches

**Service:** `GenerateRentalInvoiceFromOrderService`

**Fixture pattern (mirror Phase 30 T30.6):**

1. Seed rental order with status eligible for invoice generation path (completed order fixture).
2. Seed **100** non-`COMPLETED` dispatches (e.g. `DRAFT`) plus **1** `COMPLETED` dispatch at index 101 — proving the COMPLETED dispatch is not lost among >100 total records.
3. Attach a **COMPLETED** return to the COMPLETED dispatch with `missingQuantity > 0` (and/or `damagedQuantity` / `lostQuantity` as needed to prove rollup).
4. Execute invoice generation.
5. **Assert business state**, not merely HTTP success:
   - Invoice includes condition line(s) reflecting quantities from the return on dispatch 101.
   - `missingQuantity` (or relevant condition field) on invoice rental line matches expected complete population.
   - Dispatch 101 is not silently excluded.

**Infrastructure:** Use in-memory repositories with existing `findCompletedDispatchesByRentalOrderId` support. **Do not** use sequential-only proof where concurrency is irrelevant — a single deterministic test is sufficient.

### T34.2 — Missing-to-loss conversion beyond 100 dispatches

**Service:** `ConvertMissingToLossService`

**Fixture:** Same >100 dispatch structure; draft invoice with missing quantities derived from return on dispatch 101.

**Execute** convert-missing-to-loss.

**Assert business state:**

1. Return on dispatch 101 is included in mutation scope (`missingQuantity → 0`, `lostQuantity` incremented).
2. Persisted return record reflects conversion (re-read from repository).
3. Rebuilt invoice lines include `LOST_ITEM_CHARGE` (or equivalent) with correct quantity and amount.
4. No returns beyond the legacy page-100 boundary are silently skipped.

**Reload path:** Test **MUST** fail if implementation fixes only the initial load but leaves a capped refresh path.

---

## Decision 10 — Regression Requirements

The full project validation suite **MUST** remain green after Phase 34 implementation. The following phase behaviors **MUST NOT** regress:

| Phase | Invariant | Phase 34 impact |
| --- | --- | --- |
| **28** | Mixed return source × condition attribution on complete-return | Invoice read paths unchanged; complete-return write path untouched |
| **29** | Concurrent-safe workflow claims (`claimStatusTransition`) | No change to claim paths |
| **30** | Rollup A SQL aggregate; Rollup B `findCompletedDispatchesByRentalOrderId`; EXISTS cancel guard | Phase 34 **reuses** Rollup B primitive — aligns invoice with Phase 30 |
| **31** | Date-aware availability serialization | No interaction |
| **32** | Rental-order reserve command integrity | No interaction |
| **33** | Maintenance/repair claim-before-side-effects | No interaction |

**Test regression lock:**

- **MUST NOT** weaken, remove, or disable existing assertions in Phase 28–33 test suites.
- **MUST NOT** disable concurrency tests (`Promise.allSettled` patterns) in prior phases.
- Phase 30 tests T30.4–T30.6 remain authoritative precedent for >100 dispatch fixtures.

---

## Out of Scope

The following findings **MUST NOT** be modified, bundled, or opportunistically fixed in Phase 34:

### Separate findings (explicit)

| ID | Location | Pattern | Reason |
| --- | --- | --- | --- |
| **F-33-01** | `generate-invoice-number.ts` | `findPaged({ pageSize: 500 })` | Invoice **numbering** sequence — not dispatch rollup |
| **F-33-02** | `generate-rental-invoice-from-order.service.ts` (committed HEAD) | `findPaged({ pageSize: 10 })` active-invoice guard | Duplicate-active **existence** check — not dispatch rollup |
| **F-33-03** | Direct `POST /stock-movements` RESERVE/RELEASE API | Inventory bypass | Unrelated module |

**Note on working-tree WIP:** Uncommitted changes include `findActiveByRentalOrderId` wiring (F-33-02 direction). That change **MUST NOT** be treated as part of Phase 34 unless a **separate** decision lock explicitly scopes F-33-02. Phase 34 implementation **MUST NOT** modify the active-invoice guard unless reverting accidental WIP bundling.

### Deferred findings (unchanged)

```text
F-31-05   Return receive/inspect atomic claims
F-31-06   Authorization granularity (F-11)
F-31-07   Repair.returnInspectionItemId FK (F-09)
F-31-08   UpdateInventory absolute PATCH bypass
F-31-09   DISPATCHED ghost enum (F-07)
F-31-10   Dispatch/return cancel concurrent claims
F-31-11   DB CHECK constraints
```

### Non-production surfaces (safe — no change required)

| Surface | Classification |
| --- | --- |
| `list-rental-invoices.service.ts`, `list-dispatches.service.ts`, etc. | Administrative listing (UI pagination) |
| Feature hooks `pageSize: 100` | Display/UI hydration only |
| Reporting repositories | Slice after full compute |

---

## Rejected Alternatives

| Alternative | Rejection reason |
| --- | --- |
| Raise `pageSize` to 101 / 500 / 1000 / 10000 | Same defect class; Phase 30 explicitly rejected |
| SQL aggregate of condition quantities | Cannot serve convert-missing-to-loss per-return mutation; duplicates domain rules |
| Unfiltered `findPaged` without status filter | Preserves legacy semantic bug; wrong dispatch population |
| New competing completed-dispatch repository method | Duplicates Phase 30 `findCompletedDispatchesByRentalOrderId` |
| `FOR UPDATE` / advisory lock on invoice generation | Defect is deterministic truncation; unnecessary complexity |
| Persisted counter / schema migration | Not a modeling defect |
| Bundled F-33-01 / F-33-02 / UI/report WIP | Violates single-finding phase scope |

---

## Compatibility With Phase 28–33

| Prior lock | Relationship to Phase 34 |
| --- | --- |
| `DISPATCH_CLAIMED_QUANTITY_INTEGRITY_30.md` | Phase 34 **consumes** `findCompletedDispatchesByRentalOrderId` (Rollup B). Does **not** modify Rollup A, EXISTS guard, or dispatch claim locks. |
| `DATE_AWARE_AVAILABILITY_SERIALIZATION_31.md` | No interaction. F-31-03 was deferred in §27. |
| `RENTAL_ORDER_RESERVE_COMMAND_INTEGRITY_32.md` | No interaction. F-31-03 was deferred in §25. |
| `MAINTENANCE_REPAIR_CLAIM_BEFORE_SIDE_EFFECTS_33.md` | No interaction. F-31-03 was deferred in §Deferred. |
| `MIXED_RETURN_SOURCE_CONDITION_ATTRIBUTION_28.md` | Invoice reads completed return items; complete-return attribution write path untouched. |
| `CONCURRENT_SAFE_COMMAND_IDEMPOTENCY_29.md` | No new claims introduced; existing write-path claims unchanged. |

**No contradiction** with Phase 30: Phase 30 deferred invoice paths precisely so Phase 34 could align them with Rollup B without redesigning dispatch integrity.

---

## Implementation Constraints

1. **Architecture:** Clean Architecture / DDD / Repository / UoW / DI / Zod / Prisma / PostgreSQL — unchanged.
2. **Transaction runners:** Use existing `runWithRepositoryUnitOfWork` and repository factories — no new persistence architecture.
3. **Domain logic:** `buildRentalInvoiceLinesFromOrder` and return entity rules — **no formula changes** unless a bug is proven in domain (none identified in Phase 34 audit).
4. **Helper placement:** `loadReturnsForRentalOrder` in `src/modules/rental-invoice/application/services/` — application layer only.
5. **Exports:** Add to application `index.ts` only if existing module conventions require it; not mandatory for correctness.
6. **Working-tree WIP rule:**

   | WIP artifact | Status |
   | --- | --- |
   | `load-rental-order-returns.ts` (untracked) | **Provisional** — matches this lock; may be retained during implementation after review |
   | Service wiring in unstaged diff | **Provisional** — must be validated against all decisions (both reload paths, no F-33-02 bundling) |
   | `findActiveByRentalOrderId` + UI/report changes | **Out of Phase 34 scope** — do not bundle |

7. **Implementation is NOT complete** until T34.1, T34.2, and full validation suite pass under the Phase 34 workflow (implementation report → review → commit).

---

## Validation Requirements

Before Phase 34 is marked **IMPLEMENTED**, the following **MUST** pass:

| Check | Requirement |
| --- | --- |
| TypeScript | PASS |
| ESLint | 0 errors |
| Prisma validate | PASS (no schema diff) |
| Migrations | Up to date (no new migration) |
| Unit/integration tests | All existing + T34.1 + T34.2 PASS |
| Production build | PASS |
| Grep guard | No `findPaged({ … pageSize: 100 … })` dispatch load in the two affected services |
| Reload guard | `convert-missing-to-loss.service.ts` has zero capped dispatch pagination on any path |

Recommended post-implementation grep:

```text
findPaged.*rentalOrderId
```

in `src/modules/rental-invoice/application/services/generate-rental-invoice-from-order.service.ts` and `convert-missing-to-loss.service.ts` — **MUST NOT** appear for dispatch retrieval after Phase 34.

---

## Final Decision

**Phase 34 closes F-31-03** by replacing capped dispatch list pagination in two rental-invoice application services with the Phase 30 authoritative primitive `findCompletedDispatchesByRentalOrderId`, loading returns via unbounded `findByDispatchId` per completed dispatch, flattened through a minimal shared helper `loadReturnsForRentalOrder`.

**Locked constraints:**

- COMPLETED dispatches only (Rollup B semantics)
- No SQL aggregate for condition quantities
- No page-size increase
- No new concurrency locks
- No schema change
- T34.1 and T34.2 required
- F-33-01, F-33-02, F-33-03 and deferred F-31-05+ remain out of scope

**Authorization:** Implementation may proceed after this decision lock is accepted. Uncommitted WIP is **not** validated implementation.

---

## Document Metadata

| Field | Value |
| --- | --- |
| Document | Invoice Dispatch Rollup Integrity v1.0 |
| Phase | 34 |
| Finding | F-31-03 |
| Baseline HEAD | `a9c9b9b6af3b2f40168e7fa40df6c6b5c72ce46c` |
| Parent audit | `docs/audits/PHASE_34_ENTERPRISE_GAP_AUDIT.md` |
| Parent phases | Phase 30 (Rollup B primitive), Phases 28–29–31–32–33 (preserve) |
| Implementation | **NOT PERFORMED** |
| Tests T34.1 / T34.2 | **NOT ADDED** |
| Commit | **NOT CREATED** |
| Push | **NOT PERFORMED** |
