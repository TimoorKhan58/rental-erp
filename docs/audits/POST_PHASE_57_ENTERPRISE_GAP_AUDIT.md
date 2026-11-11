# Post-Phase-57 Enterprise Gap Audit

**Audit date:** 2026-09-02  
**Scope:** Committed production baseline at `43cecf1` — 151 WIP entries excluded from audit target  
**Method:** Independent Phase 57 / F-11 closure verification, decision-lock revalidation, closed-finding regression review, authorization matrix audit, fresh enterprise gap scan, targeted + full regression execution

---

## 1. Executive Verdict

**POST-PHASE-57 ENTERPRISE GAP AUDIT COMPLETE**

| Severity | Count |
|----------|------:|
| **P0** | **0** |
| **P1** | **0** |
| **P2** | **0** |
| **P3** | **4** |
| **DEFERRED** | **1** |
| **DOC** | **1** |

Phase 57 closed **F-11** (financial WORKER mutation permissions) @ `43cecf1`. No P0/P1/P2 launch blockers at committed HEAD. All Phases 35–57 hardening intact. **3292/3292** tests pass — no regressions.

**Recommended next step:** **Phase 59 — N-39-UI-01** (invoice summary stats capped at 100 — materially incorrect dashboard counts for tenants with >100 invoices).

**Launch blockers (P0/P1):** **None**

---

## 2. Baseline

| Item | Value |
|------|-------|
| **Branch** | `main` |
| **HEAD before audit** | `43cecf154cc3960cdaaa68b85ac835c6c0dc7c2a` (`43cecf1`) |
| **Phase 57** | `fix(auth): restrict worker mutation permissions` |
| **Phase 56 audit** | `37c08e5` |
| **Phase 55** | `08742c6` |
| **WIP entries** | **151** |
| **Push** | NOT PUSHED |

**Recent history:**

```text
43cecf1 fix(auth): restrict worker mutation permissions
37c08e5 docs(audit): complete post-phase-55 enterprise gap audit
08742c6 fix(rental-invoice): improve p2002 conflict retry message
```

---

## 3. Phase 57 / F-11 Independent Verification — CLOSED

### Status: **CLOSED @ `43cecf1`** — independently verified

| Check | Expected | Verified | Evidence |
|-------|----------|:--------:|----------|
| WORKER lacks payment mutations | Yes | **Yes** | `role-permissions.ts` L91–93; no create/update/post/void |
| WORKER lacks invoice mutations | Yes | **Yes** | No create/update/issue/void |
| WORKER lacks supplier-payment mutations | Yes | **Yes** | No create/post/void |
| WORKER retains financial reads | Yes | **Yes** | L91–93 |
| WORKER retains dispatch/returns | Yes | **Yes** | L67–78; `return.permission.test.ts` |
| WORKER retains stock ADJUSTMENT path | Yes | **Yes** | L56–58; Phase 51 tests |
| API route 403 for WORKER financial mutate | Yes | **Yes** | `payment.api.test.ts`, `rental-invoice.api.test.ts` |
| Matrix regression tests | Pass | **Yes** | `worker-mutation-permissions.57.test.ts` 51/51 |
| No service/domain changes | Yes | **Yes** | Phase 57 commit stat — 5 files, auth only |
| No schema/migration | Yes | **Yes** | Commit diff |

### Authorization behavior

| Case | Contract | Verified |
|------|----------|:--------:|
| Unauthenticated | 401 | Route runners via `authenticateApiRequest` |
| WORKER financial mutate | 403 `ForbiddenError` | API tests |
| MANAGER/ACCOUNTANT financial mutate | 200 (when authorized) | Matrix tests |
| WORKER financial read | Allowed | `payments.read`, etc. |

### Bypass analysis

All payment and rental-invoice mutations route through `runPaymentApiRoute` / `runRentalInvoiceApiRoute` with explicit `permission` per handler (`payment-api.routes.ts`, `rental-invoice-api.routes.ts`). No alternate HTTP path found for WORKER to post/void payments or issue/void invoices without the corresponding permission. In-process service calls are not exposed via HTTP without route guards.

