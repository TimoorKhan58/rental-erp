# CI/CD Guide — Phase 8-004

**Project:** Rental ERP (`rental-erp/`)  
**Scope:** GitHub Actions validation pipelines only (no cloud deploy, no registry push, no Kubernetes)

---

## Overview

| Workflow | File | Triggers | Purpose |
|----------|------|----------|---------|
| Pull Request Validation | `.github/workflows/pull-request.yml` | Non-draft PRs | Fail-fast quality + build + Docker validation |
| Continuous Integration | `.github/workflows/ci.yml` | Push to `main` / `master` / `develop`, manual | Full quality gates, production build, Docker validation |
| Release Build | `.github/workflows/release.yml` | Tags `v*`, manual | Release validation + local Docker image build (no push) |

Reusable setup lives in `.github/actions/setup-node-ci` (Node LTS, npm cache, `npm ci`, Prisma generate, Prisma engine cache).

```mermaid
flowchart TD
  A[Push / PR / Tag] --> B{Event type}
  B -->|pull_request| C[pull-request.yml]
  B -->|push branch| D[ci.yml]
  B -->|tag v*| E[release.yml]
  C --> F[Quality + Build]
  C --> G[Docker build no push]
  D --> H[Quality Gates]
  H --> I[Production Build]
  H --> J[Docker build no push]
  E --> K[Release Validation]
  K --> L[Release Docker build no push]
```

---

## Pipeline Steps (fail-fast)

1. Checkout
2. Setup Node.js 22 (LTS) + npm cache
3. `npm ci`
4. Prisma generate (+ engine cache)
5. Prisma validate
6. ESLint (`npm run lint`)
7. TypeScript (`npm run typecheck`)
8. Unit tests (`npm test`)
9. Config checks (`npm run config:check`)
10. Production build (`npm run build`) — CI/PR/release
11. Docker production image build (`Dockerfile` target `runner`) — **push disabled**

Any failing step fails the job/workflow immediately.

---

## Branch Strategy

| Branch / ref | Expected workflow |
|--------------|-------------------|
| Feature branch → PR into `main` / `develop` | `pull-request.yml` |
| Merge / push to `main`, `master`, or `develop` | `ci.yml` |
| Annotated / lightweight tag `v1.2.3` | `release.yml` |

Recommendations:

- Keep PRs small and green before merge.
- Protect `main` / `develop` with required status checks (Quality Gates / PR Checks).
- Create release tags only from a green `main` commit.

---

## Secrets Management

### Used today (Phase 8-004)

Workflows use **non-secret CI placeholders** for build-time env validation (`APP_ENV=local`). No production credentials are required for CI to run.

| Placeholder | Purpose |
|-------------|---------|
| `DATABASE_URL` | Satisfies Prisma/env validation during generate/build |
| `BETTER_AUTH_SECRET` | Satisfies auth env validation during build |
| `APP_URL` / `BETTER_AUTH_URL` | Canonical URL placeholders |

These values are hardcoded as **CI-only placeholders** in workflow YAML (safe, non-production). They must never be used at runtime in staging/production.

### Required later (deploy phases) — configure as GitHub Secrets

Documented now so repositories can prepare secret stores. **Not consumed by Phase 8-004 workflows.**

| GitHub Secret | Description |
|---------------|-------------|
| `DATABASE_URL` | Production/staging PostgreSQL URL |
| `BETTER_AUTH_SECRET` | Auth signing secret (≥ 32 chars, unique) |
| `BETTER_AUTH_URL` | Public HTTPS origin for Better Auth |
| `APP_URL` | Public HTTPS application origin |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` / `SMTP_FROM` | Only if email is enabled |
| `DOCKER_REGISTRY_USERNAME` / `DOCKER_REGISTRY_TOKEN` | Future image publish (not used yet) |
| `DEPLOY_*` | Future deployment credentials (not used yet) |

Never commit real secrets. Prefer GitHub Environments (`staging`, `production`) with protection rules in later phases.

---

## Caching

| Cache | Mechanism |
|-------|-----------|
| npm | `actions/setup-node` `cache: npm` |
| Prisma engines | `actions/cache` on Prisma cache paths keyed by lockfile + schema |
| Docker layers | Buildx GHA cache (`cache-from` / `cache-to` type `gha`) |

---

## Manual Runs

1. Open **Actions** in GitHub.
2. Select **Continuous Integration** or **Release Build**.
3. Click **Run workflow**.
4. Choose branch/tag inputs as prompted.

---

## Local Validation Before Push

Run the same gates locally from `rental-erp/`:

```bash
# Use APP_ENV=local so hardened HTTPS/secret rules do not block local builds
export APP_ENV=local
export DATABASE_URL="postgresql://user:password@localhost:5432/rental_erp"
export BETTER_AUTH_SECRET="local-development-secret-value-32chars!"
export APP_URL="http://localhost:3000"
export BETTER_AUTH_URL="http://localhost:3000"

npm ci
npx prisma generate
npx prisma validate
npm run lint
npm run typecheck
npm test
npm run config:check
npm run build

# Optional Docker validation (no registry)
docker build --target runner -t rental-erp:local .
```

Windows PowerShell: set the same values with `$env:NAME="value"` and do **not** force `$env:NODE_ENV="development"` during `npm run build`.

---

## Troubleshooting

| Failure | Likely cause | Fix |
|---------|--------------|-----|
| Env validation errors | Missing CI placeholders | Ensure workflow `env` block is intact; locally set `APP_ENV=local` + required vars |
| Prisma generate fails | Lockfile/schema mismatch | Run `npm ci` and `npx prisma generate` locally |
| ESLint / typecheck | Code quality regressions | Fix locally with `npm run lint` / `npm run typecheck` |
| Tests fail | Broken unit tests or env | Run `npm test`; check Vitest output |
| Next.js build fails | Env or compile error | Reproduce with `npm run build` and `APP_ENV=local` |
| Docker build fails | Dockerfile / Buildx / env ARG | Build locally; confirm `Dockerfile` target `runner` |
| Duplicate PR checks | Multiple workflows on same event | PR uses `pull-request.yml` only; branch pushes use `ci.yml` |
| Cache misses | Lockfile changed | Expected on dependency updates; next run warms cache |

---

## Security Notes

- Workflows request least privilege (`contents: read`; PR workflow also `pull-requests: read`).
- No `pull_request_target` (avoids untrusted fork code with privileged secrets).
- No registry login, no deploy keys, no cloud credentials in this phase.
- Dependabot opens PRs for Actions/npm updates; merges still require CI.

---

## Related Docs

- [CONFIGURATION_GUIDE.md](./CONFIGURATION_GUIDE.md)
- [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md)
- [DOCKER.md](./DOCKER.md)
- [SECURITY_CHECKLIST.md](./SECURITY_CHECKLIST.md)
