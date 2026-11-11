# Post-Phase-43 Enterprise Gap Audit

**Date:** 2026-08-31  
**Baseline HEAD:** `5f6f550e8df8874162c9b30539721304690bc08b` — `fix(inventory): enforce ledger-backed stock corrections`  
**Branch:** `main` (ahead of `origin/main` by **10** commits)  
**Mode:** Audit only — no production implementation  
**Push:** NO

---

## Executive Verdict

**AUDIT COMPLETE**

Fresh analysis at `5f6f550` discovers **one new P1 committed-production defect** not present in the Phase 42 ranking: **N-44-04** — supplier payment settlement uses the pre-Phase-35 read-modify-write pattern (absolute `paidAmount` write, no payment claim, no atomic SQL delta). This **outranks** remaining P2 inventory/policy findings because it can corrupt procurement financial counters under concurrent post operations — the same defect class Phase 35 closed for rental payments.

Phase 43 successfully closed **F-31-08**. The highest-priority **inventory** bypass is now **F-33-03** (direct stock-movement API). That finding requires a **policy decision lock** before implementation; it is **not** automatically selected as Phase 44 because financial P1 takes precedence.

| Item | Value |
|------|-------|
| **P0** | **NONE** |
| **P1** | **N-44-04** (supplier payment settlement concurrency) |
| **Top P2 (inventory)** | **F-33-03** (direct stock-movement API workflow bypass) |
| **Recommended next phase** | **Phase 44 — Supplier Payment Settlement Concurrency** |
| **Decision lock (Phase 44)** | **NOT REQUIRED** (mirror Phase 35 technical pattern) |

---

## Baseline

| Item | Value |
|------|-------|
| **HEAD** | `5f6f550` — Phase 43 committed |
| **Parent** | `a422e01` — Phase 42 dispatch mark-ready |
| **Full suite @ Phase 43** | 3143/3143 PASS |
| **Schema / migrations** | NONE in Phase 43 |
| **Audit scope** | `git show 5f6f550:` committed tree only |
| **Destructive Git ops** | NONE performed |

---

## WIP Exclusion

Substantial unrelated WIP remains in the working tree and was **explicitly excluded** from all findings:

| WIP category | Examples | Status |
|--------------|----------|--------|
| Accounting / journal | `operational-journal-posting.service.ts`, accounting UI, expense WIP | **WIP — NOT PRODUCTION** |
| Payment UI / journal sections | `payment-journal-section.tsx`, payment WIP | **WIP — NOT PRODUCTION** |
| Reports / list filters | financial-report WIP, operational report params | **WIP — NOT PRODUCTION** |
| Supplier / warehouse UI | summary sections, constants | **WIP — NOT PRODUCTION** |
| Seeds | `prisma/seed.ts`, `seed-data.ts` | **WIP — NOT PRODUCTION** |
| Untracked audit docs | Phases 30–42 gap audits (untracked) | Excluded from baseline; committed Phase 43 report @ HEAD |

**Rule applied:** Only behaviors reachable from `5f6f550` are classified as production defects.

---

## Phase 28–43 Verification Matrix

Verified against committed code @ `5f6f550`. Phase 43 changed inventory PATCH only; phases 28–42 workflow modules are **unchanged** vs `a422e01`.

