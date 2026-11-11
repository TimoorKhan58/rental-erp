# Phase 35 — Post-Phase-34 Enterprise Gap Audit

**Audit date:** 2026-08-26  
**Auditor scope:** Post-Phase-34 enterprise correctness — invoice integrity follow-through, deferred F-33 family, payment/money concurrency, pagination, status/side-effect ordering, database invariants  
**Audit type:** Read-only — no production code, schema, test, commit, or push changes  
**Authoritative baseline:** committed `HEAD` **`6fc20be811c1170ae9b1b41b82f45f37840c0981`** — `feat(rental-invoice): fix dispatch rollup truncation`  
**Prior audits consulted:** Phase 29–34 enterprise gap audits, Phase 34 decision lock / implementation report, Phase 33 maintenance decision lock

---

## Executive Verdict

**AUDIT COMPLETE — GO TO PHASE 35 DECISION LOCK**

Phase 34 **closed F-31-03** (invoice dispatch rollup truncation). Committed production code at `6fc20be` no longer uses capped dispatch retrieval on invoice generation or missing→loss conversion.

The **highest-priority remaining enterprise gap** is a **new P1 finding (F-35-01)**: payment posting applies invoice `paidAmount` / `balance` via **read-then-write absolute updates** with **no atomic status claim** on invoice or payment entities. Concurrent payment posts can **silently lose monetary deltas** on the same invoice.

The **second-priority cluster** is the deferred **invoice integrity family (F-33-01 / F-33-02 / F-35-05)**, still **OPEN at HEAD** as **P2** pagination / guard gaps. These are natural follow-on work after Phase 34 but are lower severity than payment settlement corruption under concurrency.

**F-33-03** (direct stock-movement RESERVE/RELEASE API bypass) remains **OPEN P2**.

**F-30-07 / F-31-02** (maintenance/repair claim-before-side-effects) is **CLOSED at HEAD** — `claimStatusTransition` is present on all six workflow commands (introduced in `8425661`).

**Working-tree note:** ~138 unrelated modified/untracked files remain. Uncommitted WIP includes `findActiveByRentalOrderId` on the **rental-invoice** repository and `operational-journal-posting.service.ts` — **not audited as committed behavior**.

---

## Repository Baseline

| Attribute | Value |
| --- | --- |
| Branch | `main` |
| HEAD | `6fc20be811c1170ae9b1b41b82f45f37840c0981` |
| Ahead of `origin/main` | **1 commit** (Phase 34) |
| Push status | **NOT PERFORMED** |
| Working tree | **~138** modified/untracked files (UI, payments, reports, customer billing, F-33-02 invoice-repo WIP, other docs) |
| Phase 34 | **COMPLETE** — F-31-03 fixed; T34.1/T34.2 + 3059/3059 tests validated pre-commit |
| Production code modified by this audit | **None** (this document only) |

---

## Phase 34 Closure Verification

| Check | Result | Evidence |
| --- | --- | --- |
| F-31-03 dispatch rollup | **CLOSED** | `load-rental-order-returns.ts` → `findCompletedDispatchesByRentalOrderId`; wired in `generate-rental-invoice-from-order.service.ts` and `convert-missing-to-loss.service.ts` (initial + refresh) |
| No `pageSize: 100` + `rentalOrderId` on invoice rollup paths | **PASS** | `git grep` at HEAD — only F-33 caps remain in invoice services |
| Phase 30 dispatch/RO paths | **UNCHANGED / CLOSED** | SQL aggregate, EXISTS guard, unbounded COMPLETED fetch |
| F-33-02 not bundled | **PASS** | Generate path still uses `findPaged({ pageSize: 10 })`; no rental-invoice `findActiveByRentalOrderId` at HEAD |

---

## Finding Reconciliation Table

