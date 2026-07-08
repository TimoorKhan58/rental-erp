import type { ExecutionContext } from "@/shared/application/context";
import type { AuditContext } from "@/shared/infrastructure/audit/audit-logger.interface";
import {
  createSharedDepsFromExecutionContext,
  type SharedDeps,
} from "@/shared/infrastructure/di/shared-deps";

import { createRepositoryUnitOfWorkContext } from "./create-repository-unit-of-work-context";
import { runWithRepositoryUnitOfWork } from "./run-with-repository-unit-of-work";
import type {
  RepositoryUnitOfWorkContext,
  UnitOfWorkOperation,
  UnitOfWorkRepositoryFactory,
} from "./unit-of-work-types";

export async function runWithRepositoryUnitOfWorkFromExecutionContext<T>(
  ctx: ExecutionContext,
  operation: (context: RepositoryUnitOfWorkContext) => Promise<T>,
  auditContext?: AuditContext,
): Promise<T> {
  if (ctx.tx) {
    const deps = createSharedDepsFromExecutionContext(ctx);
    return operation(createRepositoryUnitOfWorkContext(deps, ctx.tx));
  }

  const deps = createSharedDepsFromExecutionContext(ctx);
  return runWithRepositoryUnitOfWork(deps, operation, auditContext);
}

export async function runWithUnitOfWorkRepositories<
  TRepositories,
  TResult,
>(
  deps: SharedDeps,
  createRepositories: UnitOfWorkRepositoryFactory<TRepositories>,
  operation: UnitOfWorkOperation<TRepositories, TResult>,
  auditContext?: AuditContext,
): Promise<TResult> {
  return runWithRepositoryUnitOfWork(
    deps,
    async (context) => {
      const repositories = createRepositories(context);
      return operation(repositories, context);
    },
    auditContext,
  );
}

export async function runWithUnitOfWorkRepositoriesFromExecutionContext<
  TRepositories,
  TResult,
>(
  ctx: ExecutionContext,
  createRepositories: UnitOfWorkRepositoryFactory<TRepositories>,
  operation: UnitOfWorkOperation<TRepositories, TResult>,
  auditContext?: AuditContext,
): Promise<TResult> {
  return runWithRepositoryUnitOfWorkFromExecutionContext(
    ctx,
    async (context) => {
      const repositories = createRepositories(context);
      return operation(repositories, context);
    },
    auditContext,
  );
}