| Phase | Finding | Status | Evidence @ `5f6f550` |
| ----- | ------- | ------ | -------------------- |
| 28 | Mixed return attribution | **CLOSED** | `return.source.rules.ts`; `return.source-condition.28.application.test.ts` |
| 29 | Command concurrency / idempotency | **CLOSED** | Claim-before-side-effects: `complete-dispatch.service.ts`, `complete-return.service.ts`, `confirm-rental-order.service.ts`; Phase 29 concurrency tests |
| 30 | Dispatch claimed quantity | **CLOSED** | `create-dispatch.service.ts` `lockForDispatchClaim` + `sumClaimedSourceQuantitiesByRentalOrderId`; `dispatch.claimed-quantity.30.application.test.ts` |
| 31 | Date-aware availability | **CLOSED** | `reserve-rental-order.service.ts` `lockForAvailabilityCommit` + F-02 re-read; `rental-order.availability-serialization.31.application.test.ts` |
| 32 | Reserve command integrity | **CLOSED** | `reserve-rental-order.service.ts` RO lock + predicated `updateReserve`; `rental-order.reserve-command-integrity.32.application.test.ts` |
| 33 | Maintenance/repair claims | **CLOSED** | Claim-before-stock in start/complete maintenance/repair; `maintenance.concurrency.33`, `repair.concurrency.33` tests |
| 34 | Dispatch rollup (invoice) | **CLOSED** | Unbounded completed dispatch load in `load-rental-order-returns.ts`; `rental-invoice.dispatch-rollup.34.application.test.ts` |
| 35 | Payment settlement (rental) | **CLOSED** | `applyPaymentDelta` atomic SQL + `claimStatusTransition(PENDING→POSTED)`; `payment-invoice-settlement-concurrency.35.application.test.ts` |
| 36 | Maintenance cancellation reversal | **CLOSED** | `cancel-maintenance.service.ts` post-claim `startedAt` gate; `maintenance.cancel-reversal-integrity.36.application.test.ts` |
| 37 | Active invoice guard | **CLOSED** | `create-rental-invoice-in-scope.ts` RO lock + `findActiveByRentalOrderId`; `rental-invoice.active-guard.37.application.test.ts` |
| 38 | Invoice issue/void claims | **CLOSED** | `claimStatusTransition` on issue/void; `rental-invoice.issue-void-concurrency.38.application.test.ts` |
| 39 | Pending payment commitment | **CLOSED** | `lockForPaymentCommitment` + pending sum validation; `payment.pending-over-commitment.39.application.test.ts` |
| 40 | Cancel concurrency | **CLOSED** | Multi-status claims on dispatch/return cancel; `dispatch.cancel-concurrency.40.application.test.ts` |
| 41 | Return receive/inspect | **CLOSED** | `receive-return.service.ts`, `inspect-return.service.ts` status claims; `return.receive-inspect-concurrency.41.application.test.ts` |
| 42 | Dispatch mark-ready | **CLOSED** | `update-dispatch.service.ts` `claimStatusTransition(DRAFT→READY)`; `dispatch.mark-ready-concurrency.42.application.test.ts` |
| 43 | Inventory PATCH ledger integrity | **CLOSED** | `UpdateInventorySchema` metadata-only + `.strict()`; `inventory.patch-ledger-integrity.43.application.test.ts`; UI edit form metadata-only |

**Regression verdict:** **None** across phases 28–42 at `5f6f550`.

---

## Phase 43 Revalidation

### Generic PATCH → metadata only

**PASS.** @ `5f6f550`:

- `UpdateInventorySchema` accepts only `minimumStock`, `maximumStock`, `isActive` with `.strict()` rejection of counter keys (`inventory.schemas.ts` L30–48).
- `toUpdateInventoryData` maps metadata only (`inventory.mapper.ts`).
- API route parses schema before service (`inventory-api.routes.ts` L129).
- Tests T43.2–T43.4 reject counter PATCH (400 `VALIDATION_FAILED`).

### quantityOnHand corrections → ADJUSTMENT ledger path

**PASS.** PATCH no longer mutates on-hand. Existing path unchanged:

```text
POST /api/stock-movements (ADJUSTMENT)
  → executeAdjustmentStockMovementInScope
  → applyAdjustment (atomic delta)
  → InventoryTransaction row + audit
```

UI Adjust dialog and `adjustInventoryStock()` unchanged. Edit form @ HEAD shows **Thresholds & status** only (no counter fields).

### reservedQuantity → not PATCHable

**PASS.** Schema strict rejection; service cannot receive counter fields through normal parse path.

### New bypass introduced by Phase 43?

**NONE identified.** Observations:

| Surface | Post-Phase-43 behavior | Finding? |
|---------|---------------------|----------|
| Generic PATCH | Metadata only | F-31-08 closed |
| `POST /api/inventory` create | Still sets initial absolute counters (bootstrap) | **Known bootstrap semantics** — out of Phase 43 scope; not a regression |
| Repository `update()` | Still accepts absolute counters internally | **Not reachable** via PATCH; preserved for internal/repository tests |
| `POST /api/stock-movements` | All types; optional refs | **F-33-03** — pre-existing; now the **only** general counter-mutation API |

