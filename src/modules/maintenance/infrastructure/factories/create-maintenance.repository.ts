import type { Prisma } from "@/generated/prisma/client";
import type { IMaintenanceRepository } from "@/modules/maintenance/domain";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";
import type { RepositoryUnitOfWorkContext } from "@/shared/infrastructure/database";
import { createObservableRepositoryRunnerFromSharedDeps } from "@/shared/infrastructure/database";

import { PrismaMaintenanceRepository } from "../repositories/prisma-maintenance.repository";

export function createMaintenanceRepository(
  deps: Pick<SharedDeps, "prisma" | "logger">,
  tx?: Prisma.TransactionClient,
): IMaintenanceRepository {
  const runner = createObservableRepositoryRunnerFromSharedDeps(deps, {
    tx,
    repositoryName: "MaintenanceRepository",
  });

  return new PrismaMaintenanceRepository(runner);
}

export function createMaintenanceRepositoryFromUnitOfWork(
  context: RepositoryUnitOfWorkContext,
): IMaintenanceRepository {
  return createMaintenanceRepository(context.deps, context.tx);
}

export function createMaintenanceRepositoryFromSharedDeps(
  deps: SharedDeps,
  tx?: Prisma.TransactionClient,
): IMaintenanceRepository {
  return createMaintenanceRepository(deps, tx);
}
