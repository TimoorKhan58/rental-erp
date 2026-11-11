# Phase 38 — Rental Invoice Issue/Void Concurrency Integrity

**Document:** Invoice Issue/Void Concurrency Integrity v1.0

**Status:** PROPOSED — READY FOR IMPLEMENTATION

**Date:** 2026-08-29

**Baseline HEAD:** `2d61844c8fb0ba194b99531f1b0934c5e1713525` (`fix(maintenance): harden cancellation stock reversal`)

**Parent audit:** Post-F36-01 Enterprise Gap Audit (this session)
**Parent phases:** Phase 29 (`CONCURRENT_SAFE_COMMAND_IDEMPOTENCY_29.md`), Phase 35 (`PAYMENT_INVOICE_SETTLEMENT_CONCURRENCY_35.md`), Phase 37 (`RENTAL_INVOICE_ACTIVE_GUARD_GENERATION_INTEGRITY_37.md`)

---

## §1 Executive Decision

**PROPOSED — READY FOR IMPLEMENTATION**

Phase 38 closes **F-35-06** by replacing unconditional `rentalInvoiceRepository.updateStatus` writes in **Issue** and **Void** commands with **expected-status atomic claims** on the invoice row, using the established Phase 29 / Phase 35 `claimStatusTransition` pattern.

After a successful claim, side effects (audit, workflow notification on issue) MUST use the **post-claim** entity only.

**No schema / migration change** at this lock. **No journal/GL posting** at committed HEAD — issue/void journal WIP is **out of scope** (see §27 OPEN DECISIONS).

Phase 35 **does not** subsume this finding — it closed **F-35-01** (payment settlement atomicity) and explicitly deferred **F-35-06**.

---

## §2 Finding

**F-35-06 — Issue/Void rental invoice status TOCTOU**

| Attribute | Value |
| --- | --- |
| Severity | **P1** |
| Module | Rental Invoice / Payment interaction |
| Defect class | Stale read → domain validate → unconditional absolute status write |
| Committed call sites (HEAD `2d61844`) | `IssueRentalInvoiceService.execute`, `VoidRentalInvoiceService.execute` |
| Repository | `PrismaRentalInvoiceRepository.updateStatus` — plain `db.rentalInvoice.update({ where: { id } })` with **no** expected-status predicate |
| Audit reference | Post-F36-01 Enterprise Gap Audit |

**Not present @ HEAD:** `IRentalInvoiceRepository.claimStatusTransition` (grep: no matches under `rental-invoice/`).

---

## §3 Root Cause

Both commands follow:

```text
findById(existing)
  ↓
domain transition on snapshot (withIssued / withVoided)
  ↓
updateStatus(id, { status, issuedAt|voidedAt })   // unconditional write
  ↓
audit (+ notification on issue)
```

Under READ COMMITTED, another transaction may mutate invoice status or payment aggregates between `findById` and `updateStatus`. The write **always succeeds** if the row id exists, regardless of current DB status.

Phase 35 hardened **payment settlement** via `applyPaymentDelta` predicated SQL and payment `claimStatusTransition`, but **did not** add lifecycle claims for issue/void.

---

## §4 Impact

| Impact area | Effect |
| --- | --- |
| **Workflow integrity** | Concurrent Issue ∥ Void on DRAFT — last writer wins (ISSUED vs VOID) |
| **Duplicate commands** | Concurrent Issue ∥ Issue — both may emit audit/notification; status ends ISSUED |
| **Payment interaction** | Void after stale read may overwrite invoice to VOID while/post after payment delta applied (or race with post in flight) |
| **Financial consistency** | VOID invoice with non-zero `paidAmount` possible when void wins race after partial/full post (domain allows void from PARTIALLY_PAID — see §27) |
| **Irreversibility** | Incorrect VOID/ISSUED state requires manual correction |

This is a **lifecycle integrity** defect with realistic concurrent API use (issue + void + pay on same invoice).

---

## §5 Scope

### In scope

