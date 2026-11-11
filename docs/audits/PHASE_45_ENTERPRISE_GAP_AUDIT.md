# Phase 45 Enterprise Gap Audit

**Audit date:** 2026-08-31  
**Scope:** Committed production baseline only — unstaged/untracked WIP excluded  
**Method:** End-to-end code trace at `HEAD`, phase regression test execution, cross-workflow concurrency review

---

## Executive Verdict

**AUDIT COMPLETE — NEXT PHASE IDENTIFIED**

| Item | Value |
|------|-------|
| **HEAD** | `43036b2` — `fix(return): harden return capacity concurrency` |
| **P0 count** | **0** |
| **P1 count** | **0** |
| **NEXT HIGHEST-PRIORITY FINDING** | **N-44-06** |
| **SEVERITY** | **P2** |

Phase 45 closed **N-44-01**. No P0 or P1 findings remain at committed HEAD. The top open gap is **supplier pending payment over-commitment** — an asymmetry versus Phase 39 rental pending hardening, with a clear mirror fix and no policy lock required.

---

## Baseline

| Item | Value |
|------|-------|
| **HEAD** | `43036b23e22f9d1c24bab62d50ec7cb0760f3b4f` (`43036b2`) |
| **Branch** | `main` |
| **Origin divergence** | **0 behind / 12 ahead** vs `origin/main` |
| **WIP state** | **~145 modified/untracked files** — preserved, not audited as production |
| **Push state** | **NO** |
| **Audit scope** | `git show HEAD:` committed tree only |

---

## Phase 28–45 Verification Matrix

| Phase | Finding | Status | Evidence |
|-------|---------|--------|----------|
| 28 | Mixed return source × condition | **CLOSED** | `return.source-condition.28.application.test.ts`; `resolveReturnSourceSplit()` |
| 29 | Workflow command concurrency (F-01–F-08) | **CLOSED** | `*.concurrency.29*.application.test.ts`; claims before side effects |
| 30 | Dispatch claimed quantity (F-05) | **CLOSED** | `dispatch.claimed-quantity.30.application.test.ts`; `lockForDispatchClaim` + SQL rollup |
| 31 | Date-aware availability (F-31-01) | **CLOSED** | `rental-order.availability-serialization.31.application.test.ts` |
| 32 | Reserve command integrity (F-32-01) | **CLOSED** | `rental-order.reserve-command-integrity.32.application.test.ts` |
| 33 | Maintenance/repair claims (F-30-07) | **CLOSED** | `maintenance/repair.concurrency.33.application.test.ts` |
| 34 | Dispatch rollup (F-31-03) | **CLOSED** | `rental-invoice.dispatch-rollup.34.application.test.ts` |
| 35 | Rental payment settlement (F-35-01) | **CLOSED** | `payment-invoice-settlement-concurrency.35.application.test.ts` |
| 36 | Maintenance cancel reversal (F-36-01) | **CLOSED** | `maintenance.cancel-reversal-integrity.36.application.test.ts` |
| 37 | Active invoice generation (F-36-02) | **CLOSED** | `rental-invoice.active-guard.37.application.test.ts` |
| 38 | Invoice issue/void (F-35-06) | **CLOSED** | `rental-invoice.issue-void-concurrency.38.application.test.ts` |
| 39 | Pending payment over-commitment (F-36-03) | **CLOSED** | `payment.pending-over-commitment.39.application.test.ts` |
| 40 | Cancel ∥ complete (N-40-01) | **CLOSED** | `dispatch.cancel-concurrency.40.application.test.ts` |
| 41 | Return receive/inspect (F-31-05) | **CLOSED** | `return.receive-inspect-concurrency.41.application.test.ts` |
| 42 | Dispatch mark-ready (N-42-01) | **CLOSED** | `dispatch.mark-ready-concurrency.42.application.test.ts` |
| 43 | Inventory PATCH ledger (F-31-08) | **CLOSED** | `inventory.patch-ledger-integrity.43.application.test.ts` |
| 44 | Supplier payment settlement (N-44-04) | **CLOSED** | `supplier-payment-settlement-concurrency.44.application.test.ts` |
| 45 | Return capacity concurrency (N-44-01) | **CLOSED** | `return.capacity-concurrency.45.application.test.ts`; `lockForReturnCapacity` |