| Finding | Previous Status | Current Status @ `6fc20be` | Evidence | Severity |
| --- | --- | --- | --- | --- |
| **F-31-03** | OPEN (Phase 33) → fixed Phase 34 | **CLOSED** | Commit `6fc20be`; T34.1/T34.2; `loadReturnsForRentalOrder` | — |
| **F-33-01** | OPEN (Phase 33 P2) | **OPEN** | `generate-invoice-number.ts` `pageSize: 500` global sequence scan | **P2** |
| **F-33-02** | OPEN (Phase 33 P2) | **OPEN** | `generate-rental-invoice-from-order.service.ts` `pageSize: 10` active-invoice guard | **P2** |
| **F-33-03** | OPEN (Phase 33 P2) | **OPEN** | `POST /api/stock-movements` accepts RESERVE/RELEASE without workflow coupling | **P2** |
| **F-30-07 / F-31-02** | OPEN (Phase 33 audit) | **CLOSED** | Maintenance/repair services use `claimStatusTransition` before stock (`8425661`) | — |
| **F-31-08** | OPEN (inventory PATCH bypass) | **OPEN** | `update-inventory.service.ts` unconditional `repository.update` on counters | **P2** (F-35-07) |
| **F-35-01** | — (new) | **OPEN** | `applyPaymentToInvoice` absolute `paidAmount` write; no payment/invoice claim | **P1** |
| **F-35-05** | — (new, F-33-02 related) | **OPEN** | `CreateRentalInvoiceService` has no active-invoice guard | **P2** |
| **F-35-06** | — (new) | **OPEN** | Issue/void invoice use plain `updateStatus` without claim | **P2** |
| **F-35-08** | — (new) | **OPEN** | `pay-expense.service.ts` posts journal before expense status persist | **P2** |
| **F-35-09** | — (new) | **OPEN** | `post-payment` / `void-payment` mutate invoice before payment status claim | **P2** |
| Phase 30 dispatch rollups | CLOSED | **CLOSED** | No regression evidence | — |
| Phase 28 mixed return attribution | CLOSED | **CLOSED** | No regression evidence | — |
| Phase 31 F-02 availability | CLOSED | **CLOSED** | Reserve path uses locks + atomic inventory SQL | — |
| Phase 32 reserve command | CLOSED | **CLOSED** | RO lock + fresh re-fetch | — |

---

## F-35-01 — Payment posting loses concurrent invoice settlement deltas

### Location

- `src/modules/payment/application/services/payment-invoice.validation.ts` — `applyPaymentToInvoice`
- `src/modules/payment/application/services/post-payment.service.ts` — `execute`
- `src/modules/payment/application/services/void-payment.service.ts` — posted void branch
- `src/modules/rental-invoice/infrastructure/repositories/prisma-rental-invoice.repository.ts` — `updateStatus` (unconditional)

### Evidence

```typescript
// payment-invoice.validation.ts
const updatedInvoice = invoice.withPaymentApplied(invoice.paidAmount + delta);
return rentalInvoiceRepository.updateStatus(invoice.id, {
  status: updatedInvoice.status,
  paidAmount: updatedInvoice.paidAmount,
  balance: updatedInvoice.balance,
});
```

`PostPaymentService` reads invoice once, applies payment delta, then updates payment status — **no** `claimStatusTransition` anywhere in the payment module. Two concurrent posts against the same invoice both read the same `paidAmount`; last writer wins → **one payment amount dropped** from invoice totals.

### Invariant

Invoice `paidAmount` and `balance` must reflect the **sum of all posted payments** (and reversals). Each posted payment must be applied **exactly once** to the invoice ledger.

### Failure Mode

Two users (or retries) post different pending payments on the same invoice concurrently. Both read `paidAmount = 0`, both write `paidAmount =各自 amount`. Final invoice shows only one payment; the other payment record is POSTED but invoice totals are wrong → **financial corruption** (customer balance, revenue recognition, collection status).

### Business Impact

Under-reported payments on invoices; incorrect `PAID` / `PARTIALLY_PAID` status; audit trail shows posted payment but invoice balance inconsistent with payment list.

### Concurrency

**RELEVANT** — classic read-modify-write race; no row lock, no conditional update, no optimistic version on `RentalInvoice`.

### Existing Protection

- Pre-post validation: `assertPaymentAmountWithinBalance` on **stale** invoice read
- Pending-payment aggregate on create (`sumPendingAmountByRentalInvoiceId`) — does not serialize post
- DB does **not** enforce `paidAmount` consistency with payment rows

### Test Coverage

**Missing** — no concurrent `PostPaymentService` tests; no atomic settlement tests in `payment.application.test.ts`.

### Severity

**P1**

### Recommendation

Extend Phase 29 `claimStatusTransition` (or atomic `paidAmount` SQL delta with predicate) to payment post/void and invoice settlement; single transaction with payment status claim **after** successful invoice mutation or fused atomic update. Decision lock before implementation.

---

## F-35-02 — Active invoice guard capped at pageSize 10 (F-33-02)

### Location

`src/modules/rental-invoice/application/services/generate-rental-invoice-from-order.service.ts` — `execute` (active-invoice scan)

### Evidence