| Item | Detail |
| --- | --- |
| **F-35-06** | Issue + Void concurrency hardening only |
| `IssueRentalInvoiceService` | Atomic DRAFT → ISSUED claim before audit/notification |
| `VoidRentalInvoiceService` | Atomic claim to VOID from domain-allowed predecessors |
| `IRentalInvoiceRepository` | Add `claimStatusTransition` (mirror payment/maintenance repos) |
| `PrismaRentalInvoiceRepository` | Implement claim via `updateMany` + expected status predicate |
| In-memory test repository | Equivalent claim semantics |
| Tests | T38.1–T38.x genuine parallel tests (`Promise.allSettled`) |
| Error surface | Loser → `ConcurrentUpdateError` → HTTP 409 (Phase 29) |

### Out of scope

| ID | Topic |
| --- | --- |
| F-35-01 | Payment settlement — **CLOSED** Phase 35 |
| F-36-03 | Pending payment over-commitment at create |
| F-33-01 | Invoice number sequence cap |
| F-33-02 / F-35-05 | Active invoice guard — **CLOSED** Phase 37 |
| F-35-08 | Pay expense journal ordering |
| F-37-R1 | Post-`applyPaymentDelta` derived status via unconditional `updateStatus` |
| Issue/void **journal posting** | Exists only in uncommitted WIP — separate decision lock required before inclusion |
| Schema / migrations | None |
| UI / list filters | Unrelated WIP |

---

## §6 Domain Status Rules (Committed HEAD — Evidence)

Source: `rental-invoice.rules.ts`, `rental-invoice.entity.ts`, `payment.rules.ts`

| Rule function | Allowed / blocked |
| --- | --- |
| `assertCanIssue` | **DRAFT only** |
| `assertCanVoid` | Blocks **PAID**, **VOID**; allows **DRAFT**, **ISSUED**, **PARTIALLY_PAID** |
| `assertImmutablePaidInvoice` | Blocks void when **PAID** (redundant guard on PAID) |
| `assertInvoiceEligibleForPayment` | **ISSUED**, **PARTIALLY_PAID** only; rejects **VOID**, **DRAFT**, **PAID** |
| `applyPaymentDelta` (+) | SQL predicate: `status IN ('ISSUED', 'PARTIALLY_PAID', 'PAID')` |
| `applyPaymentDelta` (−) | SQL predicate: `status NOT IN ('DRAFT', 'VOID')` |

**Sequential domain tests confirm:** void from DRAFT (pre-issue), ISSUED, and PARTIALLY_PAID is domain-valid; void from PAID is rejected.

---

## §7 Status Transition Matrix (Sequential — Domain Intent)

Legend: **ALLOW** = domain accepts command in single-threaded flow; **REJECT** = domain throws `RentalInvoiceInvalidStatusError` / `PaymentEligibilityError`.

| Current status | ISSUE | VOID | CREATE PAYMENT (PENDING) | POST PAYMENT |
| --- | --- | --- | --- | --- |
| **DRAFT** | ALLOW | ALLOW | REJECT | REJECT |
| **ISSUED** | REJECT | ALLOW | ALLOW | ALLOW (if invoice still eligible) |
| **PARTIALLY_PAID** | REJECT | ALLOW | ALLOW | ALLOW |
| **PAID** | REJECT | REJECT | REJECT | REJECT (not in ELIGIBLE list) |
| **VOID** | REJECT | REJECT | REJECT | REJECT |

### Concurrent command matrix (defect — HEAD behavior)

| Current status @ claim time | Command A | Command B | HEAD risk |
| --- | --- | --- | --- |
| DRAFT | ISSUE | ISSUE | Both may write ISSUED; duplicate side effects |
| DRAFT | ISSUE | VOID | Last writer wins — incorrect lifecycle |
| DRAFT | VOID | ISSUE | Last writer wins — incorrect lifecycle |
| ISSUED | VOID | POST | Void may use stale read; unconditional VOID overwrites after payment delta |
| ISSUED | VOID | VOID | Duplicate audit; second write succeeds unconditionally |
| PARTIALLY_PAID | VOID | POST | Same class as ISSUED ∥ POST |
| VOID | * | * | Sequential reject; concurrent write still unconditional if domain check passed on stale read |

**Phase 38 goal:** Replace last-writer-wins unconditional writes with **exactly one successful claim** per valid transition attempt.

---

## §8 Concurrency Strategy (Locked)

Follow established MT-ERP patterns (Phase 29, 33, 35, 36, 37):

### 8.1 Atomic expected-status claim

Add to `IRentalInvoiceRepository`:

