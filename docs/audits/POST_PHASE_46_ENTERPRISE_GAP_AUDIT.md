# Post-Phase-46 Enterprise Gap Audit

**Audit date:** 2026-09-01  
**Scope:** Committed production baseline at `893a811` only — ~146 WIP files excluded  
**Method:** End-to-end code trace at HEAD, cross-workflow concurrency review, targeted regression spot-check

---

## Executive Verdict

**AUDIT COMPLETE**

| Severity | Count |
|----------|------:|
| **P0** | **0** |
| **P1** | **1** |
| **P2** | **5** |
| **P3** | **5** |
| **DEFERRED** | **1** |

No P0 findings. Phase 46 closed N-44-06. The highest-priority **new** gap is **N-46-01** — repair create/update capacity concurrency (parallel to pre-Phase-45 return capacity). Top **historical** P2 gaps (F-33-03, F-37-R1, N-44-05, F-33-01) remain open and revalidated.

---

## Baseline

| Item | Value |
|------|-------|
| **HEAD** | `893a8117e3e343a1930619368f465a099c70fcec` (`893a811`) |
| **Commit** | `fix(payment): prevent supplier pending payment over-commitment` |
| **Branch** | `main` |
| **WIP** | **146** modified/untracked entries (`git status --short \| Measure-Object -Line`) |
| **Staged changes** | **None** (`git diff --cached --stat` empty) |
| **Unstaged diff** | **97 files** (+1017/−281 lines) — accounting/UI/reports WIP, not production |
| **Push** | **NO** |
| **Audit target** | `git show HEAD:` committed tree |

---

## Phase 46 Verification

### N-44-06 — **CLOSED**

**Root cause (was):** `CreateSupplierPaymentService` validated against a PO balance snapshot without row lock or pending-sum aggregation — concurrent PENDING creates could over-commit payable capacity.

**Current implementation @ HEAD:**

| Step | Evidence |
|------|----------|
| Lock PO row | `CreateSupplierPaymentService.execute` → `purchaseOrderRepository.lockForSupplierPaymentCommitment(purchaseOrderId)` |
| Prisma lock | `PrismaPurchaseOrderRepository.lockForSupplierPaymentCommitment` — `SELECT id FROM purchase_orders WHERE id = … FOR UPDATE` |
| Authoritative reread | `findById` after lock |
| Pending sum | `supplierPaymentRepository.sumPendingAmountByPurchaseOrderId(purchaseOrderId)` — `status = PENDING` only |
| Validation | `validatePurchaseOrderForSupplierPayment(..., { pendingAmount })` — `availableBalance = max(0, getBalance() - pendingAmount)` |
| Create | PENDING payment in same `transactionRunner.run` |
| Test parity | `supplier-payment-commitment-lock.ts` + `runWithSupplierPaymentCommitmentLockScope` |
| Tests | `supplier-payment.pending-over-commitment.46.application.test.ts` — T46.1–T46.5 with `Promise.allSettled` |

**Invariant enforced:** `SUM(PENDING supplier payments for PO) + requested amount ≤ PO.getBalance()`

**Phase 44 unchanged:** POST uses `claimStatusTransition` then `applyPaymentDelta`; VOID reverses delta then claims void.

---

## Phase 28–46 Verification Matrix

| Phase | Finding | Status @ 893a811 |
|-------|---------|------------------|
| 28–45 | Prior closed findings | **CLOSED** — no regression observed in targeted review |
| 46 | N-44-06 supplier pending over-commitment | **CLOSED** — see above |

Prior phase test suites remain present at HEAD. Spot-check regression (this audit):

| Suite | Result |
|-------|--------|
| Supplier payment (all) | **28/28 PASS** |
| Phase 46 pending over-commitment | **6/6 PASS** |
| Phase 44 supplier settlement | **PASS** (in supplier suite) |
| Phase 39 customer pending | **10/10 PASS** |
| Phase 35 customer settlement | **PASS** |
| Phase 45 return capacity | **7/7 PASS** |
| Phase 43 inventory PATCH | **Import/env failure** (`database.config.ts`) — not re-run to completion |
| Full Vitest (3163) | **NOT re-run** this audit (last verified at Phase 46 completion) |