**Phase 45 independent verification (N-44-01):**

| Check | Result |
|-------|--------|
| `CreateReturnService` calls `lockForReturnCapacity` before prior-return load | **YES** — `create-return.service.ts:113–118` |
| `UpdateReturnService` calls lock when items change | **YES** — `update-return.service.ts:105–108` |
| Prisma implementation | `SELECT id FROM dispatches WHERE id = … FOR UPDATE` — `prisma-dispatch.repository.ts:368–380` |
| Dispatch-scoped (not RO-global) | **YES** — per `dispatchId` mutex / row lock |
| `excludeReturnId` on update | **YES** — `validateReturnItemsForDispatch(..., existing.id)` |
| Per-line capacity semantics | **Unchanged** — `validateReturnItemsAgainstDispatch` per `rentalOrderItemId` |
| Owned/external split | **Unchanged** — `return.source.rules.ts` |
| Phase 45 concurrency tests | T45.1–T45.7 in dedicated suite |

---

## Findings Matrix

| ID | Severity | Area | Status | Concurrency risk | Business impact | Policy dependency |
|----|----------|------|--------|------------------|-----------------|-------------------|
| **N-44-06** | **P2** | Supplier Payment | **OPEN** | Concurrent create without PO lock/pending sum | Pending payments can over-commit PO balance; post protected by Phase 44 atomic delta | **NO** |
| **F-33-03** | P2 | Inventory | **OPEN** | N/A (bypass, not RMW race) | Workflow/RO desync; RESERVE skips F-02; ADJUSTMENT post-Phase 43 | **YES** |
| **F-37-R1** | P2 | Rental Invoice | **OPEN** | void∥post status TOCTOU | Money safe; persisted `status` can disagree | **NO** (technical) |
| **N-44-05** | P2 | Rental Invoice | **OPEN** | N/A | VOID + non-zero `paidAmount` + live posted payments | **YES** (OD-38-01) |
| **F-33-01** | P2 | Rental Invoice | **OPEN** | Allocation scan cap | Sequence reuse at scale; `@unique` prevents dup commit | **NO** |
| **F-35-08** | P2 deferred | Expense | **DEFERRED** | Latent when hook active | NoOp @ HEAD; journal-before-status ordering | N/A |
| **F-37-R2** | P3 | Rental Invoice | **OPEN** | Pre-lock number gen | Gaps only; `@unique` prevents corruption | **NO** |
| **F-11** | P3 | Authorization | **OPEN** | Enables F-33-03 surface | WORKER `stockMovements.create` + broad mutate perms | Partial |
| **F-09** | P3 | Schema | **OPEN** | N/A | Repair FK gap | **NO** |
| **F-07** | P3 | Schema | **OPEN** | N/A | Ghost `DISPATCHED` enum | **NO** |
| **N-39-UI-01** | P3 | UI | **OPEN** | N/A | Active-invoice hint capped at pageSize 10 | **NO** |
| N-44-01 | — | Return | **CLOSED** | — | Phase 45 | — |
| N-44-04 | — | Supplier Payment | **CLOSED** | — | Phase 44 | — |

---

## P0 Findings

**P0: NONE**

No catastrophic financial/inventory corruption under realistic normal operation or unauthenticated access at HEAD.

---

## P1 Findings

**P1: NONE**

N-44-01 (return capacity) was the last P1; Phase 45 closed it. Remaining findings are P2/P3 or deferred.

---

## Top Priority Analysis

**N-44-06 outranks all alternatives** after fresh re-ranking at `43036b2`.

