# Post-Phase-41 Enterprise Gap Audit Report

**Date:** 2026-08-30  
**Baseline HEAD:** `1934e37718a1cd2cf499cfab4a96bc58074ca79f` — `fix(return): harden receive and inspect concurrency`  
**Branch:** `main` (ahead of `origin/main` by **8** commits)  
**Push:** NO  
**Mode:** Audit only — no production implementation

---

## Executive Verdict

**AUDIT COMPLETE — NEXT PHASE IDENTIFIED**

| Item | Value |
|------|-------|
| **Next highest-priority finding** | **N-42-01** — Dispatch mark-ready unconditional status write vs hardened complete/cancel |
| **Severity** | **P1** |
| **Origin** | **Newly discovered** (same defect class as closed F-31-05 / N-40-01) |

Phase 41 closed return receive/inspect asymmetric claims (`F-31-05`). The same pattern persists on **dispatch update**: `UpdateDispatchService` uses unconditional `updateStatus` for `markReady` (`DRAFT → READY`) while `CompleteDispatchService` and `CancelDispatchService` use atomic `claimStatusTransition` with irreversible stock effects on complete. A stale mark-ready update can regress `COMPLETED → READY` (or `CANCELLED → READY`) after OUT/RELEASE stock has committed.

**P0:** NONE  
**P1:** N-42-01 (one finding)

**Recommended next phase:** Phase 42 — Dispatch Mark-Ready Concurrency

---

## 1. Baseline

| Item | Value |
|------|-------|
| **HEAD** | `1934e37718a1cd2cf499cfab4a96bc58074ca79f` (`1934e37`) |
| **Previous phase commit** | `44195a9` — cancel concurrency (Phase 40) |
| **Branch** | `main` |
| **Origin divergence** | Ahead of `origin/main` by **8** commits (`0 8`) |
| **Push** | **NO** |
| **Audit scope** | Committed production code at HEAD only (`git show HEAD:`) |
| **WIP state** | ~141 modified/untracked paths (UI, accounting, seeds, staging dirs, audit docs). **Excluded from production classification.** |
| **Destructive Git ops** | **NONE** performed during audit |

---

## 2. Phase 28–41 Verification Matrix

| Phase | Finding | Status | Evidence |
| ----- | ------- | ------ | -------- |
| 28 | Mixed return source × condition | **CLOSED** | `e963a8b` |
| 29 | Workflow command concurrency/idempotency (F-01–F-04) | **CLOSED** | `d0ded6c`; complete dispatch/return claim before side effects |
| 30 | Dispatch claimed quantity (F-05) | **CLOSED** | `bbe89b4` |
| 31 | Date-aware availability / F-02 reserve | **CLOSED** | `8425661` |
| 32 | Reserve command integrity | **CLOSED** | `8425661` |
| 33 | Maintenance/repair claim-before-side-effects | **CLOSED** | `d0ded6c` + repair/maintenance cancel/complete/start claims @ HEAD |
| 34 | Invoice dispatch rollup truncation (F-31-03) | **CLOSED** | `6fc20be` |
| 35 | Payment invoice settlement concurrency (F-35-01) | **CLOSED** | `bd8b220`; `applyPaymentDelta` + payment claim |
| 36 | Maintenance cancellation reversal (F-36-01) | **CLOSED** | `2d61844` |
| 37 | Active invoice generation guard | **CLOSED** | `4e8527d` |
| 38 | Invoice issue/void concurrency (F-35-06) | **CLOSED** | `790cceb` |
| 39 | Pending payment over-commitment (F-36-03) | **CLOSED** | `6662ffe` |
| 40 | Cancel dispatch/return vs complete (N-40-01) | **CLOSED** | `44195a9` |
| 41 | Return receive/inspect concurrency (F-31-05) | **CLOSED @ 1934e37** | `receive-return.service.ts` / `inspect-return.service.ts` use `claimStatusTransition`; T41 7/7 |

---

## 3. Phase 41 Verification

