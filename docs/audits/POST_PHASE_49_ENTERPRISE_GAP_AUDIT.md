# Post-Phase-49 Enterprise Gap Audit

**Audit date:** 2026-09-01  
**Scope:** Committed production baseline at `41c27b3` only — ~153 WIP files excluded  
**Method:** Independent Phase 49 closure verification, closed-finding regression review, open/deferred finding deep audit, enterprise gap discovery, targeted + full regression execution

---

## Executive Verdict

**AUDIT COMPLETE — PHASE 50 READINESS IDENTIFIED**

| Severity | Count |
|----------|------:|
| **P0** | **0** |
| **P1** | **0** |
| **P2** | **4** |
| **P3** | **5** |
| **DEFERRED** | **1** |

Phase 49 closed F-37-R1. No P0/P1 launch blockers identified at HEAD. Engineering concurrency hardening through Phases 35–49 remains intact.

**Highest-priority remaining gap:** **F-33-03** — WORKER+ direct stock movement API bypass (P2, **DECISION LOCK REQUIRED**).

**Highest-priority implementation-ready phase:** **Phase 50 — F-33-01 Invoice Number Monotonic Allocation** (no decision lock; correctness-safe today via `@unique`, operational scaling fix).

**Launch blockers (P0/P1):** **None**

**v1.0 posture:** Acceptable for controlled single-tenant launch **with documented policy locks** on F-33-03, N-44-05, and N-48-01. Recommend decision-lock session before treating inventory/financial policy gaps as closed.

---

## Repository Baseline

| Item | Value |
|------|-------|
| **Branch** | `main` |
| **HEAD** | `41c27b3b64207216265d9cab7a2b0db053c0b22b` (`41c27b3`) |
| **Commit** | `fix(rental-invoice): harden derived status transition` |
| **Previous baseline** | `2aab8cd` (Phase 48) |
| **Phase 49 report** | `docs/audits/PHASE_49_IMPLEMENTATION_REPORT.md` — present @ HEAD |
| **WIP entries** | **153** (`git status --short \| Measure-Object -Line`) |
| **Staged** | None |
| **Push** | NO |
| **Audit target** | `git show HEAD:` committed tree |

**Recent history:**

```text
41c27b3 fix(rental-invoice): harden derived status transition
2aab8cd fix(rental-order): serialize external sourcing shortfall
9e0eaf1 fix(repair): prevent repair capacity over-commitment
893a811 fix(payment): prevent supplier pending payment over-commitment
43036b2 fix(return): harden return capacity concurrency
```

**WIP summary:** ~153 unrelated modified/untracked files (accounting UI, reports, expense hook WIP, seeds, etc.). **Not modified during this audit.**

---

## Phase 49 Verification

### F-37-R1 — **CLOSED**

**Status:** CLOSED @ `41c27b3` — independently verified.

**Implementation chain @ HEAD:**

| Step | Evidence |
|------|----------|
| Atomic money | `applyPaymentDelta` raw SQL unchanged — status predicates block VOID/DRAFT mutation |
| Derive status | `derivePaymentStatus` → `withPaymentApplied(paidAmount)` |
| Conditional claim | `claimStatusTransition(invoiceId, afterDelta.status, { status: derived })` |
| Failed claim | Authoritative re-read → idempotent return if already derived → retry from `refreshed.status` |
| VOID race | `derivePaymentStatus` on VOID throws → `ConcurrentUpdateError` → payment UoW rollback (production txn) |
| No unconditional write | `updateStatus` removed from settlement path |

**SQL/predicate semantics:** `claimStatusTransition` uses `updateMany WHERE id = ? AND status IN (expectedList)`. Equivalent to expected-state predicate. Stale worker cannot overwrite `VOID` with `PARTIALLY_PAID`.

**POST ∥ VOID race closed:**

```text
Worker A: applyPaymentDelta (invoice ISSUED)
Worker B: claimStatusTransition → VOID
Worker A: claim ISSUED → PARTIALLY_PAID → 0 rows → re-read VOID → ConcurrentUpdateError → rollback
```

