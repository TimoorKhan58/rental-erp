# Post-Phase-52 Enterprise Gap Audit

**Audit date:** 2026-09-02  
**Scope:** Committed production baseline at `1596a64` — ~151 WIP entries excluded from audit target  
**Method:** Independent Phase 52 closure verification, closed-finding regression review, open/deferred deep audit, enterprise gap discovery, targeted + full regression execution

---

## 1. Executive Verdict

**AUDIT COMPLETE — N-44-05 CLOSED — PHASE 53 IDENTIFIED**

| Severity | Count |
|----------|------:|
| **P0** | **0** |
| **P1** | **0** |
| **P2** | **1** |
| **P3** | **6** |
| **DEFERRED** | **1** |
| **DOC** | **1** |

Phase 52 closed **N-44-05** per DL-51-02. No P0/P1 launch blockers at HEAD. Phases 35–52 hardening remains intact on committed code.

**Recommended next step:** **Phase 53 — N-48-01** (direct ERA creation F-02 parity; DL-51-03 Option A locked and implementation-ready).

**Launch blockers (P0/P1):** **None**

---

## 2. Baseline

| Item | Value |
|------|-------|
| **Branch** | `main` |
| **HEAD** | `1596a64b880c09f98e23778b90a1c013a119d501` (`1596a64`) |
| **Phase 52 commit** | `fix(rental-invoice): block void with posted payments` |
| **Phase 51** | `eeb0c6f` |
| **Post-Phase-51 audit** | `454ee6d` |
| **Decision locks** | `1aa422b` |
| **WIP entries** | **151** (`git status --short` count) |
| **Push** | NO |
| **Audit target** | `git show HEAD:` committed tree |

**Recent history:**

```text
1596a64 fix(rental-invoice): block void with posted payments
454ee6d docs(audit): complete post-phase-51 enterprise gap audit
eeb0c6f fix(stock-movement): restrict public post to adjustments
```

---

## 3. Repository / WIP Status

~151 unrelated modified/untracked files preserved. **No application code, schema, or migrations modified during this audit.** Only this report file created.

---

## 4. Documents Reviewed

| Document | Role |
|----------|------|
| `docs/audits/PHASE_51_DECISION_LOCKS.md` | DL-51-01/02/03 authoritative policy |
| `docs/audits/PHASE_52_IMPLEMENTATION_REPORT.md` | Phase 52 claims (independently verified) |
| `docs/audits/POST_PHASE_51_ENTERPRISE_GAP_AUDIT.md` | Prior queue baseline |
| `docs/audits/PHASE_51_IMPLEMENTATION_REPORT.md` | F-33-03 closure context |
| Prior phase reports (29–50) | Regression matrix reference |

---

## 5. Phase 52 Closure Verification — N-44-05 CLOSED

### Status: **CLOSED @ `1596a64`** — independently verified

### Implementation chain @ HEAD

```text
POST /api/rental-invoices/:id/void
  → handleVoidRentalInvoice (auth + rentalInvoices.void)
  → VoidRentalInvoiceService.execute
  → rentalInvoiceRepository.lockForPaymentCommitment(invoiceId)
  → assertInvoiceVoidWithoutPostedPayments(paymentRepository, invoiceId)
  → withVoided() + claimStatusTransition
  → audit
```

### Case verification matrix

| Case | Expected | Verified | Evidence |
|------|----------|:--------:|----------|
| **A** PARTIALLY_PAID + POSTED payment | VOID rejected; invoice unchanged; payment POSTED; no audit | **Yes** | T52.2; `UnprocessableError`; audit length 0 |
| **B** ISSUED, zero POSTED payments | VOID succeeds | **Yes** | T52.1; T37.6 void-then-recreate regression |
| **C** PENDING / VOID payments only | Do not block void | **Yes** | T52.4; payment enum is `PENDING\|POSTED\|VOID` only |
| **D** 1 or N POSTED payments | All block void | **Yes** | T52.2, T52.5; `countPostedPaymentsByRentalInvoiceId > 0` |
| **PAID** invoice | Domain rejects void (pre-existing) | **Yes** | T52.3; `assertCanVoid` rejects PAID |
| Guard uses POSTED count, not `paidAmount` | Required | **Yes** | `countPostedPaymentsByRentalInvoiceId`; T52.4 PENDING-only void |

