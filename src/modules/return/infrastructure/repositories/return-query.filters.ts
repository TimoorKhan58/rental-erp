import type { Prisma } from "@/generated/prisma/client";

import type { Return } from "@/modules/return/domain/return.entity";
import type { ReturnSummaryQuery } from "@/modules/return/domain/return-summary.query";
import { RETURN_SEARCH_FIELDS } from "@/modules/return/domain/return.constants";
import { buildSearchWhereFromInput } from "@/shared/infrastructure/database/repository/query/build-search";
import { mergePrismaWhere } from "@/shared/infrastructure/database/repository/query/merge-prisma-where";

export function mapReturnSummaryFilter(
  filter: Record<string, unknown>,
): Prisma.ReturnInspectionWhereInput | undefined {
  const where: Prisma.ReturnInspectionWhereInput = {};

  if (filter.status !== undefined) {
    where.status = filter.status as Return["status"];
  }

  if (filter.rentalOrderId !== undefined) {
    where.rentalOrderId = String(filter.rentalOrderId);
  }

  if (filter.dispatchId !== undefined) {
    where.dispatchId = String(filter.dispatchId);
  }

  if (filter.returnDateFrom !== undefined || filter.returnDateTo !== undefined) {
    where.inspectionDate = {
      ...(filter.returnDateFrom !== undefined
        ? { gte: filter.returnDateFrom as Date }
        : {}),
      ...(filter.returnDateTo !== undefined
        ? { lte: filter.returnDateTo as Date }
        : {}),
    };
  }

  return Object.keys(where).length > 0 ? where : undefined;
}

export function toReturnFilterRecord(
  query: ReturnSummaryQuery,
): Record<string, unknown> | undefined {
  const filter: Record<string, unknown> = {};

  if (query.status !== undefined) filter.status = query.status;
  if (query.rentalOrderId !== undefined) filter.rentalOrderId = query.rentalOrderId;
  if (query.dispatchId !== undefined) filter.dispatchId = query.dispatchId;
  if (query.returnDateFrom !== undefined) filter.returnDateFrom = query.returnDateFrom;
  if (query.returnDateTo !== undefined) filter.returnDateTo = query.returnDateTo;

  return Object.keys(filter).length > 0 ? filter : undefined;
}

export function buildReturnSummaryWhere(
  query: ReturnSummaryQuery,
): Prisma.ReturnInspectionWhereInput | undefined {
  const filterRecord = toReturnFilterRecord(query);
  const filterWhere = filterRecord
    ? mapReturnSummaryFilter(filterRecord)
    : undefined;
  const searchWhere = buildSearchWhereFromInput<Prisma.ReturnInspectionWhereInput>(
    query.search !== undefined && query.search.trim().length > 0
      ? { term: query.search.trim(), fields: [...RETURN_SEARCH_FIELDS] }
      : undefined,
    [...RETURN_SEARCH_FIELDS],
  );

  return mergePrismaWhere(filterWhere, searchWhere);
}