**Concurrency tests (genuine overlap):**

| Test | Mechanism | Verified |
|------|-----------|:--------:|
| T49.5 | `Promise.allSettled` POST ∥ VOID invoice | Yes |
| T49.6 | `Promise.allSettled` POST ∥ POST | Yes |
| T49.7 | Stale claim after concurrent void | Yes |
| T38.4 | `Promise.allSettled` VOID ∥ POST (Phase 38) | Yes — still passes |

**N-44-05 note:** Phase 49 does not resolve void-with-live-payments policy; it prevents status corruption under void∥post concurrency only.

---

## Closed Finding Regression Matrix

| Finding | Previous State | Current State | Evidence @ `41c27b3` | Regression? |
|---------|----------------|---------------|----------------------|:-----------:|
| **F-37-R1** | CLOSED (Phase 49) | **CLOSED** | `payment-invoice.validation.ts` — conditional claim | No |
| **N-46-02** | CLOSED (Phase 48) | **CLOSED** | `SourceRentalOrderExternallyService` lock→reread→shortfall | No |
| **N-46-01** | CLOSED (Phase 47) | **CLOSED** | `lockForRepairCapacity` + aggregate | No |
| **N-44-06** | CLOSED (Phase 46) | **CLOSED** | Supplier pending payment lock + sum | No |
| **Phase 45 return capacity** | CLOSED | **CLOSED** | `lockForReturnCapacity` | No |
| **F-04 / F-05 dispatch** | CLOSED | **CLOSED** | Claim-before-effects; dispatch claim lock | No |
| **Phase 43 inventory PATCH** | CLOSED | **CLOSED** | `UpdateInventorySchema` rejects qty fields | No |
| **F-35-01 payment settlement** | CLOSED | **CLOSED** | Atomic `applyPaymentDelta` | No |
| **F-35-06 invoice issue/void** | CLOSED | **CLOSED** | `claimStatusTransition` on issue/void | No |
| **F-36-03 payment pending** | CLOSED | **CLOSED** | `lockForPaymentCommitment` + pending sum | No |
| **N-40-01** | CLOSED | **CLOSED** | Prior phase closure; no bypass found | No |
| **F-31-05** | CLOSED | **CLOSED** | Prior phase closure intact | No |
| **N-42-01** | CLOSED | **CLOSED** | Dispatch mark-ready claim pattern | No |
| **F-31-03** | CLOSED (historical) | **CLOSED** | Distinct from F-33-03; prior item remains closed | No |
| **F-31-08 inventory PATCH policy** | LOCKED | **CONFORMS** | Phase 43 schema + ADJUSTMENT workflow | No |

---

## Remaining Finding Matrix

| ID | Severity | Status | Root Cause | Production Impact | Decision Lock | Recommended Phase |
|----|----------|--------|------------|-------------------|---------------|-------------------|
| **F-33-03** | P2 | OPEN | WORKER+ `POST /api/stock-movements` → all 5 types without workflow guards | Inventory ledger bypass; F-02 capacity bypass via arbitrary RESERVE/ADJUSTMENT | **REQUIRED** | After policy lock |
| **N-44-05** | P2 | OPEN | `assertCanVoid` allows `PARTIALLY_PAID`; `withVoided()` preserves `paidAmount`; no payment reversal | Reporting/accounting ambiguity; live POSTED payments on VOID invoice | **REQUIRED** | After policy lock |
| **F-33-01** | P2 | OPEN | `generateNextInvoiceNumber` scans max 500 descending | Safe fail via `@unique`; allocation failure at scale | NOT REQUIRED | **Phase 50** |
| **N-48-01** | P2 | OPEN | `CreateExternalRentalService` direct API lacks F-02 locks | MANAGER+ can create RO-linked ERA without shortfall gate | **REQUIRED** | After policy lock |
| **F-37-R2** | P3 | OPEN | Invoice number pre-lock generation gaps | Cosmetic sequence gaps only | NOT REQUIRED | Optional |
| **F-11** | P3 | OPEN | Broad WORKER mutation permissions | Amplifies F-33-03 | PARTIAL (F-33-03) | Tied to F-33-03 |
| **F-09** | P3 | OPEN | Repair `returnInspectionItemId` no FK | Schema hygiene | NOT REQUIRED | Hygiene |
| **F-07** | P3 | OPEN | Ghost `DISPATCHED` RO enum | Confusion only | NOT REQUIRED | Cleanup |
| **N-39-UI-01** | P3 | OPEN | Active invoice UI page cap | UI misleading only | NOT REQUIRED | UI |
| **F-35-08** | DEFERRED | DEFERRED | `NoOpExpenseAccountingHook` @ HEAD | No expense journal side effects in production | N/A until hook merge | Re-audit on merge |

