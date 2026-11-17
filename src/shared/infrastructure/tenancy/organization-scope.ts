import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Which organization (business) the current request works for.
 *
 * - `organization`: a signed-in user's business; every query on a
 *   per-business table is limited to it.
 * - `system`: platform code that legitimately runs before a business is
 *   known (sign-in checks, health checks). Not limited — use sparingly.
 */
export type OrganizationScope =
  | { readonly kind: "organization"; readonly organizationId: string }
  | { readonly kind: "system"; readonly reason: string };

// One store per process. Next.js bundles route handlers separately, so a
// plain module-level instance would exist once per bundle while the shared
// Prisma client (a globalThis singleton) reads only the instance from the
// bundle that created it. Keeping the store on globalThis makes every bundle
// set and read the same scope.
const globalForScope = globalThis as unknown as {
  rentcoreOrganizationScope?: AsyncLocalStorage<OrganizationScope>;
};

const organizationScopeAls = (globalForScope.rentcoreOrganizationScope ??=
  new AsyncLocalStorage<OrganizationScope>());

export class OrganizationScopeMissingError extends Error {
  constructor(model: string, operation: string) {
    super(
      `No organization scope for ${model}.${operation}. Per-business data can only be ` +
        "read or written inside a signed-in request (or an explicit system scope).",
    );
    this.name = "OrganizationScopeMissingError";
  }
}

export class CrossOrganizationWriteError extends Error {
  constructor(model: string) {
    super(`Refused to write ${model} for a different organization than the signed-in one.`);
    this.name = "CrossOrganizationWriteError";
  }
}

/** Sets the organization for the rest of the current async request flow. */
export function enterOrganizationScope(organizationId: string): void {
  organizationScopeAls.enterWith({ kind: "organization", organizationId });
}

/**
 * Runs `operation` limited to one organization.
 *
 * The result is awaited inside the scope on purpose: Prisma queries are lazy
 * and only execute when awaited, so returning an un-awaited query would run
 * it after the scope ended.
 */
export function runInOrganization<T>(
  organizationId: string,
  operation: () => T | PromiseLike<T>,
): Promise<T> {
  return organizationScopeAls.run({ kind: "organization", organizationId }, async () => await operation());
}

/** Runs platform code that may touch per-business tables without a business. */
export function runAsSystem<T>(reason: string, operation: () => T | PromiseLike<T>): Promise<T> {
  return organizationScopeAls.run({ kind: "system", reason }, async () => await operation());
}

export function getOrganizationScope(): OrganizationScope | undefined {
  return organizationScopeAls.getStore();
}
