# Post-Phase-36 Enterprise Gap Audit

**Audit date:** 2026-08-27  
**Auditor scope:** Post-Phase-36 enterprise correctness — Phase 36 closure verification, Phase 28–35 regression, finding reconciliation, new gap search  
**Audit type:** Read-only — no production code, schema, test, commit, or push changes  
**Committed HEAD:** `bd8b2201edff441c0022114e379ba19852a645e3` — `feat(payment): harden invoice settlement concurrency`  
**Phase 36 state:** Implemented in **uncommitted WIP** (not yet on HEAD)  
**Prior artifacts:** Phase 28–36 decision locks, audits, Phase 36 implementation report

---

## 1. Executive Verdict

**AUDIT COMPLETE — GO TO PHASE 37 DECISION LOCK**

**Phase 36 (F-36-01) is CORRECT in working-tree code** and matches `docs/decisions/CANCEL_MAINTENANCE_REVERSAL_INTEGRITY_36.md`. The stale `wasInProgress` guard is removed; reversal uses `claimed.startedAt !== null` with `claimed` entity fields. T36.1–T36.7 exist; full suite reported **3074/3074 PASS** at Phase 36 validation (7 new tests).

**No P0 or P1 open findings** remain after Phase 36 WIP.

The **highest-priority remaining gap** is the **deferred rental-invoice integrity cluster (P2)**, led by **F-36-02** (split-transaction active-invoice TOCTOU on generate-from-order) and **F-33-02 / F-35-05** (capped/missing active-invoice guards). These are the natural **Phase 37** scope.

**Phase 28–35 invariants hold** at committed HEAD (`bd8b220`) with Phase 36 maintenance cancel fix additive in WIP only.

**Working-tree note:** ~147 tracked/untracked WIP files. Payment `sumPendingAmountByRentalInvoiceId` on create/post paths exists in WIP but **not** at committed `bd8b220` — F-36-03 remains open on committed baseline.

---

## 2. Audit Scope

### In scope

- Phase 36 implementation vs decision lock
- Phase 36 concurrency test adequacy
- Phase 28–35 regression (code + test trace)
- Full finding reconciliation matrix
- New enterprise gap search (concurrency, pagination, bypasses, money, inventory)
- Next-phase recommendation

### Out of scope

- Implementation of Phase 37
- Decision lock creation
- Commit / push
- Unrelated UI WIP fixes
- Schema/migration changes

---

## 3. Baseline

| Attribute | Value |
| --- | --- |
| Branch | `main` |
| **Committed HEAD** | `bd8b2201edff441c0022114e379ba19852a645e3` |
| Ahead of `origin/main` | **2** (Phase 34 + Phase 35) |
| Working tree files (approx.) | **~147** modified/untracked |
| Staged files | **None** observed for Phase 36 |
| **Phase 36 WIP (uncommitted)** | |
| Modified | `src/modules/maintenance/application/services/cancel-maintenance.service.ts` |
| New | `maintenance.cancel-reversal-integrity.36.application.test.ts` |
| New docs | `docs/decisions/CANCEL_MAINTENANCE_REVERSAL_INTEGRITY_36.md`, `docs/audits/PHASE_36_IMPLEMENTATION_REPORT.md` |
| Unrelated WIP | UI (customer billing, product, accounting), seeds, routes, payment journal WIP, etc. |
| Production code modified by **this audit** | **None** (this document only) |

**Recent commits (relevant):**

| Commit | Phase |
| --- | --- |
| `bd8b220` | Phase 35 — payment settlement concurrency |
| `6fc20be` | Phase 34 — invoice dispatch rollup |
| Phase 36 | **Not committed** |

---

## 4. Phase 36 Verification

**Decision lock:** `docs/decisions/CANCEL_MAINTENANCE_REVERSAL_INTEGRITY_36.md`

