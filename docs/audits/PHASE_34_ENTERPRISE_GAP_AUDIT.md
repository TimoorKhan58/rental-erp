# Phase 34 — Focused Enterprise Gap Audit

## F-31-03 Invoice Dispatch Rollup Integrity

**Audit date:** 2026-08-23
**Auditor scope:** Focused repository-backed verification of F-31-03 only
**Audit type:** Read-only — no production code, schema, test, commit, or push changes
**Prior audits consulted:** Phase 30–33 enterprise gap audits, `DISPATCH_CLAIMED_QUANTITY_INTEGRITY_30.md`

---

## Executive Verdict

**CONFIRMED**

At **committed** repository HEAD, F-31-03 is a real, deterministic correctness defect. Both invoice integrity services load rental-order dispatches through `dispatchRepository.findPaged({ page: 1, pageSize: 100, rentalOrderId })`, which truncates the dispatch population when an order has more than 100 dispatch records. That truncated set drives return flattening, condition-quantity rollups, and (for convert-missing-to-loss) return mutation scope — all of which are authoritative financial/inspection calculations.

**Important repository state note:** The working tree contains **uncommitted WIP** that partially implements the recommended fix (`load-rental-order-returns.ts`, wiring in both invoice services, and `findActiveByRentalOrderId`). That WIP is **not** a Phase closure: it is untracked/uncommitted, has no Phase 34 decision lock, has no dedicated >100-dispatch tests, and was not validated under the Phase 34 workflow. The finding remains **CONFIRMED** against committed code.

---

## Repository Baseline

| Check | Stated in task brief | **Observed in repository** |
|---|---|---|
| Branch | `main` | `main` |
| HEAD | `8425661` — `feat(rental-order): harden availability and workflow side effects` | **`a9c9b9b`** — `Wire ERP module detail pages, server-side filters, and cross-module links.` (`8425661` is parent commit; invoice F-31-03 paths unchanged between the two) |
| Ahead of origin | 10 commits, not pushed | **Up to date with `origin/main`** |
| Working tree | Should remain untouched | **Large uncommitted diff** (~100+ modified files + untracked docs/features). Includes partial F-31-03 WIP. |
| Production code modified by this audit | None | **None** (this document only) |

**Authoritative defect baseline:** `git grep` at `HEAD` confirms exactly two application-service call sites:

```text
HEAD:src/modules/rental-invoice/application/services/convert-missing-to-loss.service.ts:79
HEAD:src/modules/rental-invoice/application/services/generate-rental-invoice-from-order.service.ts:94
```

Both use `pageSize: 100`.

---

## Finding Reconciliation

| Location | Previous Finding | Actual Code (committed HEAD) | Verdict | Risk |
|---|---|---|---|---|
| `generate-rental-invoice-from-order.service.ts` | `findPaged({ pageSize: 100 })` truncates dispatch rollup | **Confirmed** L94–107: `findPaged({ page: 1, pageSize: 100, rentalOrderId, sortOrder: "desc" })` → `Promise.all(dispatches.items.map(findByDispatchId))` → `buildRentalInvoiceLinesFromOrder` | **CONFIRMED** | Under-billed damage/loss/missing charges when dispatch 101+ carries the only (or additional) return condition qty |
| `convert-missing-to-loss.service.ts` | Same capped dispatch load | **Confirmed** L79–92: identical `findPaged` pattern; same returns flatten; iterates returns to move `missingQuantity → lostQuantity`, then rebuilds invoice lines | **CONFIRMED** | Partial conversion — returns on omitted dispatches never updated; invoice rebuild uses incomplete return set |
| Phase 30 dispatch create/update rollup | Was F-05 family | Uses `sumClaimedSourceQuantitiesByRentalOrderId` SQL aggregate — **no paging** | **ALREADY CLOSED** (Phase 30) | N/A for F-31-03 |
| Phase 30 RO cancel guard | Was F-30-05 | Uses `existsNonCancelledDispatchByRentalOrderId` EXISTS query | **ALREADY CLOSED** (Phase 30) | N/A |
| Phase 30 return sync | Was F-30-06 | Uses `findCompletedDispatchesByRentalOrderId` unbounded | **ALREADY CLOSED** (Phase 30) | N/A |
| Working-tree WIP | Not in prior audits as closed | `load-rental-order-returns.ts` (untracked) calls `findCompletedDispatchesByRentalOrderId`; both services wired in unstaged diff | **Provisional fix — NOT CLOSED** | Correct direction; not decision-locked, tested, or committed |

---

## Complete Affected Surface (F-31-03)

After full-repository search (`dispatchRepository.findPaged`, `pageSize: 100/10/500` in application/infrastructure modules, invoice and return services, dispatch retrieval interfaces), **only these two committed paths** perform correctness-critical dispatch rollup for invoice/return financial logic:

### Path 1 — Generate invoice from order

```text
POST /api/rental-invoices/generate
  → handleGenerateRentalInvoiceFromOrder (rental-invoice-api.routes.ts)
  → GenerateRentalInvoiceFromOrderService.execute
  → runWithRepositoryUnitOfWork
      → syncRentalOrderStatusFromReturns (uses unbounded COMPLETED dispatches — Phase 30 clean)
      → rentalOrderRepository.findById
      → assertRentalOrderEligibleForInvoice (requires RO status COMPLETED)
      → rentalInvoiceRepository.findPaged({ pageSize: 10 }) — duplicate-active guard (F-33-02, out of scope)
      → dispatchRepository.findPaged({ pageSize: 100 })  ← F-31-03 DEFECT
      → returnRepository.findByDispatchId per dispatch (unbounded per dispatch)
      → buildRentalInvoiceLinesFromOrder (domain rollup from returns)
      → generateNextInvoiceNumber
  → CreateRentalInvoiceService.execute (separate UoW — persists invoice)
```

### Path 2 — Convert missing to loss

```text
POST /api/rental-invoices/:id/convert-missing-to-loss
  → handleConvertMissingToLoss
  → ConvertMissingToLossService.execute
  → runWithRepositoryUnitOfWork
      → rentalInvoiceRepository.findById (requires DRAFT)
      → dispatchRepository.findPaged({ pageSize: 100 })  ← F-31-03 DEFECT
      → returnRepository.findByDispatchId per dispatch
      → returnRepository.updateStatus (mutates return items: missing → lost)
      → reload returns via same capped dispatch path  ← second truncation
      → buildRentalInvoiceLinesFromOrder → rentalInvoiceRepository.update
```

**Not F-31-03 (confirmed separate findings or safe):**

| Location | Classification | Notes |
|---|---|---|
| `generate-invoice-number.ts` `pageSize: 500` | **F-33-01** (P2) | Invoice numbering, not dispatch rollup |
| `generate-rental-invoice-from-order.service.ts` `pageSize: 10` active-invoice scan | **F-33-02** (P2) | Existence guard, not dispatch rollup |
| `list-rental-invoices.service.ts`, `list-dispatches.service.ts`, etc. | **D — Administrative listing** | UI/API pagination |
| Feature hooks `pageSize: 100` | **C — Display/UI** | React query hydration |
| `sync-rental-order-status-from-returns.ts` | **E — Safe by design** | Phase 30 unbounded COMPLETED fetch |
| Dispatch create/update/cancel | **E — Safe by design** | Phase 30 SQL aggregate / EXISTS |

No other rental-invoice application service (`issue`, `void`, `update`, `create`, `get`, `list`) reads dispatch data for rollups.

---

## Business Invariant

For rental order `X` with status `COMPLETED`, invoice generation and draft missing→loss conversion must derive condition quantities (damaged, lost, missing) from **every** return record reachable through **every** `COMPLETED` dispatch on that order — independent of repository list page size.

Formally:

```text
returns_for_invoice(X) =
  ⋃ { returnRepository.findByDispatchId(d.id)
      | d ∈ dispatchRepository.findCompletedDispatchesByRentalOrderId(X) }

buildRentalInvoiceLinesFromOrder(rentalOrder, returns, …) and
ConvertMissingToLossService return mutations must use the complete returns_for_invoice(X) set.
```

**Dispatch-status semantics (Phase 30 authoritative — must preserve):**

| Rule | Source |
|---|---|
| Rollup input dispatches: `status = 'COMPLETED'` only | Phase 30 §13 — `findCompletedDispatchesByRentalOrderId` |
| CANCELLED dispatches excluded from integrity rollups | Phase 30 Rollup A/B family |
| Return condition rollup in invoice builder: `returnRecord.status === 'COMPLETED'` only | `build-rental-invoice-lines.ts` `buildConditionByOrderItemId` |
| Owned/external split on dispatch items | Not used in invoice condition rollup (return items carry condition qty); Phase 28 attribution unchanged on complete-return path |
| Invoice eligibility: rental order must be `COMPLETED` | `assertRentalOrderEligibleForInvoice` |

**Observed semantic drift in legacy defect path:** Committed `findPaged` loads **all dispatch statuses** (no status filter), sorted `createdAt desc`, capped at 100. The correct Phase 34 fix should **not** preserve that bug — it should align with Phase 30 Rollup B (`COMPLETED` dispatches only), as `syncRentalOrderStatusFromReturns` already does.

---

## Why Paging Is Not Safe (Concrete Evidence)

