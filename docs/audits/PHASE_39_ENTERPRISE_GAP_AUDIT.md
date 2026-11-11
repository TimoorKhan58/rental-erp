# Post-Phase-39 Enterprise Gap Audit Report

**Date:** 2026-08-30  
**Baseline HEAD:** `6662ffe1f4f1d52f93eac638cd2a1135a099bd87` — `fix(payment): prevent pending payment over-commitment`  
**Branch:** `main` (ahead of `origin/main` by 6 commits)  
**Push:** NO  
**Mode:** Audit only — no production implementation

---

## Executive Verdict

**AUDIT COMPLETE — NEXT PHASE IDENTIFIED**

**NEXT HIGHEST-PRIORITY FINDING:** **N-40-01** — Cancel∥Complete cross-workflow status overwrite (F-31-10 elevation)

---

## 1. Baseline

| Item | Value |
|------|-------|
| **HEAD** | `6662ffe1f4f1d52f93eac638cd2a1135a099bd87` |
| **Previous HEAD** | `790cceb` — invoice issue/void concurrency |
| **Branch** | `main` |
| **Origin** | Ahead of `origin/main` by **6** commits |
| **Push** | **NO** |
| **Committed production baseline** | Phases 28–39 through `6662ffe` |
| **Uncommitted WIP** | ~100+ modified tracked files + large untracked set (UI, accounting, issue-journal, payment journal WIP, seeds, etc.) — **excluded from production classification** |

---

## 2. Phase 28–39 Verification Matrix

| Phase | Finding | Status | Evidence |
| ----- | ------- | ------ | -------- |
| 28 | Mixed return source × condition | **CLOSED** | `e963a8b` + decision lock |
| 29 | Concurrent-safe command idempotency (F-01–F-04) | **CLOSED** | `d0ded6c`; complete dispatch/return use `claimStatusTransition` before side effects |
| 30 | Dispatch claimed-quantity (F-05) | **CLOSED** | `bbe89b4`; T30 tests |
| 31 | Date-aware availability / F-02 reserve | **CLOSED** | `8425661`; Phase 32 reserve lock |
| 32 | Rental order reserve command | **CLOSED** | `8425661`; lock + sorted inventory locks |
| 33 | Maintenance/repair claim-before-side-effects | **CLOSED** | Phase 33 services + tests |
| 34 | Invoice dispatch rollup truncation (F-31-03) | **CLOSED** | `6fc20be` |
| 35 | Payment invoice settlement concurrency (F-35-01) | **CLOSED** | `bd8b220`; `applyPaymentDelta` + payment claim |
| 36 | Cancel maintenance reversal (F-36-01) | **CLOSED** | `2d61844`; post-claim `startedAt` gate |
| 37 | Active invoice guard (F-36-02, F-33-02, F-35-05) | **CLOSED** | `4e8527d`; lock + `findActiveByRentalOrderId` |
| 38 | Invoice issue/void concurrency (F-35-06) | **CLOSED** | `790cceb`; `claimStatusTransition` in issue/void |
| 39 | Pending payment commitment (F-36-03) | **CLOSED @ 6662ffe** | `lockForPaymentCommitment` + pending sum + T39.1–T39.5 |

**Expected closed items confirmed:** F-35-01, F-35-06, F-36-01, F-36-02, F-36-03, F-33-02, F-35-05, F-31-03 — all **CLOSED** at committed HEAD.

---

## 3. Phase 39 Verification

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Pending sum at create/update | **PASS** | `sumPendingAmountByRentalInvoiceId` in payment repository |
| Validation uses `balance - pendingSum` | **PASS** | `payment-invoice.validation.ts` L31–33 |
| Invoice lock held across validation + mutation | **PASS** | `lockForPaymentCommitment` → `FOR UPDATE` in create/update services |
| Update excludes self from pending sum | **PASS** | `excludePaymentId` parameter on update path |
| Phase 35 post settlement unchanged | **PASS** | `post-payment.service.ts` — claim then `applyPaymentDelta` |
| Phase 38 issue/void unchanged | **PASS** | issue/void services use `claimStatusTransition` only |
| Tests T39.1–T39.5 | **PASS** | `payment.pending-over-commitment.39.application.test.ts` |

**F-36-03: CLOSED @ 6662ffe**

---

## 4. Findings Matrix

