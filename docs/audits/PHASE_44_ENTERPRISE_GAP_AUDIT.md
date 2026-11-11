# Phase 44 Enterprise Gap Audit

**Audit date:** 2026-08-31  
**Scope:** Committed production baseline only — unstaged/untracked WIP excluded  
**Method:** End-to-end code trace (`git show HEAD:`), phase regression test execution, cross-reference with Phases 28–44 hardening artifacts

---

## 1. Executive Verdict

| Item | Value |
|------|-------|
| **Audit status** | **COMPLETE** |
| **HEAD** | `2928d1d` — `fix(payment): harden supplier payment settlement concurrency` |
| **P0 count** | **0** |
| **P1 count** | **1** |
| **Next highest-priority finding** | **N-44-01** — Return create/update capacity concurrency (missing dispatch lock / atomic capacity guard) |

Phase 44 successfully closed **N-44-04**. Phases 28–43 hardening chain remains intact at HEAD. The top open integrity gap is now the **return↔dispatch capacity race** — the mirror defect of Phase 30 dispatch claimed-quantity hardening, still open on the return side.

---

## 2. Baseline

| Item | Value |
|------|-------|
| **HEAD** | `2928d1df09da8e0383d6b9ddbb5bfad5967fbe4f` (`2928d1d`) |
| **Branch** | `main` |
| **Origin divergence** | **ahead 11** commits vs `origin/main` |
| **WIP state** | **~144 modified/untracked files** — substantial unrelated WIP (accounting, UI, seeds, reports, payment list filters, etc.) — **preserved, not audited** |
| **Push state** | **NO** |

Audit inspected committed tree at `2928d1d` only. WIP files (e.g. unstaged `ExpenseAccountingHook`, accounting UI, seed changes) were explicitly excluded from production behavior assessment.

---

## 3. Phase 28–44 Verification Matrix

| Phase | Finding | Status | Evidence |
|-------|---------|--------|----------|
| 28 | Mixed return source × condition | **CLOSED** | `return.source-condition.28.application.test.ts`; `resolveReturnSourceSplit()` in `return.source.rules.ts` |
| 29 | Workflow command concurrency (F-01–F-08) | **CLOSED** | `*.concurrency.29*.application.test.ts`; `claimStatusTransition` before side effects |
| 30 | Dispatch claimed quantity (F-05) | **CLOSED** | `dispatch.claimed-quantity.30.application.test.ts`; `lockForDispatchClaim` + SQL rollup |
| 31 | Date-aware availability (F-31-01) | **CLOSED** | `rental-order.availability-serialization.31.application.test.ts`; `lockForAvailabilityCommit` |
| 32 | Reserve command integrity (F-32-01) | **CLOSED** | `rental-order.reserve-command-integrity.32.application.test.ts`; `lockForReserveCommand` |
| 33 | Maintenance/repair claims (F-30-07) | **CLOSED** | `maintenance/repair.concurrency.33.application.test.ts` |
| 34 | Dispatch rollup for invoice (F-31-03) | **CLOSED** | `rental-invoice.dispatch-rollup.34.application.test.ts`; unbounded completed dispatch load |
| 35 | Rental payment settlement (F-35-01) | **CLOSED** | `payment-invoice-settlement-concurrency.35.application.test.ts`; `applyPaymentDelta` + post claim |
| 36 | Maintenance cancel reversal (F-36-01) | **CLOSED** | `maintenance.cancel-reversal-integrity.36.application.test.ts` |
| 37 | Active invoice generation (F-36-02) | **CLOSED** | `rental-invoice.active-guard.37.application.test.ts`; `lockForInvoiceCommand` |
| 38 | Invoice issue/void concurrency (F-35-06) | **CLOSED** | `rental-invoice.issue-void-concurrency.38.application.test.ts` |
| 39 | Pending payment over-commitment (F-36-03) | **CLOSED** | `payment.pending-over-commitment.39.application.test.ts`; invoice `FOR UPDATE` + pending sum |
| 40 | Cancel ∥ complete dispatch/return (N-40-01) | **CLOSED** | `dispatch.cancel-concurrency.40.application.test.ts` |
| 41 | Return receive/inspect concurrency (F-31-05) | **CLOSED** | `return.receive-inspect-concurrency.41.application.test.ts` |
| 42 | Dispatch mark-ready concurrency (N-42-01) | **CLOSED** | `dispatch.mark-ready-concurrency.42.application.test.ts` |
| 43 | Inventory PATCH ledger integrity (F-31-08) | **CLOSED** | `inventory.patch-ledger-integrity.43.application.test.ts`; metadata-only PATCH |
| 44 | Supplier payment settlement (N-44-04) | **CLOSED** | `supplier-payment-settlement-concurrency.44.application.test.ts`; `applyPaymentDelta` + `claimStatusTransition(PENDING→POSTED)` |

