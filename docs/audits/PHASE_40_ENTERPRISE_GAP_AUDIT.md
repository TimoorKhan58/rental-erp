# Post-Phase-40 Enterprise Gap Audit Report

**Date:** 2026-08-30  
**Baseline HEAD:** `44195a90ec74865a8a6134fde1aa4d1f1dd47617` — `fix(workflow): harden cancel concurrency`  
**Branch:** `main` (ahead of `origin/main` by **7** commits)  
**Push:** NO  
**Mode:** Audit only — no production implementation

---

## Executive Verdict

**AUDIT COMPLETE — NEXT PHASE IDENTIFIED**

| Item | Value |
|------|-------|
| **Next highest-priority finding** | **F-31-05** — Return receive/inspect unconditional status writes racing hardened cancel/complete |
| **Severity** | **P1** (reclassified from P2 after Phase 40) |
| **Origin** | **Historical finding — RECLASSIFIED** (not a new ID) |

Phase 40 closed cancel∥complete overwrite on dispatch/return (`N-40-01`). The symmetric gap remains on **receive** and **inspect**: they still use unconditional `updateStatus` while **cancel** and **complete** use atomic `claimStatusTransition` with irreversible side effects on complete. A stale receive/inspect command can regress terminal states (`CANCELLED` or `COMPLETED`) and, in the inspect∥complete interleaving, leave **stock movements committed** while the return lifecycle is rolled back to `INSPECTED`.

**P0:** NONE  
**P1:** F-31-05 (one finding)

---

## 1. Baseline

| Item | Value |
|------|-------|
| **HEAD** | `44195a90ec74865a8a6134fde1aa4d1f1dd47617` |
| **Previous HEAD** | `6662ffe` — pending payment over-commitment (Phase 39) |
| **Branch** | `main` |
| **Origin divergence** | Ahead of `origin/main` by **7** commits (`0 7`) |
| **Push** | **NO** |
| **Audit scope** | Committed production code at HEAD only (`git show HEAD:`) |
| **WIP state** | ~90+ modified tracked files + large untracked set (UI, accounting, journal posting, seeds, phase staging dirs, prior audit docs). **Excluded from production classification.** |
| **Destructive Git ops** | **NONE** performed during audit |

---

## 2. Phase 28–40 Verification Matrix

| Phase | Finding | Status | Evidence |
| ----- | ------- | ------ | -------- |
| 28 | Mixed return source × condition (F-28) | **CLOSED** | `e963a8b` — external-rental mixed return attribution |
| 29 | Workflow command concurrency/idempotency (F-01–F-04) | **CLOSED** | `d0ded6c`; complete dispatch/return claim before side effects |
| 30 | Dispatch claimed quantity (F-05) | **CLOSED** | `bbe89b4`; claimed-quantity integrity tests |
| 31 | Date-aware availability / F-02 reserve | **CLOSED** | `8425661`; availability + reserve hardening |
| 32 | Reserve command integrity | **CLOSED** | `8425661`; sorted inventory locks + reserve path |
| 33 | Maintenance/repair claim-before-side-effects | **CLOSED** | `d0ded6c` + maintenance/repair `claimStatusTransition` in cancel/complete services @ HEAD |
| 34 | Dispatch rollup truncation (F-31-03) | **CLOSED** | `6fc20be` |
| 35 | Payment invoice settlement concurrency (F-35-01) | **CLOSED** | `bd8b220`; `applyPaymentDelta` + payment claim; T35 tests pass |
| 36 | Maintenance cancellation reversal (F-36-01) | **CLOSED** | `2d61844`; post-claim `startedAt` gate |
| 37 | Active invoice generation guard (F-36-02, F-33-02, F-35-05) | **CLOSED** | `4e8527d`; lock + `findActiveByRentalOrderId` |
| 38 | Invoice issue/void concurrency (F-35-06) | **CLOSED** | `790cceb`; issue/void `claimStatusTransition`; T38 tests pass |
| 39 | Pending payment over-commitment (F-36-03) | **CLOSED** | `6662ffe`; `lockForPaymentCommitment` + pending sum; T39 tests pass |
| 40 | Dispatch/return cancel-vs-complete concurrency (N-40-01, F-31-10) | **CLOSED @ 44195a9** | `cancel-dispatch.service.ts` / `cancel-return.service.ts` use `claimStatusTransition`; T40 tests pass |

