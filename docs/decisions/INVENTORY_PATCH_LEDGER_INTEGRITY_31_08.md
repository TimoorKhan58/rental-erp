# Inventory PATCH Ledger Integrity — F-31-08

**Document:** Inventory PATCH Ledger Integrity v1.0  
**Status:** APPROVED — Hybrid Option A (Phase 43 implemented 2026-08-31)  
**Date:** 2026-08-30  
**Baseline HEAD:** `a422e01a25a4c6a324a597dd50ee3f04c72d929e` — `fix(dispatch): harden mark-ready concurrency`  
**Parent audit:** `docs/audits/PHASE_42_ENTERPRISE_GAP_AUDIT.md`  
**Finding:** F-31-08 (P2)

---

## 1. Context

Post-Phase-42 enterprise gap audit identified **F-31-08** as the highest-priority remaining **P2** integrity finding. Phases 28–42 closed workflow concurrency defects on dispatch, return, payment, and invoice paths. Remaining inventory risk is concentrated in **direct mutation surfaces** that bypass the stock-movement ledger.

This document prepares a **policy/architecture decision lock** for Phase 43. **No business policy is approved here.** Implementation must not begin until the project owner resolves the open decisions in §8.

---

## 2. Current Committed Behavior

### 2.1 Production call path (PATCH)

| Step | Component | Committed behavior @ HEAD |
|------|-----------|---------------------------|
| 1 | HTTP | `PATCH /api/inventory/:id` — `handleUpdateInventory` |
| 2 | Authorization | `PERMISSIONS.inventory.update` via `runInventoryApiRoute` |
| 3 | Validation | `UpdateInventorySchema` (Zod) |
| 4 | Service | `UpdateInventoryService.execute` |
| 5 | Read | `repository.findById` (not-found handling) |
| 6 | Write | `repository.update(inventoryId, updateData)` — **absolute** field merge |
| 7 | Audit | `auditLogger.log` — inventory entity audit (`action: UPDATE`) |
| 8 | Commit | `IInventoryTransactionRunner.run` (single transaction boundary) |

**No stock movement** (`InventoryTransaction` / `CreateStockMovementService`) is invoked on this path.

### 2.2 PATCH-mutable fields

`UpdateInventorySchema` @ HEAD accepts optional:

| Field | Absolute write? | Notes |
|-------|-----------------|-------|
| `quantityOnHand` | **Yes** | `NonNegativeIntSchema` |
| `reservedQuantity` | **Yes** | `NonNegativeIntSchema` |
| `minimumStock` | Yes | Non-authoritative stock counter |
| `maximumStock` | Yes | Non-authoritative stock counter |
| `isActive` | Yes | Lifecycle flag |

At least one field required. **Both `quantityOnHand` and `reservedQuantity` may be supplied in a single PATCH.**

### 2.3 Repository write semantics

`PrismaInventoryRepository.update` @ HEAD:

1. Reads existing row.
2. Merges PATCH fields into props (`data.quantityOnHand ?? props.quantityOnHand`, same for `reservedQuantity`).
3. Calls `Inventory.reconstitute(...)` — runs `validateQuantities`:
   - `quantityOnHand >= 0`
   - `reservedQuantity >= 0`
   - `reservedQuantity <= quantityOnHand`
   - `minimumStock >= 0`
   - `maximumStock >= minimumStock` (when set)
4. Executes unconditional `db.inventory.update` with PATCH payload (absolute write, **no row-version predicate**, **no delta SQL**).

### 2.4 Stock movement ledger (separate path)

Committed production already provides a **ledger-backed adjustment** path:

| Step | Path |
|------|------|
| API | `POST /api/stock-movements` |
| Permission | `stockMovements.create` |
| Type | `ADJUSTMENT` |
| Service | `executeCreateStockMovementInScope` → `executeAdjustmentStockMovementInScope` |
| Inventory SQL | `inventoryRepository.applyAdjustment(id, signedDelta)` — atomic delta with predicate `quantityOnHand + delta >= reservedQuantity` |
| Ledger | Creates `InventoryTransaction` row + movement audit |

UI @ HEAD (`inventory.service.ts`): `adjustInventoryStock()` posts ADJUSTMENT movements; **`updateInventory()` uses PATCH** and the committed form schema (`updateInventoryFormSchema`) includes absolute `quantityOnHand` and `reservedQuantity`.

### 2.5 Initial create (related, out of PATCH scope)

`POST /api/inventory` (`CreateInventoryService`) sets absolute initial `quantityOnHand` / `reservedQuantity` without a movement record. This is bootstrap/seed semantics, not generic PATCH. **Phase 43 scope should explicitly decide whether create remains exempt** (see §11).

