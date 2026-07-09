import type { Prisma } from "@/generated/prisma/client";
import type { IRentalOrderRepository } from "@/modules/rental-order/domain/rental-order.repository.interface";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";
import type { RepositoryUnitOfWorkContext } from "@/shared/infrastructure/database";
import { createObservableRepositoryRunnerFromSharedDeps } from "@/shared/infrastructure/database";

import { PrismaRentalOrderRepository } from "../repositories/prisma-rental-order.repository";

export function createRentalOrderRepository(
  deps: Pick<SharedDeps, "prisma" | "logger">,
  tx?: Prisma.TransactionClient,
): IRentalOrderRepository {
  const runner = createObservableRepositoryRunnerFromSharedDeps(deps, {
    tx,
    repositoryName: "RentalOrderRepository",
  });

  return new PrismaRentalOrderRepository(runner);
}

export function createRentalOrderRepositoryFromUnitOfWork(
  context: RepositoryUnitOfWorkContext,
): IRentalOrderRepository {
  return createRentalOrderRepository(context.deps, context.tx);
}

export function createRentalOrderRepositoryFromSharedDeps(
  deps: SharedDeps,
  tx?: Prisma.TransactionClient,
): IRentalOrderRepository {
  return createRentalOrderRepository(deps, tx);
}