| Rank | ID | Why lower |
|------|-----|-----------|
| 1 | **N-44-06** | — |
| 2 | F-33-03 | Requires policy lock; primary harm is workflow bypass via direct API (deliberate/mis-routed WORKER use); atomic SQL protects warehouse counters |
| 3 | F-37-R1 | Authoritative money fields safe; defect is derived lifecycle `status` only |
| 4 | N-44-05 | Explicit policy gap (void with payments); not a concurrency defect |
| 5 | F-33-01 | `@unique` prevents corruption; scale/efficiency issue |

**Why N-44-06 ranks first:**

1. **Realistic legitimate usage** — two AP users concurrently creating pending supplier payments on the same PO is normal, not API misuse.
2. **Proven fix exists in-repo** — Phase 39 (`lockForPaymentCommitment` + `sumPendingAmountByRentalInvoiceId`) is the direct template; Phase 44 already protects **post** settlement atomically.
3. **Asymmetric hardening** — rental pending commitments hardened (Phase 39); supplier pending create still uses snapshot `getBalance()` only (`create-supplier-payment.service.ts:81–96`).
4. **No policy lock** — mirror Phase 39 mechanically; no owner policy questions on allowlists or movement types.
5. **Outranks F-33-03** without auto-selecting it — F-33-03 is material but policy-gated and misuse-weighted; N-44-06 is the next **technical parity** gap in the financial concurrency chain.

**Committed over-payment remains blocked:** Phase 44 `applyPaymentDelta` SQL predicate prevents `paidAmount > PO total` on post regardless of pending over-commitment.

---

## Remaining P2/P3

### P2 (open)

- **F-33-03** — Direct stock-movement API; all five types; optional refs; WORKER+ authorized
- **F-37-R1** — `updateStatus` after atomic `applyPaymentDelta` without status predicate
- **N-44-05** — Void PARTIALLY_PAID preserves `paidAmount`; no payment cascade
- **F-33-01** — Invoice number scan `pageSize: 500`

### P2 deferred

- **F-35-08** — `NoOpExpenseAccountingHook` @ HEAD; latent journal-before-status ordering

### P3

- **F-37-R2**, **F-11**, **F-09**, **F-07**, **N-39-UI-01**

---

## New Findings

No new P0/P1 findings discovered beyond the historical catalog.

**Observed P3 note (not elevated):** `ConvertMissingToLossService` updates return items via unconditional `updateStatus` on DRAFT invoices only (`convert-missing-to-loss.service.ts:115–118`) — low-frequency, draft-scoped; not a concurrency priority.

---

## F-33-03 Special Review

**Classification: P2 (unchanged — not auto-selected as next phase)**

| Question | Answer @ HEAD |
|----------|---------------|
| Can WORKER create OUT/IN/RESERVE/RELEASE/ADJUSTMENT via API? | **YES** — `POST /api/stock-movements` + `stockMovements.create` |
| References required? | **NO** — optional in schema |
| Atomic counter protection? | **YES** — Prisma `$queryRaw` predicates on all movement types |
| Workflow bypass? | **YES** — no F-02 lock, no dispatch/return/RO guards in `create-stock-movement-in-scope.ts` |
| Phase 43 interaction? | PATCH counters blocked; ADJUSTMENT routed through this API — **increased reliance** |
| Technical vs policy? | **Both** — technical bypass exists; remediation requires owner decisions on allowlist, mandatory refs, ADJUSTMENT RBAC |

**Decision questions if addressed later:**

1. Which movement types may be created directly by WORKER?
2. Must `referenceType`/`referenceId` bind to live workflow entities?
3. Should ADJUSTMENT require `inventory.adjust` or approval workflow separate from `stockMovements.create`?

---

## Financial Integrity

| Domain | Status @ HEAD |
|--------|---------------|
| Rental invoice money | **Sound** — atomic `applyPaymentDelta` on `paidAmount`/`balance` |
| Rental pending commitment | **Sound** — Phase 39 lock + pending sum |
| Rental post/void settlement | **Sound** — Phase 35 claims + atomic delta |
| Supplier post settlement | **Sound** — Phase 44 claims + atomic delta |
| Supplier pending commitment | **WEAK (N-44-06)** — create uses PO snapshot only |
| Invoice derived status | **WEAK (F-37-R1)** — money authoritative |
| Void with payments | **GAP (N-44-05)** — policy, not RMW |
| Expense journal | **N/A @ HEAD** — NoOp hook |

