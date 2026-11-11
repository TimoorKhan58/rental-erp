# Post-Phase-42 Enterprise Gap Audit Report

**Date:** 2026-08-30  
**Baseline HEAD:** `a422e01a25a4c6a324a597dd50ee3f04c72d929e` — `fix(dispatch): harden mark-ready concurrency`  
**Branch:** `main` (ahead of `origin/main` by **9** commits)  
**Push:** NO  
**Mode:** Audit only — no production implementation

---

## 1. Executive Verdict

**AUDIT COMPLETE**

| Item | Value |
|------|-------|
| **Highest-priority finding** | **F-31-08** — Inventory PATCH absolute counter mutation bypasses stock-movement ledger |
| **Severity** | **P2** |
| **Origin** | **Historical — RECLASSIFIED as top P2** (fresh ranking; not auto-selected F-33-03) |
| **Recommended next phase** | **Phase 43 — Inventory PATCH Ledger Integrity** |

After Phase 42, **no P0 or P1 committed-production workflow concurrency defects** were found in dispatch/return/payment/invoice hardened paths. Remaining risk is concentrated in **direct mutation bypass surfaces** (inventory PATCH, stock-movement API). Fresh analysis ranks **F-31-08 above F-33-03** because absolute `quantityOnHand` / `reservedQuantity` writes leave **no movement ledger** and can desync counters from all workflow-hardened SQL delta paths; F-33-03 at least records movements and applies atomic movement SQL.

**P0:** NONE  
**P1:** NONE

---

## 2. Baseline

| Item | Value |
|------|-------|
| **HEAD** | `a422e01` |
| **Branch** | `main` |
| **Origin divergence** | Ahead of `origin/main` by **9** commits (`0 9`) |
| **Push** | **NO** |
| **Audit scope** | Committed production @ HEAD only (`git show HEAD:`) |
| **WIP state** | ~142 modified/untracked paths (UI, accounting, payment journal, seeds, audit docs, etc.) — **excluded** |
| **Destructive Git ops** | **NONE** |

---

## 3. Phase 28–42 Verification Matrix

| Phase | Finding | Status | Evidence @ HEAD |
| ----- | ------- | ------ | --------------- |
| 28 | Mixed return source × condition | **CLOSED** | `e963a8b`; Phase 28 tests / domain rules intact |
| 29 | Workflow command concurrency (F-01–F-04) | **CLOSED** | Complete dispatch/return claim before side effects |
| 30 | Dispatch claimed quantity (F-05) | **CLOSED** | `bbe89b4` |
| 31 | Date-aware availability / F-02 | **CLOSED** | `8425661` |
| 32 | Reserve command integrity | **CLOSED** | `8425661` |
| 33 | Maintenance/repair claims | **CLOSED** | start/complete/cancel use `claimStatusTransition` |
| 34 | Dispatch rollup truncation (F-31-03) | **CLOSED** | `6fc20be` |
| 35 | Payment settlement (F-35-01) | **CLOSED** | `applyPaymentDelta` + payment claim |
| 36 | Maintenance cancel reversal (F-36-01) | **CLOSED** | `2d61844` |
| 37 | Active invoice guard (F-36-02, F-33-02, F-35-05) | **CLOSED** | `4e8527d` |
| 38 | Invoice issue/void (F-35-06) | **CLOSED** | issue/void `claimStatusTransition` |
| 39 | Pending payment commitment (F-36-03) | **CLOSED** | `6662ffe` |
| 40 | Cancel∥complete (N-40-01) | **CLOSED** | `44195a9` |
| 41 | Return receive/inspect (F-31-05) | **CLOSED** | `1934e37`; receive/inspect claims |
| 42 | Dispatch mark-ready (N-42-01) | **CLOSED @ a422e01** | `update-dispatch.service.ts` L186 — `claimStatusTransition("DRAFT", READY)` |

**Regression:** No closed phase showed committed regression at HEAD.

---

## 4. Complete Findings Matrix

