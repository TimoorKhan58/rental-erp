# Phase 31 — Post-Phase-30 Enterprise Gap Audit Report

**Audit date:** 2026-08-17  
**Auditor scope:** READ-ONLY — no production, test, schema, or migration changes  
**Parent phase:** Phase 30 — Dispatch Claimed-Quantity Integrity (`bbe89b4`)

---

## Executive Verdict

**AUDIT COMPLETE — NEXT PHASE IDENTIFIED**

Phase 30 is committed and verified. Dispatch claimed-quantity integrity (F-05, F-30-05, F-30-06) is **closed**. The highest-priority **remaining** enterprise gap is **F-06 / F-31-01 — date-aware rental availability serialization**: concurrent overlapping reserves can over-commit period capacity because F-02 snapshot reads are not atomically coupled to reservation commits. This is a **data-corruption-class** defect on the core rental workflow and outranks deferred maintenance/repair idempotency (F-30-07) and the newly confirmed rental-invoice paging defect (F-31-03) on practical frequency.

---

## Repository Baseline

| Attribute | Value |
| --- | --- |
| Branch | `main` |
| HEAD | `bbe89b4420128bf1fdc03f8d874263fbfda4db9c` |
| Phase 30 commit | `bbe89b4` — `feat(dispatch): harden claimed-quantity integrity` |
| Phase 29 commit | `d0ded6c` — `feat(concurrency): harden workflow command idempotency` |
| Phase 28 checkpoint | `e963a8b` — `feat(external-rental): enforce mixed return source condition attribution` |
| Working tree | Clean except 2 untracked Phase 30 docs (decision lock + prior gap audit) |
| Ahead of `origin/main` | **9 commits** |
| Push status | **NOT PERFORMED** |

Verified at audit start:

```
git branch --show-current  → main
git log -1 --oneline       → bbe89b4 feat(dispatch): harden claimed-quantity integrity
git rev-list --count HEAD ^origin/main → 9
```

Untracked (intentional, not in Phase 30 commit):

- `docs/decisions/DISPATCH_CLAIMED_QUANTITY_INTEGRITY_30.md`
- `docs/audits/PHASE_30_ENTERPRISE_GAP_AUDIT.md`

---

## Phase 30 Verification

Static review of commit `bbe89b4` against `docs/decisions/DISPATCH_CLAIMED_QUANTITY_INTEGRITY_30.md` and `docs/audits/PHASE_30_IMPLEMENTATION_REPORT.md`.

| Check | Result | Evidence |
| --- | --- | --- |
| **Rollup A** — non-CANCELLED dispatch-item SQL aggregate | **PASS** | `prisma-dispatch.repository.ts` L142–196: `SUM(COALESCE(ownedQuantity, quantity))`, `SUM(COALESCE(externalQuantity, 0))`, `status <> 'CANCELLED'` |
| **Rollup B** — COMPLETED dispatch `quantity` sum (return sync) | **PASS** | `sync-rental-order-status-from-returns.ts` L27–30; `findCompletedDispatchesByRentalOrderId` |
| **No pageSize cap on integrity paths (dispatch/RO cancel/sync)** | **PASS** | `create-dispatch.service.ts`, `update-dispatch.service.ts`, `cancel-rental-order.service.ts`, `sync-rental-order-status-from-returns.ts` — no `findPaged({ pageSize: 100 })` |
| **Create/update sequence: lock → aggregate → validate → persist** | **PASS** | `lockForDispatchClaim` (`prisma-rental-order.repository.ts` L457–469 `FOR UPDATE`); then `sumClaimedSourceQuantitiesByRentalOrderId` in create/update services |
| **No persisted dispatch counter** | **PASS** | No schema diff; derived aggregate only |
| **Over-capacity → HTTP 422** | **PASS** | `validateRentalOrderForDispatch` → `UnprocessableError`; T30.1–T30.3 in `dispatch.claimed-quantity.30.application.test.ts` |
| **Phase 29 409 on CompleteDispatch** | **PASS** | `complete-dispatch.service.ts` unchanged in Phase 30; `claimStatusTransition` + `ConcurrentUpdateError`; T30.8 regression |
| **RO cancel EXISTS guard** | **PASS** | `cancel-rental-order.service.ts` L88–91 `existsNonCancelledDispatchByRentalOrderId` |
| **Return sync unbounded COMPLETED fetch** | **PASS** | T30.6 — 100 DRAFT + 1 COMPLETED beyond page boundary |
| **CompleteDispatch claim-before-side-effects** | **PASS** | Zero diff vs parent on `complete-dispatch.service.ts` |
| **Phase 30 test suite** | **PASS** (committed) | 10 tests in `dispatch.claimed-quantity.30.application.test.ts`; full suite reported 3022/3022 at Phase 30 closeout |