**Regression test run (executed during audit):**

```powershell
# 22 phase-regression files + inventory.concurrency.29.test.ts
npx vitest run @phaseFiles
```

**Result:** **22 files, 161/161 tests PASS** (~9.3s)

No regressions detected in Phases 28–44 hardening at HEAD.

---

## 4. Complete Findings Matrix

| ID | Severity | Status | Area | Finding | Business Impact | Evidence |
|----|----------|--------|------|---------|-----------------|----------|
| **N-44-01** | **P1** | **OPEN** | Return | Concurrent create/update return uses stale `findByDispatchId` aggregate; no `lockForDispatchClaim` or atomic capacity predicate | Return qty can exceed dispatched qty; propagates through receive→complete with stock/custody skew | `create-return.service.ts:113–138`; `update-return.service.ts:105–124`; `return.rules.ts:220–237`; no lock vs Phase 30 `create-dispatch.service.ts:113–133` |
| **F-33-03** | P2 | OPEN | Inventory | `POST /api/stock-movements` accepts all movement types with optional refs; no workflow/F-02 guards | RO/dispatch/return desync; RESERVE bypasses date-aware availability; ADJUSTMENT bypasses `inventory.adjust` RBAC split | `stock-movements/route.ts:14–16`; `create-stock-movement-in-scope.ts:37–97`; `role-permissions.ts:56–58` |
| **F-37-R1** | P2 | OPEN | Rental Invoice | `applyPaymentDelta` atomic on money; derived `status` persisted via unconditional `updateStatus` | Money fields authoritative and safe; persisted lifecycle status can disagree after void∥post race | `payment-invoice.validation.ts:68–73`; `prisma-rental-invoice.repository.ts:275–288,337–347` |
| **N-44-05** | P2 | OPEN | Rental Invoice | Void allows `PARTIALLY_PAID→VOID` without payment reversal cascade | VOID invoice retains `paidAmount>0`; posted payments remain live | `void-rental-invoice.service.ts:65–93`; `rental-invoice.entity.ts:147–156`; `rental-invoice.status.test.ts:137–142` |
| **N-44-06** | P2 | OPEN (NEW) | Supplier Payment | Create path validates against PO balance snapshot; no pending-sum lock (asymmetry vs Phase 39 rental) | Concurrent pending supplier payments can over-commit PO balance; post-time atomic delta prevents committed over-payment | `create-supplier-payment.service.ts:81–96`; `supplier-payment-purchase-order.validation.ts:20–28` (no `pendingAmount` / lock) |
| **F-33-01** | P2 | OPEN | Rental Invoice | Invoice number scan capped at `pageSize: 500` | Sequence reuse risk at scale; `@unique` prevents silent duplicate commit | `generate-invoice-number.ts:10–12`; `schema.prisma` `invoiceNumber @unique` |
| **F-35-08** | P2 deferred | DEFERRED | Expense | Pay service calls journal hook before status persist | **No production defect @ HEAD** — `NoOpExpenseAccountingHook`; latent ordering risk when real hook ships | `git show 2928d1d:.../create-expense-transaction.runner.ts`; `expense-accounting.hook.ts:13–16` |
| **F-37-R2** | P3 | OPEN | Rental Invoice | `generateNextInvoiceNumber` runs before `lockForInvoiceCommand` inside generate flow | Sequence gaps under concurrency; `@unique` prevents corruption | `generate-rental-invoice-from-order.service.ts:136`; `create-rental-invoice-in-scope.ts:25–27` |
| **F-11** | P3 | OPEN | Authorization | WORKER holds `inventory.update`, `stockMovements.create`, broad workflow mutate perms | Defense-in-depth gap; enables F-33-03 surface at API layer | `role-permissions.ts:48–119` |
| **F-09** | P3 | OPEN | Schema | `Repair.returnInspectionItemId` indexed but no FK `@relation` | Orphan reference risk; no runtime enforcement | `schema.prisma:853,876` |
| **F-07** | P3 | OPEN | Schema | `RentalOrderStatus.DISPATCHED` ghost enum value | Maintainability; not used as lasting commitment status | `schema.prisma:527,704` |
| **N-39-UI-01** | P3 | OPEN | UI | Billing section uses `pageSize: 10` + client-side active-invoice hint | UX false-negative for active invoice when >10 invoices on order | `rental-order-billing-section.tsx:32,41` |
| **N-44-04** | — | **CLOSED** | Supplier Payment | PO `paidAmount` read-modify-write | — | Phase 44 commit `2928d1d` |
| **F-31-08** | — | **CLOSED** | Inventory | PATCH counter mutation | — | Phase 43 |

