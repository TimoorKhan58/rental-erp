# Post-Phase-38 Enterprise Gap Audit Report

**Date:** 2026-08-30  
**Baseline HEAD:** `790ccebaf1fc07a85fbcbf6e5a368bc77497bbe7` — `fix(rental-invoice): harden issue and void concurrency`  
**Branch:** `main` (ahead of `origin/main` by 5 commits)  
**Push:** NO  
**Mode:** Audit only — no production implementation

---

## Executive Verdict

**AUDIT COMPLETE — NEXT PHASE IDENTIFIED**

**NEXT HIGHEST-PRIORITY FINDING:** **F-36-03** — Pending payment over-commitment at create/update

---

## 1. Baseline

| Item | Value |
|------|-------|
| **HEAD** | `790ccebaf1fc07a85fbcbf6e5a368bc77497bbe7` |
| **Branch** | `main` |
| **Origin** | Ahead of `origin/main` by **5** commits |
| **Push** | **NO** |
| **Committed production baseline** | Phases 28–38 through `790cceb` |
| **Uncommitted WIP** | ~100+ modified tracked files + large untracked set (UI, payment pending-sum WIP, issue-journal WIP, accounting, seeds, etc.) — **excluded from production classification** |

---

## 2. Phase 28–38 Verification Matrix

| Phase | Finding | Status | Evidence |
| ----- | ------- | ------ | -------- |
| 28 | Mixed return source attribution | **CLOSED** | `e963a8b` + decision lock |
| 29 | Concurrent-safe command idempotency (F-01–F-04) | **CLOSED** | `d0ded6c`; dispatch/return complete claims |
| 30 | Dispatch claimed-quantity (F-05) | **CLOSED** | `bbe89b4`; T30 tests |
| 31 | Date-aware availability / F-02 reserve | **CLOSED** | `8425661`; Phase 32 reserve lock |
| 32 | Rental order reserve command | **CLOSED** | `8425661`; lock + sorted inventory locks |
| 33 | Maintenance/repair claim-before-side-effects | **CLOSED** | Phase 33 services + tests |
| 34 | Invoice dispatch rollup truncation (F-31-03) | **CLOSED** | `6fc20be` |
| 35 | Payment invoice settlement concurrency (F-35-01) | **CLOSED** | `bd8b220`; `applyPaymentDelta` + payment claim |
| 36 | Cancel maintenance reversal (F-36-01) | **CLOSED** | `2d61844`; `shouldReverseStock = claimed.startedAt !== null` |
| 37 | Active invoice guard (F-36-02, F-33-02, F-35-05) | **CLOSED** | `4e8527d`; lock + `findActiveByRentalOrderId` |
| 38 | Invoice issue/void concurrency (F-35-06) | **CLOSED @ 790cceb** | `claimStatusTransition` in issue/void services; T38.1–T38.7 |

---

## 3. Phase 38 Verification

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Issue claim `DRAFT → ISSUED` | **PASS** | `issue-rental-invoice.service.ts` — `claimStatusTransition(id, "DRAFT", …)` |
| Void claim `DRAFT/ISSUED/PARTIALLY_PAID → VOID` | **PASS** | `void-rental-invoice.service.ts` — `claimStatusTransition(id, ["DRAFT","ISSUED","PARTIALLY_PAID"], …)` |
| Claim before side effects | **PASS** | Audit/notification after successful claim only |
| Audit ordering | **PASS** | Audit follows claim |
| Notification ordering | **PASS** | `enqueueWorkflowNotification` after claim + audit |
| Transaction boundary | **PASS** | Single `IRentalInvoiceTransactionRunner` UoW |
| No unconditional Issue/Void status write | **PASS** | Grep confirms `updateStatus` not used in issue/void services @ HEAD |
| Prisma atomic predicate | **PASS** | `prisma-rental-invoice.repository.ts` — `updateMany` + `status IN (...)` |

**F-35-06: CLOSED @ 790cceb**

---

## 4. Remaining Findings

