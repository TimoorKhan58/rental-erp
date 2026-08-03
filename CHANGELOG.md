# Changelog

All notable changes to Rental ERP are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[1.0.1]: https://github.com/manyar-tent/rental-erp/releases/tag/v1.0.1
[0.1.0]: https://github.com/manyar-tent/rental-erp/releases/tag/v0.1.0