**Regression:** None identified in Phase 30 scope.

---

## Previous Findings Reconciliation

| Legacy ID | Status | Notes |
| --- | --- | --- |
| **F-01** CompleteReturn side-effects-before-claim | **CLOSED** (Phase 29) | `complete-return.service.ts` L115 `claimStatusTransition` before inventory |
| **F-02** ExternalRental atomic counters/settlement | **CLOSED** (Phase 29) | `applyWorkflowDelta`, `applySettlement`, T29.3/T29.4 |
| **F-03** Inventory OUT/IN/ADJUSTMENT | **CLOSED** (Phase 29) | `decrementOnHand` / `incrementOnHand` / `applyAdjustment`, T29.5 |
| **F-04** CompleteDispatch concurrency | **CLOSED** (Phase 29) | T29.2; preserved post-Phase 30 |
| **F-05** Dispatch claimed-quantity rollup + TOCTOU | **CLOSED** (Phase 30) | SQL aggregate + parent-row lock; T30.1–T30.4 |
| **F-06** Date-aware availability serialization | **OPEN** → **F-31-01** | Still valid; see confirmed finding |
| **F-07** RentalOrder.DISPATCHED ghost enum | **OPEN** → **F-31-09** | P3; unchanged |
| **F-08** RO status writers without predicates | **CLOSED** (Phase 29) for Confirm/CompleteDispatch/sync | Sync uses `claimStatusTransition` |
| **F-09** Repair.returnInspectionItemId missing FK | **OPEN** → **F-31-07** | Still valid |
| **F-10** Phase 28 source×condition DB CHECK absence | **INTENTIONAL NON-GAP** | Application-enforced per Phase 28 lock |
| **F-11** Authorization granularity | **OPEN** → **F-31-06** | All six sub-gaps still present |
| **F-30-05** RO cancel paged dispatch guard | **CLOSED** (Phase 30) | EXISTS query |
| **F-30-06** Return-sync paged dispatch rollup | **CLOSED** (Phase 30) | `findCompletedDispatchesByRentalOrderId` |
| **F-30-07** Maintenance/repair stock before status claim | **DEFERRED — STILL VALID** → **F-31-02** | Side effects before plain `updateStatus` |
| **F-30-08** CONFIRMED excluded from F-02 commitment lines | **DEFERRED — STILL VALID** → **F-31-04** | Frozen by Phase 30 decision lock §18 |
| **F-30-01** Return receive/inspect no atomic claim | **OPEN** → **F-31-05** | P2 |
| **F-30-02** No DB CHECK constraints | **OPEN (optional)** → **F-31-11** | Defense-in-depth |
| **F-30-03** UpdateInventory absolute bypass | **OPEN** → **F-31-08** | P2 |
| **F-30-04** *(inventory adjust permission)* | Subsumed under **F-31-06e** | |

---

## Confirmed Findings

### F-31-01 — F-02 date-aware availability serialization (F-06 carry-forward)