| ID | Severity | Area | Status | Evidence | Risk | Business impact |
| -- | -------- | ---- | ------ | -------- | ---- | --------------- |
| **F-36-03** | P2 | Payment create/update | **OPEN** | `create-payment.service.ts` L74–98; `validateInvoiceForPayment` checks `amount <= invoice.balance` only | Medium | Multiple PENDING payments can exceed available balance; post SQL still protects posted money |
| **F-33-03** | P2 | Stock movement API | **OPEN** | `POST /api/stock-movements` → all movement types; optional refs; WORKER has `stockMovements.create` | Medium | Inventory counters mutate outside RO/dispatch/return workflow |
| **F-31-08** | P2 | Inventory PATCH | **OPEN** | `update-inventory.service.ts` absolute `repository.update`; WORKER has `inventory.update` | Medium | Counter/ledger desync; lost-update vs workflow |
| **F-33-01** | P2 | Invoice numbering | **OPEN** | `generate-invoice-number.ts` — `findPaged({ pageSize: 500 })` | Low–Med | Duplicate number proposal; `@unique` prevents silent corruption |
| **F-31-05** | P2 | Return receive/inspect | **OPEN** | `receive-return.service.ts`, `inspect-return.service.ts` — unconditional `updateStatus` | Low | Status ordering / duplicate audit; no stock side effects |
| **F-35-08** | P2 | Expense pay journal | **DEFERRED** | `pay-expense.service.ts` calls hook before status; **hook is NoOp @ HEAD** | Latent | Orphan journal risk only when operational journal WIP lands |
| **F-37-R1** | P3 | Payment derived status | **OPEN** | `applyPaymentToInvoice` → unconditional `updateStatus` after atomic delta | Low | Status TOCTOU; money fields correct |
| **F-37-R2** | P3 | Invoice number allocation | **OPEN** | Number generated before `lockForInvoiceCommand` in generate flow | Low | Sequence gap on conflict; no duplicate active invoice |
| **F-31-10** | P3 | Cancel dispatch/return | **OPEN** | `cancel-dispatch.service.ts`, `cancel-return.service.ts` — unconditional status | Low | Status TOCTOU; no stock on cancel |
| **F-11** | P3 | Authorization granularity | **OPEN** | Permission/action mismatches; WORKER stock + inventory update | Low–Med | Over-privileged mutations |
| **F-09** | P3 | Repair FK | **OPEN** | `Repair.returnInspectionItemId` — index only, no FK | Low–Med | Orphan repair rows at DB level |
| **F-07** | P3 | RO DISPATCHED enum | **OPEN** | Ghost enum value; ephemeral in-memory only | Low | Developer/analytics confusion |
| **N-39-UI-01** | P3 | UI active-invoice hint | **OPEN (new)** | Client `pageSize: 10` list scan for generate button | Low | UI hint wrong; API still 409s |

---

## 5. P0 Findings

**None.**

No committed path at HEAD allows silent duplicate inventory movements, posted payment money corruption, or irreversible financial state corruption under concurrency. Phase 35 `applyPaymentDelta` and Phase 29 atomic stock SQL remain authoritative for money/counters at post/movement time.

---

## 6. P1 Findings

**None.**

All prior P1 findings in the payment settlement, maintenance cancel, and active-invoice clusters are closed through Phases 35–38.

---

## 7. P2/P3 Findings (Concise)

### P2

- **F-36-03:** Create/update payment validates against stale `invoice.balance` without summing other PENDING payments on the same invoice.
- **F-33-03:** Direct stock-movement API accepts RESERVE/RELEASE/OUT/IN without mandatory workflow reference coupling.
- **F-31-08:** Inventory PATCH writes absolute counters bypassing movement ledger.
- **F-33-01:** Invoice number scan capped at 500 rows.
- **F-31-05:** Return receive/inspect use unconditional status writes (no stock side effects).

### P3

- **F-37-R1/R2, F-31-10, F-11, F-09, F-07, N-39-UI-01** — see §4.

---

## 8. Historical Finding Revalidation

| ID | Classification | Notes |
|----|----------------|-------|
| **F-35-06** | **CLOSED @ 790cceb** | Phase 38 `claimStatusTransition` |
| **F-36-01** | **CLOSED @ 2d61844** | Post-claim `startedAt` reversal gate |
| **F-36-02, F-33-02, F-35-05** | **CLOSED @ 4e8527d** | Phase 37 active guard |
| **F-35-01** | **CLOSED @ bd8b220** | Phase 35 settlement |
| **F-31-03** | **CLOSED @ 6fc20be** | Phase 34 rollup |
| **F-36-03** | **OPEN** | Unchanged @ HEAD; WIP partial fix not committed |
| **F-33-01, F-33-03** | **OPEN** | Unchanged |
| **F-35-08** | **DEFERRED** | Structure present; `NoOpExpenseAccountingHook` @ HEAD |
| **F-31-05, F-31-08, F-31-10** | **OPEN** | Unchanged |
| **F-37-R1, F-37-R2** | **OPEN** | Observational; subordinate to P2 |
| **F-11, F-09, F-07** | **OPEN (deferred P3)** | Schema/auth cleanup |
| **N-39-UI-01** | **OPEN (new P3)** | UI-only |

---

## 9. New Findings

| ID | Sev | Summary |
|----|-----|---------|
| **N-39-UI-01** | P3 | Rental order billing UI uses capped list to infer active invoice; API guard remains authoritative |

No new P0/P1/P2 defects beyond the historical deferred set.

---

## 10. Financial Integrity

| Path | @ HEAD | Verdict |
|------|--------|---------|
| Invoice create/generate | Active guard + lock | **Sound** |
| Invoice issue/void | Atomic claims (Phase 38) | **Sound** |
| Payment post/void settlement | Atomic delta + payment claim (Phase 35) | **Sound** |
| Payment create/update pending | Stale balance only | **F-36-03 OPEN** |
| Derived invoice status after payment | Unconditional `updateStatus` | **F-37-R1 P3** |
| Expense pay journal | NoOp hook | **Latent F-35-08** |
| Issue-journal / payment-journal auto-posting | **Not in HEAD** | WIP only |

