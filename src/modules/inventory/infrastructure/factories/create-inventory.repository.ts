import type { Prisma } from "@/generated/prisma/client";
import type { IInventoryRepository } from "@/modules/inventory/domain/inventory.repository.interface";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";
import type { RepositoryUnitOfWorkContext } from "@/shared/infrastructure/database";
import { createObservableRepositoryRunnerFromSharedDeps } from "@/shared/infrastructure/database";

import { PrismaInventoryRepository } from "../repositories/prisma-inventory.repository";

export function createInventoryRepository(
  deps: Pick<SharedDeps, "prisma" | "logger">,
  tx?: Prisma.TransactionClient,
): IInventoryRepository {
  const runner = createObservableRepositoryRunnerFromSharedDeps(deps, {
    tx,
    repositoryName: "InventoryRepository",
  });

  return new PrismaInventoryRepository(runner);
}

export function createInventoryRepositoryFromUnitOfWork(
  context: RepositoryUnitOfWorkContext,
): IInventoryRepository {
  return createInventoryRepository(context.deps, context.tx);
}

export function createInventoryRepositoryFromSharedDeps(
  deps: SharedDeps,
  tx?: Prisma.TransactionClient,
): IInventoryRepository {
  return createInventoryRepository(deps, tx);
}