---

## 3. Phase 40 Verification

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Cancel dispatch uses expected-status claim | **PASS** | `claimStatusTransition(id, ["DRAFT","READY"], CANCELLED)` @ HEAD |
| Cancel return uses expected-status claim | **PASS** | `claimStatusTransition(id, ["DRAFT","RECEIVED","INSPECTED"], CANCELLED)` @ HEAD |
| Failed claim → `ConcurrentUpdateError` (409) | **PASS** | Both cancel services throw on `claimed === null` |
| Audit after authoritative claim | **PASS** | Audit logged against `claimed` record |
| No stock side effects on cancel | **PASS** | Cancel paths audit-only after claim |
| Complete paths unchanged (claim before stock) | **PASS** | `complete-dispatch.service.ts` / `complete-return.service.ts` |
| T40.1–T40.5 concurrent tests | **PASS** | `dispatch.cancel-concurrency.40.application.test.ts` |

**N-40-01: CLOSED @ 44195a9**  
**F-31-10: SUBSUMED** by N-40-01 / Phase 40

---

## 4. Complete Findings Matrix

| ID | Severity | Area | Status | Evidence | Concurrency Risk | Business Impact |
| -- | -------- | ---- | ------ | -------- | ---------------- | --------------- |
| **F-31-05** | **P1** | Return receive/inspect | **OPEN (RECLASSIFIED ↑)** | `receive-return.service.ts` L58, `inspect-return.service.ts` L82 — unconditional `updateStatus`; `prisma-return.repository.ts` `updateStatus` has no expected-status predicate | **High** — stale receive/inspect vs hardened cancel/complete | **inspect∥complete:** stock IN/RELEASE committed while status regresses COMPLETED→INSPECTED; **receive∥cancel / inspect∥cancel:** CANCELLED overwritten |
| **F-33-03** | P2 | Stock movement API bypass | **OPEN** | `POST /api/stock-movements` → `CreateStockMovementService` → `executeCreateStockMovementInScope`; all movement types; optional refs; WORKER has `stockMovements.create` | Medium — RESERVE lacks RO F-02 lock when via API | Inventory counters mutate outside dispatch/return/RO workflow boundaries |
| **F-31-08** | P2 | Inventory PATCH bypass | **OPEN** | `update-inventory.service.ts` — absolute `repository.update`; schema allows `quantityOnHand` / `reservedQuantity`; WORKER has `inventory.update` | Medium — lost-update vs workflow SQL deltas | Counter/ledger desync; no movement record |
| **F-33-01** | P2 | Invoice numbering scan cap | **OPEN** | `generate-invoice-number.ts` — `findPaged({ pageSize: 500 })` | Low — `@unique` on `invoiceNumber` prevents silent dup | Wrong sequence proposal when >500 invoices in sort window; retry/conflict not silent corruption |
| **F-37-R1** | P2 | Derived invoice status TOCTOU | **OPEN** | `payment-invoice.validation.ts` — `applyPaymentDelta` atomic, then unconditional `updateStatus` for derived status | Medium — void∥post / issue∥settlement interleaving | Lifecycle/status inconsistency; **money fields remain authoritative** via `applyPaymentDelta` |
| **F-35-08** | P2 | Expense pay journal ordering | **DEFERRED** | `create-expense-transaction.runner.ts` — `NoOpExpenseAccountingHook` @ HEAD; WIP journal integration **not production** | Latent when journal hook enabled | Orphan journal risk **not active** in committed production |
| **F-37-R2** | P3 | Invoice number pre-lock allocation | **OPEN** | Number generated before invoice command lock in generate flow | Low | Sequence gap on conflict; no duplicate active invoice |
| **F-11** | P3 | Authorization granularity | **OPEN** | WORKER: `inventory.update`, `inventory.adjust`, `stockMovements.create` @ `role-permissions.ts` | Enables F-33-03 / F-31-08 surfaces | Over-privileged direct mutation; defense-in-depth |
| **F-09** | P3 | Repair orphan reference | **OPEN** | `Repair.returnInspectionItemId` — `@@index` only, no `@relation` FK in `schema.prisma` | N/A | Orphan repair rows possible at DB level |
| **F-07** | P3 | Ghost `DISPATCHED` RO enum | **OPEN** | `rental-order.types.ts` / domain rules treat `DISPATCHED` as non-commitment; ephemeral dispatch completion uses DISPATCHED | N/A | Maintainability / analytics confusion; not active lifecycle corruption |
| **N-39-UI-01** | P3 | UI active-invoice hint | **OPEN** | `rental-order-billing-section.tsx` @ HEAD — `pageSize: 10` client scan | N/A | Misleading generate hint; **API 409 remains authoritative**; no unsafe mutation |
| **N-40-01** | — | Cancel∥complete overwrite | **CLOSED @ 44195a9** | Phase 40 | — | — |
| **F-31-10** | — | Cancel same-op duplicate audit | **SUBSUMED** | Phase 40 | — | — |

