import type { PaginatedResult } from "@/shared/domain/pagination";

import type { DbClient } from "../../prisma-types";
import type { RepositoryOperationMeta } from "../repository-types";
import type { RepositoryRunner } from "../repository-runner";
import {
  composePrismaQuery,
  type ComposePrismaQueryOptions,
  type ComposedPrismaQuery,
} from "./compose-prisma-query";
import { buildPaginationMeta } from "./pagination-meta";

export interface PagedQueryArgs<TWhere, TOrderBy> {
  where: TWhere | undefined;
  orderBy: TOrderBy | undefined;
  skip: number;
  take: number;
}

export interface PagedQueryHandlers<TItem, TWhere, TOrderBy> {
  findMany: (
    db: DbClient,
    args: PagedQueryArgs<TWhere, TOrderBy>,
  ) => Promise<TItem[]>;
  count: (db: DbClient, args: { where: TWhere | undefined }) => Promise<number>;
}

export interface ExecutePagedQueryOptions<TItem, TWhere, TOrderBy> {
  runner: RepositoryRunner;
  query: ComposedPrismaQuery<TWhere, TOrderBy>;
  handlers: PagedQueryHandlers<TItem, TWhere, TOrderBy>;
  meta?: RepositoryOperationMeta;
}

export async function executePagedQuery<TItem, TWhere, TOrderBy>(
  options: ExecutePagedQueryOptions<TItem, TWhere, TOrderBy>,
): Promise<PaginatedResult<TItem>> {
  const { runner, query, handlers, meta } = options;

  return runner.run(async (db) => {
    const args: PagedQueryArgs<TWhere, TOrderBy> = {
      where: query.where,
      orderBy: query.orderBy,
      skip: query.skip,
      take: query.take,
    };

    const [items, total] = await Promise.all([
      handlers.findMany(db, args),
      handlers.count(db, { where: query.where }),
    ]);

    return {
      items,
      meta: buildPaginationMeta(query.page, query.pageSize, total),
    };
  }, {
    operation: "findPaged",
    ...meta,
  });
}

export interface RunRepositoryPagedQueryOptions<
  TItem,
  TWhere extends Record<string, unknown>,
  TOrderBy,
> extends ComposePrismaQueryOptions<TWhere, TOrderBy> {
  handlers: PagedQueryHandlers<TItem, TWhere, TOrderBy>;
  meta?: RepositoryOperationMeta;
}

export async function runRepositoryPagedQuery<
  TItem,
  TWhere extends Record<string, unknown>,
  TOrderBy,
>(
  runner: RepositoryRunner,
  options: RunRepositoryPagedQueryOptions<TItem, TWhere, TOrderBy>,
): Promise<PaginatedResult<TItem>> {
  const { handlers, meta, ...composeOptions } = options;
  const query = composePrismaQuery(composeOptions);

  return executePagedQuery({
    runner,
    query,
    handlers,
    meta,
  });
}

export type { ComposedPrismaQuery, ComposePrismaQueryOptions };
