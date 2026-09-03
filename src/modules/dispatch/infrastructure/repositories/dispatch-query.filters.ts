import type { Prisma } from "@/generated/prisma/client";

import type { Dispatch } from "@/modules/dispatch/domain/dispatch.entity";
import type { DispatchSummaryQuery } from "@/modules/dispatch/domain/dispatch-summary.query";
import { DISPATCH_SEARCH_FIELDS } from "@/modules/dispatch/domain/dispatch.constants";
import { buildSearchWhereFromInput } from "@/shared/infrastructure/database/repository/query/build-search";
import { mergePrismaWhere } from "@/shared/infrastructure/database/repository/query/merge-prisma-where";

export function mapDispatchFilter(
  filter: Record<string, unknown>,
): Prisma.DispatchWhereInput | undefined {
  const where: Prisma.DispatchWhereInput = {};

  if (filter.status !== undefined) {
    where.status = filter.status as Dispatch["status"];
  }

  if (filter.rentalOrderId !== undefined) {
    where.rentalOrderId = String(filter.rentalOrderId);
  }

  if (filter.warehouseId !== undefined) {
    where.rentalOrder = { warehouseId: String(filter.warehouseId) };
  }

  if (filter.dispatchDateFrom !== undefined || filter.dispatchDateTo !== undefined) {
    where.dispatchDate = {
      ...(filter.dispatchDateFrom !== undefined
        ? { gte: filter.dispatchDateFrom as Date }
        : {}),
      ...(filter.dispatchDateTo !== undefined
        ? { lte: filter.dispatchDateTo as Date }
        : {}),
    };
  }

  return Object.keys(where).length > 0 ? where : undefined;
}

export function toDispatchFilterRecord(
  query: DispatchSummaryQuery,
): Record<string, unknown> | undefined {
  const filter: Record<string, unknown> = {};

  if (query.status !== undefined) {
    filter.status = query.status;
  }

  if (query.rentalOrderId !== undefined) {
    filter.rentalOrderId = query.rentalOrderId;
  }

  if (query.warehouseId !== undefined) {
    filter.warehouseId = query.warehouseId;
  }

  if (query.dispatchDateFrom !== undefined) {
    filter.dispatchDateFrom = query.dispatchDateFrom;
  }

  if (query.dispatchDateTo !== undefined) {
    filter.dispatchDateTo = query.dispatchDateTo;
  }

  return Object.keys(filter).length > 0 ? filter : undefined;
}

export function buildDispatchSummaryWhere(
  query: DispatchSummaryQuery,
): Prisma.DispatchWhereInput | undefined {
  const filterRecord = toDispatchFilterRecord(query);
  const filterWhere = filterRecord ? mapDispatchFilter(filterRecord) : undefined;
  const searchWhere = buildSearchWhereFromInput<Prisma.DispatchWhereInput>(
    query.search !== undefined && query.search.trim().length > 0
      ? { term: query.search.trim(), fields: DISPATCH_SEARCH_FIELDS }
      : undefined,
    DISPATCH_SEARCH_FIELDS,
  );

  return mergePrismaWhere(filterWhere, searchWhere);
}

export function mergeDispatchWhere(
  base: Prisma.DispatchWhereInput | undefined,
  extra: Prisma.DispatchWhereInput,
): Prisma.DispatchWhereInput {
  return mergePrismaWhere(base, extra) ?? extra;
}