---

## Previous Findings Reassessment

| Finding | Previous Severity | Current Status | Current Severity | Evidence |
|---------|------------------:|----------------|-----------------:|----------|
| **N-44-06** | P2 | **CLOSED** | — | Phase 46 lock + pending sum + T46.1–T46.5 |
| **F-33-03** | P2 | **OPEN** | **P2** | `POST /api/stock-movements`; all 5 types; optional refs; `create-stock-movement-in-scope.ts` has no workflow guards; WORKER+ authorized; Phase 43 routes ADJUSTMENT here |
| **N-44-05** | P2 | **OPEN** | **P2** | Rental invoice `withVoided()` preserves `paidAmount`; `assertCanVoid` allows `PARTIALLY_PAID`; no payment cascade in `VoidRentalInvoiceService` |
| **F-37-R1** | P2 | **OPEN** | **P2** | `applyPaymentToInvoice` → unconditional `updateStatus` after atomic `applyPaymentDelta`; money SQL-guarded; lifecycle `status` can disagree under void∥post |
| **F-33-01** | P2 | **OPEN** | **P2** | `generateNextInvoiceNumber` scans `pageSize: 500`; `@unique` on `invoiceNumber` prevents dup commit |
| **F-37-R2** | P3 | **OPEN** | **P3** | Number generated before invoice row lock in generate flow; gaps only; uniqueness protected |
| **F-11** | P3 | **OPEN** | **P3** | WORKER holds `stockMovements.create`, `inventory.update`, broad workflow mutate perms in `role-permissions.ts` |
| **F-09** | P3 | **OPEN** | **P3** | `Repair.returnInspectionItemId` — `@@index` only, no FK `@relation` in `schema.prisma` |
| **F-07** | P3 | **OPEN** | **P3** | `RentalOrderStatus.DISPATCHED` in schema/domain; ephemeral dispatch-complete semantics; RO persists `ON_RENT` not `DISPATCHED` on first completion |
| **N-39-UI-01** | P3 | **OPEN** | **P3** | `rental-order-billing-section.tsx` — `pageSize: 10`, `activeInvoice = invoices.find(status !== VOID)` on first page only |
| **F-35-08** | DEFERRED | **DEFERRED** | **DEFERRED** | `create-expense-transaction.runner.ts` @ HEAD uses `NoOpExpenseAccountingHook`; real hook exists in WIP only |

**Note on N-44-05 vs supplier payments:** Supplier payments use `PENDING | POSTED | VOID` only — no `PARTIALLY_PAID` status. `assertCanVoid` allows void from PENDING or POSTED; POSTED void reverses PO via `applyPaymentDelta`. N-44-05 is a **rental invoice** void policy gap, not a supplier-payment status gap.

---

## New Findings

| ID | Severity | Domain | Summary |
|----|----------|--------|---------|
| **N-46-01** | **P1** | Repair | Create/update repair capacity — find prior repairs → validate damaged cap → write without return/dispatch lock |
| **N-46-02** | **P2** | External rental | `source-rental-order-externally` computes F-02 shortfall outside txn without inventory/RO locks; create does not re-validate |

---

## Detailed Findings

### N-46-01 — Repair Create/Update Capacity Concurrency

**Severity:** P1  
**Status:** OPEN

**Location:**
- `src/modules/repair/application/services/create-repair.service.ts` — `loadPriorRepairsForReturn` → `validateRepairAgainstReturnItem` → `repairRepository.create`
- `src/modules/repair/application/services/update-repair.service.ts` — same pattern on quantity change
- `src/modules/repair/application/services/repair-return.validation.ts` — `validateRepairQuantityAgainstReturn(quantity, damagedQuantity, priorRepaired)`

