import type { Prisma } from "@/generated/prisma/client";
import type { IExternalRentalRepository } from "@/modules/external-rental/domain";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";
import type { RepositoryUnitOfWorkContext } from "@/shared/infrastructure/database";
import { createObservableRepositoryRunnerFromSharedDeps } from "@/shared/infrastructure/database";

import { PrismaExternalRentalRepository } from "../repositories/prisma-external-rental.repository";

export function createExternalRentalRepository(
  deps: Pick<SharedDeps, "prisma" | "logger">,
  tx?: Prisma.TransactionClient,
): IExternalRentalRepository {
  const runner = createObservableRepositoryRunnerFromSharedDeps(deps, {
    tx,
    repositoryName: "ExternalRentalRepository",
  });

  return new PrismaExternalRentalRepository(runner);
}

export function createExternalRentalRepositoryFromUnitOfWork(
  context: RepositoryUnitOfWorkContext,
): IExternalRentalRepository {
  return createExternalRentalRepository(context.deps, context.tx);
}

export function createExternalRentalRepositoryFromSharedDeps(
  deps: SharedDeps,
  tx?: Prisma.TransactionClient,
): IExternalRentalRepository {
  return createExternalRentalRepository(deps, tx);
}
