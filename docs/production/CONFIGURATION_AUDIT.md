# Configuration Audit — Phase 8-001

**Project:** Rental ERP  
**Assessment date:** 2026-07-11

---

## next.config.ts

| Item | Finding |
|------|---------|
| File | Present (`next.config.ts`) |
| Content | Empty options object |
| Security headers | **Missing** |
| `images` remotePatterns | **Missing** (defaults only) |
| `output` / standalone | **Not set** (relevant for Docker later) |
| `poweredByHeader` | Default (Next may still send `X-Powered-By`) |
| React / compiler | Uses framework defaults |

**Production issue:** no hardening configuration yet. Expected input to a later hardening phase.

---

## TypeScript (`tsconfig.json`)

| Item | Finding |
|------|---------|
| `strict` | Enabled |
| Unused locals/parameters | Enabled |
| Fallthrough / casing | Enforced |
| Path aliases | Extensive `@/*` map for app/features/lib |
| Target | `ES2017` |
| Module resolution | `bundler` |

**Verdict:** Production-appropriate TypeScript posture.

---

## ESLint (`eslint.config.mjs`)

| Item | Finding |
|------|---------|
| Config | Flat config with `eslint-config-next` core-web-vitals + typescript |
| Ignores | `.next`, coverage, generated Prisma client |
| Assessed result | Pass with React Hook Form / React Compiler `incompatible-library` warnings |

**Verdict:** Healthy; warnings are non-blocking.

---

## Prettier

| Item | Finding |
|------|---------|
| Config file | **Not present** |
| package.json script | **Not present** |

**Verdict:** Needs Improvement for team formatting consistency (optional if editor-enforced).

---

## Tailwind / PostCSS

| Item | Finding |
|------|---------|
| Tailwind | v4 via `@tailwindcss/postcss` |
| `postcss.config.mjs` | Present |
| shadcn | `components.json` present (`base-nova` style) |

**Verdict:** Ready for current UI stack.

---

## Prisma

| Item | Finding |
|------|---------|
| Schema | `prisma/schema.prisma` — PostgreSQL |
| Client output | `src/generated/prisma` (gitignored) |
| Config | `prisma.config.ts` supplies datasource URL via shared database config |
| Scripts | `db:validate`, `db:generate`, `db:migrate`, `db:studio` |
| Assessed | `prisma validate` Pass; `prisma generate` Pass |

**Issues:**

- `prisma.config.ts` imports `dotenv/config` without a direct `dotenv` dependency.
- Datasource URL depends on validated `env` module (fail-fast) — good for safety, requires env before Prisma CLI.

---

## App Router

| Item | Finding |
|------|---------|
| Route groups | `(app)`, `(auth)`, `(public)` |
| API routes | Broad REST surface under `src/app/api/*` |
| Auth pages | Login/logout under `(auth)`; unauthorized under `(public)` |
| Rendering | Build shows mostly dynamic (`ƒ`) routes; `/unauthorized` static |

**Issues:**

- Deprecated `src/middleware.ts` still present; root `proxy.ts` also present. Build warns to migrate to proxy.

---

## Build / Bundle

| Item | Finding |
|------|---------|
| Builder | Next 16.2.10 Turbopack production build |
| Assessed build | Pass |
| Bundle analyzer | Not configured |
| Optional `pino` | Build warning — module not installed; console fallback |

---

## React / Query / Forms

| Item | Finding |
|------|---------|
| React | 19.2.x |
| TanStack Query | Present + optional Devtools in development |
| React Hook Form + Zod resolvers | Present |
| Themes | `next-themes` |

---

## Vitest

| Item | Finding |
|------|---------|
| Config | `vitest.config.ts` |
| Environment | `node` |
| Coverage includes | Most core business modules |
| Gaps | Notification/settings/audit/dashboard not fully mirrored in coverage include list relative to module inventory |

---

## Recommendations (no code changes in this phase)

1. Populate `next.config.ts` with security headers and production image policy.
2. Consolidate middleware → proxy.
3. Add direct `dotenv` dependency for Prisma config reliability.
4. Optionally add Prettier + format script.
5. Decide whether to add `pino` as a real dependency or remove the unused adapter path.
6. Consider `output: "standalone"` when Docker is introduced (Phase 8-002+).