**Root cause:** Read→aggregate→validate→write on repair quantity vs `returnItem.damagedQuantity` with no serialization on the parent return (or return-inspection) row.

**Scenario:** Return item `damagedQuantity = 10`. Concurrent repair A=6 and B=6 both read `priorRepaired = 0`, both pass validation, both commit → total repair qty 12 > 10.

**Business impact:** `CompleteRepairService` (Phase 33 claim-before-IN) restocks `repair.quantity` with no re-cap check → **phantom inventory inflation** on concurrent over-repair.

**Existing mitigation:** Phase 33 hardens repair **status** transitions (start/complete/cancel); create/update capacity explicitly not in scope of Phase 33.

**Why insufficient:** Same class of defect as N-44-01 (return capacity) before Phase 45 — legitimate concurrent operators, realistic TOCTOU.

**Recommended remediation:** Mirror Phase 45 — `lockForReturnCapacity`-style lock on parent return row (or dedicated return-inspection lock) before prior-repair aggregate + validate + create/update in same UoW.

**Decision lock:** **Not required** — technical parity fix; no new business rule.

---

### N-46-02 — Source-Externally Shortfall Stale Read

**Severity:** P2  
**Status:** OPEN

**Location:** `src/modules/rental-order/application/services/source-rental-order-externally.service.ts`

**Root cause:** F-02 shortfall computed before external rental create, outside inventory/RO locks; create path does not authoritative-reread availability.

**Scenario:** Concurrent reserve/dispatch reduces on-hand commitment; orchestrator reads stale shortfall and sources external qty exceeding true remaining gap.

**Business impact:** Over-sourcing vs F-02 date-aware capacity; duplicate active ERA blocked by partial unique index — **operational over-commit**, not duplicate-row corruption.

**Existing mitigation:** Partial unique index on active ERA per rental order; F-02 rules on reserve path remain sound.

**Why insufficient:** Legitimate `source-externally` command can over-commit external hire relative to true shortfall under concurrency.

**Recommended remediation:** Mirror reserve pattern — sorted inventory locks + RO lock, authoritative F-02 reread, validate shortfall, then create ERA in same txn.

**Decision lock:** **Not required**

---

### F-33-03 — Direct Stock Movement API Workflow Bypass

**Severity:** P2  
**Status:** OPEN

**Location:**
- `src/app/api/stock-movements/route.ts` — `POST` → `stockMovements.create`
- `src/modules/stock-movement/application/services/create-stock-movement-in-scope.ts`
- `src/shared/application/authorization/role-permissions.ts` — WORKER holds `stockMovements.create`

**Root cause:** Authenticated WORKER/MANAGER/OWNER can POST any of `IN | OUT | RESERVE | RELEASE | ADJUSTMENT` with optional references; no dispatch/return/RO/F-02 guards in create scope.

**Scenario:** WORKER POSTs RESERVE without rental-order lock → row-level SQL passes but F-02 date-aware capacity violated; POSTs ADJUSTMENT bypassing UI `inventory.adjust` gate.

**Business impact:** Workflow/ledger desync from dispatch, return, and rental-order state; Phase 43 **increased reliance** on this API for ADJUSTMENT corrections.

**Existing mitigation:** Atomic SQL predicates on `quantityOnHand`/`reservedQuantity` in `prisma-inventory.repository.ts` — **technical concurrency sound**.

**Why insufficient:** Business workflow invariants not enforced at API boundary; policy question on which movement types may be direct-created.

**Recommended remediation:** Owner decision on allowlist, mandatory validated references, ADJUSTMENT RBAC split; optionally internal-only scope for workflow callers.

**Decision lock:** **Required**

---

### F-37-R1 — Derived Rental Invoice Status TOCTOU

**Severity:** P2  
**Status:** OPEN

**Location:**
- `src/modules/payment/application/services/payment-invoice.validation.ts` — `applyPaymentToInvoice`
- `src/modules/rental-invoice/infrastructure/repositories/prisma-rental-invoice.repository.ts` — `updateStatus` (unconditional)