| # | Locked requirement | Working-tree evidence | Verdict |
| --- | --- | --- | --- |
| 1 | Remove stale `wasInProgress = existing.status === "IN_PROGRESS"` | Absent in WIP; present at `bd8b220` (`git show bd8b220:cancel-maintenance.service.ts`) | **PASS** |
| 2 | `shouldReverseStock = claimed.startedAt !== null` | `cancel-maintenance.service.ts` L93 | **PASS** |
| 3 | Reversal uses `claimed.quantity`, `claimed.inventoryId`, `claimed.id` | L96–118 | **PASS** |
| 4 | `claimStatusTransition` unchanged / authoritative | L76–91; repository untouched | **PASS** |
| 5 | Expected statuses `["SCHEDULED","IN_PROGRESS"]` → `CANCELLED` | L78 | **PASS** |
| 6 | Start: claim + `startedAt` before OUT | `start-maintenance.service.ts` L93–126 (unchanged) | **PASS** |
| 7 | Cancel: validate → claim → derive → IN → audit | L59–131 | **PASS** |
| 8 | Rollback on IN failure | T36.6 + `createRollbackTransactionRunner` | **PASS** |
| 9 | Cancel SCHEDULED: no IN | T36.2; `startedAt null` on claim | **PASS** |
| 10 | Start wins: OUT + IN, net zero | T36.5 | **PASS** |
| 11 | Duplicate cancel: one 409, ≤ one IN | T36.7 `Promise.allSettled` | **PASS** |
| 12 | Start after CANCELLED: domain 422 | T36.4 `UnprocessableError` | **PASS** |
| 13 | No schema change | Prisma unchanged | **PASS** |
| 14 | No API change | Routes unchanged | **PASS** |

**Phase 36 verdict:** **CORRECT — READY TO COMMIT** (pending pre-commit review). **Not yet on HEAD.**

### Concurrency test adequacy

| Test | Parallelism | Adequacy |
| --- | --- | --- |
| T36.1 | `Promise.allSettled` + `GatedMaintenanceRepository` hook simulating Start completing before Cancel claim while Cancel holds stale SCHEDULED read | **Adequate** — proves F-36-01 interleaving; hook is test harness, not production |
| T36.2–T36.3 | Sequential | **Adequate** for regression paths |
| T36.4–T36.5 | Sequential ordering | **Adequate** for cancel-wins / start-wins (T36.4 title says 409 but correctly expects 422 — domain validation before claim on `CANCELLED`) |
| T36.6 | Sequential rollback | **Adequate** |
| T36.7 | `Promise.allSettled` duplicate cancel | **Adequate** |

**Gap:** No unpooled PostgreSQL integration test for Start∥Cancel; in-memory + gate is acceptable per project test conventions (Phase 33/35 pattern).

---

## 5. Phase 28 Verification

**Decision lock:** `MIXED_RETURN_SOURCE_CONDITION_ATTRIBUTION_28.md`

| Requirement | Evidence @ `bd8b220` + WIP | Verdict |
| --- | --- | --- |
| Source × condition attribution on complete | `complete-return.service.ts` — release/restock routing | **PASS** |
| Tests | `return.source-condition.28.application.test.ts` | **PASS** |
| Phase 29 claim before complete side effects | `claimStatusTransition(INSPECTED→COMPLETED)` before stock | **PASS** |

**No Phase 36 regression.**

---

## 6. Phase 29 Verification

**Decision lock:** `CONCURRENT_SAFE_COMMAND_IDEMPOTENCY_29.md`

| Pattern | Evidence | Verdict |
| --- | --- | --- |
| `claimStatusTransition` before side effects | Return, dispatch, RO confirm, ERA, maintenance/repair, payment post | **PASS** |
| HTTP 409 / `ConcurrentUpdateError` | Workflow services | **PASS** |
| Atomic inventory SQL | `prisma-inventory.repository.ts` | **PASS** |
| Maintenance cancel reversal gate | Fixed Phase 36 WIP — claim ordering was already Phase 33 | **PASS** |

**No regression.**

---

## 7. Phase 30 Verification

**Decision lock:** `DISPATCH_CLAIMED_QUANTITY_INTEGRITY_30.md`

| Requirement | Evidence | Verdict |
| --- | --- | --- |
| SQL `sumClaimedSourceQuantitiesByRentalOrderId` | `prisma-dispatch.repository.ts` L167–220 | **PASS** |
| EXISTS non-cancelled guard | L223–240 | **PASS** |
| Unbounded COMPLETED dispatch fetch | `findCompletedDispatchesByRentalOrderId` | **PASS** |
| Tests | `dispatch.concurrency.29.application.test.ts` | **PASS** |

**No regression.**

---

## 8. Phase 31 Verification

