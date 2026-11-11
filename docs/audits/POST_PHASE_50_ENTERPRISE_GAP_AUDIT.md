# Post-Phase-50 Enterprise Gap Audit

**Audit date:** 2026-09-02  
**Scope:** Committed production baseline at `c5292a9` only — ~155 WIP entries excluded from audit target  
**Method:** Independent Phase 50 closure verification, closed-finding regression review, open/deferred deep audit, enterprise gap discovery, targeted + full regression execution

---

## Executive Verdict

**AUDIT COMPLETE — DECISION LOCK REQUIRED BEFORE PHASE 51 IMPLEMENTATION**

| Severity | Count |
|----------|------:|
| **P0** | **0** |
| **P1** | **0** |
| **P2** | **3** |
| **P3** | **6** |
| **DEFERRED** | **1** |

Phase 50 closed **F-33-01**. No P0/P1 launch blockers at HEAD. Engineering concurrency hardening through Phases 35–50 remains intact on committed code.

**Highest-priority remaining gaps:** Three open P2 findings — **F-33-03**, **N-44-05**, **N-48-01** — all require **decision locks** before implementation.

**Recommended next step:** **Decision Lock Session (DL-51-01 / DL-51-02 / DL-51-03)** — not blind Phase 51 code changes. After locks, first implementation candidate: **Phase 51 — F-33-03 Stock Movement API Workflow Policy** (highest operational/inventory workflow impact).

**Launch blockers (P0/P1):** **None**

**v1.0 posture:** Acceptable for controlled single-tenant launch **with documented policy locks** on the three P2 items. Expense accounting (F-35-08) remains an accepted v1 limitation at HEAD.

---

## Repository Baseline

| Item | Value |
|------|-------|
| **Branch** | `main` |
| **HEAD** | `c5292a9db83f153ea1ecf5871c353eeab6ec2116` (`c5292a9`) |
| **Phase 50 commit** | `fix(invoice): harden invoice number allocation` |
| **Parent (Phase 49)** | `41c27b3` — `fix(rental-invoice): harden derived status transition` |
| **Phase 50 report** | `docs/audits/PHASE_50_IMPLEMENTATION_REPORT.md` — present @ HEAD |
| **WIP entries** | **155** (`git status --short \| Measure-Object -Line`) |
| **Staged** | None |
| **Push** | NO |
| **Audit target** | `git show HEAD:` committed tree |

**Recent history:**

```text
c5292a9 fix(invoice): harden invoice number allocation
41c27b3 fix(rental-invoice): harden derived status transition
2aab8cd fix(rental-order): serialize external sourcing shortfall
9e0eaf1 fix(repair): prevent repair capacity over-commitment
893a811 fix(payment): prevent supplier pending payment over-commitment
```

**WIP summary:** ~155 unrelated modified/untracked files (accounting UI, reports, expense hook WIP, seeds, audit docs, etc.). **Not modified during this audit** except creation of this report file.

---

## Phase 50 Verification — F-33-01 CLOSED

### Status: **CLOSED @ `c5292a9`** — independently verified

### Numbering contract (code-evidence)

| Property | Verified @ HEAD | Evidence |
|----------|:---------------:|----------|
| Format `INV-{YYYY}-{NNN}` | Yes | `rental-invoice-number.rules.ts` — `buildInvoiceNumberPrefix`, `formatInvoiceNumberFromSequence` (3-digit pad) |
| Year-scoped prefix | Yes | `buildInvoiceNumberPrefix(referenceDate)` uses `getFullYear()` |
| Global uniqueness | Yes | Prisma `RentalInvoice.invoiceNumber @unique` |
| Algorithm max+1 | Yes | `generate-invoice-number.ts` — `findMaxSequenceForInvoicePrefix` + 1 |
| No gap filling | Yes | T50.4 test; algorithm always max+1 |
| VOID counts toward max | Yes | `findMaxSequenceForInvoicePrefix` has no status filter; all committed rows with matching prefix |
| Single auto path | Yes | Only `GenerateRentalInvoiceFromOrderService` calls `generateNextInvoiceNumber` |
| Direct create unchanged | Yes | `CreateRentalInvoiceService` accepts manual `invoiceNumber` |

### Implementation chain

```
GenerateRentalInvoiceFromOrderService.execute
  → runWithRepositoryUnitOfWork (single transaction)
  → generateNextInvoiceNumber(repository, invoiceDate)
       → buildInvoiceNumberPrefix
       → repository.findMaxSequenceForInvoicePrefix(prefix)
       → formatInvoiceNumberFromSequence(prefix, max+1)
  → createRentalInvoiceInWriteScope (duplicate pre-check + create)
  → on ConflictError "Invoice number already exists": retry (max 5)
```