```typescript
const existingInvoices = await rentalInvoiceRepository.findPaged({
  page: 1,
  pageSize: 10,
  rentalOrderId,
  sortOrder: "desc",
});
const activeInvoice = existingInvoices.items.find(
  (invoice) => invoice.status !== "VOID",
);
```

Only the **10 most recent** invoices for the order are scanned. No `status` filter in query. No partial unique index on `(rentalOrderId) WHERE status <> 'VOID'` in schema.

### Invariant

At most one non-`VOID` invoice per rental order when generating from order.

### Failure Mode

Order has **>10** invoice records; the 10 newest are all `VOID` but an **older non-VOID** invoice exists at position 11+ → guard passes → duplicate active invoice on generate path.

### Business Impact

Duplicate billing documents for one rental order; conflicting charges and payment allocation.

### Concurrency

**RELEVANT** for duplicate generate requests; guard is also logically incomplete without concurrency.

### Existing Protection

- Application guard on **generate-from-order path only**
- `@unique` on `invoiceNumber` (global, not per-order active constraint)
- **No** `findActiveByRentalOrderId` on rental-invoice repository at **committed HEAD** (WIP exists uncommitted)

### Test Coverage

**Missing** — no >10 invoice bypass test; no generate conflict test.

### Severity

**P2** (edge cardinality; direct create bypass is more practical — see F-35-05)

### Recommendation

Unbounded `findFirst({ rentalOrderId, status: { not: VOID } })` or EXISTS; optional partial unique DB index. Natural **Phase 35 decision-lock candidate** for invoice integrity cluster.

---

## F-35-03 — Invoice number sequence capped at pageSize 500 (F-33-01)

### Location

`src/modules/rental-invoice/application/services/generate-invoice-number.ts` — `generateNextInvoiceNumber`

### Evidence

```typescript
const existing = await repository.findPaged({
  page: 1,
  pageSize: 500,
  sortBy: "invoiceNumber",
  sortOrder: "desc",
});
```

Global unfiltered page; year filter applied in-memory. Max sequence derived from first page only. Number generation runs inside generate UoW; `CreateRentalInvoiceService.execute` runs in a **separate** transaction.

### Invariant

Monotonic per-calendar-year invoice numbers `INV-{YYYY}-{seq}` without collision.

### Failure Mode

- **>500** invoices globally with current-year max not on page 1 → undercount → duplicate number → `ConflictError` or unique violation
- Lexicographic sort ranks `INV-2026-999` above `INV-2026-1000` → 4-digit sequences can fall off page 1
- Concurrent generates read same max → collision

### Business Impact

Invoice creation failures at scale; out-of-sequence numbering; support incidents — not silent duplicate rows (unique constraint prevents).

### Concurrency

**RELEVANT** — TOCTOU between generate and create transactions.

### Existing Protection

- `findByInvoiceNumber` pre-create check
- DB `@unique` on `invoiceNumber`

### Test Coverage

**Missing** — no >500 / cross-year / concurrent generate tests.

### Severity

**P2**

### Recommendation

Year-scoped SQL `MAX` sequence or dedicated sequence table; optionally fuse generate+create in one transaction.

---

## F-35-04 — Direct stock-movement API bypasses workflow locks (F-33-03)

### Location

- `src/app/api/stock-movements/route.ts` → `handleCreateStockMovement`
- `src/modules/stock-movement/application/services/create-stock-movement.service.ts`
- `src/modules/stock-movement/application/schemas/stock-movement.schemas.ts` — all movement types including RESERVE/RELEASE

### Evidence

`CreateStockMovementSchema` accepts `movementType` ∈ `{ IN, OUT, RESERVE, RELEASE, ADJUSTMENT }` with optional `referenceType` / `referenceId`. No requirement that RESERVE/RELEASE reference an active rental-order workflow. Permission: `stockMovements.create` — granted to **WORKER** role.

Workflow-aligned reserve (`reserve-rental-order.service.ts`) uses inventory `FOR UPDATE`, RO `lockForReserveCommand`, F-02 re-read, and updates `rentalOrderItem.reservedQuantity`. Direct API path executes atomic inventory SQL only.

### Invariant

Warehouse `reservedQuantity` must stay consistent with rental-order line reservations and F-02 availability commitments.

### Failure Mode

Privileged user POSTs RESERVE/RELEASE on inventory → warehouse counters move without RO line updates → availability calculations diverge → over/under reservation, phantom holds.

### Business Impact

Operational desync between warehouse and rental commitments; incorrect dispatch/reserve outcomes.