| Requirement | Status | Evidence @ HEAD |
|-------------|--------|---------------|
| Receive uses `claimStatusTransition("DRAFT", …)` | **PASS** | `receive-return.service.ts` L60–76 |
| Inspect uses `claimStatusTransition("RECEIVED", …)` | **PASS** | `inspect-return.service.ts` L84–101 |
| Failed claim → `ConcurrentUpdateError` | **PASS** | Both services |
| Audit after claim | **PASS** | Audit logged against `claimed` |
| Complete/cancel unchanged | **PASS** | Phase 40 patterns intact |
| T41.1–T41.5 | **PASS** | `return.receive-inspect-concurrency.41.application.test.ts` |

**F-31-05: CLOSED @ 1934e37**

---

## 4. Current Findings Matrix

| ID | Severity | Area | Status | Evidence | Concurrency / bypass risk | Business impact |
| -- | -------- | ---- | ------ | -------- | ------------------------- | --------------- |
| **N-42-01** | **P1** | Dispatch mark-ready | **OPEN (new)** | `update-dispatch.service.ts` L183 — unconditional `updateStatus` on `markReady`; complete/cancel use `claimStatusTransition` | **High** — stale mark-ready vs complete/cancel | Stock OUT/RELEASE committed while dispatch regressed to READY/CANCELLED overwritten |
| **F-33-03** | P2 | Stock movement API bypass | **OPEN** | `POST /api/stock-movements` → `CreateStockMovementService`; all types; optional refs; WORKER `stockMovements.create` | Medium — RESERVE via API skips RO F-02 lock | Inventory/workflow desync; movement ledger uncoupled from workflow |
| **F-31-08** | P2 | Inventory PATCH bypass | **OPEN** | `update-inventory.service.ts` — absolute `repository.update`; WORKER `inventory.update` | Medium — lost-update vs atomic SQL deltas | Counter/ledger desync; no movement record |
| **F-33-01** | P2 | Invoice number scan cap | **OPEN** | `generate-invoice-number.ts` — `pageSize: 500` | Low — `@unique` on `invoiceNumber` | Wrong sequence proposal; retry/conflict, not silent dup |
| **F-37-R1** | P2 | Derived invoice status TOCTOU | **OPEN** | `applyPaymentToInvoice` — atomic `applyPaymentDelta`, then unconditional `updateStatus` | Medium — void∥post interleaving | Lifecycle/status inconsistency; **money fields authoritative** |
| **F-35-08** | P2 | Expense pay journal ordering | **DEFERRED** | `NoOpExpenseAccountingHook` @ HEAD in `create-expense-transaction.runner.ts` | Latent | No active production defect |
| **F-37-R2** | P3 | Invoice number pre-lock allocation | **OPEN** | Generate flow allocates before command lock | Low | Sequence gap on conflict |
| **F-11** | P3 | Authorization granularity | **OPEN** | WORKER: `inventory.update`, `stockMovements.create`, `inventory.adjust` | Enables F-33-03 / F-31-08 | Defense-in-depth |
| **F-09** | P3 | Repair orphan reference | **OPEN** | `Repair.returnInspectionItemId` — index only, no FK | N/A | Orphan rows at DB level |
| **F-07** | P3 | Ghost `DISPATCHED` RO enum | **OPEN** | Ephemeral dispatch completion status | N/A | Maintainability |
| **N-39-UI-01** | P3 | UI active-invoice hint | **OPEN** | `rental-order-billing-section.tsx` — `pageSize: 10` | N/A | UX hint wrong; API authoritative |
| **F-31-05** | — | Return receive/inspect | **CLOSED @ 1934e37** | Phase 41 | — | — |
| **N-40-01** | — | Cancel∥complete overwrite | **CLOSED @ 44195a9** | Phase 40 | — | — |

---

## 5. P0 Findings

**P0: NONE**

