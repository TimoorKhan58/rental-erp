# Contributing to Rental ERP

Thank you for contributing to Rental ERP — the enterprise rental management system for **Manyar Tent Service** (Pakistan).

This document defines the standards and workflow for all contributors. Follow these guidelines to keep the codebase consistent, reviewable, and maintainable.

---

## Coding Standards

### TypeScript

- **Strict mode is required.** Do not disable strict compiler options without team approval.
- **Never use `any`.** Use `unknown`, generics, or proper types instead.
- **Prefer explicit return types** on exported functions and public APIs.
- **Use the `@/*` import alias** for paths under `src/`.

### Architecture

- **Feature-based modules** live in `src/modules/`. Each module owns its domain logic.
- **Shared code** lives in `src/shared/`. Only place code here if it is reused across two or more modules.
- **Routing only in `src/app/`.** Pages and layouts compose module components; they do not contain business logic.
- Follow **SOLID**, **DRY**, and **KISS** principles. Prefer clarity over cleverness.

### Naming Conventions

| Item | Convention | Example |
| ---- | ---------- | ------- |
| Files (components) | kebab-case | `rental-form.tsx` |
| Files (utilities) | kebab-case | `format-date.ts` |
| React components | PascalCase | `RentalForm` |
| Functions / variables | camelCase | `calculateTotal` |
| Constants | UPPER_SNAKE_CASE | `MAX_RENTAL_DAYS` |
| Types / interfaces | PascalCase | `RentalOrder` |

### Code Style

- Use **ESLint** (`npm run lint`) before submitting changes.
- Keep functions small and focused on a single responsibility.
- Add comments only for non-obvious business rules or complex logic.
- Do not commit commented-out code, debug statements, or placeholder business logic.

### File Organization

```
src/
├── app/           # Routes, layouts, pages
├── modules/       # Feature modules (domain-specific)
└── shared/        # Reusable cross-cutting code
    ├── components/
    ├── config/
    ├── constants/
    ├── hooks/
    ├── lib/
    ├── services/
    ├── types/
    └── utils/
```

---

## Branch Naming

Use descriptive, lowercase branch names with a type prefix:

| Prefix | Purpose | Example |
| ------ | ------- | ------- |
| `feature/` | New functionality | `feature/inventory-list` |
| `fix/` | Bug fixes | `fix/rental-date-validation` |
| `refactor/` | Code restructuring | `refactor/shared-date-utils` |
| `docs/` | Documentation only | `docs/api-endpoints` |
| `chore/` | Tooling, config, deps | `chore/eslint-rules` |

**Rules:**

- Use hyphens to separate words (no spaces or underscores).
- Keep names concise but meaningful.
- One feature or fix per branch.

---

## Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short description>

[optional body]

[optional footer]
```

### Types

| Type | Use for |
| ---- | ------- |
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation changes |
| `style` | Formatting (no logic change) |
| `refactor` | Code restructuring |
| `test` | Adding or updating tests |
| `chore` | Build, tooling, dependencies |

### Examples

```
feat(inventory): add tent category filter

fix(booking): correct end-date calculation for multi-day rentals

docs(api): document rental order endpoints

chore(deps): update Next.js to 16.2.10
```

### Rules

- Use imperative mood in the subject line ("add feature" not "added feature").
- Keep the subject line under 72 characters.
- Reference issue or task IDs in the footer when applicable (e.g. `Refs: M2-T003`).

---

## Code Review Process

1. **Create a branch** from `main` (or the current integration branch).
2. **Make focused changes** — one logical unit of work per pull request.
3. **Run checks locally** before opening a PR:
   ```bash
   npm run lint
   npm run build
   ```
4. **Open a pull request** with:
   - Clear title following commit message conventions
   - Description of what changed and why
   - Screenshots for UI changes (when applicable)
   - Test plan or verification steps
5. **Request review** from at least one team member.
6. **Address feedback** — resolve all comments before merge.
7. **Squash or merge** according to team preference once approved.

### Review Checklist

- [ ] Code follows architecture and naming conventions
- [ ] No `any` types or hardcoded secrets
- [ ] ESLint and build pass
- [ ] Changes are scoped appropriately (no unrelated edits)
- [ ] Documentation updated if behavior or structure changed

---

## Best Practices

### Do

- Write self-documenting code with clear names.
- Keep pull requests small and reviewable.
- Update `CHANGELOG.md` for user-facing or notable changes.
- Document architectural decisions in `docs/decisions/` (ADR format).
- Use environment variables for configuration and secrets.
- Test locally before pushing.

### Do Not

- Commit secrets, `.env` files, or credentials.
- Push directly to `main` without review.
- Add dependencies without justification.
- Mix unrelated changes in a single commit or PR.
- Implement business modules outside the agreed milestone plan.

### Environment Setup

```bash
npm install
npm run dev
```

See [README.md](./README.md) for full setup instructions.

---

## Questions

For process or architecture questions, discuss with the project lead before starting significant work.
