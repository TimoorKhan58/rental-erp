# Phase 37 — Rental Invoice Active-Guard & Generation Integrity

**Document:** Rental Invoice Active-Guard & Generation Integrity v1.0  
**Status:** PROPOSED — READY FOR IMPLEMENTATION  
**Date:** 2026-08-27  
**Baseline HEAD:** `bd8b2201edff441c0022114e379ba19852a645e3` (`feat(payment): harden invoice settlement concurrency`)  
**Parent audit:** `docs/audits/PHASE_37_ENTERPRISE_GAP_AUDIT.md`  
**Parent phases:** Phase 29 (`CONCURRENT_SAFE_COMMAND_IDEMPOTENCY_29.md`), Phase 32 (`RENTAL_ORDER_RESERVE_COMMAND_INTEGRITY_32.md`), Phase 34 (`INVOICE_DISPATCH_ROLLUP_INTEGRITY_34.md`), Phase 35 (`PAYMENT_INVOICE_SETTLEMENT_CONCURRENCY_35.md`), Phase 36 (`CANCEL_MAINTENANCE_REVERSAL_INTEGRITY_36.md`)

---

## §1 Executive Decision

**PROPOSED — READY FOR IMPLEMENTATION**

Phase 37 closes **F-36-02**, **F-33-02**, and **F-35-05** by enforcing **at most one non-VOID rental invoice per rental order** on **every invoice creation path**, inside **one atomic transaction** per command, using:

1. **`lockForInvoiceCommand(rentalOrderId)`** — PostgreSQL `SELECT id FROM rental_orders WHERE id = $1 FOR UPDATE` (Phase 32 reserve-lock family).
2. **Authoritative `findActiveByRentalOrderId(rentalOrderId)`** — SQL `findFirst` with `status <> 'VOID'` (no pagination cap).
3. **Fused generate-from-order transaction** — guard, line build, invoice-number allocation, lock, active check, create, and audit in **one** `runWithRepositoryUnitOfWork` (eliminate split TX).

**No schema / migration change.** Application-level `findActive` + `create` without parent-row lock is **insufficient** under READ COMMITTED; parent-row `FOR UPDATE` is the locked serialization primitive (Phase 32 precedent).

**F-33-01** (invoice number `pageSize: 500`) is **explicitly deferred** — different invariant, out of active-guard scope.

---

## §2 Scope

### In scope

| Finding | Summary |
| --- | --- |
| **F-36-02** | Split-transaction TOCTOU on generate-from-order |
| **F-33-02** | Active guard capped at `pageSize: 10` |
| **F-35-05** | Direct create bypasses active-invoice guard |

### Production files (expected)

| # | File | Change |
| --- | --- | --- |
| 1 | `generate-rental-invoice-from-order.service.ts` | Fuse single UoW; replace capped guard; lock + create inline |
| 2 | `create-rental-invoice.service.ts` | Add lock + `findActiveByRentalOrderId` guard |
| 3 | `rental-invoice-transaction.runner.ts` | Extend write scope with `rentalOrderRepository` (or equivalent lock port) |
| 4 | `create-rental-invoice-transaction.runner.ts` | Wire rental order repository into scope |
| 5 | `rental-order.repository.interface.ts` | Add `lockForInvoiceCommand` |
| 6 | `prisma-rental-order.repository.ts` | Raw SQL `FOR UPDATE` |
| 7 | `in-memory-rental-order.repository.ts` | Test mutex (mirror Phase 32) |
| 8 | `rental-invoice.repository.interface.ts` | Add/wire `findActiveByRentalOrderId` (present in WIP; absent @ `bd8b220`) |
| 9 | `prisma-rental-invoice.repository.ts` | Implement `findActiveByRentalOrderId` if not already in implementation branch |
| 10 | `in-memory-rental-invoice.repository.ts` | Test double for `findActiveByRentalOrderId` |
| 11 | Optional shared helper | e.g. `assert-no-active-rental-invoice.ts` — only if it reduces duplication without over-abstraction |

### Tests (new)

Recommended: `src/modules/rental-invoice/application/rental-invoice.active-guard.37.application.test.ts` (T37.1–T37.x).

### Out of scope

