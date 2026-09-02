# Post-Phase-51 Enterprise Gap Audit

**Audit date:** 2026-09-02  
**Scope:** Committed production baseline at `eeb0c6f` — ~156 WIP entries excluded from audit target  
**Method:** Independent Phase 51 closure verification, closed-finding regression review, open/deferred deep audit, enterprise gap discovery, targeted + full regression execution

---

## Executive Verdict

**AUDIT COMPLETE — F-33-03 CLOSED — NEXT PHASE IDENTIFIED**

| Severity | Count |
|----------|------:|
| **P0** | **0** |
| **P1** | **0** |
| **P2** | **2** |
| **P3** | **6** |
| **DEFERRED** | **1** |
| **DOC** | **1** |

Phase 51 closed **F-33-03** per DL-51-01 Option C. No P0/P1 launch blockers at HEAD. Engineering concurrency hardening through Phases 35–51 remains intact on committed code.

**Recommended next step:** **Phase 52 — N-44-05** (block invoice void when POSTED payments exist; DL-51-02 locked and implementation-ready).

**Launch blockers (P0/P1):** **None**

---

## Baseline

| Item | Value |
|------|-------|
| **HEAD** | `eeb0c6f746d6eed8e9b751450764d4f6c7d2b473` (`eeb0c6f`) |
| **Phase 51 commit** | `eeb0c6f` — `fix(stock-movement): restrict public post to adjustments` |
| **Phase 51 decision lock** | `1aa422b` — `docs(decision): lock phase-51 enterprise policies` |
| **Phase 50** | `c5292a9` — `fix(invoice): harden invoice number allocation` |
| **Previous audit** | `fb9db8f` — Post-Phase-50 enterprise gap audit |
| **Branch** | `main` |
| **WIP entries** | **156** (`git status --short` count) |
| **Push** | NO |
| **Audit target** | `git show HEAD:` committed tree |

**Recent history:**

```text
eeb0c6f fix(stock-movement): restrict public post to adjustments
1aa422b docs(decision): lock phase-51 enterprise policies
fb9db8f docs(audit): complete post-phase-50 enterprise gap audit
c5292a9 fix(invoice): harden invoice number allocation
```

---

## Scope

This audit verified:

- F-33-03 closure against DL-51-01 Option C (code + tests)
- Public API authorization boundary for `POST /api/stock-movements`
- Internal workflow boundary (`executeCreateStockMovementInScope` unchanged)
- Authorization bypass search (alternate public stock-movement paths)
- Phase 43 inventory PATCH ledger integrity regression
- Phase 29 stock-movement / inventory concurrency regression
- Previously closed findings (Phases 29–50)
- Open P2 queue (N-44-05, N-48-01) — unchanged, not implemented
- Deferred F-35-08 state
- P3 queue and documentation integrity (Phase 51 report hash)
- Phase 52 implementation readiness (audit-only)

---

## F-33-03 Closure Verification

### Status: **CLOSED @ `eeb0c6f`** — independently verified

### Public POST policy (code-evidence)

**Route chain @ HEAD:**

```text
POST /api/stock-movements (src/app/api/stock-movements/route.ts)
  → handleCreateStockMovement
  → runStockMovementApiRoute (auth + stockMovements.create)
  → assertPublicStockMovementCreateAllowed  ← Phase 51 boundary
  → CreateStockMovementService.execute
  → executeCreateStockMovementInScope
```

**Policy module** — `public-stock-movement-create.policy.ts`:

| Movement type | Behavior |
|---------------|----------|
| **ADJUSTMENT** | `assertAll(stockMovements.create, inventory.adjust)` |
| **IN / OUT / RESERVE / RELEASE** | `UnprocessableError` (422) before service invocation |

**Rejection before persistence:** Non-ADJUSTMENT types throw in the route handler before `createStockMovement.execute`. ADJUSTMENT permission failures throw `ForbiddenError` (403) before service invocation. Tests verify zero movement rows created on rejection (T51.4–T51.7 API boundary tests).

### Explicit proof matrix

