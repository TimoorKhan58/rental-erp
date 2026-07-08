import type { Prisma } from "@/generated/prisma/client";
import type { ICustomerRepository } from "@/modules/customer/domain/customer.repository.interface";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";
import type { RepositoryUnitOfWorkContext } from "@/shared/infrastructure/database";
import { createObservableRepositoryRunnerFromSharedDeps } from "@/shared/infrastructure/database";

import { PrismaCustomerRepository } from "../repositories/prisma-customer.repository";

export function createCustomerRepository(
  deps: Pick<SharedDeps, "prisma" | "logger">,
  tx?: Prisma.TransactionClient,
): ICustomerRepository {
  const runner = createObservableRepositoryRunnerFromSharedDeps(deps, {
    tx,
    repositoryName: "CustomerRepository",
  });

  return new PrismaCustomerRepository(runner);
}

export function createCustomerRepositoryFromUnitOfWork(
  context: RepositoryUnitOfWorkContext,
): ICustomerRepository {
  return createCustomerRepository(context.deps, context.tx);
}

export function createCustomerRepositoryFromSharedDeps(
  deps: SharedDeps,
  tx?: Prisma.TransactionClient,
): ICustomerRepository {
  return createCustomerRepository(deps, tx);
}
