import type { Prisma } from "@/generated/prisma/client";
import type { ICategoryRepository } from "@/modules/catalog/domain/category.repository.interface";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";
import type { RepositoryUnitOfWorkContext } from "@/shared/infrastructure/database";
import { createObservableRepositoryRunnerFromSharedDeps } from "@/shared/infrastructure/database";

import { PrismaCategoryRepository } from "../repositories/prisma-category.repository";

export function createCategoryRepository(
  deps: Pick<SharedDeps, "prisma" | "logger">,
  tx?: Prisma.TransactionClient,
): ICategoryRepository {
  const runner = createObservableRepositoryRunnerFromSharedDeps(deps, {
    tx,
    repositoryName: "PrismaCategoryRepository",
  });

  return new PrismaCategoryRepository(runner);
}

export function createCategoryRepositoryFromUnitOfWork(
  context: RepositoryUnitOfWorkContext,
): ICategoryRepository {
  return createCategoryRepository(context.deps, context.tx);
}

export function createCategoryRepositoryFromSharedDeps(
  deps: SharedDeps,
  tx?: Prisma.TransactionClient,
): ICategoryRepository {
  return createCategoryRepository(deps, tx);
}