### 2.6 Audit

| Path | Inventory entity audit | Stock movement ledger |
|------|------------------------|----------------------|
| PATCH `UpdateInventoryService` | **Yes** (before/after counter values) | **No** |
| ADJUSTMENT stock movement | Movement audit in scope | **Yes** |

Entity audit alone **does not reconstruct** counter history as a sum of movements when PATCH absolute writes occur.

---

## 3. Integrity Problem

### 3.1 Ledger mismatch

Workflow-hardened inventory mutations (RESERVE, RELEASE, OUT, IN, ADJUSTMENT via movement service) update counters through **atomic SQL deltas** and record **`InventoryTransaction`** rows.

Generic PATCH can set authoritative counters to **arbitrary valid absolute values** with:

- **no movement record**
- **no delta linkage** to workflow events

Therefore:

```text
inventory.quantityOnHand / reservedQuantity
        ≠
reconstructable sum/state from stock movement ledger alone
```

### 3.2 Issue classification

| Dimension | Assessment |
|-----------|------------|
| **Primary** | **Ledger-integrity / compliance** — untraceable authoritative counter changes |
| **Secondary** | **Authorization** — WORKER holds `inventory.update` |
| **Tertiary** | **Concurrency** — read-merge-absolute-write lost-update vs workflow atomic SQL (not a cross-command workflow race like Phases 40–42) |

This is **not** a normal-user concurrent workflow race between two legitimate workflow commands. It is a **direct mutation bypass** with optional concurrent lost-update if PATCH races workflow SQL.

### 3.3 Invariant interaction

| Invariant | PATCH protection @ HEAD | Movement/workflow protection |
|-----------|----------------------|------------------------------|
| `quantityOnHand >= 0` | Zod + domain `validateQuantities` | SQL predicates on OUT/IN/ADJUSTMENT |
| `reservedQuantity >= 0` | Zod + domain | SQL on RELEASE/reserve |
| `reservedQuantity <= quantityOnHand` | Domain on merged snapshot | SQL on RESERVE/ADJUSTMENT |
| Ledger reconstructability | **Not enforced** | **Enforced** on movement paths |
| Workflow reservation coupling | **Bypassed** when PATCH changes `reservedQuantity` | RESERVE/RELEASE via rental-order workflow |

**Database:** `Inventory` model has **no CHECK constraint** for `reservedQuantity <= quantityOnHand`; enforcement is application-layer only.

### 3.4 Can PATCH create unreconstructable state?

**Yes.** Example @ committed semantics:

1. Ledger shows net +10 via IN movements.
2. PATCH sets `quantityOnHand: 500` with audit entry showing old/new counters.
3. Counters are valid (`reserved <= onHand`) but **cannot be derived from movements alone**.

PATCH of `reservedQuantity` can similarly desync from RO/dispatch RESERVE/RELEASE workflow state while passing domain validation.

---

## 4. Affected Production Paths

| Path | Role / permission | Mutates counters | Ledger |
|------|-------------------|------------------|--------|
| `PATCH /api/inventory/:id` | WORKER+ (`inventory.update`) | Absolute | No |
| `POST /api/stock-movements` (ADJUSTMENT) | WORKER+ (`stockMovements.create`) | Delta (atomic) | Yes |
| Rental-order RESERVE/RELEASE | WORKER (`rentalOrders.reserve`, workflow) | Delta SQL | Yes (RESERVE/RELEASE) |
| Dispatch OUT/RELEASE | WORKER dispatch complete | Delta SQL | Yes |
| Return IN/RELEASE | WORKER return complete | Delta SQL | Yes |
| Maintenance/repair stock paths | Claim-hardened services | Delta SQL | Yes |
| `POST /api/inventory` create | Elevated create permission | Absolute initial | No |

**Legitimate dependency on direct PATCH:** Committed UI edit form sends absolute `quantityOnHand` / `reservedQuantity` via PATCH. Adjust dialog already uses ledger-backed ADJUSTMENT. **No other committed workflow service depends on PATCH for stock effects.**

---

## 5. Invariants

Authoritative inventory invariants (committed intent):

```text
quantityOnHand >= 0
reservedQuantity >= 0
reservedQuantity <= quantityOnHand
availableQuantity = quantityOnHand - reservedQuantity
```

Extended enterprise invariant (audit expectation):

```text
Authoritative counter changes ⊆ { workflow movements ∪ ledger-backed adjustments }
```

**PATCH currently violates the extended invariant** while preserving the basic numeric invariants.

---

## 6. Policy Options

### Option A — Remove / Restrict Direct PATCH (counter fields)