**Prisma authoritative max query** — `prisma-rental-invoice.repository.ts`:

```sql
SELECT COALESCE(MAX(CAST(SUBSTRING("invoiceNumber" FROM prefixLen+1) AS INTEGER)), 0)
FROM "rental_invoices"
WHERE "invoiceNumber" LIKE '{prefix}%'
  AND SUBSTRING(...) ~ '^[0-9]+$'
```

**Legacy 500-row scan:** Removed from `generate-invoice-number.ts`. No remaining `pageSize: 500` in invoice allocation path.

### Concurrency analysis

**Scenario A/B (parallel generate, different orders):**

```text
Tx A: MAX=100 → candidate 101
Tx B: MAX=100 → candidate 101
Tx A: pre-check + INSERT 101 → commit
Tx B: pre-check may miss uncommitted A → INSERT → P2002 OR pre-check ConflictError
Tx B: retry loop re-queries MAX=101 → candidate 102 → success
```

| Mechanism | Assessment |
|-----------|------------|
| Prefix-scoped MAX | Correct — eliminates scan-window false max |
| `@unique` | Prevents duplicate committed numbers |
| Pre-insert duplicate check | Catches most races → `ConflictError` "Invoice number already exists" → **retried** |
| P2002 from Prisma | Maps to `"A record with the same unique value already exists"` → **not retried** by current `isInvoiceNumberConflict` filter |
| 5 retry bound | Practical collision bound under normal load; extreme sustained collision could exhaust attempts |
| Transaction boundary | Allocation + create in same UoW; failed create attempts do not commit partial invoice |
| Stale MAX on retry | Each retry calls `generateNextInvoiceNumber` fresh — reads committed state at READ COMMITTED |

**Verdict:** F-33-01 primary finding (bounded scan missing true max) is **genuinely closed**. Residual P3 note **N-51-01** — P2002 message not included in retry filter (see New Findings).

**5 retries classification:** Correctness mechanism for app-level duplicate detection + practical bound; not a substitute for `@unique`. Under typical concurrency, one retry suffices.

### Phase 50 tests

| Test | Result | Evidence |
|------|:------:|----------|
| T50.1 normal allocation | PASS | `rental-invoice.number-allocation.50.application.test.ts` |
| T50.2 legacy scan window | PASS | Crowding 500× INV-2027 + INV-2026-550; legacy scan returns 0, authoritative returns 550 |
| T50.3 large population (1000) | PASS | Next = 1001 |
| T50.4 gaps | PASS | 001 + 010 → 011 |
| T50.5 concurrent allocation | PASS | `Promise.all` + commit with retry helper |
| T50.6 rollback | PASS | Audit failure rolls back; number not consumed |
| T50.7 year scope | PASS | 2025 vs 2026 prefixes isolated |

### Schema / migrations

```
Schema changes: NONE (Phase 50)
Migrations: NONE (Phase 50)
```

---

## Closed Finding Regression Matrix

| Finding | Previous State | Current State @ `c5292a9` | Evidence | Regression? |
|---------|----------------|----------------------------|----------|:-----------:|
| **F-33-01** | OPEN (Phase 49) | **CLOSED** (Phase 50) | `findMaxSequenceForInvoicePrefix`; no 500-row scan | N/A — closed |
| **F-37-R1** | CLOSED (Phase 49) | **CLOSED** | `payment-invoice.validation.ts` — `claimDerivedPaymentStatus` + `claimStatusTransition` | No |
| **N-46-02** | CLOSED (Phase 48) | **CLOSED** | `SourceRentalOrderExternallyService` lock→reread→shortfall | No |
| **N-46-01** | CLOSED (Phase 47) | **CLOSED** | `lockForRepairCapacity` | No |
| **N-44-06** | CLOSED (Phase 46) | **CLOSED** | Supplier pending payment lock | No |
| **Phase 45 return capacity** | CLOSED | **CLOSED** | `lockForReturnCapacity` | No |
| **F-04 / F-05 dispatch** | CLOSED | **CLOSED** | Claim-before-effects | No |
| **F-31-08 / Phase 43 PATCH** | LOCKED | **CONFORMS** | `UpdateInventorySchema` strict metadata-only | No |
| **F-35-01 payment settlement** | CLOSED | **CLOSED** | Atomic `applyPaymentDelta` | No |
| **F-35-06 invoice issue/void** | CLOSED | **CLOSED** | `claimStatusTransition` on issue/void | No |
| **F-36-03 payment pending** | CLOSED | **CLOSED** | `lockForPaymentCommitment` | No |
| **N-40-01** | CLOSED | **CLOSED** | No bypass found | No |
| **F-31-05** | CLOSED | **CLOSED** | Prior closure intact | No |
| **N-42-01** | CLOSED | **CLOSED** | Dispatch mark-ready claim | No |
| **F-31-03** | CLOSED (historical) | **CLOSED** | Distinct from F-33-03 | No |