### Concurrency

**RELEVANT** — bypasses Phase 31/32 locking discipline.

### Existing Protection

- Atomic inventory SQL prevents negative on-hand per row
- Workflow paths remain correct when used

### Test Coverage

**Partial** — movement happy paths; **missing** workflow-bypass / RO desync tests.

### Severity

**P2** (requires authenticated permission; policy decision)

### Recommendation

Restrict RESERVE/RELEASE on direct API, require validated workflow reference, or admin-only gate.

---

## F-35-05 — Direct invoice create bypasses active-invoice guard

### Location

- `src/modules/rental-invoice/application/services/create-rental-invoice.service.ts`
- `src/modules/rental-invoice/presentation/routes/rental-invoice-api.routes.ts` — `handleCreateRentalInvoice`

### Evidence

`CreateRentalInvoiceService` validates rental order, customer, duplicate **invoice number** — **no** scan for existing non-`VOID` invoice on the order. `GenerateRentalInvoiceFromOrderService` alone enforces the active-invoice guard (F-35-02).

### Invariant

Same as F-35-02 — one active invoice per rental order (business rule).

### Failure Mode

User with `rentalInvoices.create` creates second DRAFT/ISSUED invoice via `POST /api/rental-invoices` while an active invoice already exists.

### Business Impact

Duplicate billing; payment allocation confusion.

### Concurrency

**RELEVANT**

### Existing Protection

F-35-02 guard on generate path only; no DB partial unique.

### Test Coverage

**Missing**

### Severity

**P2**

### Recommendation

Shared active-invoice predicate used by **both** create and generate paths; bundle with F-35-02 decision lock.

---

## F-35-06 — Issue and void invoice lack atomic status claims

### Location

- `src/modules/rental-invoice/application/services/issue-rental-invoice.service.ts`
- `src/modules/rental-invoice/application/services/void-rental-invoice.service.ts`

### Evidence

Both services: `findById` → in-memory transition (`withIssued` / `withVoided`) → unconditional `rentalInvoiceRepository.updateStatus`. No `claimStatusTransition` on rental-invoice repository (grep confirms zero).

### Invariant

At most one successful DRAFT→ISSUED (or active→VOID) transition per invoice.

### Failure Mode

Concurrent duplicate issue commands → duplicate notifications / duplicate downstream journal hooks if wired; second update may overwrite timestamps inconsistently.

### Business Impact

Lower than payment corruption; primarily duplicate side effects and audit noise. Issue path at HEAD has **no** journal hook (unlike WIP `operational-journal-posting`).

### Concurrency

**RELEVANT**

### Existing Protection

Domain `withIssued` throws on invalid status (second caller gets 422 if first committed)

### Test Coverage

**Partial** — happy path tests; **missing** concurrent issue/void tests.

### Severity

**P2**

### Recommendation

Adopt Phase 29 claim primitive on rental-invoice repository for terminal transitions.

---

## F-35-07 — Inventory PATCH bypasses movement ledger (F-31-08)

### Location

`src/modules/inventory/application/services/update-inventory.service.ts` — `execute`

### Evidence

Unconditional `repository.update(inventoryId, updateData)` after `findById`. Schema allows updating `quantityOnHand` / `reservedQuantity` via PATCH without stock-movement audit trail.

### Invariant

Inventory counter changes should trace to stock movements or workflow commands with atomic SQL.

### Failure Mode

User with inventory update permission sets counters arbitrarily → desync from movements and RO lines.

### Business Impact

Silent inventory corruption; reporting and availability errors.

### Concurrency

**RELEVANT** — absolute write races with workflow atomic SQL.

### Existing Protection

Workflow paths use atomic SQL (Phase 29–31)

### Test Coverage

**Missing** bypass tests.

### Severity

**P2**

### Recommendation

Restrict counter fields on PATCH or require adjustment movements; admin-only policy.

---

## F-35-08 — Pay expense records journal before status claim

### Location

`src/modules/expense/application/services/pay-expense.service.ts` — `execute`

### Evidence

Order: domain transition in memory → `accountingHook.onExpensePaid(paid)` → `expenseRepository.updateStatus`. Journal posted **before** expense row claims PAID status.

### Invariant

Expense should be atomically PAID before (or in same transaction as) irreversible accounting side effects.

### Failure Mode

Journal posts; expense status update fails → expense still APPROVED with GL entry recorded.

### Business Impact

Accounting / expense status mismatch.

### Concurrency

**RELEVANT** — same class as Phase 29 side-effect ordering.