**Policy sketch (not approved):**

- Generic `PATCH /api/inventory/:id` **must not** accept `quantityOnHand` or `reservedQuantity`.
- PATCH limited to non-authoritative metadata: `minimumStock`, `maximumStock`, `isActive` (if desired).
- **`reservedQuantity` changes only via workflow** (RESERVE/RELEASE and related commands).
- **`quantityOnHand` corrections only via ADJUSTMENT** stock movement (existing API) or a future dedicated adjustment command.

**Implementation sketch:**

- Narrow `UpdateInventorySchema` / service validation.
- UI: remove counter fields from edit PATCH form; retain Adjust dialog.
- Optionally tighten RBAC (`inventory.update` vs `inventory.adjust`).

### Option B — Ledger-Bound Adjustment (via PATCH facade)

**Policy sketch (not approved):**

- PATCH may *request* a target on-hand level or delta, but service **must not** call absolute `repository.update` for counters.
- Service computes signed delta and invokes existing `applyAdjustment` + movement creation in **one transaction**:
  ```text
  requested correction
  → compute delta
  → create ADJUSTMENT movement
  → atomic applyAdjustment
  → inventory + movement audit
  → commit
  ```
- **`reservedQuantity` still excluded** from generic PATCH (workflow-only) unless a separate explicit policy approves ledger-backed reservation adjustments.

**Note:** Option B largely **reuses committed ADJUSTMENT infrastructure**; difference from today is blocking silent absolute PATCH and/or routing PATCH intent through movement creation.

---

## 7. Comparison

| Criterion | Option A — Restrict PATCH | Option B — Ledger-bound PATCH |
|-----------|---------------------------|-------------------------------|
| **Integrity** | Strong — counters only via movement/workflow | Strong if all on-hand changes create movements |
| **Auditability** | High — single source of truth (ledger) | High — same |
| **Operational usability** | Requires Adjust flow for corrections (already in UI) | PATCH can remain ergonomic if it wraps adjustment |
| **Authorization** | Can narrow `inventory.update` scope | Must ensure PATCH wrapper cannot skip movement auth |
| **Concurrency** | Workflow SQL remains authority; removes absolute lost-update on PATCH counters | Delta SQL authority preserved |
| **Complexity** | Lower — schema + service rejection | Medium — transaction orchestration in UpdateInventoryService or new command |
| **Backwards compatibility** | Breaking for API clients using PATCH counters | Partial — PATCH shape may remain if remapped to delta |
| **Schema impact** | **None** expected | **None** expected |

**Hybrid (common in ERP systems):** Option A for both counter fields **+** retain existing ADJUSTMENT API (already Option B for on-hand). **RECOMMENDATION favors this hybrid** — see §9.

---

## 8. Open Decisions

Project owner must approve explicitly:

| ID | Question |
|----|----------|
| **OD-43-01** | Should generic inventory PATCH be allowed to mutate `quantityOnHand` at all? |
| **OD-43-02** | Should generic inventory PATCH be allowed to mutate `reservedQuantity` at all? |
| **OD-43-03** | If administrative stock correction is required, must it always be ledger-backed (movement row)? |
| **OD-43-04** | Should administrative corrections use the existing ADJUSTMENT stock-movement API / Adjust UI only, rather than generic PATCH? |
| **OD-43-05** | Which roles may perform authoritative stock corrections (WORKER vs MANAGER vs OWNER only)? |
| **OD-43-06** | Must every authoritative `quantityOnHand` change create a stock movement ledger entry? |
| **OD-43-07** | Must every `reservedQuantity` change occur only through reservation/workflow operations (never generic adjustment/PATCH)? |

**Current committed behavior summary for owner decisions:**

| OD | Current @ HEAD |
|----|----------------|
| OD-43-01 | **Yes** — PATCH accepts absolute `quantityOnHand` |
| OD-43-02 | **Yes** — PATCH accepts absolute `reservedQuantity` |
| OD-43-03 | **No** — PATCH is not ledger-backed |
| OD-43-04 | **No** — PATCH and ADJUSTMENT API both exist |
| OD-43-05 | **WORKER** (also MANAGER, OWNER) via `inventory.update` |
| OD-43-06 | **No** — PATCH changes on-hand without movement |
| OD-43-07 | **No** — PATCH can set `reservedQuantity` directly |

---

## 9. Recommended Direction

**RECOMMENDATION (not a locked decision):**

Adopt **Option A hybrid**:

1. **Remove `quantityOnHand` and `reservedQuantity` from generic PATCH** (OD-43-01/02 → No for PATCH).
2. **Require ledger-backed correction for on-hand** via existing `POST /api/stock-movements` `ADJUSTMENT` (OD-43-03/04/06 → Yes).
3. **Treat `reservedQuantity` as workflow-authoritative only** (RESERVE/RELEASE / rental-order paths) (OD-43-07 → Yes).
4. **Re-evaluate RBAC** so WORKER cannot silently PATCH counters even if UI is fixed (OD-43-05 — owner decision; suggest MANAGER+ for metadata PATCH, WORKER retains Adjust if policy allows floor corrections).

Rationale: Committed codebase **already implements** the correct on-hand correction mechanism (ADJUSTMENT movement + `applyAdjustment`). PATCH duplicate path creates ledger drift without adding capability that ADJUSTMENT lacks.

---

## 10. F-33-03 Boundary

**F-33-03** (direct `POST /api/stock-movements` bypassing workflow guards) remains a **separate finding**.

| Topic | F-31-08 (this lock) | F-33-03 |
|-------|---------------------|---------|
| Surface | `PATCH /api/inventory/:id` | `POST /api/stock-movements` |
| Ledger row | **No** | **Yes** (movement created) |
| Counter mutation | Absolute write | Delta SQL by type |
| Workflow guards | Bypasses movement types entirely | Bypasses RO/dispatch/return context |
| Primary defect | Untraceable counters | Workflow coupling / policy |

**Phase 43 should not automatically resolve F-33-03.**

**Dependency:** If OD-43-06 approves “all on-hand changes require movement,” Phase 43 aligns PATCH with ADJUSTMENT but **does not restrict** OUT/IN/RESERVE/RELEASE via direct stock-movement API. F-33-03 will still require its **own decision lock** (movement type allowlist, mandatory references, role scope).

**Non-dependency:** Tightening PATCH does not remove WORKER `stockMovements.create`; F-33-03 remains runner-up P2.

---

## 11. Phase 43 Scope (post-approval only)

Implementation **after** owner approval should include:

| Area | Likely change |
|------|---------------|
| `UpdateInventorySchema` | Reject or strip `quantityOnHand`, `reservedQuantity` |
| `UpdateInventoryService` | Metadata-only update; optional explicit error if counters supplied |
| `inventory-form.schema.ts` / UI | Remove absolute counters from edit PATCH; keep Adjust dialog |
| API tests | PATCH counter rejection; metadata PATCH still works |
| RBAC (if OD-43-05 dictates) | Adjust `role-permissions.ts` — **separate owner approval** |
| Documentation | API contract note: corrections via ADJUSTMENT |

**Explicitly out of Phase 43 unless owner expands scope:**

- F-33-03 stock-movement policy
- `POST /api/inventory` create bootstrap semantics (unless OD added)
- DB CHECK constraints (optional hardening, not required for Phase 43)

---

## 12. Expected Tests (T43 — not implemented in this lock)

Future Phase 43 tests (describe only):

| ID | Scenario | Expected (pending policy) |
|----|----------|---------------------------|
| **T43.1** | PATCH `{ quantityOnHand: N }` | Rejected (422) or ignored per approved contract |
| **T43.2** | PATCH `{ reservedQuantity: N }` | Rejected |
| **T43.3** | PATCH `{ minimumStock, isActive }` | Success; counters unchanged |
| **T43.4** | ADJUSTMENT movement +10 | On-hand +10; movement row; ledger consistent |
| **T43.5** | Concurrent PATCH counter vs workflow OUT | After Phase 43, PATCH counter path removed; workflow OUT authority preserved |
| **T43.6** | Concurrent ADJUSTMENT movements | Atomic delta semantics; no lost negative invariant |
| **T43.7** | Authorization — role without update | PATCH metadata denied |
| **T43.8** | Audit ordering | Movement audit + inventory audit ordering per approved design |
| **T43.9** | Rollback on movement failure | No partial counter change |
| **T43.10** | Regression — RESERVE/RELEASE/OUT/IN workflow paths | Unchanged counter authority |

---

## 13. Schema Impact

**Expected schema impact: NONE** for Options A and B as described.

Optional future hardening ( **not required** for Phase 43 decision):

- DB CHECK (`reservedQuantity <= quantityOnHand`)
- Optimistic locking column on `inventory`

No new tables or migrations anticipated for the recommended hybrid.

---

## 14. Decision Status

```text
APPROVED — Hybrid Option A implemented in Phase 43 (2026-08-31)
```

No authoritative business decision in the repository resolves OD-43-01 through OD-43-07 @ HEAD `a422e01`.

**Do not implement Phase 43 until the project owner records approved answers** (appendix or status update to this document).

---

*End of Inventory PATCH Ledger Integrity Decision Lock (F-31-08)*