**Conclusion:** Posted money integrity is enforced at settlement time. The primary remaining financial gap is **pending payment commitment validation** at create/update (F-36-03).

---

## 11. Inventory Integrity

| Path | @ HEAD | Verdict |
|------|--------|---------|
| Workflow RESERVE/RELEASE/OUT/IN | Atomic delta SQL | **Sound** |
| Dispatch/return complete | Claim-before-side-effects | **Sound** |
| Maintenance cancel reversal | Post-claim `startedAt` (Phase 36) | **Sound** |
| Inventory PATCH | Absolute write | **F-31-08 OPEN** |
| Direct stock-movement API | Atomic but uncoupled | **F-33-03 OPEN** |
| Return receive/inspect | Status-only TOCTOU | **F-31-05 OPEN (lower impact)** |

**Conclusion:** Workflow stock paths are hardened. Remaining inventory risk is **policy bypass surfaces** (API + PATCH), not workflow double-fire.

---

## 12. Authorization / Bypass

- Module-level permissions only; no row-level authorization.
- **WORKER** holds `inventory.update`, `inventory.adjust` (orphaned on API), and `stockMovements.create` — enables F-31-08 and F-33-03 bypass family (**F-11** sub-gaps persist).
- Direct create endpoints for stock movements and inventory PATCH are intentional admin/worker surfaces but lack workflow coupling — **integrity bypass**, not missing auth.

---

## 13. Schema / Database

**Schema changes: NONE (audit task)**  
**Migration changes: NONE (audit task)**

Observational gaps: `Repair.returnInspectionItemId` (F-09), ghost `DISPATCHED` enum (F-07). No new schema defects identified beyond historical deferred items.

---

## 14. Top Priority

**NEXT HIGHEST-PRIORITY FINDING: F-36-03**

**Why it outranks others:**

1. **Financial workflow cluster continuity** — Phases 35 (post settlement) and 38 (issue/void) closed the invoice/payment mutation path except pending creation validation.
2. **Operator frequency** — Creating/updating pending payments is a high-frequency billing action vs infrequent direct stock PATCH/API misuse.
3. **Clear invariant** — `sum(PENDING) + newAmount <= invoice.balance` (or equivalent available balance) without unresolved business policy.
4. **Contained scope** — Repository sum query + validation extension; no schema change required.
5. **Post SQL mitigates corruption** but not operator confusion or failed posts — F-36-03 is the highest **remaining practical P2** in the payment lifecycle.

F-33-03 and F-31-08 are serious policy-bypass findings but lower frequency and require broader API/role policy decisions. F-33-01 is mitigated by `@unique`. F-35-08 is latent until journal WIP commits.

---

## 15. Decision Lock

**Decision lock prepared: YES**

**Path:** `docs/decisions/PENDING_PAYMENT_OVER_COMMITMENT_36_03.md`

---

## 16. Recommended Next Phase

**Phase 39 — Pending Payment Over-Commitment Integrity (F-36-03)**

| Attribute | Value |
|-----------|-------|
| **Objective** | Prevent multiple PENDING payments from collectively exceeding invoice available balance at create/update |
| **Finding(s)** | F-36-03 |
| **Scope** | `CreatePaymentService`, `UpdatePaymentService`, `validateInvoiceForPayment`, payment repository sum query, in-memory test double |
| **Strategy** | Authoritative `sumPendingAmountByRentalInvoiceId` inside payment UoW; validate `amount <= balance - pendingSum` (exclude self on update) |
| **Tests** | T39.1 concurrent creates; T39.2 create + update; T39.3 post regression preserved |
| **Schema impact** | **NONE** expected |

**Explicitly out of scope:** F-33-03, F-31-08, issue-journal WIP, F-37-R1, unrelated WIP reconciliation.

---

## 17. Tests

| Suite | Result |
|-------|--------|
| T38.1–T38.7 | **PASS** (7/7) |
| Phase 35 payment concurrency | **PASS** (8/8) |
| Phase 36 maintenance T36 | **PASS** (7/7) |
| Targeted combined (22 tests) | **PASS** |
| Full suite 3090 | **NOT RUN** (prior Phase 38 run: 3090/3090 PASS) |

---

## 18. Git Safety

| Check | Result |
|-------|--------|
| Production implementation | **NO** |
| Destructive operations | **NO** |
| Push | **NO** |
| Unrelated WIP preserved | **YES** |
| Audit documentation only | `docs/audits/PHASE_38_ENTERPRISE_GAP_AUDIT.md`, `docs/decisions/PENDING_PAYMENT_OVER_COMMITMENT_36_03.md` |

---

**NO PRODUCTION IMPLEMENTATION PERFORMED.**  
**NO PUSH PERFORMED.**
