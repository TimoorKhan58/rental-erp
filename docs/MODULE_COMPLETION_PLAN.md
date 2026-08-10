# Module Completion Plan

**Project:** Rental ERP (`rental-erp/`)  
**Audited:** 2026-08-06  
**Purpose:** Source of truth for modules that are incomplete, API-only, or unwired — what to finish and in what order.

> Note: `docs/ERP_REMAINING_ROADMAP.md` (July 10) is **stale**. Most frontend and platform modules it listed as missing now exist. Prefer this document for remaining work.

---

## Status legend

| Status | Meaning |
|--------|---------|
| ✅ Done | Domain + API + UI + nav wired |
| 🟡 Partial | Major pieces exist; gaps remain |
| 🔴 Missing UI | Backend/API ready; no feature pages / nav |
| ⬜ Stub | Placeholder / not implemented |

---

## Executive summary

| Area | Reality |
|------|---------|
| Core rental ops (customers → invoices/payments) | ✅ Wired end-to-end |
| Accounting + most reports | ✅ Working; CSV export live |
| Users / Settings / Audit / Notifications inbox | ✅ UI exists |
| **Assets** | ✅ UI wired (list/create/detail/edit + transfer/dispose/maintenance) — 2026-08-06 |
| **Expenses** | ✅ UI wired (list/create/detail/edit + workflow) — 2026-08-06 |
| **Catalog admin** | ✅ Tabbed admin at `/catalog` — 2026-08-06 |
| Notifications delivery | 🟡 Inbox works; **workflows enqueue in-app alerts**; empty channel adapters |
| Global search | ✅ Topbar routes to customers / orders / products list search |
| Report export | ✅ CSV done; PDF/Excel deferred |
| S3 storage / soft delete | ⬜ Deferred production items |

**Recommended finish order:** P0 → P1 → P2 → P3 below.

---

## Module inventory (one by one)

### Master Data

| Module | Backend | API | UI / Nav | Status | Gap |
|--------|---------|-----|----------|--------|-----|
| Customers | ✅ | `/api/customers` | ✅ `/customers` | ✅ Done | — |
| Suppliers | ✅ | `/api/suppliers` | ✅ `/suppliers` | ✅ Done | — |
| Warehouses | ✅ | `/api/warehouses` | ✅ `/warehouses` | ✅ Done | — |
| Products | ✅ | `/api/products` | ✅ `/products` | ✅ Done | — |
| Catalog (categories, brands, units, attributes, tags) | ✅ | `/api/categories` etc. | ✅ `/catalog` tabbed admin | ✅ Done | Wired 2026-08-06; product form pickers still work |
| Inventory | ✅ | `/api/inventory` | ✅ `/inventory` | ✅ Done | — |
| Stock movements | ✅ | `/api/stock-movements` | 🟡 Via inventory adjust | 🟡 Partial | No standalone list page (optional) |

### Operations

| Module | Backend | API | UI / Nav | Status | Gap |
|--------|---------|-----|----------|--------|-----|
| Procurement | ✅ | `/api/purchase-orders` | ✅ `/procurements` | ✅ Done | — |
| Supplier payments | ✅ | `/api/supplier-payments` | 🟡 Embedded in PO detail | ✅ Done | No top-level nav (OK) |
| Rental orders | ✅ | `/api/rental-orders` | ✅ list/calendar/new/detail | ✅ Done | — |
| Dispatch (Deliveries) | ✅ | `/api/dispatches` | ✅ `/dispatches` | ✅ Done | — |
| Returns | ✅ | `/api/returns` | ✅ `/returns` | ✅ Done | — |
| Repairs | ✅ | `/api/repairs` | ✅ `/repairs` | ✅ Done | — |
| Maintenance | ✅ | `/api/maintenances` | ✅ `/maintenance` | ✅ Done | — |

### Finance

