import type { Prisma } from "@/generated/prisma/client";
import type { AuditContext } from "@/shared/infrastructure/audit/audit-logger.interface";
import { createTransactionScopedSharedDeps } from "@/shared/infrastructure/di/shared-deps";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";

import {
  createRepositoryBaseFromSharedDeps,
  createRepositoryRunnerFromSharedDeps,
} from "../create-repository-base";
import type { RepositoryUnitOfWorkContext } from "./unit-of-work-types";

export function createRepositoryUnitOfWorkContext(
  deps: SharedDeps,
  tx: Prisma.TransactionClient,
): RepositoryUnitOfWorkContext {
  const runner = createRepositoryRunnerFromSharedDeps(deps, tx);
  const repositoryBase = createRepositoryBaseFromSharedDeps(deps, tx);

  return {
    tx,
    deps,
    runner,
    repositoryBase,
    createRunner: () => createRepositoryRunnerFromSharedDeps(deps, tx),
    createRepositoryBase: () => createRepositoryBaseFromSharedDeps(deps, tx),
  };
}

export function createRepositoryUnitOfWorkContextForTransaction(
  deps: SharedDeps,
  tx: Prisma.TransactionClient,
  auditContext?: AuditContext,
): RepositoryUnitOfWorkContext {
  const transactionDeps = createTransactionScopedSharedDeps(
    { logger: deps.logger, auditContext },
    tx,
  );

  return createRepositoryUnitOfWorkContext(transactionDeps, tx);
}