**Decision lock:** `DATE_AWARE_AVAILABILITY_SERIALIZATION_31.md`

| Requirement | Evidence | Verdict |
| --- | --- | --- |
| `lockForAvailabilityCommit` FOR UPDATE | `prisma-inventory.repository.ts` | **PASS** |
| Ascending inventory lock order | `reserve-rental-order.service.ts`, `cancel-rental-order.service.ts` | **PASS** |
| Post-lock F-02 re-read | Reserve path | **PASS** |
| CONFIRMED excluded from F-02 | `rental-order.availability.rules.ts` | **PASS** |
| Tests | `rental-order.availability-serialization.31.application.test.ts` | **PASS** |

**No regression.**

---

## 9. Phase 32 Verification

**Decision lock:** `RENTAL_ORDER_RESERVE_COMMAND_INTEGRITY_32.md`

| Requirement | Evidence | Verdict |
| --- | --- | --- |
| Inventory lock → RO lock | `reserve-rental-order.service.ts` | **PASS** |
| Post-lock RO re-fetch + `updateReserve` | `prisma-rental-order.repository.ts` | **PASS** |
| Tests | `rental-order.reserve-command-integrity.32.application.test.ts` | **PASS** |

**No regression.**

---

## 10. Phase 33 Verification

**Decision lock:** `MAINTENANCE_REPAIR_CLAIM_BEFORE_SIDE_EFFECTS_33.md`

| Workflow | Claim before stock | Verdict |
| --- | --- | --- |
| Start / complete / cancel maintenance | Yes | **PASS** (cancel reversal guard completed Phase 36) |
| Repair workflows (6) | Yes | **PASS** |
| Tests | `maintenance.concurrency.33.application.test.ts`, `repair.concurrency.33.application.test.ts` | **PASS** |

**Phase 33 structurally honored; Phase 36 closes residual F-36-01 gap.**

---

## 11. Phase 34 Verification

**Decision lock:** `INVOICE_DISPATCH_ROLLUP_INTEGRITY_34.md`

| Requirement | Evidence | Verdict |
| --- | --- | --- |
| Unbounded dispatch rollup for invoice | `load-rental-order-returns.ts` | **PASS** |
| No `pageSize: 100` on invoice rollup paths | Grep — only list tests remain | **PASS** |
| Tests | `rental-invoice.dispatch-rollup.34.application.test.ts` | **PASS** |

**No regression.**

---

## 12. Phase 35 Verification

**Decision lock:** `PAYMENT_INVOICE_SETTLEMENT_CONCURRENCY_35.md`

| Requirement | Evidence @ `bd8b220` | Verdict |
| --- | --- | --- |
| Payment claim before settlement | `post-payment.service.ts` L113–129 | **PASS** |
| `applyPaymentDelta` atomic SQL | `prisma-rental-invoice.repository.ts` L291–349 | **PASS** |
| Tests T35.1–T35.6 | `payment-invoice-settlement-concurrency.35.application.test.ts` | **PASS** |

**WIP note:** `post-payment.service.ts` WIP adds `sumPendingAmountByRentalInvoiceId` at L103–107 — not at `bd8b220`; does not weaken Phase 35 settlement atomicity.

**No Phase 35 regression from Phase 36.**

---

## 13. Closed Findings

| ID | Title | Closed by | Evidence |
| --- | --- | --- | --- |
| **F-36-01** | Cancel maintenance stale reversal guard | Phase 36 WIP | `cancel-maintenance.service.ts` L93–118; T36.1–T36.7 |
| **F-35-01** | Payment invoice settlement concurrency | Phase 35 @ `bd8b220` | `applyPaymentDelta` + payment claim |
| **F-35-09** | Payment post side-effect ordering | Phase 35 | Claim before settle on post |
| **F-31-03** | Invoice dispatch rollup cap 100 | Phase 34 | Unbounded `loadReturnsForRentalOrder` |
| **F-30-07 / F-31-02** | Maintenance/repair claim-before-side-effects | Phase 33 | Six workflow services |
| **F-32-01** | Same-order partial reserve race | Phase 32 | RO lock + fresh re-fetch |
| **F-28-* ** | Mixed return source×condition | Phase 28 | Attribution tests |

---

## 14. Still-Open Findings

