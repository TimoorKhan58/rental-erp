import type { Prisma } from "@/generated/prisma/client";
import type { AuditContext } from "@/shared/infrastructure/audit/audit-logger.interface";
import {
  runWithTransactionScopedSharedDeps,
  type SharedDeps,
} from "@/shared/infrastructure/di/shared-deps";

import {
  createRepositoryUnitOfWorkContext,
  createRepositoryUnitOfWorkContextForTransaction,
} from "./create-repository-unit-of-work-context";
import type { RepositoryUnitOfWorkContext } from "./unit-of-work-types";

export async function runWithRepositoryUnitOfWork<T>(
  deps: SharedDeps,
  operation: (context: RepositoryUnitOfWorkContext) => Promise<T>,
  auditContext?: AuditContext,
): Promise<T> {
  return runWithTransactionScopedSharedDeps(
    deps,
    (transactionDeps, tx) =>
      operation(createRepositoryUnitOfWorkContext(transactionDeps, tx)),
    auditContext,
  );
}

export function createTransactionScopedRepositoryContext(
  deps: SharedDeps,
  tx: Prisma.TransactionClient,
  auditContext?: AuditContext,
): RepositoryUnitOfWorkContext {
  return createRepositoryUnitOfWorkContextForTransaction(deps, tx, auditContext);
}