```typescript
claimStatusTransition(
  id: RentalInvoiceId,
  expected: RentalInvoiceStatus | readonly RentalInvoiceStatus[],
  data: UpdateRentalInvoiceStatusData,
): Promise<RentalInvoice | null>;
```

Implementation: Prisma `updateMany` with `where: { id, status: { in: expected } }` then `findUnique`, returning `null` when count = 0 (mirror `PrismaPaymentRepository.claimStatusTransition`).

### 8.2 Issue command

```text
findById
  ↓
domain validate (withIssued) — early reject only
  ↓
claimStatusTransition(id, "DRAFT", { status: "ISSUED", issuedAt })
  ↓ (null → ConcurrentUpdateError)
audit + notification using claimed entity
```

**Do not** call unconditional `updateStatus` on issue path after Phase 38.

### 8.3 Void command

```text
findById
  ↓
domain validate (withVoided) — early reject only
  ↓
claimStatusTransition(id, ["DRAFT", "ISSUED", "PARTIALLY_PAID"], { status: "VOID", voidedAt })
  ↓ (null → ConcurrentUpdateError)
audit using claimed entity
```

Expected-status set MUST match `assertCanVoid` / `withVoided` domain rules exactly — implementation MUST NOT broaden or narrow without domain rule change + explicit lock amendment.

### 8.4 Row lock

**Not required** for Phase 38 minimum if claim predicate is correct. Optional future: `SELECT id FROM rental_invoices WHERE id = $1 FOR UPDATE` before claim (Phase 37 precedent on parent row) — **deferred** unless testing proves claim-only insufficient.

### 8.5 Interaction with Phase 35 settlement

- `applyPaymentDelta` remains authoritative for money fields.
- Void claim MUST NOT rely on pre-claim `existing.status` for write predicate — use claim return value.
- Concurrent void loser (payment post wins) → void claim returns null → **409**.
- Concurrent post loser (void wins) → `applyPaymentDelta` returns null (status VOID) → **409** (existing Phase 35 behavior).

No change to `applyPaymentDelta` predicates in Phase 38 unless OPEN DECISIONS in §27 require void-from-PARTIALLY_PAID policy change.

---

## §9 Claim-Before-Side-Effects

| Command | Claim | Side effects after claim |
| --- | --- | --- |
| **Issue** | DRAFT → ISSUED | Audit, workflow notification |
| **Void** | allowed → VOID | Audit only @ HEAD |

Side effects MUST NOT run if claim fails.

All steps remain in existing `IRentalInvoiceTransactionRunner` UoW (single transaction).

---

## §10 Financial Invariants (Phase 38 enforcement scope)

Only invariants enforceable **without** new accounting policy:

| ID | Invariant |
| --- | --- |
| **I-38-01** | At most one successful DRAFT → ISSUED claim per invoice row |
| **I-38-02** | At most one successful transition to VOID from non-VOID per concurrent attempt pair; loser gets 409 |
| **I-38-03** | Issue/void commands MUST NOT use unconditional status write after Phase 38 |
| **I-38-04** | Post-claim entity is authoritative for audit payload and notification data |
| **I-38-05** | VOID invoice cannot receive `applyPaymentDelta(+)` (already enforced by Phase 35 SQL — preserve) |
| **I-38-06** | Sequential domain rules in §6 remain unchanged unless §27 OPEN DECISION resolved |

**Not locked here (require business decision):**

- Whether VOID is permitted when `paidAmount > 0` (domain currently allows PARTIALLY_PAID → VOID)
- Whether void must reverse posted payments automatically
- Journal posting on issue/void

---

## §11 Failure Semantics

| Outcome | Behavior |
| --- | --- |
| **Winner** | Claim succeeds; side effects commit; return DTO |
| **Loser (concurrent)** | `claimStatusTransition` returns null → `ConcurrentUpdateError` → HTTP **409** |
| **Domain invalid (sequential)** | `UnprocessableError` → HTTP **422** (unchanged) |
| **Not found** | HTTP **404** (unchanged) |
| **Rollback** | Failed audit/notification after claim MUST roll back entire UoW (existing runner behavior) |

Loser MUST leave **zero** partial side effects (no audit, no notification, no status change).

---

## §12 Testing Requirements