---

## 5. P0 Findings

**P0: NONE**

No unauthenticated catastrophic financial/inventory corruption or total security boundary failure identified at committed HEAD.

---

## 6. P1 Findings

### N-44-01 — Return create/update capacity concurrency

**Area:** Return workflow  
**Status:** OPEN

**Read:** `returnRepository.findByDispatchId(dispatchId)` — plain `findMany`, no lock (`prisma-return.repository.ts:123–134`).

**Stale:** Prior-return aggregate built in memory (`return-dispatch.validation.ts:12–58`) from snapshot at validation time.

**Mutation:** `returnRepository.create` / `update` with absolute item quantities — no capacity predicate at write time.

**Atomic predicate:** **None** on return capacity.

**Row lock:** **None** — `lockForDispatchClaim` exists on rental order (Phase 30) but is **not invoked** in `create-return.service.ts` or `update-return.service.ts`.

**Claim:** `claimStatusTransition` exists for receive/inspect/complete/cancel only — **not** for create/update capacity.

**Race interleaving:**

```text
Dispatch D1: line L1 quantity = 10, prior returns = 0

Tx A (create return qty 6):  findByDispatchId → []  → validate 6≤10 ✓
Tx B (create return qty 6):  findByDispatchId → []  → validate 6≤10 ✓
Tx A: create(R1) commits
Tx B: create(R2) commits

Final returned total = 12 > 10 dispatched
```

Under PostgreSQL `READ COMMITTED`, neither transaction sees the other's uncommitted insert during validation.

**Side effects after race:** DRAFT returns proceed through receive/inspect/complete; owned-stock RELEASE/IN and external ERA deltas computed from overstated `returnedQuantity`. External complete has a partial SQL backstop (`complete-return.service.ts:306–331`); owned path does not re-cap against dispatch at complete.

**Phase 41 mitigation:** **None for capacity** — Phase 41 hardened receive/inspect **status claims** only.

**Test gap:** No concurrent create/update return capacity tests; Phase 30 dispatch lock tests exist as precedent (`dispatch.claimed-quantity.30.application.test.ts`).

---

## 7. Top Priority Analysis

**N-44-01 outranks all other open findings** after fresh re-ranking at HEAD `2928d1d`.