| Case | Authorization | Result | Evidence |
|------|---------------|--------|----------|
| **Public ADJUSTMENT** | `stockMovements.create` + `inventory.adjust` (WORKER) | **Allow** | T51.1 policy unit; API POST test creates movement |
| **Public ADJUSTMENT** | `stockMovements.create` only (ACCOUNTANT — no create) | **403** | T51.3 |
| **Public ADJUSTMENT** | `inventory.adjust` only (VIEWER — neither) | **403** | T51.2/T51.3 |
| **Public IN** | WORKER (full stock perms) | **422, no row** | T51.4 |
| **Public OUT** | WORKER | **422, no row** | T51.5 |
| **Public RESERVE** | WORKER | **422, no row** | T51.6 |
| **Public RELEASE** | WORKER | **422, no row** | T51.7 |
| **Internal IN** | Workflow scope | **Works** | T51.8 — `executeCreateStockMovementInScope` |
| **Internal OUT** | Workflow scope | **Works** | T51.9 |
| **Internal RESERVE** | Workflow scope | **Works** | T51.10 |
| **Internal RELEASE** | Workflow scope | **Works** | T51.11 |

### Internal workflow preservation

`executeCreateStockMovementInScope` (`create-stock-movement-in-scope.ts`) contains **no** public POST policy. Legitimate callers remain:

| Type | Representative callers |
|------|------------------------|
| IN | `receive-purchase-order`, `complete-return`, `complete-repair`, `complete-maintenance`, `cancel-maintenance` |
| OUT | `complete-dispatch`, `start-maintenance` |
| RESERVE | `reserve-rental-order` |
| RELEASE | `cancel-rental-order`, `complete-dispatch`, `complete-return` |

`CreateStockMovementService` is unrestricted — appropriate for in-process workflow simulation; only HTTP POST applies the Phase 51 policy.

### Authorization bypass audit

| Path | Public? | Policy applied? |
|------|:-------:|:---------------:|
| `POST /api/stock-movements` | Yes | **Yes** |
| `GET /api/stock-movements` | Yes | N/A (read-only) |
| `GET /api/stock-movements/:id` | Yes | N/A |
| Workflow services → `executeCreateStockMovementInScope` | No (in-process) | Correctly exempt |
| Direct `CreateStockMovementService` in tests | No | Correctly exempt |

**No alternate public HTTP route** creates stock movements. Bypass of F-33-03 via generic public POST is **closed**.

---

## Phase 43 Regression — CONFORMS

| Check | Status | Evidence |
|-------|:------:|----------|
| `UpdateInventorySchema` metadata-only | **PASS** | `.strict()` schema excludes `quantityOnHand` / `reservedQuantity` |
| PATCH API rejects counters | **PASS** | `inventory.api.test.ts` T43 API tests |
| ADJUSTMENT correction path | **PASS** | T43.5, T43.6 in `inventory.patch-ledger-integrity.43.application.test.ts` |
| RESERVE workflow unchanged | **PASS** | T43.9 via `CreateStockMovementService` (internal path) |

Phase 51 did **not** reopen Phase 43. Generic inventory PATCH cannot mutate authoritative counters.

---

## Phase 29 Regression — CONFORMS

| Finding | Status | Evidence |
|---------|:------:|----------|
| **F-03** inventory atomic SQL | **CLOSED** | `prisma-inventory.repository.ts` predicate UPDATEs; `stock-movement.application.test.ts` (33 tests) |
| **F-04** dispatch OUT workflow | **CLOSED** | `complete-dispatch.service.ts` → in-scope OUT; dispatch hardening tests in full suite |
| **F-05** over-dispatch | **CLOSED** | Dispatch claims unchanged; no public OUT bypass |
| **F-06** reserve TOCTOU | **CLOSED** | F-02 reserve serialization intact; public RESERVE rejected |

Targeted stock-movement application suite: **33/33 PASS**.

---

## Findings Table

