# Phase 43 Implementation Report — Inventory PATCH Ledger Integrity (F-31-08)

**Date:** 2026-08-31  
**Baseline HEAD:** `a422e01` — `fix(dispatch): harden mark-ready concurrency`  
**Decision lock:** `docs/decisions/INVENTORY_PATCH_LEDGER_INTEGRITY_31_08.md`  
**Approved policy:** Hybrid Option A

---

## 1. Executive Verdict

**PHASE 43 COMPLETE — F-31-08 CLOSED**

Generic inventory PATCH no longer mutates authoritative counters. Metadata PATCH remains operational. On-hand corrections continue through the existing ADJUSTMENT stock-movement workflow. Reservation/workflow paths for `reservedQuantity` are unchanged.

---

## 2. Baseline

| Item | Value |
|------|-------|
| Pre-Phase-43 HEAD | `a422e01` |
| Full suite (pre) | 3125/3125 (documented baseline) |
| Schema | No changes |
| Migrations | None |

Substantial unrelated WIP was present in the working tree and was preserved unstaged.

---

## 3. Approved Policy

Hybrid Option A (locked):

1. Generic PATCH must not mutate `quantityOnHand` or `reservedQuantity`.
2. On-hand corrections use existing ADJUSTMENT stock-movement workflow.
3. `reservedQuantity` remains workflow/reservation controlled.
4. Metadata fields (`minimumStock`, `maximumStock`, `isActive`) remain PATCHable.
5. F-33-03 not in scope.
6. No stock-movement architecture redesign.
7. No schema/migration impact.

---

## 4. Finding F-31-08

**Defect:** `PATCH /api/inventory/:id` accepted absolute `quantityOnHand` / `reservedQuantity`, writing counters via `UpdateInventoryService` → `repository.update` without a stock-movement ledger entry.

**Resolution:** Removed counter fields from `UpdateInventorySchema` (strict Zod rejection → `ValidationError` / HTTP 400). Mapper/service path no longer forwards counter values to repository update.

---

## 5. Implementation

| Layer | Change |
|-------|--------|
| `UpdateInventorySchema` | Metadata-only fields; `.strict()` rejects counter keys |
| `toUpdateInventoryData` | Stops mapping counter fields |
| `UpdateInventoryService` | Unchanged orchestration; inherits schema boundary |
| Repository | Unchanged — retains delta/workflow primitives for legitimate callers |
| UI edit form | Removed counter inputs; metadata-only edit |
| UI adjust dialog | Unchanged — ADJUSTMENT path preserved |

---

## 6. API Before/After

| Request | Before | After |
|---------|--------|-------|
| `PATCH { minimumStock: N }` | 200 | 200 |
| `PATCH { isActive: false }` | 200 | 200 |
| `PATCH { quantityOnHand: N }` | 200, counter mutated, no ledger | **400 ValidationError**, no mutation |
| `PATCH { reservedQuantity: N }` | 200, counter mutated, no ledger | **400 ValidationError**, no mutation |
| `POST /api/stock-movements` ADJUSTMENT | Ledger-backed delta | Unchanged |

Error semantics: existing `ValidationError` / `ERROR_CODES.VALIDATION_FAILED` (HTTP 400).

---

## 7. UI Before/After

| Surface | Before | After |
|---------|--------|-------|
| Edit inventory dialog | Editable on-hand + reserved + metadata | Metadata only (reorder level, max stock, active) |
| Adjust stock dialog | ADJUSTMENT movement | Unchanged |
| Detail page counters | Display only | Unchanged (still visible; not editable via PATCH) |

---

## 8. Adjustment Workflow Preservation

Existing path unchanged:

```text
Adjust UI → POST /api/stock-movements (ADJUSTMENT)
         → executeAdjustmentStockMovementInScope
         → applyAdjustment (atomic delta)
         → InventoryTransaction ledger row + audit
```

No duplicate adjustment mechanism introduced.

---

## 9. Authorization

- `inventory.update` still gates metadata PATCH.
- WORKER/MANAGER/OWNER retain metadata update where previously granted.
- No RBAC redesign; integrity enforced at API schema boundary.
- F-33-03 (`stockMovements.create` direct API) untouched.

---

## 10. Transaction / Concurrency

- ADJUSTMENT atomicity: verified by existing + Phase 43 tests (rollback on failure, concurrent adjustment predicate).
- Phase 29/30 stock concurrency primitives not modified.
- Metadata PATCH uses existing inventory transaction runner + audit rollback.

---

## 11. Tests

| ID | Coverage | Location |
|----|----------|----------|
| T43.1 | Metadata PATCH allowed | `inventory.patch-ledger-integrity.43.application.test.ts` |
| T43.2 | Reject `quantityOnHand` | schema + API tests |
| T43.3 | Reject `reservedQuantity` | schema + API tests |
| T43.4 | Reject both counters | schema tests |
| T43.5 | ADJUSTMENT changes on-hand | Phase 43 + existing stock-movement suite |
| T43.6 | ADJUSTMENT creates ledger row | Phase 43 |
| T43.7 | Mutation + ledger atomic commit | Phase 43 |
| T43.8 | Failed adjustment rollback | Phase 43 + existing stock-movement suite |
| T43.9 | RESERVE modifies reservedQuantity | Phase 43 |
| T43.10 | PATCH cannot bypass reservation | Phase 43 |
| T43.11 | Auth for metadata PATCH | `inventory.api.test.ts` |
| T43.12 | Workflow regression guard | Phase 43 |

**Executed counts:**

| Suite | Result |
|-------|--------|
| Phase 43 focused (inventory + stock-movement regression) | 110/110 passed |
| Full vitest suite | **3143/3143 passed** |

Net new tests vs 3125 baseline: **+18**.

---

## 12. Static Gates

| Gate | Result |
|------|--------|
| `npx vitest run` (full) | 3143/3143 passed |
| `npx prisma validate` | Schema valid |
| ESLint (Phase 43 files) | No errors |
| `git diff --check` (Phase 43 hunks) | No whitespace errors in Phase 43 changes |

TypeScript full-project check not run separately; full test import graph passed under vitest.

---

## 13. Schema / Migration

| Item | Status |
|------|--------|
| Schema changes | **NONE** |
| Migration changes | **NONE** |

---

## 14. Git

| Item | Value |
|------|-------|
| Previous HEAD | `a422e01` |
| Commit | `fix(inventory): enforce ledger-backed stock corrections` (selective) |
| Push | Not performed |
| Unrelated WIP | Remains unstaged (payment, accounting, reports, seeds, supplier/warehouse, etc.) |

---

## 15. Remaining Findings

| ID | Status |
|----|--------|
| F-33-03 | OPEN — direct stock-movement API policy (out of Phase 43 scope) |
| F-33-01 | OPEN |
| F-37-R1 | OPEN |
| F-35-08 | OPEN |
| F-37-R2 | OPEN |
| F-11 | OPEN |
| F-09 | OPEN |
| F-07 | OPEN |
| N-39-UI-01 | OPEN |

---

## 16. F-33-03 Boundary

Phase 43 closes ledger bypass via inventory PATCH only. Direct `POST /api/stock-movements` for OUT/IN/RESERVE/RELEASE/ADJUSTMENT remains governed by separate F-33-03 decision lock. No changes made to stock-movement authorization or workflow guards in this phase.

---

## 17. Next Step

**Recommend:** Post-Phase-43 Enterprise Gap Audit to re-prioritize remaining P2 findings. Do not auto-select F-33-03 without owner decision lock approval.

---

*End of Phase 43 Implementation Report*