---

## Deep Audit — F-33-03 (Stock Movement API)

**Route:** `POST /api/stock-movements` → `handleCreateStockMovement` → `PERMISSIONS.stockMovements.create`

**Roles:** WORKER, MANAGER, OWNER, ACCOUNTANT (via `MANAGER_PERMISSIONS` / `ALL_PERMISSIONS`). WORKER explicitly has `stockMovements.create`.

**Movement types @ HEAD:** `IN`, `OUT`, `RESERVE`, `RELEASE`, `ADJUSTMENT` (`stock-movement.constants.ts`)

**Flow:** `CreateStockMovementService` → `executeCreateStockMovementInScope` — validates inventory exists/active; dispatches to atomic SQL mutators. **No mandatory** dispatch/return/RO/reference workflow guards. `referenceType`/`referenceId` optional.

| Type | Normal workflow owner | Direct API bypass? | Impossible state? |
|------|----------------------|--------------------|-------------------|
| IN | Return/repair/PO receive complete | Yes (WORKER+) | Atomic SQL prevents negative on-hand |
| OUT | Dispatch complete | Yes | Atomic SQL prevents negative on-hand |
| RESERVE | RO reserve | Yes | Atomic SQL; **bypasses F-02 date-aware capacity** |
| RELEASE | RO cancel / return complete | Yes | Atomic SQL |
| ADJUSTMENT | Intended via `inventory.adjust` permission path | Yes (WORKER has `stockMovements.create`) | Atomic delta ≥ reserved |

**Threat model:** Technical inventory invariants hold (no negative on-hand/reserve violations). **Workflow integrity** does not — operators can create ledger entries outside authorized domain workflows, including ADJUSTMENT bypassing Phase 43 PATCH policy intent.

**Classification:** P2 workflow/authorization gap — **DECISION LOCK REQUIRED** on whether POST remains worker-accessible and which movement types require workflow-enforced references.

---

## Deep Audit — N-44-05 (Partially Paid Void)

**Code @ HEAD:**

- `assertCanVoid`: allows `DRAFT`, `ISSUED`, `PARTIALLY_PAID`; rejects `PAID`, `VOID`
- `withVoided()`: sets `status: VOID`, `voidedAt`; **preserves** `paidAmount`, `balance`
- `VoidRentalInvoiceService`: no payment lookup, reversal, or void cascade
- New payments blocked: `applyPaymentDelta` SQL excludes VOID; `assertInvoiceEligibleForPayment` rejects VOID

**Observed state after void of partially-paid invoice:** `status = VOID`, `paidAmount > 0`, POSTED payments still reference invoice.

**Classification:** **Policy ambiguity** — not a concurrency defect post-Phase 49. **DECISION LOCK REQUIRED:** block void with posted payments vs cascade reverse vs zero derived fields with documented semantics.

**Launch impact:** Pre-launch recommended clarification; not a data-corruption P0/P1 if operators follow manual reconciliation.

---

## Deep Audit — F-33-01 (Invoice Number Allocation)

**Mechanism:** `generateNextInvoiceNumber` — `findPaged({ page: 1, pageSize: 500, sortBy: invoiceNumber, sortOrder: desc })`, max sequence for year prefix, `INV-{year}-{seq}`.

**Correctness:** `@unique` on `invoiceNumber` prevents duplicate commit — **no silent corruption**.