### Existing Protection

Single transaction runner wraps steps — failure rolls back DB writes in same TX (hook behavior depends on hook implementation).

### Test Coverage

**Partial**

### Severity

**P2**

### Recommendation

Claim expense status before journal hook; align with Phase 29 ordering.

---

## F-35-09 — Post/void payment applies invoice mutation before payment status claim

### Location

`post-payment.service.ts`, `void-payment.service.ts`

### Evidence

Invoice updated via `applyPaymentToInvoice` **before** `paymentRepository.updateStatus`. Combined with F-35-01 absolute write, ordering increases exposure to partial failure and lost deltas.

### Invariant

Payment POSTED/Void and invoice settlement should be atomic and idempotent.

### Failure Mode

Invoice updated; payment status update fails → inconsistent pair (mitigated if same transaction rolls back).

### Business Impact

Subordinate to F-35-01; ordering hygiene for financial commands.

### Concurrency

**RELEVANT**

### Existing Protection

Transaction runner

### Test Coverage

**Missing**

### Severity

**P2**

### Recommendation

Bundle with F-35-01 decision lock — claim payment status first or use single atomic settlement primitive.

---

## Pagination Audit (Committed Application Services)

Systematic `git grep pageSize` on `src/modules/*/application/services/*.ts` at HEAD:

| File | pageSize | Relation | Used for | Cap safe? | Verdict |
| --- | --- | --- | --- | --- | --- |
| `generate-invoice-number.ts` | 500 | All invoices by number DESC | Sequence max | **No** | **F-35-03** |
| `generate-rental-invoice-from-order.service.ts` | 10 | Invoices per order | Active-invoice guard | **No** | **F-35-02** |
| All `list-*.service.ts` | various | Admin/API listing | UI pagination | **Yes** | Not a defect |
| Phase 34 `load-rental-order-returns.ts` | — | Completed dispatches | Return rollup | **Yes** (unbounded) | **Closed** |
| Phase 30 dispatch/RO services | — | SQL aggregate / EXISTS | Integrity | **Yes** | **Closed** |

**WIP-only (not OPEN at HEAD):** uncommitted `operational-journal-posting.service.ts` uses `findPaged({ pageSize: 5 })` for journal dedup — would be P2 if committed without fix; excluded from committed findings.

---

## Concurrency Audit Summary

| Area | Status @ HEAD | Notes |
| --- | --- | --- |
| Inventory on-hand / reserved | **Closed** | Atomic SQL in `create-stock-movement-in-scope.ts` |
| External rental ERA counters | **Closed** | Predicated deltas (Phase 29) |
| Complete return / dispatch | **Closed** | Claim before side effects |
| Reserve rental order | **Closed** | Phase 31/32 locks |
| Dispatch claimed quantity | **Closed** | Phase 30 SQL aggregate |
| Invoice dispatch rollup | **Closed** | Phase 34 |
| Maintenance / repair | **Closed** | Phase 33 claims at HEAD |
| **Payment / invoice settlement** | **OPEN** | **F-35-01** — no claim, absolute write |
| Invoice issue/void | **OPEN** | **F-35-06** — no claim |
| Convert missing→loss return writes | **P2 residual** | Return `updateStatus` without claim; dispatch load fixed |

---

## Status / Side-Effect Ordering Summary

| Workflow | Order @ HEAD | Verdict |
| --- | --- | --- |
| Complete return | Claim → inventory/ERA | **Compliant** |
| Complete dispatch | Claim → OUT/ERA | **Compliant** |
| Cancel external rental | Claim → audit | **Compliant** |
| Maintenance/repair stock commands | Claim → stock | **Compliant** |
| Issue invoice | Status write → notification | Order OK; **no atomic claim** (F-35-06) |
| Pay expense | Journal → status | **Inverted** (F-35-08) |
| Post payment | Invoice write → payment status | **Inverted** + absolute write (F-35-01/09) |

---

## Database Invariant Audit

| Invariant | DB enforced? | App-only? | Gap? |
| --- | --- | --- | --- |
| Global unique invoice number | **Yes** (`invoiceNumber @unique`) | — | Collision → error, not silent dup |
| One active invoice per rental order | **No** | Generate guard only | **Yes** — F-35-02/05 |
| Invoice paidAmount = f(payments) | **No** | Absolute write | **Yes** — F-35-01 |
| One active ERA per RO | **Yes** (partial unique migration) | Also app checks | Closed |
| Non-negative inventory | **Partial** | Atomic SQL in workflows | PATCH bypass F-35-07 |
| Payment posted uniqueness | **No claim** | Status enum | F-35-01 |

