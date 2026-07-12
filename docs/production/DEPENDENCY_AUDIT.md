# Dependency Audit — Phase 8-001

**Project:** Rental ERP  
**Assessment date:** 2026-07-11  
**Node:** v22.16.0 (engines: `>=20`)  
**npm:** 10.9.2  
**Lockfile:** `package-lock.json` present

---

## Framework & Core Versions

| Package | Declared | Role |
|---------|----------|------|
| `next` | 16.2.10 | App framework |
| `react` / `react-dom` | 19.2.4 | UI runtime |
| `typescript` | ^5 (resolved 5.9.3) | Types |
| `@prisma/client` / `prisma` | ^7.8.0 | ORM |
| `zod` | ^4.4.3 | Validation |
| `better-auth` | ^1.6.23 | Authentication |
| `@tanstack/react-query` | ^5.101.2 | Client data |
| `axios` | ^1.18.1 | HTTP client |
| `recharts` | ^3.9.2 | Charts |
| `vitest` | ^4.1.10 | Tests |

Versions align with the project’s declared production stack.

---

## Production vs Development Dependencies

### Notable production dependencies

- Runtime: Next, React, Prisma client, Better Auth, Zod, TanStack Query, Axios, Recharts, RHF, UI primitives (`@base-ui/react`, `lucide-react`, `sonner`, etc.).
- **`shadcn` (^4.13.0)** is listed under `dependencies` but is a **CLI/codegen tool** — recommend moving to `devDependencies` in a later hygiene PR.

### Development dependencies

- ESLint + `eslint-config-next`, Tailwind PostCSS, Prisma CLI, Vitest + coverage, React types, Better Auth CLI, React Query Devtools.

### Missing / fragile direct dependencies

| Package | Issue |
|---------|-------|
| `dotenv` | Imported by `prisma.config.ts` (`import "dotenv/config"`) but **not** declared in `package.json`. Currently satisfied transitively (`@better-auth/cli` / `shadcn`). Fragile for production CI if transitive tree changes. |
| `pino` | Optional logger adapter requires `pino`; not installed. Build warns; falls back to console logger. |

---

## Unused / Duplicate Packages

| Finding | Notes |
|---------|-------|
| Duplicate utilities | Feature-level copies of similar UI helpers (e.g. sortable column headers) — code duplication, not npm duplication |
| Optional logging path | `pino-logger.ts` without `pino` package |
| Lockfile duplicates | Multiple nested `dotenv` versions appear under different tools (normal npm nesting) |

No unused major runtime framework packages were identified that should be removed immediately without a usage graph pass. A later `depcheck`/knip run is recommended.

---

## Security Vulnerabilities (`npm audit --omit=dev`)

**Result:** 6 moderate severity issues (transitive).

| Advisory area | Severity | Path (summary) | Notes |
|---------------|----------|----------------|-------|
| `@hono/node-server` | Moderate | via `@prisma/dev` → `prisma` | Middleware bypass via repeated slashes in `serveStatic` |
| `postcss` | Moderate | via `next` (and Better Auth → next) | XSS via unescaped `</style>` in CSS stringify |

`npm audit fix --force` suggests **breaking** downgrades/upgrades (e.g. Prisma 6 / ancient Next). **Do not force-fix.** Track upstream Next.js and Prisma releases instead.

---

## Deprecated / Stale Tooling Signals

| Signal | Notes |
|--------|-------|
| Next.js `middleware` file convention | Deprecated in favor of `proxy` — project still has `src/middleware.ts` |
| `NEXT_PUBLIC_APP_URL` | Marked deprecated in `env.d.ts` |
| Roadmap docs | Some roadmap percentages are stale relative to current feature-complete UI — documentation drift, not a package issue |

---

## Outdated Snapshot (`npm outdated`)

Non-blocking wanted/latest drift observed at assessment time (examples):

- `lucide-react` patch available
- `eslint` patch available
- `@types/node` major latest is 26 while project pins ^20 (acceptable)
- `typescript` latest major 7 exists; project on 5.x (do not jump majors casually)

---

## Recommendations

1. Move `shadcn` to `devDependencies`.
2. Add `dotenv` as a direct dependency (or remove the import and load env another supported way for Prisma 7).
3. Either add `pino` (+ pretty transport if desired) or stop exporting the pino adapter from the logging barrel used by DI.
4. Keep Next/Prisma on current majors; re-run `npm audit` after upgrades.
5. Add a periodic dependency review job in CI (Phase 8-002+).
6. Avoid `npm audit fix --force`.

---

## Verdict

**Needs Improvement** — stack is modern and coherent; hygiene and transitive advisories should be addressed before production cutover, without architecture changes.

---

## Phase 8-009 update (2026-07-11)

Scripts added:

- `npm run audit` — production dependency audit
- `npm run audit:ci` — fails on **high+** severity (`--audit-level=high`)

Latest run (omit=dev): **6 moderate** findings (transitive `postcss` via Next, Prisma tooling chain). **No high/critical.** `npm run audit:ci` exits 0. Do **not** run `npm audit fix --force` (suggests breaking Next downgrade). Track upstream Next/Prisma patches.