| Rank | ID | Why lower than N-44-01 |
|------|-----|------------------------|
| 1 | **N-44-01** | — |
| 2 | F-33-03 | Requires deliberate or mistaken **API bypass** by authenticated WORKER+; atomic SQL prevents committed impossible counters; primary harm is workflow desync, not silent counter corruption. Needs **policy decision lock** before implementation. |
| 3 | F-37-R1 | **Money fields safe** via atomic `applyPaymentDelta`; defect is derived **status field** TOCTOU — reporting/workflow confusion, not payment total corruption. |
| 4 | N-44-05 | **Policy gap** (OD-38-01) — void semantics intentionally preserve `paidAmount`; requires business decision on cascade vs block. |
| 5 | N-44-06 | Pending over-commitment on supplier **create** only; **post** protected by Phase 44 atomic delta — lower blast radius than committed settlement corruption. |
| 6 | F-33-01 | `@unique` prevents duplicate commit; impact is retry/gap at scale, not financial corruption under normal volume. |

**Why N-44-01 is P1 (not inflated):**

1. **Normal workflow path** — concurrent return creation by multiple warehouse users on the same completed dispatch is realistic, not a bypass.
2. **Same defect class as Phase 30** — dispatch claimed quantity was hardened with `lockForDispatchClaim`; return capacity is the uncapped mirror.
3. **Material irreversible integrity** — persisted return documents with qty > dispatched corrupt custody accounting and downstream stock effects.
4. **No policy ambiguity** — fix pattern is established (`lockForDispatchClaim` + authoritative aggregate under lock); no owner decision lock required.
5. **Phase 44 did not expose this** — closing supplier payment settlement removes the last P1 financial RMW; return capacity was pre-existing and now surfaces as top priority.

**Why F-33-03 is not #1 despite Phase 43 sharpening:**

Phase 43 closed PATCH counter bypass and routed ADJUSTMENT through stock-movements API, **increasing operational reliance** on F-33-03's surface. That raises priority within inventory (now top inventory P2) but does not exceed a **concurrency defect on a standard workflow command** that can corrupt dispatch↔return invariants under normal concurrent use without special API knowledge.

---

## 8. F-33-03 Special Review

**Classification: P2 (material integrity + policy — not P0/P1)**

**Committed behavior @ HEAD:**

- `POST /api/stock-movements` → `handleCreateStockMovement` with `PERMISSIONS.stockMovements.create` (`stock-movement-api.routes.ts:66–73`).
- All five types accepted; references optional (`stock-movement.schemas.ts:13–40`).
- Service applies atomic SQL per type (`prisma-inventory.repository.ts:251–481`) — no workflow guards.

**What atomic SQL protects:**

- Non-negative `quantityOnHand`
- `reservedQuantity ≤ quantityOnHand`
- Over-reserve / over-release / over-OUT rejected at SQL layer

**What bypass still allows:**

| Type | Bypass harm |
|------|-------------|
| RESERVE | Skips F-02 `lockForAvailabilityCommit` + date-aware re-read (`reserve-rental-order.service.ts:111–195`) |
| OUT/IN | Stock mutation without dispatch/return/PO workflow gates |
| RELEASE | Reserved qty release decoupled from RO lifecycle |
| ADJUSTMENT | Uses `stockMovements.create` not UI-only `inventory.adjust` permission |

**Phase 43 interaction:** PATCH no longer mutates counters (`inventory.schemas.ts:30–48`); UI corrections use `POST /api/stock-movements` ADJUSTMENT (`inventory.service.ts:55–63`). F-33-03 is now the **only general counter-mutation API** besides workflow commands and inventory bootstrap create.

**Tests proving bypass:** `stock-movement.application.test.ts` — reference-free RESERVE/RELEASE succeed.

**Decision lock:** **REQUIRED** before Phase implementing F-33-03 — movement allowlist, mandatory references, RBAC split for ADJUSTMENT.

---

## 9. N-44-01 Special Review

See §6 (P1). **OPEN.**

**Dispatch capacity (Phase 30 — CLOSED):** `lockForDispatchClaim` + `sumClaimedSourceQuantitiesByRentalOrderId` before create/update dispatch.

**Return capacity (OPEN):** Same dispatch, opposite direction — no lock, in-memory prior-return sum, plain insert/update.

**Concurrent scenarios audited:**