| ID | Severity | Status | Area | Evidence @ HEAD | Concurrency risk | Business impact | Recommended action |
| -- | -------- | ------ | ---- | --------------- | ---------------- | --------------- | ------------------ |
| **F-31-08** | **P2** | **OPEN (↑ top P2)** | Inventory PATCH | `update-inventory.service.ts` → `repository.update`; `PATCH` route `inventory.update`; WORKER permission | Medium lost-update vs workflow SQL | Absolute counter desync; **no movement ledger** | Phase 43: ledger-bind or restrict PATCH |
| **F-33-03** | P2 | OPEN | Stock movement API | `POST /api/stock-movements` → `CreateStockMovementService`; all types; optional refs; WORKER `stockMovements.create` | Medium (RESERVE skips RO F-02 lock) | Workflow/inventory desync; movement recorded | Phase 44+ after policy lock |
| **F-33-01** | P2 | OPEN | Invoice numbering | `generate-invoice-number.ts` — `pageSize: 500` | Low; `@unique` on `invoiceNumber` | Wrong sequence proposal; retry on conflict | Sequence table or uncapped scan |
| **F-37-R1** | P2 | OPEN | Derived invoice status | `applyPaymentToInvoice` — atomic delta then unconditional `updateStatus` | Medium void∥post | Status/lifecycle stale; **money authoritative** | Conditional status claim or derive read-only |
| **F-35-08** | P2 | DEFERRED | Expense pay journal | `NoOpExpenseAccountingHook` @ HEAD | Latent | No active production defect | Defer until journal WIP lands |
| **F-37-R2** | P3 | OPEN | Invoice number pre-lock | Generate allocates before command lock | Low | Sequence gap only | Accept or reorder lock |
| **F-11** | P3 | OPEN | RBAC granularity | WORKER: `inventory.update`, `stockMovements.create`, `inventory.adjust` | Enables bypass | Defense-in-depth | Tighten with Phase 43/44 |
| **F-09** | P3 | OPEN | Repair FK gap | `Repair.returnInspectionItemId` — index only | N/A | Orphan repair rows | Optional FK migration |
| **F-07** | P3 | OPEN | Ghost `DISPATCHED` enum | Ephemeral dispatch/RO enum artifact | N/A | Maintainability | Cleanup when safe |
| **N-39-UI-01** | P3 | OPEN | UI active-invoice hint | `rental-order-billing-section.tsx` `pageSize: 10` | N/A | UX hint wrong; API authoritative | Raise pageSize or server hint |
| **N-42-01** | — | **CLOSED** | Dispatch mark-ready | Phase 42 @ `a422e01` | — | — | — |
| **N-40-01, F-31-05** | — | **CLOSED** | Prior P1 races | Phases 40–41 | — | — | — |

---

## 5. P0 Findings

**P0: NONE**

No committed path at HEAD allows silent duplicate posted payment money corruption, unguarded active-invoice duplication, or stale workflow command regression after irreversible stock side effects on hardened dispatch/return complete/cancel/mark-ready/receive/inspect paths.

---

## 6. P1 Findings

**P1: NONE**

Cross-workflow survey @ HEAD found no remaining asymmetric pattern where:
- a hardened command performs irreversible stock effects under atomic claim, **and**
- a peer command still uses unconditional `updateStatus` on the same entity lifecycle, **and**
- legitimate concurrent operators can reach the interleaving.

Phase 42 closed the last known dispatch mark-ready gap. Return receive/inspect (Phase 41) and cancel∥complete (Phase 40) remain closed.

**Note:** `CompleteDispatchService` still uses unconditional `updateStatus` for `DISPATCHED → COMPLETED` **after** the authoritative `READY` claim and stock effects (same transaction). No other committed command performs unconditional status writes against `DISPATCHED`/`COMPLETED` dispatch states; this is **not elevated to P1**.

---

## 7. P2 / P3 Findings (Ranked)

### P2 (by risk)

1. **F-31-08** — absolute inventory PATCH without ledger (**top**)
2. **F-33-03** — direct stock-movement API workflow bypass (co-close second; policy-heavy)
3. **F-37-R1** — derived invoice status TOCTOU (financial amounts safe)
4. **F-33-01** — invoice number scan cap (`@unique` mitigates corruption)
5. **F-35-08** — **DEFERRED** (NoOp hook)

### P3

F-37-R2 → F-11 → F-09 → F-07 → N-39-UI-01

---