### Error contract

Rejected void: **422** `UnprocessableError` — *Cannot void rental invoice while POSTED payments exist. Void the payments first.* — includes `postedPaymentCount` and `postedPaymentIds` in details.

---

## 6. N-44-05 Detailed Verification

**Root cause (historical):** Void allowed `PARTIALLY_PAID → VOID` while POSTED payments remained, creating settlement dead-end.

**Current behavior:** Guard executes **after** `lockForPaymentCommitment` and **before** domain void transition or audit. Rejected void leaves invoice status, `paidAmount`, and POSTED payment rows unchanged (T52.2 assertions).

**Authorization:** Unchanged — `PERMISSIONS.rentalInvoices.void` at route; T52.7 API boundary regression.

---

## 7. POST ∥ VOID Concurrency Analysis

### Shared serialization primitive

Both paths call `rentalInvoiceRepository.lockForPaymentCommitment(id)`:

- **Production:** `SELECT id FROM rental_invoices WHERE id = $id FOR UPDATE` within UoW transaction (`prisma-rental-invoice.repository.ts:408–420`)
- **Tests:** in-memory mutex via `acquirePaymentCommitmentLock` + `runWithPaymentCommitmentLockScope` on invoice and payment transaction runners

### Interleaving 1 — POST acquires lock first (T1=POST, T2=VOID)

1. T1: lock invoice row  
2. T1: authoritative invoice re-read → validate (non-VOID) → claim payment POSTED → `applyPaymentDelta`  
3. T1: commit, release lock  
4. T2: lock → `countPostedPayments > 0` → **UnprocessableError**, no void  

**Invalid state impossible:** invoice non-VOID with POSTED payment is valid; void rejected.

### Interleaving 2 — VOID acquires lock first (T2=VOID, T1=POST)

1. T2: lock → count POSTED = 0 → void claim → commit  
2. T1: lock → authoritative re-read → invoice **VOID** → `validateInvoiceForPayment` fails → payment stays **PENDING**  

**Invalid state impossible:** POSTED claim never reached after VOID validation failure (Phase 52 fix: re-read after lock in `PostPaymentService`).

### Invariant

```text
NOT (invoice.status = VOID AND EXISTS payment WHERE status = POSTED AND rentalInvoiceId = invoice.id)
```

Proven by: T52.8, T49.5 (updated invariant assertion), mutex/FOR UPDATE serialization.

### Residual notes (not findings)

- Void domain transition uses pre-lock `existing` entity; status claim uses DB predicate — stale domain object mitigated by `claimStatusTransition` expected-status check.
- Separate UoW per HTTP request; safety relies on row lock + authoritative re-read, not single global transaction across services — **consistent with Phase 39/49 design**.

---

## 8. Payment Repository Verification

### `countPostedPaymentsByRentalInvoiceId`

| Layer | Implementation |
|-------|----------------|
| Interface | `IPaymentRepository.countPostedPaymentsByRentalInvoiceId(rentalInvoiceId)` |
| Prisma | `db.payment.count({ where: { rentalInvoiceId, status: "POSTED" } })` |
| In-memory | Filter `payment.rentalInvoiceId === id && payment.status === "POSTED"` |
| DI | Wired via `createPaymentRepositoryFromUnitOfWork` in rental-invoice transaction runner |
| UoW | Same repository runner as other payment queries within transaction scope |

**Tenant boundaries:** Single-tenant MVP; no tenant column on payments @ HEAD.

**Non-POSTED statuses:** `PENDING`, `VOID` excluded from count — correct per DL-51-02.

---

## 9. Previous Finding Regression Matrix