---

## Remaining Findings

| ID | Severity | Status | Root Cause | Impact | Decision Lock | Launch Impact | Recommended Phase |
|----|----------|--------|------------|--------|---------------|---------------|-------------------|
| **F-33-03** | P2 | OPEN | WORKER+ `POST /api/stock-movements` accepts all 5 types without workflow/reference guards | Workflow bypass; RESERVE skips F-02 locks; ADJUSTMENT bypasses `inventory.adjust` intent | **DL-51-01** | Pre-launch policy recommended | After DL-51-01 |
| **N-44-05** | P2 | OPEN | `PARTIALLY_PAID → VOID` preserves `paidAmount`; live POSTED payments; payment reversal blocked on VOID invoice | Settlement dead-end; reporting/UI ambiguity | **DL-51-02** | Pre-launch clarification recommended | After DL-51-02 |
| **N-48-01** | P2 | OPEN | Direct `POST /api/external-rentals` lacks F-02 locks/shortfall gate | MANAGER+ can over-request external qty vs shortfall | **DL-51-03** | Pre-launch policy recommended | After DL-51-03 |
| **F-37-R2** | P3 | OPEN | Sequence gaps when allocation retries / manual numbers | Cosmetic numbering only | No | Acceptable v1.0 | Optional |
| **F-11** | P3 | OPEN | Broad WORKER mutation permissions | Amplifies F-33-03 | Partial (DL-51-01) | Acceptable with lock | Tied to F-33-03 |
| **F-09** | P3 | OPEN | Repair `returnInspectionItemId` no FK | Schema hygiene | No | Deferred hygiene | v1.1+ |
| **F-07** | P3 | OPEN | Ghost `DISPATCHED` RO enum value | Confusion only | No | Acceptable | Cleanup |
| **N-39-UI-01** | P3 | OPEN | Active invoice UI list page cap | UI misleading only | No | Acceptable | UI polish |
| **N-51-01** | P3 | OPEN (new) | Invoice retry ignores P2002 generic ConflictError message | Rare TOCTOU at DB unique on hot parallel generate | No | Acceptable v1.0 | Optional hardening |
| **F-35-08** | DEFERRED | DEFERRED | `NoOpExpenseAccountingHook` wired @ HEAD | No expense journal side effects in production | N/A until hook merge | Acceptable v1 limitation | Re-audit on WIP merge |

---

## New Findings

### N-51-01 — Invoice Number Retry P2002 Message Gap (P3)

| Field | Detail |
|-------|--------|
| **Root cause** | `isInvoiceNumberConflict` matches only message `"Invoice number already exists"`. Prisma P2002 maps to `"A record with the same unique value already exists"` (`prisma-error-mapper.ts`). |
| **Affected module** | `generate-rental-invoice-from-order.service.ts` |
| **Production impact** | Under rare parallel generate-from-order (different ROs), DB unique violation may fail without retry instead of recovering. `@unique` still prevents corruption. |
| **Concurrency** | TOCTOU between pre-check and insert; low frequency |
| **Decision lock** | Not required — optional message/target broadening |
| **Recommended action** | Optional Phase 51+ hardening: retry on any P2002 targeting `invoiceNumber` |

No other new P0/P1/P2 findings discovered in Phases 49–50 regression surface or targeted enterprise search.

---

## Deep Audit Summaries

### F-33-03 — Stock Movement API (unchanged @ HEAD)

- **Route:** `POST /api/stock-movements` → `CreateStockMovementService` → `executeCreateStockMovementInScope`
- **Roles:** WORKER, MANAGER, OWNER (`stockMovements.create`); ACCOUNTANT **cannot** create
- **Types:** IN, OUT, RESERVE, RELEASE, ADJUSTMENT — all accepted; `referenceType`/`referenceId` optional
- **Atomic SQL:** Prevents negative on-hand/reserve violations
- **Workflow bypass:** RESERVE without F-02; ADJUSTMENT without `inventory.adjust`; unvalidated references
- **Immutability:** Append-only ledger — no update/delete on movements
- **Classification:** P2 workflow/authorization — **DL-51-01 required**

