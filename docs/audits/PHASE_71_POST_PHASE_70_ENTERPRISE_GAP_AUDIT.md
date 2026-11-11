# Phase 71 Post-Phase-70 Enterprise Gap Audit

## 1. Executive Verdict

**PASS WITH FINDINGS**

Phase 70 remains intact at HEAD `72abd77`. Repair / Return / Maintenance dashboard summaries are database-authoritative (`count` / `groupBy` / `aggregate`) and wired through summary APIs. All decision locks revalidated in this audit are **INTACT**. No P0/P1 production integrity defects were confirmed.

One **P2** actionable finding remains: the Phase 63 Dispatch summary client is incomplete at the feature barrel/type export layer (`getDispatchSummary` + summary types), producing hard TypeScript errors — the same class of defect closed for Expense/Inventory/Asset in Phase 69 (F-68-P2-01). Residual F-66 / F-07 / F-37-R2 items remain deferred P3 or documentation/deployment prerequisites only.

---

## 2. Baseline

| Field | Value |
| ----- | ----- |
| Branch | `main` |
| Baseline HEAD | `72abd77bd79da42c36b7968ddba20d38ddca8c79` |
| Baseline message | `fix(dashboard): make repair return maintenance summaries authoritative` |
| Final HEAD (after audit doc only) | `72abd77` (unchanged) |
| Push | **NO** |
| Audit date | 2026-09-06 |
| Mode | Audit-only |

**Working tree:** Dirty with large intentional WIP (~145 `git status --short` lines). Unrelated WIP preserved; no reset/checkout/stash/clean/restore.

**Git safety commands (start):**

```text
branch: main
HEAD: 72abd77bd79da42c36b7968ddba20d38ddca8c79
diff: large unrelated WIP (modified + untracked); no Phase 70 commit rewrite
```

---

## 3. Historical Finding Reconciliation

| Finding | Previous Status | Current Status | Severity | Evidence |
| ------- | --------------- | -------------- | -------- | -------- |
| F-31-03 | CLOSED | **CLOSED** | — | Inventory/stock movement atomic SQL + workflow guards still present; no regression |
| F-35-01 | CLOSED | **CLOSED** | — | Payment settlement uses predicated `applyPaymentDelta` SQL |
| F-35-06 | CLOSED | **CLOSED** | — | Invoice issue/void uses `claimStatusTransition` |
| F-36-03 | CLOSED | **CLOSED** | — | Pending payment over-commitment prevented via invoice lock + delta predicates |
| N-40-01 | CLOSED | **CLOSED** | — | Dispatch cancel concurrency claim remains |
| F-31-05 | CLOSED | **CLOSED** | — | Historical inventory integrity fix retained |
| N-42-01 | CLOSED | **CLOSED** | — | Dispatch mark-ready concurrency claim remains |
| F-31-08 | CLOSED | **CLOSED** | — | `UpdateInventorySchema` metadata-only (`.strict()`); counters excluded |
| F-33-03 | CLOSED | **CLOSED** | — | DL-51-01 public POST ADJUSTMENT-only + dual permission |
| N-44-05 | CLOSED | **CLOSED** | — | DL-51-02 POSTED payments block void |
| N-48-01 | CLOSED | **CLOSED** | — | DL-51-03 direct ERA uses `assertExternalSourcingF02Gate` |
| N-51-01 | CLOSED | **CLOSED** | — | Phase 51 locks implemented; policy docs intact |
| F-11 | CLOSED | **CLOSED** | — | WORKER financial mutations denied (`worker-mutation-permissions.57.test.ts`) |
| N-39-UI-01 | CLOSED | **CLOSED** | — | Prior UI wiring closed; not reopened |
| F-09 | CLOSED (+ deploy prereq) | **CLOSED** (deploy prereq remains) | Deploy | Schema FK `Repair.returnInspectionItemId` → `ReturnInspectionItem` with `onDelete: Restrict` present |
| F-35-08 | CLOSED (Phase 65/66) | **CLOSED** | — | Persist PAID → accounting → journal link in one UoW |
| N-39-PATTERN-01 Batch 1 | CLOSED | **CLOSED** (barrel gap residual below) | — | Invoice/Dispatch/RO/Payment summary APIs exist; Dispatch barrel incomplete |
| N-39-PATTERN-01 Batch 2 | CLOSED (Phase 67+69) | **CLOSED** | — | Expense/Inventory/Asset summaries + Phase 69 barrel exports |
| N-39-PATTERN-01 Batch 3 | CLOSED (Phase 70) | **CLOSED** | — | Repair/Return/Maintenance `findSummaryStats` + `/summary` routes + hooks |
| F-07 | DEFERRED | **DEFERRED / OBSERVATION** | P3 | Complete dispatch persists `ON_RENT` via ephemeral `withDispatched().withOnRent()`; `DISPATCHED` not lasting RO status |
| F-37-R2 | DEFERRED | **DEFERRED** | P3 | Invoice number uniqueness + P2002 retry; gaps remain cosmetic |
| N-51-DOC-01 | CLOSED (Post-59) | **CLOSED** | DOC | Report hash reconciliation previously closed |
| F-66-P3-01 | DEFERRED | **DEFERRED** (still valid, theoretical) | P3 | Expense `updateStatus(where: { id })` lacks `claimStatusTransition`; journal ref index-only |
| F-66-P3-02 | DEFERRED | **DEFERRED** (still valid) | P3 | Missing/inactive GL → soft-null journal; PAID still commits |
| F-68-P2-01 | CLOSED (Phase 69) | **CLOSED** | — | Expense/Inventory/Asset barrels export summaries |
| **F-71-P2-01** | Noted optional (Ph 69/70) | **OPEN** | **P2** | Dispatch `services/index.ts` + `types/index.ts` omit summary exports; `tsc` TS2724/TS2305 |

