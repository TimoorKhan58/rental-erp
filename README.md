# Rental ERP

Enterprise rental management system for **Manyar Tent Service** (Pakistan).

Built to manage tent and event rental operations, with a long-term path toward a scalable, multi-tenant SaaS platform.

## Tech Stack

| Layer        | Technology                          |
| ------------ | ----------------------------------- |
| Framework    | [Next.js 16](https://nextjs.org) (App Router) |
| Language     | TypeScript (strict mode)            |
| Styling      | Tailwind CSS v4                     |
| ORM          | Prisma 7 + PostgreSQL               |
| Auth         | Better Auth                         |
| Linting      | ESLint (eslint-config-next)         |
| Runtime      | React 19 / Node.js 22+              |

## Purpose

Rental ERP centralizes rental business operations — inventory, bookings, customers, billing, and reporting — for tent and event rental companies.

## Folder Structure

```
rental-erp/
├── docs/                    # Project documentation
├── prisma/                  # Schema + migrations
├── scripts/                 # Ops / seed / admin scripts
├── src/
│   ├── app/                 # Next.js App Router (routes, layouts, pages)
│   ├── components/          # Shared UI / design-system components
│   ├── features/            # Frontend feature modules (pages, hooks, tables)
│   ├── lib/                 # Auth client, Prisma, utilities
│   ├── modules/             # Clean Architecture domain modules (API/backend)
│   ├── shared/              # Cross-cutting config, auth, HTTP, logging
│   ├── config/              # Route constants
│   └── constants/           # Roles, navigation
├── proxy.ts                 # Edge session gate (Next.js proxy)
├── eslint.config.mjs
├── next.config.ts
└── tsconfig.json
```

### Architecture Notes

- **`src/app/`** — Routing and page composition only. Keep business logic in modules.
- **`src/features/`** — UI feature modules (tables, forms, hooks) consumed by App Router pages.
- **`src/modules/`** — Domain / application / infrastructure / presentation (API) layers.
- **`src/shared/`** — Code reused across modules. Avoid importing module code from other modules directly.
- **`proxy.ts`** — Authenticates page routes; API RBAC remains in `authenticateApiRequest`.

## How to Run Locally

### Prerequisites

- Node.js 22+
- npm
- PostgreSQL (local or Docker)

### Setup

```bash
# Install dependencies
npm install

# Copy env template and fill secrets
cp .env.example .env

# Generate Prisma client + apply migrations
npm run db:generate
npm run db:migrate

# Optional: create first Owner admin
npm run create:admin

# Start development server
npm run dev
```

See [docs/setup/FIRST_RUN.md](./docs/setup/FIRST_RUN.md) for the full first-run path.

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Other Commands

```bash
npm run lint         # ESLint
npm run typecheck    # TypeScript --noEmit
npm test             # Vitest unit tests
npm run build        # prisma generate && next build
npm run start        # Production server (after build)
npm run db:migrate:deploy  # Apply migrations (staging/prod)
npm run create:admin       # Bootstrap Owner account
npm run config:check       # Validate env schema
```

## Deployment (Render)

Manual dashboard configuration (no `render.yaml` in-repo):

| Setting | Value |
|---------|-------|
| Build | `npm ci && npm run build` |
| Pre-Deploy | `npm run db:migrate:deploy` |
| Start | `npm run start` |

Required env: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `APP_URL`, `BETTER_AUTH_URL`, `APP_ENV=production`, `NODE_ENV=production`, and `METRICS_BEARER_TOKEN` when metrics are enabled.

Details: [docs/production/DEPLOYMENT.md](./docs/production/DEPLOYMENT.md).

## Version

**1.0.2** — Maintenance release (security polish, validation hardening, performance indexes). See [CHANGELOG.md](./CHANGELOG.md) and [docs/production/RELEASE_NOTES_v1.0.2.md](./docs/production/RELEASE_NOTES_v1.0.2.md).

## License

UNLICENSED — proprietary software for Manyar Tent Service.
