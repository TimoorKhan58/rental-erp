# Post-Phase-35 Enterprise Gap Audit

**Audit date:** 2026-08-27  
**Auditor scope:** Full enterprise correctness surface after Phase 35 — concurrency, money/inventory integrity, pagination aggregates, workflow bypasses, prior-phase regression  
**Audit type:** Read-only — no production code, schema, test, commit, or push changes  
**Authoritative baseline:** committed `HEAD` **`bd8b2201edff441c0022114e379ba19852a645e3`** — `feat(payment): harden invoice settlement concurrency`  
**Prior audits consulted:** Phase 29–35 enterprise gap audits, Phase 35 decision lock / implementation report

---

## 1. Executive Verdict

**AUDIT COMPLETE — GO TO PHASE 36 DECISION LOCK**

Phase 35 **closed F-35-01** (payment invoice settlement concurrency). Committed production code at `bd8b220` uses payment `claimStatusTransition` before atomic `applyPaymentDelta` SQL; T35.1–T35.6 validate concurrent settlement.

The **highest-priority remaining enterprise gap** is a **new P1 finding (F-36-01)**: `CancelMaintenanceService` gates stock IN reversal on a **pre-claim stale read** (`wasInProgress = existing.status === "IN_PROGRESS"`). When start and cancel race on the same record, cancel can succeed while **skipping the IN reversal** for an OUT movement already emitted — **owned inventory leak**.

The **second-priority cluster** remains the deferred **invoice integrity family (F-33-01 / F-33-02 / F-35-05 / F-36-02)** at **P2** — pagination caps and split-transaction TOCTOU on active-invoice guards. These are important but lower severity than workflow-path inventory corruption under normal concurrent operations.

**No P0 open findings** at `bd8b220`.

**Working-tree note:** ~100+ modified/untracked files remain. Uncommitted WIP includes `sumPendingAmountByRentalInvoiceId` on create/post payment paths and UI/reporting changes — **not audited as committed behavior**. All findings below are verified against `git show bd8b220:path` unless noted.

---

## 2. Baseline

| Attribute | Value |
| --- | --- |
| Branch | `main` |
| HEAD | `bd8b2201edff441c0022114e379ba19852a645e3` |
| Ahead of `origin/main` | **2 commits** (Phase 34 + Phase 35) |
| Push status | **NOT PERFORMED** (by this audit) |
| Working tree | **Substantial WIP** (~100+ modified, ~30 untracked) |
| Phase 35 | **COMPLETE / COMMITTED** — F-35-01 fixed; 3067/3067 suite at validation |
| Production code modified by this audit | **None** (this document only) |

**Git safety commands (post-audit):**

| Check | Result |
| --- | --- |
| `git log -1 --oneline` | `bd8b220 feat(payment): harden invoice settlement concurrency` |
| HEAD unchanged | **PASS** |
| Commit / push | **NOT PERFORMED** |
| `git diff --check` | CRLF line-ending warnings only (pre-existing WIP) |

---

## 3. Phase 28 Verification

**Decision lock:** `docs/decisions/MIXED_RETURN_SOURCE_CONDITION_ATTRIBUTION_28.md`

| Requirement | Evidence @ `bd8b220` | Verdict |
| --- | --- | --- |
| Owned vs external source attribution on complete | `complete-return.service.ts` — `computeReleaseQuantity`, `computeRestockQuantity`, external customer-return delta paths | **PASS** |
| Source×condition matrix preserved | `return.source-condition.28.application.test.ts` | **PASS** |
| External GOOD does not enter owned inventory | CompleteReturn movement routing unchanged | **PASS** |
| Phase 29 claim before side effects on complete | `complete-return.service.ts` — `claimStatusTransition(INSPECTED→COMPLETED)` before stock/ERA mutations | **PASS** |

**Verdict:** Phase 28 **HONORED**. No regression.

---

## 4. Phase 29 Verification