| Module | Backend | API | UI / Nav | Status | Gap |
|--------|---------|-----|----------|--------|-----|
| Rental invoices | ✅ | `/api/rental-invoices` | ✅ | ✅ Done | — |
| Payments | ✅ | `/api/payments` | ✅ | ✅ Done | — |
| Accounting | ✅ | accounts + journals | ✅ `/accounting/*` | ✅ Done | — |
| Financial reports | ✅ | `/api/financial-reports/*` | ✅ hub + key pages | 🟡 Partial | Export stub |
| Operational reports | ✅ | `/api/reports/*` | ✅ hub + all operational pages | ✅ Done | Wired 2026-08-06; CSV export on list reports |
| **Expenses** | ✅ | `/api/expenses`, categories + submit/approve/reject/pay | ✅ `/expenses` list/new/detail/edit | ✅ Done | Wired 2026-08-06 |
| **Assets** | ✅ | `/api/assets`, categories + transfer/dispose/maintenance | ✅ `/assets` list/new/detail/edit | ✅ Done | Wired 2026-08-06 |

### Platform

| Module | Backend | API | UI / Nav | Status | Gap |
|--------|---------|-----|----------|--------|-----|
| Dashboard | ✅ | `/api/reports/dashboard`, layout API | ✅ `/dashboard` | 🟡 Partial | Widget layout underused |
| Users / Identity | ✅ | `/api/users`, `/api/roles` | ✅ `/users` | ✅ Done | — |
| Settings | ✅ | `/api/settings`, sequences | ✅ `/settings/*` | ✅ Done | — |
| Audit | ✅ | `/api/audit` | ✅ `/audit` | 🟡 Partial | 0 module tests |
| Notifications | ✅ inbox + enqueue | `/api/notifications` | ✅ list/detail + bell | 🟡 Partial | `channels/` empty; 0 tests |

### Infrastructure (cross-cutting)

| Item | Status | Gap |
|------|--------|-----|
| Local file storage | ✅ | — |
| S3 file storage | ⬜ | Throws: not implemented (`create-file-storage.ts`) |
| Soft delete | ⬜ | Planned in schema comments |
| Global topbar search | ✅ | Routes to module list pages with `?search=` |
| ComingSoon component | unused | Available if needed |

---

## Work packages (execution plan)

### P0 — Wire missing business UIs — ✅ Complete

#### WP-1: Expenses UI — ✅ Complete (2026-08-06)

**Goal:** Full expense lifecycle in the app.

| Task | Detail | Status |
|------|--------|--------|
| 1.1 | Add `ROUTES.expenses*` + sidebar item under Finance | ✅ |
| 1.2 | Create `src/features/expense` (list, detail, new, edit) | ✅ |
| 1.3 | Wire hooks to `/api/expenses` and `/api/expense-categories` | ✅ |
| 1.4 | Actions: submit → approve/reject → pay | ✅ |
| 1.5 | Expense categories admin (create from form dialog) | ✅ |
| 1.6 | Permissions already exist (`expenses:*`) — UI gates | ✅ |

**Acceptance:** Create, submit, approve, reject, pay expense from UI; appears in lists with filters.

#### WP-2: Assets UI — ✅ Complete (2026-08-06)

**Goal:** Manage fixed assets used in tent/event ops.

| Task | Detail | Status |
|------|--------|--------|
| 2.1 | Add `ROUTES.assets*` + sidebar (Master Data) | ✅ |
| 2.2 | Create `src/features/asset` (list, detail, new, edit) | ✅ |
| 2.3 | Wire categories + transfer / dispose / schedule maintenance | ✅ |
| 2.4 | Show transfer + maintenance history on detail | ✅ |

**Acceptance:** CRUD assets; transfer warehouse; dispose; add maintenance from asset.

---

### P1 — Catalog admin + report coverage

#### WP-3: Catalog admin screens — ✅ Complete (2026-08-06)

| Task | Detail | Status |
|------|--------|--------|
| 3.1 | Master Data → Catalog: Categories, Brands, Units CRUD | ✅ |
| 3.2 | Attributes & Tags management | ✅ |
| 3.3 | Product-form selectors kept; catalog admin invalidates product catalog keys | ✅ |

**Acceptance:** Full CRUD for all five catalog entities from `/catalog`.

#### WP-4: Operational report pages — ✅ Complete (2026-08-06)

Added report pages + hub/sub-nav for:

- `/reports/suppliers`
- `/reports/warehouses`
- `/reports/procurement`
- `/reports/dispatches`
- `/reports/returns`
- `/reports/repairs`
- `/reports/maintenance`