| Finding | Status @ `1596a64` | Regression? |
|---------|-------------------|:-----------:|
| **N-44-05** | **CLOSED** (Phase 52) | N/A |
| **F-33-03** | **CLOSED** (Phase 51) | No — `public-stock-movement-create.policy.ts` @ route |
| **F-33-01** | **CLOSED** (Phase 50) | No — `findMaxSequenceForInvoicePrefix` |
| **F-37-R1** | **CLOSED** (Phase 49) | No — derived status atomicity tests pass |
| **F-35-01** | **CLOSED** | No — Phase 35 settlement tests pass |
| **F-35-06** | **CLOSED** | No — Phase 38 issue/void tests pass |
| **F-36-03** | **CLOSED** | No — Phase 39 pending commitment tests pass |
| **F-31-03 / F-31-05** | **CLOSED** | No |
| **N-40-01 / N-42-01** | **CLOSED** | No |
| **N-46-02** | **CLOSED** (Phase 48) | No — source-externally locks intact |
| **Phase 43 PATCH** | **CONFORMS** | No — metadata-only PATCH schema |
| **Phase 45 return capacity** | **CLOSED** | No — prior tests in full suite |
| **F-04 / F-05 dispatch** | **CLOSED** | No — dispatch tests in full suite |

**No previously closed finding reopened.**

---

## 10. Fresh Enterprise Gap Scan (Summary)

Focused adversarial review of mutation/concurrency/API boundaries found **no new P0/P1/P2** beyond the known **N-48-01** queue item.

| Area | Result |
|------|--------|
| Inventory counters | Atomic SQL predicates preserved; public POST ADJUSTMENT-only |
| Payment settlement | Invoice lock + atomic delta; void/post serialized |
| Invoice lifecycle | Void guard + claim transitions intact |
| Direct API bypass | No new public workflow bypass identified |
| Status races | Claim-before-effects pattern retained on hardened paths |

---

## 11. Authorization Audit

High-risk mutation routes continue to enforce session auth + `PERMISSIONS.*` at route runners. Phase 52 guard is business invariant, not authorization substitution. No new authorization bypass identified on committed code.

---

## 12. Inventory Integrity Audit

- Phase 43: `UpdateInventorySchema` strict metadata-only @ HEAD  
- Phase 51: public POST ADJUSTMENT-only + dual permissions @ route  
- Internal `executeCreateStockMovementInScope` unchanged for workflow types  

**Conforms.**

---

## 13. Financial Integrity Audit

- Invoice void: POSTED payment guard active  
- Payment post: lock + authoritative re-read + validate + claim + delta  
- Payment void reverse: unchanged; operator path for DL-51-02 (void payments first)  
- Over-commitment: Phase 39 locks intact  

**No new financial integrity gap @ HEAD.**

---

## 14. Rental Order Audit

Reservation, dispatch, return, invoice generation paths unchanged @ HEAD. No regression from Phase 52 scope.

---

## 15. External Rental Audit — N-48-01 OPEN

| Path | F-02 locks / shortfall | Status |
|------|------------------------|--------|
| `SourceRentalOrderExternallyService` | Yes — lock → reread → shortfall → create | Protected |
| `CreateExternalRentalService` (`POST /api/external-rentals`) | **No** — direct `executeCreateExternalRentalInScope` | **Gap remains** |

**N-48-01 remains OPEN.** Not implemented (audit-only session).

---

## 16. N-48-01 / Phase 53 Readiness

| Prerequisite | Status |
|--------------|--------|
| DL-51-03 Option A locked | **Yes** @ `1aa422b` |
| Reference implementation | `SourceRentalOrderExternallyService` |
| Direct path gap reproducible | **Yes** — `create-external-rental.service.ts:62–67` |
| Schema/migration required | **None expected** — shared gate extraction |
| Additional decision needed | **None** |

**Phase 53 is implementation-ready immediately after this audit.**

---

## 17. Test Results

Environment: test fixture `DATABASE_URL` + `BETTER_AUTH_SECRET` (required for suites importing `@/shared/config/env` without mock).

### Targeted regression (7 files)

