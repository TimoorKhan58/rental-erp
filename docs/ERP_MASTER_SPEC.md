# ERP Master Specification

**Project:** Enterprise Rental ERP (Manyar Tent Service)  
**Repository path:** `rental-erp/`  
**Document version:** 1.0  
**Status:** Complete through **Phase 5-020**  
**Last verified:** July 10, 2026  
**Purpose:** Single source of truth for all future development. Every Cursor session should reference this document instead of re-deriving project context.

**Companion docs:**
- `docs/architecture/phase-4b-infrastructure.md` — deep dive on shared infrastructure (Phase 4B)

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [Phase History](#3-phase-history)
4. [Architecture Overview](#4-architecture-overview)
5. [Folder Structure](#5-folder-structure)
6. [Clean Architecture Rules](#6-clean-architecture-rules)
7. [Shared Infrastructure](#7-shared-infrastructure)
8. [Coding Standards](#8-coding-standards)
9. [API Conventions](#9-api-conventions)
10. [Prisma Conventions](#10-prisma-conventions)
11. [Testing Blueprint](#11-testing-blueprint)
12. [Business Workflows](#12-business-workflows)
13. [Completed Modules](#13-completed-modules)
14. [Cross-Cutting Concerns](#14-cross-cutting-concerns)
15. [Rules For Future Cursor Sessions](#15-rules-for-future-cursor-sessions)
16. [Current Project Status](#16-current-project-status)

---

## 1. Project Overview

The Rental ERP is an enterprise rental management system for tent and event equipment rental operations. It manages the full business lifecycle:

- **Master data:** customers, suppliers, warehouses, products
- **Inventory:** stock balances, stock movement ledger, procurement
- **Rental operations:** orders, dispatch, returns, repair, maintenance
- **Financial:** rental invoices, payments, accounting (double-entry), financial reports
- **Analytics:** operational reporting, dashboard summaries

The system is built as a **Next.js 16 App Router** application with a **REST API** backend organized as **feature modules** following **Clean Architecture**. Business logic lives in `src/modules/`; cross-cutting platform code lives in `src/shared/`.

### Design Principles

| Principle | Implementation |
|-----------|----------------|
| Clean Architecture | Domain → Application → Infrastructure → Presentation |
| Dependency inversion | Application depends on repository **interfaces**, not Prisma |
| Explicit DI | Factory functions, no DI framework |
| Transaction safety | Unit of Work for multi-repository writes |
| Auditability | All write operations log to `AuditLog` |
| RBAC | Permission strings enforced at route runner + service layer |
| Testability | In-memory repositories, pass-through transaction runners |

---

## 2. Technology Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js ≥ 20 |
| Framework | Next.js 16.2 (App Router) |
| Language | TypeScript 5 |
| ORM | Prisma 7.8 (PostgreSQL via `@prisma/adapter-pg`) |
| Validation | Zod 4 |
| Auth | better-auth 1.6 (email/password, session-based) |
| Testing | Vitest 4 |
| UI | React 19, Tailwind CSS 4, shadcn/ui (frontend scaffold) |

**Key scripts** (`package.json`):
- `npm run dev` — development server
- `npm run validate` — lint + typecheck + build
- `npm test` — Vitest (127 test files)
- `npm run db:migrate` — Prisma migrations
- `npm run db:generate` — regenerate Prisma client to `src/generated/prisma`

---

## 3. Phase History

### Phase 4A — Application Contracts (Complete)

Established shared application-layer contracts before infrastructure:

- `RequestContext`, `ExecutionContext`
- Query building (`buildPagination`, `buildSort`, `buildFilter`)
- Validation (`parseRequest`, common Zod schemas)
- Authorization (`PERMISSIONS`, `assertPermission`, role mapping)

**Location:** `src/shared/application/`

### Phase 4B — Shared Infrastructure (Complete: 4B-001 through 4B-010)

Concrete implementations for database, repositories, UoW, audit, notifications, storage, DI, observability.

**Documented in:** `docs/architecture/phase-4b-infrastructure.md`  
**Location:** `src/shared/infrastructure/`

### Phase 5 — Feature Modules (Complete through 5-020)

| Phase | Module / Deliverable |
|-------|-------------------|
| 5-002 | Customer (first vertical-slice reference) |
| 5-003 | Supplier |
| 5-004 | Warehouse |
| 5-005 | Product |
| 5-008 | Inventory |
| 5-009 | Stock Movement |
| 5-010 | Procurement (Purchase Orders) |
| 5-011 | Rental Orders |
| 5-012 | Dispatch |
| 5-013 | Returns |
| 5-014 | Repair |
| 5-015 | Maintenance |
| 5-016 | Rental Invoice |
| 5-017 | Payments |
| 5-018 | Accounting (Accounts + Journal Entries) |
| 5-019 | Financial Reports |
| 5-020 | Reporting + Dashboard |

**Not yet implemented (schema/permissions exist):** Asset module (domain only), Expense module, Audit query API, Notifications API, Dashboard layout CRUD, Category standalone module.

---

## 4. Architecture Overview

### Layer Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  Presentation                                               │
│  app/api/{resource}/route.ts  →  *-api.routes.ts            │
│                              →  *-api.route-runner.ts       │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│  Application                                                │
│  services/*.service.ts  schemas/*.schemas.ts  mappers/       │
│  transaction runners  audit mappers  DTOs                     │
└────────────────────────────┬────────────────────────────────┘
                             │ depends on interfaces
┌────────────────────────────▼────────────────────────────────┐
│  Domain                                                     │
│  *.entity.ts  *.rules.ts  *.errors.ts  *.repository.interface│
└────────────────────────────▲────────────────────────────────┘
                             │ implements
┌────────────────────────────┴────────────────────────────────┐
│  Infrastructure                                             │
│  prisma-*.repository.ts  *.persistence.mapper.ts  factories/ │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│  Shared Infrastructure                                      │
│  SharedDeps  RepositoryRunner  UnitOfWork  Audit  Notifications│
└─────────────────────────────────────────────────────────────┘
```

### Request Flow (Read)

```
HTTP Request
  → app/api/{resource}/route.ts (thin adapter)
  → handleList{Entity}(request, resolve{Entity}ApplicationServices)
  → run{Entity}ApiRoute({ auth, permission, resolveServices, handler })
  → createRequestContext + createExecutionContext
  → assertPermission(ctx.request, PERMISSIONS.{entity}.read)
  → resolveServices(ctx) = create{Entity}ApplicationServices(createSharedDepsFromExecutionContext(ctx))
  → services.list{Entity}.execute(input)
  → repository.findPaged(query) via ObservableRepositoryRunner
  → to{Entity}Response(dto) → successResponse → JSON
```

### Request Flow (Write with Transaction)

```
HTTP Request
  → run{Entity}ApiRoute (auth + RBAC)
  → services.create{Entity}.execute(input)
  → I{Entity}TransactionRunner.run(scope => { ... })
  → runWithRepositoryUnitOfWork(deps, context => {
       repairRepository: createRepairRepositoryFromUnitOfWork(context),
       inventoryRepository: createInventoryRepositoryFromUnitOfWork(context),
       stockMovementRepository: ...,
       auditLogger: context.deps.auditLogger,
     })
  → prisma.$transaction(tx) — all repos share same tx
  → domain validation → persist → audit log → return DTO
```

### Composition Root Pattern

Each API resource has a `_composition/` folder:

```
src/app/api/repairs/_composition/resolve-repair-services.ts
```

```typescript
export const resolveRepairApplicationServices: RepairServiceResolver = (ctx) =>
  createRepairApplicationServices(
    createSharedDepsFromExecutionContext(ctx),
    ctx.request.userId,
  );
```

Next.js route files contain **only** delegation — no business logic.

---

## 5. Folder Structure

```
rental-erp/
├── prisma/
│   ├── schema.prisma              # M3-FINAL-FIX (1322 lines)
│   └── migrations/                # 15 migrations
├── docs/
│   ├── ERP_MASTER_SPEC.md         # This document
│   └── architecture/
│       └── phase-4b-infrastructure.md
├── src/
│   ├── app/
│   │   ├── api/                   # 79 route.ts files (REST API)
│   │   └── (pages)/               # Next.js UI pages
│   ├── components/                # UI components
│   ├── config/                    # App configuration
│   ├── constants/                 # roles.ts, etc.
│   ├── generated/prisma/          # Generated Prisma client
│   ├── lib/
│   │   ├── auth/                  # better-auth config
│   │   └── prisma.ts              # Re-export of shared Prisma client
│   ├── modules/                   # 18 feature modules + _template
│   │   ├── _template/             # Scaffold (not imported at runtime)
│   │   ├── accounting/
│   │   ├── asset/                 # Domain only (incomplete)
│   │   ├── customer/              # Reference implementation
│   │   ├── dispatch/
│   │   ├── financial-report/
│   │   ├── inventory/
│   │   ├── maintenance/
│   │   ├── payment/
│   │   ├── procurement/
│   │   ├── product/
│   │   ├── rental-invoice/
│   │   ├── rental-order/
│   │   ├── repair/
│   │   ├── reporting/             # Includes Dashboard
│   │   ├── return/
│   │   ├── stock-movement/
│   │   ├── supplier/
│   │   └── warehouse/
│   ├── shared/
│   │   ├── application/           # Context, auth, validation, query
│   │   ├── domain/                # BaseEntity, pagination, IDs, Result
│   │   └── infrastructure/        # DI, database, audit, notifications, http
│   └── types/
├── vitest.config.ts
└── package.json
```

### Standard Module Structure

Every completed feature module follows this layout (use `customer` or `repair` as reference):

```
src/modules/{module}/
├── domain/
│   ├── {entity}.entity.ts
│   ├── {entity}.repository.interface.ts
│   ├── {entity}.rules.ts              # Workflow modules only
│   ├── {entity}.errors.ts
│   ├── {entity}.types.ts
│   ├── {entity}.constants.ts          # Statuses, sort fields, search fields
│   ├── {entity}-list.query.ts
│   └── index.ts
├── application/
│   ├── dtos/{entity}.dto.ts
│   ├── schemas/{entity}.schemas.ts
│   ├── mappers/{entity}.mapper.ts
│   ├── mappers/{entity}-list.mapper.ts
│   ├── services/
│   │   ├── create-{entity}.service.ts       # One class per use case
│   │   ├── {entity}-transaction.runner.ts   # Interface for UoW scope
│   │   ├── {entity}-audit.mapper.ts
│   │   └── {entity}-application-services.interface.ts
│   └── index.ts
├── infrastructure/
│   ├── repositories/prisma-{entity}.repository.ts
│   ├── mappers/{entity}.persistence.mapper.ts
│   ├── factories/
│   │   ├── create-{entity}.repository.ts
│   │   ├── create-{entity}.services.ts
│   │   └── create-{entity}-transaction.runner.ts
│   └── index.ts
├── presentation/
│   ├── routes/{entity}.routes.ts          # Path constants
│   ├── routes/{entity}-api.routes.ts      # Handler functions
│   ├── http/{entity}-api.route-runner.ts  # Auth + RBAC + error handling
│   ├── mappers/{entity}-response.mapper.ts
│   └── index.ts
├── tests/
│   ├── helpers/                           # In-memory repos, fixtures, mocks
│   └── {entity}.validation.test.ts
└── index.ts
```

---

## 6. Clean Architecture Rules

### Dependency Direction (Strict)

| Layer | May Import | Must NOT Import |
|-------|-----------|-----------------|
| **Domain** | `shared/domain` only | Prisma, infrastructure, application, presentation |
| **Application** | Domain interfaces, `shared/application`, `shared/infrastructure/errors` (AppError types only) | Prisma, concrete repositories |
| **Infrastructure** | Domain interfaces, `shared/infrastructure`, application transaction-runner interfaces | Presentation |
| **Presentation** | Application services/schemas, shared context/auth/errors/http | Prisma directly |
| **Composition** (`app/api/*/_composition/`) | Module factories + `createSharedDepsFromExecutionContext` | Business logic |

### Repository Pattern

1. **Interface** defined in `domain/{entity}.repository.interface.ts`
2. **Implementation** in `infrastructure/repositories/prisma-{entity}.repository.ts`
3. **Factory** in `infrastructure/factories/create-{entity}.repository.ts`
4. All Prisma access goes through `RepositoryRunner` or `ObservableRepositoryRunner`
5. Application services receive `I{Entity}Repository`, never `PrismaClient`

### Domain Entity Rules

- Entities use factory methods: `Entity.create(data)`, `Entity.reconstitute(props)`
- State transitions via explicit methods (e.g. `repair.start()`, `repair.complete()`)
- Invariants enforced in entity + `{entity}.rules.ts`
- Domain errors are plain `Error` subclasses in `{entity}.errors.ts`
- Application layer maps domain errors → `AppError` (e.g. `UnprocessableError`)

### Service Rules

- One service class per use case: `CreateRepairService`, `ListRepairsService`
- Services are stateless; dependencies injected via constructor
- Write services use `I{Module}TransactionRunner` for cross-module atomicity
- Write services call `auditLogger.log()` after successful persistence
- Services never import Prisma types

### Factory Rules

Each module has exactly three infrastructure factories:

| Factory | Creates |
|---------|---------|
| `create-{module}.repository.ts` | `Prisma{Entity}Repository` with `ObservableRepositoryRunner` |
| `create-{module}.services.ts` | All application service instances wired together |
| `create-{module}-transaction.runner.ts` | UoW runner for multi-repo writes |

---

## 7. Shared Infrastructure

> Full detail: `docs/architecture/phase-4b-infrastructure.md`

### 7.1 SharedDeps (Composition Root)

**File:** `src/shared/infrastructure/di/shared-deps.ts`

```typescript
export interface SharedDeps {
  readonly logger: ILogger;
  readonly prisma: PrismaClient;
  readonly transactionManager: ITransactionManager;
  readonly auditLogger: IAuditLogger;
  readonly notificationService: INotificationService;
  readonly fileStorage: IFileStorage;
}
```

| Factory | Purpose |
|---------|---------|
| `createSharedDeps()` | Root factory |
| `createSharedDepsFromRequestContext()` | HTTP request with audit context |
| `createSharedDepsFromExecutionContext(ctx)` | **Primary HTTP path** |
| `createTransactionScopedSharedDeps(deps, tx)` | Re-binds audit/notification to transaction |
| `runWithTransactionScopedSharedDeps(deps, op)` | Central transaction primitive |
| `runWithSharedTransaction(deps, op)` | Simplified transaction wrapper |

**Barrel:** `src/shared/infrastructure/di/container.ts`

### 7.2 TransactionManager

**File:** `src/shared/infrastructure/database/transaction-manager.ts`

```typescript
export interface ITransactionManager {
  run<T>(operation: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
}
```

Wraps `prisma.$transaction()`. Created via `createSharedDatabaseDeps()`.

### 7.3 RepositoryRunner

**File:** `src/shared/infrastructure/database/repository/repository-runner.ts`

- Resolves `DbClient` via `resolveDbClient(tx)` (transaction-aware)
- Wraps all operations in `withPrismaError` → `mapPrismaError`
- Logs success/failure with `RepositoryOperationMeta`
- `withTransaction(tx)` returns a tx-bound runner

**CRUD helpers:** `repositoryFindFirst`, `repositoryFindMany`, `repositoryCreate`, `repositoryUpdate`, `repositoryDelete`, `repositoryCount` in `repository-operations.ts`.

**Optional base class:** `PrismaRepositoryBase` exposes `protected run()` / `protected db`.

### 7.4 ObservableRepositoryRunner

**File:** `src/shared/infrastructure/database/repository/observability/observable-repository-runner.ts`

Wraps `RepositoryRunner` with:
- `performance.now()` timing
- Structured debug/error logging
- Optional `IRepositoryMetrics` hook (defaults to noop)
- Request correlation via `RepositoryObservationContext`

**Factory:** `createObservableRepositoryRunnerFromSharedDeps(deps, { tx, repositoryName })` — used by all feature repository factories.

### 7.5 Unit of Work

**Files:** `src/shared/infrastructure/database/repository/unit-of-work/`

```typescript
export interface RepositoryUnitOfWorkContext {
  readonly tx: Prisma.TransactionClient;
  readonly deps: SharedDeps;           // transaction-scoped
  readonly runner: RepositoryRunner;
  readonly repositoryBase: PrismaRepositoryBase;
  createRunner(): RepositoryRunner;
  createRepositoryBase(): PrismaRepositoryBase;
}
```

**Entry points:**
- `runWithRepositoryUnitOfWork(deps, op)` — starts `$transaction`
- `runWithRepositoryUnitOfWorkFromExecutionContext(ctx, op)` — reuses existing `ctx.tx` if set (nested tx avoidance)

**Feature transaction runners** wire multiple repos from the same UoW context. Example: `CreateRepairService` needs repair + return + rental-order + inventory + stock-movement repositories in one transaction.

### 7.6 RequestContext & ExecutionContext

**Files:** `src/shared/application/context/`

```typescript
// RequestContext — HTTP metadata
interface RequestContext {
  requestId: string;
  userId?: string;
  role?: UserRole;
  ipAddress?: string;
  userAgent?: string;
  route?: string;
  httpMethod?: string;
  timestamp: Date;
}

// ExecutionContext — per-request execution scope
interface ExecutionContext {
  request: RequestContext;
  logger: ILogger;
  tx?: Prisma.TransactionClient;
  audit?: AuditContext;
  permissions?: Permission[];
}
```

Created in route runners after authentication.

### 7.7 Audit Logging

**Location:** `src/shared/infrastructure/audit/`

| Component | Purpose |
|-----------|---------|
| `IAuditLogger` | `log()` / `logFailure()` interface |
| `PrismaAuditLogger` | Persists to `auditLog` table |
| `createAuditContextFromRequest()` | Maps HTTP → audit metadata |
| `withTransaction(tx)` | Transaction-aware logging |

**Per-module:** `{entity}-audit.mapper.ts` maps domain changes to audit entry payloads.

**Actions:** `CREATE`, `UPDATE`, `DELETE`, `STATUS_CHANGE`, `POST`, `VOID`, etc. (see `AUDIT_ACTIONS`).

### 7.8 Notification Infrastructure

**Location:** `src/shared/infrastructure/notifications/`

| Component | Purpose |
|-----------|---------|
| `INotificationService` | `enqueue()`, `cancel()` |
| `PrismaNotificationService` | Template resolution + persistence |
| `notification-template-resolver.ts` | Resolves templates by `eventKey` |

Channels defined: in-app, email, SMS, WhatsApp, push (adapters placeholder in `channels/`).

**No REST API yet** — infrastructure only. Permissions `notifications:read`, `notifications:send` exist.

### 7.9 Query & Pagination Infrastructure

**Application:** `src/shared/application/query/` — `buildPagination`, `buildSort`, `buildFilter`

**Infrastructure:** `src/shared/infrastructure/database/repository/query/`

| Function | Purpose |
|----------|---------|
| `createRepositoryQuerySpec()` | Normalizes page/pageSize/sort/filter/search |
| `composePrismaQuery()` | Builds Prisma `where`, `orderBy`, `skip`, `take` |
| `buildSearchWhereFromInput()` | Case-insensitive `contains` OR across fields |
| `mergePrismaWhere()` | AND-combines base + filter + search |
| `runRepositoryPagedQuery()` | Parallel `findMany` + `count` |

**Domain type:** `PaginatedResult<T>` with `items` and `meta: { page, pageSize, total, totalPages }`.

### 7.10 Error Handling

**Two-tier model:**

1. **Domain errors** — module-specific `Error` subclasses, thrown in entities/rules
2. **AppError hierarchy** — `src/shared/infrastructure/errors/app-error.ts`

| Class | HTTP | Code |
|-------|------|------|
| `ValidationError` | 400 | `VALIDATION_FAILED` |
| `UnauthorizedError` | 401 | `UNAUTHORIZED` |
| `ForbiddenError` | 403 | `FORBIDDEN` |
| `NotFoundError` | 404 | `NOT_FOUND` |
| `ConflictError` | 409 | `CONFLICT` |
| `UnprocessableError` | 422 | `INVALID_STATE` |
| `InternalError` | 500 | `INTERNAL_ERROR` |

**Prisma mapping** (`prisma-error-mapper.ts`): P2002 → Conflict, P2025 → NotFound, P2003/P2014 → Unprocessable.

**HTTP envelope** (`api-response.ts`):
```json
// Success
{ "data": T, "requestId": "...", "meta?": {} }

// Error
{ "error": { "code": "...", "message": "...", "details?": {} }, "requestId": "..." }
```

### 7.11 Shared Domain Primitives

**Location:** `src/shared/domain/`

| File | Purpose |
|------|---------|
| `ids.ts` | Branded ID types (`CustomerId`, `RepairId`, etc.) |
| `pagination.ts` | `PaginatedResult<T>`, `PaginationMeta` |
| `result.ts` | `Result<T, E>` (success/failure) |
| `base-entity.ts` | `BaseEntity<TId>` |

### 7.12 File Storage

**Location:** `src/shared/infrastructure/storage/`

`IFileStorage` with `LocalFileStorage` adapter. S3 stub placeholder. Not yet used by feature modules.

---

## 8. Coding Standards

### 8.1 Naming Conventions

**General:** kebab-case for all file and folder names.

| Pattern | Example | Layer |
|---------|---------|-------|
| `{entity}.entity.ts` | `repair.entity.ts` | Domain |
| `{entity}.repository.interface.ts` | `repair.repository.interface.ts` | Domain |
| `{entity}.rules.ts` | `repair.rules.ts` | Domain |
| `{entity}.errors.ts` | `repair.errors.ts` | Domain |
| `{entity}.types.ts` | `repair.types.ts` | Domain |
| `{entity}.constants.ts` | `repair.constants.ts` | Domain |
| `{entity}-list.query.ts` | `repair-list.query.ts` | Domain |
| `{verb}-{entity}.service.ts` | `create-repair.service.ts` | Application |
| `{entity}.schemas.ts` | `repair.schemas.ts` | Application |
| `{entity}.dto.ts` | `repair.dto.ts` | Application |
| `{entity}.mapper.ts` | `repair.mapper.ts` | Application |
| `{entity}.persistence.mapper.ts` | `repair.persistence.mapper.ts` | Infrastructure |
| `prisma-{entity}.repository.ts` | `prisma-repair.repository.ts` | Infrastructure |
| `create-{entity}.repository.ts` | Factory | Infrastructure |
| `create-{entity}.services.ts` | Factory | Infrastructure |
| `create-{entity}-transaction.runner.ts` | UoW factory | Infrastructure |
| `{entity}-api.route-runner.ts` | `repair-api.route-runner.ts` | Presentation |
| `{entity}-api.routes.ts` | Route handlers | Presentation |
| `{entity}.routes.ts` | Path constants | Presentation |
| `{entity}-response.mapper.ts` | HTTP response shaping | Presentation |
| `in-memory-{entity}.repository.ts` | Test double | Tests |
| `{entity}.fixtures.ts` | Test data builders | Tests |

### 8.2 DTO Rules

- DTOs are plain TypeScript interfaces in `application/dtos/`
- Dates serialized as ISO 8601 strings in DTOs
- Status fields use domain union types (not Prisma enums directly)
- IDs are `string` (UUID) in DTOs; branded types used internally in domain
- List responses wrap items in `PaginatedResult<{Entity}Dto>`

### 8.3 Mapper Rules

Four mapper layers per module:

| Mapper | Direction |
|--------|-----------|
| Application mapper | Input → domain data; Entity → DTO |
| List query mapper | Zod list input → domain `{Entity}ListQuery` |
| Persistence mapper | Prisma record ↔ domain entity; domain → Prisma create/update |
| Response mapper | DTO → HTTP response (explicit response interfaces) |
| Audit mapper | Domain → `Record<string, unknown>` for audit entries |

**Decimal handling:** `new Prisma.Decimal(value)` on write; `Number(decimal.toString())` on read.

### 8.4 Repository Rules

- Implement domain interface only
- Use `runRepositoryPagedQuery` for list endpoints
- Define `REPAIR_SEARCH_FIELDS`, `REPAIR_SORT_FIELDS` in domain constants
- Map filters via module-specific `map{Entity}Filter` and `map{Entity}Sort`
- Never throw Prisma errors directly — always through `RepositoryRunner`

### 8.5 Validation Rules

- All input validation via Zod schemas in `application/schemas/`
- Parse at presentation layer with `parseRequest(schema, data)` → throws `ValidationError`
- Extend `PaginationSchema` for list endpoints
- Use shared primitives from `common-schemas.ts`: `UUIDSchema`, `DateSchema`, `PositiveIntSchema`, `TrimmedStringSchema`
- `Update{Entity}Schema` requires `.refine()` with at least one field
- Search max length: 200 characters (`.superRefine()` on list schemas)
- Export `z.infer<typeof Schema>` as typed input alongside schemas

### 8.6 RBAC Rules

- Permissions defined in `src/shared/application/authorization/permissions.ts`
- Format: `{resource}:{action}` (e.g. `repairs:start`, `journal-entries:post`)
- Role mapping in `role-permissions.ts`
- Enforce at route runner via `assertPermission(ctx.request, permission)`
- Workflow actions have dedicated permissions (not just CRUD)
- Additional `UnauthorizedError` in services when `userId` required but missing

**Roles:**

| Role | Access |
|------|--------|
| `owner` | All permissions |
| `manager` | All except `settings:manage` |
| `worker` | Operational read + create/update/workflow on ops entities |
| `accountant` | Financial read + create/post on accounts, journals, invoices, payments |
| `viewer` | All `:read` permissions only |

### 8.7 Audit Rules

- Every write service logs audit after successful persistence
- Use `{entity}-audit.mapper.ts` to build `newValue` / `oldValue` payloads
- Include `entityType`, `entityId`, `action`, `status: SUCCESS`
- On failure within transaction, `auditLogger.logFailure()` where applicable
- Audit context derived from `RequestContext` (userId, IP, userAgent)

### 8.8 Transaction Rules

- Single-entity writes: may use repository directly or simple transaction
- Cross-module writes: **must** use `I{Module}TransactionRunner`
- Transaction runner declares exact repository scope in interface
- Nested transactions: reuse `ctx.tx` via `runWithRepositoryUnitOfWorkFromExecutionContext`
- All repos in a write scope share the same `tx` and transaction-scoped `SharedDeps`

### 8.9 UnitOfWork Usage

```typescript
// In create-{module}-transaction.runner.ts
export function createRepairTransactionRunner(deps: SharedDeps): IRepairTransactionRunner {
  return {
    run: <T>(operation: (scope: RepairTransactionScope) => Promise<T>) =>
      runWithRepositoryUnitOfWork(deps, (context) =>
        operation({
          repairRepository: createRepairRepositoryFromUnitOfWork(context),
          returnRepository: createReturnRepositoryFromUnitOfWork(context),
          rentalOrderRepository: createRentalOrderRepositoryFromUnitOfWork(context),
          inventoryRepository: createInventoryRepositoryFromUnitOfWork(context),
          stockMovementRepository: createStockMovementRepositoryFromUnitOfWork(context),
          auditLogger: context.deps.auditLogger,
          userId: /* from closure */,
        }),
      ),
  };
}
```

---

## 9. API Conventions

### 9.1 Route Registration (Three Layers)

**Layer 1 — Next.js** (`src/app/api/{resource}/route.ts`):
```typescript
export async function GET(request: NextRequest): Promise<Response> {
  return handleListRepairs(request, resolveRepairApplicationServices);
}
```

**Layer 2 — Module handlers** (`presentation/routes/{entity}-api.routes.ts`):
- Parse query/body/params with Zod
- Call `run{Module}ApiRoute`
- Map DTO → response via presentation mapper

**Layer 3 — Route runner** (`presentation/http/{entity}-api.route-runner.ts`):
- Session auth via `auth.api.getSession`
- Build contexts
- `assertPermission`
- Error normalization → `serializeAppError`

### 9.2 REST Endpoint Patterns

**CRUD modules:**
| Method | Path | Permission |
|--------|------|------------|
| GET | `/api/{resources}` | `{resource}:read` |
| POST | `/api/{resources}` | `{resource}:create` |
| GET | `/api/{resources}/:id` | `{resource}:read` |
| PATCH | `/api/{resources}/:id` | `{resource}:update` |
| DELETE | `/api/{resources}/:id` | `{resource}:delete` |

**Workflow modules** add action endpoints:
| Method | Path | Example Permission |
|--------|------|-------------------|
| POST | `/api/{resources}/:id/{action}` | `repairs:start` |

### 9.3 Pagination, Filtering, Sorting, Search

**Query parameters (list endpoints):**
| Param | Type | Default | Constraint |
|-------|------|---------|------------|
| `page` | number | 1 | min 1 |
| `pageSize` | number | 20 | 1–100 |
| `sortBy` | string | module default | enum per module |
| `sortOrder` | `asc` \| `desc` | `asc` | |
| `search` | string | — | max 200 chars |

**Reports additionally support:** `dateFrom`, `dateTo` (validated: `dateFrom <= dateTo`).

### 9.4 Complete API Inventory (78 business endpoints + auth)

| Resource | Base Path | Workflow Actions |
|----------|-----------|-----------------|
| Customers | `/api/customers` | — |
| Suppliers | `/api/suppliers` | — |
| Warehouses | `/api/warehouses` | — |
| Products | `/api/products` | — |
| Inventory | `/api/inventory` | — |
| Stock Movements | `/api/stock-movements` | create only (immutable ledger) |
| Purchase Orders | `/api/purchase-orders` | approve, receive, cancel |
| Rental Orders | `/api/rental-orders` | confirm, reserve, cancel |
| Dispatches | `/api/dispatches` | complete, cancel |
| Returns | `/api/returns` | receive, inspect, complete, cancel |
| Repairs | `/api/repairs` | start, complete, cancel |
| Maintenances | `/api/maintenances` | start, complete, cancel |
| Rental Invoices | `/api/rental-invoices` | issue, void |
| Payments | `/api/payments` | post, void |
| Accounts | `/api/accounts` | — |
| Journal Entries | `/api/journal-entries` | post, void |
| Financial Reports | `/api/financial-reports/*` | read-only (10 endpoints) |
| Reports | `/api/reports/*` | read-only (12 endpoints incl. dashboard) |
| Auth | `/api/auth/[...all]` | better-auth catch-all |

---

## 10. Prisma Conventions

### 10.1 Schema Rules

**File:** `prisma/schema.prisma` (label: M3-FINAL-FIX)

| Convention | Rule |
|------------|------|
| IDs | UUID (`@id @default(uuid()) @db.Uuid`) |
| Table naming | camelCase models, snake_case tables via `@@map("journal_entries")` |
| Money | `Decimal @db.Decimal(12, 2)` — validated in service layer |
| Business dates | `@db.Date` |
| Timestamps | `DateTime @default(now())` / `@updatedAt` |
| Enums | Prisma enums for all status fields |
| Relations | Explicit `onDelete: Restrict` or `Cascade` |
| Indexes | On codes, dates, status, foreign keys |
| Soft delete | **Not implemented** — planned for future phase |
| Client output | `../src/generated/prisma` |

### 10.2 Migration Conventions

**Folder:** `prisma/migrations/` (15 migrations)

| Convention | Example |
|------------|---------|
| Naming | `YYYYMMDDHHMMSS_{module_name}/migration.sql` |
| Auth init | `0_init_auth` |
| Phase comments | Some SQL files include phase references |

**Migration list:**
1. `0_init_auth` — Users, roles
2. `20260709113700_add_warehouses`
3. `20260709120800_product_catalog`
4. `20260709122800_inventory_module` (Phase 5-008)
5. `20260709123200_stock_movement` (Phase 5-009)
6. `20260709130000_purchase_orders`
7. `20260709140000_rental_orders`
8. `20260709150000_dispatches`
9. `20260709160000_returns`
10. `20260709170000_repairs`
11. `20260709180000_maintenances`
12. `20260709183000_rental_invoices`
13. `20260709190000_payments`
14. `20260709200000_accounting`
15. `20260710100000_assets`

**Rules for new migrations:**
- Never modify existing migrations
- One migration per module/feature
- Include phase comment in SQL header
- Run `prisma validate` before committing

### 10.3 Prisma Model → Module Map

| Prisma Model | Module |
|--------------|--------|
| `Role`, `User` | Auth / RBAC |
| `Customer` | customer |
| `Supplier` | supplier |
| `Warehouse` | warehouse |
| `Category`, `Product` | product |
| `Inventory` | inventory |
| `InventoryTransaction` | stock-movement |
| `PurchaseOrder`, `PurchaseOrderItem` | procurement |
| `RentalOrder`, `RentalOrderItem` | rental-order |
| `Dispatch`, `DispatchItem` | dispatch |
| `ReturnInspection`, `ReturnInspectionItem` | return |
| `Repair`, `RepairItem` | repair |
| `Maintenance` | maintenance |
| `RentalInvoice`, `RentalInvoiceItem` | rental-invoice |
| `Payment` | payment |
| `Account`, `JournalEntry`, `JournalEntryLine` | accounting |
| `Expense` | financial-report (read) — no expense module |
| `AuditLog` | shared audit infra |
| `Notification*` | shared notifications infra |
| `Dashboard`, `DashboardWidget`, `UserDashboard` | reporting (read only) |
| `Asset*` | asset (domain only) |
| `CompanySetting`, `DocumentSequence`, `SystemSetting`, `FeatureFlag` | settings (no module) |

---

## 11. Testing Blueprint

### 11.1 Test Runner

Vitest 4, Node environment, `@/` path alias. Pattern: `src/**/*.test.ts`.

### 11.2 Per-Module Test Suite

| Test File | Layer | Purpose |
|-----------|-------|---------|
| `{entity}.domain.test.ts` | Domain | Entity creation, invariants |
| `{entity}.status.test.ts` | Domain | Status machine transitions |
| `{entity}.validation.test.ts` | Application | Zod schema edge cases |
| `{entity}.application.test.ts` | Application | Full use-case flows with in-memory repos |
| `{entity}.service.test.ts` | Application | Service facade delegation |
| `{entity}.api.test.ts` | Presentation | Auth, permissions, error codes via route runner |
| `in-memory-{entity}.repository.test.ts` | Tests | In-memory repo behavior |
| `prisma-{entity}.repository.test.ts` | Infrastructure | Prisma repo with mock DbClient |
| `{entity}.permission.test.ts` | Cross-cutting | Permission wiring (reports/finance) |

### 11.3 Test Helpers (`tests/helpers/`)

| Helper | Purpose |
|--------|---------|
| `in-memory-*.repository.ts` | Implements domain interface; `seed()`, `snapshot()`, `restore()` |
| `*.fixtures.ts` | `build*Entity()`, valid input constants, IDs |
| `mock-audit-logger.ts` | Captures audit entries |
| `transaction-test-runner.ts` | `createPassThroughTransactionRunner`, `createRollbackTransactionRunner` |
| `api-request.factory.ts` | `createMockNextRequest()` |

### 11.4 Application Test Pattern

```typescript
// 1. Create in-memory repos for all dependencies in write scope
// 2. Seed related entities
// 3. Wire createPassThroughTransactionRunner({ repos..., auditLogger, userId })
// 4. Instantiate service with transaction runner
// 5. Assert DTO output, repo state, audit log entries, thrown AppError types
```

### 11.5 API Test Pattern

```typescript
// 1. vi.mock("@/lib/auth") for session control
// 2. Mock resolveServices returning stub services
// 3. Call run{Module}ApiRoute directly
// 4. Assert status codes and ERROR_CODES in response body
```

### 11.6 Coverage Configuration

`vitest.config.ts` includes all 17 completed business modules. `asset` module excluded.

---

## 12. Business Workflows

### 12.1 Rental Lifecycle

```
Customer + Warehouse + Product
        ↓
   Rental Order (DRAFT)
        ↓ confirm
   Rental Order (CONFIRMED)
        ↓ reserve → Stock Movement RESERVE + Inventory reservedQuantity++
   Rental Order (RESERVED)
        ↓
   Dispatch (DRAFT → READY → COMPLETED) → Stock Movement OUT + reservedQuantity--, quantityOnHand--
        ↓
   Return (DRAFT → RECEIVED → INSPECTED → COMPLETED) → Stock Movement IN (good qty restocked)
        ↓
   Repair (if damaged: PENDING → IN_PROGRESS → COMPLETED)
        ↓
   Rental Order (COMPLETED)
        ↓
   Rental Invoice (DRAFT → ISSUED)
        ↓
   Payment (PENDING → POSTED) → Invoice balance updated
```

### 12.2 Procurement Lifecycle

```
Supplier + Warehouse + Product
        ↓
   Purchase Order (DRAFT)
        ↓ approve
   Purchase Order (APPROVED)
        ↓ receive → Stock Movement IN + Inventory quantityOnHand++
   Purchase Order (PARTIALLY_RECEIVED → RECEIVED)
```

### 12.3 Accounting Lifecycle

```
Account (Chart of Accounts: ASSET, LIABILITY, EQUITY, INCOME, EXPENSE)
        ↓
   Journal Entry (DRAFT) — min 2 lines, debits = credits
        ↓ post
   Journal Entry (POSTED) — immutable
        ↓ void (if needed)
   Journal Entry (VOID)
```

### 12.4 Inventory & Stock Movement

**Inventory** tracks per `(productId, warehouseId)`:
- `quantityOnHand` — physical stock
- `reservedQuantity` — reserved for rental orders
- `availableQuantity` = `quantityOnHand - reservedQuantity` (computed)

**Stock Movement** (immutable ledger, maps to `InventoryTransaction`):
| Type | Effect |
|------|--------|
| `IN` | `quantityOnHand++` |
| `OUT` | `quantityOnHand--` (cannot exceed on-hand) |
| `RESERVE` | `reservedQuantity++` (cannot exceed available) |
| `RELEASE` | `reservedQuantity--` (cannot exceed reserved) |
| `ADJUSTMENT` | Direct `quantityOnHand` change (cannot go negative) |

### 12.5 Financial Conventions

- All monetary values: `Decimal(12,2)` in DB, `number` in DTOs
- Invoice totals: `subtotal - discount + tax = grandTotal`; `balance = grandTotal - paidAmount`
- Journal entries: double-entry, `sum(debits) = sum(credits)`, min 2 lines
- Reference linking: `JournalReferenceType` (RENTAL_INVOICE, PAYMENT, MANUAL, OTHER)
- Financial reports read **posted** journal entries only
- Account deactivation (not delete) — inactive accounts cannot receive journal lines

---

## 13. Completed Modules

### 13.1 Customer (Reference Implementation — Phase 5-002)

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Rental customer master data — first vertical-slice reference |
| **Path** | `src/modules/customer/` |
| **Services** | `createCustomer`, `updateCustomer`, `deleteCustomer`, `getCustomerById`, `listCustomers` |
| **API** | `GET/POST /api/customers`, `GET/PATCH/DELETE /api/customers/:id` |
| **Domain** | `Customer` entity; VOs: `CustomerCode`, `Cnic`, `PhoneNumber` |
| **Repository** | `ICustomerRepository` → `PrismaCustomerRepository` |
| **Dependencies** | Audit; referenced by Rental Orders, Invoices, Payments, Reporting |
| **Business Rules** | Name/address required; unique phone and customer code; `isActive` defaults true |
| **Tests** | domain, application, validation, API, prisma repository |

### 13.2 Supplier

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Supplier/vendor master data for procurement |
| **Services** | CRUD: `createSupplier`, `updateSupplier`, `deleteSupplier`, `getSupplierById`, `listSuppliers` |
| **API** | `GET/POST /api/suppliers`, `GET/PATCH/DELETE /api/suppliers/:id` |
| **Domain** | `Supplier`; VOs: `SupplierCode`, `Email`, `PhoneNumber` |
| **Dependencies** | Procurement, Reporting |
| **Tests** | 5 test files |

### 13.3 Warehouse

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Warehouse/location master data |
| **Services** | CRUD |
| **API** | `GET/POST /api/warehouses`, `GET/PATCH/DELETE /api/warehouses/:id` |
| **Domain** | `Warehouse`; VOs: `WarehouseCode`, `PhoneNumber` |
| **Dependencies** | Inventory, Procurement, Rental Orders, Repair, Maintenance, Reporting |
| **Tests** | 5 test files |

### 13.4 Product

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Rental product catalog with pricing |
| **Services** | CRUD |
| **API** | `GET/POST /api/products`, `GET/PATCH/DELETE /api/products/:id` |
| **Domain** | `Product`; VOs: `ProductCode`, `ProductName`, `RentalRate`, `ReplacementCost`, `Unit` |
| **Dependencies** | Inventory, Procurement, Rental Orders, Dispatch, Repair, Maintenance, Reporting |
| **Business Rules** | Rental rate/replacement cost validation via VOs |
| **Note** | `Category` Prisma model exists; no standalone category module (managed via product `categoryId`) |
| **Tests** | 5 test files |

### 13.5 Inventory (Phase 5-008)

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Per-product, per-warehouse stock balances |
| **Services** | CRUD |
| **API** | `GET/POST /api/inventory`, `GET/PATCH/DELETE /api/inventory/:id` |
| **Domain** | `Inventory` with computed `availableQuantity` |
| **Dependencies** | Stock Movement, Procurement, Dispatch, Return, Repair, Maintenance |
| **Business Rules** | `quantityOnHand >= 0`, `reservedQuantity >= 0`, `reservedQuantity <= quantityOnHand`; unique `(productId, warehouseId)` |
| **Tests** | 5 test files |

### 13.6 Stock Movement (Phase 5-009)

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Immutable inventory transaction ledger |
| **Services** | `createStockMovement`, `getStockMovementById`, `listStockMovements`, `createStockMovementInScope` |
| **API** | `GET/POST /api/stock-movements`, `GET /api/stock-movements/:id` (no update/delete) |
| **Domain** | `StockMovement` (maps to `InventoryTransaction`) |
| **Dependencies** | Inventory (required); called from Procurement, Rental Order, Dispatch, Return, Repair |
| **Business Rules** | Movement effects validated in `movement-effect.ts` (OUT, RESERVE, RELEASE, ADJUSTMENT constraints) |
| **Tests** | 5 test files |

### 13.7 Procurement

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Purchase order lifecycle with receiving |
| **Services** | `createPurchaseOrder`, `updatePurchaseOrder`, `getPurchaseOrderById`, `listPurchaseOrders`, `approvePurchaseOrder`, `receivePurchaseOrder`, `cancelPurchaseOrder` |
| **API** | CRUD + `POST .../approve`, `.../receive`, `.../cancel` |
| **Domain** | `PurchaseOrder`, `PurchaseOrderItem` |
| **Dependencies** | Supplier, Warehouse, Product, Inventory, Stock Movement, Audit |
| **Business Rules** | Status: update/approve in DRAFT; receive in APPROVED/PARTIALLY_RECEIVED; cancel blocked if RECEIVED or items received; receive drives stock IN movements |
| **Tests** | 7 test files |

### 13.8 Rental Orders

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Core rental booking workflow |
| **Services** | CRUD + `confirmRentalOrder`, `reserveRentalOrder`, `cancelRentalOrder` |
| **API** | CRUD + `POST .../confirm`, `.../reserve`, `.../cancel` |
| **Domain** | `RentalOrder`, `RentalOrderItem` |
| **Dependencies** | Customer, Warehouse, Product, Inventory, Stock Movement, Dispatch, Return, Rental Invoice, Reporting |
| **Business Rules** | `endDate > startDate`; confirm from DRAFT; reserve from CONFIRMED; cancel blocked if RESERVED or items reserved; `computeRentalDays`, `computeLineTotal` |
| **Tests** | 7 test files |

### 13.9 Dispatch

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Delivery of reserved rental items to customers |
| **Services** | CRUD + `completeDispatch`, `cancelDispatch` |
| **API** | CRUD + `POST .../complete`, `.../cancel` |
| **Domain** | `Dispatch`, `DispatchItem` |
| **Dependencies** | Rental Order, Inventory, Stock Movement, Return, Audit |
| **Business Rules** | Rental order must be CONFIRMED/RESERVED; dispatch qty ≤ reserved qty; delivery address required; complete from READY |
| **Tests** | 7 test files |

### 13.10 Returns

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Return inspection after dispatch |
| **Services** | CRUD + `receiveReturn`, `inspectReturn`, `completeReturn`, `cancelReturn` |
| **API** | CRUD + `POST .../receive`, `.../inspect`, `.../complete`, `.../cancel` |
| **Domain** | `Return` (maps to `ReturnInspection`), return items |
| **Dependencies** | Dispatch, Rental Order, Inventory, Stock Movement, Repair, Audit |
| **Business Rules** | Dispatch must be COMPLETED; return qty ≤ dispatched; inspection: good + damaged + lost = returned; `computeRestockQuantity` = good qty |
| **Tests** | 7 test files |

### 13.11 Repair

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Repair damaged items from return inspection |
| **Services** | CRUD + `startRepair`, `completeRepair`, `cancelRepair` |
| **API** | CRUD + `POST .../start`, `.../complete`, `.../cancel` |
| **Domain** | `Repair`, `RepairItem` |
| **Dependencies** | Return, Rental Order, Inventory, Stock Movement, Audit |
| **Business Rules** | Return must be COMPLETED; repair qty ≤ remaining damaged; cost ≥ 0; PENDING → IN_PROGRESS → COMPLETED |
| **Tests** | 7 test files |

### 13.12 Maintenance

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Scheduled preventive/corrective maintenance |
| **Services** | CRUD + `startMaintenance`, `completeMaintenance`, `cancelMaintenance` |
| **API** | CRUD + `POST .../start`, `.../complete`, `.../cancel` |
| **Domain** | `Maintenance` |
| **Dependencies** | Product, Warehouse, Inventory, Audit |
| **Business Rules** | Qty ≤ available inventory; service types: PREVENTIVE, CLEANING, INSPECTION, CALIBRATION, LUBRICATION, OTHER; SCHEDULED → IN_PROGRESS → COMPLETED |
| **Tests** | 7 test files |

### 13.13 Rental Invoice

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Billing invoices for completed rental orders |
| **Services** | CRUD + `issueRentalInvoice`, `voidRentalInvoice` |
| **API** | CRUD + `POST .../issue`, `.../void` |
| **Domain** | `RentalInvoice`, `RentalInvoiceItem` |
| **Repositories** | `IRentalInvoiceRepository`, `IRentalOrderInvoiceLookup` |
| **Dependencies** | Rental Order, Customer, Payment, Audit |
| **Business Rules** | Rental order must be COMPLETED; customer must match; line types: RENTAL_CHARGE, DELIVERY, DAMAGE, DISCOUNT, TAX; issue from DRAFT; void blocked if PAID |
| **Tests** | 7 test files |

### 13.14 Payments

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Customer payments against rental invoices |
| **Services** | CRUD + `postPayment`, `voidPayment` |
| **API** | CRUD + `POST .../post`, `.../void` |
| **Domain** | `Payment` |
| **Dependencies** | Rental Invoice, Customer, Audit |
| **Business Rules** | Amount > 0, ≤ invoice balance; invoice must be ISSUED/PARTIALLY_PAID; customer must match; PENDING → POSTED; posted immutable |
| **Tests** | 7 test files |

### 13.15 Accounting

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Chart of accounts and double-entry journal entries |
| **Services** | Account CRUD; Journal Entry CRUD + `postJournalEntry`, `voidJournalEntry` |
| **API** | `/api/accounts`, `/api/journal-entries` + post/void actions |
| **Domain** | `Account`, `JournalEntry`, `JournalLine` |
| **Dependencies** | Financial Reports |
| **Business Rules** | Min 2 lines, debits = credits; inactive accounts blocked; update/post only in DRAFT |
| **Tests** | 12 test files (includes balancing tests) |

### 13.16 Financial Reports (Phase 5-019)

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Read-only financial analytics from posted journal data |
| **Services** | `getTrialBalance`, `getBalanceSheet`, `getProfitLoss`, `getGeneralLedger`, `getAccountLedger`, `getJournalReport`, `getCashFlowSummary`, `getRevenueSummary`, `getExpenseSummary`, `getAccountsSummary` |
| **API** | 10 GET endpoints under `/api/financial-reports/*` |
| **Domain** | No entities — `IFinancialReportRepository`, aggregation rules |
| **Permission** | `financial-reports:read` |
| **Dependencies** | Accounting |
| **Tests** | 11 test files |

### 13.17 Reporting + Dashboard (Phase 5-020)

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Operational BI reports across all modules |
| **Services** | `getDashboard`, `getInventoryReport`, `getRentalReport`, `getDispatchReport`, `getReturnReport`, `getRepairReport`, `getMaintenanceReport`, `getProcurementReport`, `getCustomerReport`, `getSupplierReport`, `getWarehouseReport`, `getProductReport` |
| **API** | 12 GET endpoints under `/api/reports/*` |
| **Dashboard** | `GET /api/reports/dashboard` — summary metrics with optional date range |
| **Permission** | `reports:read` |
| **Dependencies** | Reads all operational modules via Prisma |
| **Note** | Prisma `Dashboard`/`DashboardWidget`/`UserDashboard` models exist but layout CRUD not implemented |
| **Tests** | 11 test files |

---

## 14. Cross-Cutting Concerns

### 14.1 Authentication

**Path:** `src/lib/auth/`

| Component | Detail |
|-----------|--------|
| Library | better-auth 1.6 |
| Config | `config.ts` — Prisma adapter, 7-day sessions, sign-up disabled |
| API | `GET/POST /api/auth/[...all]` |
| Prisma | `User`, `Role` models |
| Rules | Min password 8 chars; role on user; `DEFAULT_USER_ROLE = viewer` |

### 14.2 Authorization / RBAC

**Path:** `src/shared/application/authorization/`

| Component | Detail |
|-----------|--------|
| Permissions | `permissions.ts` — all permission strings |
| Role mapping | `role-permissions.ts` |
| Enforcement | `authorize.ts` — `can()`, `assertPermission()`, `assertAny()`, `assertAll()` |
| Roles | owner, manager, worker, accountant, viewer |

No Next.js middleware for RBAC — enforced in route runners and services.

### 14.3 Audit

**Path:** `src/shared/infrastructure/audit/`

- Write-only infrastructure (no query API)
- Permission `audit:read` defined but no REST endpoint
- Every module write service produces audit entries
- Persists to `AuditLog` Prisma model

### 14.4 Notifications

**Path:** `src/shared/infrastructure/notifications/`

- Template-based enqueue via `INotificationService`
- Persists `Notification` + `NotificationRecipient`
- No REST API (permissions exist: `notifications:read`, `notifications:send`)
- Channel adapters placeholder

### 14.5 Shared Infrastructure Summary

All cross-cutting platform services are accessed via `SharedDeps`:

```
SharedDeps
├── logger (ILogger)
├── prisma (PrismaClient)
├── transactionManager (ITransactionManager)
├── auditLogger (IAuditLogger)
├── notificationService (INotificationService)
└── fileStorage (IFileStorage)
```

---

## 15. Rules For Future Cursor Sessions

### Architecture — DO NOT CHANGE

1. **Never change existing architecture.** The Clean Architecture layer structure, dependency direction, and module layout are frozen.
2. **Never break previous modules.** Changes must be additive or bug fixes within existing patterns.
3. **Never introduce new patterns.** Mirror existing implementations exactly.
4. **Never duplicate code.** Reuse shared infrastructure and existing module patterns.
5. **Never use a DI framework.** Continue with explicit factory functions.

### Implementation — ALWAYS REUSE

6. **Reuse shared infrastructure:** `SharedDeps`, `RepositoryRunner`, `ObservableRepositoryRunner`, `UnitOfWork`, audit, notifications.
7. **Reuse route runners:** Copy `*-api.route-runner.ts` pattern from an existing module.
8. **Reuse factories:** Three factories per module (repository, services, transaction runner).
9. **Reuse `createSharedDepsFromExecutionContext(ctx)`** in all composition roots.
10. **Reuse `parseRequest`** for all Zod validation at presentation layer.
11. **Reuse `runRepositoryPagedQuery`** for all list endpoints.
12. **Reuse `runWithRepositoryUnitOfWork`** for all cross-module writes.
13. **Reuse `AuditLogger`** in all write services.
14. **Reuse permission constants** from `permissions.ts` — add new permissions there and in `role-permissions.ts`.

### New Module Checklist

When adding a new module (e.g. Phase 6+), follow this exact sequence:

1. **Prisma:** Add models + migration (`YYYYMMDDHHMMSS_{name}`)
2. **Domain:** Entity, errors, types, constants, repository interface, rules (if workflow)
3. **Application:** DTOs, schemas, mappers, services (one per use case), transaction runner interface
4. **Infrastructure:** Persistence mapper, Prisma repository, three factories
5. **Presentation:** Route constants, API routes, route runner, response mapper
6. **Composition:** `app/api/{resource}/_composition/resolve-*-services.ts`
7. **Next.js routes:** Thin adapters in `app/api/{resource}/`
8. **Permissions:** Add to `permissions.ts` + `role-permissions.ts`
9. **Tests:** domain, status (if workflow), validation, application, service, API, in-memory repo
10. **Reference modules:** Use `customer` (simple CRUD) or `repair` (workflow + UoW) as templates

### Forbidden Actions

- Do NOT import Prisma in domain or application layers
- Do NOT put business logic in Next.js route files
- Do NOT create ad-hoc Prisma calls outside repositories
- Do NOT skip audit logging on write operations
- Do NOT skip RBAC permission checks on API endpoints
- Do NOT modify existing Prisma migrations
- Do NOT implement soft delete (not approved yet)
- Do NOT change the API response envelope format
- Do NOT use `withHandler` for new modules (use per-module route runners)

### Canonical Reference Files

| Pattern | Reference File |
|---------|---------------|
| Simple CRUD module | `src/modules/customer/` |
| Workflow + UoW module | `src/modules/repair/` |
| Read-only reports | `src/modules/reporting/` |
| Financial reports | `src/modules/financial-report/` |
| Route runner | `src/modules/repair/presentation/http/repair-api.route-runner.ts` |
| Transaction runner | `src/modules/repair/infrastructure/factories/create-repair-transaction.runner.ts` |
| Composition root | `src/app/api/repairs/_composition/resolve-repair-services.ts` |
| Shared infrastructure | `docs/architecture/phase-4b-infrastructure.md` |
| Module scaffold | `src/modules/_template/` |

---

## 16. Current Project Status

### Completed Phases

| Phase | Status |
|-------|--------|
| Phase 4A — Application Contracts | ✅ Complete |
| Phase 4B — Shared Infrastructure (4B-001 to 4B-010) | ✅ Complete |
| Phase 5-002 — Customer (reference) | ✅ Complete |
| Phase 5-003 to 5-007 — Supplier, Warehouse, Product | ✅ Complete |
| Phase 5-008 — Inventory | ✅ Complete |
| Phase 5-009 — Stock Movement | ✅ Complete |
| Phase 5-010 to 5-015 — Procurement through Maintenance | ✅ Complete |
| Phase 5-016 to 5-018 — Invoice, Payment, Accounting | ✅ Complete |
| Phase 5-019 — Financial Reports | ✅ Complete |
| Phase 5-020 — Reporting + Dashboard | ✅ Complete |

### Completed Modules (17 full + 3 cross-cutting)

| Category | Modules |
|----------|---------|
| Master Data | Customer, Supplier, Warehouse, Product |
| Inventory | Inventory, Stock Movement, Procurement |
| Rental Operations | Rental Orders, Dispatch, Returns, Repair, Maintenance |
| Financial | Rental Invoice, Payments, Accounting, Financial Reports |
| Analytics | Reporting, Dashboard |
| Cross-Cutting | Authentication, Authorization/RBAC, Audit (infra), Notifications (infra) |

### Architecture Maturity

| Area | Status |
|------|--------|
| Clean Architecture layers | ✅ Fully established across all modules |
| SharedDeps composition | ✅ Complete |
| RepositoryRunner + Observable | ✅ Used by all repositories |
| Unit of Work | ✅ Used by all workflow modules |
| Audit logging | ✅ All write services |
| RBAC | ✅ All API endpoints |
| Notification infra | ✅ Infrastructure ready, no API |
| File storage | ✅ Infrastructure ready, unused |

### Testing Status

| Metric | Value |
|--------|-------|
| Test files | 127 |
| Tests passing | 1,869 |
| Test files with env dependency | 21 (API + Prisma repo tests require `.env`) |
| Coverage modules | 17 business modules configured |
| Test layers | Domain, application, validation, API, in-memory repo, prisma repo (mock) |

### API Coverage

| Metric | Value |
|--------|-------|
| Next.js route files | 79 |
| Business REST endpoints | ~78 (+ auth catch-all) |
| CRUD modules | 6 (customer, supplier, warehouse, product, inventory, accounts) |
| Workflow modules | 9 (procurement through maintenance) |
| Financial workflow | 3 (invoice, payment, journal entry) |
| Read-only reports | 22 (10 financial + 12 operational) |

### Prisma Status

| Metric | Value |
|--------|-------|
| Schema version | M3-FINAL-FIX |
| Models | ~40+ |
| Migrations | 15 |
| Soft delete | Not implemented |
| Generated client | `src/generated/prisma` |

### Infrastructure Status

| Component | Status |
|-----------|--------|
| Database (Prisma + PostgreSQL) | ✅ Production-ready |
| Auth (better-auth) | ✅ Complete |
| RBAC | ✅ Complete |
| Audit | ✅ Write path complete; read API pending |
| Notifications | ✅ Enqueue complete; read API + channel adapters pending |
| File Storage | ✅ Local adapter; S3 stub |
| UI (Next.js pages) | 🔶 Scaffold exists; not primary focus of Phase 5 |

### Not Yet Implemented

| Area | Schema/Permissions | Module Status |
|------|-------------------|---------------|
| Asset Management | ✅ Prisma + permissions | Domain only |
| Expense Module | ✅ Prisma + permissions | No module |
| Category CRUD | ✅ Prisma + `catalog:*` permissions | Via Product only |
| Dashboard Layout CRUD | ✅ Prisma models | Read-only dashboard only |
| Audit Query API | ✅ `audit:read` permission | No REST endpoint |
| Notifications API | ✅ Permissions | No REST endpoint |
| Settings Module | ✅ Prisma models | No module |
| Soft Delete | Planned | Not in schema |

### Estimated Completion Percentage

| Scope | Estimate |
|-------|----------|
| Backend API (Phase 5 scope) | **~95%** |
| Shared infrastructure | **100%** |
| Business modules (planned Phase 5) | **100%** |
| Prisma schema (planned models) | **~90%** (asset schema ready, module incomplete) |
| Test coverage | **~90%** (env-dependent tests need `.env` in CI) |
| Frontend UI | **~10%** (scaffold only) |
| Cross-cutting APIs (audit, notifications) | **~30%** (infra only) |
| **Overall project (backend-focused)** | **~85–90%** |

Phase 6 and beyond should focus on: Asset module, Expense module, Audit/Notifications APIs, Dashboard layout management, Settings module, UI development, and production hardening (soft delete, CI env for tests).

---

*End of ERP Master Specification*
