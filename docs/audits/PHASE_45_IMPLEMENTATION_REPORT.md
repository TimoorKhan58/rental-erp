# Phase 45 Implementation Report

## Executive Verdict

**PHASE 45 COMPLETE — N-44-01 CLOSED**

Return create/update capacity validation is now serialized under a dispatch-scoped lock covering read → validate → mutate → audit within the same UoW.

---

## Baseline

| Item | Value |
|------|-------|
| Pre-Phase-45 HEAD | `2928d1d` — Phase 44 supplier payment settlement |
| Finding | N-44-01 (P1) — return create/update capacity concurrency |
| Schema / migrations | NONE |

---

## Finding N-44-01

Concurrent return creates/updates on the same dispatch could each read the same prior-return aggregate and commit quantities whose sum exceeded dispatched quantity.

---

## Root Cause

```text
findByDispatchId → in-memory prior-return sum → validate → create/update
```

No dispatch-scoped serialization. Phase 30 hardened dispatch **claim** capacity at rental-order level; return capacity is **per dispatch** and remained unprotected.

---

## Implementation

| Layer | Change |
|-------|--------|
| `IDispatchRepository` | Added `lockForReturnCapacity(dispatchId)` |
| `PrismaDispatchRepository` | `SELECT id FROM dispatches WHERE id = … FOR UPDATE` |
| `return-capacity-lock.ts` | In-memory mutex keyed by dispatch id (test parity) |
| `InMemoryDispatchRepository` | Delegates to `acquireReturnCapacityLock` |
| `CreateReturnService` | `lockForReturnCapacity` before prior-return load |
| `UpdateReturnService` | Same when item quantities change |
| Return transaction test runner | `runWithReturnCapacityLockScope` for ALS release |

**Note:** Used **dispatch-row lock** (not `lockForDispatchClaim` on rental order) because return capacity is per dispatch; unrelated dispatches on the same order do not serialize (T45.6).

---

## Concurrency Strategy

**Option B — parent-row serialization** at dispatch scope:

```text
lockForReturnCapacity(dispatchId)
  → load dispatch + prior returns
  → validateReturnItemsForDispatch (exclude self on update)
  → create/update
  → audit
→ commit / release
```

Mirrors Phase 30 philosophy; boundary matches domain grouping (per dispatch line / rental-order item).

---

## Create Path

`create-return.service.ts`: acquire lock after dispatch/rental-order validation, before `loadPriorReturnsForDispatch`.

---

## Update Path

`update-return.service.ts`: acquire lock when `items` change; `excludeReturnId` preserved for self-exclusion.

---

## Domain Semantics

Capacity enforced **per dispatch line** via `rentalOrderItemId` (existing `validateReturnItemsAgainstDispatch`). Owned/external split unchanged. No new business rules.

---

## Tests T45.1+

File: `return.capacity-concurrency.45.application.test.ts`

| ID | Scenario | Result |
|----|----------|--------|
| T45.1 | Concurrent create 6 + 5 on dispatch 10 | PASS |
| T45.2 | Concurrent create 5 + 5 exact fill | PASS |
| T45.3 | Existing 6 + concurrent create 4 + 2 | PASS |
| T45.4 | Concurrent update 7 + 4 (one invalid after winner) | PASS |
| T45.5 | Update excludes self (4→7 with peer 3) | PASS |
| T45.6 | Different dispatches concurrent | PASS |
| T45.7 | Audit failure rollback | PASS |

---

## Regression Tests

| Suite | Result |
|-------|--------|
| Phase 45 | 7/7 |
| Return + dispatch + Phases 30–44 focused | 103/103 |
| Full vitest | **3157/3157** (+7 vs 3150) |

---

## Static Gates

| Gate | Result |
|------|--------|
| `npx prisma validate` | Valid |
| ESLint (Phase 45 files) | No errors |
| Full vitest | 3157/3157 passed |

---

## Schema / Migration

| Item | Status |
|------|--------|
| Schema changes | **NONE** |
| Migration changes | **NONE** |

---

## Git Status

Selective staging only. Unrelated WIP preserved.

---

## Remaining Findings

| ID | Severity | Status |
|----|----------|--------|
| F-33-03 | P2 | OPEN |
| F-37-R1 | P2 | OPEN |
| N-44-05 | P2 | OPEN |
| N-44-06 | P2 | OPEN |
| F-33-01 | P2 | OPEN |
| F-35-08 | P2 deferred | DEFERRED |
| F-37-R2 | P3 | OPEN |
| F-11 | P3 | OPEN |
| F-09 | P3 | OPEN |
| F-07 | P3 | OPEN |
| N-39-UI-01 | P3 | OPEN |

---

## Next Step

Recommend **Post-Phase-45 Enterprise Gap Audit** for fresh re-ranking. Do not auto-select F-33-03.

---

*End of Phase 45 Implementation Report*