No committed path allows silent duplicate posted payment corruption, unguarded active-invoice duplication, return inspect∥complete stock regression (Phase 41), or cancel∥complete stock orphan on dispatch/return (Phase 40).

---

## 6. P1 Findings

### N-42-01 — Dispatch mark-ready vs complete/cancel asymmetric claims

**Committed vulnerable path:**

```
UpdateDispatchService (markReady=true)
  → findById
  → assertCanUpdate() on stale snapshot (DRAFT only)
  → withReady()
  → updateStatus(id, READY, { readyAt })   // unconditional
  → audit
```

**Hardened counterparts @ HEAD:**

| Command | Pattern |
|---------|---------|
| `CompleteDispatchService` | `claimStatusTransition(id, "READY", DISPATCHED)` **before** RELEASE/OUT stock; then `updateStatus` → COMPLETED |
| `CancelDispatchService` | `claimStatusTransition(id, ["DRAFT","READY"], CANCELLED)` |

**Critical race (markReady∥complete):**

```
Update reads DRAFT, markReady=true (slow)
        ↓
Peer marks READY (or same update wins READY)
        ↓
Complete claims READY → DISPATCHED
        ↓
Complete performs RELEASE + OUT stock movements
        ↓
Complete updateStatus → COMPLETED
        ↓
Stale update unconditional updateStatus → READY
        ↓
COMPLETED + committed stock → READY (no reversal)
```

**Additional race (markReady∥cancel):** stale mark-ready overwrites `CANCELLED → READY` (lifecycle corruption; no stock if cancel won before complete).

**Exploitability:** Normal legitimate concurrent dispatch operations (mark ready + complete/cancel); no malicious actor required.

**Concurrency tests:** **NONE** for mark-ready cross-workflow @ HEAD.

---

## 7. P2 Findings

| ID | Summary | Revalidation @ HEAD |
|----|---------|---------------------|
| **F-33-03** | Direct `POST /api/stock-movements` — all movement types (`OUT`, `IN`, `RESERVE`, `RELEASE`, `ADJUSTMENT`), optional `referenceType`/`referenceId`, permission `stockMovements.create` granted to **WORKER** | **OPEN** — architectural/policy + integrity bypass; not highest priority vs N-42-01 |
| **F-31-08** | `UpdateInventoryService` absolute `quantityOnHand` / `reservedQuantity` PATCH via `repository.update`; WORKER `inventory.update` | **OPEN** — bypasses movement ledger; requires deliberate API use |
| **F-33-01** | `generateNextInvoiceNumber` scans `findPaged({ pageSize: 500 })`; `invoiceNumber @unique` in schema | **OPEN** — scalability/sequence-gap; DB uniqueness prevents silent corruption |
| **F-37-R1** | After atomic `applyPaymentDelta`, derived status via unconditional `updateStatus` | **OPEN** — financial amounts correct; persisted lifecycle status can be stale under void∥post |
| **F-35-08** | Expense pay hook | **DEFERRED** — `NoOpExpenseAccountingHook` @ HEAD; WIP journal **not production** |

---

## 8. P3 Findings

| ID | Summary |
|----|---------|
| F-37-R2 | Invoice number allocated before generate lock — gap-only |
| F-11 | WORKER over-permissioned for direct inventory/stock mutation |
| F-09 | `Repair.returnInspectionItemId` lacks FK relation |
| F-07 | Ghost `DISPATCHED` rental-order enum |
| N-39-UI-01 | Billing UI `pageSize: 10` active-invoice client scan |

---

## 9. Historical Revalidation

| ID | Disposition | Notes @ `1934e37` |
|----|-------------|-------------------|
| F-31-05 | **CLOSED** | Phase 41 |
| N-40-01 | **CLOSED** | Phase 40 |
| F-31-10 | **SUBSUMED** | By N-40-01 |
| F-33-03 | **OPEN** | Unchanged; policy + integrity concern |
| F-31-08 | **OPEN** | Unchanged |
| F-33-01 | **OPEN** | Unchanged; `@unique` mitigates |
| F-37-R1 | **OPEN** | Unchanged |
| F-35-08 | **DEFERRED** | NoOp @ HEAD |
| F-37-R2, F-11, F-09, F-07, N-39-UI-01 | **OPEN** | Unchanged |