## 8. New Findings

**No new finding IDs (N-43-XX) warranted.**

Post-Phase-42 search did not uncover a new committed-production defect class beyond historically tracked findings. **F-31-08 reclassified to top P2** based on fresh ranking (ledger bypass severity), not because F-33-03 was invalidated.

---

## 9. Financial Integrity

| Concern | Status @ HEAD |
|---------|---------------|
| Posted settlement ≤ collectible balance | **INTACT** — Phase 35 `applyPaymentDelta` + payment claim |
| Pending commitments ≤ invoice balance | **INTACT** — Phase 39 |
| Active invoice uniqueness | **INTACT** — Phase 37 |
| Issue/void concurrency | **INTACT** — Phase 38 |
| Invoice numbering uniqueness | **@unique` constraint** — F-33-01 is scan-cap not silent dup |
| Derived invoice status | **WEAK (F-37-R1)** — status TOCTOU; amounts authoritative |
| Expense accounting | **NoOp @ HEAD** — F-35-08 deferred |

---

## 10. Inventory Integrity

| Concern | Status @ HEAD |
|---------|---------------|
| Workflow movement paths (dispatch/return/maintenance/repair) | **Claim-hardened** on side-effect commands |
| `quantityOnHand` / `reservedQuantity` via movement SQL | **INTACT** within workflow scopes |
| Direct `POST /api/stock-movements` | **OPEN (F-33-03)** — WORKER; all types; optional refs |
| Direct `PATCH /api/inventory/:id` | **OPEN (F-31-08)** — absolute counters; **no ledger** |
| Invariants `onHand >= 0`, `reserved >= 0`, `reserved <= onHand` | Enforced on **movement SQL**; **bypassable** via F-31-08 PATCH |

---

## 11. Workflow Integrity — Cross-Workflow Survey

| Pair | Verdict @ HEAD |
|------|----------------|
| markReady ↔ complete/cancel | **CLOSED** (Phase 42) |
| receive/inspect ↔ complete/cancel | **CLOSED** (Phases 41, 40) |
| cancel ↔ complete (dispatch/return) | **CLOSED** (Phase 40) |
| issue ↔ void | **CLOSED** (Phase 38) |
| issue/void ↔ payment post/void | **CLOSED** (Phases 35, 38, 39) |
| reserve ↔ dispatch | **CLOSED** (Phases 31–32 on RO path); **F-33-03** bypass via direct API RESERVE |
| maintenance/repair start/complete/cancel | **CLOSED** (claims) |
| expense submit/approve/pay | Unconditional `updateStatus`; **no stock** — P3 status ordering |
| convert-missing-to-loss → return items | Unconditional `updateStatus` on completed returns — admin invoice path — P3 |

---

## 12. Authorization / Bypass — Special Focus

### F-33-03 (fresh re-audit)

| Question | Answer @ HEAD |
|----------|---------------|
| **Endpoint** | `POST /api/stock-movements` (`handleCreateStockMovement`) |
| **Permission** | `PERMISSIONS.stockMovements.create` |
| **Roles** | **WORKER** (also MANAGER/ADMIN via broader sets) |
| **Validations** | Schema quantity/type; inactive check; atomic movement SQL in `executeCreateStockMovementInScope` |
| **Workflow guards** | **None** — `referenceType`/`referenceId` optional; no dispatch/return/RO enforcement |
| **Movement types** | `OUT`, `IN`, `RESERVE`, `RELEASE`, `ADJUSTMENT` |
| **Ledger** | Movement row + inventory audit in scope |
| **RESERVE vs F-02** | Direct API RESERVE does **not** use RO `lockForReserve` / sorted inventory locks |
| **Classification** | **P2 integrity defect + policy decision** — not a normal-user concurrency race |
| **Decision lock** | **Required before implementation** |

### F-31-08 (fresh re-audit)

| Question | Answer @ HEAD |
|----------|---------------|
| **Endpoint** | `PATCH /api/inventory/:id` (`handleUpdateInventory`) |
| **Permission** | `PERMISSIONS.inventory.update` |
| **Roles** | **WORKER** |
| **Fields** | `quantityOnHand`, `reservedQuantity`, min/max optional |
| **Ledger** | **None** — `repository.update` absolute write |
| **Atomicity** | Read-then-write; no row-lock predicate |
| **vs F-33-03** | **Higher ledger/audit gap**; lower workflow-simulation breadth |
| **Classification** | **P2 integrity defect** |

### F-11

WORKER holds both bypass permissions. `inventory.adjust` is UI-route-gated only — defense-in-depth gap, not primary defect.

---

## 13. Schema / Database

| Item | Status |
|------|--------|
| `invoiceNumber @unique` | Mitigates F-33-01 silent duplicate |
| `Repair.returnInspectionItemId` | **OPEN (F-09)** — UUID index, no `@relation` FK |
| Phase 42 schema changes | **NONE** |
| New DB gaps | **NONE beyond F-09** |

**Schema changes: NONE**  
**Migration changes: NONE**

---

## 14. Decision Lock

**REQUIRED for Phase 43 (F-31-08)**

Unresolved policy questions (do not resolve in audit):

1. Should `PATCH /api/inventory/:id` be allowed to mutate `quantityOnHand` / `reservedQuantity` at all?
2. If administrative correction is required, must it always create an `ADJUSTMENT` stock movement (ledger-bound)?
3. Should absolute counter PATCH be **ADMIN-only** (or removed) while WORKER uses workflow + `inventory.adjust` UI path only?

**Also required before F-33-03 implementation (Phase 44+):**

1. Are direct stock movements intentional for WORKER warehouse operations?
2. If yes, which movement types and mandatory reference constraints apply?
3. Should RESERVE via API be prohibited or require active rental-order context?

---

## 15. Recommended Next Phase

### Phase 43 — Inventory PATCH Ledger Integrity

| Item | Detail |
|------|--------|
| **Finding** | **F-31-08** |
| **Objective** | Prevent absolute inventory counter PATCH from bypassing movement ledger; preserve audit trail |
| **Modules** | `update-inventory.service.ts`, inventory repository, inventory API route, RBAC (possibly WORKER scope), tests |
| **Strategy** | Decision-lock outcome: reject counter fields on PATCH **or** route changes through `ADJUSTMENT` movement / delta SQL with audit |
| **Expected tests** | PATCH rejection or ledger-bound adjustment; concurrency vs workflow movement |
| **Schema impact** | **NONE** expected |
| **Decision lock** | **YES** (see §14) |

**Runner-up:** Phase 44 — Stock Movement API Policy (F-33-03) after decision lock.

---

## 16. Tests

**Executed this audit pass:**

```text
node --env-file=.env ./node_modules/vitest/vitest.mjs run \
  dispatch.mark-ready-concurrency.42 \
  dispatch.cancel-concurrency.40 \
  return.receive-inspect-concurrency.41 \
  payment.pending-over-commitment.39

