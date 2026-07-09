import type { Prisma } from "@/generated/prisma/client";
import type { IWarehouseRepository } from "@/modules/warehouse/domain/warehouse.repository.interface";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";
import type { RepositoryUnitOfWorkContext } from "@/shared/infrastructure/database";
import { createObservableRepositoryRunnerFromSharedDeps } from "@/shared/infrastructure/database";

import { PrismaWarehouseRepository } from "../repositories/prisma-warehouse.repository";

export function createWarehouseRepository(
  deps: Pick<SharedDeps, "prisma" | "logger">,
  tx?: Prisma.TransactionClient,
): IWarehouseRepository {
  const runner = createObservableRepositoryRunnerFromSharedDeps(deps, {
    tx,
    repositoryName: "WarehouseRepository",
  });

  return new PrismaWarehouseRepository(runner);
}

export function createWarehouseRepositoryFromUnitOfWork(
  context: RepositoryUnitOfWorkContext,
): IWarehouseRepository {
  return createWarehouseRepository(context.deps, context.tx);
}

export function createWarehouseRepositoryFromSharedDeps(
  deps: SharedDeps,
  tx?: Prisma.TransactionClient,
): IWarehouseRepository {
  return createWarehouseRepository(deps, tx);
}