---

## 10. New Findings

| ID | Severity | Description |
|----|----------|-------------|
| **N-42-01** | **P1** | `UpdateDispatchService` `markReady` uses unconditional `updateStatus` while complete/cancel are claim-hardened — stock + lifecycle regression under concurrent legitimate usage |

**Lower-priority observations (not elevated to phase scope):**

- `ConvertMissingToLossService` uses unconditional `returnRepository.updateStatus` for item mutations on completed returns — admin invoice operation; limited concurrent surface (P3).
- `CompleteDispatchService` uses unconditional `updateStatus` for `DISPATCHED → COMPLETED` **after** authoritative READY claim and stock — protected against concurrent complete; vulnerable only to stale **markReady** (N-42-01).
- Expense/procurement/supplier-payment/journal services use unconditional `updateStatus` without stock side effects — status-ordering P3 family, not inventory-critical.

---

## 11. Financial Integrity (@ HEAD)

| Concern | Status |
|---------|--------|
| Posted settlement ≤ collectible balance | **INTACT** — Phase 35 `applyPaymentDelta` + payment claim |
| Pending commitments ≤ invoice balance | **INTACT** — Phase 39 |
| Active invoice guard | **INTACT** — Phase 37 |
| Issue/void concurrency | **INTACT** — Phase 38 |
| Derived invoice status authority | **WEAK (F-37-R1)** — money authoritative; status TOCTOU |

---

## 12. Inventory Integrity (@ HEAD)

| Concern | Status |
|---------|--------|
| Return complete stock effects | **INTACT** — Phase 41 receive/inspect + Phase 40 cancel + Phase 29 complete claims |
| Dispatch complete stock effects | **AT RISK (N-42-01)** — stale mark-ready can regress status post-stock |
| Direct stock movement API | **OPEN (F-33-03)** — WORKER-accessible bypass |
| Direct inventory PATCH | **OPEN (F-31-08)** — absolute counter writes |
| `quantityOnHand >= 0`, `reservedQuantity >= 0` | Enforced on **workflow movement SQL**; bypassable via F-31-08/F-33-03 |

---

## 13. Workflow Integrity — Cross-Workflow Survey

| Race pair | Verdict @ HEAD |
|-----------|----------------|
| return receive ↔ inspect ↔ complete ↔ cancel | **CLOSED** (Phase 41 + 40 + 29) |
| dispatch cancel ↔ complete | **CLOSED** (Phase 40) |
| dispatch markReady ↔ complete | **OPEN (N-42-01)** |
| dispatch markReady ↔ cancel | **OPEN (N-42-01)** — CANCELLED overwrite |
| payment pending ↔ post ↔ void | **CLOSED** (Phases 39, 35, 38) |
| invoice issue ↔ void | **CLOSED** (Phase 38) |
| maintenance/repair lifecycle | **CLOSED** (Phases 33, 36) |

---

## 14. Authorization / Bypass

| Surface | Permission @ HEAD | Classification |
|---------|-------------------|----------------|
| `POST /api/stock-movements` | `stockMovements.create` (**WORKER**) | **F-33-03** — integrity bypass unless policy-intended |
| `PATCH /api/inventory/:id` | `inventory.update` (**WORKER**) | **F-31-08** |
| Dispatch update markReady | Standard dispatch update permission | **N-42-01** — concurrency defect, not auth bypass |
| `inventory.adjust` | UI route gate only (**F-11**) | Defense-in-depth |

---

## 15. Schema / Database

| Item | Status |
|------|--------|
| `invoiceNumber @unique` | Mitigates F-33-01 silent duplicate |
| `Repair.returnInspectionItemId` | **OPEN (F-09)** — no FK |
| Phase 41 schema changes | **NONE** |
| New schema gaps | **NONE beyond F-09** |

