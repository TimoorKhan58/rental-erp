# Post-Phase-55 Enterprise Gap Audit

**Audit date:** 2026-09-02  
**Scope:** Committed production baseline at `08742c6` — ~151 WIP entries excluded from audit target  
**Method:** Independent Phase 55 closure verification, P2002 contract audit, concurrency matrix, closed-finding regression review, decision-lock revalidation, fresh enterprise gap scan, targeted + full regression execution

---

## 1. Executive Verdict

**POST-PHASE-55 ENTERPRISE GAP AUDIT COMPLETE**

| Severity | Count |
|----------|------:|
| **P0** | **0** |
| **P1** | **0** |
| **P2** | **0** |
| **P3** | **5** |
| **DEFERRED** | **1** |
| **DOC** | **1** |

Phase 55 closed **N-51-01** per evidence at `08742c6`. No P0/P1/P2 launch blockers at committed HEAD. All Phases 35–55 hardening remains intact on committed code. Phase 55 introduced **no regressions** in targeted or full-suite execution.

**Recommended next step:** **Phase 57 — F-11** (authorization granularity — broad WORKER mutation permissions). **F-37-R2 is not the correct next target** — it is cosmetic sequence-gap behavior by design with no integrity defect.

**Launch blockers (P0/P1):** **None**

---

## 2. Baseline

| Item | Value |
|------|-------|
| **Branch** | `main` |
| **HEAD before audit** | `08742c669494d91912566c60febf741190628222` (`08742c6`) |
| **Phase 55** | `fix(rental-invoice): improve p2002 conflict retry message` |
| **Phase 53** | `7407ba3` |
| **Phase 52** | `1596a64` |
| **Decision locks** | `1aa422b` |
| **WIP entries** | **151** (`git status --short` count) |
| **Push** | NOT PUSHED |
| **Audit target** | `git show HEAD:` committed tree only |

**Recent history:**

```text
08742c6 fix(rental-invoice): improve p2002 conflict retry message
85e0cd2 docs(audit): complete post-phase-53 enterprise gap audit
7407ba3 feat(external-rental): enforce full F-02 parity on direct ERA creation
```

---

## 3. Repository / WIP Status

~151 unrelated modified/untracked files preserved. **No application code, schema, or migrations modified during this audit.** Only this report file created.

WIP includes feature-layer accounting/reporting enhancements, seed changes, and module test-runner gaps — all excluded from committed audit target. Uncommitted WIP may wire `ExpenseAccountingHook`; committed HEAD still uses `NoOpExpenseAccountingHook` (F-35-08 defer condition unchanged).

---

## 4. Documents Reviewed

| Document | Role |
|----------|------|
| `docs/audits/PHASE_51_DECISION_LOCKS.md` | DL-51-01/02/03 authoritative policy |
| `docs/audits/PHASE_52_IMPLEMENTATION_REPORT.md` | N-44-05 closure context |
| `docs/audits/POST_PHASE_52_ENTERPRISE_GAP_AUDIT.md` | Pre-Phase-53 queue |
| `docs/audits/PHASE_53_IMPLEMENTATION_REPORT.md` | N-48-01 closure |
| `docs/audits/POST_PHASE_53_ENTERPRISE_GAP_AUDIT.md` | Prior queue baseline |
| `docs/audits/PHASE_55_IMPLEMENTATION_REPORT.md` | Phase 55 claims (independently verified) |
| Prior phase reports (29–50) | Regression matrix reference |

---

## 5. Phase 55 Closure Verification — N-51-01 CLOSED

### Status: **CLOSED @ `08742c6`** — independently verified

| Check | Expected | Verified | Evidence |
|-------|----------|:--------:|----------|
| Shared conflict detector extracted | Yes | **Yes** | `is-invoice-number-conflict.ts` |
| Pre-check message recognized | Yes | **Yes** | T55.1 |
| P2002 mapped conflict on `invoiceNumber` recognized | Yes | **Yes** | T55.1, `error.cause` + `details.target` |
| Unrelated ConflictError not retried | Yes | **Yes** | T55.3 |
| Other-field P2002 not retried | Yes | **Yes** | T55.3 (`agreementNumber`) |
| Retry loop succeeds after one P2002 conflict | Yes | **Yes** | T55.4/T55.7 |
| Exhausted retries → UnprocessableError | Yes | **Yes** | T55.4 |
| Authorization unchanged | Yes | **Yes** | T55.5 |
| No raw Prisma leakage | Yes | **Yes** | T55.2 |
| Successful generate unchanged | Yes | **Yes** | Phase 50/37 tests in full suite |
| No schema change | Yes | **Yes** | Phase 55 commit stat |