**Failure mode:** When >500 invoices exist for prefix, scan misses higher sequences → proposes reused number → unique constraint rejection → operation fails (safe, not corrupt).

**Concurrency:** Duplicate proposals fail at commit; retry may loop. Not a stale-read overwrite issue.

**Classification:** P2 **operational/scaling** — correctness-safe. **Implementation-ready** without policy lock (dedicated sequence or uncapped monotonic SQL).

---

## Deep Audit — N-48-01 (Direct External Rental Create)

**Route:** `POST /api/external-rentals` → `CreateExternalRentalService`

**Authorization:** `externalRentals.create` — **not** in WORKER permissions; MANAGER/OWNER/ACCOUNTANT paths only.

**Schema:** Requires `rentalOrderId`, `rentalOrderItemId`, `quantityRequested` — always RO-linked.

**Gap vs Phase 48:** No `lockForAvailabilityCommit`, no `lockForReserveCommand`, no F-02 shortfall validation. Creates via separate `IExternalRentalTransactionRunner` (not RO runner).

**Mitigations:** Partial unique index — one active ERA per RO; domain invariants on ERA entity; source-externally path hardened.

**Classification:** P2 — privileged bypass of F-02 shortfall serialization. May be intentional for emergency MANAGER sourcing. **DECISION LOCK REQUIRED** before enforcing Phase 48 parity on direct create.

---

## Deep Audit — F-35-08 (Expense Accounting Hook)

**@ HEAD:** `create-expense-transaction.runner.ts` wires `NoOpExpenseAccountingHook`.

**WIP:** Real hook exists in working tree only — **not production baseline**.

**Classification:** Appropriately **DEFERRED** for v1.0 if expense journal integration is out of launch scope. Re-audit when WIP hook merges.

---

## New Findings

No new P0/P1/P2 findings beyond the established register were demonstrated at `41c27b3`.

Enterprise-wide concurrency review (reserve, dispatch, return, repair, payments, supplier payments, source-externally) shows Phase 35–48 patterns intact. No new stale status write path identified outside closed F-37-R1.

---

## Decision Locks Required

### DL-50-01 — Stock Movement API Policy (F-33-03)

**Question:** Should WORKER+ retain direct `POST /api/stock-movements` for all five movement types?

**Options:**

1. Restrict POST to internal/workflow-only; workers use domain workflows only
2. Allowlist movement types + mandatory validated references per type
3. Split ADJUSTMENT to `inventory.adjust` only; remove from generic POST for workers
4. Keep as-is (document as intentional internal API)

**Consequences:** Options 1–3 reduce ledger bypass; option 4 accepts workflow integrity risk.

---

### DL-50-02 — Void Partially Paid Invoice (N-44-05)

**Question:** When voiding a `PARTIALLY_PAID` invoice with POSTED payments, what is required?

**Options:**

1. Reject void if any POSTED payment exists
2. Auto-void/reverse payments on invoice void
3. Allow void; preserve payments; document manual reconciliation
4. Void clears `paidAmount` display fields only (payments remain)

**Consequences:** Affects reporting, customer balance, and operator training.

---

### DL-50-03 — Direct ERA Create vs F-02 (N-48-01)

**Question:** Should `POST /api/external-rentals` enforce F-02 shortfall serialization when linked to a rental order?

**Options:**

1. Enforce same lock boundary as source-externally
2. Allow MANAGER override without F-02 (document emergency path)
3. Split API: standalone ERA (no RO) vs RO-linked (requires source-externally workflow)

---

## Test Evidence

### Targeted regression (this audit)

```bash
DATABASE_URL=... BETTER_AUTH_SECRET=... npx vitest run \
  src/modules/payment/application/payment-invoice-derived-status-concurrency.49.application.test.ts \
  src/modules/payment/application/payment-invoice-settlement-concurrency.35.application.test.ts \
  src/modules/rental-invoice/application/rental-invoice.issue-void-concurrency.38.application.test.ts \
  src/modules/rental-order/application/rental-order.source-externally-concurrency.48.application.test.ts \
  src/modules/repair/application/repair.capacity-concurrency.47.application.test.ts \
  src/modules/inventory/application/inventory.patch-ledger-integrity.43.application.test.ts
```