**Decision lock:** `docs/decisions/CONCURRENT_SAFE_COMMAND_IDEMPOTENCY_29.md`

| Pattern | Services verified @ `bd8b220` | Verdict |
| --- | --- | --- |
| `claimStatusTransition` before side effects | CompleteReturn, CompleteDispatch, ConfirmRentalOrder, ERA workflows, maintenance/repair (6), payment post | **PASS** |
| `ConcurrentUpdateError` → HTTP 409 | Above services + external rental | **PASS** |
| Inventory atomic SQL deltas | `prisma-inventory.repository.ts` — predicated reserve/release/out/in/adjustment | **PASS** |
| ERA counter predicates | `applyWorkflowDelta`, `applySettlement` | **PASS** |
| READ COMMITTED / no version column / no idempotency table | Unchanged | **PASS** |

**Verdict:** Phase 29 **HONORED**. No regression on covered paths.

---

## 5. Phase 30 Verification

**Decision lock:** `docs/decisions/DISPATCH_CLAIMED_QUANTITY_INTEGRITY_30.md`

| Requirement | Evidence @ `bd8b220` | Verdict |
| --- | --- | --- |
| Derived SQL dispatch claim aggregate | `prisma-dispatch.repository.ts` L167–220 — `sumClaimedSourceQuantitiesByRentalOrderId` via SQL `SUM` | **PASS** |
| No paginated authoritative rollup on dispatch paths | Create/update dispatch use SQL aggregate, not `findPaged` | **PASS** |
| Parent rental_order FOR UPDATE on same-order claim | `create-dispatch.service.ts` — parent lock pattern preserved | **PASS** |
| EXISTS cancel guard | `existsNonCancelledDispatchByRentalOrderId` — SQL EXISTS | **PASS** |
| Completed dispatch rollup unbounded | `findCompletedDispatchesByRentalOrderId` — unbounded `findMany` | **PASS** |
| Capacity failure = HTTP 422 | Dispatch validation throws `UnprocessableError` | **PASS** |

**Verdict:** Phase 30 **HONORED**. No regression.

---

## 6. Phase 31 Verification

**Decision lock:** `docs/decisions/DATE_AWARE_AVAILABILITY_SERIALIZATION_31.md`

| Requirement | Evidence @ `bd8b220` | Verdict |
| --- | --- | --- |
| Inventory row `SELECT FOR UPDATE` | `prisma-inventory.repository.ts` L505–516 — `lockForAvailabilityCommit` | **PASS** |
| Deterministic inventoryId ascending lock order | `reserve-rental-order.service.ts`, `cancel-rental-order.service.ts` — sorted lock targets | **PASS** |
| F-02 availability re-read after lock | Reserve path re-reads commitment after locks | **PASS** |
| Cancel locks inventory before RELEASE | `cancel-rental-order.service.ts` L165–167 | **PASS** |
| CONFIRMED excluded from F-02 commitment | `rental-order.availability.rules.ts` | **PASS** |
| No schema change | Unchanged | **PASS** |

**Verdict:** Phase 31 **HONORED**. No regression.

---

## 7. Phase 32 Verification

**Decision lock:** `docs/decisions/RENTAL_ORDER_RESERVE_COMMAND_INTEGRITY_32.md`

| Requirement | Evidence @ `bd8b220` | Verdict |
| --- | --- | --- |
| Phase 31 inventory locks preserved | `reserve-rental-order.service.ts` L112 — `lockForAvailabilityCommit` before RO lock | **PASS** |
| Parent RO `FOR UPDATE` | `lockForReserveCommand` L115 | **PASS** |
| Post-lock RO re-fetch | Fresh RO after locks | **PASS** |
| Fresh `withReserved` | Reserve uses post-lock entity | **PASS** |
| Predicated `updateReserve` claim | `prisma-rental-order.repository.ts` L312–341 | **PASS** |

