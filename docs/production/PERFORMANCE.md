# Performance Optimization (Phase 8-008)

Production performance strategy for Rental ERP. Optimizations preserve APIs, DTOs, business logic, and architecture. Redis, CDN, message queues, and load balancers are **out of scope** (future ops decisions).

## Strategy

| Layer | Approach |
|-------|----------|
| Next.js | Standalone output, package-import optimization, compression, image defaults, optional bundle analyze |
| Frontend | TanStack Query defaults, lazy charts / JSON viewer, existing dashboard dynamic charts |
| Backend | Existing paged queries (`Promise.all` count+rows), connection pooling (Phase 8-006), metrics (Phase 8-007) |
| Database | Review indexes; recommend composites without forcing a schema migration in this phase |
| Edge | Nginx gzip + static asset cache headers (Phase 8-005) |
| Caching | Browser/query cache for UI; no server response cache for mutable ERP writes |

## Applied optimizations

### Next.js (`next.config.ts`)

- `experimental.optimizePackageImports` for `lucide-react`, `recharts`, `date-fns`
- `compress: true` (Node/Next layer; Nginx also gzips client-facing responses)
- `images.formats` AVIF/WebP + cache TTL (ready when UI uses `next/image`)
- Optional bundle analyzer when `ANALYZE=true` (`npm run analyze`)

### Frontend

- Shared QueryClient: `staleTime` 2m, `gcTime` 10m, no refetch on window focus (mutations still invalidate)
- Financial report charts lazy-loaded (`recharts` split from initial page JS)
- Audit JSON viewer lazy-only barrel (no eager re-export)
- Dashboard charts were already dynamic (retained)

### Runtime / delivery

- Nginx gzip (level 5) + upstream keepalive (existing)
- Database pool tuning via `DATABASE_POOL_*` (Phase 8-006)
- Prometheus latency metrics at `/api/metrics` (Phase 8-007)

## Caching strategy

| Data | Cached? | Where | Why |
|------|---------|-------|-----|
| Static `/_next/static` | Yes | Nginx long cache | Immutable hashed assets |
| Public images/fonts | Yes | Nginx mid TTL | Rarely change |
| TanStack Query lists/details | Yes | Browser memory | UX; invalidated on mutations |
| Reference lookups (customers for filters) | Soft | Query `staleTime` 5m in hooks | Acceptable staleness |
| Mutating ERP APIs (orders, payments, stock) | **No** | — | Correctness over speed |
| `CACHE_TTL_SECONDS` env | Reserved | Config only | No Redis / HTTP cache layer in this phase |

Intentionally uncached: inventory quantities, payment/invoice status, auth sessions, audit writes.

## Database tuning notes

### Already strong

- Broad single-column indexes on status, foreign keys, dates, codes
- Composite examples already present: `RentalOrder(customerId, status)`, `RentalInvoice(customerId, status)`, `Payment(rentalInvoiceId, paymentDate)`, `Expense(expenseDate, status)`
- List endpoints use shared `executePagedQuery` (parallel `findMany` + `count`)

### Recommended composites (document only — add via migration after `EXPLAIN` in staging)

| Table | Suggested index | Typical filter |
|-------|-----------------|----------------|
| `audit_logs` | `(userId, createdAt DESC)` | User activity timelines |
| `audit_logs` | `(entityName, recordId)` | Entity history |
| `audit_logs` | `(module, createdAt DESC)` | Module audit views |
| `notification_recipients` | `(userId, isRead)` | Inbox unread badge / filter |
| `notifications` | `(createdAt DESC)` | Inbox ordering by notification time |

Do **not** apply blindly on huge tables without a maintenance window; prefer `CREATE INDEX CONCURRENTLY` in ops runbooks if locks are a concern (Prisma migrate uses transactional `CREATE INDEX`).

### Query shape follow-ups (no API change yet)

- Product list currently uses the same rich `include` as detail — consider a list-specific include in a later phase **only if** response DTOs already omit unused nests
- Rental order list includes all `items` — acceptable for current UI; revisit if payloads grow

## Bundle analysis

```bash
npm run analyze
# Opens client/server treemaps when the build finishes (ANALYZE=true)
```

Expect large contributors: `next`, charting (`recharts`), icon set (`lucide-react`), Prisma client (server). Package-import optimization and lazy charts reduce client initial JS for report routes.

## Scaling recommendations (future)

1. Horizontal app replicas + PgBouncer (documented in Phase 8-006)
2. Managed object storage + CDN for uploads/static (not now)
3. Redis for session/reference cache if multi-instance sticky cache is required
4. Read replica for heavy reporting queries
5. Split list vs detail Prisma selects after contract review

## Validation commands

```bash
npm run lint
npm run typecheck
npm run build
npm test
npm run analyze   # optional, slower
```

## Related

- [DATABASE_OPERATIONS.md](./DATABASE_OPERATIONS.md) — pool, backups
- [OBSERVABILITY.md](./OBSERVABILITY.md) — latency metrics
- [REVERSE_PROXY.md](./REVERSE_PROXY.md) — gzip / static caching
- [DOCKER.md](./DOCKER.md) — standalone image