**Residual note (not F-11 regression):** WORKER retains broad **asset** mutation permissions (create/update/transfer/dispose, assetCategories CRUD). Outside Phase 57 scope; optional future hardening only.

---

## 4. Existing Authorization Matrix (summary @ HEAD)

| Role | Financial mutate | Operational mutate | Read breadth |
|------|:----------------:|:------------------:|:------------:|
| **OWNER** | All | All | All |
| **MANAGER** | All (except settings.update) | All | All |
| **ACCOUNTANT** | Invoices, payments, supplier payments, journal, expenses | **No** dispatch/return workflow | Broad read |
| **WORKER** | **None** | Dispatch, returns, repairs, maintenance, reserve, stock ADJUSTMENT | Operational + financial read |
| **VIEWER** | None | None | Read-only |

Complementary separation: ACCOUNTANT = financial back-office; WORKER = warehouse/operations.

---

## 5. Current WORKER Authority

**Allowed mutations:** dispatch (create/update/complete/cancel), returns (full workflow), repairs, maintenance, rental-order reserve, external-rental receive/allocate/returnToSupplier, purchase-order receive, inventory adjust + stock-movements create (DL-51-01 policy), assets.

**Denied mutations:** payments.* (except read), rentalInvoices.* (except read), supplierPayments.* (except read), rental-order create/update/confirm/cancel, external-rental create/settle/cancel.

---

## 6. DL-51-01 Verification — CONFORMS

| Movement | Public POST @ HEAD | Evidence |
|----------|:------------------:|----------|
| ADJUSTMENT | Allowed (WORKER + dual permission) | T51.1 |
| IN / OUT / RESERVE / RELEASE | **422 rejected** | T51.4–T51.7 |
| Workflow bypass via alternate endpoint | **None found** | Route policy only entry |

Phase 57 did not alter stock-movement permissions or policy.

---

## 7. DL-51-02 / N-44-05 Verification — CONFORMS

| Check | @ HEAD | Evidence |
|-------|:------:|----------|
| POSTED payment → invoice VOID rejected | **Yes** | `assert-invoice-void-without-posted-payments.ts` |
| Authoritative POSTED count (not paidAmount alone) | **Yes** | `countPostedPaymentsByRentalInvoiceId` |
| Lock before check | **Yes** | `lockForPaymentCommitment` in void service |
| Phase 52 tests | **PASS** | T52.* in targeted regression |

No Phase 57 impact on financial void guard.

---

## 8. DL-51-03 / N-48-01 Verification — CONFORMS

| Check | @ HEAD | Evidence |
|-------|:------:|----------|
| Shared `assertExternalSourcingF02Gate` | **Yes** | Direct + source paths |
| Inventory → RO lock ordering | **Yes** | Gate implementation |
| Shortfall validation post-lock | **Yes** | Phase 53 tests **PASS** |

No Phase 57 impact on ERA F-02 parity.

---

## 9. Closed-Finding Regression Matrix

| Finding | Status @ `43cecf1` | Regression? | Evidence |
|---------|-------------------|:-----------:|----------|
| **F-11** | **CLOSED** (Phase 57) | N/A | Matrix + API tests |
| **N-51-01** | **CLOSED** (Phase 55) | No | Phase 55 tests PASS |
| **N-48-01** | **CLOSED** (Phase 53) | No | Phase 53 tests PASS |
| **N-44-05** | **CLOSED** (Phase 52) | No | Phase 52 tests PASS |
| **F-33-03** | **CLOSED** (Phase 51) | No | DL-51-01 tests PASS |
| **F-33-01** | **CLOSED** (Phase 50) | No | Full suite |
| **F-37-R1** | **CLOSED** (Phase 49) | No | Phase 49 tests PASS |
| **F-35-01/06, F-36-03, F-31-03/05/08** | **CLOSED/CONFORMS** | No | Full suite |
| **N-40-01, N-42-01, N-46-02, F-04, F-05** | **CLOSED** | No | Prior phase tests in suite |
| **Phase 45 return integrity** | **CONFORMS** | No | Full suite |