**Verdict:** Phase 32 **HONORED**. F-32-01 **CLOSED**.

---

## 8. Phase 33 Verification

**Decision lock:** `docs/decisions/MAINTENANCE_REPAIR_CLAIM_BEFORE_SIDE_EFFECTS_33.md`

| Workflow | Claim before stock | Evidence | Verdict |
| --- | --- | --- | --- |
| Start maintenance | **YES** | `start-maintenance.service.ts` L93–111 | **PASS** |
| Complete maintenance | **YES** | `complete-maintenance.service.ts` L85–103 | **PASS** |
| Cancel maintenance | **PARTIAL** | Claim L77–92 before IN L104 — **ordering PASS**; side-effect guard uses **stale pre-claim read** L74 → **F-36-01** | **REGRESSION GAP** |
| Start / complete / cancel repair | **YES** | Repair services — claim before stock (complete only) | **PASS** |

**Verdict:** Phase 33 **MOSTLY HONORED** with one material gap: cancel-maintenance stock reversal guard violates the spirit of claim-before-side-effects correctness when start∥cancel interleaves.

---

## 9. Phase 35 Verification

**Decision lock:** `docs/decisions/PAYMENT_INVOICE_SETTLEMENT_CONCURRENCY_35.md`

| Requirement | Evidence @ `bd8b220` | Verdict |
| --- | --- | --- |
| Payment status claim before settlement | `post-payment.service.ts` — `claimStatusTransition(PENDING→POSTED)` then `applyPaymentToInvoice` | **PASS** |
| Atomic invoice payment delta | `prisma-rental-invoice.repository.ts` L291–349 — predicated SQL `paidAmount += delta` | **PASS** |
| Overpayment protection in SQL | `paidAmount + delta <= grandTotal` predicate L312 | **PASS** |
| Reversal protection in SQL | `paidAmount + delta >= 0` on void path L331 | **PASS** |
| Fresh invoice reload after delta | `findUnique` after UPDATE L341–346 | **PASS** |
| Concurrent loser → 409 | `ConcurrentUpdateError` on null claim/delta | **PASS** |
| Transaction rollback preserved | `runWithRepositoryUnitOfWork` / payment transaction runner | **PASS** |
| Genuine concurrency tests | `payment-invoice-settlement-concurrency.35.application.test.ts` T35.1–T35.6 | **PASS** |
| Void: reverse before claim (by design) | `void-payment.service.ts` — atomic delta then claim | **PASS** |

**Verdict:** Phase 35 **HONORED**. F-35-01 **CLOSED**.

---

## 10. Closed Findings

| ID | Title | Closed by | Evidence |
| --- | --- | --- | --- |
| **F-35-01** | Payment invoice settlement concurrency | Phase 35 @ `bd8b220` | `applyPaymentDelta` + payment claim; T35.1–T35.6 |
| **F-31-03** | Invoice dispatch rollup capped at pageSize 100 | Phase 34 @ `6fc20be` | `load-rental-order-returns.ts` — unbounded completed dispatch fetch |
| **F-30-07 / F-31-02** | Maintenance/repair claim-before-side-effects | Phase 33 @ `8425661` | Six workflow services use `claimStatusTransition` (cancel gap: F-36-01) |
| **F-32-01** | Same-order partial reserve concurrency | Phase 32 | RO lock + fresh re-fetch |
| **F-35-09** | Payment side-effect ordering (post path) | Phase 35 | Claim-before-settle on post; void by design |

---

## 11. Deferred Findings