**Root cause:** After atomic `applyPaymentDelta`, derived lifecycle status written via unconditional `updateStatus` without expected-status predicate.

**Scenario:** Void claims `VOID` while post completes delta then sets `PARTIALLY_PAID`/`PAID` — persisted `status`/`voidedAt` can disagree.

**Business impact:** **Derived lifecycle display/state only** — `applyPaymentDelta` SQL status predicates prevent money mutation on VOID invoices (T38.4). No over-payment path.

**Existing mitigation:** Atomic money fields; Phase 38 void∥post money consistency tests.

**Why insufficient:** Reporting/UI/filters reading persisted `status` can show inconsistent lifecycle labels.

**Recommended remediation:** Status claim on derived update (`updateStatus` with expected predicate) or compute status only in read model.

**Decision lock:** **Not required**

---

### N-44-05 — Void Partially Paid Rental Invoice With Live Payments

**Severity:** P2  
**Status:** OPEN

**Location:**
- `src/modules/rental-invoice/domain/rental-invoice.entity.ts` — `withVoided()` sets `status: VOID`, preserves `paidAmount`
- `src/modules/rental-invoice/domain/rental-invoice.rules.ts` — `assertCanVoid` allows `PARTIALLY_PAID`
- `src/modules/rental-invoice/application/services/void-rental-invoice.service.ts` — no payment lookup/reversal

**Root cause:** Explicit policy gap — void does not zero `paidAmount` or cascade to posted customer payments.

**Scenario:** Invoice `PARTIALLY_PAID` with live POSTED payments is voided → invoice shows VOID with non-zero `paidAmount`; payments still reference voided invoice.

**Business impact:** Business/reporting inconsistency; money on invoice fields stale relative to payment records — not a concurrent lost-update defect.

**Existing mitigation:** `assertCanVoid` blocks fully `PAID`; payment settlement paths remain sound.

**Why insufficient:** Owner policy on whether void should require zero payments or auto-reverse.

**Recommended remediation:** Decision lock → enforce "no void with posted payments" OR cascade reverse OR zero derived fields with documented semantics.

**Decision lock:** **Required**

---

### F-33-01 — Invoice Number Allocation Scan Cap

**Severity:** P2  
**Status:** OPEN

**Location:** `src/modules/rental-invoice/application/services/generate-invoice-number.ts` — `findPaged({ pageSize: 500, sortBy: "invoiceNumber", sortOrder: "desc" })`

**Root cause:** Sequence derived from max of first 500 descending invoice numbers for year prefix.

**Scenario:** >500 invoices per year → scan misses higher sequences → number reuse attempt → `@unique` rejects commit (safe but operation fails).

**Business impact:** **Allocation efficiency / scale** at high volume; not duplicate-number corruption (`invoiceNumber @unique`).

**Existing mitigation:** Database uniqueness constraint.

**Why insufficient:** Generation can fail or reuse-block under scale; not a silent dup.

**Recommended remediation:** Dedicated number-sequence table or monotonic SQL sequence (no scan cap).

**Decision lock:** **Not required**

---

### F-37-R2 — Invoice Number Pre-Lock Generation

**Severity:** P3  
**Status:** OPEN

**Location:** `generate-rental-invoice-from-order.service.ts` — number generated before invoice persistence/lock

**Root cause:** Concurrent generates can produce sequence gaps when one txn rolls back.

**Business impact:** Gap numbers only; `@unique` prevents corruption.

**Decision lock:** **Not required**

---

### F-11 — Broad WORKER Mutation Permissions

**Severity:** P3  
**Status:** OPEN

**Location:** `src/shared/application/authorization/role-permissions.ts`

**Root cause:** WORKER authorized for `stockMovements.create`, `inventory.update`, and broad workflow mutate permissions.

**Business impact:** Amplifies F-33-03; defense-in-depth gap, not standalone integrity failure.