| Suite | Result |
|-------|--------|
| Phase 52 (`void-posted-payment-guard.52`) | Included in **73/73** |
| Phase 35 settlement concurrency | Included in **73/73** |
| Phase 38 issue/void concurrency | Included in **73/73** |
| Phase 39 pending over-commitment | Included in **73/73** |
| Phase 49 derived status | Included in **73/73** |
| Phase 51 stock movement policy | Included in **73/73** |
| Phase 43 inventory PATCH | Included in **73/73** |
| **Targeted combined** | **73/73 PASS** |

### Full suite

```text
passed:  3223
failed:  0
skipped: 0
total:   3223
```

Command: `npm test` (vitest run, 219 files)

---

## 18. Static Validation

| Check | Result | Notes |
|-------|--------|-------|
| `npx prisma validate` | **PASS** | |
| ESLint (Phase 52 core files) | **PASS** | void/assert/post-payment |
| `npm run typecheck` | **FAIL** | Pre-existing unrelated WIP — `.next/dev/types/validator.ts` parse errors + module scope type gaps in WIP features/payment runners; not introduced by Phase 52 |
| `git diff --check` | **PASS** | Pre-commit (audit report only) |

---

## 19. Schema / Migration Status

```text
Schema changes: NONE (audit session)
Migrations: NONE (audit session)
```

Phase 52 @ `1596a64`: no schema/migration changes.

---

## 20. Finding Register

| ID | Severity | Finding | Status | Evidence |
|----|----------|---------|--------|----------|
| **N-44-05** | P2 | Invoice void with POSTED payments | **CLOSED** | Phase 52 @ `1596a64` |
| **N-48-01** | P2 | Direct ERA create lacks F-02 parity | **OPEN** | `CreateExternalRentalService` |
| **F-33-03** | P2 | Public stock movement bypass | **CLOSED** | Phase 51 @ `eeb0c6f` |
| **F-35-08** | DEFERRED | NoOp expense accounting hook | **DEFERRED** | `NoOpExpenseAccountingHook` @ HEAD |
| **N-51-01** | P3 | Invoice P2002 retry message gap | **OPEN** | `isInvoiceNumberConflict` filter |
| **F-37-R2** | P3 | Invoice sequence gaps | **OPEN** | By design |
| **F-11** | P3 | Broad WORKER permissions | **OPEN** (mitigated) | F-33-03 closed primary bypass |
| **F-09** | P3 | Repair FK hygiene | **OPEN** | |
| **F-07** | P3 | Ghost DISPATCHED enum | **OPEN** | |
| **N-39-UI-01** | P3 | Invoice UI list cap | **OPEN** | |
| **N-51-DOC-01** | DOC | Phase 51 report hash `f289520` vs `eeb0c6f` | **OPEN** | Doc-only |

**No new P0/P1 findings.**

---

## 21. Prioritized Remaining Queue

1. **P2 — N-48-01** → Phase 53 (DL-51-03 Option A)  
2. **P3 queue** — N-51-01, F-37-R2, F-11, F-09, F-07, N-39-UI-01 (optional / v1.1+)  
3. **DEFERRED — F-35-08** — re-audit on expense hook WIP merge  
4. **DOC — N-51-DOC-01** — optional doc fix  

---

## 22. Decision Locks Revalidated

```text
DL-51-01 — F-33-03: LOCKED + IMPLEMENTED @ eeb0c6f
DL-51-02 — N-44-05: LOCKED + IMPLEMENTED @ 1596a64
DL-51-03 — N-48-01: LOCKED + PENDING IMPLEMENTATION (Phase 53)
```

---

## 23. Final Verdict

**POST-PHASE-52 ENTERPRISE GAP AUDIT COMPLETE**

- N-44-05 genuinely closed with tested concurrency invariant  
- P0/P1 = 0  
- Next phase: **Phase 53 — N-48-01**  
- Do **not** implement Phase 53 in this session  

---

## 24. Recommended Next Phase

```text
NEXT: Phase 53 — N-48-01
Policy: DL-51-03 Option A — Full F-02 parity on all ERA creation paths
Then: Post-Phase-53 Enterprise Gap Audit
```

---

## Git

| Item | Value |
|------|-------|
| Audit commit | _(filled after commit)_ |
| Message | `docs(audit): complete post-phase-52 enterprise gap audit` |
| Push | NO |