| ID | Sev | Summary | Evidence |
| --- | --- | --- | --- |
| **F-33-02** | P2 | Active invoice guard capped at `pageSize: 10` | `generate-rental-invoice-from-order.service.ts` L74–76 |
| **F-36-02** | P2 | Generate guard TX ≠ create TX | Same file L41–171 vs L173–181 |
| **F-35-05** | P2 | Direct create bypasses active guard | `create-rental-invoice.service.ts` — no per-order guard |
| **F-33-01** | P2 | Invoice number sequence cap 500 | `generate-invoice-number.ts` L10–12 |
| **F-33-03** | P2 | Direct POST stock-movements bypass | `src/app/api/stock-movements/route.ts` L14–16 |
| **F-31-08** | P2 | Inventory PATCH absolute counters | `update-inventory.service.ts` L34–44 |
| **F-35-06** | P2 | Issue/void invoice unconditional `updateStatus` | `issue-rental-invoice.service.ts` L78; `void-rental-invoice.service.ts` L64 |
| **F-35-08** | P2 | Pay expense journal before status | `pay-expense.service.ts` L70–77 |
| **F-36-03** | P2 | Pending over-commitment at create @ `bd8b220` | `create-payment.service.ts` — no pending aggregate at HEAD |
| **F-31-05** | P2 | Return receive/inspect TOCTOU | No stock side effects |
| **F-31-10** | P3 | Cancel dispatch TOCTOU | Status only |
| **F-11** | P3 | Authorization granularity | WORKER stock create + inventory update |
| **F-09 / F-31-07** | P3 | Repair `returnInspectionItemId` no FK | `schema.prisma` L853 index only |
| **F-07 / F-31-09** | P3 | `RentalOrder.DISPATCHED` ghost enum | Enum present; not F-02 commitment |

---

## 15. Deferred Findings

Same as §14 — intentionally deferred past Phase 36 per decision lock §26. None block Phase 36 commit.

---

## 16. New Findings

**No new P0/P1 findings** identified beyond reconciled open list.

### Observational (not elevated)

| Note | Severity | Detail |
| --- | --- | --- |
| T36.4 test title vs assertion | — | Title references 409; code correctly expects 422 for start on `CANCELLED` |
| F-36-03 partial WIP | P2 | WIP adds `sumPendingAmountByRentalInvoiceId` on post/create — **not committed**; reconcile at Phase 37+ if bundled with payment create hardening |

---

## 17. P0 Findings

**None.**

---

## 18. P1 Findings

**None** (F-36-01 closed in Phase 36 WIP).

---

## 19. P2 Findings

| ID | Workflow | Root cause | Impact |
| --- | --- | --- | --- |
| **F-36-02** | Generate invoice from order | Guard in UoW A; create in UoW B | Duplicate active invoices under concurrent generate |
| **F-33-02** | Generate invoice from order | `findPaged({ pageSize: 10 })` as existence guard | Miss active invoice when >10 per order |
| **F-35-05** | Direct create invoice | No active-invoice check | Second invoice via API |
| **F-33-01** | Invoice numbering | `pageSize: 500` max sequence scan | Number reuse when >500/year |
| **F-33-03** | Stock movement API | RESERVE/RELEASE without workflow coupling | Inventory/RO desync |
| **F-31-08** | Inventory PATCH | Absolute counter write | Silent desync vs movements |
| **F-35-06** | Issue/void invoice | Unconditional status update | Concurrent issue/void TOCTOU |
| **F-35-08** | Pay expense | Journal before status persist | Orphan journal risk |
| **F-36-03** | Create payment | Stale balance @ HEAD | Multiple pending exceed balance (post SQL still protects) |
| **F-31-05** | Return receive/inspect | Unconditional status | Status ordering only |

---

## 20. P3 Findings

| ID | Summary |
| --- | --- |
| F-31-10 | Cancel dispatch TOCTOU |
| F-11 | Coarse role permissions |
| F-09 / F-31-07 | Repair FK gap |
| F-07 / F-31-09 | DISPATCHED enum cleanup |

---

## 21. Finding Reconciliation Matrix

