# Changelog

All notable changes to Rental ERP are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[0.1.0]: https://github.com/manyar-tent/rental-erp/releases/tag/v0.1.0
