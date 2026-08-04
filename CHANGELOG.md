# Changelog

All notable changes to Rental ERP are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.7] - 2026-08-04

### Fixed

- Ship Prisma migration for purchase-order `paidAmount`, `supplier_payments`, and `DocumentType.SUPPLIER_PAYMENT` so production `db:migrate:deploy` applies Phase B schema (v1.0.6 shipped code without a migration)

## [1.0.6] - 2026-08-04

### Added

- Create a new product inline while building purchase order line items
- Auto-create missing warehouse inventory when receiving a purchase order
- Supplier payments (AP) against purchase orders: record (PENDING), post, and void
- Purchase order `paidAmount`, `orderTotal`, and `balance` on API/UI detail
- Permissions `supplier-payments:read|create|post|void` and document sequence `SPAY-`

### Fixed

- Harden purchase-order persistence when `paidAmount` is missing/null

## [1.0.5] - 2026-08-04

### Added

- Create category and brand inline from product classification

### Changed

- Hide the dashboard “all clear” attention card when there is nothing to show

## [1.0.4] - 2026-08-03

### Fixed

- Restore `package.json` / `package-lock.json` sync for Next.js `16.2.12` so Render `npm ci` succeeds
- Restore accidentally deleted `runCatchingApiHandler` used by API route handlers
- Restore `sanitizeCallbackUrl` open-redirect protection on login
- Remove accidental `tmp-debug-auth.test.ts` and no-op `src/middleware.ts` (auth remains in `proxy.ts`)
- Pin Node engine to `22.x` to avoid Render selecting unsupported newer majors

### Changed

- Align `@next/bundle-analyzer` and `eslint-config-next` with Next.js `16.2.12`

## [1.0.3] - 2026-08-03

### Changed

- Procurement, payments, catalog, and user-management release packaging

### Known issues (superseded by 1.0.4)

- `package.json` Next pins were reverted to `16.2.10` without regenerating the lockfile (broke Render `npm ci`)
- Shared HTTP helpers were deleted while route imports remained

## [1.0.2] - 2026-08-02

### Changed

- Upgrade Next.js stack to `16.2.12` (with matching lockfile)
- API route error envelope via `runCatchingApiHandler`
- Login callback URL sanitization
- Maintenance / UX improvements for production on Render

## [1.0.1] - 2026-08-02

### Security

- Block inactive ERP users from creating new Better Auth sessions (`databaseHooks.session.create.before`)
- Enforce `User.isActive` on every authenticated API request and edge proxy session gate (fail closed)
- Prevent privilege escalation: only Owners may assign the Owner role
- Prevent demotion of the last active Owner account

### Fixed

- `/api/users/me` no longer requires `identity:read`, so Workers can load their own profile
- Actor role is now passed through identity write transactions so role-assignment rules can evaluate the caller

### Changed

- `package.json` version aligned to SemVer release `1.0.1` (was stale `0.1.0` under tag `v1.0.0`)

## [0.1.0] - 2026-07-07

### Added

- Initial Next.js 16 project scaffold with TypeScript, Tailwind CSS v4, ESLint, and App Router
- `src/` directory layout with feature-based folder structure:
  - `src/app/` — routing and pages
  - `src/modules/` — feature modules (placeholder)
  - `src/shared/` — shared components, hooks, lib, services, config, types, utils, constants
- Clean placeholder homepage (Rental ERP v0.1.0)
- Project documentation:
  - `README.md` — project overview, tech stack, folder structure, local setup
  - `CONTRIBUTING.md` — coding standards, branch naming, commit conventions, review process
  - `CHANGELOG.md` — version history
  - `docs/` — documentation folders for architecture, requirements, database, API, UI, deployment, and decisions
- TypeScript strict mode with additional compiler checks (`noUnusedLocals`, `noUnusedParameters`, etc.)
- Git repository with `.gitignore` configured for Node.js / Next.js development

### Changed

- Removed create-next-app demo content (default homepage, demo SVG assets, Geist fonts)
- Enhanced `.gitignore` for production build artifacts, logs, and environment files

[1.0.7]: https://github.com/manyar-tent/rental-erp/releases/tag/v1.0.7
[1.0.6]: https://github.com/manyar-tent/rental-erp/releases/tag/v1.0.6
[1.0.5]: https://github.com/manyar-tent/rental-erp/releases/tag/v1.0.5
[1.0.4]: https://github.com/manyar-tent/rental-erp/releases/tag/v1.0.4
[1.0.3]: https://github.com/manyar-tent/rental-erp/releases/tag/v1.0.3
[1.0.2]: https://github.com/manyar-tent/rental-erp/releases/tag/v1.0.2
[1.0.1]: https://github.com/manyar-tent/rental-erp/releases/tag/v1.0.1
[0.1.0]: https://github.com/manyar-tent/rental-erp/releases/tag/v0.1.0