New file recommended: `rental-invoice.issue-void-concurrency.38.application.test.ts`

All concurrency cases MUST use genuine parallel execution (`Promise.allSettled` or equivalent).

| Test | Scenario | Assert |
| --- | --- | --- |
| **T38.1** | Issue ∥ Issue on DRAFT | Exactly one success; one 409; final status ISSUED; notification/audit count bounded |
| **T38.2** | Issue ∥ Void on DRAFT | Exactly one success; one 409; final status ISSUED **or** VOID (winner deterministic by claim) |
| **T38.3** | Void ∥ Void on ISSUED | One success; one 409; at most one VOID audit |
| **T38.4** | Void ∥ Post payment on ISSUED | One wins; loser 409; money/status consistent with winner |
| **T38.5** | Issue sequential reject on ISSUED | 422, no claim |
| **T38.6** | Void sequential reject on PAID | 422, no claim |
| **T38.7** | Rollback on issue notification/audit failure | Status remains DRAFT |

Regression: Phase 35 payment settlement tests, Phase 37 active-guard tests, rental-invoice application tests.

---

## §13 Compatibility With Previous Decision Locks

| Prior lock | Relationship |
| --- | --- |
| **Phase 29** | Adopts claim-before-write standard — **extends** to invoice lifecycle |
| **Phase 35** | Closed F-35-01 only; explicitly deferred F-35-06 — **no duplication** |
| **Phase 37** | Active guard independent — **no contradiction** |
| **Phase 36** | Maintenance cancel pattern (post-claim authority) — **analogous** |

---

## §14 Implementation Constraints

1. **No unconditional `updateStatus`** on issue/void paths after Phase 38.
2. **No schema change.**
3. **No bundling** F-36-03, F-33-01, journal WIP, or UI WIP.
4. **Preserve** audit action names (`APPROVE` on issue, `CANCEL` on void) and notification event keys.
5. In-memory repository MUST implement claim semantics for tests.
6. Do not modify unrelated WIP during implementation commit.

---

## §15 Validation Requirements (Pre-Commit)

| Gate | Requirement |
| --- | --- |
| T38.1–T38.7 | **PASS** |
| Phase 35 regression | **PASS** |
| Phase 37 regression | **PASS** |
| Rental-invoice module tests | **PASS** |
| Scoped ESLint / TS | **PASS** on touched files |
| Prisma validate | **PASS** (no schema change) |
| Staged diff | Issue/void claim only — no unrelated WIP |

Full suite: run if host memory permits; do not claim pass if OOM blocked.

---

## §16 Deferred Findings (Unchanged)

F-33-01, F-33-03, F-35-08, F-36-03, F-31-05, F-31-08, F-31-10, F-11, F-09, F-07, F-37-R1, F-37-R2 remain out of Phase 38 scope.

---

## §17 OPEN DECISIONS

The following require **business / owner confirmation** before implementation or as explicit documented policy in the same phase:

| ID | Question | Current code evidence | Default if unresolved |
| --- | --- | --- | --- |
| **OD-38-01** | Is **VOID from PARTIALLY_PAID** with `paidAmount > 0` intended production behavior? | Domain allows; no payment reversal in void service @ HEAD | **Implement claim only** — preserve domain rules; do not add payment reversal |
| **OD-38-02** | Is **VOID from DRAFT** (pre-issue) intended? | `rental-invoice.status.test.ts` expects allow | **Preserve** — claim from DRAFT included in void expected set |
| **OD-38-03** | Should Phase 38 bundle **journal posting on issue** from WIP? | Not @ HEAD; WIP adds accounting deps | **NO** — separate phase/decision lock |

If OD-38-01 resolves to "reject void when paidAmount > 0", domain rules (`assertCanVoid` / `withVoided`) MUST be amended in a **separate explicit lock amendment** — not assumed in Phase 38.

---

## §18 Recommended Phase Name

```text
Phase 38 — Rental Invoice Issue/Void Concurrency Integrity
```

**Objective:** Close F-35-06.

---

## §19 Sign-Off

| Field | Value |
| --- | --- |
| Status | **PROPOSED — READY FOR IMPLEMENTATION** |
| Open decisions | **3** (§17) — none block claim-based issue/void implementation |
| Schema impact | **NO** |
| Next action | Implement per §8–§12 after stakeholder review |
