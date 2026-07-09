import type { Prisma } from "@/generated/prisma/client";
import type { IProductRepository } from "@/modules/product/domain/product.repository.interface";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";
import type { RepositoryUnitOfWorkContext } from "@/shared/infrastructure/database";
import { createObservableRepositoryRunnerFromSharedDeps } from "@/shared/infrastructure/database";

import { PrismaProductRepository } from "../repositories/prisma-product.repository";

export function createProductRepository(
  deps: Pick<SharedDeps, "prisma" | "logger">,
  tx?: Prisma.TransactionClient,
): IProductRepository {
  const runner = createObservableRepositoryRunnerFromSharedDeps(deps, {
    tx,
    repositoryName: "ProductRepository",
  });

  return new PrismaProductRepository(runner);
}

export function createProductRepositoryFromUnitOfWork(
  context: RepositoryUnitOfWorkContext,
): IProductRepository {
  return createProductRepository(context.deps, context.tx);
}

export function createProductRepositoryFromSharedDeps(
  deps: SharedDeps,
  tx?: Prisma.TransactionClient,
): IProductRepository {
  return createProductRepository(deps, tx);
}