No schema changes recommended during audit — document for decision locks only.

---

## Test Coverage Audit (P0/P1/P2)

| Finding | Coverage |
| --- | --- |
| F-31-03 (closed) | **Existing** — T34.1/T34.2 |
| F-35-01 | **Missing** — concurrent post |
| F-35-02 | **Missing** — >10 invoices/order |
| F-35-03 | **Missing** — high volume / concurrent generate |
| F-35-04 | **Partial** — movement unit tests only |
| F-35-05 | **Missing** |
| F-35-06 | **Partial** |
| F-30-07 (closed) | **Partial** — maintenance tests exist; concurrency tests in Phase 33 report |
| Phase 30/31/32/34 closed paths | **Existing** — phase-specific tests |

---

## Authorization Audit (Spot Check)

Mutation services rely on **presentation-layer permission gates** (`PERMISSIONS.*` in API routes). Application services enforce business validation (customer match, balance checks) but **not** a second permission layer — consistent project pattern.

No concrete **cross-tenant IDOR** evidenced in spot review (single-company ERP model). Stock-movement create on WORKER role combined with F-35-04 is a **policy** concern, not missing auth check.

**Severity:** no new P0/P1 authorization finding — F-35-04 remains P2 policy.

---

## External Rental / Return / Dispatch (Regression Scan)

Spot review against Phase 25.5 / 25.11 / 28 / 29 / 30 locks — **no new P0/P1 regressions** identified at HEAD:

- ERA `findActiveByRentalOrderId` — unbounded, used on dispatch/return paths
- RO cancellation cascade — uses claim + ERA cancel path
- Mixed return source × condition — Phase 28 locked; no new pagination defect found on complete-return
- Dispatch claimed quantity — Phase 30 aggregate unchanged

---

## Priority Ranking (Post-Phase-34)

| Rank | ID | Title | Severity |
| --- | --- | --- | --- |
| 1 | **F-35-01** | Payment invoice settlement read-then-write | **P1** |
| 2 | **F-35-02** + **F-35-05** | Active invoice guard + create bypass | **P2** |
| 3 | **F-35-03** | Invoice number pageSize 500 | **P2** |
| 4 | **F-35-04** | Stock-movement API RESERVE/RELEASE bypass | **P2** |
| 5 | **F-35-06** | Issue/void invoice TOCTOU | **P2** |
| 6 | **F-35-07** | Inventory PATCH counter bypass | **P2** |
| 7 | **F-35-08** / **F-35-09** | Expense/payment side-effect ordering | **P2** |

---

## Decision Lock Recommendation

```text
GO TO PHASE 35 DECISION LOCK
```

**Recommended primary scope:** **F-35-01 — Payment Invoice Settlement Concurrency Integrity**

Rationale:

1. **P1 data-corruption class** — concurrent payment posts can silently corrupt invoice `paidAmount` / `balance`.
2. Natural extension of Phase 29 `claimStatusTransition` pattern already proven across return, dispatch, ERA, maintenance.
3. Distinct from Phase 34 (dispatch rollup) — avoids bundling unrelated invoice pagination fixes.
4. F-33-01/02/05 remain valid **follow-on Phase 36** (invoice integrity cluster) unless stakeholder explicitly bundles.

**Alternate acceptable scope:** Invoice active-record integrity (**F-35-02 + F-35-05**) if business priority favors billing guardrails over payment concurrency — audit ranks payment settlement higher on corruption severity.

---

## Explicit Non-Actions (This Audit)

- No production code changes
- No schema / migration changes
- No test additions
- No commit / push
- Unrelated WIP preserved
- WIP findings (`findActiveByRentalOrderId` on invoice repo, operational journal dedup) documented but **not** treated as committed defects

---

## References

- `docs/decisions/INVOICE_DISPATCH_ROLLUP_INTEGRITY_34.md`
- `docs/reports/PHASE_34_IMPLEMENTATION_REPORT.md`
- `docs/audits/PHASE_33_ENTERPRISE_GAP_AUDIT.md`
- `docs/audits/PHASE_34_ENTERPRISE_GAP_AUDIT.md`
- `docs/decisions/CONCURRENT_SAFE_COMMAND_IDEMPOTENCY_29.md`
- `docs/decisions/MAINTENANCE_REPAIR_CLAIM_BEFORE_SIDE_EFFECTS_33.md`
