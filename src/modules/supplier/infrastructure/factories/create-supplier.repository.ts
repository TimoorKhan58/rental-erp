import type { Prisma } from "@/generated/prisma/client";
import type { ISupplierRepository } from "@/modules/supplier/domain/supplier.repository.interface";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";
import type { RepositoryUnitOfWorkContext } from "@/shared/infrastructure/database";
import { createObservableRepositoryRunnerFromSharedDeps } from "@/shared/infrastructure/database";

import { PrismaSupplierRepository } from "../repositories/prisma-supplier.repository";

export function createSupplierRepository(
  deps: Pick<SharedDeps, "prisma" | "logger">,
  tx?: Prisma.TransactionClient,
): ISupplierRepository {
  const runner = createObservableRepositoryRunnerFromSharedDeps(deps, {
    tx,
    repositoryName: "SupplierRepository",
  });

  return new PrismaSupplierRepository(runner);
}

export function createSupplierRepositoryFromUnitOfWork(
  context: RepositoryUnitOfWorkContext,
): ISupplierRepository {
  return createSupplierRepository(context.deps, context.tx);
}

export function createSupplierRepositoryFromSharedDeps(
  deps: SharedDeps,
  tx?: Prisma.TransactionClient,
): ISupplierRepository {
  return createSupplierRepository(deps, tx);
}
