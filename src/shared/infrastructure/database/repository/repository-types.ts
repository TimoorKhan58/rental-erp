import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import type { ExecutionContext } from "@/shared/application/context";
import type { ILogger } from "@/shared/infrastructure/logging";

export interface RepositoryBaseOptions {
  prisma: PrismaClient;
  logger?: ILogger;
  tx?: Prisma.TransactionClient;
}

export interface RepositoryOperationMeta extends Record<string, unknown> {
  operation?: string;
  model?: string;
}

export type RepositoryFactoryOptions = RepositoryBaseOptions;

export type RepositoryExecutionContext = Pick<ExecutionContext, "logger" | "tx">;