---

## 10. Concurrency Audit

No new concurrency gaps identified at HEAD beyond known deferred/cosmetic items.

| Domain | Protection | Verdict |
|--------|------------|---------|
| Payment settlement | `lockForPaymentCommitment` + atomic derived status | **PASS** |
| Invoice void + payment | Serialized lock + POSTED check | **PASS** |
| Invoice number P2002 | Retry + `@unique` | **PASS** (Phase 55) |
| ERA creation | F-02 gate + partial unique index | **PASS** |
| Return capacity | Phase 45 locks | **PASS** |
| Dispatch claimed qty | Phase 30 hardening | **PASS** |

Phase 57 authorization-only — no concurrency behavior change.

---

## 11. Security / Authorization Audit

**Improvement @ Phase 57:** WORKER financial mutation surface eliminated at permission matrix + route layer.

**Remaining observations (P3 or acceptable):**

| Item | Severity | Notes |
|------|----------|-------|
| WORKER asset category delete | P3 optional | Broad asset CRUD retained — not financial |
| ACCOUNTANT asset full CRUD | Acceptable | May be intentional for fixed-asset accounting |
| VIEWER mutation access | **None** | Read-only enforced |
| Route-level `assertPermission` | Consistent | Module route runners |

No new P0/P1/P2 authorization findings.

---

## 12. Financial Integrity Audit

- Invoice/payment services unchanged by Phase 57
- DL-51-02 void guard intact
- P2002 retry (N-51-01) intact — Phase 55 tests PASS
- `RentalInvoice.invoiceNumber @unique` — database authoritative
- No raw Prisma leakage in conflict contract

---

## 13. Inventory Integrity Audit

- PATCH metadata-only (Phase 43) — unchanged
- Public stock POST ADJUSTMENT-only (DL-51-01) — PASS
- Atomic SQL in stock movement executor — unchanged
- WORKER retains `inventory.adjust` + `stockMovements.create` for manual correction path

---

## 14. Rental / Dispatch / Return Audit

- WORKER dispatch/return workflow permissions preserved post-Phase 57
- Rental-order reserve available to WORKER; create/confirm/cancel MANAGER+
- External-rental create MANAGER+ only (unchanged)
- No new state-transition gaps identified

---

## 15. External Rental Audit

- F-02 gate on both creation paths — PASS (Phase 53)
- Active ERA uniqueness — application + partial unique index
- Phase 57 did not touch ERA module

---

## 16. API Boundary Audit

Mutation routes use: authenticate → assertPermission → application service → UoW/repository. No direct Prisma from routes observed in audited modules. Error mapping via `normalizeError` / `serializeAppError` — no new leakage paths from Phase 57.

---

## 17. Data Integrity / Schema Audit

| Known item | Status | Assessment |
|------------|--------|------------|
| **F-09** | OPEN P3 | `Repair.returnInspectionItemId` — index only, no FK (`schema.prisma` L853) |
| **F-07** | OPEN P3 | `RentalOrderStatus.DISPATCHED` — ephemeral enum value; RO persists ON_RENT |
| **F-37-R2** | OPEN P3 | Sequence gaps from max+1 pre-lock; `@unique` prevents duplicates — **cosmetic/auditability only**, not uniqueness or financial integrity |

No new schema findings. Phase 57: no schema changes.

---

## 18. Remaining Queue Reassessment

| ID | Status | Severity | Reassessment |
|----|--------|----------|--------------|
| **F-11** | **CLOSED** | — | Phase 57 verified |
| **N-39-UI-01** | OPEN | P3 | **Material** — `useRentalInvoiceSummaryStats` hardcodes `pageSize: 100`; dashboard status/payment counts wrong when >100 invoices |
| **F-09** | OPEN | P3 | Schema hygiene; no observed runtime corruption |
| **F-07** | OPEN | P3 | Enum confusion only |
| **F-37-R2** | OPEN P3 (defer) | P3 | Gaps do not affect uniqueness, reconciliation totals, or duplicate prevention — `@unique` authoritative |
| **F-35-08** | DEFERRED | P2 latent | `NoOpExpenseAccountingHook` @ committed HEAD — no production journal side effects |
| **N-51-DOC-01** | OPEN DOC | DOC | Phase 51 report hash `f289520` vs `eeb0c6f` |