| ID | Title | Severity | Status @ `bd8b220` | Notes |
| --- | --- | --- | --- | --- |
| **F-33-01** | Invoice number sequence capped at pageSize 500 | P2 | **OPEN (deferred)** | `generate-invoice-number.ts` L10–12 |
| **F-33-02** | Active invoice guard capped at pageSize 10 | P2 | **OPEN (deferred)** | `generate-rental-invoice-from-order.service.ts` L74–76 |
| **F-33-03** | Direct POST stock-movements RESERVE/RELEASE bypass | P2 | **OPEN (deferred)** | `create-stock-movement.service.ts` + API route |
| **F-35-05** | Create invoice bypasses active-invoice guard | P2 | **OPEN (deferred)** | `create-rental-invoice.service.ts` — no per-order guard |
| **F-35-06** | Issue/void invoice unconditional status update | P2 | **OPEN (deferred)** | `issue-rental-invoice.service.ts` L78; `void-rental-invoice.service.ts` |
| **F-35-08** | Pay expense journal before status persist | P2 | **OPEN (deferred)** | `pay-expense.service.ts` L70–77 |
| **F-31-08** | Inventory PATCH absolute counter bypass | P2 | **OPEN (deferred)** | `update-inventory.service.ts` L34–44 |
| **F-31-05** | Return receive/inspect TOCTOU | P2 | **OPEN (deferred)** | No stock side effects; status-only |
| **F-31-10** | Cancel dispatch TOCTOU | P3 | **OPEN (deferred)** | No stock side effects |
| **F-11** | Authorization granularity | P3 | **OPEN (deferred)** | WORKER has stock create + inventory update |
| **F-09** | Repair.returnInspectionItemId missing FK | P3 | **OPEN (deferred)** | `schema.prisma` L853 — index only, no `@relation` |
| **F-07** | RentalOrder.DISPATCHED ghost enum | P3 | **OPEN (deferred)** | Enum present; not lasting commitment status |

---

## 12. New Findings

### F-36-01 — Cancel maintenance skips IN reversal on start∥cancel race

| Field | Detail |
| --- | --- |
| **ID** | F-36-01 |
| **Severity** | **P1** |
| **Status** | **NEW / OPEN** |
| **Affected code** | `src/modules/maintenance/application/services/cancel-maintenance.service.ts` |
| **Lines** | L47 (read), L74 (`wasInProgress`), L77–92 (claim), L94–119 (conditional IN) |
| **Root cause** | Stock reversal predicate uses **pre-claim** `existing.status` instead of **post-claim authoritative state** (e.g. `claimed.startedAt !== null` or existence of OUT movement). |
| **Realistic failure scenario** | See §13 interleaving T1/T2. |
| **Business impact** | `quantityOnHand` permanently reduced; maintenance CANCELLED but OUT unreversed; warehouse counts wrong; downstream reserve/dispatch capacity skewed. |
| **Recommended direction** | Derive reversal need from **claimed entity** (`claimed.startedAt !== null`) or reference-linked OUT movement count; add T36.1 start∥cancel concurrency test. |
| **Schema change** | **No** |

### F-36-02 — Generate-from-order split-transaction active-invoice TOCTOU

| Field | Detail |
| --- | --- |
| **ID** | F-36-02 |
| **Severity** | **P2** |
| **Status** | **NEW / OPEN** |
| **Affected code** | `generate-rental-invoice-from-order.service.ts` L41–171 (UoW guard) → L173 (separate `createRentalInvoiceService.execute`) |
| **Root cause** | Active-invoice guard runs in transaction A; invoice creation runs in transaction B — no serializable single-command boundary. |
| **Failure scenario** | Two concurrent generate requests both pass guard in separate TXs → duplicate active invoices. |
| **Recommended direction** | Fuse guard + create in one UoW or add DB unique partial index on active invoice per order. |

### F-36-03 — Pending payment over-commitment at create (baseline)

| Field | Detail |
| --- | --- |
| **ID** | F-36-03 |
| **Severity** | **P2** |
| **Status** | **NEW / OPEN** @ `bd8b220` |
| **Affected code** | `create-payment.service.ts` L74–85 — single `findById` + `validateInvoiceForPayment` without pending aggregate |
| **Root cause** | No `sumPendingAmountByRentalInvoiceId` at committed baseline (WIP adds this post-baseline). |
| **Failure scenario** | Multiple PENDING payments created whose sum exceeds balance; post fails at SQL predicate but operators see misleading pending totals. |
| **Note** | Working-tree WIP may partially address; **not closed at `bd8b220`**. |