---

## 4. Decision Lock Verification

### DL-51-01 — Public stock movement POST = ADJUSTMENT only

**Status: INTACT**

| Check | Evidence |
| ----- | -------- |
| Policy function | `assertPublicStockMovementCreateAllowed` in `public-stock-movement-create.policy.ts` |
| Type allowlist | Rejects non-`ADJUSTMENT` with 422-class `UnprocessableError` |
| Dual permission | `stockMovements.create` **AND** `inventory.adjust` via `assertAll` |
| Route wiring | `stock-movement-api.routes.ts` calls policy before create |
| Workflow bypass of HTTP | `executeCreateStockMovementInScope` remains in-process for IN/OUT/RESERVE/RELEASE |
| Alternate HTTP route | No other public create route found under `src/app/api` for stock movements |

### DL-51-02 — POSTED payment blocks invoice VOID

**Status: INTACT**

| Check | Evidence |
| ----- | -------- |
| Guard | `assertInvoiceVoidWithoutPostedPayments` |
| Query | `paymentRepository.countPostedPaymentsByRentalInvoiceId` |
| Behavior | Any POSTED count > 0 → reject; void payments first |
| Wiring | `VoidRentalInvoiceService` invokes assert before `withVoided` / claim |

### DL-51-03 — Direct ERA creation F-02 parity + concurrency

**Status: INTACT**

| Check | Evidence |
| ----- | -------- |
| Direct create | `CreateExternalRentalService` → `assertExternalSourcingF02Gate` → `executeCreateExternalRentalInScope` |
| Locks | Sorted inventory `lockForAvailabilityCommit` + `lockForReserveCommand` |
| Authoritative reread | `findById` after locks |
| Shortfall | Date-aware availability + `calculateExternalSourcingShortfall` |
| Active uniqueness | `findActiveByRentalOrderId` conflict in gate + in-scope create |
| Warehouse/product parity | `expectedWarehouseId` + product match checks |

### Phase 35 — Payment settlement atomic predicated SQL

**Status: INTACT**

| Check | Evidence |
| ----- | -------- |
| Claim | `PostPaymentService` → `paymentRepository.claimStatusTransition` |
| Settlement | `applyPaymentDelta` raw SQL with status + `paidAmount + delta <= grandTotal` predicates |
| Absolute writes | No unsafe absolute `paidAmount`/`balance` assignment found on settlement path |

### Phase 43 — Inventory PATCH cannot mutate counters

**Status: INTACT**

| Check | Evidence |
| ----- | -------- |
| Schema | `UpdateInventorySchema` = `minimumStock` / `maximumStock` / `isActive` only, `.strict()` |
| Comment lock | Explicit Phase 43 / F-31-08 ledger integrity note in schema file |
| Correction path | ADJUSTMENT stock movement (DL-51-01) |