| Field | Value |
| --- | --- |
| **Severity** | **P1 — High** |
| **Area** | RentalOrder / F-02 availability |
| **File(s)** | `src/modules/rental-order/application/services/reserve-rental-order.service.ts` (L111–247), `get-date-aware-availability.service.ts`, `prisma-rental-order.repository.ts` `findAvailabilityCommitmentLines` (L125–205), `prisma-inventory.repository.ts` `reserveAvailableQuantity` |
| **Service** | `ReserveRentalOrderService`, `GetDateAwareAvailabilityService` |
| **Observed behavior** | F-02 `dateAwareAvailableQuantity` is computed from a read-only snapshot, then `updateReserve` and inventory `RESERVE` execute separately. Global inventory guard checks `reservedQuantity <= quantityOnHand` only — **not** overlapping period capacity. |
| **Expected behavior** | Concurrent overlapping reserves must not exceed date-aware capacity for the same product × warehouse × period. |
| **Business impact** | Two operators (or two orders) with overlapping event dates can both pass F-02 and reserve — **period double-booking** when global on-hand allows total reserved qty. |
| **Reproduction** | Product on-hand 200; two CONFIRMED orders overlapping dates each reserve 100; both pass F-02 individually; both succeed though period capacity for overlapping window is exhausted. |
| **Existing safeguard** | `updateReserve` atomic CONFIRMED→RESERVED per order; `reserveAvailableQuantity` atomic global cap. |
| **Why insufficient** | F-02 commitment is not re-validated atomically at commit; no cross-order period lock. |
| **Decision-lock status** | **REQUIRED** — serialization strategy (parent lock, commitment ledger, or predicated period commit) per Phase 29 §21 deferral |
| **Schema impact** | **OPTIONAL** — may need commitment ledger table; not strictly required if app-level serializable scope chosen |
| **Evidence** | `reserve-rental-order.service.ts` L111 comment + L145–182 read then L173+ mutate; regression header in `f02-date-aware-availability.regression.test.ts` L4–6 |

---

### F-31-02 — Maintenance/repair stock movements before status claims (F-30-07 carry-forward)

| Field | Value |
| --- | --- |
| **Severity** | **P1 — High** |
| **Area** | Maintenance / Repair / Inventory |
| **File(s)** | `start-maintenance.service.ts` (L92–112), `complete-maintenance.service.ts` (L84–104), `complete-repair.service.ts` (L90–110), `cancel-maintenance.service.ts` (L75–105) |
| **Service** | Start/Complete/Cancel maintenance; Complete repair |
| **Observed behavior** | Stock OUT/IN via `executeCreateStockMovementInScope` runs **before** unconditional `maintenanceRepository.updateStatus` / `repairRepository.updateStatus`. No `claimStatusTransition` in maintenance or repair modules. |
| **Expected behavior** | Phase 29 pattern: atomic expected-status claim **before** inventory side effects; loser gets 409; side effects at-most-once. |
| **Business impact** | Concurrent start/complete on same record can emit **duplicate OUT/IN movements** and duplicate audit entries. |
| **Reproduction** | `Promise.allSettled` two `StartMaintenanceService.execute` on same SCHEDULED record — both pass in-memory `withStarted()`, both OUT. |
| **Existing safeguard** | Phase 29 atomic `decrementOnHand`/`incrementOnHand` per movement — prevents negative stock but **not** duplicate workflow movements. |
| **Why insufficient** | No workflow-level idempotency; no reference uniqueness on `(referenceType, referenceId, movementType)`. |
| **Decision-lock status** | **REQUIRED** — extend Phase 29 side-effect/status-claim family (explicitly deferred Phase 30 §16) |
| **Schema impact** | **NONE** for claim pattern; optional unique index on stock reference for dedup |
| **Evidence** | Zero `claimStatusTransition` in `src/modules/maintenance/**` and `src/modules/repair/**`; compare `complete-return.service.ts` L115 |

---

### F-31-03 — Rental invoice dispatch rollup capped at pageSize 100 (NEW — F-05 family)

| Field | Value |
| --- | --- |
| **Severity** | **P1 — High** |
| **Area** | RentalInvoice / Dispatch / Return |
| **File(s)** | `generate-rental-invoice-from-order.service.ts` (L94–107), `convert-missing-to-loss.service.ts` (L79–92) |
| **Service** | `GenerateRentalInvoiceFromOrderService`, `ConvertMissingToLossService` |
| **Observed behavior** | Both load dispatches via `dispatchRepository.findPaged({ page: 1, pageSize: 100, rentalOrderId })`, then flatten returns per dispatch for invoice line calculation or missing→lost conversion. |
| **Expected behavior** | All dispatches (and their returns) for the rental order must contribute to invoice integrity calculations. |
| **Business impact** | Orders with **>100 dispatches**: damage/loss/missing charges **under-billed**; convert-missing-to-loss may skip returns on omitted dispatches — invoice/return inconsistency. |
| **Reproduction** | Seed 101+ dispatches with completed returns carrying missing qty; generate invoice — charges omit dispatch 101+. |
| **Existing safeguard** | Domain invoice line builder correct on **complete input set**. |
| **Why insufficient** | Input truncated by pagination — same defect class as pre-Phase-30 F-05. |
| **Decision-lock status** | **Provisional** — reuse Phase 30 Rollup patterns or unbounded `findByRentalOrderId` repository method |
| **Schema impact** | **NONE** |
| **Evidence** | Phase 30 fixed dispatch create/cancel/sync but **explicitly did not** touch rental-invoice services |