**Gap closed:** Prisma P2002 on `invoiceNumber` is now retriable in the generate-from-order allocation loop, matching the pre-check conflict path.

---

## 6. N-51-01 Root Cause Verification

**Before Phase 55:** Inline `isInvoiceNumberConflict` matched only `ConflictError` with message `"Invoice number already exists"`.

**After Phase 55:** Shared helper `isInvoiceNumberConflict` matches:

1. Explicit pre-check message `"Invoice number already exists"`
2. `ConflictError.cause` = Prisma `P2002` with `meta.target` containing `invoiceNumber`
3. `ConflictError.details.target` containing `invoiceNumber` (from `mapPrismaError`)

**P2002 source:** `RentalInvoice.invoiceNumber @unique` (`prisma/schema.prisma` L975). TOCTOU between `findByInvoiceNumber` pre-check and `repository.create` under parallel generate-from-order.

**Propagation path:**

```text
GenerateRentalInvoiceFromOrderService.execute
  → runWithRepositoryUnitOfWork
  → generateNextInvoiceNumber (max+1)
  → createRentalInvoiceInWriteScope
  → rentalInvoiceRepository.create
  → Prisma P2002
  → mapPrismaError → ConflictError
  → isInvoiceNumberConflict → continue (retry) OR throw
```

---

## 7. P2002 Error Contract

| Field | Value |
|-------|-------|
| **Trigger** | Invoice number uniqueness violation during generate-from-order (pre-check or DB `@unique`) |
| **P2002 constraint** | `RentalInvoice.invoiceNumber` unique index |
| **Application error (transient)** | `ConflictError` — `"A record with the same unique value already exists"` with `details: { target: ["invoiceNumber"] }` |
| **Application error (exhausted retries)** | `UnprocessableError` — `"Unable to allocate a unique invoice number after multiple attempts"` |
| **HTTP status (exhausted)** | **422** (existing `UnprocessableError` mapping) |
| **Error type/code** | `ConflictError` (retried internally); terminal `UnprocessableError` |
| **Public message (exhausted)** | `Unable to allocate a unique invoice number after multiple attempts` |
| **Raw Prisma leakage** | **None** — message does not include `P2002`, `PrismaClientKnownRequestError`, or constraint names |

**Distinction preserved:** Only `ConflictError` instances matching invoice-number targets are retried. Unrelated `ConflictError` (e.g. active invoice per rental order), other-field P2002, and `InternalError` propagate unchanged (T55.3).

---

## 8. P2002 Concurrency Analysis

| Scenario | Exists in domain | Protection @ HEAD | Verdict |
|----------|:----------------:|-------------------|---------|
| Generate × generate (different ROs, same number race) | Yes | `@unique` + retry loop (Phase 55) | **PASS** |
| Generate × generate (same RO) | Yes | `lockForInvoiceCommand` + active-invoice check | **PASS** (Phase 37 T37.1) |
| Generate × payment | Indirect | Separate UoW; invoice must exist first | **PASS** |
| Generate × order cancel | Yes | RO status/eligibility guards pre-create | **PASS** |
| P2002 → partial invoice | N/A | Transaction rollback on failed create | **PASS** |
| P2002 → silent success | N/A | Conflict rethrown or retried; never swallowed as success | **PASS** |
| Duplicate invoice number | N/A | DB unique + application pre-check | **PASS** |

Uniqueness remains **database-authoritative**. Phase 55 broadens retry recognition only; it does not weaken locks or allow duplicate committed invoices.

---

## 9. Financial Integrity Regression

| Flow | Phase 52 policy | @ `08742c6` | Regression? |
|------|-----------------|:-----------:|:-----------:|
| Invoice create (direct) | N/A | Unchanged | No |
| Generate from order | N/A | Retry broadened only | No |
| Invoice issue/void concurrency | N/A | Unchanged | No |
| **Invoice void with POSTED payment** | **Rejected** | `assertInvoiceVoidWithoutPostedPayments` | **No** — T52.* pass |
| Payment create/post/void | N/A | Unchanged | No |
| Derived invoice status (F-37-R1) | Atomic | Unchanged | No — Phase 49 pass |
| Invoice totals / amountPaid | N/A | Unchanged | No |