Phase 43 **increased operational reliance** on ADJUSTMENT via stock-movement API without tightening F-33-03 — sharpening F-33-03 priority within inventory, not creating a new defect class.

---

## P0 Findings

**NONE.**

No unauthenticated financial/inventory corruption, no unconstrained negative inventory without guards, no workflow command that unconditionally mutates authoritative state without any predicate in committed production @ HEAD.

---

## P1 Findings

### N-44-04 — Supplier payment settlement read-modify-write (NEW)

| Field | Detail |
|-------|--------|
| **Severity** | **P1** |
| **Area** | Supplier Payment / Procurement |
| **Evidence** | `supplier-payment-purchase-order.validation.ts` L38–52: `purchaseOrder.withPaymentApplied(purchaseOrder.paidAmount + delta)` then `updatePaidAmount(id, updated.paidAmount)` — **absolute write from stale read** |
| **Post service** | `post-supplier-payment.service.ts` L107 — `updateStatus` without `claimStatusTransition`; no payment PENDING→POSTED claim |
| **Repository** | `prisma-purchase-order.repository.ts` L216–229 — unconditional `db.purchaseOrder.update({ paidAmount })` |
| **Contrast** | Rental `PostPaymentService` @ HEAD: `claimStatusTransition` + `applyPaymentDelta` atomic SQL (`payment-invoice.validation.ts`, Phase 35) |

**Race scenario:**

1. PO balance = 1000; two PENDING supplier payments A=600, B=600 validated sequentially against stale balance.
2. Concurrent post: both read `paidAmount=0`, both compute `paidAmount=600`, last writer wins → PO shows 600 paid while 1200 posted — **or** both succeed validation and second overwrites first.

**Impact:** Procurement `paidAmount` corruption; AP balance wrong; potential over-settlement vs PO grand total (no SQL guard equivalent to rental `paidAmount + delta <= grandTotal`).

**Existing protection:** Domain validation on single payment amount vs balance at read time; transaction UoW; `@unique` on payment numbers.

**Missing protection:** Payment status claim; atomic SQL delta on PO; pending-commitment lock (rental Phase 39 pattern); concurrent post tests.

**Recommended strategy:** Mirror Phase 35/39 — `claimStatusTransition(PENDING→POSTED)`, `applyPaymentDelta` with SQL predicates, optional pending-sum lock on PO; reuse rental payment test harness patterns. **No policy ambiguity.**

---

## P2 Findings

### F-33-03 — Direct stock-movement API workflow bypass (REVALIDATED — TOP P2)

| Field | Detail |
|-------|--------|
| **Severity** | **P2** |
| **Area** | Stock Movement / Authorization |
| **Route** | `POST /api/stock-movements` → `CreateStockMovementService` |
| **Permission** | `stockMovements.create` — **WORKER, MANAGER, OWNER** (`role-permissions.ts`) |
| **Schema** | All 5 types; `referenceType`/`referenceId` optional, unvalidated (`stock-movement.schemas.ts`) |
| **Core** | `executeCreateStockMovementInScope` — atomic inventory SQL, **zero workflow guards** |

**Bypass scenarios:**

- RESERVE without RO line update / F-02 date-aware availability
- RELEASE without cancel/dispatch/return workflow
- OUT without dispatch complete
- IN without PO receive / return / repair
- ADJUSTMENT without approval (post-Phase-43 correction path)
- Fabricated reference strings (audit theater)

**Impact:** Warehouse counters vs RO line reserves desync; workflow state vs physical stock mismatch; ledger rows exist but lack workflow coupling.

**Existing protection:** Atomic SQL (non-negative on-hand, reserve capacity); movement + audit recorded; inactive rules per type.

**Missing protection:** Movement-type allowlist; mandatory validated references; workflow status claims; RESERVE F-02 path; deduplication.

**Recommended strategy:** Policy decision lock required — see § Decision Lock Requirement.

**Post-Phase-43 note:** With F-31-08 closed, F-33-03 is the **primary committed inventory integrity bypass**.

---

### N-44-01 — Return create/update capacity race (NEW)

