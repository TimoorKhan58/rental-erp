# Performance Optimization

Production performance strategy for Rental ERP. Optimizations preserve APIs, DTOs, business logic, and architecture. Redis, CDN, message queues, and load balancers are **out of scope** (future ops decisions).

## Strategy

| Layer | Approach |
|-------|----------|
| Next.js | Standalone output, package-import optimization, compression, image defaults, optional bundle analyze |
| Frontend | TanStack Query defaults, lazy charts / JSON viewer, reduced dashboard poll rate |
| Backend | Paged queries (`Promise.all` count+rows), DB `groupBy`/`aggregate` for dashboards & financial totals, connection pooling, metrics |
| Database | Additive indexes for auth FKs, report date filters, return/dispatch item FKs, notification inbox |
| Edge | Nginx gzip + static asset cache headers |
| Caching | Browser/query cache for UI; no server response cache for mutable ERP writes |

## Phase 18 RC1 applied optimizations

### Reporting / dashboard

- `getDashboard`: status counts via Prisma `groupBy`; inventory qty via `_sum`; lean duration rows only for non-cancelled orders
- `getInventoryReport` / `getRentalReport`: push warehouse/date/status/search filters into Prisma `where`; slim `select` projections
- `getRentalInsights`: filter order items by booking date in SQL; index items by product in memory; lean product select

### Inventory

- `stockStatus` list path: SQL predicates + DB `LIMIT`/`OFFSET` (no full-table load + JS slice)
- Batch `findByProductsAndWarehouse` for reserve / dispatch / return / receive (eliminates N+1 inventory lookups)

### Financial

- Trial balance aggregates: `journalEntryLine.groupBy` by `accountId` with `_sum`
- Cash flow expense total: `_sum.debit` instead of loading all expense lines

### Frontend / API

- Dashboard pulse + rental insights: `staleTime` / `refetchInterval` 5 minutes (was 30s / 60s)
- Dashboard route deep-imports `DashboardPage` (avoids unused recharts chart barrel exports)
- Successful API requests log at `debug` unless duration ≥ 500ms (`info`)

### Schema indexes (migration `20260730120000_phase18_performance_indexes`)

Auth session/account `userId`, PO `orderDate`, rental `bookingDate`/`createdAt`, dispatch/return item FKs, inventory transaction reference + creator, notification recipient `(userId, isRead)` + `notificationId`.

## Intentionally deferred (no change)

| Area | Why |
|------|-----|
| Product list rich `include` | List DTO requires full `ProductRecord` metadata; changing projection would alter API contract |
| Client summary cards (`pageSize: 100`) | Needs aggregate list-meta or thin stats endpoints (feature-shaped); document for Phase 19+ |
| Remaining report methods (dispatch/return/repair/procurement/customer/supplier/warehouse/product) | Same pattern as inventory/rental; apply incrementally under load testing |
| New caching systems | Explicitly out of scope for this phase |
| List virtualization | Default page size 20 is acceptable |

## Caching strategy

| Data | Cached? | Where | Why |
|------|---------|-------|-----|
| Static `/_next/static` | Yes | Nginx long cache | Immutable hashed assets |
| Public images/fonts | Yes | Nginx mid TTL | Rarely change |
| TanStack Query lists/details | Yes | Browser memory | UX; invalidated on mutations |
| Dashboard pulse / insights | Soft | Query `staleTime` 5m | Acceptable operational staleness |
| Mutating ERP APIs | **No** | — | Correctness over speed |

## Bundle analysis

```bash
npm run analyze
```

## Validation commands

```bash
npm run lint
npm run typecheck
npm run build
npm test
npm run db:migrate:deploy   # applies Phase 18 indexes
```

## Related

- [DATABASE_OPERATIONS.md](./DATABASE_OPERATIONS.md)
- [OBSERVABILITY.md](./OBSERVABILITY.md)
- [REVERSE_PROXY.md](./REVERSE_PROXY.md)
- [DOCKER.md](./DOCKER.md)
