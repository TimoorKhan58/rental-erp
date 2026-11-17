import { AsyncLocalStorage } from "node:async_hooks";

import type { OrganizationScope } from "./organization-scope";
import { getOrganizationScope } from "./organization-scope";
import { TENANT_MODELS } from "./tenant-model-map";

/**
 * Database-session side of the organization scope (SaaS phase 2c).
 *
 * PostgreSQL row-level security reads two transaction-local settings:
 *   rentcore.organization_id — the business the query works for
 *   rentcore.system          — "on" for explicit platform (system) code
 * They are set with set_config(..., true), so they vanish when the
 * transaction ends and can never leak to the next user of a pooled
 * connection. With neither set, app connections see no per-business rows.
 */
export type RlsSettings = {
  /** Identity of the settings, to detect a scope change inside a transaction. */
  readonly key: string;
  readonly organizationId: string;
  readonly system: "on" | "";
};

export function rlsSettingsFor(scope: OrganizationScope | undefined): RlsSettings | undefined {
  if (scope === undefined) return undefined;
  if (scope.kind === "system") return { key: "system", organizationId: "", system: "on" };
  return { key: `org:${scope.organizationId}`, organizationId: scope.organizationId, system: "" };
}

export class TenantTransactionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TenantTransactionError";
  }
}

type TransactionState = { readonly key: string | undefined };

// On globalThis for the same reason as the organization scope store: Next.js
// bundles route handlers separately but they share one Prisma client.
const globalForRls = globalThis as unknown as {
  rentcoreRlsTransaction?: AsyncLocalStorage<TransactionState>;
};

const transactionAls = (globalForRls.rentcoreRlsTransaction ??=
  new AsyncLocalStorage<TransactionState>());

/** What to do with one query, given its transaction and the current scope. */
export type RlsPlan =
  | { readonly action: "run" }
  | { readonly action: "wrap"; readonly settings: RlsSettings };

/**
 * Decides how a query reaches the database:
 * - outside a transaction with a scope: wrap it in a short transaction that
 *   first sets the business ("wrap");
 * - inside an interactive transaction: the business was set when the
 *   transaction started (runTenantTransaction), so run it as is — but refuse
 *   if the transaction was not started that way or the scope changed since;
 * - inside a batch (our own wrapper) or with no scope at all: run as is.
 */
export function planRlsQuery(input: {
  readonly model: string | undefined;
  readonly transactionKind: string | undefined;
  readonly scope: OrganizationScope | undefined;
  readonly transaction: TransactionState | undefined;
}): RlsPlan {
  const settings = rlsSettingsFor(input.scope);

  if (input.transactionKind === "batch") return { action: "run" };

  if (input.transactionKind === "itx") {
    const touchesBusinessData = input.model === undefined || TENANT_MODELS.has(input.model);
    if (settings === undefined || !touchesBusinessData) return { action: "run" };

    if (input.transaction === undefined) {
      throw new TenantTransactionError(
        "Transactions that touch business data must be started with runTenantTransaction().",
      );
    }
    if (input.transaction.key !== settings.key) {
      throw new TenantTransactionError(
        "The organization scope changed inside a transaction; start a separate transaction instead.",
      );
    }
    return { action: "run" };
  }

  if (settings === undefined) return { action: "run" };
  return { action: "wrap", settings };
}

export function getRlsTransaction(): TransactionState | undefined {
  return transactionAls.getStore();
}

type RawCapableClient = {
  $executeRaw(query: TemplateStringsArray, ...values: unknown[]): PromiseLike<unknown>;
};

/** The statement that applies `settings` to the current transaction. */
export function applyRlsSettings(client: RawCapableClient, settings: RlsSettings): PromiseLike<unknown> {
  return client.$executeRaw`SELECT set_config('rentcore.organization_id', ${settings.organizationId}, true), set_config('rentcore.system', ${settings.system}, true)`;
}

type TransactionCapableClient<Tx> = {
  $transaction<R>(operation: (tx: Tx) => Promise<R>, options?: unknown): Promise<R>;
};

/**
 * Starts an interactive transaction for the current organization scope. Use
 * this instead of `prisma.$transaction(fn)`: it applies the business to the
 * transaction's connection before `operation` runs.
 */
export function runTenantTransaction<Tx, T>(
  client: TransactionCapableClient<Tx>,
  operation: (tx: Tx) => Promise<T>,
  options?: unknown,
): Promise<T> {
  const settings = rlsSettingsFor(getOrganizationScope());

  return client.$transaction(
    (tx) =>
      transactionAls.run({ key: settings?.key }, async () => {
        if (settings !== undefined) {
          await applyRlsSettings(tx as unknown as RawCapableClient, settings);
        }
        return await operation(tx);
      }),
    options,
  );
}