---

## 13. Concurrency Findings

### F-36-01 — Demonstrated interleaving (PostgreSQL READ COMMITTED)

**Competing commands:** `StartMaintenanceService.execute` vs `CancelMaintenanceService.execute` on same maintenance id.

| Time | Cancel (T1) | Start (T2) |
| --- | --- | --- |
| t0 | `findById` → status **SCHEDULED** | |
| t1 | | `findById` → SCHEDULED; validate inventory |
| t2 | | `claimStatusTransition(SCHEDULED→IN_PROGRESS)` ✓ |
| t3 | | `executeCreateStockMovementInScope(OUT, qty)` ✓ |
| t4 | `wasInProgress = false` (**stale**) | |
| t5 | `claimStatusTransition([SCHEDULED\|IN_PROGRESS]→CANCELLED)` ✓ | |
| t6 | **Skip IN reversal** — `if (wasInProgress)` false | |

**Corruption:** Record `CANCELLED`; one OUT movement applied; no compensating IN → net inventory loss of `quantity`.

**Why claim does not prevent this:** Cancel claim accepts `IN_PROGRESS` in expected set; the bug is the **side-effect gate**, not the claim predicate.

### Other concurrency notes @ `bd8b220`

| Finding | Concurrency relevance | Severity |
| --- | --- | --- |
| F-35-06 issue/void invoice | Concurrent issue/void → last writer wins on status | P2 |
| F-31-05 receive/inspect return | Duplicate status transition possible | P2 (no stock) |
| F-33-03 stock API bypass | Bypasses RO/dispatch workflow locks | P2 (policy) |
| F-31-08 inventory PATCH | Lost update vs workflow atomic SQL | P2 |
| Phase 35 payment post | **Closed** — atomic delta + claim | — |
| Phase 32 reserve | **Closed** — locks + predicated claim | — |

---

## 14. Inventory Integrity

| Path | Lock / claim | Mutation style | Verdict |
| --- | --- | --- | --- |
| Reserve RO | `FOR UPDATE` inventory + RO | Atomic RESERVE SQL | **CLOSED** |
| Cancel RO release | `FOR UPDATE` + RELEASE SQL | Atomic delta | **CLOSED** |
| Complete dispatch/return | Status claim + atomic SQL | Delta | **CLOSED** |
| Maintenance start/complete | Claim + atomic OUT/IN | Delta | **CLOSED** |
| Maintenance cancel | Claim OK; reversal gate **stale** | **F-36-01 OPEN** | **P1 GAP** |
| Direct stock-movement API | None (workflow bypass) | Atomic SQL only | **F-33-03 OPEN P2** |
| Inventory PATCH | None | Absolute read→write | **F-31-08 OPEN P2** |

---

## 15. Rental Order Integrity

| Command | Claim / lock | Fresh re-read | Verdict |
| --- | --- | --- | --- |
| Reserve | `lockForAvailabilityCommit` → `lockForReserveCommand` → `updateReserve` | Post-lock F-02 + RO | **CLOSED** |
| Confirm | `claimStatusTransition` | N/A | **CLOSED** |
| Cancel | `cancelIfCancellable` before RELEASE | Uses `claimed.items` for release lines | **CLOSED** |
| Sync from returns | `claimStatusTransition` | Fresh dispatch/return reads | **CLOSED** |

No new RO integrity findings beyond deferred authorization/bypass paths.

---

## 16. Dispatch Integrity

