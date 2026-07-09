import type { Prisma } from "@/generated/prisma/client";
import type { IRepairRepository } from "@/modules/repair/domain";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";
import type { RepositoryUnitOfWorkContext } from "@/shared/infrastructure/database";
import { createObservableRepositoryRunnerFromSharedDeps } from "@/shared/infrastructure/database";

import { PrismaRepairRepository } from "../repositories/prisma-repair.repository";

export function createRepairRepository(
  deps: Pick<SharedDeps, "prisma" | "logger">,
  tx?: Prisma.TransactionClient,
): IRepairRepository {
  const runner = createObservableRepositoryRunnerFromSharedDeps(deps, {
    tx,
    repositoryName: "RepairRepository",
  });

  return new PrismaRepairRepository(runner);
}

export function createRepairRepositoryFromUnitOfWork(
  context: RepositoryUnitOfWorkContext,
): IRepairRepository {
  return createRepairRepository(context.deps, context.tx);
}

export function createRepairRepositoryFromSharedDeps(
  deps: SharedDeps,
  tx?: Prisma.TransactionClient,
): IRepairRepository {
  return createRepairRepository(deps, tx);
}