### Phase 65 — Expense accounting transactional atomicity

**Status: INTACT**

| Check | Evidence |
| ----- | -------- |
| Ordering | `updateStatus(PAID)` → `onExpensePaid` → optional `journalEntryId` link |
| Same UoW | Expense transaction runner / shared Prisma `$transaction` (Phase 65/66 verified; code path unchanged at HEAD) |
| Failure | Thrown accounting/journal failures roll back (T65.2/T65.3) |
| Soft-null | Missing GL still returns `null` without throw (F-66-P3-02; not a Phase 65 lock violation) |

---

## 5. Concurrency Review

### Confirmed protections

| Area | Protection |
| ---- | ---------- |
| Payment post | `claimStatusTransition` + predicated `applyPaymentDelta` |
| Invoice issue/void | `claimStatusTransition`; void blocked by POSTED payments |
| Dispatch complete | Dispatch status claim + RO `claimStatusTransition` to `ON_RENT`; inventory OUT via atomic stock movement SQL |
| Return receive/inspect/complete | Status claims (Phase 29/41 patterns retained) |
| ERA create | Inventory + RO row locks before shortfall validation |
| Stock counters | Atomic SQL in movement executor |
| Expense pay (single request) | Full transactional rollback on throw |

### Remaining races

| ID | Class | Notes |
| -- | ----- | ----- |
| F-66-P3-01 | **Theoretical** concurrent race | Dual APPROVED→PAID without claim; duplicate operational journals possible under READ COMMITTED; no unique constraint on `(referenceType, referenceId)` (index only @ `JournalEntry`) |
| F-37-R2 | Harmless uniqueness retry gaps | Sequence gaps possible; duplicates prevented |

### Safe / already-protected

- Sequential expense re-pay rejected by domain (`withPaid` / T65.5)
- Payment over-commitment prevented by SQL predicates
- Dispatch duplicate completion prevented by status claim
- Public stock movement cannot forge IN/OUT/RESERVE/RELEASE via HTTP

### Transaction boundaries

Expense pay, payment post, ERA create, dispatch complete, and stock movements continue to use established UoW / Prisma transaction runners. No nested independent `$transaction` escape hatch found on these primary paths during this audit.

---

## 6. Authorization Review

| Role matrix | Result |
| ----------- | ------ |
| WORKER financial mutations | **Denied** — `rentalInvoices.create/update/issue/void`, `payments.create/post/void`, `expenses.pay` absent from WORKER (`role-permissions.ts`; T57.1) |
| WORKER operational mutations | **Preserved** (dispatch/return/repair/maintenance/stock create as previously locked) |
| Stock ADJUSTMENT POST | Requires `stockMovements.create` + `inventory.adjust` |
| ACCOUNTANT | Financial-oriented permissions retained; not granted inventory adjust / stock create in prior matrix |
| Summary GET routes | Use module read permissions via shared API runners |

No authorization redesign recommended. No WORKER financial mutation bypass confirmed.

---

## 7. Reporting Review

### N-39-PATTERN-01 overall status

| Batch | Domains | Status |
| ----- | ------- | ------ |
| Batch 1 | Rental Invoice, Dispatch, Rental Order, Payment | **CLOSED** at API/service/repo; **Dispatch frontend barrel incomplete (F-71-P2-01)** |
| Batch 2 | Expense, Inventory, Asset | **CLOSED** (Phase 67 + 69 barrels) |
| Batch 3 | Repair, Return, Maintenance | **CLOSED** (Phase 70) |

### Phase 70 verification (intact)

```text
GET /api/repairs/summary
GET /api/returns/summary
GET /api/maintenances/summary
  → Get*SummaryService → findSummaryStats
  → Prisma count + groupBy + aggregate
Frontend: use*SummaryStats → get*Summary({}) via feature barrels (export *)
```

Repair repository evidence: `findSummaryStats` uses `count` / `groupBy(status)` / `aggregate(_sum actualCost)` with **no `take: 100`**.

### Remaining capped queries

Repository-wide `pageSize: 100` usages are predominantly:

- Filter/dropdown lookups (products, warehouses, customers, suppliers)
- Related-record panels (returns by dispatch, repairs by return)
- Intentionally bounded UI lists