| Scenario | Safe @ HEAD? |
|----------|--------------|
| Two concurrent create-return on same dispatch | **NO** |
| Concurrent create + update (different DRAFT returns) | **NO** |
| Concurrent receive/inspect (Phase 41) | **YES** (status claims) |
| Return complete exceeding external dispatched (external path) | Partial SQL backstop only |

**Recommended fix direction (informational — not implemented):** Mirror Phase 30 — `lockForDispatchClaim(rentalOrderId)` before capacity validation; optional SQL `SUM` of non-cancelled return items per dispatch line under lock.

---

## 10. Financial Integrity

### Sound @ HEAD

| Invariant | Mechanism | Phase |
|-----------|-----------|-------|
| Rental posted settlement ≤ invoice total | `applyPaymentDelta` SQL predicate | 35 |
| Rental pending commitments ≤ balance | `lockForPaymentCommitment` + pending sum | 39 |
| Supplier posted settlement ≤ PO total | `applyPaymentDelta` SQL predicate | 44 |
| Supplier duplicate post | `claimStatusTransition(PENDING→POSTED)` | 44 |
| Invoice issue/void claims | `claimStatusTransition` | 38 |
| Active invoice guard | `lockForInvoiceCommand` + active lookup | 37 |
| Invoice money under concurrent post | Atomic delta on `paidAmount`/`balance` | 35 |

### Open

| ID | Issue |
|----|-------|
| F-37-R1 | Derived invoice `status` can be overwritten after void claim wins (money still correct) |
| N-44-05 | VOID + non-zero `paidAmount` + live posted payments — policy gap |
| N-44-06 | Supplier pending create over-commitment asymmetry vs Phase 39 rental |
| F-33-01 | Invoice number scan cap |
| F-35-08 | **DEFERRED** — NoOp hook @ HEAD |

**WIP excluded:** Unstaged accounting/journal integration, payment-invoice journal hooks, issue-journal WIP — **not production @ HEAD**.

---

## 11. Inventory Integrity

| Path | Ledger integrity | Workflow coupling |
|------|------------------|-------------------|
| Workflow commands (dispatch complete, return complete, reserve RO, maintenance/repair) | Atomic SQL + claims | **Enforced** |
| `PATCH /api/inventory/:id` | Metadata only (Phase 43) | N/A |
| `POST /api/stock-movements` | Atomic SQL + audit row | **NOT enforced (F-33-03)** |
| `POST /api/inventory` (bootstrap create) | Initial counters at create | Intentional bootstrap |

**Negative stock prevention:** Atomic SQL on all movement types — **sound for warehouse-level counters**.

**Reservation invariants:** `reserved ≤ onHand` enforced atomically — **sound**.

**Ledger reconstructability:** Improved post-Phase 43 (PATCH bypass removed); F-33-03 direct API can still create movements decoupled from workflow entities.

---

## 12. Authorization Review

**Server-side enforcement:** All audited mutation routes use `assertPermission` in route runners — UI restrictions are not the sole protection.

**Role capabilities relevant to integrity (committed @ HEAD):**

| Role | Notable mutation permissions |
|------|------------------------------|
| **OWNER** | All permissions |
| **MANAGER** | All except `settings.update` |
| **WORKER** | `inventory.update`, `inventory.adjust` (UI-only for adjust), **`stockMovements.create`**, full dispatch/return/repair/maintenance workflow mutate, rental invoice create/issue/void, payment create/post/void, supplier payment create/post/void |
| **ACCOUNTANT** | Read-all + financial mutate (invoices, payments, supplier payments, journals, expenses) — **no** `stockMovements.create` |
| **VIEWER** | Read-only |

**F-11 assessment:** Coarse RBAC — WORKER can mutate inventory counters via direct stock-movement API (F-33-03) despite UI `inventory.adjust` being presentation-layer only. Intentional operational flexibility vs accidental bypass — **defense-in-depth P3**, amplifies F-33-03 severity context but not standalone P1.

---

## 13. Schema / Database Review