#### WP-5: Report export — ✅ CSV Complete (2026-08-06)

| Task | Detail | Status |
|------|--------|--------|
| 5.1 | Client-side **CSV** export via `downloadCsv` | ✅ |
| 5.2 | Export enabled for users with report read permission | ✅ |
| 5.3 | `ExportReportButton` replaces placeholder (CSV live; PDF/Excel still later) | ✅ |
| 5.4 | Later: Excel / PDF | Deferred |

---

### P2 — Notifications & UX wiring

#### WP-6: Notification enqueue from workflows — ✅ Complete (2026-08-10)

Call `enqueueWorkflowNotification()` on key events:

| Event | Service | Recipient |
|-------|---------|-----------|
| Rental order confirmed / cancelled | `ConfirmRentalOrderService`, `CancelRentalOrderService` | Order creator |
| Dispatch completed | `CompleteDispatchService` | Rental order creator |
| Return completed | `CompleteReturnService` | Rental order creator |
| Invoice issued | `IssueRentalInvoiceService` | Invoice creator |
| Payment posted | `PostPaymentService` | Payment creator |
| Expense approved / rejected | `ApproveExpenseService`, `RejectExpenseService` | Expense recorder |

- Templates seeded via `prisma db seed` (`SEED_NOTIFICATION_TEMPLATES`)
- Helper: `src/shared/infrastructure/notifications/enqueue-workflow-notification.ts`
- Low stock deferred (no workflow trigger yet)

#### WP-7: Channel adapters (optional for v1)

- Email adapter under `src/shared/infrastructure/notifications/channels/`
- Keep in-app as default; email behind env flag

#### WP-8: Small UX fixes — ✅ Complete (2026-08-10)

| Task | Detail | Status |
|------|--------|--------|
| 8.1 | Quick action “New Rental Order” → `ROUTES.rentalOrdersNew` | ✅ |
| 8.2 | Quick action “Receive Payment” → `ROUTES.paymentsNew` | ✅ |
| 8.3 | Topbar global search → customers / rental orders / products list pages | ✅ |
| 8.4 | Removed unused `dashboard/mock/` | ✅ |
| 8.5 | Removed sparkline placeholder from KPI cards | ✅ |

---

### P3 — Production hardening (defer unless deploying)

| Task | Detail | Priority |
|------|--------|----------|
| Soft delete (`deletedAt` / `deletedBy`) | Schema + repos | Medium |
| S3 storage adapter | `UPLOAD_STORAGE=s3` | Medium (only if multi-host) |
| Module tests | expense, catalog, notification, audit | Medium |
| Dashboard widget layout | Use Prisma Dashboard models fully | Low |

---

## Suggested session order (when we implement)

| Session | Scope | Outcome |
|---------|-------|---------|
| **1** | WP-1 Expenses UI | ✅ Done |
| **2** | WP-2 Assets UI | ✅ Done |
| **3** | WP-3 Catalog admin | ✅ Done |
| **4** | WP-4 + WP-5 Reports | ✅ Done |
| **5** | WP-6 + WP-8 Notifications & UX | ✅ Done |
| **6** | WP-7 / P3 | Channels + hardening as needed |

---

## Reference paths (for implementers)

| Concern | Path |
|---------|------|
| Nav | `src/constants/navigation.ts` |
| Routes | `src/config/routes.ts` |
| Expense API | `src/app/api/expenses/**`, `src/modules/expense` |
| Asset API | `src/app/api/assets/**`, `src/modules/asset` |
| Catalog API | `src/modules/catalog`, `/api/categories|brands|units|...` |
| Export stub | `src/features/financial-report/components/export-placeholder-button.tsx` |
| Notification enqueue | `src/shared/infrastructure/notifications/prisma-notification-service.ts` |
| UI pattern to copy | `src/features/payment` or `src/features/procurement` |

---

## What we will **not** treat as incomplete

- Core rental lifecycle modules with list/detail/new/edit pages (already wired)
- Supplier payments embedded in procurement detail (by design)
- Stock movements without a dedicated page (inventory covers adjust)
- `_template` module (scaffold only)

---

## Next step

Confirm which package to start with. Recommended next: **WP-7 channel adapters** or **P3 hardening** as needed for deployment.