| Field | Detail |
|-------|--------|
| **Severity** | **P2** |
| **Area** | Return / Dispatch |
| **Evidence** | `create-return.service.ts` L113–124: `loadPriorReturnsForDispatch` + `validateReturnItemsForDispatch` with **no dispatch lock** (contrast `create-dispatch.service.ts` L113 `lockForDispatchClaim`) |
| **Same pattern** | `update-return.service.ts` capacity validation |

**Race:** Two concurrent create/update-return on same dispatch each read stale prior totals → combined return quantity can **exceed dispatched quantity**.

**Impact:** Return records accept more quantity than was dispatched; downstream inspect/complete stock effects based on invalid return lines.

**Recommended strategy:** Serialize on dispatch (or RO) row lock before capacity validation — mirror Phase 30 dispatch claim lock pattern.

---

### F-37-R1 — Derived rental invoice status TOCTOU (REVALIDATED)

| Field | Detail |
|-------|--------|
| **Severity** | **P2** |
| **Area** | Rental Invoice / Payment |
| **Evidence** | `payment-invoice.validation.ts` L68–73: atomic `applyPaymentDelta` then unconditional `updateStatus` for derived lifecycle status |
| **Money** | **Authoritative and safe** — SQL guards on delta |

**Race:** Concurrent void-posted-payment ∥ post-payment → correct `paidAmount`/`balance`, stale `status` (last writer on `updateStatus`).

**Recommended strategy:** Fuse status into delta SQL or conditional status claim; derive status read-only at query time.

---

### F-33-01 — Invoice number scan cap (REVALIDATED)

| Field | Detail |
|-------|--------|
| **Severity** | **P2** |
| **Area** | Rental Invoice |
| **Evidence** | `generate-invoice-number.ts` — `pageSize: 500` max-sequence scan |
| **Mitigation** | `@unique` on `invoiceNumber` prevents silent duplicate |

**Impact:** >500 invoices/year → wrong sequence proposal, retry/conflict storms.

---

### N-44-05 — Void PARTIALLY_PAID invoice without payment reversal (REVALIDATED)

| Field | Detail |
|-------|--------|
| **Severity** | **P2** (policy + AR integrity) |
| **Area** | Rental Invoice |
| **Evidence** | `void-rental-invoice.service.ts` — `claimStatusTransition` to VOID only; domain allows `PARTIALLY_PAID→VOID`; no payment reversal or `paidAmount` reset |
| **Related** | Phase 38 OD-38-01 open decision |

**Impact:** Invoice VOID with `paidAmount > 0`; posted payments remain; new payments blocked.

**Recommended strategy:** **Policy decision** — block void when posted payments exist, or cascade void/reverse payments.

---

### F-35-08 — Expense pay journal hook (DEFERRED)

| Field | Detail |
|-------|--------|
| **Severity** | **P2 (latent / deferred)** |
| **Area** | Expense / Accounting |
| **Evidence** | `create-expense-transaction.runner.ts` @ HEAD wires `NoOpExpenseAccountingHook` |
| **Status** | **Not an active production defect** — journal posting absent by design @ HEAD |

Accounting WIP in working tree is **NOT PRODUCTION** and must not be evaluated as a HEAD defect.

---

## P3 Findings

### F-37-R2 — Invoice number pre-lock allocation

Generate path calls `generateNextInvoiceNumber` before `lockForInvoiceCommand` → sequence gaps on conflict. No duplicate active invoice.

### F-11 — RBAC granularity

WORKER holds `inventory.update`, `stockMovements.create`, `inventory.adjust` (UI-only for adjust). Defense-in-depth; F-33-03 enables bypass at API layer.

### F-09 — Repair FK gap

`Repair.returnInspectionItemId` — index without `@relation` FK.

### F-07 — Ghost `DISPATCHED` enum

Ephemeral dispatch/RO status artifact; maintainability.

### N-39-UI-01 — UI active-invoice hint

`rental-order-billing-section.tsx` uses `pageSize: 10`; API authoritative.

### N-44-02 — DRAFT document edit last-writer-wins

`update-return.service.ts`, `update-dispatch.service.ts` (non-markReady), `update-rental-order.service.ts` — DRAFT-only unconditional update; no stock side effects.

### N-44-03 — Dispatch complete ephemeral status tail