**Decision lock:** **Partial** — ties to F-33-03 policy

---

### F-09 — Repair `returnInspectionItemId` No FK

**Severity:** P3  
**Status:** OPEN

**Location:** `prisma/schema.prisma` — `Repair.returnInspectionItemId` indexed UUID without `@relation`

**Root cause:** Schema allows orphan repair references if inspection item deleted outside app rules.

**Business impact:** Data integrity hygiene; app validates on create.

**Decision lock:** **Not required**

---

### F-07 — Ghost `RentalOrderStatus.DISPATCHED`

**Severity:** P3  
**Status:** OPEN

**Location:** `prisma/schema.prisma`, `rental-order.constants.ts`, dispatch complete flow

**Root cause:** Enum value exists for ephemeral in-memory dispatch-complete transition; persisted RO status becomes `ON_RENT`, not `DISPATCHED`.

**Business impact:** Schema/domain drift; tests and UI mappers reference it; no monetary corruption.

**Decision lock:** **Not required** (migration cleanup)

---

### N-39-UI-01 — Active Invoice UI Hint Page Cap

**Severity:** P3  
**Status:** OPEN

**Location:** `src/features/rental-invoice/components/rental-order-billing-section.tsx` — `pageSize: 10`, first-page scan for non-VOID invoice

**Root cause:** UI `showGenerate` based on incomplete list slice.

**Scenario:** Active non-VOID invoice beyond page 1 → UI shows Generate button incorrectly.

**Business impact:** **Usability only** — backend Phase 37 active-invoice guard prevents duplicate active invoice creation.

**Decision lock:** **Not required**

---

### F-35-08 — Expense Journal Hook Ordering

**Severity:** DEFERRED  
**Status:** DEFERRED

**Location:** `create-expense-transaction.runner.ts` @ HEAD — `NoOpExpenseAccountingHook`

**Root cause:** Real `ExpenseAccountingHook` exists in WIP; latent journal-before-status ordering risk when activated.

**Business impact:** None at committed HEAD.

**Decision lock:** N/A until hook activated

---

## Concurrency Findings Summary

| Category | Status @ 893a811 |
|----------|------------------|
| **Financial — customer pending** | **Sound** — Phase 39 lock + pending sum |
| **Financial — customer post/void** | **Sound** — Phase 35 claim + atomic delta; duplicate void tested |
| **Financial — supplier pending** | **Sound** — Phase 46 lock + pending sum |
| **Financial — supplier post** | **Sound** — Phase 44 claim + atomic delta |
| **Financial — supplier void** | **Sound** — reverse then claim; duplicate void not tested (mirror of customer) |
| **Financial — invoice derived status** | **Weak (F-37-R1)** — money authoritative |
| **Inventory — workflow paths** | **Sound** — atomic SQL + claims |
| **Inventory — direct API (F-33-03)** | **Policy bypass** — counters atomic |
| **Inventory — PATCH (Phase 43)** | **Sound** — metadata only |
| **Workflow — rental reserve/cancel** | **Sound** |
| **Workflow — dispatch claim/complete/cancel** | **Sound** |
| **Workflow — return capacity (Phase 45)** | **Sound** |
| **Workflow — repair create capacity (N-46-01)** | **UNSAFE** |
| **Workflow — external source (N-46-02)** | **Stale read** |
| **Authorization** | **F-11 amplifies F-33-03** |

---

## Financial Integrity

| Domain | Money counters | Pending commitment | Settlement | Notes |
|--------|----------------|-------------------|------------|-------|
| Customer payments | Atomic `applyPaymentDelta` | Phase 39 hardened | Phase 35 hardened | Duplicate void concurrency tested |
| Supplier payments | Atomic PO `applyPaymentDelta` | **Phase 46 hardened** | Phase 44 hardened | Pending create parity with Phase 39 |
| Rental invoices | Atomic delta | N/A | Via payment path | F-37-R1 derived status; N-44-05 void policy |
| Purchase orders | `paidAmount` SQL guards | Phase 46 pending sum | Phase 44 post | `getBalance()` authoritative for commitment |