| Item | Severity | Notes |
|------|----------|-------|
| `invoiceNumber @unique` | Mitigates F-33-01 | Duplicate commit rejected |
| `Repair.returnInspectionItemId` no FK (F-09) | P3 | Index only; orphan possible |
| `RentalOrderStatus.DISPATCHED` (F-07) | P3 | Ghost enum |
| Payment/invoice/PO atomic deltas | Sound | No schema change needed for N-44-01 fix |
| Return capacity | **Application-layer gap** | No missing CHECK at DB for return qty ≤ dispatched |

**No new schema integrity gaps introduced by Phase 44.**

Transaction boundaries: Supplier payment post/void, rental payment post/void, stock movements — all within UoW runners @ HEAD.

---

## 14. Test Coverage

| Test scope | Executed | Result |
|------------|----------|--------|
| Phase 28–44 regression suite (22 files, 161 tests) | **YES** | **161/161 PASS** |
| Full Vitest suite (3150 tests) | **NO** (not re-run this audit; last verified at Phase 44 commit) |
| `npx prisma validate` | **YES** | Valid |
| New concurrent return capacity tests | **NO** (finding confirms gap) |

---

## 15. Decision Locks

### Phase 45 (N-44-01 — Return Capacity Concurrency)

| Question | Required? |
|----------|-----------|
| Business policy on return over-capacity | **NO** — domain already rejects `qty > remaining` sequentially; defect is concurrency serialization |
| Lock scope (rental order vs dispatch row) | **Technical** — mirror Phase 30 `lockForDispatchClaim` unless audit during implementation prefers dispatch-row lock |
| Whether to add SQL aggregate vs in-memory sum under lock | **Technical** — follow Phase 30 precedent |

**Decision lock: NOT REQUIRED** for Phase 45.

### F-33-03 (future inventory policy phase)

**Decision lock: REQUIRED** — movement type allowlist, mandatory workflow references, ADJUSTMENT RBAC/approval policy.

### N-44-05 (void with payments)

**Decision lock: REQUIRED if addressed** — block void when posted payments exist vs cascade void vs require reversal first (OD-38-01).

---

## 16. Recommended Next Phase

| Item | Value |
|------|-------|
| **Phase** | **45** |
| **Finding ID** | **N-44-01** |
| **Objective** | Harden return create/update capacity validation against concurrent dispatch over-return |
| **Expected strategy** | Mirror Phase 30: acquire `lockForDispatchClaim(rentalOrderId)` (or equivalent) before prior-return load; validate capacity under lock; preserve existing domain rules for owned/external split; optional SQL aggregate of non-cancelled return quantities |
| **Expected schema impact** | **NONE** |
| **Expected tests** | `return.capacity-concurrency.45.application.test.ts` — T45.1 concurrent creates additive; T45.2 concurrent create+update; T45.3 one rejected when exceeding dispatch; T45.4 sequential regression; T45.5 rollback |

**Runner-up:** Phase 46 — Stock Movement API Policy (**F-33-03**) after owner decision lock approval.

---

## 17. Git Safety

| Rule | Status |
|------|--------|
| Production implementation | **NONE** |
| Commit | **NONE** |
| Push | **NO** |
| Reset / clean / stash | **NONE** |
| Unrelated WIP | **PRESERVED** (~144 files unstaged) |

This audit created/updated documentation only: `docs/audits/PHASE_44_ENTERPRISE_GAP_AUDIT.md`.

---

## Remaining Findings Summary

| ID | Severity | Status |
|----|----------|--------|
| N-44-01 | P1 | OPEN |
| F-33-03 | P2 | OPEN |
| F-37-R1 | P2 | OPEN |
| N-44-05 | P2 | OPEN |
| N-44-06 | P2 | OPEN (new) |
| F-33-01 | P2 | OPEN |
| F-35-08 | P2 deferred | DEFERRED |
| F-37-R2 | P3 | OPEN |
| F-11 | P3 | OPEN |
| F-09 | P3 | OPEN |
| F-07 | P3 | OPEN |
| N-39-UI-01 | P3 | OPEN |

**Closed this audit cycle:** N-44-04 (Phase 44)

---

*End of Phase 44 Enterprise Gap Audit*
