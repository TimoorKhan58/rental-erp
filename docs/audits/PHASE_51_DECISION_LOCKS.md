# Phase 51 Decision Locks

**Session date:** 2026-09-02  
**Purpose:** Formal business/engineering policy locks for remaining P2 findings before Phase 51 implementation  
**Baseline HEAD:** `fb9db8f` — `docs(audit): complete post-phase-50 enterprise gap audit`  
**Phase 50:** `c5292a9` — `fix(invoice): harden invoice number allocation`  
**WIP:** ~155 entries — untouched during this session  
**Application code changes:** NONE

---

## Baseline

| Item | Value |
|------|-------|
| Branch | `main` |
| HEAD | `fb9db8f` |
| Phase 50 | `c5292a9` |
| Post-Phase-50 audit | `fb9db8f` |
| Push | NO |

---

## DL-51-01 — F-33-03 Stock Movement API Policy

**Status:** **LOCKED** — approved 2026-09-02

### Problem

`POST /api/stock-movements` allows authenticated callers with `stockMovements.create` to submit any of the five movement types without workflow-specific guards (RO status, dispatch/return context, F-02 date-aware capacity, validated references). Atomic inventory SQL prevents impossible counter states, but workflow integrity and audit reconstructability can be bypassed.

### Current behavior @ HEAD (`fb9db8f`)

**Route chain:**

```text
POST /api/stock-movements
  → handleCreateStockMovement
  → assertPermission(stockMovements.create)
  → CreateStockMovementService
  → executeCreateStockMovementInScope
  → atomic inventory SQL + append-only ledger row + audit
```

**Movement types (Prisma + domain):** `IN`, `OUT`, `RESERVE`, `RELEASE`, `ADJUSTMENT`

**Authorization:**

| Role | `stockMovements.create` | `inventory.adjust` |
|------|:---------------------:|:------------------:|
| WORKER | Yes | Yes |
| MANAGER | Yes | Yes |
| OWNER | Yes | Yes |
| ACCOUNTANT | No | No |

**Schema:** `referenceType` / `referenceId` optional (max 100 chars, not validated against entities).

**Workflow owners (in-process, not HTTP):**

| Type | Authoritative workflow | Guards beyond atomic SQL |
|------|------------------------|--------------------------|
| RESERVE | `reserve-rental-order.service.ts` | F-02 locks, RO status, sorted inventory locks |
| RELEASE | cancel RO, complete dispatch, complete return | Status claims, qty caps |
| OUT | complete dispatch, start maintenance | Dispatch/maintenance claims |
| IN | complete return, receive PO, complete repair/maintenance, cancel maintenance | Workflow state |
| ADJUSTMENT | UI `adjustInventoryStock()` → POST stock-movements | UI gates on `inventory.adjust`; **API does not** |

**Phase 43 (F-31-08) @ HEAD:** `UpdateInventorySchema` is metadata-only — PATCH cannot mutate `quantityOnHand` / `reservedQuantity`. ADJUSTMENT via stock movement is the **intended manual correction path** (`inventory.service.ts`, `INVENTORY_PATCH_LEDGER_INTEGRITY_31_08.md`).

**Immutability:** Stock movements are append-only (no update/delete repository methods; GET-only HTTP by id).

**What direct POST cannot do:** Negative on-hand, over-release reserves, adjustment below reserved qty (atomic SQL).

**What direct POST can do:** RESERVE without F-02; OUT/IN without dispatch/return; fabricate or omit references; ADJUSTMENT without `inventory.adjust` check at API layer.

### Invariant tension

| Layer | Current invariant |
|-------|-------------------|
| Counter integrity | Atomic SQL — **holds** |
| Ledger authority | All counter changes should be traceable to business workflows or explicit manual correction |
| F-02 | Owned capacity commits only through serialized reserve/source paths |
| Phase 43 intent | Manual on-hand correction = ADJUSTMENT movement, not PATCH |

### Policy options (repository-supported)

| Option | Description | Repo support |
|--------|-------------|--------------|
| **A** | Remove/restrict public POST; workflows keep calling `executeCreateStockMovementInScope` in-process | All workflows already bypass HTTP |
| **B** | Allowlist safe types on POST (e.g. ADJUSTMENT only) | UI already uses ADJUSTMENT-only for manual adjust |
| **C** | ADJUSTMENT on POST requires `inventory.adjust`; IN/OUT/RESERVE/RELEASE workflow-only | Split permissions exist; Phase 43 UI pattern |
| **D** | Keep all five types on POST; document as privileged operational API | Current HEAD |

