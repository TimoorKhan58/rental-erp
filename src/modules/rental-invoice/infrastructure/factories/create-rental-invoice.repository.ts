import type { Prisma } from "@/generated/prisma/client";
import type { IRentalInvoiceRepository } from "@/modules/rental-invoice/domain/rental-invoice.repository.interface";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";
import type { RepositoryUnitOfWorkContext } from "@/shared/infrastructure/database";
import { createObservableRepositoryRunnerFromSharedDeps } from "@/shared/infrastructure/database";

import { PrismaRentalInvoiceRepository } from "../repositories/prisma-rental-invoice.repository";

export function createRentalInvoiceRepository(
  deps: Pick<SharedDeps, "prisma" | "logger">,
  tx?: Prisma.TransactionClient,
): IRentalInvoiceRepository {
  const runner = createObservableRepositoryRunnerFromSharedDeps(deps, {
    tx,
    repositoryName: "RentalInvoiceRepository",
  });

  return new PrismaRentalInvoiceRepository(runner);
}

export function createRentalInvoiceRepositoryFromUnitOfWork(
  context: RepositoryUnitOfWorkContext,
): IRentalInvoiceRepository {
  return createRentalInvoiceRepository(context.deps, context.tx);
}

export function createRentalInvoiceRepositoryFromSharedDeps(
  deps: SharedDeps,
  tx?: Prisma.TransactionClient,
): IRentalInvoiceRepository {
  return createRentalInvoiceRepository(deps, tx);
}