| Command | Mechanism | Verdict |
| --- | --- | --- |
| Create | SQL `sumClaimedSourceQuantities` + parent lock + capacity 422 | **CLOSED** |
| Complete | `claimStatusTransition(READY→DISPATCHED)` before RELEASE/OUT | **CLOSED** |
| Cancel | Unconditional `updateStatus` | **F-31-10 deferred P3** |
| Claimed quantity aggregate | SQL SUM — no pagination | **CLOSED** |

---

## 17. Return Integrity

| Command | Mechanism | Verdict |
| --- | --- | --- |
| Complete | Claim before RELEASE/IN; Phase 28 attribution | **CLOSED** |
| Receive / inspect | Unconditional `updateStatus` | **F-31-05 deferred P2** |
| Mixed source×condition | Domain rules + tests | **CLOSED (Phase 28)** |

---

## 18. External Rental Integrity

| Workflow | Primitive | Verdict |
| --- | --- | --- |
| Confirm / receive / allocate | `applyWorkflowDelta` + predicated item SQL | **CLOSED** |
| Supplier return / write-off | Predicated capacity SQL | **CLOSED** |
| Cancel | `claimStatusTransition` | **CLOSED** |
| Settlement | `applySettlement` predicated money SQL | **CLOSED** |

No owned-stock mutations; concurrency tests T29.3/T29.4 present. No new P1 findings.

---

## 19. Maintenance / Repair Integrity

| Workflow | Claim ordering | Stock integrity | Verdict |
| --- | --- | --- | --- |
| Start maintenance | Claim before OUT | Atomic decrement | **CLOSED** |
| Complete maintenance | Claim before IN | Atomic increment | **CLOSED** |
| **Cancel maintenance** | Claim before IN (if gated) | **Reversal gate stale → F-36-01** | **P1 OPEN** |
| Repair (all) | Claim before side effects | Complete only emits IN | **CLOSED** |

**Test gap:** No T36.1 concurrent start+cancel test (Phase 33 doc referenced T33.1b — not implemented).

---

## 20. Payment / Invoice Integrity

### Payment @ `bd8b220` — CLOSED for settlement

| Command | Mechanism | Verdict |
| --- | --- | --- |
| Post | Claim → `applyPaymentDelta` → status derive | **CLOSED (F-35-01)** |
| Void | Reverse delta → claim | **CLOSED (by design)** |
| Create | Stale balance check only | **F-36-03 OPEN P2** |

### Invoice — deferred cluster

| Issue | Location | Severity |
| --- | --- | --- |
| F-33-01 number sequence cap 500 | `generate-invoice-number.ts` L12 | P2 |
| F-33-02 active guard cap 10 | `generate-rental-invoice-from-order.service.ts` L76 | P2 |
| F-35-05 direct create bypass | `create-rental-invoice.service.ts` | P2 |
| F-35-06 issue/void TOCTOU | `issue-rental-invoice.service.ts` L78 | P2 |
| F-36-02 split TX generate | `generate-rental-invoice-from-order.service.ts` L41 vs L173 | P2 |

Dispatch rollup for invoice generation: **CLOSED** (Phase 34 unbounded load).

---

## 21. Authorization / API Bypass Review

| Endpoint / permission | Risk | Finding |
| --- | --- | --- |
| `POST /api/stock-movements` + `stockMovements.create` on WORKER | RESERVE/RELEASE/OUT/IN without workflow reference | **F-33-03 P2** |
| `PATCH /api/inventory/[id]` + `inventory.update` on WORKER | Absolute counter mutation | **F-31-08 P2** |
| Workflow commands | Permission-gated per module | Acceptable for current phase scope |
| Tenant boundaries | Repository queries scoped by existing patterns | **F-11 P3** — coarse roles, not row-level |

No new authorization P1; bypass paths remain P2 policy gaps.

---

## 22. Pagination / Aggregate Integrity Review