**Not supported @ HEAD:** Standalone "RECEIPT" type (receiving uses `IN` via PO receive workflow).

### Evaluation matrix

| Criterion | A | B/C (ADJ-only) | D |
|-----------|---|----------------|---|
| Inventory integrity | Strong | Strong | Strong (SQL) |
| Workflow integrity | Strongest | Strong | Weak |
| Authorization | Restrictive | Split permission | Broad WORKER+ |
| Auditability | Strong | Strong if refs encouraged | Weak |
| Backward compat | Breaks direct RESERVE/OUT/IN API use | Preserves adjust UX | Full |
| Operational usability | Workers use workflow commands | Adjust unchanged | Maximum flexibility |
| Architectural fit | Best — executor shared, HTTP narrowed | Aligns Phase 43 | Status quo |
| Implementation complexity | Medium | Low–medium | None |
| Bypass risk | Lowest | Low | Highest |

### Selected policy — LOCKED

**Option C — ADJUSTMENT-only direct POST, gated by `inventory.adjust`; IN/OUT/RESERVE/RELEASE forbidden on public POST (workflow commands only).**

Rationale: Matches Phase 43 locked intent (ledger-backed manual correction only). Preserves warehouse adjust UX. Closes F-02 bypass via direct RESERVE. Workflows unchanged (in-process executor).

### Lock record

```text
DL-51-01 — LOCKED

Finding:
F-33-03

Selected policy:
Option C — ADJUSTMENT-only public POST

Allowed direct movement types:
ADJUSTMENT only

Forbidden direct movement types:
IN, OUT, RESERVE, RELEASE

Required authorization:
POST /api/stock-movements with movementType=ADJUSTMENT
  → stockMovements.create AND inventory.adjust (both required)

Authoritative workflows (in-process executeCreateStockMovementInScope):
RESERVE → reserve-rental-order
RELEASE → cancel RO, complete dispatch, complete return
OUT → complete dispatch, start maintenance
IN → complete return, receive PO, repair/maintenance complete, cancel maintenance

Invariant:
Public HTTP may only create ADJUSTMENT movements for manual on-hand correction.
All other movement types require domain workflow commands.

Implementation constraints:
- Reject non-ADJUSTMENT types at API route or service boundary with 422/403
- Assert inventory.adjust when movementType=ADJUSTMENT
- Do not change executeCreateStockMovementInScope semantics for workflow callers
- Add/adjust API tests for type rejection and permission split
- Regression: Phase 43 inventory PATCH, stock-movement application tests

Schema change: NONE
Migration: NONE
```

---

## DL-51-02 — N-44-05 Void Partially Paid Invoice

**Status:** **LOCKED** — approved 2026-09-02

### Problem

`PARTIALLY_PAID → VOID` is domain-valid. `withVoided()` preserves `paidAmount` and `balance`. Live POSTED payments remain linked. After void, neither new payments nor payment reversal (`applyPaymentDelta` reverse) succeed on the VOID invoice — creating a settlement dead-end.

### Current behavior @ HEAD

**Void path:** `VoidRentalInvoiceService` → `withVoided()` → `claimStatusTransition` from `DRAFT|ISSUED|PARTIALLY_PAID` → status + `voidedAt` only. No payment lookup or cascade.

**Money fields:** `paidAmount` and `balance` are **stored** (not derived). Updated atomically via `applyPaymentDelta` SQL.

**Payment void path:** `VoidPaymentService` calls `applyPaymentToInvoice(..., "reverse")` **before** payment status claim — works when invoice is NOT VOID.

**After void of partially-paid invoice:**

| Field / entity | State |
|--------------|-------|
| Invoice status | VOID |
| paidAmount / balance | Unchanged |
| Payment rows | POSTED, unchanged |
| New payment on invoice | Rejected |
| Void existing payment | Fails (reverse delta SQL excludes VOID) |

**Reporting @ HEAD (`ANALYTICS_METRIC_CONTRACT_v1.0.md`):**

- Billed revenue / outstanding AR: VOID excluded
- Collected cash: POSTED payments counted by payment status (includes payments on void invoices)

**Prior decision:** OD-38-01 in `INVOICE_ISSUE_VOID_CONCURRENCY_35_06.md` — Phase 38 implemented claim only; **explicitly deferred** payment reversal on void.

**Accounting:** `NoOpExpenseAccountingHook` @ HEAD — no invoice journal posting; does not change void/payment semantics.

### Financial models (alternatives)