| ID | Severity | Finding | Status | Evidence | Recommended next action |
|----|----------|---------|--------|----------|-------------------------|
| **F-33-03** | P2 | Public POST accepted all movement types without workflow guards | **CLOSED** | `public-stock-movement-create.policy.ts`; route handler; T51.1–T51.11 | None — closed Phase 51 |
| **N-44-05** | P2 | Invoice void allowed with live POSTED payments → settlement dead-end | **OPEN** | `VoidRentalInvoiceService` — no payment lookup; domain allows `PARTIALLY_PAID → VOID` | **Phase 52** per DL-51-02 |
| **N-48-01** | P2 | Direct `POST /api/external-rentals` lacks F-02 locks/shortfall | **OPEN** | `CreateExternalRentalService` vs `SourceRentalOrderExternallyService` | **Phase 53** per DL-51-03 |
| **F-35-08** | DEFERRED | Expense accounting hook is NoOp @ HEAD | **DEFERRED** | `create-expense-transaction.runner.ts` → `NoOpExpenseAccountingHook` | Re-audit on WIP merge |
| **N-51-01** | P3 | Invoice retry ignores P2002 generic ConflictError | **OPEN** | `isInvoiceNumberConflict` message filter | Optional hardening |
| **F-37-R2** | P3 | Invoice number sequence gaps | **OPEN** | Phase 50 design | Acceptable v1.0 |
| **F-11** | P3 | Broad WORKER mutation permissions | **OPEN** (mitigated) | F-33-03 closes primary stock-movement bypass | Monitor; partial DL-51-01 mitigation |
| **F-09** | P3 | Repair `returnInspectionItemId` no FK | **OPEN** | Schema hygiene | v1.1+ |
| **F-07** | P3 | Ghost `DISPATCHED` RO enum | **OPEN** | Enum confusion only | Cleanup |
| **N-39-UI-01** | P3 | Active invoice UI list cap | **OPEN** | UI only | Polish |
| **N-51-DOC-01** | DOC | Phase 51 report references pre-amend hash `f289520`; actual commit `eeb0c6f` | **OPEN** | `git show eeb0c6f:docs/audits/PHASE_51_IMPLEMENTATION_REPORT.md` | Optional doc-only fix |

---

## P0 / P1 Summary

```text
P0: 0
P1: 0
```

**No launch-blocking P0/P1 findings identified.**

---

## P2 Queue

### 1. N-44-05 — Block void when POSTED payments exist

| Field | Detail |
|-------|--------|
| **Root cause** | `VoidRentalInvoiceService` performs status claim only; no payment repository lookup |
| **Affected workflow** | `POST /api/rental-invoices/:id/void` |
| **Business invariant** | Invoice with live POSTED customer payments must not be voided until payments voided |
| **Severity rationale** | Settlement dead-end; operator cannot reverse payments on VOID invoice |
| **Decision lock** | **DL-51-02 LOCKED** — Option 1 |
| **Recommended phase** | **Phase 52** |
| **Schema/migration** | **NONE expected** — use `IPaymentRepository.findPaged` with `rentalInvoiceId` + status filter |

### 2. N-48-01 — Direct ERA creation F-02 parity

| Field | Detail |
|-------|--------|
| **Root cause** | `CreateExternalRentalService` → `executeCreateExternalRentalInScope` without availability locks |
| **Affected workflow** | `POST /api/external-rentals` |
| **Business invariant** | External hire qty cannot exceed F-02 shortfall at commit |
| **Severity rationale** | MANAGER+ can over-commit external sourcing vs owned gap |
| **Decision lock** | **DL-51-03 LOCKED** — Option A |
| **Recommended phase** | **Phase 53** |
| **Schema/migration** | **NONE expected** — shared gate extraction |

---

## P3 Queue

| ID | Summary | Status |
|----|---------|--------|
| N-51-01 | Invoice P2002 retry message gap | OPEN |
| F-37-R2 | Invoice sequence gaps | OPEN |
| F-11 | Broad WORKER permissions (mitigated by F-33-03) | OPEN |
| F-09 | Repair FK hygiene | OPEN |
| F-07 | Ghost DISPATCHED enum | OPEN |
| N-39-UI-01 | Invoice UI list cap | OPEN |
| N-51-DOC-01 | Phase 51 report commit hash mismatch | OPEN (documentation) |

---

## Decision-Lock Status

```text
DL-51-01 — F-33-03: LOCKED + IMPLEMENTED @ eeb0c6f
DL-51-02 — N-44-05: LOCKED + PENDING IMPLEMENTATION
DL-51-03 — N-48-01: LOCKED + PENDING IMPLEMENTATION
```

---

## Previously Closed Findings — Regression Matrix

