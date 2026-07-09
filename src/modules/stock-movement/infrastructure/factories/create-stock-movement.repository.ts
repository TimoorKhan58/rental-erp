import type { Prisma } from "@/generated/prisma/client";
import type { IStockMovementRepository } from "@/modules/stock-movement/domain/stock-movement.repository.interface";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";
import type { RepositoryUnitOfWorkContext } from "@/shared/infrastructure/database";
import { createObservableRepositoryRunnerFromSharedDeps } from "@/shared/infrastructure/database";

import { PrismaStockMovementRepository } from "../repositories/prisma-stock-movement.repository";

export function createStockMovementRepository(
  deps: Pick<SharedDeps, "prisma" | "logger">,
  tx?: Prisma.TransactionClient,
): IStockMovementRepository {
  const runner = createObservableRepositoryRunnerFromSharedDeps(deps, {
    tx,
    repositoryName: "StockMovementRepository",
  });

  return new PrismaStockMovementRepository(runner);
}

export function createStockMovementRepositoryFromUnitOfWork(
  context: RepositoryUnitOfWorkContext,
): IStockMovementRepository {
  return createStockMovementRepository(context.deps, context.tx);
}

export function createStockMovementRepositoryFromSharedDeps(
  deps: SharedDeps,
  tx?: Prisma.TransactionClient,
): IStockMovementRepository {
  return createStockMovementRepository(deps, tx);
}