---

### F-31-04 — CONFIRMED orders excluded from F-02 commitment lines (F-30-08 carry-forward)

| Field | Value |
| --- | --- |
| **Severity** | **P1 — High** (business-policy gap, not accidental regression) |
| **Area** | RentalOrder / F-02 availability |
| **File(s)** | `rental-order.availability.rules.ts` (L34–38, L268–271), `prisma-rental-order.repository.ts` (L136–138), tests in `f02-date-aware-availability.regression.test.ts` |
| **Observed behavior** | `AVAILABILITY_COMMITMENT_STATUSES` = `RESERVED | ON_RENT | PARTIALLY_RETURNED` only. CONFIRMED overlapping orders do not reduce each other's `dateAwareAvailableQuantity`. |
| **Expected behavior** | **Undecided** — Phase 30 lock §18 DEFERRED: either soft-confirm (current) or include CONFIRMED in commitment. |
| **Business impact** | Multiple overlapping CONFIRMED orders show full availability until first reserve; amplifies F-31-01 double-book path. |
| **Reproduction** | Two CONFIRMED orders same product/dates — both show full F-02 availability. |
| **Existing safeguard** | Tests encode current semantics as intentional (`"CONFIRMED filtered → commitment = 0"`). |
| **Why insufficient** | Product policy unresolved; combined with F-31-01 creates operational double-book risk. |
| **Decision-lock status** | **REQUIRED** before implementation — must not change F-02 formula without new lock (Phase 30 §18) |
| **Schema impact** | **NONE** |
| **Evidence** | `DISPATCH_CLAIMED_QUANTITY_INTEGRITY_30.md` §18; `DISPATCH_CLAIMED_QUANTITY_INTEGRITY_30.md` F-30-08 |

---

### F-31-05 — Return receive/inspect lack atomic status claims (F-30-01 carry-forward)

| Field | Value |
| --- | --- |
| **Severity** | **P2 — Medium** |
| **Area** | Return |
| **File(s)** | `receive-return.service.ts` (L58), `inspect-return.service.ts` (L82), `prisma-return.repository.ts` `updateStatus` |
| **Observed behavior** | Receive/Inspect use unconditional `updateStatus`; no expected-status predicate. |
| **Expected behavior** | Phase 29 once-only pattern for DRAFT→RECEIVED and RECEIVED→INSPECTED. |
| **Business impact** | Concurrent receive/inspect: duplicate audit, last-writer timestamps; **no inventory side effects** on these steps (lower than Complete). |
| **Reproduction** | Parallel receive on same DRAFT return. |
| **Existing safeguard** | Domain in-memory guards; Complete uses claim (Phase 29). |
| **Why insufficient** | No DB predicate; retry/double-click can re-enter. |
| **Decision-lock status** | Provisional — extend Phase 29 pattern |
| **Schema impact** | **NONE** |

---

### F-31-06 — Authorization granularity gaps (F-11 carry-forward)

| Field | Value |
| --- | --- |
| **Severity** | **P2 — Medium** |
| **Area** | Authorization / API |
| **Sub-findings** | |
| **F-31-06a** | Mark-read uses `notifications:read` — `notification-api.routes.ts` L105 |
| **F-31-06b** | Expense submit uses `expenses:update` — `expense-api.routes.ts` L169 |
| **F-31-06c** | Expense category delete uses `expenses:update` — `expense-category-api.routes.ts` L169 |
| **F-31-06d** | Invoice convert-missing-to-loss uses `rental-invoices:update` — `rental-invoice-api.routes.ts` L266 |
| **F-31-06e** | `inventory:adjust` orphaned; adjust via `stock-movements:create`; PATCH inventory can set `quantityOnHand` — `stock-movement-api.routes.ts` L70, `inventory-api.routes.ts` L135 |
| **F-31-06f** | `notifications:send` defined but no send API — `permissions.ts` L173 |
| **Business impact** | VIEWER can mark notifications read; broad update roles can submit/delete/convert; admin PATCH bypasses adjust permission and movement audit. |
| **Decision-lock status** | **REQUIRED** — permission matrix mapping |
| **Schema impact** | **NONE** |