**Result:** **51/51 PASS**

### Full suite (this audit)

```bash
DATABASE_URL=... BETTER_AUTH_SECRET=... npx vitest run
```

**Result:** **3186/3186 PASS** (216 files)

---

## Static Validation

| Check | Result |
|-------|--------|
| `npx prisma validate` | **PASS** |
| ESLint (audit-only) | Not run repo-wide |
| Typecheck | Pre-existing failures in unrelated WIP test files — not introduced @ HEAD |

---

## WIP Preservation

**CONFIRMED.** ~153 WIP files untouched. No reset/stash/clean/revert. Audit modified only this report file.

---

## Launch Readiness Assessment

| Area | v1.0 Posture |
|------|--------------|
| Architecture | **Ready** — Clean Architecture/UoW patterns consistent |
| Rental operations | **Ready** — Reserve/cancel/dispatch hardened |
| Inventory | **Conditional** — atomic SQL sound; F-33-03 policy open |
| External rental | **Conditional** — source-externally sound; direct create policy open |
| Returns/repair | **Ready** — Phases 45/47 closed |
| Financials | **Ready** — payment settlement + Phase 49 status atomicity |
| Authorization | **Conditional** — WORKER stock movement breadth (F-33-03) |
| Concurrency | **Ready** — no P0/P1 gaps at HEAD |
| Testing | **Ready** — 3186/3186 pass with env |
| Deployment | **Ready** — no schema drift from Phases 48–49 |

**Launch blockers:** **None (P0/P1)**

**Pre-launch recommended:** Decision locks DL-50-01 through DL-50-03; operator documentation for N-44-05 if policy option 3 chosen.

---

## Recommended Next Phase

### Primary (implementation-ready)

**Phase 50 — F-33-01 Invoice Number Monotonic Allocation**

| Item | Value |
|------|-------|
| **Finding** | F-33-01 |
| **Severity** | P2 |
| **Decision lock** | NOT REQUIRED |
| **Schema** | Optional sequence table; may use existing number-sequence infrastructure |
| **Rationale** | Only remaining P2 without policy dependency; eliminates scale allocation failures |

### Parallel (non-implementation)

**Decision Lock Session — DL-50-01 / DL-50-02 / DL-50-03**

Required before Phase 51 can implement F-33-03, N-44-05, or N-48-01.

**Do not start Phase 50 F-33-03 implementation until DL-50-01 is locked.**

---

## Finding Register (Consolidated)

| ID | Severity | Status | Title |
|----|----------|--------|-------|
| F-33-03 | P2 | OPEN | Stock movement API workflow bypass |
| N-44-05 | P2 | OPEN | Void partially paid with live payments |
| F-33-01 | P2 | OPEN | Invoice number scan cap 500 |
| N-48-01 | P2 | OPEN | Direct ERA create bypasses F-02 |
| F-37-R2 | P3 | OPEN | Invoice number pre-lock gaps |
| F-11 | P3 | OPEN | Broad WORKER permissions |
| F-09 | P3 | OPEN | Repair FK hygiene |
| F-07 | P3 | OPEN | Ghost DISPATCHED enum |
| N-39-UI-01 | P3 | OPEN | Active invoice UI page cap |
| F-35-08 | DEFERRED | DEFERRED | NoOp expense accounting hook |
| F-37-R1 | P2 | **CLOSED** | Derived invoice status atomicity |
| N-46-02 | P2 | CLOSED | Source-externally F-02 serialization |
| N-46-01 | P1 | CLOSED | Repair capacity concurrency |

---

## Production Changes

**NONE**

---

## Commit

**NONE** (audit report may remain unstaged)

---

## Push

**NO**

---

## Final Verdict

**AUDIT COMPLETE — PHASE 50 READINESS IDENTIFIED**

Phase 49 verified closed. Four P2 findings remain open; three require decision locks. **Phase 50 implementation recommendation: F-33-01.** **Parallel: decision lock session for F-33-03 (highest remaining integrity gap).** No P0/P1 launch blockers.