`complete-dispatch.service.ts` post-claim `updateStatus` for `DISPATCHED→COMPLETED`; deferred pattern from Phase 42 audit; no peer race identified.

---

## New Findings

| ID | Severity | Area | Summary |
|----|----------|------|---------|
| **N-44-01** | P2 | Return | Concurrent create/update return can exceed dispatch capacity — missing dispatch lock |
| **N-44-02** | P3 | Workflow | DRAFT metadata edit LWW |
| **N-44-03** | P3 | Dispatch | Ephemeral status tail write |
| **N-44-04** | **P1** | Supplier Payment | Pre-Phase-35 settlement pattern on PO paidAmount |
| **N-44-05** | P2 | Rental Invoice | Void PARTIALLY_PAID without payment reversal (OD-38-01) |

---

## Historical Findings Revalidated

| ID | Prior rank | Post-Phase-43 status | Notes |
|----|------------|----------------------|-------|
| **F-31-08** | Top P2 | **CLOSED** (Phase 43) | Verified metadata-only PATCH |
| **F-33-03** | #2 P2 | **OPEN** — now top **inventory** P2 | Sharpened post-Phase-43 |
| **F-33-01** | P2 | **OPEN** | Unchanged |
| **F-37-R1** | P2 | **OPEN** | Money safe; status TOCTOU |
| **F-35-08** | P2 deferred | **DEFERRED** | NoOp @ HEAD |
| **F-37-R2** | P3 | **OPEN** | Unchanged |
| **F-11** | P3 | **OPEN** | Unchanged |
| **F-09** | P3 | **OPEN** | Unchanged |
| **F-07** | P3 | **OPEN** | Unchanged |
| **N-39-UI-01** | P3 | **OPEN** | Unchanged |

---

## Inventory Integrity

| Invariant | Status @ `5f6f550` |
|-----------|-------------------|
| Generic PATCH cannot mutate counters | **ENFORCED** (Phase 43) |
| ADJUSTMENT ledger-backed on-hand correction | **ENFORCED** (existing path) |
| Workflow RESERVE/RELEASE/OUT/IN atomic SQL | **ENFORCED** on workflow commands |
| Direct stock-movement API workflow coupling | **NOT ENFORCED (F-33-03)** |
| Ledger reconstructability from movements alone | **Improved** — PATCH bypass removed; create bootstrap + F-33-03 remain |
| `reservedQuantity <= quantityOnHand` | Application + SQL on movement paths; no DB CHECK |
| Phase 29 atomic OUT/IN/ADJUSTMENT | **INTACT** |

---

## Financial Integrity

| Path | Status |
|------|--------|
| Rental payment post/void settlement | **HARDENED** (Phase 35) — atomic delta + claim |
| Pending payment over-commitment | **HARDENED** (Phase 39) |
| Invoice issue/void claims | **HARDENED** (Phase 38) |
| Active invoice guard | **HARDENED** (Phase 37) |
| Derived invoice status | **WEAK (F-37-R1)** — amounts authoritative |
| Supplier payment settlement | **UNHARDENED (N-44-04)** — pre-Phase-35 pattern |
| Expense journal posting | **NoOp @ HEAD (F-35-08 deferred)** |
| Accounting module WIP | **NOT PRODUCTION** |

---

## Workflow Integrity

Phases 28–42 workflow hardening **intact**. Asymmetric gaps:

| Workflow | Hardened command | Unguarded parallel |
|----------|-----------------|-------------------|
| Rental payment post | Phase 35 claim + delta | — |
| Supplier payment post | — | N-44-04 absolute write |
| Dispatch quantity claim | Phase 30 lock | — |
| Return quantity cap | — | N-44-01 no lock |
| Stock effects | Workflow claims | F-33-03 direct API |

---

## Authorization / API Bypass

| Surface | Permission | Workflow guard | Finding |
|---------|------------|----------------|---------|
| `PATCH /api/inventory/:id` | `inventory.update` | Metadata only @ HEAD | **Closed (Phase 43)** |
| `POST /api/stock-movements` | `stockMovements.create` (WORKER+) | None | **F-33-03 OPEN** |
| `POST /api/inventory` | `inventory.create` | Bootstrap absolute counters | Known create semantics |
| Rental workflow commands | Domain permissions | Claims + locks | Hardened |