---

## 5. P0 Findings

**P0: NONE**

At committed HEAD, no path was found that allows:
- Silent duplicate posted payment money corruption (Phase 35 `applyPaymentDelta` + payment claim intact)
- Unguarded active-invoice duplication (Phase 37 lock + guard intact)
- Cancel∥complete stock orphan on dispatch/return (Phase 40 claim intact)
- Pending payment over-commitment (Phase 39 lock + pending sum intact)

---

## 6. P1 Findings

### F-31-05 — Return receive/inspect vs cancel/complete asymmetric claims (RECLASSIFIED P1)

**Committed path (vulnerable):**

```
ReceiveReturnService / InspectReturnService
  → findById
  → domain withReceived() / withInspected() on stale snapshot
  → updateStatus (unconditional — no expected-status predicate)
  → audit
```

**Hardened counterparts @ HEAD:**

| Command | Pattern |
|---------|---------|
| `CancelReturnService` | `claimStatusTransition(id, ["DRAFT","RECEIVED","INSPECTED"], CANCELLED)` |
| `CompleteReturnService` | `claimStatusTransition(id, "INSPECTED", COMPLETED)` **before** RELEASE/IN stock movements |

**Race interleavings (committed production):**

1. **inspect∥complete (highest impact):**
   - Return at `RECEIVED`; Inspect A reads `RECEIVED` (slow).
   - Inspect B (or A) `updateStatus` → `INSPECTED`.
   - Complete claims `INSPECTED→COMPLETED`, executes stock side effects (RELEASE/IN, external custody, RO sync).
   - Inspect A stale write `updateStatus` → overwrites `COMPLETED` back to `INSPECTED` **without reversing stock**.

2. **receive∥cancel:**
   - Return at `DRAFT`; receive reads `DRAFT`; cancel claims `DRAFT→CANCELLED`.
   - Receive unconditional write overwrites `CANCELLED→RECEIVED`.

3. **inspect∥cancel:**
   - Return at `RECEIVED`; inspect reads `RECEIVED`; cancel claims `RECEIVED→CANCELLED`.
   - Inspect unconditional write overwrites `CANCELLED→INSPECTED`.

**Why reclassified after Phase 40:** Prior audits rated F-31-05 P2 citing “no stock side effects on receive/inspect steps.” That assessed only intra-step races. Phase 40 hardened **cancel** but left **receive/inspect** unconditional, creating the same asymmetric pattern N-40-01 had between cancel and complete — now with **complete’s irreversible stock effects** exposed to inspect regression.

**Concurrency tests:** **NONE** for receive/inspect cross-workflow races @ HEAD.