- F-33-01 invoice number sequence cap
- F-35-06 issue/void unconditional status update
- F-35-08 pay-expense journal ordering
- F-36-03 pending payment over-commitment
- Partial unique index migration (rejected alternative — §26)
- UI list pagination (`rental-order-billing-section.tsx` `pageSize: 10`) — display only, not authoritative guard

---

## §3 Problem Statement

The rental billing workflow must guarantee **at most one active (non-VOID) invoice per rental order** under concurrent API requests. Committed HEAD (`bd8b220`) violates this in three ways:

1. **Split transaction (F-36-02):** `GenerateRentalInvoiceFromOrderService` runs active guard + line build in UoW A, then calls `CreateRentalInvoiceService.execute` in UoW B. Two concurrent generates can both pass the guard before either creates.
2. **Capped existence query (F-33-02):** Active detection uses `findPaged({ pageSize: 10 })` + in-memory `status !== "VOID"` filter. When an order has more than ten invoices and the sole active invoice sorts outside the first page, the guard returns false negative.
3. **Bypass path (F-35-05):** `CreateRentalInvoiceService` validates invoice-number uniqueness and rental-order/customer alignment but never checks for an existing active invoice on the order.

These are **P2 business-integrity** defects on a high-frequency workflow (normal billing), not cosmetic UX issues.

---

## §4 Repository Evidence

### Baseline verified (2026-08-27)

| Attribute | Value |
| --- | --- |
| Branch | `main` |
| **Committed HEAD** | `bd8b2201edff441c0022114e379ba19852a645e3` |
| Ahead of `origin/main` | **2** commits (Phase 34 + Phase 35) |
| WIP files | **~148** modified/untracked (Phase 36 + unrelated UI/payment WIP) |
| Phase 36 | Implemented in WIP, **not** on HEAD |

### F-36-02 — Split transaction

```typescript
// generate-rental-invoice-from-order.service.ts
const createInput = await runWithRepositoryUnitOfWork(this.deps, async (context) => {
  // ... sync, eligibility, capped active guard (L74–93), build lines, generateNextInvoiceNumber ...
  return { invoiceNumber, rentalOrderId, customerId, items, ... };
}); // ← TX A commits here

return this.createRentalInvoiceService.execute({ ...createInput }); // ← TX B
```

### F-33-02 — Capped guard