**Schema changes: NONE**  
**Migration changes: NONE**

---

## 16. Deferred Findings

| ID | Reason |
|----|--------|
| **F-35-08** | `NoOpExpenseAccountingHook` @ committed HEAD — journal orphan risk latent until WIP journal hook ships |

---

## 17. Ranking Rationale — Top 3 Candidates

### 1. N-42-01 (selected) — P1

| Dimension | Assessment |
|-----------|------------|
| Defect | Unconditional mark-ready vs atomic complete/cancel |
| Likelihood | **High** — normal concurrent dispatch workflow |
| Impact | **Stock committed + lifecycle regressed** |
| Exploitability | Legitimate double-submit / parallel operators |
| Fix complexity | **Low** — mirror Phase 41 `claimStatusTransition(DRAFT, READY)` |
| Policy lock | **Not required** |

### 2. F-33-03 — P2

| Dimension | Assessment |
|-----------|------------|
| Defect | Direct stock-movement API bypasses workflow invariants |
| Likelihood | Medium — requires WORKER permission or admin action |
| Impact | Inventory/workflow desync |
| Policy | **Decision lock required** — admin bypass vs workflow-only |
| Why lower than N-42-01 | Deliberate API path + permission model; no standard workflow race prerequisite; does not regress status after irreversible workflow stock effects through paired commands |

### 3. F-31-08 — P2

| Dimension | Assessment |
|-----------|------------|
| Defect | Absolute inventory counter PATCH without movement ledger |
| Likelihood | Medium — WORKER `inventory.update` |
| Impact | Counter/ledger desync |
| Why lower than N-42-01 | Separate admin bypass; no cross-workflow command race |
| vs F-33-03 | F-33-03 creates movements (partial audit trail) and simulates workflow stages; F-31-08 has zero ledger. **Rank F-33-03 slightly above F-31-08** for workflow coupling impact |

**F-37-R1** remains P2 below bypass findings — money fields stay authoritative via `applyPaymentDelta`; impact is derived lifecycle status only.

**F-33-01** remains P2 scalability — `@unique` prevents corruption.

---

## 18. Top Priority & Recommended Next Phase

### Phase 42 — Dispatch Mark-Ready Concurrency

| Item | Detail |
|------|--------|
| **Target finding** | **N-42-01** |
| **Objective** | Replace unconditional `updateStatus` on `markReady` with `claimStatusTransition(id, "DRAFT", READY)`; audit after claim; 409 on conflict |
| **Affected modules** | `update-dispatch.service.ts`, dispatch repository (existing primitive), dispatch concurrency tests |
| **Expected tests** | markReady∥complete (stock invariant), markReady∥cancel, duplicate markReady, audit rollback |
| **Schema impact** | **NONE** |
| **Decision lock** | **NOT required** |

**F-33-03 decision lock:** Defer until Phase 42+ when stock-movement API policy becomes the top priority. Questions: restrict movement types, mandate workflow refs, tighten WORKER role, or document as intentional admin capability.

---

## 19. Tests Executed

```text
node --env-file=.env ./node_modules/vitest/vitest.mjs run \
  return.receive-inspect-concurrency.41 \
  dispatch.cancel-concurrency.40 \
  payment.pending-over-commitment.39 \
  payment-invoice-settlement-concurrency.35 \
  rental-invoice.issue-void-concurrency.38
→ Test Files  5 passed (5)
→ Tests       44 passed (44)

node --env-file=.env ./node_modules/vitest/vitest.mjs run
→ Test Files  208 passed (208)
→ Tests       3119 passed (3119)
```

---

## 20. Git Safety

| Check | Status |
|-------|--------|
| Production implementation | **NO** |
| Commit created | **NO** |
| Push performed | **NO** |
| Destructive Git operations | **NO** |
| Existing WIP preserved | **YES** |

---

*End of Post-Phase-41 Enterprise Gap Audit*