| Location | pageSize | Purpose | Authoritative? | Verdict |
| --- | --- | --- | --- | --- |
| `generate-invoice-number.ts` L12 | **500** | Global max invoice sequence | **Yes — unsafe** | **F-33-01 P2** |
| `generate-rental-invoice-from-order.service.ts` L76 | **10** | Active invoice existence | **Yes — unsafe** | **F-33-02 P2** |
| `load-rental-order-returns.ts` | unbounded | Invoice dispatch rollup | Safe | **CLOSED** |
| `sumClaimedSourceQuantitiesByRentalOrderId` | SQL SUM | Dispatch capacity | Safe | **CLOSED** |
| `findAvailabilityCommitmentLines` | unbounded | F-02 commitment | Safe | **CLOSED** |
| List/report APIs | user param | UI pagination | Safe | N/A |
| Reporting maintenance/repair aggregates | full load then page lines | KPI counts on full set | Safe at current scale | P3 scalability only |

---

## 23. Transaction / Rollback Review

| Command | TX boundary | Rollback on failure | Verdict |
| --- | --- | --- | --- |
| Payment post/void | Single payment UoW | Claim + delta + audit atomic | **CLOSED** |
| Reserve RO | Single RO UoW | Locks + movements rollback together | **CLOSED** |
| Generate invoice from order | **Split** — guard TX then create TX | Partial commit possible | **F-36-02 P2** |
| Pay expense | Single expense UoW | Journal before status — orphan journal risk on status fail | **F-35-08 P2** |
| Cancel maintenance | Single maintenance UoW | Claim commits even if IN skipped (logic bug, not rollback fail) | **F-36-01 P1** |

T35.5 validates payment audit failure rolls back claim + invoice delta.

---

## 24. Regression Review

| Prior phase invariant | @ `bd8b220` | Result |
| --- | --- | --- |
| Phase 29 claim-before-side-effects | Payment + workflows | **PASS** (cancel-maintenance guard exception: F-36-01) |
| Phase 30 SQL dispatch aggregate | Unchanged | **PASS** |
| Phase 31 inventory locks + F-02 | Unchanged | **PASS** |
| Phase 32 RO reserve lock order | Unchanged | **PASS** |
| Phase 33 maintenance/repair claims | Present on 6 workflows | **PARTIAL** — F-36-01 |
| Phase 35 payment settlement | Atomic delta + claim | **PASS** |
| Phase 34 invoice dispatch rollup | Unbounded load | **PASS** |

**No regressions in payment, dispatch, reserve, or external rental paths.** One Phase 33 residual gap elevated to P1.

---

## 25. Priority Ranking

| Rank | ID | Severity | Summary |
| --- | --- | --- | --- |
| **1** | **F-36-01** | **P1** | Cancel maintenance stale reversal guard → inventory leak |
| 2 | F-33-02 / F-36-02 / F-35-05 | P2 | Active invoice duplicate cluster |
| 3 | F-33-01 | P2 | Invoice number sequence cap |
| 4 | F-33-03 | P2 | Stock movement API bypass |
| 5 | F-31-08 | P2 | Inventory PATCH bypass |
| 6 | F-35-06 | P2 | Invoice issue/void TOCTOU |
| 7 | F-35-08 | P2 | Expense pay journal ordering |
| 8 | F-36-03 | P2 | Pending payment over-commitment at create |
| 9 | F-31-05 | P2 | Return receive/inspect TOCTOU |
| 10 | F-31-10 / F-11 / F-09 / F-07 | P3 | Cleanup / schema / auth polish |

**P0:** None.

---

## 26. Recommended Next Phase

### Phase 36 — Cancel Maintenance Stock Reversal Integrity

**Primary finding:** **F-36-01**