---

## 7. P2 / P3 Findings (Summary)

### P2 (open)

| ID | Summary |
|----|---------|
| F-33-03 | Direct `POST /api/stock-movements` — all types, optional workflow refs, WORKER-accessible |
| F-31-08 | `PATCH` inventory absolute counter writes bypass movement ledger |
| F-33-01 | Invoice number scan capped at 500; `@unique` mitigates duplicate insert |
| F-37-R1 | Derived invoice status unconditional after atomic payment delta |
| F-35-08 | **DEFERRED** — NoOp accounting hook @ HEAD; latent when WIP journal lands |

### P3 (open)

| ID | Summary |
|----|---------|
| F-37-R2 | Invoice number allocated before command lock — gap-only |
| F-11 | WORKER over-permissioned for direct inventory/stock APIs |
| F-09 | `Repair.returnInspectionItemId` lacks FK relation |
| F-07 | Ghost `DISPATCHED` rental-order enum — maintainability |
| N-39-UI-01 | Billing UI `pageSize: 10` active-invoice hint — UX only |

---

## 8. Historical Revalidation

| ID | Disposition | Notes @ `44195a9` |
|----|-------------|-------------------|
| F-33-03 | **OPEN** | Unchanged; WORKER + optional refs + all movement types |
| F-31-08 | **OPEN** | Unchanged; absolute PATCH path |
| F-33-01 | **OPEN** | Unchanged; `pageSize: 500` |
| F-35-08 | **DEFERRED** | `NoOpExpenseAccountingHook` — no active integrity defect |
| F-37-R1 | **OPEN** | Unchanged; money authoritative, status TOCTOU |
| F-37-R2 | **OPEN** | Unchanged |
| F-31-05 | **OPEN — RECLASSIFIED P1** | Post-Phase-40 cross-workflow impact elevation |
| F-11 | **OPEN** | Unchanged |
| F-09 | **OPEN** | Unchanged |
| F-07 | **OPEN** | Unchanged |
| N-39-UI-01 | **OPEN** | Confirmed @ committed `rental-order-billing-section.tsx` |
| N-40-01 | **CLOSED** | Phase 40 @ `44195a9` |
| F-31-10 | **SUBSUMED** | By N-40-01 / Phase 40 |

---

## 9. New Findings

**No new finding IDs (N-41-XX) warranted.**

The F-31-05 elevation documents a severity reassessment of an existing finding exposed by Phase 40’s asymmetric hardening — not a separately undiscovered defect class. No additional committed-production integrity gaps were found that exceed F-31-05 in priority after full revalidation.

---

## 10. Top Priority Analysis

### Candidate 1 — F-31-05 (selected next)

| Dimension | Assessment |
|-----------|------------|
| **Defect** | Unconditional `updateStatus` on receive/inspect vs atomic cancel/complete |
| **Likelihood** | **High** under normal concurrent warehouse operations (no malicious actor) |
| **Impact** | **Inventory + lifecycle corruption** when complete stock effects precede stale inspect write |
| **Concurrency risk** | **High** — proven asymmetric pattern (same family as closed N-40-01) |
| **Exploitability** | Two legitimate operators / double-submit / retry — no special permissions |
| **Fix complexity** | **Low** — mirror Phase 40 `claimStatusTransition` pattern |
| **Decision lock** | **Not required** — clear engineering fix |

### Candidate 2 — F-33-03

| Dimension | Assessment |
|-----------|------------|
| **Defect** | Direct stock-movement API bypasses workflow invariants |
| **Likelihood** | Medium — requires WORKER+ permission or compromised account |
| **Impact** | Inventory counter corruption, RO/dispatch/return desync |
| **Concurrency risk** | Medium for RESERVE without F-02 lock |
| **Exploitability** | Intentional or mistaken API use; may be admin-intended |
| **Fix complexity** | Medium — policy choice (restrict types, mandatory refs, role change) |
| **Decision lock** | **Required** — admin bypass vs workflow-only policy |

