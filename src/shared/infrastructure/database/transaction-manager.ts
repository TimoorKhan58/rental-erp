import { Prisma, type PrismaClient } from "@/generated/prisma/client";

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
    return this.prisma.$transaction(operation);
  }
}