Phase 55 does **not** alter settlement, POSTED payment behavior, or void guards.

---

## 10. Previous Finding Regression Matrix

| Finding | Status @ `08742c6` | Regression? | Evidence |
|---------|-------------------|:-----------:|----------|
| **N-51-01** | **CLOSED** (Phase 55) | N/A | T55.* + code review |
| **N-48-01** | **CLOSED** (Phase 53) | No | Phase 53 tests pass |
| **N-44-05** | **CLOSED** (Phase 52) | No | T52.* pass |
| **N-46-02** | **CLOSED** (Phase 48) | No | Full suite pass |
| **F-33-03** | **CLOSED** (Phase 51) | No | DL-51-01 policy + tests |
| **F-33-01** | **CLOSED** (Phase 50) | No | Number allocation tests |
| **F-37-R1** | **CLOSED** (Phase 49) | No | Derived status concurrency |
| **F-35-01 / F-35-06** | **CLOSED** | No | Phase 35/38 tests in suite |
| **F-36-03** | **CLOSED** | No | Phase 39 tests in suite |
| **F-31-03 / F-31-05** | **CLOSED** | No | |
| **N-40-01 / N-42-01** | **CLOSED** | No | |
| **Phase 43 PATCH ledger** | **CONFORMS** | No | |
| **Phase 45 return integrity** | **CONFORMS** | No | |
| **F-04 / F-05** | **CLOSED** | No | |
| **F-31-08** | **CONFORMS** | No | Metadata-only PATCH |

No bypass path reopened for any closed P0/P1/P2 finding.

---

## 11. Decision Lock Regression

| Lock | Policy | Status @ `08742c6` | Evidence |
|------|--------|:------------------:|----------|
| **DL-51-01** | Public POST stock movements: **ADJUSTMENT-only** + dual permission | **CONFORMS** | `public-stock-movement-create.policy.ts`; Phase 51 tests pass |
| **DL-51-02** | **POSTED payment → invoice VOID rejected** | **CONFORMS** | `assert-invoice-void-without-posted-payments.ts`; T52.* pass |
| **DL-51-03** | Direct ERA creation: **full F-02 parity** | **CONFORMS** | `assertExternalSourcingF02Gate` on both paths; Phase 53 tests pass |

Phase 55 did not touch decision-lock surfaces.

---

## 12. Fresh Enterprise Gap Scan

### Concurrency (committed HEAD)

- **Invoice number allocation:** max+1 pre-lock (F-37-R2 cosmetic gaps); `@unique` + retry (N-51-01 closed)
- **Payment settlement:** `lockForPaymentCommitment` + atomic derived status (F-37-R1 closed)
- **ERA creation:** sorted inventory lock → RO lock → F-02 gate (N-48-01 closed)
- **Return/dispatch capacity:** row locks (Phases 40/45)
- **No new read-then-write bypass** identified in payment, invoice, inventory, or ERA committed paths

### Financial integrity

- Invoice void blocked on POSTED payments (not `paidAmount == 0` alone)
- Payment over-commitment guards (Phase 39)
- No duplicate-payment or partial-settlement gap found at HEAD

### Inventory

- Atomic SQL in stock movement executor
- Public POST restricted to ADJUSTMENT (DL-51-01)
- PATCH cannot mutate quantities (Phase 43)

### API boundary

- No new direct-repository-from-route patterns in committed mutation paths
- Stock movement workflow bypass closed @ HEAD

### Authorization

- Route-level `assertPermission` present on mutation endpoints
- **F-11 remains:** WORKER holds broad mutate permissions including `payments.post`, `rentalInvoices.void`, dispatch/return workflows

**No new P0/P1/P2 findings** from fresh scan.

---

## 13. Known P3 Reassessment

| ID | Still open? | Severity | Business impact | Security | Concurrency | Recommended phase |
|----|:-----------:|----------|-----------------|----------|-------------|-------------------|
| **F-37-R2** | Yes | P3 | Cosmetic numbering gaps only | None | Gaps increase slightly with retry; by design | Optional — **not recommended next** |
| **F-11** | Yes (mitigated) | P3 | WORKER can mutate many workflows directly | **Moderate** — coarse role | Partial (DL-51-01 mitigates stock bypass) | **Phase 57 (recommended)** |
| **F-09** | Yes | P3 | Orphan repair rows possible (hygiene) | Low | None | v1.1+ optional |
| **F-07** | Yes | P3 | Developer/analytics enum confusion | None | None | v1.1+ optional |
| **N-39-UI-01** | Yes | P3 | Summary stats wrong when >100 invoices | None | None | Phase 58 candidate (UX) |