```typescript
// generate-rental-invoice-from-order.service.ts L74–83
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

Default list sort is `createdAt` (not invoiceNumber). With `sortOrder: "desc"`, the first page is the ten **most recently created** invoices. An older non-VOID invoice outside that page is invisible to the guard.

### F-35-05 — Direct create bypass

```typescript
// create-rental-invoice.service.ts — checks findByInvoiceNumber only (L92–101); no per-order active guard
const invoice = await rentalInvoiceRepository.create(createData);
```

### Repository @ committed HEAD

`IRentalInvoiceRepository` @ `bd8b220` has **no** `findActiveByRentalOrderId` (`git show bd8b220:...repository.interface.ts`).

**Working-tree WIP** adds `findActiveByRentalOrderId` to interface + Prisma + in-memory repos but **does not wire** generate or create services (generate still uses `findPaged(10)`).

### Schema @ `bd8b220`

```prisma
model RentalInvoice {
  invoiceNumber String @unique
  rentalOrderId String @db.Uuid
  status        RentalInvoiceStatus @default(DRAFT)
  @@index([rentalOrderId])
  // NO partial unique index for one-active-per-order
}
```

Contrast: external rental agreements use PostgreSQL partial unique index for one active ERA per order (`schema.prisma` L564–565 comment; Phase 25.10 migration family).

### Existing active semantics (authoritative — not invented)

| Source | Rule |
| --- | --- |
| `generate-rental-invoice-from-order.service.ts` L81–82 | Active iff `status !== "VOID"` |
| `rental-order-billing-section.tsx` L41 | UI: `invoices.find(i => i.status !== "VOID")` |
| WIP `findActiveByRentalOrderId` | Prisma: `status: { not: "VOID" }` |

### Invoice creation paths (production)

| Path | Entry | Creates row? |
| --- | --- | --- |
| **Direct create** | `POST /api/rental-invoices` → `CreateRentalInvoiceService` | **Yes** |
| **Generate from order** | `POST /api/rental-invoices/generate` → `GenerateRentalInvoiceFromOrderService` → (today) `CreateRentalInvoiceService` | **Yes** |
| Issue / void / update / convert-missing-to-loss | Mutate existing invoice | **No** |
| Payment post/void | Mutates invoice money via `applyPaymentDelta` | **No** |

No other production code path calls `rentalInvoiceRepository.create`.

### External-rental precedent (same invariant shape)

`CreateExternalRentalService` uses `findActiveByRentalOrderId` inside one transaction; DB partial unique index enforces one active ERA per order. Rental invoice has **app guard only** (generate, capped) + **no DB constraint** + **split TX** on generate.

---

## §5 F-36-02 Resolution

### Exact race (proven)

Two concurrent `GenerateRentalInvoiceFromOrderService.execute` calls for the same `rentalOrderId`:

| Step | Request A | Request B |
| --- | --- | --- |
| 1 | UoW A: `findPaged(10)` → no active | |
| 2 | | UoW A: `findPaged(10)` → no active |
| 3 | UoW A: build lines, allocate number, **commit** | |
| 4 | | UoW A: build lines, allocate number, **commit** |
| 5 | UoW B (`CreateRentalInvoiceService`): **create DRAFT** | |
| 6 | | UoW B: **create DRAFT** |

**Result:** Two non-VOID invoices on one order. The race exists because the guard and the insert are not in the same atomic boundary, and UoW A commits before UoW B begins.

Cross-path race (generate + direct create) is identical: both can pass guards in separate transactions before either inserts.

### Locked fix

1. **Eliminate split transaction:** Entire generate command — sync, eligibility, returns rollup, line build, number generation, **lock**, **active guard**, **create**, **audit** — MUST run inside **one** `runWithRepositoryUnitOfWork` (or one `IRentalInvoiceTransactionRunner.run` extended to include generate dependencies).
2. **Do not** call `CreateRentalInvoiceService.execute` as a nested second transaction from generate. Extract shared create logic (domain validation, `RentalInvoice.create`, repository `create`, audit mapping) callable from both services **within the caller's transaction scope**, or extend the transaction runner scope so generate and direct create share one code path.
3. Apply **lock + active guard** immediately before `create` (after line build and number allocation are complete).

---

## §6 F-33-02 Resolution

### Pagination problem

`findPaged({ pageSize: 10 })` is a **list API** primitive misused as an **existence / uniqueness guard**. It is authoritative only when the matching row appears in the first page. Counterexample: eleven invoices on one order — ten VOID (recent) + one ISSUED (oldest) — guard sees only VOID rows → false "no active invoice".

Filtering `status !== "VOID"` in application memory **does not fix** pagination truncation.

### Locked replacement

Replace capped `findPaged` + in-memory filter with:

```typescript
const activeInvoice = await rentalInvoiceRepository.findActiveByRentalOrderId(rentalOrderId);
```

Repository contract (locked):

```typescript
/** First non-VOID invoice for the order, if any. */
findActiveByRentalOrderId(rentalOrderId: RentalOrderId): Promise<RentalInvoice | null>;
```

Prisma implementation (locked semantics):

```typescript
db.rentalInvoice.findFirst({
  where: { rentalOrderId, status: { not: "VOID" } },
  orderBy: { createdAt: "desc" },
});
```

**No `take` / page cap.** One row maximum is expected under the business invariant; if data corruption produces multiple non-VOID rows, `findFirst` returns one and implementation SHOULD still block creation (invariant violation signal).

Remove duplicate guard logic from generate once create path owns the authoritative check (generate may retain a fast-fail before expensive line build **only if** it uses the same `findActiveByRentalOrderId` inside the same fused transaction after lock — prefer single check after lock immediately before insert).

---

## §7 F-35-05 Resolution

### Creation paths and enforcement

| Path | Today | Phase 37 |
| --- | --- | --- |
| `POST /api/rental-invoices` | No active guard | **Lock + `findActiveByRentalOrderId` + ConflictError** in `CreateRentalInvoiceService` |
| `POST /api/rental-invoices/generate` | Capped guard in TX A; no guard in TX B | **Same lock + guard + create in fused TX** |
| Tests / seeds | Direct repository seed | Out of scope (test helpers) |

**Enforcement level: B + D application layer**

- **B:** Every invoice **creation command** (`CreateRentalInvoiceService` and fused generate path) MUST run lock + active guard.
- **D:** Parent-row `FOR UPDATE` provides database-level **serialization** without a partial unique index (see §12, §21).

Direct create and generate MUST NOT diverge: both acquire `lockForInvoiceCommand(rentalOrderId)` then `findActiveByRentalOrderId` then insert.

Authorization unchanged: both routes require `PERMISSIONS.rentalInvoices.create`.

---

## §8 Active Invoice Status Definition

**Locked invariant:** At most **one** invoice with `status <> 'VOID'` per `rentalOrderId`. Multiple **VOID** historical invoices are permitted. Voiding frees the order for a new active invoice.

There is **no** `CANCELLED` invoice status; void is the terminal cancellation path (`VoidRentalInvoiceService` → `withVoided()` → `status: "VOID"`).

### Status matrix

| Status | Active? | Why |
| --- | --- | --- |
| **DRAFT** | **Yes** | Non-VOID; blocks new invoice (generate guard, UI billing section) |
| **ISSUED** | **Yes** | Non-VOID; billable document exists |
| **PARTIALLY_PAID** | **Yes** | Non-VOID; settlement in progress (Phase 35 `applyPaymentDelta`) |
| **PAID** | **Yes** | Non-VOID; closed financially but still a non-VOID document per existing code/UI |
| **VOID** | **No** | Explicitly excluded everywhere; historical only |

**Policy source:** Existing code — **not** a new business rule. PAID blocking re-invoice is preserved as today (`status !== "VOID"`).

---

## §9 Invoice Creation Paths

| # | Service | HTTP | Transaction | Active guard (HEAD) | Active guard (Phase 37) | Lock | Invoice # | Audit |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `CreateRentalInvoiceService` | `POST /api/rental-invoices` | Single `transactionRunner.run` | **None** | **`findActiveByRentalOrderId`** | **`lockForInvoiceCommand`** | Client or pre-supplied | CREATE |
| 2 | `GenerateRentalInvoiceFromOrderService` | `POST /api/rental-invoices/generate` | **Split** (HEAD) | Capped `findPaged(10)` in TX A only | **Fused TX** + same guard | **`lockForInvoiceCommand`** | `generateNextInvoiceNumber` in same TX | CREATE |
| 3 | — | — | — | — | — | — | — | — |

**Non-creation paths (unchanged):** `IssueRentalInvoiceService`, `VoidRentalInvoiceService`, `UpdateRentalInvoiceService`, `ConvertMissingToLossService`, payment settlement (`applyPaymentDelta`).

---

## §10 Concurrency Model

- **Isolation:** PostgreSQL default **READ COMMITTED** (project standard via Prisma).
- **Defect class:** Check-then-act (find active → create) and split-transaction TOCTOU.
- **Read committed behavior:** Two transactions can both observe "no active invoice" if neither has committed an insert and neither holds a conflicting lock.
- **Proof application-only guard is insufficient:**

```
T1: BEGIN
T2: BEGIN
T1: SELECT findActive → null
T2: SELECT findActive → null
T1: INSERT invoice (DRAFT)
T2: INSERT invoice (DRAFT)
T1: COMMIT
T2: COMMIT   → two non-VOID rows (no unique constraint on rentalOrderId+active)
```

- **Required additional mechanism:** Serialize invoice creation per `rentalOrderId` via **`lockForInvoiceCommand`** (`FOR UPDATE` on parent `rental_orders` row) before `findActive` + `create` in the **same** transaction.

Under lock serialization:

```
T1: BEGIN → LOCK RO → findActive null → create → COMMIT
T2: BEGIN → LOCK RO (blocks until T1 commits) → findActive found → ConflictError → ROLLBACK
```

---

## §11 Active-Guard Mechanism

**Locked sequence (both creation paths, inside one transaction):**

```
1. BEGIN (runWithRepositoryUnitOfWork / transactionRunner.run)
2. Validate user / parse input / domain invariants (as today)
3. Validate rental order + customer (as today)
4. lockForInvoiceCommand(rentalOrderId)
5. active ← findActiveByRentalOrderId(rentalOrderId)
6. IF active ≠ null → throw ConflictError (409)
7. Check invoiceNumber uniqueness (findByInvoiceNumber) — as today
8. rentalInvoiceRepository.create(...)
9. auditLogger.log(CREATE)
10. COMMIT
```

**Generate path additional steps (before step 4):** sync rental order status from returns, eligibility assert, load returns (Phase 34 unbounded rollup), build lines, `generateNextInvoiceNumber` — all **before** lock is acceptable; lock MUST immediately precede active check + create. Recommended: lock at step 4 after all read-only preparation to minimize hold time while guaranteeing atomic check+insert.

**Repository method `findActiveByRentalOrderId`:** mandatory; replaces all pagination-based active detection in creation workflows.

---

## §12 Database Constraint Decision

| Option | Verdict |
| --- | --- |
| **A. Application EXISTS / findActive only** | **REJECTED** — not concurrency-safe under READ COMMITTED (§10) |
| **B. PostgreSQL partial unique index** `(rental_order_id) WHERE status <> 'VOID'` | **VALID but REJECTED for Phase 37** — see §26; ERA precedent exists but migration not required when FOR UPDATE suffices |
| **C. Parent `rental_orders` row `FOR UPDATE`** | **SELECTED** — Phase 32 `lockForReserveCommand` family |
| **D. Redis / advisory locks / SERIALIZABLE** | **REJECTED** — violates architecture safety (§28) |

**Phase 37 database constraint:** **None new.** Serialization via existing `rental_orders` row lock.

If partial unique index is added in a future phase, map Prisma `P2002` to `ConflictError` as belt-and-suspenders; not required for Phase 37 correctness.

---

## §13 Transaction Boundary

| Operation | Boundary (Phase 37) |
| --- | --- |
| **Direct create** | Single `IRentalInvoiceTransactionRunner.run`: lock → guard → number check → create → audit |
| **Generate from order** | **Single** `runWithRepositoryUnitOfWork` (or extended runner): sync → eligibility → returns → lines → number → lock → guard → create → audit |
| **Invoice number generation** | **Inside** the same transaction as create (generate path). Direct create receives client-supplied number — uniqueness check stays in same TX. |
| **Audit log** | **Inside** same TX (existing create pattern); failure rolls back insert |
| **Notifications** | None on create today — unchanged |

**Forbidden:** Commit between active guard and `create`. **Forbidden:** Nested `CreateRentalInvoiceService.execute` opening a second transaction from generate.

---

## §14 Locking / Serialization

### New repository method

```typescript
// IRentalOrderRepository
lockForInvoiceCommand(id: RentalOrderId): Promise<void>;
```

### Production implementation

Mirror `lockForReserveCommand` / `lockForDispatchClaim`:

```sql
SELECT id FROM "rental_orders" WHERE id = $1 FOR UPDATE
```

File: `prisma-rental-order.repository.ts` (same raw SQL pattern as L472–483).

### In-memory tests

Add `invoice-command-lock.ts` (mirror `reserve-command-lock.ts` + `AsyncLocalStorage`) and wire `InMemoryRentalOrderRepository.lockForInvoiceCommand`.

### Lock granularity

- **Per `rentalOrderId`** — concurrent creates for **different** orders do not block each other.
- **Same order** — generate∥generate, create∥create, generate∥create all serialize on the parent row.

---

## §15 Invoice Number Generation

**Finding F-33-01:** `generateNextInvoiceNumber` uses `findPaged({ pageSize: 500, sortBy: "invoiceNumber", sortOrder: "desc" })` to scan max sequence for `INV-{year}-` prefix.

| Aspect | Assessment |
| --- | --- |
| True integrity bug? | **Yes** when >500 invoices share prefix in sort window — can propose duplicate number |
| Mitigation today | `invoiceNumber @unique` → second insert fails (not silent corruption) |
| Phase 37 scope? | **NO — deferred** |
| Reason | Separate invariant (global sequence vs per-order active uniqueness); fix is unbounded max query or number-sequence table — not required to close F-36-02/F-33-02/F-35-05 |

**Phase 37 requirement:** Invoice number generation for generate path remains **inside fused transaction** (avoid orphan number consumption across TX boundaries). No change to numbering algorithm in Phase 37.

---

## §16 Duplicate / Concurrent Create Semantics

| Scenario | Expected outcome |
| --- | --- |
| Two concurrent **generate** same order | Exactly **one** non-VOID invoice; other request **`ConflictError` (409)** |
| Two concurrent **direct create** same order | Same |
| **Generate** ∥ **direct create** same order | Same |
| Second create while **DRAFT/ISSUED/PAID** active exists | **409** with details `{ invoiceId, invoiceNumber }` (preserve generate message shape) |
| Create after **void** only active was voided | **Success** — new DRAFT |
| Multiple **VOID** invoices + create | **Success** — VOID rows ignored |
| Duplicate **invoiceNumber** (global) | **409** — existing `ConflictError` ("Invoice number already exists") |
| Invalid / non-completed rental order | **422** `UnprocessableError` (generate) / validation errors (direct create rules) |
| Rental order not found | **404** `NotFoundError` |

---

## §17 Error Semantics

Preserve MT-ERP conventions (Phase 29 / generate existing messages):

| Condition | Error class | HTTP |
| --- | --- | --- |
| Active invoice exists (including after lock) | `ConflictError` | **409** |
| Message | `"An active invoice already exists for this rental order"` | |
| Details | `{ invoiceId, invoiceNumber }` | |
| Duplicate invoice number | `ConflictError` | **409** |
| Rental order not completed (generate) | `UnprocessableError` | **422** |
| Domain / validation failures | `UnprocessableError` / `ValidationError` | **422** / **400** |
| Missing auth context on create | `UnauthorizedError` | **401** |
| Rental order not found | `NotFoundError` | **404** |

**No new stable error codes.** Do not use `ConcurrentUpdateError` for this workflow — `ConflictError` is already established on generate active guard.

Future partial unique index violation (`P2002`): map to same **409** `ConflictError` if ever added.

---

## §18 API Contract

**No API contract change.**

| Aspect | Phase 37 |
| --- | --- |
| Request bodies | Unchanged (`CreateRentalInvoiceSchema`, `GenerateRentalInvoiceFromOrderSchema`) |
| Response bodies | Unchanged (`RentalInvoiceDto`) |
| Endpoints / methods | Unchanged |
| Success status | Unchanged (200) |
| Error codes | **409** for duplicate active — already returned by generate; now also direct create |
| Validation schemas | Unchanged |
| Permissions | Unchanged (`rentalInvoices.create`) |

Clients that relied on direct create to bypass active guard will receive **409** — correct enforcement, not a breaking contract change (undocumented bypass closure).

---

## §19 Rollback / Atomicity

- All steps through audit MUST share one transaction.
- **`create` failure** → full rollback; no partial invoice row.
- **`auditLogger.log` failure** → rollback including insert (existing create test pattern with `ThrowingAuditLogger`).
- **ConflictError after lock** → rollback; no row inserted.
- **Lock acquisition** on missing rental order → `NotFoundError` or repository error before create (match `lockForReserveCommand` behavior).

Generate path: expensive read-only work (returns rollup) rolled back on late failure — acceptable; correctness dominates.

---

## §20 Existing Phase Invariants

Phase 37 MUST NOT weaken:

| Phase | Invariant |
| --- | --- |
| **28** | Mixed return source × condition attribution |
| **29** | Claim-before-side-effects on workflow commands; inventory atomic SQL |
| **30** | Completed-dispatch rollup; SQL claimed-quantity aggregates |
| **31** | Availability serialization; inventory `FOR UPDATE` |
| **32** | Reserve command RO lock + post-lock re-fetch |
| **33** | Maintenance/repair claim before stock |
| **34** | Unbounded `loadReturnsForRentalOrder` for invoice rollups — **do not reintroduce caps** |
| **35** | Payment claim + `applyPaymentDelta` atomic settlement |
| **36** | Cancel maintenance reversal via `claimed.startedAt !== null` |

Phase 37 is **additive** on invoice **create/generate** only. Issue, void, payment, convert-missing-to-loss unchanged (F-35-06 remains deferred).

---

## §21 Schema / Migration Decision

**NO SCHEMA CHANGE**

| Question | Answer |
| --- | --- |
| Migration required? | **No** |
| Partial unique index required for correctness? | **No** — `lockForInvoiceCommand` + fused TX sufficient under READ COMMITTED |
| Prisma schema edits? | **None** |
| Existing constraints used | `invoiceNumber @unique` (global); `rentalOrderId` index only (non-unique) |

**Future optional migration (out of Phase 37):**

```sql
CREATE UNIQUE INDEX rental_invoices_one_active_per_order
ON rental_invoices (rental_order_id)
WHERE status <> 'VOID';
```

Prisma limitation: partial uniques require raw SQL migration + schema comment (ERA pattern); not representable as standard `@@unique` without predicate.

---

## §22 Acceptance Tests

**Mandatory:** Genuine parallel execution — `Promise.allSettled([...])`. Sequential `await A(); await B();` is **NOT** concurrency proof.

| ID | Description | Parallelism | Expected |
| --- | --- | --- | --- |
| **T37.1** | Two concurrent **generate-from-order** same RO | `Promise.allSettled` | Exactly 1 non-VOID invoice; 1× **409** |
| **T37.2** | Two concurrent **direct create** same RO | `Promise.allSettled` | Exactly 1 non-VOID; 1× **409** |
| **T37.3** | **Generate** ∥ **direct create** same RO | `Promise.allSettled` | Exactly 1 non-VOID; 1× **409** |
| **T37.4** | **>10 invoices** on order: 10 recent VOID + 1 older ISSUED; attempt generate | Sequential | **409** before create (proves F-33-02 fix) |
| **T37.5** | Active **DRAFT** exists; second create | Sequential | **409** |
| **T37.6** | Void active invoice; new generate/create | Sequential | **Success**; new DRAFT |
| **T37.7** | Multiple VOID history; create new | Sequential | **Success** |
| **T37.8** | Audit failure on create | Sequential | Rollback — repository count 0 / no orphan |
| **T37.9** | Issue + payment on surviving invoice (T37.1 fixture) | Sequential | Phase 35 settlement unchanged |
| **T37.10** | Phase 28–36 regression suites | CI | All pass |

**Parallel tests (explicit):** T37.1, T37.2, T37.3.

Recommended harness: extend transaction test runner with real `lockForInvoiceCommand` on in-memory RO repo; seed completed rental order + customer fixtures (reuse Phase 34 generate test helpers).

---

## §23 Regression Requirements

Post-implementation MUST pass:

- All **T37.*** acceptance tests
- `rental-invoice.application.test.ts` (create/issue/void/update)
- `rental-invoice.dispatch-rollup.34.application.test.ts` (T34.1–T34.2)
- `payment-invoice-settlement-concurrency.35.application.test.ts` (T35.1–T35.6)
- Phase 36 maintenance tests (T36.1–T36.7) if run in full suite
- Full application test suite count should increase by ≥8 tests

---

## §24 Implementation Surface

### Ordered implementation checklist

1. Add `findActiveByRentalOrderId` to repository interface + Prisma + in-memory (reconcile WIP if present).
2. Add `lockForInvoiceCommand` to rental order repository + in-memory mutex helper.
3. Extend `RentalInvoiceWriteScope` with `rentalOrderRepository`.
4. Update `CreateRentalInvoiceService`: lock → findActive → existing validations → create.
5. Refactor `GenerateRentalInvoiceFromOrderService`: single UoW; inline create+audit; remove nested `createRentalInvoiceService.execute`.
6. Extract minimal shared create helper if needed to avoid duplicating domain validation + audit mapping.
7. Add `rental-invoice.active-guard.37.application.test.ts`.
8. Run regression suites (§23).

### MUST NOT

- Reintroduce `findPaged` caps on active guard
- Split generate guard and create across transactions
- Add Redis, advisory locks, or SERIALIZABLE isolation
- Bundle F-33-01 numbering fix without separate lock
- Modify issue/void/payment settlement (F-35-06 out of scope)

---

## §25 Deferred Findings

| ID | Summary | Reason deferred |
| --- | --- | --- |
| **F-33-01** | Invoice number `pageSize: 500` | Different invariant; not active-guard cluster |
| **F-33-03** | Direct stock-movements API bypass | Unrelated module |
| **F-35-06** | Issue/void unconditional status update | Separate workflow TOCTOU |
| **F-35-08** | Pay expense journal before status | Accounting ordering |
| **F-36-03** | Pending payment over-commitment @ HEAD | Payment create scope |
| **F-31-05** | Return receive/inspect TOCTOU | No stock side effects |
| **F-31-08** | Inventory PATCH absolute counters | Unrelated |
| **F-31-10** | Cancel dispatch TOCTOU | P3 |
| **F-11** | Authorization granularity | P3 |
| **F-09 / F-31-07** | Repair FK gap | P3 |
| **F-07 / F-31-09** | DISPATCHED enum ghost | P3 |

**Included in Phase 37:** F-36-02, F-33-02, F-35-05 only.

---

## §26 Rejected Alternatives

| Alternative | Verdict | Reason |
| --- | --- | --- |
| **Pagination guard increase** (e.g. `pageSize: 500`) | **REJECTED** | Still capped; wrong primitive for existence |
| **Application findActive without lock** | **REJECTED** | READ COMMITTED double-create race (§10) |
| **Partial unique index only, no lock** | **REJECTED for Phase 37** | Valid correctness; rejected to avoid migration + Prisma partial-index wiring in this phase; ERA precedent noted for future |
| **Partial unique index + lock** | **REJECTED for Phase 37** | Over-engineering when lock suffices |
| **Nested `CreateRentalInvoiceService.execute` from generate** | **REJECTED** | Perpetuates split TX unless runner nested — fragile |
| **Redis / distributed lock** | **REJECTED** | Architecture safety (§28) |
| **SERIALIZABLE isolation** | **REJECTED** | Project uses row locks |
| **Serialize via invoice table `FOR UPDATE`** | **REJECTED** | No row to lock on first create; parent RO lock is natural |
| **Bundle F-33-01 numbering fix** | **REJECTED** | Scope creep |
| **Change active definition** (e.g. exclude PAID) | **REJECTED** | Would invent new policy; code uses `!== VOID` |

---

## §27 Open Decisions

**OPEN DECISIONS: NONE**

All material decisions resolved:

- Active status set: **non-VOID** (§8)
- Concurrency: **`lockForInvoiceCommand` + fused TX** (§10–§14)
- Database constraint: **none** (§12, §21)
- F-33-01: **deferred** (§15, §25)
- API: **unchanged** (§18)
- Error mapping: **409 ConflictError** (§17)

---

## §28 Architecture Safety

Preserved stack:

- Next.js, TypeScript, Prisma, PostgreSQL, Better Auth
- Clean Architecture, DDD, Repository Pattern, Unit of Work, DI, Zod, REST

Phase 37 additions align with existing patterns:

- Raw SQL `FOR UPDATE` on parent entity (Phase 30 dispatch claim, Phase 31 inventory, Phase 32 reserve)
- Repository interface extension (Phase 34 `loadReturnsForRentalOrder`)
- Application service orchestration — no new frameworks

**Not introduced:** Redis locks, external distributed locks, new transaction framework, schema migration.

---

## §29 Validation Checklist

Post-implementation verification:

| # | Check |
| --- | --- |
| 1 | F-36-02 split TX eliminated |
| 2 | F-33-02 no `findPaged` on active guard |
| 3 | F-35-05 direct create guarded |
| 4 | `findActiveByRentalOrderId` wired on all create paths |
| 5 | `lockForInvoiceCommand` before guard+create |
| 6 | T37.1–T37.3 use `Promise.allSettled` |
| 7 | T37.4 proves >10 invoice false-negative fixed |
| 8 | Void frees order (T37.6) |
| 9 | Phase 34 rollup unbounded — unchanged |
| 10 | Phase 35 payment settlement — unchanged |
| 11 | No schema/migration files |
| 12 | No API schema changes |
| 13 | Error messages match §17 |

---

## §30 Final Decision / Implementation Readiness

| Attribute | Value |
| --- | --- |
| **Status** | **PROPOSED — READY FOR IMPLEMENTATION** |
| **Findings closed** | F-36-02, F-33-02, F-35-05 |
| **Schema change** | **NO** |
| **Migration** | **NO** |
| **API change** | **NO** |
| **Concurrency primitive** | `lockForInvoiceCommand` (`rental_orders` `FOR UPDATE`) |
| **Active definition** | `status <> 'VOID'` |
| **Transaction model** | Single UoW per create/generate command |
| **§27** | **OPEN DECISIONS: NONE** |

Implementation authorized per this lock after stakeholder review. Commit/push not authorized by this document alone.

---

**End of Phase 37 Decision Lock**
