import type { Prisma } from "@/generated/prisma/client";

import {
  resolveDbClient,
  withPrismaError,
} from "../repository-base";
import type { DbClient } from "../prisma-types";
import type {
  RepositoryBaseOptions,
  RepositoryOperationMeta,
} from "./repository-types";

export interface RepositoryRunner {
  readonly db: DbClient;
  run<T>(
    operation: (db: DbClient) => Promise<T>,
    meta?: RepositoryOperationMeta,
  ): Promise<T>;
  withTransaction(tx: Prisma.TransactionClient): RepositoryRunner;
}

export function createRepositoryRunner(
  options: RepositoryBaseOptions,
): RepositoryRunner {
  const getDb = (): DbClient => resolveDbClient(options.tx);

  return {
    get db() {
      return getDb();
    },

    async run<T>(
      operation: (db: DbClient) => Promise<T>,
      meta?: RepositoryOperationMeta,
    ): Promise<T> {
      try {
        const result = await withPrismaError(() => operation(getDb()));
        options.logger?.debug("Repository operation succeeded", meta);
        return result;
      } catch (error) {
        options.logger?.error("Repository operation failed", error, meta);
        throw error;
      }
    },

    withTransaction(tx: Prisma.TransactionClient): RepositoryRunner {
      return createRepositoryRunner({ ...options, tx });
    },
  };
}