**Cross-workflow void ∥ post:** Void claim can win while post's unconditional `updateStatus` may overwrite lifecycle status (F-37-R1); money fields remain SQL-guarded.

---

## Inventory Integrity

| Path | Ledger | Workflow coupling |
|------|--------|-------------------|
| Workflow stock effects | Atomic SQL + claims | **Enforced** |
| `PATCH /api/inventory/:id` | Metadata only (Phase 43) | N/A |
| `POST /api/stock-movements` | Atomic SQL + audit row | **NOT enforced (F-33-03)** |
| Counters | `quantityOnHand ≥ 0`, `reserved ≤ onHand` | **Sound at warehouse level** |

---

## Authorization

Server-side `assertPermission` on mutation routes. WORKER holds `stockMovements.create`, `inventory.update`, and broad workflow mutate permissions (`role-permissions.ts:48–119`). F-11 amplifies F-33-03 but is not standalone P1.

---

## Schema / Database

| Item | Severity | Notes |
|------|----------|-------|
| `invoiceNumber @unique` | Mitigates F-33-01 | Dup commit rejected |
| `Repair.returnInspectionItemId` | P3 (F-09) | Index only, no FK |
| `RentalOrderStatus.DISPATCHED` | P3 (F-07) | Ghost enum |
| Return capacity | **Application-only** | Phase 45 lock; no CHECK needed |

**Schema changes for next phase:** NONE expected for N-44-06.

---

## Test Coverage

| Suite | Executed | Result |
|-------|----------|--------|
| Phase 28–45 regression (23 files, 168 tests) | **YES** | **168/168 PASS** |
| Full Vitest suite (3157 tests) | **NO** | Not re-run this audit |
| `npx prisma validate` | **NO** | Not re-run this audit |

Phase 45 suite uses genuine `Promise.allSettled` concurrency (T45.1–T45.6).

**Missing tests for top candidate:** No concurrent supplier-payment **create** over-commitment tests (N-44-06 gap mirrors pre-Phase-39 rental gap).

---

## Decision Lock

**Decision lock required: NO** (for recommended Phase 46 / N-44-06)

Mirror Phase 39 pattern — PO row lock + pending sum + `availableBalance = balance - pendingAmount`. No new business policy required.

**Decision lock required: YES** if next work targets **F-33-03** or **N-44-05**.

---

## Recommended Next Phase

| Item | Value |
|------|-------|
| **Phase** | **46** |
| **Name** | **Supplier Pending Payment Over-Commitment** |
| **Finding** | **N-44-06** |
| **Objective** | Harden supplier payment **create** (and update if present) against concurrent pending over-commitment on the same PO |
| **Strategy** | Mirror Phase 39: `lockForPaymentCommitment` equivalent on PO (or reuse pattern), `sumPendingAmountByPurchaseOrderId`, validate `amount ≤ availableBalance` |
| **Modules** | `supplier-payment`, `procurement` (PO repository) |
| **Tests** | `supplier-payment.pending-over-commitment.46.application.test.ts` — concurrent creates, existing pending + race, rollback |
| **Schema impact** | **NONE** |
| **Migration impact** | **NONE** |
| **Decision lock** | **NO** |

**Runner-up:** Phase 47 — Stock Movement API Policy (**F-33-03**) after owner decision lock.

---

## Git Safety

| Rule | Status |
|------|--------|
| Production implementation | **NO** |
| Commit | **NO** |
| Push | **NO** |
| Staging | **NO** |
| WIP preserved | **YES** (~145 files unstaged) |

This audit created `docs/audits/PHASE_45_ENTERPRISE_GAP_AUDIT.md` only (untracked).

---

*End of Phase 45 Enterprise Gap Audit*