---

## Inventory Integrity

| Path | Ledger | Invariants |
|------|--------|------------|
| Workflow stock effects | Movement row + atomic counters | `quantityOnHand ≥ 0`, `reserved ≤ onHand` at SQL |
| PATCH `/api/inventory/:id` | Metadata only (Phase 43) | Counters blocked |
| POST `/api/stock-movements` | Atomic SQL (F-33-03) | Row-level sound; workflow coupling absent |
| Repair complete IN | After Phase 33 claim | **Over-repair (N-46-01) can inflate on-hand** |

---

## Authorization

Server-side `assertPermission` on mutation routes @ HEAD. Meaningful gap: **WORKER can direct-create all stock movement types** (F-33-03 + F-11). No evidence of missing auth on payment/invoice/dispatch workflow commands at route layer. Single-tenant — no cross-tenant IDOR surface.

---

## Schema / Data Integrity

| Item | Impact |
|------|--------|
| `invoiceNumber @unique` | Prevents F-33-01 corruption |
| `external_rental_agreements_rentalOrderId_active_key` | Blocks duplicate active ERA |
| `Repair.returnInspectionItemId` no FK (F-09) | Orphan risk P3 |
| `RentalOrderStatus.DISPATCHED` (F-07) | Enum drift P3 |
| Return/repair capacity | Application locks only — no CHECK constraints required |

**Schema changes recommended this audit:** NONE

---

## Final Priority Ranking

| Priority | Finding | Severity | Domain | Decision Lock | Recommended Next Action |
|----------|---------|----------|--------|---------------|-------------------------|
| 1 | **N-46-01** | **P1** | Repair | No | Phase 47 — return-row lock before repair capacity aggregate |
| 2 | **N-46-02** | P2 | External rental | No | Lock + authoritative F-02 reread on source-externally |
| 3 | **F-33-03** | P2 | Inventory | **Yes** | Policy review then API allowlist / mandatory refs |
| 4 | **F-37-R1** | P2 | Rental invoice | No | Status claim on derived invoice status update |
| 5 | **N-44-05** | P2 | Rental invoice | **Yes** | Policy on void with live payments |
| 6 | **F-33-01** | P2 | Rental invoice | No | Replace scan with sequence table |
| 7 | **F-35-08** | DEFERRED | Expense | N/A | Defer until hook activated |
| 8 | **F-37-R2** | P3 | Rental invoice | No | Backlog |
| 9 | **F-11** | P3 | Authorization | Partial | With F-33-03 |
| 10 | **F-09** | P3 | Schema | No | Optional FK migration |
| 11 | **F-07** | P3 | Schema | No | Enum cleanup migration |
| 12 | **N-39-UI-01** | P3 | UI | No | Raise pageSize or dedicated active-invoice query |

---

## Next Phase Recommendation

```text
NEXT PHASE:
Phase 47 — Repair Capacity Concurrency

TARGET:
N-46-01

SEVERITY:
P1

DECISION LOCK:
Not Required
```

**Rationale:** N-46-01 is the only new P1 — same read→validate→write TOCTOU class as N-44-01 (closed Phase 45), with inventory inflation on repair complete as realistic impact. Clear mirror fix. F-33-03 and N-44-05 remain important but require owner policy decisions first.

**Runner-up:** Phase 48 — Source-Externally F-02 Serialization (**N-46-02**, P2, no decision lock).

---

## Git Safety

| Rule | Status |
|------|--------|
| Production code modified | **NO** |
| Schema/migrations | **NO** |
| Staging | **NO** |
| Commit | **NO** |
| Push | **NO** |
| WIP preserved | **YES** (146 entries) |

This audit created/updated `docs/audits/POST_PHASE_46_ENTERPRISE_GAP_AUDIT.md` only (untracked until separately committed).

---

*End of Post-Phase-46 Enterprise Gap Audit*