---

### F-31-07 — Repair.returnInspectionItemId missing FK (F-09 carry-forward)

| Field | Value |
| --- | --- |
| **Severity** | **P2 — Medium** |
| **Area** | Database / Repair |
| **File(s)** | `prisma/schema.prisma` (Repair model ~L848–876), `0_baseline/migration.sql` (index only, no FK on item id) |
| **Observed behavior** | `returnInspectionItemId` indexed but no `@relation` / no SQL FK. |
| **Expected behavior** | FK to `ReturnInspectionItem.id` with explicit `onDelete`. |
| **Business impact** | Orphan repair rows; no DB referential integrity if data inserted outside create path. |
| **Decision-lock status** | **REQUIRED** for ON DELETE semantics |
| **Schema impact** | **REQUIRED** — migration adding FK |

---

### F-31-08 — UpdateInventory absolute quantity bypass (F-30-03 carry-forward)

| Field | Value |
| --- | --- |
| **Severity** | **P2 — Medium** |
| **Area** | Inventory |
| **File(s)** | `update-inventory.service.ts`, `inventory.schemas.ts` L32, `inventory-api.routes.ts` PATCH |
| **Observed behavior** | PATCH can set `quantityOnHand`/`reservedQuantity` via absolute update, bypassing stock-movement trail and Phase 29 primitives. |
| **Business impact** | Inventory drift vs movements; concurrent PATCH + OUT race. |
| **Decision-lock status** | Required if tightening — may be intentional admin escape hatch |
| **Schema impact** | **NONE** |

---

### F-31-09 — RentalOrder.DISPATCHED ghost enum (F-07 carry-forward)

| Field | Value |
| --- | --- |
| **Severity** | **P3 — Low** |
| **Area** | Domain / Analytics |
| **File(s)** | `prisma/schema.prisma` L527/L704, `rental-order.entity.ts` L149, `complete-dispatch.service.ts` L283 |
| **Observed behavior** | `DISPATCHED` on RO/Dispatch enums; RO never persisted as DISPATCHED (ephemeral dispatch transition only). |
| **Business impact** | Developer confusion; stale analytics contract row. |
| **Schema impact** | Migration if removed |

---

### F-31-10 — Dispatch/Return cancel without atomic claims

| Field | Value |
| --- | --- |
| **Severity** | **P3 — Low** |
| **Area** | Dispatch / Return |
| **File(s)** | `cancel-dispatch.service.ts`, `cancel-return.service.ts` |
| **Observed behavior** | Plain `updateStatus` after domain guard; concurrent cancel can duplicate audit (no inventory on cancel for DRAFT dispatch). |
| **Business impact** | Low — mostly duplicate audit entries. |

---

### F-31-11 — No database CHECK constraints on counters (F-30-02 carry-forward)

| Field | Value |
| --- | --- |
| **Severity** | **P2 — Medium** (defense-in-depth) |
| **Area** | Database |
| **Observed behavior** | No `@@check` in Prisma schema; invariants application/SQL-predicate only. |
| **Business impact** | Direct SQL or future code paths could bypass guards. |

---

### F-31-12 — Test coverage gaps (non-blocking)

| Field | Value |
| --- | --- |
| **Severity** | **P3 — Low** |
| **Area** | Tests |
| **Gaps** | (1) No `UpdateDispatchService` capacity test in Phase 30 suite despite implementation. (2) No genuine concurrency test for `ReserveRentalOrderService`. (3) No concurrency tests for maintenance/repair. (4) No rental-invoice >100 dispatch test. |

---

## Deferred Findings Still Valid

| ID | Summary | Phase 30 status |
| --- | --- | --- |
| **F-30-07** → F-31-02 | Maintenance/repair stock before status claim | Explicitly deferred; **still valid** |
| **F-30-08** → F-31-04 | CONFIRMED excluded from F-02 commitment | Explicitly deferred; **still valid**; needs business decision |

---

## Previously Fixed Findings (Verified Closed)

| Phase | Findings | Verification |
| --- | --- | --- |
| Phase 29 | F-01, F-02 (ERA), F-03, F-04, F-08 (Confirm + CompleteDispatch + sync writer) | Code + T29.1–T29.6 still present |
| Phase 30 | F-05, F-30-05, F-30-06 | Code at `bbe89b4` + T30.1–T30.8 |
| Phase 28 | Source×condition attribution | `return.source-condition.28.application.test.ts` in full suite |

