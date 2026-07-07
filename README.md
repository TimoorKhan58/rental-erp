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

**0.1.0** — Project foundation (Milestone 1)

## Documentation

| Document | Purpose |
| -------- | ------- |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Coding standards, branching, commits, and review process |
| [CHANGELOG.md](./CHANGELOG.md) | Version history and release notes |
| [docs/](./docs/) | Technical documentation (architecture, API, UI, deployment, etc.) |