### N-44-05 — Void Partially Paid Invoice (unchanged @ HEAD)

- **Allowed:** `assertCanVoid` permits `PARTIALLY_PAID`; `withVoided()` preserves money fields
- **Not cascaded:** No payment lookup/reversal in `VoidRentalInvoiceService`
- **Dead-end:** After VOID, `applyPaymentDelta` rejects both apply and reverse on VOID invoice
- **Reporting:** Backend AR excludes VOID (per analytics contract); collected cash still counts POSTED payments; UI shows paid/balance on void invoices
- **Classification:** Policy ambiguity — **DL-51-02 required**

### N-48-01 — Direct External Rental Create (unchanged @ HEAD)

- **Direct path:** `CreateExternalRentalService` — no F-02 locks, no shortfall gate
- **Source path:** `SourceRentalOrderExternallyService` — full lock→reread→shortfall (Phase 48)
- **RO required:** Schema FK — cannot create ERA without `rentalOrderId`
- **Auth:** MANAGER+ only (not WORKER)
- **Classification:** P2 privileged bypass — **DL-51-03 required**

### F-35-08 — Expense Accounting (unchanged @ HEAD)

- **Production @ HEAD:** `create-expense-transaction.runner.ts` wires `NoOpExpenseAccountingHook`
- **WIP (uncommitted):** `ExpenseAccountingHook` + `operational-journal-posting.service.ts` exist untracked/modified — **not in HEAD**
- **Impact:** Expenses do not post journals in production; P&L/cash reports use expense records directly
- **Classification:** **DEFERRED** — acceptable v1 limitation; re-audit when WIP merges

---

## P3 / Deferred Reassessment

| ID | Still exists? | Severity change | Launch impact | Notes |
|----|:-------------:|-----------------|---------------|-------|
| F-37-R2 | Yes | Unchanged P3 | Acceptable | Phase 50 max+1 reduces misallocation; gaps remain by design |
| F-11 | Yes | Unchanged P3 | Acceptable | Resolves partially when F-33-03 locked |
| F-09 | Yes | Unchanged P3 | Defer | No runtime corruption observed |
| F-07 | Yes | Unchanged P3 | Defer | Enum unused in transitions |
| N-39-UI-01 | Yes | Unchanged P3 | Defer | Backend pagination correct |
| F-35-08 | Yes | Unchanged DEFERRED | Acceptable v1 | NoOp intentional @ HEAD |

---

## Decision Locks

### DL-51-01 — F-33-03 Stock Movement POST Policy

**Finding:** F-33-03  
**Question:** Should WORKER+ retain direct `POST /api/stock-movements` for all five movement types?

| Option | Description |
|--------|-------------|
| **A** | Restrict/remove public POST; workflows call `executeCreateStockMovementInScope` in-process only |
| **B** | Allowlist types + mandatory validated references per type |
| **C** | Split ADJUSTMENT to `inventory.adjust` permission; restrict RESERVE/OUT/IN to workflow-only |
| **D** | Document as intentional privileged warehouse API (status quo) |

**Recommendation:** **Option C** as minimum — align ADJUSTMENT with Phase 43 intent; evaluate removing WORKER `stockMovements.create` for RESERVE/OUT/IN.  
**Consequences:** Option A/C reduce F-02 bypass; Option D preserves flexibility at documented risk.

---

### DL-51-02 — N-44-05 Void With Live Payments

**Finding:** N-44-05  
**Question:** What must happen when voiding a PARTIALLY_PAID invoice with POSTED payments?

| Option | Description |
|--------|-------------|
| **1** | Block void if any POSTED (or pending) payment exists |
| **2** | Cascade reverse/void linked POSTED payments in same UoW |
| **3** | Allow void; document manual reconciliation (status quo) |
| **4** | Zero invoice display fields; payments remain POSTED (not recommended) |

**Recommendation:** **Option 1** for v1.0 launch safety — avoids settlement dead-end.  
**Consequences:** Option 2 requires symmetric payment UoW; Option 3 requires operator training.

---

### DL-51-03 — N-48-01 Direct ERA Create vs F-02

**Finding:** N-48-01  
**Question:** Should `POST /api/external-rentals` enforce F-02 shortfall serialization for RO-linked creates?

| Option | Description |
|--------|-------------|
| **1** | Enforce parity with source-externally (locks + shortfall gate) |
| **2** | Document MANAGER emergency override; optional separate permission |
| **3** | Deprecate direct RO-linked create; source-externally only |

**Recommendation:** **Option 1** or **Option 3** — eliminate asymmetric guards.  
**Consequences:** Option 2 preserves override at operational risk.

