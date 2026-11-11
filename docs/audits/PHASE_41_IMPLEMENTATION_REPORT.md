# Phase 41 Implementation Report — Return Receive/Inspect Concurrency (F-31-05)

**Date:** 2026-08-30  
**Previous HEAD:** `44195a90ec74865a8a6134fde1aa4d1f1dd47617` — `fix(workflow): harden cancel concurrency`  
**Branch:** `main`  
**Push:** NO

---

## Executive Verdict

**PHASE 41 COMPLETE — F-31-05 CLOSED**

Receive and inspect return commands now use atomic `claimStatusTransition` with expected-status predicates. Stale receive/inspect commands surface `ConcurrentUpdateError` (409) and cannot overwrite terminal states after complete/cancel/duplicate peers have claimed.

---

## Baseline

| Item | Value |
|------|-------|
| **Previous HEAD** | `44195a90ec74865a8a6134fde1aa4d1f1dd47617` |
| **New HEAD** | `801d597` — `fix(return): harden receive and inspect concurrency` |
| **Branch** | `main` |
| **Origin** | Ahead of `origin/main` by 7 commits (pre-commit) |
| **WIP** | Unrelated WIP preserved — not staged |
| **Push** | **NO** |

---

## Finding — F-31-05

**Defect:** `ReceiveReturnService` and `InspectReturnService` used unconditional `updateStatus` after stale `findById` reads, while `CompleteReturnService` and `CancelReturnService` (Phase 40) used atomic claims.

**Critical race (inspect∥complete):**

```
inspect reads RECEIVED
        ↓
peer inspect claims RECEIVED → INSPECTED
        ↓
complete claims INSPECTED → COMPLETED + stock RELEASE/IN
        ↓
stale inspect unconditional updateStatus
        ↓
COMPLETED → INSPECTED (stock already committed)
```

Same asymmetric defect class as closed N-40-01 (Phase 40).

---

## Implementation

### Receive claim

`ReceiveReturnService` @ `receive-return.service.ts`:

```
findById → withReceived() domain validation
→ claimStatusTransition(id, "DRAFT", { status: RECEIVED, receivedAt })
→ audit → return DTO
```

Failed claim → `ConcurrentUpdateError` (`expectedStatus: "DRAFT"`, `action: "receive"`).

### Inspect claim

`InspectReturnService` @ `inspect-return.service.ts`:

```
findById → withInspected() domain validation
→ claimStatusTransition(id, "RECEIVED", { status: INSPECTED, inspectedAt, items })
→ audit → return DTO
```

Failed claim → `ConcurrentUpdateError` (`expectedStatus: "RECEIVED"`, `action: "inspect"`).

### Repository

No repository changes required. Existing `claimStatusTransition` on `PrismaReturnRepository` and `InMemoryReturnRepository` already provides expected-status atomic semantics (Phase 29 F-01).

### Transaction boundaries

Unchanged — both services run inside `IReturnTransactionRunner.run`. Audit occurs **after** successful claim. No stock/inventory side effects on receive/inspect paths.

### Rollback semantics

T41.5 validates rollback transaction runner restores status when audit fails post-claim.

---

## Status Matrix

| Command | Expected claim | Side effects after claim | Concurrent loser behavior |
|---------|----------------|--------------------------|---------------------------|
| **Receive** | `DRAFT → RECEIVED` | Audit only | 409 if not DRAFT |
| **Inspect** | `RECEIVED → INSPECTED` | Audit only | 409 if not RECEIVED |
| **Complete** | `INSPECTED → COMPLETED` | Stock RELEASE/IN, RO sync, audit (unchanged) | 409 if not INSPECTED |
| **Cancel** | `DRAFT\|RECEIVED\|INSPECTED → CANCELLED` | Audit only (unchanged) | 409 if terminal |

**Cross-workflow invariants @ implementation:**

| Race | Result |
|------|--------|
| inspect∥complete | Complete + stock wins; stale inspect → 409 |
| receive∥inspect (DRAFT) | Receive wins; inspect → 422 (domain) |
| receive∥receive | One wins; duplicate → 409 |
| inspect∥inspect | One wins; duplicate → 409 |
| receive∥cancel / inspect∥cancel | Cancel claim prevents stale receive/inspect overwrite |

---

## Concurrency Tests

File: `return.receive-inspect-concurrency.41.application.test.ts`

| Test | Outcome |
|------|---------|
| **T41.1** inspect∥complete (gated interleaving) | Complete wins; stale inspect → `ConcurrentUpdateError`; status `COMPLETED`; 2 stock movements |
| **T41.1** inspect∥complete (parallel) | Never `INSPECTED` with stock committed |
| **T41.2** receive∥inspect on DRAFT | One receive success; inspect → `UnprocessableError`; final `RECEIVED` |
| **T41.3** duplicate receive | 1 success, 1 `ConcurrentUpdateError`; final `RECEIVED` |
| **T41.4** duplicate inspect | 1 success, 1 `ConcurrentUpdateError`; final `INSPECTED` |
| **T41.5** receive audit rollback | Status restored to `DRAFT`; no audit entries |
| **T41.5** inspect audit rollback | Status restored to `RECEIVED`; no audit entries |

**7/7 PASS**

---

## Regression Tests

| Suite | Result |
|-------|--------|
| Phase 41 (F-31-05) | 7/7 |
| Return application | PASS |
| Phase 28 source×condition | PASS |
| Phase 29 concurrency | PASS |
| Phase 35 payment settlement | PASS |
| Phase 36 maintenance cancellation | PASS |
| Phase 37 invoice guard | PASS |
| Phase 38 issue/void | PASS |
| Phase 39 pending payment | PASS |
| Phase 40 cancel concurrency | PASS |
| **Targeted regression batch** | **116/116** |
| **Full suite** | **3119/3119** |

Command:

```text
node --env-file=.env ./node_modules/vitest/vitest.mjs run
```

---

## Static Gates

| Gate | Result |
|------|--------|
| `npx prisma validate` | PASS |
| `git diff --check` (Phase 41 files) | PASS |
| ESLint (Phase 41 files) | PASS (exit 0) |
| Schema diff | NONE |
| Migration diff | NONE |

---

## Schema

**Schema changes: NONE**  
**Migration changes: NONE**

---

## Git Safety

| Check | Status |
|-------|--------|
| Commit created | YES (phase-scoped files only) |
| Push | **NO** |
| Destructive operations | **NO** |
| Unrelated WIP preserved | **YES** |

---

## Remaining Findings (from Post-Phase-40 audit)

| ID | Severity | Status |
|----|----------|--------|
| **F-31-05** | — | **CLOSED @ Phase 41** |
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

## Next Step

**Post-Phase-41 Enterprise Gap Audit** from new committed baseline.

Likely next candidate per prior audit: **F-33-03** (direct stock-movement API bypass) or re-ranked after fresh audit.

---

*End of Phase 41 Implementation Report*
