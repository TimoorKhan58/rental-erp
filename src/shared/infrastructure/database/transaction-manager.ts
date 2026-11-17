import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { runTenantTransaction } from "@/shared/infrastructure/tenancy/rls-session";

export interface ITransactionManager {
  run<T>(
    operation: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T>;
}

export class PrismaTransactionManager implements ITransactionManager {
  constructor(private readonly prisma: PrismaClient) {}

  run<T>(
    operation: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return runTenantTransaction<Prisma.TransactionClient, T>(
      this.prisma as never,
      operation,
    );
  }
}