| ID | Status | Severity | Notes |
| --- | --- | --- | --- |
| F-01 – F-05 | **INVALIDATED / CLOSED** | — | Superseded by Phases 29–32 |
| F-06 / F-31-01 | **CLOSED** | — | Phase 31 F-02 serialization |
| F-07 / F-31-09 | **DEFERRED** | P3 | Enum cleanup |
| F-08 | **INVALIDATED** | — | Superseded |
| F-09 / F-31-07 | **DEFERRED** | P3 | Schema FK |
| F-11 / F-31-06 | **DEFERRED** | P3 | Auth granularity |
| F-30-05, F-30-06 | **CLOSED** | — | Phase 30 |
| F-30-07 / F-31-02 | **CLOSED** | — | Phase 33 |
| F-31-03 | **CLOSED** | — | Phase 34 |
| F-31-04 | **CLOSED** | — | Phase 31 |
| F-31-05 | **OPEN** | P2 | Deferred |
| F-31-08 | **OPEN** | P2 | Deferred |
| F-31-10 | **OPEN** | P3 | Deferred |
| F-31-11 | **CLOSED/DEFERRED** | — | No evidence of open cap at HEAD |
| F-32-01 | **CLOSED** | — | Phase 32 |
| F-33-01 | **OPEN** | P2 | Deferred |
| F-33-02 | **OPEN** | P2 | Deferred |
| F-33-03 | **OPEN** | P2 | Deferred |
| F-35-01 | **CLOSED** | — | Phase 35 @ `bd8b220` |
| F-35-05 | **OPEN** | P2 | Deferred |
| F-35-06 | **OPEN** | P2 | Deferred |
| F-35-08 | **OPEN** | P2 | Deferred |
| F-35-09 | **CLOSED** | — | Phase 35 |
| F-36-01 | **CLOSED** | — | Phase 36 WIP |
| F-36-02 | **OPEN** | P2 | Deferred |
| F-36-03 | **OPEN** | P2 | @ HEAD; partial WIP |

---

## 22. Concurrency Integrity Review

| Area | Mechanism | Status |
| --- | --- | --- |
| Payment settlement | Claim + `applyPaymentDelta` | **Closed Phase 35** |
| Maintenance cancel reversal | Post-claim `startedAt` | **Closed Phase 36 WIP** |
| Maintenance start/complete | Claim before OUT/IN | **Closed Phase 33** |
| RO reserve | Locks + predicated claim | **Closed Phase 32** |
| Dispatch claims | SQL aggregate | **Closed Phase 30** |
| Invoice generate | Split TX + capped guard | **Open F-36-02 / F-33-02** |
| Invoice issue/void | Unconditional update | **Open F-35-06 P2** |
| Stock API bypass | No workflow lock | **Open F-33-03 P2** |

**No remaining stale pre-claim stock reversal patterns** found (`grep wasInProgress` — zero in services).

---

## 23. Transaction / Atomicity Review

| Path | Boundary | Issue |
| --- | --- | --- |
| Cancel maintenance | Single `IMaintenanceTransactionRunner` | **Correct** (Phase 36) |
| Post payment | Single payment UoW | **Correct** (Phase 35) |
| Generate invoice from order | Guard/build UoW **≠** create UoW | **F-36-02** |
| Pay expense | Journal then status in one UoW but inverted order | **F-35-08** |
| Reserve RO | Single RO UoW with locks | **Correct** |

---

## 24. Pagination / Aggregate Review

| Location | Cap | Authoritative? | Verdict |
| --- | --- | --- | --- |
| `generate-invoice-number.ts` L12 | 500 | **Yes** — max sequence | **F-33-01 OPEN** |
| `generate-rental-invoice-from-order.service.ts` L76 | 10 | **Yes** — active guard | **F-33-02 OPEN** |
| `load-rental-order-returns.ts` | Unbounded | Yes — invoice rollup | **Closed Phase 34** |
| `sumClaimedSourceQuantitiesByRentalOrderId` | SQL SUM | Yes — dispatch | **Closed Phase 30** |
| List/report APIs | User param | No — UI only | **Safe** |

---

## 25. API Bypass Review

| Endpoint | Permission | Bypass | Severity |
| --- | --- | --- | --- |
| `POST /api/stock-movements` | `stockMovements.create` (WORKER) | RESERVE/RELEASE without RO workflow | **F-33-03 P2** |
| `PATCH /api/inventory/[id]` | `inventory.update` | Absolute counters | **F-31-08 P2** |
| `POST /api/rental-invoices` | Create permission | No active-invoice guard | **F-35-05 P2** |
| Workflow commands | Module permissions | Properly gated | **OK** |

