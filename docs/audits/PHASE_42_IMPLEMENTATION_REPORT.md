# Phase 42 Implementation Report — Dispatch Mark-Ready Concurrency (N-42-01)

**Date:** 2026-08-30  
**Previous HEAD:** `1934e37718a1cd2cf499cfab4a96bc58074ca79f` — `fix(return): harden receive and inspect concurrency`  
**Branch:** `main`  
**Push:** NO

---

## 1. Executive Verdict

**PHASE 42 COMPLETE — N-42-01 CLOSED**

`UpdateDispatchService` mark-ready now uses atomic `claimStatusTransition(DRAFT → READY)`. Stale mark-ready commands surface `ConcurrentUpdateError` (409) and cannot regress `COMPLETED` after `CompleteDispatchService` has committed stock effects.

---

## 2. Baseline

| Item | Value |
|------|-------|
| **Previous HEAD** | `1934e37` — Phase 41 receive/inspect concurrency |
| **New HEAD** | `01a76db` — `fix(dispatch): harden mark-ready concurrency` |
| **Branch** | `main` |
| **Origin** | Ahead of `origin/main` by 8 commits (pre-commit) |
| **WIP** | Unrelated WIP preserved — not staged |
| **Push** | **NO** |

---

## 3. Finding — N-42-01

**Defect:** `UpdateDispatchService` used unconditional `updateStatus` for `markReady` while `CompleteDispatchService` and `CancelDispatchService` used atomic claims.

**Race:** Stale mark-ready read from `DRAFT` could overwrite `COMPLETED → READY` after RELEASE/OUT stock committed.

---

## 4. Root Cause

Asymmetric cross-workflow status mutation:

```
UpdateDispatchService (markReady)
  findById → withReady() → updateStatus (unconditional)

CompleteDispatchService
  claimStatusTransition(READY → DISPATCHED) → stock → updateStatus(COMPLETED)
```

Last-writer-wins on unconditional `updateStatus` allowed lifecycle regression post-stock.

---

## 5. Implementation

**File:** `update-dispatch.service.ts`

Replaced:

```typescript
updateStatus(id, READY, { readyAt })
```

With:

```typescript
claimStatusTransition(id, "DRAFT", READY, { readyAt })
→ ConcurrentUpdateError on null claim
```

Domain validation (`withReady()`) preserved before claim. Audit remains after successful claim. Item persistence (`repository.update`) unchanged and runs before mark-ready claim when both are requested.

**Repository:** No changes — reused existing `claimStatusTransition` on `PrismaDispatchRepository` / `InMemoryDispatchRepository`.

---

## 6. Claim / Concurrency Strategy

| Command | Transition | Mechanism |
|---------|------------|-----------|
| **markReady** | `DRAFT → READY` | `claimStatusTransition("DRAFT", …)` |
| **complete** | `READY → DISPATCHED` (+ stock) → `COMPLETED` | Unchanged (Phase 29/40) |
| **cancel** | `DRAFT\|READY → CANCELLED` | Unchanged (Phase 40) |

Failed mark-ready claim → `ConcurrentUpdateError` (`expectedStatus: "DRAFT"`, `action: "mark ready"`).

---

## 7. Affected Files

| File | Change |
|------|--------|
| `src/modules/dispatch/application/services/update-dispatch.service.ts` | Atomic mark-ready claim |
| `src/modules/dispatch/application/dispatch.mark-ready-concurrency.42.application.test.ts` | **NEW** — T42.1–T42.5 |
| `docs/audits/PHASE_42_IMPLEMENTATION_REPORT.md` | **NEW** — this report |

---

## 8. Test Matrix

| Test | Outcome |
|------|---------|
| **T42.1** markReady∥complete (gated) | Complete wins; stale markReady → 409; `COMPLETED`; 2 stock movements |
| **T42.1** markReady∥complete (parallel on READY) | Never `READY` with stock committed |
| **T42.2** complete-first then markReady | `UnprocessableError`; stays `COMPLETED` |
| **T42.3** duplicate markReady | 1 success, 1 `ConcurrentUpdateError`; `READY`; 1 audit |
| **T42.4** markReady on COMPLETED | `UnprocessableError`; no audit |
| **T42.5** audit rollback | Status restored to `DRAFT`; no audit entries |

**Phase 42: 6/6 PASS**

---

## 9. Regression Results

| Suite | Result |
|-------|--------|
| Phase 42 (N-42-01) | 6/6 |
| Dispatch application | PASS |
| Phase 29 dispatch concurrency | PASS |
| Phase 40 cancel concurrency | PASS |
| Phase 41 return receive/inspect | PASS |
| **Targeted batch** | **68/68** |
| **Full suite** | **3125/3125** |

Commands:

```text
node --env-file=.env ./node_modules/vitest/vitest.mjs run dispatch.mark-ready-concurrency.42 dispatch.application dispatch.cancel-concurrency.40 dispatch.concurrency.29 return.receive-inspect-concurrency.41

node --env-file=.env ./node_modules/vitest/vitest.mjs run
```

---

## 10. Static Gates

| Gate | Result |
|------|--------|
| `npx prisma validate` | PASS |
| `git diff --check` (Phase 42 files) | PASS |
| ESLint (Phase 42 files) | PASS |

---

## 11. Schema / Migration

**Schema changes: NONE**  
**Migration changes: NONE**

---

## 12. Transaction Integrity

Mark-ready path: domain validate → **claim** → audit → commit. No stock side effects on mark-ready. Rollback test (T42.5) confirms failed audit restores `DRAFT`.

---

## 13. Git Safety

| Check | Status |
|-------|--------|
| Commit created | YES (phase-scoped only) |
| Push | **NO** |
| Destructive operations | **NO** |
| Unrelated WIP preserved | **YES** |

---

## 14. Remaining Findings

| ID | Severity | Status |
|----|----------|--------|
| **N-42-01** | — | **CLOSED @ Phase 42** |
| F-33-03 | P2 | OPEN |
| F-31-08 | P2 | OPEN |
| F-33-01 | P2 | OPEN |
| F-37-R1 | P2 | OPEN |
| F-35-08 | P2 | DEFERRED |
| F-37-R2 | P3 | OPEN |
| F-11 | P3 | OPEN |
| F-09 | P3 | OPEN |
| F-07 | P3 | OPEN |
| N-39-UI-01 | P3 | OPEN |

---

## 15. Next Step

**Post-Phase-42 Enterprise Gap Audit** from new committed baseline.

Likely top candidate: **F-33-03** (direct stock-movement API bypass) — requires policy decision lock when prioritized.

---

*End of Phase 42 Implementation Report*