### F-37-R2 deep check

Sequence gaps cannot cause duplicate invoice numbers (`@unique`), incorrect totals, or settlement errors. Impact limited to non-contiguous invoice numbering for audit presentation. **Not recommended as next implementation target.**

### F-35-08 deep check

Committed HEAD wires `NoOpExpenseAccountingHook`. Latent journal-before-status ordering exists when real hook ships. **Remain DEFERRED** until expense accounting WIP merges.

### N-39-UI-01 deep check

`useRentalInvoiceSummaryStats()` (`use-rental-invoice.ts` L91–127) computes summary/status/payment counts from first 100 invoices only. Main list table uses URL pagination (correct). **Summary widgets materially under-report** for larger tenants — operational reporting integrity gap, not merely cosmetic.

---

## 19. Fresh Findings

**No new P0/P1/P2 findings** discovered at HEAD.

---

## 20. Finding Severity Summary

```text
P0: 0
P1: 0
P2: 0
P3: 4 open (N-39-UI-01, F-09, F-07, F-37-R2)
Deferred: 1 (F-35-08)
DOC: 1 (N-51-DOC-01)
Closed this cycle: F-11
```

---

## 21. Next Recommended Target

```text
Finding: N-39-UI-01
Severity: P3
Reason: Invoice summary/status/payment dashboard counts derived from capped 100-row fetch — materially incorrect when tenant has >100 invoices; clear evidence; small scoped UI fix; no decision lock; no schema
Readiness: READY
Recommended phase: Phase 59
```

**Not recommended next:** F-37-R2 (cosmetic gaps), F-09/F-07 (low-impact hygiene), N-51-DOC-01 (doc-only).

---

## 22. Tests

### Targeted regression

| Suite | Result |
|-------|--------|
| Phase 57 worker permissions | **51/51 PASS** |
| Phase 51 stock movement policy | **PASS** |
| Phase 52 void-posted-payment | **PASS** |
| Phase 49 payment derived status | **PASS** |
| Phase 53 ERA F-02 | **PASS** |
| Phase 55 P2002 retry | **PASS** |
| **Targeted combined** | **101/101 PASS** |

### Full suite

```text
passed:  3292
failed:  0
skipped: 0
total:   3292
```

Unchanged vs Phase 57 baseline. No regressions.

---

## 23. Static Validation

| Check | Result | Notes |
|-------|--------|-------|
| `npx prisma validate` | **PASS** | |
| ESLint | **FAIL** | 5 errors, 52 warnings — pre-existing unrelated WIP |
| Typecheck | **FAIL** | Pre-existing unrelated WIP feature/test-runner gaps |
| `git diff --check` | **PASS** | Audit session — whitespace warnings on unrelated WIP only |

No Phase 58 application changes. Phase 57 introduced no static failures on committed files.

---

## 24. Schema / Migrations

```text
Schema changes: NONE (audit session; Phase 57 also NONE)
Migrations: NONE
```

---

## 25. WIP Preservation

151 WIP entries unchanged. Only this audit report created during Phase 58.

---

## 26. Commit

```text
docs(audit): complete post-phase-57 enterprise gap audit
```

Hash: _(filled post-commit)_

---

## 27. Push Status

```text
NOT PUSHED
```

---

## 28. Final Verdict

**MT-ERP @ `43cecf1` remains enterprise-integrity sound for controlled single-tenant launch.**

- Phase 57 / F-11: **genuinely closed**
- Decision locks DL-51-01/02/03: **conform**
- All major closed findings: **valid**
- Repository ready for Phase 59 (N-39-UI-01)