---

## 26. Inventory Integrity Review

| Path | Lock / claim | Verdict |
| --- | --- | --- |
| RO reserve/cancel | FOR UPDATE + atomic SQL | **Closed** |
| Dispatch/return complete | Claim + atomic SQL | **Closed** |
| Maintenance start/complete/cancel | Claim + atomic SQL; cancel uses `claimed.startedAt` | **Closed Phase 36** |
| Direct stock API | Atomic SQL only, no workflow | **F-33-03 OPEN** |
| Inventory PATCH | Absolute write | **F-31-08 OPEN** |

---

## 27. Financial Integrity Review

| Path | Mechanism | Verdict |
| --- | --- | --- |
| Payment post/void | Claim + `applyPaymentDelta` | **Closed Phase 35** |
| ERA settlement | `applySettlement` | **Closed Phase 29** |
| Invoice issue/void | Unconditional status | **F-35-06 OPEN P2** |
| Invoice duplicate guard | Capped / split TX | **F-33-02 / F-36-02 / F-35-05 OPEN P2** |
| Create payment pending sum | Missing @ HEAD | **F-36-03 OPEN P2** |
| Pay expense | Journal before status | **F-35-08 OPEN P2** |

---

## 28. Recommended Next Phase

### Phase 37 — Rental Invoice Active-Guard & Generation Integrity

**Primary findings:** **F-36-02**, **F-33-02**, **F-35-05** (bundle); optionally **F-33-01** if scope allows.

**Why this phase next:**

1. **Highest remaining business integrity cluster** after P1 inventory fix
2. Occurs on **normal billing workflow** (generate/create invoice)
3. **Realistic concurrency** — split TX duplicate active invoices (F-36-02)
4. **Focused scope** — rental-invoice module + create/generate services; likely no schema change (unbounded query or EXISTS guard + single UoW)
5. Reuses Phase 29 claim/guard patterns where applicable

**Outranked rationale:** No P0/P1 remain. F-33-03/F-31-08 are policy bypasses (lower frequency). F-35-06/F-35-08 are P2 workflow TOCTOU/accounting ordering.

---

## 29. Decision-Lock Readiness

| Question | Answer |
| --- | --- |
| Decision lock required? | **Yes** — Phase 37 |
| Business decisions resolved? | **Mostly** — need lock on: single UoW vs DB partial unique index for one-active-invoice-per-order; whether to bundle F-33-01 numbering |
| Schema change required? | **Likely NO** — prefer unbounded `findActiveByRentalOrderId` or EXISTS + fused UoW (Phase 34/35 precedent) |
| Affected files (likely) | `generate-rental-invoice-from-order.service.ts`, `create-rental-invoice.service.ts`, possibly `prisma-rental-invoice.repository.ts` |
| Acceptance tests | T37.1 concurrent generate ×2; T37.2 >10 invoices guard; T37.3 direct create blocked; T37.4 regression Phase 34–35 |
| Genuine parallel tests | Required for concurrent generate ( `Promise.allSettled` ) |
| Regression scope | Phases 28–36 |
| Unresolved policy | Whether **partial unique index** `(rentalOrderId) WHERE status NOT IN ('VOID')` is acceptable vs query-only guard |

**Do NOT create decision lock in this task.**

---

## 30. Git Safety / Final Verdict

| Check | Result |
| --- | --- |
| HEAD unchanged | **PASS** — `bd8b220` |
| No commit | **PASS** |
| No push | **PASS** |
| No reset/checkout/stash/clean | **PASS** |
| Pre-existing WIP preserved | **PASS** |
| Only new file from this audit | `docs/audits/PHASE_37_ENTERPRISE_GAP_AUDIT.md` |
| Phase 36 WIP uncommitted | **As expected** |

### Final Verdict

**AUDIT COMPLETE — GO TO PHASE 37 DECISION LOCK**

- **Phase 36:** CORRECT in WIP; F-36-01 **CLOSED** pending commit
- **P0:** 0 | **P1:** 0 | **P2:** 10 | **P3:** 4
- **Next phase:** Phase 37 — Rental Invoice Active-Guard & Generation Integrity

---

**End of Post-Phase-36 Enterprise Gap Audit**