**Not classified as N-39 dashboard defects.**

### Observation (WIP only — not committed HEAD)

Untracked detail sections under `src/features/supplier/components/*` and `src/features/warehouse/components/*` reduce capped `pageSize: 100` lists into MetricCards (with truncation hints in some). These are **WIP observations**, not Phase 70 baseline defects. Do not promote until merged intentionally.

### Legacy mappers

`computeDispatchSummary` / similar client mappers still exist for local display math but list dashboards use summary hooks. Not a capped aggregation regression for Batch 1–3 list pages.

---

## 8. F-66 Residual Review

### F-66-P3-01 — Expense pay concurrency parity gap

| Field | Value |
| ----- | ----- |
| Still valid? | **YES** |
| Classification | Theoretical concurrent race / hardening gap |
| Promotion? | **No** — remains P3 deferred |
| Evidence | `PayExpenseService` uses `expenseRepository.updateStatus` without expected-status predicate; `PrismaExpenseRepository.updateStatus` = `update({ where: { id } })`; contrast `PostPaymentService.claimStatusTransition`; `JournalEntry` has `@@index([referenceType, referenceId])` only |
| Sequential safety | Intact (domain + T65.5) |
| Recommended posture | Defer unless policy mandates payment-parity claims |

### F-66-P3-02 — Soft-fail PAID without journal when GL missing/inactive

| Field | Value |
| ----- | ----- |
| Still valid after Phase 65? | **YES** |
| Classification | Operational soft-fail / P3 residual |
| Phase 65 interaction | Atomicity lock covers thrown failures + rollback; soft-`null` account resolution is intentional shared operational-journal behavior (`resolveAccount` → null → `postExpensePaidJournal` returns null → expense remains PAID without `journalEntryId`) |
| Same pattern | Payment/invoice operational posting also soft-nulls on missing accounts |
| Promotion? | **No** unless decision lock changes soft-fail → hard-fail |

---

## 9. New Findings

### P0

None.

### P1

None.

### P2

#### F-71-P2-01 — Dispatch summary barrel/type export gap

| Field | Value |
| ----- | ----- |
| Finding ID | **F-71-P2-01** |
| Severity | **P2** |
| Affected files | `src/features/dispatch/services/index.ts`, `src/features/dispatch/types/index.ts`, consumers `use-dispatch.ts`, `dispatch.service.ts` |
| Actual behavior | `getDispatchSummary` exists in `dispatch.service.ts` and is imported from `../services`, but barrel does not re-export it. Summary types exist in `dispatch.types.ts` but are omitted from `types/index.ts`. |
| Expected | Same Phase 69 barrel completeness as Expense/Inventory/Asset summaries |
| Why defect | Hard `tsc` failures (`TS2724` / `TS2305`); blocks clean typecheck / module resolution for Dispatch dashboard summary path — identical defect class to F-68-P2-01 |
| Concurrency | None |
| Authorization | None |
| Test evidence | `npx tsc --noEmit` reports missing exports; Phase 69/70 reports already noted this micro-gap as out of scope |
| Confidence | **High** |

### P3

No new P3 beyond deferred residuals (F-66-P3-01, F-66-P3-02, F-07, F-37-R2).

### Observations

| ID | Note |
| -- | ---- |
| OBS-71-01 | WIP supplier/warehouse detail MetricCards may aggregate capped lists; truncation partially disclosed; not in committed baseline |
| OBS-71-02 | Legacy `computeDispatchSummary` mapper remains unused by list dashboard summary hook path |
| F-07 | `DISPATCHED` remains ephemeral domain step; persisted lasting status after first complete is `ON_RENT` — documentation/semantics gap, not corruption |

### Deferred

| ID | Severity | Notes |
| -- | -------- | ----- |
| F-66-P3-01 | P3 | Concurrent expense pay journal duplication risk |
| F-66-P3-02 | P3 | Soft-fail without journal |
| F-07 | P3 | DISPATCHED persistence semantics |
| F-37-R2 | P3 | Invoice sequence gaps |

### Documentation

| ID | Status |
| -- | ------ |
| N-51-DOC-01 | CLOSED |
| DOC-64-01 | Remains optional hardening (summary API auth test coverage gap for Payment/RO) |
| F-09 production orphan audit | Deployment prerequisite (see § below) |