**F-33-03 classification:** Material **technical integrity + policy** defect — not P0/P1 because atomic SQL prevents raw negative inventory and movements are recorded; primary harm is **cross-entity workflow desync** requiring owner policy for allowlist/references/RBAC.

---

## Schema / Database Integrity

| Item | Status |
|------|--------|
| Prisma schema @ HEAD | Valid (`prisma validate` PASS @ Phase 43) |
| `invoiceNumber @unique` | Mitigates F-33-01 silent dup |
| Inventory CHECK constraints | **None** for `reserved <= onHand` — app-layer only |
| `Repair.returnInspectionItemId` | Index only — **F-09** |
| Migrations | No Phase 43 changes |
| New schema gaps | **None beyond F-09** |

---

## Test Coverage Review

### Strong coverage (committed @ HEAD)

| Area | Test file(s) |
|------|-------------|
| Phase 35 rental payment settlement | `payment-invoice-settlement-concurrency.35.application.test.ts` |
| Phase 39 pending commitment | `payment.pending-over-commitment.39.application.test.ts` |
| Phase 37 active invoice | `rental-invoice.active-guard.37.application.test.ts` |
| Phase 38 issue/void | `rental-invoice.issue-void-concurrency.38.application.test.ts` |
| Phase 40–42 dispatch/return | `dispatch.cancel-concurrency.40`, `return.receive-inspect-concurrency.41`, `dispatch.mark-ready-concurrency.42` |
| Phase 43 PATCH ledger | `inventory.patch-ledger-integrity.43.application.test.ts` |
| Phase 29 inventory atomic | `inventory.concurrency.29.test.ts` |
| Stock movement atomic | `stock-movement.application.test.ts` |

### Gaps identified

| Gap | Finding | Issue |
|-----|---------|-------|
| **Supplier payment concurrency** | N-44-04 | **No** `Promise.all` / overlap tests; no claim/delta tests |
| **Return capacity concurrency** | N-44-01 | **No** concurrent create/update return tests |
| **F-33-03 workflow desync** | F-33-03 | Tests prove reference-free RESERVE works — **negative test only**; no RO desync integration test |
| **F-37-R1 status assertion** | F-37-R1 | Phase 38 void∥post tests check claim winner, **not** derived status consistency after concurrent settlement |
| **Supplier pending commitment** | N-44-04 | No Phase-39-style pending sum on PO |

No false concurrency tests identified in Phase 35–43 suites — overlap patterns use `Promise.all` / `Promise.allSettled` appropriately.

---

## Priority Ranking

| Rank | Finding | Severity | Area | Likelihood | Impact | Why now |
| ---- | ------- | -------- | ---- | ---------- | ------ | ------- |
| 1 | **N-44-04** | **P1** | Supplier Payment | Medium (concurrent posts) | **PO paidAmount corruption** | Fresh discovery; asymmetric vs Phase 35 rental hardening; same defect class previously P1 |
| 2 | **F-33-03** | P2 | Stock Movement | Medium (misuse/bypass) | Workflow/inventory desync | Top inventory gap after F-31-08 closed; ADJUSTMENT now flows here |
| 3 | **N-44-01** | P2 | Return | Low–Medium | Return qty > dispatched | Missing lock pattern Phase 30 already applied elsewhere |
| 4 | **F-37-R1** | P2 | Rental Invoice | Medium (void∥post) | Status/lifecycle stale | Money safe; reporting/workflow confusion |
| 5 | **F-33-01** | P2 | Rental Invoice | Low until scale | Numbering retry | `@unique` mitigates corruption |
| 6 | **N-44-05** | P2 | Rental Invoice | Low | VOID with paidAmount>0 | Policy gap OD-38-01 |
| 7 | **F-35-08** | P2 deferred | Expense | N/A | Latent | NoOp @ HEAD |
| 8 | **F-11** | P3 | Authorization | Enables F-33-03 | Defense-in-depth | — |
| 9 | **F-37-R2** | P3 | Rental Invoice | Low | Sequence gaps | — |
| 10 | **F-09, F-07, N-39-UI-01, N-44-02, N-44-03** | P3 | Various | Low | Maintainability/UX | — |