**Why F-31-05 outranks F-33-03:** F-31-05 causes **irreversible stock side effects with lifecycle regression** through normal concurrent workflow commands. F-33-03 requires direct API misuse or broad WORKER permissions and is partly a **policy** question. Financial/inventory corruption from inspect∥complete exceeds authorization-bypass scenarios that need deliberate action.

### Candidate 3 — F-31-08

| Dimension | Assessment |
|-----------|------------|
| **Defect** | Absolute inventory counter PATCH without movement ledger |
| **Likelihood** | Medium — WORKER `inventory.update` |
| **Impact** | Counter/ledger desync |
| **Concurrency risk** | Medium lost-update vs atomic SQL deltas |
| **Exploitability** | Deliberate PATCH or admin correction |
| **Fix complexity** | Medium — may need admin-only policy or ledger-enforced adjustments |
| **Decision lock** | Possibly required for admin override semantics |

**Why F-31-05 outranks F-31-08:** F-31-05 corrupts state through **standard return workflow commands** in combination with hardened complete/cancel. F-31-08 is a separate administrative bypass surface with no workflow race prerequisite.

---

## 11. Cross-Workflow Race Survey (@ HEAD)

| Race pair | Loser behavior | Verdict |
|-----------|----------------|---------|
| dispatch cancel ↔ complete | 409 on losing cancel/complete | **CLOSED** (Phase 40) |
| return cancel ↔ complete | 409 on losing cancel/complete | **CLOSED** (Phase 40) |
| return receive ↔ cancel | Stale receive overwrites CANCELLED | **OPEN (F-31-05)** |
| return inspect ↔ cancel | Stale inspect overwrites CANCELLED | **OPEN (F-31-05)** |
| return inspect ↔ complete | Stale inspect overwrites COMPLETED after stock | **OPEN (F-31-05)** |
| return receive ↔ inspect | Duplicate audit / last-writer on timestamps | **OPEN (F-31-05, lower)** |
| payment create ↔ update pending | Invoice lock + pending sum | **CLOSED** (Phase 39) |
| payment post ↔ void settlement | Payment claim + `applyPaymentDelta` | **CLOSED** (Phase 35) |
| invoice issue ↔ void | Atomic status claims | **CLOSED** (Phase 38) |
| invoice issue ↔ payment | Eligibility guards + settlement path | **CLOSED** (Phases 35/37/38) |
| maintenance cancel ↔ complete | Claim-before-side-effects | **CLOSED** (Phases 33/36) |
| repair cancel ↔ complete | Claim-before-side-effects | **CLOSED** (Phase 33) |
| direct stock movement API | No workflow guard | **OPEN (F-33-03)** |
| inventory PATCH | No ledger enforcement | **OPEN (F-31-08)** |

---

## 12. Inventory / Stock Integrity (@ HEAD)

| Invariant | Workflow paths | Direct bypass paths |
|-----------|------------------|---------------------|
| `quantityOnHand >= 0` | Enforced in movement SQL scopes | **F-31-08** absolute PATCH; **F-33-03** API |
| `reservedQuantity >= 0` | RESERVE/RELEASE atomic SQL | **F-31-08**, **F-33-03** |
| `reservedQuantity <= quantityOnHand` | Movement scopes | **F-31-08** PATCH can break |
| Ledger consistency | Workflow commands create movements | **F-33-03**, **F-31-08** bypass ledger intent |
| Return complete stock effects | Claim-before-side-effects on complete | **F-31-05** inspect can regress status post-stock |

Phase 28 source × condition attribution on complete-return remains intact @ HEAD (separate from F-31-05).

---

## 13. Financial Integrity (@ HEAD)

| Concern | Status | Evidence |
|---------|--------|----------|
| Posted settlement ≤ collectible balance | **INTACT** | `applyPaymentDelta` + payment claim |
| Pending commitments ≤ invoice balance | **INTACT** | Phase 39 lock + `sumPendingAmountByRentalInvoiceId` |
| Active invoice uniqueness | **INTACT** | Phase 37 guard |
| Issue/void concurrency | **INTACT** | Phase 38 claims |
| Derived invoice status authority | **WEAK (F-37-R1)** | Status TOCTOU; amounts authoritative |