| ID | Severity | Area | Status | Evidence | Concurrency Risk | Business Impact |
| -- | -------- | ---- | ------ | -------- | ---------------- | --------------- |
| **N-40-01** | **P1** | Cancel dispatch/return vs Complete | **OPEN (new)** | `cancel-dispatch.service.ts`, `cancel-return.service.ts` — unconditional `updateStatus`; complete paths use `claimStatusTransition` | **High** — stale cancel can overwrite post-stock terminal state | Stock moved (OUT/IN) while entity marked CANCELLED; no reversal |
| **F-33-03** | P2 | Stock movement API | **OPEN** | `POST /api/stock-movements` — all types; optional refs; WORKER has `stockMovements.create` | Medium — direct RESERVE lacks F-02 commit lock | Inventory counters mutate outside RO/dispatch/return workflow |
| **F-31-08** | P2 | Inventory PATCH | **OPEN** | `update-inventory.service.ts` — absolute `repository.update`; WORKER has `inventory.update` | Medium — lost-update vs workflow SQL | Counter/ledger desync; no movement record |
| **F-33-01** | P2 | Invoice numbering | **OPEN** | `generate-invoice-number.ts` — `findPaged({ pageSize: 500 })` | Low — `@unique` prevents silent dup | Wrong number proposal when >500 invoices globally |
| **F-37-R1** | P2 | Payment derived status | **OPEN** | `applyPaymentToInvoice` → unconditional `updateStatus` after atomic delta | Medium — void∥post interleaving | Status/lifecycle inconsistency; money fields authoritative |
| **F-31-05** | P2 | Return receive/inspect | **OPEN** | `receive-return.service.ts`, `inspect-return.service.ts` — unconditional `updateStatus` | Medium — duplicate audit / item overwrite | Status ordering; no stock side effects |
| **F-35-08** | P2 | Expense pay journal | **DEFERRED** | `pay-expense.service.ts` — hook before status; **NoOp @ HEAD** | Latent | Orphan journal when operational journal WIP lands |
| **F-31-10** | P3 | Cancel dispatch/return (same-op) | **OPEN** | Same services as N-40-01 — duplicate cancel audit | Low alone | Subsumed by N-40-01 for priority |
| **F-37-R2** | P3 | Invoice number allocation | **OPEN** | Number generated before `lockForInvoiceCommand` in generate flow | Low | Sequence gap on conflict; no duplicate active invoice |
| **F-11** | P3 | Authorization granularity | **OPEN** | WORKER has `inventory.update`, `stockMovements.create`; `inventory.adjust` UI-only | Enables F-33-03/F-31-08 | Over-privileged direct mutation |
| **F-09** | P3 | Repair FK | **OPEN** | `Repair.returnInspectionItemId` — index only, no FK relation | N/A | Orphan repair rows at DB level |
| **F-07** | P3 | RO DISPATCHED enum | **OPEN** | Ghost enum value in schema | N/A | Developer/analytics confusion |
| **N-39-UI-01** | P3 | UI active-invoice hint | **OPEN** | `rental-order-billing-section.tsx` — `pageSize: 10` scan | N/A | Generate button hint wrong; API 409 authoritative |
| **F-36-03** | — | Pending payment commitment | **CLOSED @ 6662ffe** | Phase 39 commit | — | — |

---

## 5. P0 / P1 Findings

### P0

**NONE.**

No committed path at HEAD allows silent duplicate posted payment money corruption, irreversible double stock movement on hardened complete paths, or unguarded active-invoice duplication. Phase 35 `applyPaymentDelta`, Phase 29 complete claims, and Phase 39 pending commitment remain authoritative in their domains.

### P1

**N-40-01 — Cancel∥Complete cross-workflow status overwrite**

`CancelDispatchService` / `CancelReturnService` validate status on a stale read, then call unconditional `updateStatus`. Hardened counterparts (`CompleteDispatchService`, `CompleteReturnService`) atomically claim before irreversible stock effects. A concurrent cancel+complete race can leave stock moved (RELEASE/OUT or RELEASE/IN) while the workflow entity is overwritten to `CANCELLED` with **no stock reversal** on the cancel path.

---

## 6. Top Priority Analysis — N-40-01

### Current committed path

```
CancelDispatchService / CancelReturnService
  → findById
  → domain withCancelled() on stale snapshot
  → updateStatus (unconditional)
  → audit
```

Complete paths (hardened):

```
CompleteDispatchService / CompleteReturnService
  → findById
  → claimStatusTransition(expected → terminal)
  → stock movements + side effects
  → audit
```

### Exact defect

Cancel commands use **last-writer-wins unconditional status writes** while complete commands use **expected-status atomic claims**. Domain rules (`assertCanCancel`) are evaluated only on the initial read, not re-checked at persist time.

### Race / TOCTOU scenario

1. Dispatch at `READY`. TX-A (cancel) reads `READY`, passes `withCancelled()`. TX-B (complete) claims `READY→DISPATCHED`, executes RELEASE+OUT.
2. TX-A commits `updateStatus(CANCELLED)` — overwrites `DISPATCHED`/`COMPLETED`.
3. Inventory shows stock left warehouse; dispatch record shows `CANCELLED`. No reversal runs on cancel.

Return mirror: cancel on stale `INSPECTED` vs complete claiming `INSPECTED→COMPLETED` with RELEASE+IN.

### Business impact

- Inventory integrity corruption (on-hand/reserved vs workflow state)
- Claimed-quantity rollups and billing/dispatch linkage desync
- Operator-visible impossible states (cancelled dispatch with stock already out)

### Why it outranks other findings

1. **Irreversible side effects** — unlike F-31-05 (audit-only) or F-33-01 (`@unique` mitigated)
2. **Architectural inconsistency** — complete paths hardened in Phase 29; cancel left behind in the same workflow cluster
3. **Contained fix** — reuse existing `claimStatusTransition` pattern; no schema change expected
4. **Higher severity than policy-bypass APIs (F-33-03/F-31-08)** when two legitimate workflow commands race — both are authorized operations, not deliberate API misuse

