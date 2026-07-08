import {
  buildFilter,
  buildPagination,
  buildSort,
  type FilterResult,
  type SortResult,
} from "@/shared/application/query";

import { buildSearchWhereFromInput } from "./build-search";
import { mergePrismaWhere } from "./merge-prisma-where";
import type { RepositoryQuerySpec } from "./query-specification";

export interface ComposedPrismaQuery<TWhere, TOrderBy> {
  where: TWhere | undefined;
  orderBy: TOrderBy | undefined;
  skip: number;
  take: number;
  page: number;
  pageSize: number;
}

export interface ComposePrismaQueryOptions<TWhere, TOrderBy> {
  spec: RepositoryQuerySpec;
  baseWhere?: TWhere;
  searchFields?: readonly string[];
  mapFilter?: (filter: FilterResult) => TWhere | undefined;
  mapSort?: (sort: SortResult | undefined) => TOrderBy | undefined;
}

export function composePrismaQuery<
  TWhere extends Record<string, unknown>,
  TOrderBy,
>(
  options: ComposePrismaQueryOptions<TWhere, TOrderBy>,
): ComposedPrismaQuery<TWhere, TOrderBy> {
  const pagination = buildPagination(options.spec.pagination);
  const filter = options.spec.filter ? buildFilter(options.spec.filter) : {};
  const sort = buildSort(options.spec.sort ?? {});

  const filterWhere = options.mapFilter?.(filter);
  const searchWhere = buildSearchWhereFromInput<TWhere>(
    options.spec.search,
    options.searchFields,
  );
  const where = mergePrismaWhere(options.baseWhere, filterWhere, searchWhere);

  const defaultOrderBy =
    sort !== undefined ? (sort as TOrderBy) : undefined;
  const orderBy = options.mapSort?.(sort) ?? defaultOrderBy;

  return {
    where,
    orderBy,
    skip: pagination.skip,
    take: pagination.take,
    page: pagination.page,
    pageSize: pagination.pageSize,
  };
}
