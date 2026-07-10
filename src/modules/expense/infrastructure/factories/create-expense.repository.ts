import type { Prisma } from "@/generated/prisma/client";
import type { IExpenseRepository } from "@/modules/expense/domain/expense.repository.interface";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";
import type { RepositoryUnitOfWorkContext } from "@/shared/infrastructure/database";
import { createObservableRepositoryRunnerFromSharedDeps } from "@/shared/infrastructure/database";

import { PrismaExpenseRepository } from "../repositories/prisma-expense.repository";

export function createExpenseRepository(
  deps: Pick<SharedDeps, "prisma" | "logger">,
  tx?: Prisma.TransactionClient,
): IExpenseRepository {
  const runner = createObservableRepositoryRunnerFromSharedDeps(deps, {
    tx,
    repositoryName: "ExpenseRepository",
  });

  return new PrismaExpenseRepository(runner);
}

export function createExpenseRepositoryFromUnitOfWork(
  context: RepositoryUnitOfWorkContext,
): IExpenseRepository {
  return createExpenseRepository(context.deps, context.tx);
}

export function createExpenseRepositoryFromSharedDeps(
  deps: SharedDeps,
  tx?: Prisma.TransactionClient,
): IExpenseRepository {
  return createExpenseRepository(deps, tx);
}
