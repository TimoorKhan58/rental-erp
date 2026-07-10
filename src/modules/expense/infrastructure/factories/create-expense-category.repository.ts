import type { Prisma } from "@/generated/prisma/client";
import type { IExpenseCategoryRepository } from "@/modules/expense/domain/expense-category.repository.interface";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";
import type { RepositoryUnitOfWorkContext } from "@/shared/infrastructure/database";
import { createObservableRepositoryRunnerFromSharedDeps } from "@/shared/infrastructure/database";

import { PrismaExpenseCategoryRepository } from "../repositories/prisma-expense-category.repository";

export function createExpenseCategoryRepository(
  deps: Pick<SharedDeps, "prisma" | "logger">,
  tx?: Prisma.TransactionClient,
): IExpenseCategoryRepository {
  const runner = createObservableRepositoryRunnerFromSharedDeps(deps, {
    tx,
    repositoryName: "ExpenseCategoryRepository",
  });

  return new PrismaExpenseCategoryRepository(runner);
}

export function createExpenseCategoryRepositoryFromUnitOfWork(
  context: RepositoryUnitOfWorkContext,
): IExpenseCategoryRepository {
  return createExpenseCategoryRepository(context.deps, context.tx);
}

export function createExpenseCategoryRepositoryFromSharedDeps(
  deps: SharedDeps,
  tx?: Prisma.TransactionClient,
): IExpenseCategoryRepository {
  return createExpenseCategoryRepository(deps, tx);
}