---

## Intentional Non-Gaps

| Item | Rationale |
| --- | --- |
| **F-10** Phase 28 DB CHECK on source×condition | Decision lock: application-enforced; not a gap |
| **List API `findPaged`** | `list-dispatches`, `list-rental-orders`, `list-returns` — UI pagination, not integrity |
| **Frontend `pageSize: 100` hooks** | Dropdown/list hydration only — not business mutation paths |
| **`generate-invoice-number.ts` pageSize 500** | Sequence generation; low collision risk vs integrity rollup |
| **Ephemeral Dispatch DISPATCHED → COMPLETED** | Phase 29 claim serializes completion; RO persists ON_RENT not DISPATCHED |

---

## Stale Documentation

| Document | Issue |
| --- | --- |
| `docs/decisions/ANALYTICS_METRIC_CONTRACT_v1.0.md` §2 L63–64 | States Complete dispatch "does not update rental order status" and "ON_RENT writers — Not found" — **stale** since Phase 29 `CompleteDispatchService` atomically claims ON_RENT |
| `docs/audits/PHASE_30_IMPLEMENTATION_REPORT.md` §1 | References HEAD `d0ded6c` / "no commit" — metadata stale post-`bbe89b4` |
| `docs/decisions/DISPATCH_CLAIMED_QUANTITY_INTEGRITY_30.md` | Status still "PROPOSED — READY FOR IMPLEMENTATION" though implemented — **documentation lag** (file untracked) |

Contract **semantics** (Active Rental = CONFIRMED + RESERVED) remain correct; evidence rows need refresh only.

---

## Out-of-Scope Items

- General ledger / double-entry accounting expansion
- Client idempotency keys / optimistic versioning columns
- Serializable isolation level changes
- Analytics module redesign beyond contract reconciliation
- F-07 enum removal without coordinated migration + analytics update

---

## Finding Summary

| ID | Severity | Area | Business Risk | Implementation Needed |
| --- | --- | --- | --- | --- |
| F-31-01 | P1 | F-02 / Reserve | Period double-booking | Yes — decision lock |
| F-31-02 | P1 | Maintenance/Repair | Duplicate stock movements | Yes — decision lock |
| F-31-03 | P1 | RentalInvoice | Under-billing / inconsistent conversion | Yes |
| F-31-04 | P1 | F-02 policy | CONFIRMED invisible competition | Decision only |
| F-31-05 | P2 | Return | Duplicate audit on receive/inspect | Optional |
| F-31-06 | P2 | Authorization | Privilege granularity / bypass | Yes |
| F-31-07 | P2 | Repair schema | Orphan repair lines | Yes — migration |
| F-31-08 | P2 | Inventory PATCH | Drift / race with movements | Policy decision |
| F-31-09 | P3 | Domain enum | Confusion | Optional cleanup |
| F-31-10 | P3 | Cancel workflows | Duplicate audit | Optional |
| F-31-11 | P2 | DB CHECK | Bypass via direct SQL | Optional |
| F-31-12 | P3 | Tests | Coverage holes | Yes (with fixes) |

---

## Recommended Next Phase

### NEXT PHASE CANDIDATE

**Phase 31 — Date-Aware Availability Serialization (F-02 / F-06)**

**Findings addressed:**

- **F-31-01** (F-06) — primary
- **F-31-04** (F-30-08) — decision resolution bundled (CONFIRMED in commitment or explicit soft-confirm contract)

**Why this is highest priority:**

1. **Data corruption risk** — concurrent overlapping reserves can over-commit period capacity; affects every rental reservation on shared inventory.
2. Occurs on the **core revenue path** (confirm → reserve → dispatch), not a rare edge case.
3. Amplifies pre-reserve visibility gap (F-31-04) and remains **explicitly deferred** since Phase 29 with frozen formula — now needs architecture lock + implementation.
4. Outranks F-31-02 (maintenance/repair — narrower module) and F-31-03 (invoice paging — requires >100 dispatches per order, uncommon) on **frequency × blast radius**.

**Expected scope:**

1. Decision lock: serialization mechanism (e.g., product×warehouse period lock, predicated commitment commit, or ledger) and CONFIRMED inclusion policy (F-31-04).
2. Atomic coupling of F-02 re-read → reserve claim → inventory RESERVE inside existing UoW.
3. Genuine concurrency acceptance tests (`Promise.allSettled` overlapping reserves).
4. Preserve frozen F-02 formula unless decision explicitly amends status set.