| Model | Description | Repo support |
|-------|-------------|--------------|
| **1 — Block void** | Reject void when POSTED (or pending) payments exist | No guard today; payment queries available |
| **2 — Cascade reverse** | Void auto-reverses POSTED payments | `VoidPaymentService` + `applyPaymentToInvoice(reverse)` exist; not wired from invoice void |
| **3 — Allow + document** | Payments independent; void cancels billing obligation only | Current behavior |
| **4 — Zero display fields** | Void clears invoice money fields | Domain would need amendment; payments orphaned |

### Evaluation matrix

| Criterion | 1 Block | 2 Cascade | 3 Document | 4 Zero fields |
|-----------|---------|-----------|------------|---------------|
| Financial correctness | Strong | Strongest | Ambiguous | Poor |
| Customer balance / AR | Clean | Clean | Divergent cash vs AR | Misleading |
| Reporting | Clean | Clean | Requires training | Inconsistent |
| Audit trail | Clear | Complex cascade | Manual recon | Orphaned payments |
| Operational usability | Requires void payments first | One-step void | Flexible | Confusing |
| Existing architecture | Minimal change | Reuse payment void path | None | Domain change |
| Implementation complexity | Low | Medium–high | None | Medium |
| Risk | Low | UoW coupling | Dead-end remains | Integrity loss |

### Selected policy — LOCKED

**Option 1 — Reject invoice void when any POSTED payment exists against the invoice.**

Operator workflow: void payments first (existing symmetric path), then void invoice.

Rationale: Avoids settlement dead-end; smallest change; aligns with operator mental model; amends OD-38-01 deferred policy.

### Lock record

```text
DL-51-02 — LOCKED

Finding:
N-44-05

Selected policy:
Option 1 — Block void when live POSTED payments exist

Allowed lifecycle transitions:
PARTIALLY_PAID → VOID only when no POSTED payments reference invoice
ISSUED → VOID when no POSTED payments
DRAFT → VOID (unchanged)

Forbidden lifecycle transitions:
Any → VOID when one or more POSTED payments reference the invoice

Payment treatment:
Unchanged — payments voided separately via VoidPaymentService

Balance treatment:
If void allowed, paidAmount/balance preserved (typical DRAFT/ISSUED zero-pay cases)

Reporting treatment:
No change to analytics contract

Reversal/refund requirement:
Operator must void payments before invoice void

Invariant:
An invoice with live POSTED customer payments cannot be voided until those payments are voided first.

Implementation constraints:
- Guard in VoidRentalInvoiceService with payment repository lookup
- UnprocessableError with clear message and payment ids in details
- UI: disable void or show warning when live payments exist
- Tests: void PARTIALLY_PAID with POSTED payment → reject; void after payment void → success
- Do not change claimStatusTransition concurrency semantics

Schema change: NONE
Migration: NONE
```

---

## DL-51-03 — N-48-01 Direct External Rental Creation

**Status:** **LOCKED** — approved 2026-09-02

### Problem

`POST /api/external-rentals` (`CreateExternalRentalService`) creates RO-linked ERAs without F-02 availability locks, reserve-command lock, authoritative reread, or shortfall gate. `SourceRentalOrderExternallyService` (Phase 48) applies full serialization.

### Current behavior @ HEAD

**Direct path:** `CreateExternalRentalService` → domain validate → `executeCreateExternalRentalInScope` — active-ERA uniqueness only.

**Source path:** `SourceRentalOrderExternallyService` → `lockForAvailabilityCommit` → `lockForReserveCommand` → authoritative reread → F-02 snapshot → `calculateExternalSourcingShortfall` → in-scope create.

**Schema:** `rentalOrderId` **required**; items require `rentalOrderItemId`. **No standalone ERA without RO** @ HEAD.

**Authorization:** `externalRentals.create` — MANAGER/OWNER (via `ALL_PERMISSIONS` / `MANAGER_PERMISSIONS`); **WORKER cannot create**.

**Locked sourcing design (`EXTERNAL_RENTAL_SOURCING_25.5.1.md`):**

- BD-3: External hire does not affect F-02 owned capacity
- BD-4: One active ERA per RO (MVP)
- F-02 applies to owned shortfall calculation for sourcing decisions

**Inventory:** ERA creation does not mutate `quantityOnHand` (by design — Phase 25.5 isolation).

**Risk:** MANAGER+ can create ERA quantity exceeding F-02 shortfall without serialization — over-commit external hire vs owned gap.

### ERA semantics @ HEAD

| Question | Answer |
|----------|--------|
| ERA without RO? | No — FK required |
| Linked to RO? | Always |
| Independent supplier hire? | Yes, but always in RO fulfillment context |
| F-02 consumption? | Shortfall gate on source path only |
| MANAGER override intentional? | Undocumented — no code comment or permission split |