→ Test Files  4 passed (4)
→ Tests       35 passed (35)
```

**FULL SUITE NOT EXECUTED** this audit pass.

---

## 17. Git Safety

| Check | Status |
|-------|--------|
| Production implementation | **NO** |
| Commit created | **NO** |
| Push performed | **NO** |
| Destructive Git operations | **NO** |
| Existing WIP preserved | **YES** |

---

## Ranking Rationale — F-31-08 vs F-33-03

| Dimension | F-31-08 | F-33-03 |
|-----------|---------|---------|
| Normal concurrent workflow race | No | No |
| Ledger / audit trail | **None** | Movement + audit in scope |
| Exploit path | Single PATCH | API POST with type selection |
| Workflow simulation | Indirect (counter only) | **Direct OUT/IN/RESERVE/RELEASE** |
| RO F-02 coupling break | Indirect | **Direct RESERVE bypass** |
| Policy ambiguity | Admin correction? | Warehouse floor API? |

**Why F-31-08 ranks first:** After Phases 40–42 eliminated P1 workflow races, the strongest **remaining material inventory integrity gap** is untraceable absolute counter mutation. F-33-03 is co-critical for workflow coupling but retains movement records and atomic movement SQL — making F-31-08 the sharper audit/compliance defect. F-33-03 remains **#2 P2** and requires its own decision lock before implementation.

---

*End of Post-Phase-42 Enterprise Gap Audit*