---

## Test Evidence

**Environment:** Test env vars set (`NODE_ENV=test`, `DATABASE_URL`, `BETTER_AUTH_SECRET`) — required for suites importing `env.ts`.

| Suite | Command | Result |
|-------|---------|--------|
| Phase 50 T50.* | `npx vitest run ...rental-invoice.number-allocation.50.application.test.ts` | **9/9 PASS** |
| Phase 49 concurrency | `...payment-invoice-derived-status-concurrency.49.application.test.ts` | PASS |
| Phase 38 issue/void | `...rental-invoice.issue-void-concurrency.38.application.test.ts` | PASS |
| Phase 37 active guard | `...rental-invoice.active-guard.37.application.test.ts` | PASS |
| Phase 48 source externally | `...rental-order.source-externally-concurrency.48.application.test.ts` | PASS |
| Phase 43 inventory PATCH | `...inventory.patch-ledger-integrity.43.application.test.ts` | PASS |
| **Combined targeted** | 6 files | **52/52 PASS** |
| **Full suite** | `npm test` | **3195/3195 PASS** |

Concurrency tests use genuine `Promise.all` / `Promise.allSettled` — verified in Phase 37/38/49/50 test sources.

---

## Static Validation

| Check | Result |
|-------|--------|
| `npx prisma validate` | **PASS** |
| ESLint (Phase 50 files @ prior phase) | PASS (unchanged) |
| `npm run typecheck` | **FAIL** — pre-existing unrelated WIP errors (payment/repair/return/rental-order test harness types); **no errors in Phase 50 committed files** |
| Repository searches | `findMaxSequenceForInvoicePrefix` present; `pageSize: 500` absent from invoice allocation; `NoOpExpenseAccountingHook` @ HEAD |

---

## WIP Preservation

| Item | Status |
|------|--------|
| Approximate WIP count | **155** entries |
| WIP modified during audit | **No** (application code untouched) |
| WIP staged | **No** |
| WIP committed | **No** |
| Audit report only | This file created untracked → commit per git discipline |

---

## Launch Readiness

| Category | Assessment |
|----------|------------|
| Launch blockers (P0/P1) | **None** |
| Pre-launch required | Decision locks DL-51-01, DL-51-02, DL-51-03 |
| Acceptable for v1.0 | Closed concurrency hardening; F-33-01; atomic inventory SQL; payment settlement |
| Deferred | F-35-08 expense accounting @ HEAD |

### Domain scores (planning estimates)

| Domain | Hardening |
|--------|-----------|
| Architecture | Strong — consistent UoW/repository pattern |
| Rental Orders | Strong — F-02, reserve locks, Phase 48 sourcing |
| Inventory | Strong counters; P2 workflow API gap (F-33-03) |
| Dispatch/Returns/Repair | Strong — Phases 41–47 closures verified |
| Purchasing/Supplier payments | Strong — Phase 46 |
| Invoicing | Strong — Phases 37–38, **50** |
| Payments | Strong — Phases 35, 49; N-44-05 policy open |
| External rentals | Good — Phase 48 on source path; N-48-01 on direct path |
| Authorization | Good — WORKER stock movement breadth (F-33-03) |
| Testing | Strong — 3195 tests @ HEAD |
| Deployment | Good — no schema drift from Phase 50 |

```text
Engineering hardening readiness: 91%
Overall v1.0 launch readiness: 84%
```

**Basis:** +3% engineering vs Post-Phase-49 (88%) from F-33-01 closure and verified 3195 tests. Launch readiness +2% (82%→84%) — P2 count reduced 4→3 but all remaining P2 require decision locks before implementation. Score not inflated by P0/P1=0 alone.

---

## Recommended Next Phase

**Decision Lock Required Before Phase 51 Implementation**

Conduct a decision-lock session for **DL-51-01**, **DL-51-02**, **DL-51-03**.

After locks, recommended first implementation:

```text
Phase 51 — F-33-03 Stock Movement API Workflow Policy
```

Rationale: Highest cross-cutting operational impact (inventory workflow integrity, F-02 adjacency, WORKER privilege surface). N-44-05 and N-48-01 are narrower privileged-path policies.

Alternative if business prioritizes financial clarity first:

```text
Phase 51 — N-44-05 Void / Partial Payment Policy
```

Do **not** start Phase 51 implementation until at least the relevant decision lock is recorded in `docs/decisions/`.

---

## Git Discipline (Audit)

| Action | Status |
|--------|--------|
| Application code modified | No |
| Only audit report added | Yes |
| Push | No |
| WIP disturbed | No |