---

## 14. F-37-R2 Priority Review

| Question | Answer |
|----------|--------|
| Root cause | `generateNextInvoiceNumber` uses max+1 **before** `lockForInvoiceCommand`; retries and parallel allocation skip numbers |
| Affected workflow | Generate rental invoice from order only |
| Still present @ HEAD? | **Yes — by design** |
| Phase 55 impact | Retry broadening may increase gap frequency; **no corruption** |
| Can escalate beyond P3? | **No** — `@unique` prevents duplicates; gaps are cosmetic |
| Justified as next target? | **No** — acceptable v1.0; fixing gaps requires architectural change with no integrity benefit |
| More important P3? | **Yes — F-11** (authorization breadth) and **N-39-UI-01** (misleading operational stats) outrank cosmetic numbering |

**Verdict:** F-37-R2 remains OPEN but should **not** be the next implementation phase.

---

## 15. F-35-08 Reassessment

| Field | Value |
|-------|-------|
| Status | **DEFERRED** |
| @ committed HEAD | `NoOpExpenseAccountingHook` in `create-expense-transaction.runner.ts` |
| Latent defect | `PayExpenseService` posts journal hook before status persist — orphan journal risk when real hook enabled |
| Phase 55 impact | None |
| WIP note | Uncommitted WIP may wire real hook — re-audit required on merge, not at HEAD |
| Recommendation | Remain **DEFERRED** until expense accounting hook ships |

---

## 16. N-51-DOC-01 Reassessment

| Field | Value |
|-------|-------|
| Status | **OPEN (DOC)** |
| Issue | `PHASE_51_IMPLEMENTATION_REPORT.md` records commit `f289520`; authoritative Phase 51 impl is `eeb0c6f` (same message) |
| @ `08742c6` | Confirmed via `git show 08742c6:docs/audits/PHASE_51_IMPLEMENTATION_REPORT.md` |
| Runtime impact | None |
| Recommendation | Optional doc-only fix in a future documentation phase |

---

## 17. Authorization Audit

- Authentication: Better Auth session on protected routes — unchanged
- Mutation routes: `assertPermission` at route/handler layer — unchanged
- **Remaining gap (F-11):** `WORKER_PERMISSIONS` grants `payments.post`, `payments.void`, `rentalInvoices.issue`, `rentalInvoices.void`, dispatch/return/repair mutations without workflow-scoped restrictions (`role-permissions.ts` L48–119)
- DL-51-01 partially mitigates stock-movement bypass; other coarse-grant surfaces remain
- Phase 55 did not alter authorization ordering or boundaries

---

## 18. Inventory Audit

- Counter mutations: atomic SQL in `executeCreateStockMovementInScope`
- Public POST: ADJUSTMENT-only + `inventory.adjust` (DL-51-01)
- PATCH: metadata-only (Phase 43)
- No new inventory integrity gap @ HEAD

---

## 19. Rental Order Audit

- F-02 commitment statuses exclude ephemeral `DISPATCHED` (F-07 remains enum hygiene only)
- Reserve/source/cancel paths retain locks and authoritative reread
- Invoice generation: eligibility + active-invoice guard + number uniqueness
- No regression from Phase 55

---

## 20. External Rental Audit

- Both creation paths share `assertExternalSourcingF02Gate` (DL-51-03)
- Active ERA uniqueness: application + partial unique index
- Phase 55 did not touch ERA module

---

## 21. Next Priority Determination

**No P0/P1/P2 open findings @ HEAD.**

After Phase 55, the highest-value remaining work is **not** cosmetic invoice sequence gaps (F-37-R2). Among open items:

1. **F-11** — authorization granularity: broad WORKER mutation surface; highest security/breadth impact among P3 items
2. **N-39-UI-01** — misleading invoice summary stats when tenant has >100 invoices
3. **F-09 / F-07** — schema hygiene (low runtime impact)
4. **F-37-R2** — cosmetic numbering gaps (lowest remediation value)
5. **N-51-DOC-01** — documentation traceability only