**Non-goals:**

1. Dispatch claimed-quantity (Phase 30 — done).
2. Maintenance/repair idempotency (F-31-02 — separate phase).
3. Rental invoice paging fix (F-31-03 — can follow as Phase 32 if F-06 ships first).
4. Schema migration unless decision lock requires commitment ledger.

**Schema impact:** **OPTIONAL** (decision-dependent)

**Migration impact:** **OPTIONAL**

**API impact:** Happy-path unchanged; concurrent over-capacity reserve → expected **422** (align with Phase 30 capacity semantics).

**Concurrency impact:** Serializes overlapping reserve decisions per locked scope; eliminates F-02 TOCTOU.

**Acceptance test requirements:**

- T31.1: Two concurrent overlapping reserves exceeding period capacity — exactly one succeeds, one 422.
- T31.2: Non-overlapping concurrent reserves both succeed when capacity allows.
- T31.3: Existing F-02 single-thread regression matrix unchanged.
- T31.4: CONFIRMED policy test per locked decision (include or exclude).
- T31.5: Global inventory still protected (no negative on-hand).

**Decision-lock questions:**

1. Include CONFIRMED in commitment lines or retain soft-confirm with documented UX?
2. Lock granularity: product×warehouse row, date-range ledger, or serializable transaction scope?
3. Error semantics: 422 capacity vs 409 concurrent update for reserve races?
4. Interaction with external rental shortfall / sourcing reads?

---

## Decision-Lock Readiness

| Topic | Ready? |
| --- | --- |
| F-31-01 F-06 serialization | **Needs new decision lock** |
| F-31-02 F-30-07 maintenance/repair | **Needs extension of Phase 29 lock** |
| F-31-03 rental invoice rollup | **Can reuse Phase 30 aggregate patterns** — smaller lock |
| F-31-04 CONFIRMED policy | **Must be decided inside F-06 lock** |
| F-31-07 Repair FK | **Needs ON DELETE decision** |

Untracked `DISPATCH_CLAIMED_QUANTITY_INTEGRITY_30.md` should be committed separately as documentation hygiene (not part of this audit).

---

## Test Coverage Gaps

| Workflow | Genuine concurrency test? |
| --- | --- |
| CompleteReturn | Yes — T29.1 |
| CompleteDispatch | Yes — T29.2, T30.8 |
| ExternalRental settle/receive | Yes — T29.3, T29.4 |
| Inventory OUT/IN | Yes — T29.5 |
| Confirm RO | Yes — T29.6 |
| CreateDispatch capacity | Yes — T30.1–T30.3 |
| **Reserve RO (F-02)** | **No** |
| **Maintenance/Repair complete** | **No** |
| **Rental invoice generate** | **No** |
| Receive/Inspect return | No |

---

## Validation

| Check | Result |
| --- | --- |
| Only `docs/audits/PHASE_31_ENTERPRISE_GAP_AUDIT.md` created | **PASS** |
| No production files modified | **PASS** |
| No tests modified | **PASS** |
| No schema/migration modified | **PASS** |
| Decision locks unchanged | **PASS** |
| HEAD unchanged (`bbe89b4`) | **PASS** |
| No commit | **PASS** |
| No push | **PASS** |

---

## Git Safety

```
git status --short:
?? docs/audits/PHASE_30_ENTERPRISE_GAP_AUDIT.md
?? docs/decisions/DISPATCH_CLAIMED_QUANTITY_INTEGRITY_30.md
?? docs/audits/PHASE_31_ENTERPRISE_GAP_AUDIT.md  (this audit — new)

HEAD: bbe89b4
Ahead of origin/main: 9
```

---

## Final Recommendation

**Proceed to Phase 31 decision lock for Date-Aware Availability Serialization (F-31-01 / F-06)** before implementation. Phase 30 dispatch integrity is verified closed. The next highest enterprise risk is **period capacity over-commitment on concurrent reserve**, not deferred maintenance/repair idempotency or rental-invoice paging (both real P1s, lower operational frequency). F-30-07 and F-30-08 remain deferred and must be resolved inside their respective phase locks — F-30-08 specifically as part of the F-06 decision.

**Do not implement until decision lock is approved.**
