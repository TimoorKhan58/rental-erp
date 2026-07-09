import type { Prisma } from "@/generated/prisma/client";
import type { IPaymentRepository } from "@/modules/payment/domain/payment.repository.interface";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";
import type { RepositoryUnitOfWorkContext } from "@/shared/infrastructure/database";
import { createObservableRepositoryRunnerFromSharedDeps } from "@/shared/infrastructure/database";

import { PrismaPaymentRepository } from "../repositories/prisma-payment.repository";

export function createPaymentRepository(
  deps: Pick<SharedDeps, "prisma" | "logger">,
  tx?: Prisma.TransactionClient,
): IPaymentRepository {
  const runner = createObservableRepositoryRunnerFromSharedDeps(deps, {
    tx,
    repositoryName: "PaymentRepository",
  });

  return new PrismaPaymentRepository(runner);
}

export function createPaymentRepositoryFromUnitOfWork(
  context: RepositoryUnitOfWorkContext,
): IPaymentRepository {
  return createPaymentRepository(context.deps, context.tx);
}

export function createPaymentRepositoryFromSharedDeps(
  deps: SharedDeps,
  tx?: Prisma.TransactionClient,
): IPaymentRepository {
  return createPaymentRepository(deps, tx);
}