```text
NEXT IMPLEMENTATION TARGET: F-11 (P3)
```

**Rationale:** F-11 affects authorization breadth across payments, invoices, dispatch, and returns. F-37-R2 is explicitly acceptable-by-design with no integrity defect. N-51-01 closure removes the prior queue leader; F-11 is the most important remaining enterprise hardening item.

**Readiness:** Repository is ready for Phase 57 implementation. No decision lock required for F-11 (policy/design choices needed during implementation planning).

---

## 22. Finding Register

| ID | Severity | Status | Summary |
|----|----------|--------|---------|
| **N-51-01** | P3 | **CLOSED** | Invoice P2002 retry @ `08742c6` |
| **N-48-01** | P2 | **CLOSED** | Direct ERA F-02 parity @ `7407ba3` |
| **N-44-05** | P2 | **CLOSED** | Invoice void + POSTED payments @ `1596a64` |
| **F-37-R2** | P3 | OPEN | Sequence gaps by design — not next target |
| **F-11** | P3 | OPEN | Broad WORKER permissions — **next recommended** |
| **F-09** | P3 | OPEN | Repair FK hygiene |
| **F-07** | P3 | OPEN | Ghost DISPATCHED enum |
| **N-39-UI-01** | P3 | OPEN | Invoice summary UI cap at 100 |
| **F-35-08** | DEFERRED | DEFERRED | NoOp expense accounting hook @ HEAD |
| **N-51-DOC-01** | DOC | OPEN | Phase 51 report hash mismatch |

**No new P0/P1/P2 findings.**

---

## 23. Test Results

Environment: `DATABASE_URL` + `BETTER_AUTH_SECRET` test fixtures.

### Targeted regression

| Suite | Result |
|-------|--------|
| Phase 55 P2002 retry (`p2002-retry.55`) | **9/9 PASS** |
| Phase 50 number allocation | **PASS** (in combined 62) |
| Phase 49 payment derived status | **PASS** (in combined 62) |
| Phase 52 void-posted-payment guard | **PASS** (in combined 62) |
| Phase 51 stock movement policy | **PASS** (in combined 62) |
| Phase 53 ERA F-02 parity | **PASS** (in combined 62) |
| **Targeted combined (49/50/51/52/53/55)** | **62/62 PASS** |

### Full suite

```text
passed:  3241
failed:  0
skipped: 0
total:   3241
```

Phase 55 baseline: 3241/3241. **Unchanged** — no regressions.

Command: `npm test` (221 files)

---

## 24. Static Validation

| Check | Result | Notes |
|-------|--------|-------|
| `npx prisma validate` | **PASS** | |
| ESLint | **FAIL** | 5 errors, 52 warnings — pre-existing unrelated WIP (React Compiler memoization in feature modules); **no Phase 55 file errors** |
| `npm run typecheck` | **FAIL** | Pre-existing unrelated WIP (`maintenance-list-table.tsx`, feature modules, WIP test runners); **no Phase 55 file errors** @ HEAD |
| `git diff --check` | **PASS** | Whitespace warnings on unrelated WIP only |

Phase 55 did not introduce new static validation failures on committed code.

---

## 25. Schema / Migration Status

```text
Schema changes: NONE (Phase 55 and audit session)
Migrations: NONE (Phase 55 and audit session)
```

Phase 55 @ `08742c6`: no `prisma/schema.prisma` changes.

---

## 26. WIP Preservation

~151 WIP entries unchanged before and after audit. No application code staged or modified except this report.

---

## 27. Final Verdict

**MT-ERP @ `08742c6` is enterprise-integrity sound for controlled single-tenant launch.**

- Phase 55 / N-51-01: **genuinely closed**
- No Phase 55 regressions
- All P0/P1/P2 closures remain valid
- P2002 invoice conflict handling: **correct**
- Financial, concurrency, and authorization protections: **intact** (F-11 P3 remains)
- Repository ready for next implementation phase

---

## 28. Recommended Next Phase

```text
Phase 57 — F-11 — Authorization granularity (broad WORKER mutation permissions)
```

Alternatives (lower priority): N-39-UI-01 (UI), F-09/F-07 (schema hygiene), N-51-DOC-01 (doc-only).

**Do not implement F-37-R2 next** unless business explicitly prioritizes cosmetic invoice numbering over authorization hardening.

---

**Audit commit:** _(filled post-commit)_  
**Push:** NOT PUSHED