| # | Requirement |
| --- | --- |
| 1 | **Highest-priority finding** | F-36-01 — cancel-maintenance IN reversal skipped on start∥cancel |
| 2 | **Why it outranks others** | Workflow-path (not bypass) inventory corruption under realistic concurrent ops; permanent `quantityOnHand` loss; Phase 33 claimed closure but left stale pre-claim guard |
| 3 | **Affected commands** | `CancelMaintenanceService`; indirectly `StartMaintenanceService` |
| 4 | **Root cause** | `wasInProgress` derived from pre-claim `existing.status` L74 |
| 5 | **Failure scenario** | §13 interleaving — OUT applied, cancel succeeds, IN skipped |
| 6 | **Current behavior** | Cancel always succeeds when status ∈ {SCHEDULED, IN_PROGRESS}; IN reversal only if canceler's **initial read** was IN_PROGRESS |
| 7 | **Desired invariant** | If maintenance had started (OUT emitted), cancel **must** emit compensating IN exactly once |
| 8 | **Recommended remediation** | Replace `wasInProgress` with post-claim signal: `claimed.startedAt !== null` (start sets `startedAt` at claim L98); alternatively detect OUT movement by reference. Add T36.1 concurrent start+cancel test. |
| 9 | **Schema change required?** | **No** |
| 10 | **Reusable primitives** | Phase 29 `claimStatusTransition` (already used); Phase 33 stock in-scope executor; no new concurrency primitive needed |
| 11 | **Acceptance tests** | T36.1: concurrent start+cancel → exactly one OUT + one IN, net zero qty delta, status CANCELLED; T36.2: cancel SCHEDULED (no start) → no movements; regression T33.1–T33.7 |
| 12 | **Defer explicitly** | F-33-01/02/03, F-35-05/06/08, F-31-08, F-36-02/03, F-31-05/10, F-11/09/07 |

---

## 27. Deferred Scope

The following remain valid but **must not** block Phase 36:

- **Invoice integrity family** (F-33-01, F-33-02, F-35-05, F-35-06, F-36-02) — natural **Phase 37** candidate after maintenance fix
- **API bypass family** (F-33-03, F-31-08) — policy hardening; requires product decision on WORKER permissions
- **Expense journal ordering** (F-35-08) — accounting consistency, lower blast radius than inventory leak
- **Pending payment create validation** (F-36-03) — may overlap with existing WIP; reconcile at implementation time
- **P3 cleanup** (F-07, F-09, F-11, F-31-10)

---

## 28. Architecture Safety

| Constraint | Status |
| --- | --- |
| No Prisma replacement | **PASS** |
| No PostgreSQL replacement | **PASS** |
| No Better Auth replacement | **PASS** |
| UoW / transaction runners preserved | **PASS** |
| Repository pattern preserved | **PASS** |
| Phase 29 concurrency primitives reused | **PASS** — recommended Phase 36 is additive guard fix |
| No version column / idempotency table | **PASS** |
| Minimal additive hardening | **PASS** — Phase 36 is ~5–15 LOC + tests |

**Do not redesign architecture.** Phase 36 fix belongs entirely in cancel-maintenance service (+ test file).

---

## 29. Git Safety

| Requirement | Result |
| --- | --- |
| Baseline `bd8b220` used for behavior | **PASS** |
| WIP preserved — no reset/stash/clean | **PASS** |
| No production/test/schema/migration edits | **PASS** |
| No existing decision lock modified | **PASS** |
| No existing audit report modified | **PASS** |
| Only new file: this document | **PASS** |
| No stage / commit / push | **PASS** |
| HEAD unchanged after audit | **PASS** — `bd8b220` |

---

## 30. Final Verdict

**AUDIT COMPLETE — STOP. NO IMPLEMENTATION, COMMIT, OR PUSH PERFORMED.**

Phases 28–35 core invariants **hold at `bd8b220`** with one material exception: **F-36-01** breaks the maintenance cancel stock-reversal guarantee under start∥cancel concurrency despite Phase 33 claim ordering being structurally present.

**Recommended next phase:** **Phase 36 — Cancel Maintenance Stock Reversal Integrity (F-36-01)**

Proceed to **Phase 36 decision lock** before any implementation.
