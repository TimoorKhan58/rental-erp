# Rental ERP

Enterprise rental management system for **Manyar Tent Service** (Pakistan).

Built to manage tent and event rental operations, with a long-term path toward a scalable, multi-tenant SaaS platform.

## Tech Stack

| Layer        | Technology                          |
| ------------ | ----------------------------------- |
| Framework    | [Next.js 16](https://nextjs.org) (App Router) |
| Language     | TypeScript (strict mode)            |
| Styling      | Tailwind CSS v4                     |
| Linting      | ESLint (eslint-config-next)         |
| Runtime      | React 19                            |

## Purpose

Rental ERP centralizes rental business operations — inventory, bookings, customers, billing, and reporting — for tent and event rental companies. This repository is the foundation for that platform.

## Folder Structure

```
rental-erp/
├── docs/                    # Project documentation
├── public/                  # Static assets
├── src/
│   ├── app/                 # Next.js App Router (routes, layouts, pages)
│   ├── modules/             # Feature modules (domain-specific code)
│   └── shared/              # Cross-cutting, reusable code
│       ├── components/      # Shared UI components
│       ├── config/          # App configuration
│       ├── constants/       # Application constants
│       ├── hooks/           # Shared React hooks
│       ├── lib/             # Third-party integrations & core utilities
│       ├── services/        # API / data access layer
│       ├── types/           # Shared TypeScript types
│       └── utils/           # Pure helper functions
├── eslint.config.mjs        # ESLint configuration
├── next.config.ts           # Next.js configuration
├── postcss.config.mjs       # PostCSS / Tailwind pipeline
└── tsconfig.json            # TypeScript configuration
```

### Architecture Notes

- **`src/app/`** — Routing and page composition only. Keep business logic in modules.
- **`src/modules/`** — Feature-based folders (e.g. customers, inventory) added as modules are built.
- **`src/shared/`** — Code reused across multiple modules. Avoid importing module code from other modules directly.

## How to Run Locally

### Prerequisites

- Node.js 20+
- npm

### Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Other Commands

```bash
npm run lint    # Run ESLint
npm run build   # Production build
npm run start   # Start production server (after build)
```

## Version

**0.1.0** — Feature-complete ERP with Phase 8 production engineering (see completion report).

## Documentation

| Document | Purpose |
| -------- | ------- |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Coding standards, branching, commits, and review process |
| [CHANGELOG.md](./CHANGELOG.md) | Version history and release notes |
| [docs/PROJECT_COMPLETION_REPORT.md](./docs/PROJECT_COMPLETION_REPORT.md) | Final project completion & production-ready verdict |
| [docs/production/README.md](./docs/production/README.md) | **Production documentation index (Phase 8)** |
| [docs/production/DEPLOYMENT.md](./docs/production/DEPLOYMENT.md) | Production deployment & go-live guide |
| [docs/](./docs/) | Technical documentation (architecture, API, UI, etc.) |
| [docs/production/CICD.md](./docs/production/CICD.md) | GitHub Actions CI/CD workflows |
| [docs/production/DOCKER.md](./docs/production/DOCKER.md) | Docker build and Compose guide |
| [docs/production/REVERSE_PROXY.md](./docs/production/REVERSE_PROXY.md) | Nginx reverse proxy and networking |
| [docs/production/CONFIGURATION_GUIDE.md](./docs/production/CONFIGURATION_GUIDE.md) | Environment-driven configuration |