1. **Deterministic truncation:** `runRepositoryPagedQuery` applies `skip: 0, take: pageSize`. With `pageSize: 100`, dispatch records 101+ are never loaded.
2. **Downstream effect is financial:** `buildRentalInvoiceLinesFromOrder` sums `damagedQuantity`, `lostQuantity`, `missingQuantity` per rental-order line from the provided returns array. Omitted returns → omitted charges.
3. **Mutation path affected:** `ConvertMissingToLossService` updates return rows in the omitted set never receive `missingQuantity → lostQuantity` conversion.
4. **Precedent:** Phase 30 closed the identical defect class for dispatch create (`sumClaimedSourceQuantitiesByRentalOrderId`), RO cancel (`EXISTS`), and return sync (`findCompletedDispatchesByRentalOrderId`). Phase 30 tests T30.4–T30.6 prove >100 dispatch scenarios for those paths. Invoice paths were explicitly deferred.
5. **No compensating safeguard:** Domain invoice line builder is correct on complete input; the defect is input truncation only.

**Reproduction (confirmed logic, not run in this audit):**

Seed rental order `X` with 101 `COMPLETED` dispatches. Put `missingQuantity > 0` on a completed return tied to dispatch 101. Generate invoice → missing line absent or under-counted. Convert missing to loss → return on dispatch 101 not converted.

---

## Recommended Authoritative Query

**Primary mechanism:** Reuse existing Phase 30 repository primitive — **unbounded retrieval**, not SQL aggregate.

```typescript
// Dedicated application helper (matches working-tree WIP shape)
dispatchRepository.findCompletedDispatchesByRentalOrderId(rentalOrderId)
→ for each dispatch: returnRepository.findByDispatchId(dispatch.id)  // already unbounded
→ flat()
```

| Approach | Fit for F-31-03 | Rationale |
|---|---|---|
| SQL aggregate (`SUM` condition qty) | **Not recommended** | Invoice builder needs per-return iteration for `convert-missing-to-loss` mutations and inspection notes aggregation; aggregate would duplicate domain rules |
| Unbounded `findCompletedDispatchesByRentalOrderId` + `findByDispatchId` | **Recommended** | Mirrors Phase 30 `syncRentalOrderStatusFromReturns`; no new schema; preserves Phase 28/30 semantics |
| Raise `pageSize` | **Rejected** | Same defect class Phase 30 explicitly rejected (decision lock §Alternatives) |
| New `findReturnsByRentalOrderId` repository method | **Optional future optimization** | Not required for correctness; N+1 pattern acceptable at invoice frequency; can be Phase 34+ perf follow-up |
| Lock / claim | **Not required** | See concurrency section |

**Do not implement** a separate SQL rollup with different filters than Rollup B. One repository method, one filter (`status = 'COMPLETED'`), unbounded — per Phase 30 decision lock §13.

---

## Concurrency Assessment

**Not relevant** as the primary F-31-03 defect mechanism.

| Factor | Assessment |
|---|---|
| Root cause | Deterministic pagination cap — reproducible without concurrency |
| Transaction boundary | Both services use `runWithRepositoryUnitOfWork`; reads are consistent within one transaction snapshot |
| Concurrent dispatch/return mutation during invoice gen | Theoretically possible under READ COMMITTED, but separate from paging truncation; invoice requires RO `COMPLETED`, which limits normal concurrent dispatch creation |
| Phase 29/30 claims on write paths | Unaffected — Phase 34 read-path fix does not modify claim semantics |
| Required new locks | **None** for F-31-03 |

Concurrency testing is **not required** for Phase 34 acceptance of F-31-03. Sequential tests proving complete population at 101+ dispatches are sufficient.

---

## Test Gap

| Required test | Exists? | Notes |
|---|---|---|
| Dispatch create rollup at 101 dispatches | **Yes** | `dispatch.claimed-quantity.30.application.test.ts` T30.4 |
| RO cancel with dispatch beyond page 100 | **Yes** | T30.5 |
| Return sync with COMPLETED dispatch beyond 100 DRAFT records | **Yes** | T30.6 |
| Invoice generate with 101 COMPLETED dispatches + condition returns | **No** | **Must add in Phase 34** |
| Convert missing to loss with return on dispatch 101+ | **No** | **Must add in Phase 34** |
| Invoice path concurrency | **Not required** | Paging defect is deterministic |

**Recommended Phase 34 tests** (application layer, in-memory repositories):

- **T34.1** — `GenerateRentalInvoiceFromOrderService`: seed 100 DRAFT + 1 COMPLETED dispatch (mirror T30.6 pattern); completed return on dispatch 101 carries `missingQuantity`; assert invoice line includes full missing qty.
- **T34.2** — `ConvertMissingToLossService`: same fixture; assert return on dispatch 101 converted and invoice rebuilt with `lostQuantity` charge.

Use `InMemoryDispatchRepository.findCompletedDispatchesByRentalOrderId` (already implemented). No `Promise.allSettled` needed.

---

## Phase 28–33 Regression Analysis

