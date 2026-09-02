# Phase 50 Implementation Report — F-33-01 Invoice Number Monotonic Allocation

## Executive Verdict

**PHASE 50 COMPLETE — F-33-01 CLOSED**

Invoice number allocation no longer depends on a bounded global paged scan. Allocation uses an authoritative prefix-scoped `MAX(sequence)` query with bounded retry on invoice-number conflicts during generate-from-order.

---

## Baseline

| Item | Value |
|------|-------|
| Branch | `main` |
| Before HEAD | `41c27b3` — `fix(rental-invoice): harden derived status transition` |
| Final HEAD | _(see Git section after commit)_ |
| Working tree | WIP preserved (~153 unrelated modified/untracked files unchanged by this commit) |
| WIP count | ~155 total lines in `git status --short` (includes 2 new Phase 50 untracked files pre-commit) |

---

## Finding — F-33-01 Root Cause

**Previous behavior:** `generateNextInvoiceNumber` called `repository.findPaged({ page: 1, pageSize: 500, sortBy: "invoiceNumber", sortOrder: "desc" })` and computed the max numeric suffix in memory for the target year prefix.

**Failure modes confirmed:**

1. **Global scan window:** When ≥500 invoices from other prefixes (e.g. `INV-2027-*`) sort ahead of the target prefix in lexicographic descending order, the true max for `INV-2026-*` can fall outside the 500-row window → allocator returns `001` while `550` already exists → unique constraint / conflict on commit.
2. **Unbounded population:** Same-prefix populations beyond the scan cap could omit the true max even without cross-prefix crowding (if sort/page semantics exclude high sequences).
3. **String sort vs numeric order:** Lexicographic invoice-number sort diverges from numeric sequence order once suffix width varies (e.g. `999` vs `1000`).

**Existing safety net:** `@unique` on `invoiceNumber` prevents duplicate committed numbers but does not prevent allocation failures/retries under contention.

---

## Numbering Contract (verified)

| Property | Contract |
|----------|----------|
| Format | `INV-{YYYY}-{NNN}` (3-digit zero-padded sequence) |
| Scope | Calendar year from reference date (single-tenant, global uniqueness) |
| Algorithm | **Max committed sequence for prefix + 1** (not gap-filling) |
| Monotonicity | New numbers strictly increase within year prefix among committed invoices |
| Contiguity | **Not required** — gaps allowed |
| VOID / cancelled | VOID invoices remain in DB and count toward max sequence |
| Entry point | `GenerateRentalInvoiceFromOrderService` via `generateNextInvoiceNumber` |
| Direct create | Manual `invoiceNumber` on `CreateRentalInvoiceService` (unchanged) |

---

## Implementation

### Files changed (Phase 50 only)

| File | Change |
|------|--------|
| `domain/rental-invoice-number.rules.ts` | **NEW** — prefix build, sequence parse, format helpers |
| `domain/rental-invoice.repository.interface.ts` | Added `findMaxSequenceForInvoicePrefix(prefix)` |
| `application/services/generate-invoice-number.ts` | Replaced paged scan with authoritative max query |
| `infrastructure/repositories/prisma-rental-invoice.repository.ts` | PostgreSQL `MAX(CAST(SUBSTRING(...) AS INTEGER))` filtered by prefix + numeric suffix regex |
| `tests/helpers/in-memory-rental-invoice.repository.ts` | In-memory max query + synchronous invoice-number index for concurrency tests |
| `application/services/generate-rental-invoice-from-order.service.ts` | Bounded retry (5 attempts) on invoice-number `ConflictError` |
| `application/rental-invoice.number-allocation.50.application.test.ts` | **NEW** — T50.1–T50.7 |

### Algorithm

```
prefix = INV-{year}-
maxSeq = repository.findMaxSequenceForInvoicePrefix(prefix)
candidate = format(prefix, maxSeq + 1)
```

### Concurrency mechanism

- **Allocation read:** Prefix-scoped `MAX` is atomic at SQL level (single aggregate query).
- **Create path:** Existing `@unique` on `invoiceNumber` + pre-insert duplicate check in `createRentalInvoiceInWriteScope`.
- **Retry:** `GenerateRentalInvoiceFromOrderService` retries up to 5 times when create returns `ConflictError` with message `"Invoice number already exists"`, re-querying max each attempt.
- **Transaction boundary:** Allocation and create remain within the same UoW transaction (`runWithRepositoryUnitOfWork`); failed attempts retry before commit.

### Why the 500-row weakness is eliminated

The allocator no longer paginates or sorts invoice rows. It queries the true numeric maximum for the exact prefix, independent of total table size or cross-prefix lexicographic ordering.

---

## Schema

```
Schema changes: NONE
Migrations: NONE
```

---

## Test Matrix

| Test | Result |
|------|--------|
| T50.1 — Normal allocation | PASS |
| T50.2 — Boundary beyond legacy 500-row scan | PASS |
| T50.3 — Large invoice population (1000) | PASS |
| T50.4 — Existing gaps (max+1, no gap fill) | PASS |
| T50.5 — Concurrent allocation with retry | PASS |
| T50.6 — Transaction rollback | PASS |
| T50.7 — Year prefix scope | PASS |

---

## Regression

| Suite | Result |
|-------|--------|
| Phase 50 focused (`rental-invoice.number-allocation.50.application.test.ts`) | 9/9 PASS |
| Full vitest (`npm test`, test env vars) | **3195/3195 PASS** (+9 vs Phase 49 baseline 3186) |
| Phase 49 / 48 / invoice / payment suites | Included in full run — 0 regressions |

---

## Static Validation

| Check | Result |
|-------|--------|
| `npx prisma validate` | PASS |
| ESLint (Phase 50 files) | PASS |
| `npm run typecheck` | FAIL — pre-existing unrelated WIP errors (payment/repair/return/rental-order WIP); **no Phase 50 file errors** |

---

## WIP Preservation

Unrelated WIP (~153 files) was not staged, reset, stashed, or reformatted. Only Phase 50 files listed above were modified/added for this phase.

---

## Git

| Item | Value |
|------|-------|
| Commit hash | _(filled after commit)_ |
| Commit message | `fix(invoice): harden invoice number allocation` |
| Push status | **NO** (not pushed) |

---

## Remaining Enterprise Queue

| ID | Priority | Status |
|----|----------|--------|
| F-33-03 | P2 | Decision lock required |
| N-44-05 | P2 | Decision lock required |
| N-48-01 | P2 | Decision lock required |
| F-35-08 | Deferred | Unchanged |
| P3 findings | P3 | Unchanged |

## Recommended Next Step

Run a post-Phase-50 enterprise gap audit to confirm F-33-01 closure and prioritize the next decision-locked item (F-33-03, N-44-05, or N-48-01).
