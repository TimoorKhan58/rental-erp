import type { Prisma } from "@/generated/prisma/client";
import type { IPurchaseOrderRepository } from "@/modules/procurement/domain/purchase-order.repository.interface";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";
import type { RepositoryUnitOfWorkContext } from "@/shared/infrastructure/database";
import { createObservableRepositoryRunnerFromSharedDeps } from "@/shared/infrastructure/database";

import { PrismaPurchaseOrderRepository } from "../repositories/prisma-purchase-order.repository";

export function createPurchaseOrderRepository(
  deps: Pick<SharedDeps, "prisma" | "logger">,
  tx?: Prisma.TransactionClient,
): IPurchaseOrderRepository {
  const runner = createObservableRepositoryRunnerFromSharedDeps(deps, {
    tx,
    repositoryName: "PurchaseOrderRepository",
  });

  return new PrismaPurchaseOrderRepository(runner);
}

export function createPurchaseOrderRepositoryFromUnitOfWork(
  context: RepositoryUnitOfWorkContext,
): IPurchaseOrderRepository {
  return createPurchaseOrderRepository(context.deps, context.tx);
}

export function createPurchaseOrderRepositoryFromSharedDeps(
  deps: SharedDeps,
  tx?: Prisma.TransactionClient,
): IPurchaseOrderRepository {
  return createPurchaseOrderRepository(deps, tx);
}