F-33-03 remains the strongest **policy-bypass P2** and is the natural follow-on after workflow cancel hardening.

### Recommended hardening strategy

- Replace unconditional `updateStatus` in cancel dispatch/return with `claimStatusTransition` using expected source statuses (`DRAFT|READY` for dispatch; non-terminal set for return)
- Return `ConcurrentUpdateError` when claim fails (mirror complete services)
- Audit/notification after successful claim only
- Concurrency tests with `Promise.allSettled` (cancel∥complete)

### Schema impact

**NONE** expected.

### Expected tests

- T40.1: concurrent cancel+complete dispatch — one winner; loser 409; stock effects ≤ one path
- T40.2: concurrent cancel+complete return — same
- T40.3: sequential cancel after complete — rejected
- Phase 29 regression preserved

---

## 7. Financial Integrity (Post-Phase-39)

| Path | @ HEAD | Verdict |
|------|--------|---------|
| Invoice create/generate | Active guard + lock | **Sound** |
| Invoice issue/void | Atomic claims (Phase 38) | **Sound** |
| Payment create/update pending | Lock + pending sum (Phase 39) | **Sound** |
| Payment post/void settlement | Atomic delta + payment claim (Phase 35) | **Sound** |
| Derived invoice status after payment | Unconditional `updateStatus` | **F-37-R1 OPEN (P2)** |
| Expense pay journal | NoOp hook | **Latent F-35-08** |
| Issue-journal / payment-journal auto-posting | **Not in HEAD** | WIP only |

**Conclusion:** Posted money integrity is enforced at settlement time. Pending commitment gap closed @ Phase 39. Primary remaining **financial** gap is derived-status TOCTOU (F-37-R1), ranked below N-40-01 inventory corruption.

---

## 8. Inventory Integrity

| Path | @ HEAD | Verdict |
|------|--------|---------|
| Workflow RESERVE/RELEASE/OUT/IN | Atomic delta SQL | **Sound** |
| Dispatch/return **complete** | Claim-before-side-effects | **Sound** |
| Dispatch/return **cancel** | Unconditional status | **N-40-01 OPEN (P1)** |
| Maintenance cancel reversal | Post-claim `startedAt` (Phase 36) | **Sound** |
| Inventory PATCH | Absolute write | **F-31-08 OPEN (P2)** |
| Direct stock-movement API | Atomic but uncoupled | **F-33-03 OPEN (P2)** |
| Return receive/inspect | Status-only TOCTOU | **F-31-05 OPEN (P2, lower impact)** |

---

## 9. Authorization / Schema / UI

- **F-11:** WORKER retains direct `inventory.update` and `stockMovements.create` — enables bypass family; no row-level auth.
- **F-09:** `Repair.returnInspectionItemId` indexed but no FK — orphan risk at DB level.
- **F-07:** `DISPATCHED` enum ghost value — maintainability only.
- **N-39-UI-01:** `rental-order-billing-section.tsx` L29–42 uses `pageSize: 10` to infer active invoice for generate button; API Phase 37 guard remains authoritative.

**Schema changes: NONE (audit task)**  
**Migration changes: NONE (audit task)**

---

## 10. Decision Lock

**Decision lock required: NO**

N-40-01 follows established Phase 29 claim-before-side-effects architecture. No unresolved business policy blocks implementation.

If next phase after N-40-01 targets F-33-03, a decision lock **will be required** (API restriction vs mandatory workflow refs vs role change).

---

## 11. Recommended Next Phase

**Phase 40 — Cancel Command Concurrency Integrity (N-40-01)**

| Attribute | Value |
|-----------|-------|
| **Objective** | Prevent cancel∥complete races from overwriting terminal state after irreversible stock effects |
| **Finding(s)** | N-40-01 (elevates F-31-10 cross-workflow aspect) |
| **Scope** | `CancelDispatchService`, `CancelReturnService`, concurrency tests |
| **Strategy** | `claimStatusTransition` with expected statuses; fail with `ConcurrentUpdateError` |
| **Schema impact** | **NONE** expected |

**Runner-up:** F-33-03 — direct stock-movement API workflow bypass (P2 policy cluster).

---

## 12. Tests

| Suite | Result |
|-------|--------|
| T39 + Phase 35 + Phase 38 targeted | **PASS** (25/25) |
| Full suite 3100 | **NOT RUN** this audit (prior baseline after Phase 39: 3100/3100 PASS) |

---

## 13. Git Safety

| Check | Result |
|-------|--------|
| Production implementation | **NO** |
| Commit | **NO** |
| Push | **NO** |
| Destructive operations | **NO** |
| Unrelated WIP preserved | **YES** |
| Audit documentation | `docs/audits/PHASE_39_ENTERPRISE_GAP_AUDIT.md` |

---

**NO PRODUCTION IMPLEMENTATION PERFORMED.**  
**NO COMMIT CREATED.**  
**NO PUSH PERFORMED.**  
**ALL EXISTING WIP PRESERVED.**
