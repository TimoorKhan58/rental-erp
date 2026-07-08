import type { Prisma } from "@/generated/prisma/client";

import type { DbClient } from "../prisma-types";
import { createRepositoryRunner, type RepositoryRunner } from "./repository-runner";
import type {
  RepositoryBaseOptions,
  RepositoryOperationMeta,
} from "./repository-types";

export class PrismaRepositoryBase {
  private readonly options: RepositoryBaseOptions;
  private readonly runner: RepositoryRunner;

  constructor(options: RepositoryBaseOptions) {
    this.options = options;
    this.runner = createRepositoryRunner(options);
  }

  protected get db(): DbClient {
    return this.runner.db;
  }

  protected get logger() {
    return this.options.logger;
  }

  protected run<T>(
    operation: (db: DbClient) => Promise<T>,
    meta?: RepositoryOperationMeta,
  ): Promise<T> {
    return this.runner.run(operation, meta);
  }

  withTransaction(tx: Prisma.TransactionClient): PrismaRepositoryBase {
    return new PrismaRepositoryBase({ ...this.options, tx });
  }
}

export function createPrismaRepositoryBase(
  options: RepositoryBaseOptions,
): PrismaRepositoryBase {
  return new PrismaRepositoryBase(options);
}
