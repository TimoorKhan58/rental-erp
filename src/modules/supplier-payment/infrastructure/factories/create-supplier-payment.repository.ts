import type { Prisma } from "@/generated/prisma/client";
import type { ISupplierPaymentRepository } from "@/modules/supplier-payment/domain/supplier-payment.repository.interface";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";
import type { RepositoryUnitOfWorkContext } from "@/shared/infrastructure/database";
import { createObservableRepositoryRunnerFromSharedDeps } from "@/shared/infrastructure/database";

import { PrismaSupplierPaymentRepository } from "../repositories/prisma-supplier-payment.repository";

export function createSupplierPaymentRepository(
  deps: Pick<SharedDeps, "prisma" | "logger">,
  tx?: Prisma.TransactionClient,
): ISupplierPaymentRepository {
  const runner = createObservableRepositoryRunnerFromSharedDeps(deps, {
    tx,
    repositoryName: "SupplierPaymentRepository",
  });

  return new PrismaSupplierPaymentRepository(runner);
}

export function createSupplierPaymentRepositoryFromUnitOfWork(
  context: RepositoryUnitOfWorkContext,
): ISupplierPaymentRepository {
  return createSupplierPaymentRepository(context.deps, context.tx);
}

export function createSupplierPaymentRepositoryFromSharedDeps(
  deps: SharedDeps,
  tx?: Prisma.TransactionClient,
): ISupplierPaymentRepository {
  return createSupplierPaymentRepository(deps, tx);
}