### F-09 deployment prerequisite

Schema FK implementation **CLOSED**. Production `orphan_count` verification remains a **deployment prerequisite** (credentials historically unavailable). Not an active code defect.

---

## 10. Priority Queue

Ranked actionable items:

1. **F-71-P2-01** — Dispatch summary barrel/type exports (**P2**, typecheck/user-visible dashboard wiring completeness, tiny scope)
2. **F-66-P3-01** — Expense pay `claimStatusTransition` parity (**P3**, theoretical concurrency, financial journal integrity)
3. **F-66-P3-02** — GL soft-fail policy decision (**P3**, operational)
4. **F-07** — Document or persist DISPATCHED semantics (**P3**, deferred)
5. **F-37-R2** — Sequence gap policy (**P3**, cosmetic)
6. **F-09 prod verify** — Deployment prerequisite only
7. **DOC-64-01** — Summary auth tests (documentation)

---

## 11. Next Recommended Phase

**Phase 72 — Hotfix: Dispatch summary barrel/type exports (F-71-P2-01)**

Mirror Phase 69:

- Export `getDispatchSummary` from `src/features/dispatch/services/index.ts`
- Export `GetDispatchSummaryParams`, `DispatchSummaryResponse`, `DispatchSummaryStats` (as needed) from `src/features/dispatch/types/index.ts`
- Confirm `tsc` clears F-71-P2-01 symbols
- Do **not** rewrite Dispatch summary aggregation logic

Rationale: Highest severity open actionable finding (P2), proven identical fix pattern, minimal scope, unlocks clean Batch 1 frontend completeness after Phase 70 closed Batch 3.

If F-71-P2-01 were already closed, next would be Maintenance / Deployment Verification Mode or optional F-66-P3-01 hardening — **do not invent** a larger phase.

---

## 12. Validation

| Check | Result |
| ----- | ------ |
| Phase 70 summary tests (repair/return/maintenance T70) + WORKER auth T57 | **66/66 PASS** |
| Focused broader module run | Partial: 220 tests passed; 5 suites failed loading `database.config` / `security.config` without process env |
| Full suite | **2573 tests PASSED**; **59 suites FAILED** at import via `parseEnvOrExit` (`DATABASE_URL` / `BETTER_AUTH_SECRET` unset in process despite `.env` file present) — **environment blocker**, not Phase 70 logic failure |
| Prisma validate | **PASS** |
| TypeScript | **FAIL (pre-existing / in-scope):** F-71-P2-01 dispatch barrel/type errors confirmed; additional unrelated WIP/test typing noise also present |
| ESLint (focused Phase 70 summary services + dispatch barrel) | **PASS** (exit 0) |
| Environment blockers | Process env not populated for suites importing `src/shared/config/database.config.ts` / `security.config.ts` |

---

## 13. WIP Integrity

| | |
|--|--|
| WIP before | Dirty tree @ HEAD `72abd77`; ~145 short-status lines (modified audits/seeds/features/modules + untracked phase patches, financial-report WIP, supplier/warehouse sections, etc.) |
| WIP after | Same unrelated set preserved; **only** intended addition: `docs/audits/PHASE_71_POST_PHASE_70_ENTERPRISE_GAP_AUDIT.md` |
| Changed files (this phase) | Audit documentation only |
| Unrelated WIP changed | **NO** |
| Application / schema / migrations / tests / config modified | **NO** |
| Push | **NO** |
| Commit | **NO** (unless explicitly requested later) |

---

## Final Guardrail Checklist

- [x] Phase 70 intact at `72abd77`
- [x] No Phase 70 logic rewritten
- [x] No application/domain/infrastructure/API/schema/migration/test/config changes
- [x] Unrelated WIP preserved
- [x] Historical findings independently reconciled
- [x] Decision locks revalidated (all INTACT)
- [x] N-39 repository-wide capped aggregation reviewed
- [x] F-66-P3-01 / F-66-P3-02 / F-07 / F-37-R2 / N-51-DOC-01 / F-09 reassessed
- [x] Concurrency audited at persistence level
- [x] Authorization audited
- [x] Full suite attempted; Prisma validated; TS/ESLint documented
- [x] Exactly one next priority selected
- [x] Audit-only; nothing pushed

---

*Phase 71 audit performed read-only. No production fixes applied. No push.*