### Policy options (repository-supported)

| Option | Description | Repo support |
|--------|-------------|--------------|
| **A — Full F-02 parity** | Direct create enforces same locks + shortfall as source-externally | Source service is reference implementation |
| **B — Independent direct ERA** | MANAGER direct create is explicit override, not shortfall-bound | Current behavior |
| **C — Conditional parity** | Independent vs RO-linked modes | **No independent mode @ HEAD** (RO always required) |
| **D — Deprecate direct create** | All creation via `POST /rental-orders/:id/external-rental` | UI has both entry points today |

### Evaluation matrix

| Criterion | A Parity | B Override | D Deprecate |
|-----------|----------|------------|-------------|
| External rental correctness | Strong | Operational risk | Strong |
| F-02 integrity | Strong | Bypass | Strong |
| Manager override | None unless re-added | Full | N/A |
| Operational flexibility | Two paths, same rules | Maximum | Single path |
| Architectural fit | Shared gate function | Status quo | Simplest API surface |
| Concurrency safety | Phase 48 locks | Gap | Phase 48 only path |
| Backward compat | Preserves `/external-rentals` route | Full | Removes/blocks direct route |
| Implementation complexity | Medium (extract shared gate) | None | Low–medium |

### Selected policy — LOCKED

**Option A — Full F-02 parity for all ERA creation paths when linked to a rental order** (always @ HEAD).

### Lock record

```text
DL-51-03 — LOCKED

Finding:
N-48-01

Selected policy:
Option A — Full F-02 parity on all ERA creation

Direct ERA semantics:
RO-linked only (schema requirement unchanged)
Direct POST must enforce same shortfall and serialization as source-externally

RO-linked ERA semantics:
All creation paths share: lockForAvailabilityCommit → lockForReserveCommand
  → authoritative reread → F-02 snapshot → shortfall gate → executeCreateExternalRentalInScope

F-02 applicability:
Required before any new active ERA quantity is committed for an RO line

Required locks:
inventoryRepository.lockForAvailabilityCommit (when inventory exists)
rentalOrderRepository.lockForReserveCommand

Authorization:
Unchanged — externalRentals.create (MANAGER+)

Invariant:
Committed external hire quantity for an RO line cannot exceed F-02 remaining shortfall
at commit time, regardless of HTTP entry point.

Implementation constraints:
- Shared shortfall gate callable from CreateExternalRentalService and SourceRentalOrderExternallyService
- Reject when remainingShortfallQuantity <= 0 or quantity > remaining
- Phase 48 concurrency tests remain passing; add direct-create parity tests
- UI /external-rentals/new continues to work with server-side gate

Schema change: NONE
Migration: NONE
```

---

## Explicit Approval Record

| Lock | Finding | Status | Approved by | Date | Selected option |
|------|---------|--------|-------------|------|-----------------|
| DL-51-01 | F-33-03 | **LOCKED** | Project owner (interactive session) | 2026-09-02 | **Option C** — ADJUSTMENT-only POST + `inventory.adjust` |
| DL-51-02 | N-44-05 | **LOCKED** | Project owner (interactive session) | 2026-09-02 | **Option 1** — Block void when POSTED payments exist |
| DL-51-03 | N-48-01 | **LOCKED** | Project owner (interactive session) | 2026-09-02 | **Option A** — Full F-02 parity on all ERA creation |

**All three decision locks approved.** Phase 51 implementation may proceed per locked specifications.

---

## Phase 51 Implementation Readiness

| Item | Status |
|------|--------|
| Decision locks complete | **YES** |
| Primary implementation phase | **Phase 51 — F-33-03** |
| Follow-on phases | Phase 52 — N-44-05; Phase 53 — N-48-01 (order per audit queue) |

### Required implementation scope (after DL-51-01 lock)

- Reject IN/OUT/RESERVE/RELEASE on `POST /api/stock-movements`
- Require `inventory.adjust` for ADJUSTMENT POST
- Preserve in-process workflow calls to `executeCreateStockMovementInScope`
- API + application tests; Phase 43/29 regression

### Schema / migration (all three locks)

```text
Schema changes: NONE (as proposed)
Migrations: NONE (as proposed)
```

---

## WIP Preservation

- ~155 WIP entries unchanged
- No application code modified in this session
- This document only

---

## Next Step

1. ~~User approves DL-51-01, DL-51-02, DL-51-03~~ — **DONE**
2. ~~Update Explicit Approval Record~~ — **DONE**
3. Commit decision lock document
4. Begin **Phase 51 — F-33-03 implementation** (next session — not in this phase)