| Finding | Status | Regression? |
|---------|--------|:-----------:|
| F-33-01 | **CLOSED** | No |
| F-33-03 | **CLOSED** (this audit) | N/A |
| F-37-R1 | **CLOSED** | No |
| F-35-01 | **CLOSED** | No |
| F-35-06 | **CLOSED** | No |
| F-36-03 | **CLOSED** | No |
| F-31-03 | **CLOSED** | No |
| F-31-05 | **CLOSED** | No |
| N-40-01 | **CLOSED** | No |
| N-42-01 | **CLOSED** | No |
| N-46-02 | **CLOSED** | No |
| Phase 43 PATCH | **CONFORMS** | No |
| Phase 45 return capacity | **CLOSED** | No |
| F-04 / F-05 dispatch | **CLOSED** | No |

**No previously closed finding reopened.**

---

## Deferred Finding

### F-35-08 — Expense Accounting Hook

| Field | @ HEAD (`eeb0c6f`) |
|-------|-------------------|
| Wired hook | `NoOpExpenseAccountingHook` |
| Real hook | Present in WIP only (`ExpenseAccountingHook` in WIP runner) |
| Status | **DEFERRED** — unchanged from Post-Phase-50 audit |

---

## Phase 52 Readiness Check (N-44-05)

| Prerequisite | Status |
|--------------|--------|
| Invoice lifecycle (DRAFT/ISSUED/PARTIALLY_PAID/VOID) | **Present** |
| Payment POSTED state | **Present** |
| Void invoice endpoint/service | **Present** — `VoidRentalInvoiceService` |
| Void payment path (operator prerequisite) | **Present** — `VoidPaymentService` |
| Current defect reproducible from code | **Yes** — no POSTED payment guard in void service |
| DL-51-02 sufficient | **Yes** |
| Schema/migration required | **No** — payment query by invoice + status |
| Additional decision needed | **None** |

**Phase 52 is implementation-ready.**

---

## Concurrency / Integrity Rescan (Summary)

Focused search for read→calculate→write patterns and direct API mutation paths found **no new P0/P1/P2** beyond the known queue. Authoritative counter mutations remain in atomic SQL (`prisma-inventory.repository.ts`, payment `applyPaymentDelta`). Status transitions on dispatch/return/payment continue to use claim-before-effects patterns from Phases 29–49.

---

## Final Test Matrix

| Suite | Command / files | Result |
|-------|-----------------|--------|
| **Phase 51** | `stock-movement.public-post-policy.51.application.test.ts` | **19/19 PASS** |
| **Phase 43 regression** | `inventory.patch-ledger-integrity.43.application.test.ts` | **13/13 PASS** |
| **Phase 29 regression** | `stock-movement.application.test.ts` | **33/33 PASS** |
| **Targeted combined** | Phase 51 + API + 43 + 29 | **76/76 PASS** |
| **Previous hardening** | Phase 35/38/45/48/50 concurrency files | **37/37 PASS** |
| **Full suite** | `npm test` | **3215/3215 PASS** |

---

## Static Gate Matrix

| Check | Result | Notes |
|-------|--------|-------|
| **Prisma validate** | **PASS** | `npx prisma validate` |
| **ESLint** (Phase 51 files) | **PASS** | Policy + route + test files |
| **Typecheck** | **FAIL** | Pre-existing unrelated WIP errors (features/, payment WIP scopes, etc.); Phase 51 runtime tests pass; no Phase 51 application logic type errors in committed route/policy |
| **git diff --check** | **PASS** | Pre-commit audit report only |

---

## Repository Integrity

| Check | Result |
|-------|--------|
| Application code modified by audit | **NO** |
| Schema modified | **NO** |
| Migrations modified | **NO** |
| Unrelated WIP preserved | **YES** (~156 entries) |
| Unexpected files changed | **NO** (audit report only) |

---

## Git

| Item | Value |
|------|-------|
| Audit commit | _(filled after commit)_ |
| Message | `docs(audit): complete post-phase-51 enterprise gap audit` |
| Push | NO |

---

## Next Phase

```text
NEXT: Phase 52 — N-44-05
```

**Reason:** F-33-03 closed. N-44-05 is the next locked P2 with a complete decision lock (DL-51-02), no schema requirement, and verified implementation readiness. N-48-01 follows as Phase 53.

**Do not implement Phase 52/53 in the audit session.**
