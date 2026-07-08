import type { PrismaClient } from "@/generated/prisma/client";
import { prisma } from "@/shared/infrastructure/database/prisma-client";
import {
  PrismaTransactionManager,
  type ITransactionManager,
} from "@/shared/infrastructure/database/transaction-manager";

export interface SharedDatabaseDeps {
  readonly prisma: PrismaClient;
  readonly transactionManager: ITransactionManager;
}

export function createSharedDatabaseDeps(
  prismaClient: PrismaClient = prisma,
): SharedDatabaseDeps {
  return {
    prisma: prismaClient,
    transactionManager: new PrismaTransactionManager(prismaClient),
  };
}