| Phase | F-31-03 fix impact | Verdict |
|---|---|---|
| **28** Mixed return source × condition | Invoice reads completed return items only; complete-return write path untouched | **Preserve** |
| **29** Command idempotency / claim-before-side-effects | No change to claim paths | **Preserve** |
| **30** Dispatch claimed qty / Rollup B COMPLETED fetch | Fix **reuses** `findCompletedDispatchesByRentalOrderId` — aligns invoice with Phase 30 | **Preserve + align** |
| **31** Date-aware availability serialization | No interaction | **Preserve** |
| **32** Rental-order reserve integrity | No interaction | **Preserve** |
| **33** Maintenance/repair claim ordering | No interaction | **Preserve** |

Phase 34 must **not** modify dispatch create/update, return complete, reserve, or maintenance/repair modules.

---

## Phase 34 Scope

**In scope (F-31-03 only):**

1. Add shared helper `loadReturnsForRentalOrder` (or equivalent name locked in decision doc) calling `findCompletedDispatchesByRentalOrderId` + unbounded `findByDispatchId` flatten.
2. Replace capped `findPaged` dispatch load in:
   - `GenerateRentalInvoiceFromOrderService`
   - `ConvertMissingToLossService` (both initial load and refresh after mutation)
3. Add T34.1 and T34.2 application tests (>100 dispatch edge).
4. Ensure in-memory test doubles already support `findCompletedDispatchesByRentalOrderId` (confirmed present).
5. Full validation suite per project workflow after implementation.

**Explicitly out of scope:**

| Finding | Reason |
|---|---|
| **F-33-01** | Invoice number `pageSize: 500` — separate numbering defect |
| **F-33-02** | Active-invoice guard `pageSize: 10` — separate existence defect |
| **F-33-03** | Inventory PATCH bypass |
| **F-31-05+** | Return receive/inspect claims, authorization, schema FK, etc. |
| **Working-tree bundling** | Uncommitted `findActiveByRentalOrderId` + UI/report changes must not be smuggled into Phase 34 unless a separate decision lock explicitly scopes them |

---

## Decision Lock Recommendation

The Phase 34 decision lock (`INVOICE_DISPATCH_ROLLUP_INTEGRITY_34.md` or equivalent) must contain:

1. **Scope lock:** F-31-03 only — two services, one shared loader helper.
2. **Authoritative retrieval:** `findCompletedDispatchesByRentalOrderId` → `findByDispatchId` per dispatch — **no** `findPaged` on integrity paths.
3. **Semantic lock:** COMPLETED dispatches only; CANCELLED excluded; return condition rollup remains COMPLETED returns only in domain builder.
4. **No schema change.**
5. **No new locks** for invoice read rollup.
6. **No SQL aggregate** for condition quantities — unbounded record retrieval required for convert-missing-to-loss mutation path.
7. **Rejected alternatives:** raise pageSize; separate Rollup SQL with different filters.
8. **Test lock:** T34.1 generate-invoice >100 dispatches; T34.2 convert-missing-to-loss >100 dispatches.
9. **Regression lock:** Phase 28–33 modules listed above must not be modified except imports/wiring for the loader.
10. **Deferred:** F-33-01, F-33-02 remain separate phases unless explicitly merged by stakeholder decision.

---

## Repository-Wide Paging Classification (F-31-03-related excerpt)

| Location | pageSize | Class | F-31-03? |
|---|---|---|---|
| `generate-rental-invoice-from-order.service.ts` dispatch load | 100 | **A — Correctness-critical** | **Yes** |
| `convert-missing-to-loss.service.ts` dispatch load | 100 | **A — Correctness-critical** | **Yes** |
| `generate-rental-invoice-from-order.service.ts` active invoice scan | 10 | **B — Existence check** | No (F-33-02) |
| `generate-invoice-number.ts` | 500 | **A — Correctness-critical** | No (F-33-01) |
| Dispatch create/update/cancel/sync | unbounded SQL | **E — Safe** | No |
| UI hooks / list services | 100 | **C/D** | No |

---

## Final Recommendation

### Option A

```text
GO TO PHASE 34 DECISION LOCK

F-31-03 is confirmed and the audit evidence is sufficient.
No implementation should begin until the decision lock is
written and validated.
```

**Evidence sufficiency:** Committed call sites identified, end-to-end workflow traced, Phase 30 authoritative semantics verified, correct fix mechanism identified (reuse `findCompletedDispatchesByRentalOrderId`), concurrency ruled out as primary defect, test gaps specified, regression boundaries defined, unrelated findings explicitly excluded.

**Note on uncommitted WIP:** The working tree contains a draft fix aligned with the recommended approach. Phase 34 must still proceed through decision lock → validation → formal implementation → full validation → review → commit. Do not treat WIP as closure.
