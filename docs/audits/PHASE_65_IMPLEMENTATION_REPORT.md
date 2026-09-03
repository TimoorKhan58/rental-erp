# Phase 65 Implementation Report

## Executive Verdict

**PASS**

**F-35-08 CLOSED**

---

## Baseline

| Field         | Value      |
| ------------- | ---------- |
| Starting HEAD | `64139ac`  |
| Final HEAD    | `36db22b`  |
| Branch        | `main`     |
| Push          | NOT PUSHED |
| WIP before    | 149 entries |
| WIP after     | 149 entries + Phase 65 staged files only |

Full suite baseline: **3328/3328 PASS**

---

## Finding

**F-35-08 (P2):** Expense pay workflow invoked `ExpenseAccountingHook.onExpensePaid` before persisting the expense `PAID` status. With the real accounting hook wired (unmerged WIP), a journal could be created and then survive if subsequent expense persistence failed outside a shared rollback boundary — violating the financial invariant that committed journals must correspond to committed expense payment state.

---

## Existing WIP Assessment

| File / area | Classification | Phase 65 action |
| ----------- | -------------- | --------------- |
| `expense-accounting.hook.ts` | A — Required | Adopted with `JournalEntryId` return type |
| `operational-journal-posting.service.ts` | A — Required | Committed (expense journal posting) |
| `default-account-codes.constants.ts` | A — Required | Committed |
| `create-expense-transaction.runner.ts` | A — Required | Wired `ExpenseAccountingHook` via UoW repos |
| `pay-expense.service.ts` | A — Required | Reordered + journal link |
| `application/index.ts` export | A — Required | Export `ExpenseAccountingHook` |
| Financial-report WIP | C — Unrelated | **Not touched** |
| Payment/accounting WIP | C — Unrelated | **Not touched** |
| UI/dashboard WIP | C — Unrelated | **Not touched** |

WIP was audited, not blindly merged. Only F-35-08-required paths staged.

---

## F-35-08 Decision Lock

### Problem

Accounting side effects could precede authoritative expense payment persistence, risking orphan journals when persistence failed.

### Chosen policy

**Option A — Same DB transaction / Unit of Work**

Combined with **persist-first ordering** matching `PostPaymentService` (financial state before operational journal).

### Why

- `PayExpenseService` already runs inside `runWithRepositoryUnitOfWork` → `runWithTransactionScopedSharedDeps`.
- `createJournalEntryRepositoryFromUnitOfWork(context)` and `createExpenseRepositoryFromUnitOfWork(context)` share `context.tx`.
- Prisma transaction commit is all-or-nothing; any thrown error rolls back expense and journal writes together.
- Reordering to persist `PAID` before accounting aligns with established payment posting semantics and ensures the hook receives persisted paid state.

### Transaction boundary

```text
BEGIN (Prisma interactive transaction via runWithRepositoryUnitOfWork)
  authorize userId
  load expense
  validate → withPaid()
  updateStatus → PAID (paidAt, paidById)
  accountingHook.onExpensePaid(paid expense) → journal create + post
  updateStatus → link journalEntryId (when created)
  audit log
COMMIT
```

On any failure: **ROLLBACK** of expense + journal mutations.

### Failure semantics

| Scenario | Expense state | Journal |
| -------- | ------------- | ------- |
| Validation fails | Unchanged (APPROVED) | None |
| First `updateStatus` fails | Rolled back | None |
| Accounting fails | Rolled back (not PAID) | Rolled back |
| Journal link `updateStatus` fails | Rolled back | Rolled back |
| Success | PAID + journalEntryId | POSTED journal |

### Invariant

> No committed accounting journal may exist without its corresponding successfully committed expense payment state.

Idempotency: `postExpensePaidJournal` uses `findExistingOperationalJournal` (referenceType `OTHER`, referenceId = expenseId) to avoid duplicate non-VOID journals on retry.

---

## Implementation

### Files changed (Phase 65 only)

**Expense application**

- `src/modules/expense/application/services/pay-expense.service.ts` — persist PAID first, accounting second, link journal third
- `src/modules/expense/application/services/expense-accounting.hook.ts` — real hook + `NoOp`; returns `JournalEntryId | null`
- `src/modules/expense/application/index.ts` — export `ExpenseAccountingHook`
- `src/modules/expense/infrastructure/factories/create-expense-transaction.runner.ts` — wire hook with UoW account/journal repos

**Accounting (minimal for expense pay journal)**

- `src/modules/accounting/application/services/operational-journal-posting.service.ts`
- `src/modules/accounting/domain/default-account-codes.constants.ts`

**Tests**

- `src/modules/expense/application/expense.pay-accounting-atomicity.65.application.test.ts`
- `src/modules/expense/tests/helpers/*` (in-memory repo, fixtures, rollback runner, failing journal repo)

---

## Accounting Safety

- Journal: debit General Expense (`5000`), credit Cash (`1000`) for expense amount.
- Hook skipped when accounts inactive/missing (returns `null`; expense remains PAID without journal link — pre-existing soft-fail when chart not configured).
- Duplicate pay blocked by domain `assertCanPay` (APPROVED → PAID only once).
- Duplicate journal prevented by reference lookup before create.

---

## Concurrency

Production: single Prisma transaction serializes pay + journal for one request. Concurrent pays on same expense rely on DB transaction isolation; second attempt fails domain validation once first commits.

In-memory tests use rollback runner to simulate transaction atomicity (T65.2, T65.3, T65.7).

---

## Authorization

No changes to `ROLE_PERMISSIONS` or route permissions. T65.6 confirms WORKER lacks `expenses.pay`; ACCOUNTANT retains it.

---

## Tests

### Phase 65 focused (7 tests)

| Test | Description |
| ---- | ----------- |
| T65.1 | Successful pay → PAID + journal + journalEntryId |
| T65.2 | Journal link failure → rollback, no orphan journal |
| T65.3 | Accounting failure → expense stays APPROVED |
| T65.4 | Validation failure → no journal |
| T65.5 | Duplicate pay → one journal |
| T65.6 | Permission unchanged |
| T65.7 | First persistence failure → no journal |

### Full suite

```text
Total:   3335
Passed:  3335
Failed:  0
Skipped: 0
```

Delta: **+7** Phase 65 tests.

Regression: Phase 52/57/63 areas unchanged; full suite green.

---

## Static Validation

| Check | Result |
| ----- | ------ |
| Prisma validate | PASS |
| Full vitest | 3335/3335 PASS |
| TypeScript/ESLint (Phase 65 files) | Clean in test run |

Pre-existing unrelated WIP typecheck/ESLint failures remain outside Phase 65 scope.

---

## Schema / Migration

```text
No schema changes
No migrations
```

---

## WIP Preservation

Unrelated WIP (149 entries) not staged. No reset/stash/restore used.

---

## Commit

```text
36db22b fix(expense): make payment accounting atomic
```

## Push

NOT PUSHED

---

## Final Status

```text
F-35-08: CLOSED

P0: 0
P1: 0
P2: 0
P3: 0 (deferred queue unchanged)

Deferred: N-39-PATTERN-01 Batch 2, F-07, F-37-R2
Documentation: DOC-64-01

Next recommended target: N-39-PATTERN-01 Batch 2 — Expense dashboard summary (full first-page aggregation; now safe to address after F-35-08 closure)
```