**Why N-44-04 outranks F-33-03:** Financial counter corruption on concurrent post is **irreversible without manual reconciliation** and matches a defect class already treated as P1 in Phase 35. F-33-03 causes serious workflow desync but retains atomic inventory math and ledger rows — P2 material integrity/policy.

**No P0** — no finding meets catastrophic unauthenticated or unconstrained corruption threshold @ HEAD.

---

## Top Priority Finding

**N-44-04 — Supplier Payment Settlement Read-Modify-Write**

Committed `PostSupplierPaymentService` applies PO payment via stale-read absolute `updatePaidAmount` without payment status claim or atomic SQL delta — the exact pattern Phase 35 eliminated for rental invoices.

---

## Decision Lock Requirement

### Phase 44 (N-44-04): **NOT REQUIRED**

Technical remediation is unambiguous: mirror Phase 35 (`claimStatusTransition`, `applyPaymentDelta` with SQL guards) and optionally Phase 39 pending-commitment lock on PO. No business-policy fork.

### F-33-03 (future phase): **REQUIRED**

Policy questions before implementation:

| ID | Question |
|----|----------|
| OD-44-01 | Should direct `POST /api/stock-movements` remain a public API at all? |
| OD-44-02 | Should RESERVE/RELEASE be workflow-only (blocked on direct API)? |
| OD-44-03 | Must `referenceType` + `referenceId` be required and server-validated per type? |
| OD-44-04 | Should ADJUSTMENT require `inventory.adjust` (or dedicated permission) vs `stockMovements.create`? |
| OD-44-05 | Should WORKER retain `stockMovements.create`? |
| OD-44-06 | If RESERVE remains on direct API, must F-02 date-aware availability apply? |

**Recommended direction (not locked):** Block RESERVE/RELEASE on direct API; require validated references for IN/OUT; route ADJUSTMENT through elevated permission; keep atomic movement engine.

### N-44-05 (void with payments): **REQUIRED** if addressed in same phase as invoice work

Choose: forbid void when posted payments exist vs cascade reversal.

---

## Recommended Next Phase

**Phase 44 — Supplier Payment Settlement Concurrency (N-44-04)**

Scope sketch (implementation deferred):

- `claimStatusTransition(PENDING→POSTED)` on supplier payment
- Atomic `applyPaymentDelta` on purchase order (SQL predicates: `paidAmount + delta <= grandTotal`, `paidAmount + delta >= 0`)
- Optional pending-sum commitment lock on PO (mirror Phase 39)
- Concurrency tests T44.1–T44.n (overlap posts, duplicate post, void∥post)
- No schema change required if rental pattern reused

**Runner-up:** Phase 45 — Stock Movement API Policy (F-33-03) after decision lock approval.

---

## Git Safety

| Item | Value |
|------|-------|
| **Branch** | `main` |
| **HEAD** | `5f6f550` |
| **origin/main** | Ahead by **10** commits; **not pushed** |
| **Staged files** | **NONE** |
| **Tracked WIP** | ~90+ modified paths (accounting, payment, reports, seeds, UI, etc.) |
| **Untracked WIP** | Audit docs, accounting/supplier/warehouse components, `.phase35-*` artifacts |
| **Production implementation** | **NO** |
| **Commit** | **NO** |
| **Push** | **NO** |
| **Destructive git operations** | **NO** |
| **WIP preserved** | **YES** |

---

## Final Recommendation

Prioritize **Phase 44 (N-44-04)** to close the procurement payment settlement asymmetry before returning to inventory policy work on **F-33-03**. Phases 28–43 hardening chain remains intact. Phase 43 successfully closed F-31-08 without workflow regression.

---

```text
AUDIT COMPLETE

NEXT HIGHEST-PRIORITY FINDING: N-44-04 — Supplier Payment Settlement Read-Modify-Write
SEVERITY: P1

RECOMMENDED NEXT PHASE:
Phase 44 — Supplier Payment Settlement Concurrency

DECISION LOCK:
NOT REQUIRED (Phase 44)

PRODUCTION IMPLEMENTATION:
NO

COMMIT:
NO

PUSH:
NO

WIP:
PRESERVED
```

---

*End of Post-Phase-43 Enterprise Gap Audit*
