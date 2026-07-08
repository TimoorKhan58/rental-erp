import type { DbClient } from "../prisma-types";
import type { RepositoryOperationMeta } from "./repository-types";
import type { RepositoryRunner } from "./repository-runner";

export async function repositoryFindFirst<T>(
  runner: RepositoryRunner,
  query: (db: DbClient) => Promise<T | null>,
  meta?: RepositoryOperationMeta,
): Promise<T | null> {
  return runner.run(query, { operation: "findFirst", ...meta });
}

export async function repositoryFindMany<T>(
  runner: RepositoryRunner,
  query: (db: DbClient) => Promise<T[]>,
  meta?: RepositoryOperationMeta,
): Promise<T[]> {
  return runner.run(query, { operation: "findMany", ...meta });
}

export async function repositoryCreate<T>(
  runner: RepositoryRunner,
  mutation: (db: DbClient) => Promise<T>,
  meta?: RepositoryOperationMeta,
): Promise<T> {
  return runner.run(mutation, { operation: "create", ...meta });
}

export async function repositoryUpdate<T>(
  runner: RepositoryRunner,
  mutation: (db: DbClient) => Promise<T>,
  meta?: RepositoryOperationMeta,
): Promise<T> {
  return runner.run(mutation, { operation: "update", ...meta });
}

export async function repositoryDelete<T>(
  runner: RepositoryRunner,
  mutation: (db: DbClient) => Promise<T>,
  meta?: RepositoryOperationMeta,
): Promise<T> {
  return runner.run(mutation, { operation: "delete", ...meta });
}

export async function repositoryCount(
  runner: RepositoryRunner,
  query: (db: DbClient) => Promise<number>,
  meta?: RepositoryOperationMeta,
): Promise<number> {
  return runner.run(query, { operation: "count", ...meta });
}