---

## 14. Authorization / Bypass Surfaces

| Surface | Permission | Classification |
|---------|------------|----------------|
| `POST /api/stock-movements` | `stockMovements.create` (WORKER) | **F-33-03** — genuine integrity bypass unless policy-intended |
| `PATCH /api/inventory/:id` | `inventory.update` (WORKER) | **F-31-08** — genuine bypass / admin capability ambiguity |
| Return receive/inspect | Standard workflow permissions | **F-31-05** — not auth bypass; concurrency defect |
| `inventory.adjust` | UI route gate only (F-11) | Defense-in-depth concern |

---

## 15. Schema / Database Integrity

| Item | Status |
|------|--------|
| `Repair.returnInspectionItemId` | **OPEN (F-09)** — indexed UUID, no FK to `ReturnInspectionItem` |
| `invoiceNumber @unique` | Mitigates F-33-01 silent duplicate |
| Phase 40 schema changes | **NONE** |
| New schema gaps discovered | **NONE beyond F-09** |

**Schema changes: NONE**  
**Migration changes: NONE**

---

## 16. Concurrency Test Quality

| Area | Test file | Quality @ HEAD |
|------|-----------|----------------|
| Phase 40 cancel∥complete | `dispatch.cancel-concurrency.40.application.test.ts` | **Valid** — `Promise.allSettled`, interleaving gates |
| Phase 39 pending commitment | `payment.pending-over-commitment.39.application.test.ts` | **Valid** — concurrent create/update |
| Phase 35 settlement | `payment-invoice-settlement-concurrency.35.application.test.ts` | **Valid** — concurrent post |
| Phase 38 issue/void | `rental-invoice.issue-void-concurrency.38.application.test.ts` | **Valid** — concurrent issue/void |
| Return receive/inspect | **NONE** | **Missing** — F-31-05 untested |

---

## 17. Recommended Next Phase

### Phase 41 — Return Receive/Inspect Concurrency

| Item | Detail |
|------|--------|
| **Target finding** | **F-31-05** |
| **Objective** | Atomic expected-status claims on receive (`DRAFT→RECEIVED`) and inspect (`RECEIVED→INSPECTED`); audit after claim; 409 on conflict |
| **Affected modules** | `receive-return.service.ts`, `inspect-return.service.ts`, `prisma-return.repository.ts` (reuse existing `claimStatusTransition`), return transaction tests |
| **Recommended strategy** | Mirror Phase 40 pattern; no new schema |
| **Expected tests** | T41.1 receive∥cancel, T41.2 inspect∥cancel, T41.3 inspect∥complete (with stock side-effect assertion — complete wins, inspect gets 409, status stays COMPLETED, stock single-applied) |
| **Schema impact** | **NONE** |
| **Migration impact** | **NONE** |
| **Decision lock required?** | **NO** — same engineering pattern as Phase 40 |

---

## 18. Tests Executed

Exact commands and results (audit pass):

```text
npm test -- --run dispatch.cancel-concurrency.40 payment.pending-over-commitment.39
→ Test Files  2 passed (2)
→ Tests       22 passed (22)

npm test -- --run payment-invoice-settlement-concurrency.35 rental-invoice.issue-void-concurrency.38
→ Test Files  2 passed (2)
→ Tests       15 passed (15)
```

**Total targeted verification: 37/37 PASS**

Full suite (3112 tests) **not re-run** during this audit pass.

---

## 19. Git Safety

| Check | Status |
|-------|--------|
| Production implementation | **NO** |
| Commit created | **NO** |
| Push performed | **NO** |
| Destructive Git operations | **NO** |
| Existing WIP preserved | **YES** |

---

*End of Post-Phase-40 Enterprise Gap Audit*
