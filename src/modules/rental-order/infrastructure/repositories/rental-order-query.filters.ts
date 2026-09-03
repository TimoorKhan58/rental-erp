import type { Prisma } from "@/generated/prisma/client";

import type { RentalOrder } from "@/modules/rental-order/domain/rental-order.entity";
import type { RentalOrderSummaryQuery } from "@/modules/rental-order/domain/rental-order-summary.query";
import { RENTAL_ORDER_SEARCH_FIELDS } from "@/modules/rental-order/domain/rental-order.constants";
import { buildSearchWhereFromInput } from "@/shared/infrastructure/database/repository/query/build-search";
import { mergePrismaWhere } from "@/shared/infrastructure/database/repository/query/merge-prisma-where";

export function mapRentalOrderFilter(
  filter: Record<string, unknown>,
): Prisma.RentalOrderWhereInput | undefined {
  const where: Prisma.RentalOrderWhereInput = {};

  if (filter.status !== undefined) {
    where.status = filter.status as RentalOrder["status"];
  }

  if (filter.customerId !== undefined) {
    where.customerId = String(filter.customerId);
  }

  if (filter.warehouseId !== undefined) {
    where.warehouseId = String(filter.warehouseId);
  }

  if (filter.eventFrom !== undefined) {
    where.eventEndDate = {
      ...(typeof where.eventEndDate === "object" && where.eventEndDate !== null
        ? where.eventEndDate
        : {}),
      gte: filter.eventFrom as Date,
    };
  }

  if (filter.eventTo !== undefined) {
    where.eventStartDate = {
      ...(typeof where.eventStartDate === "object" && where.eventStartDate !== null
        ? where.eventStartDate
        : {}),
      lte: filter.eventTo as Date,
    };
  }

  return Object.keys(where).length > 0 ? where : undefined;
}

export function toRentalOrderFilterRecord(
  query: RentalOrderSummaryQuery,
): Record<string, unknown> | undefined {
  const filter: Record<string, unknown> = {};

  if (query.status !== undefined) {
    filter.status = query.status;
  }

  if (query.customerId !== undefined) {
    filter.customerId = query.customerId;
  }

  if (query.warehouseId !== undefined) {
    filter.warehouseId = query.warehouseId;
  }

  if (query.eventFrom !== undefined) {
    filter.eventFrom = query.eventFrom;
  }

  if (query.eventTo !== undefined) {
    filter.eventTo = query.eventTo;
  }

  return Object.keys(filter).length > 0 ? filter : undefined;
}

export function buildRentalOrderSummaryWhere(
  query: RentalOrderSummaryQuery,
): Prisma.RentalOrderWhereInput | undefined {
  const filterRecord = toRentalOrderFilterRecord(query);
  const filterWhere = filterRecord ? mapRentalOrderFilter(filterRecord) : undefined;
  const searchWhere = buildSearchWhereFromInput<Prisma.RentalOrderWhereInput>(
    query.search !== undefined && query.search.trim().length > 0
      ? { term: query.search.trim(), fields: RENTAL_ORDER_SEARCH_FIELDS }
      : undefined,
    RENTAL_ORDER_SEARCH_FIELDS,
  );

  return mergePrismaWhere(filterWhere, searchWhere);
}

export function mergeRentalOrderWhere(
  base: Prisma.RentalOrderWhereInput | undefined,
  extra: Prisma.RentalOrderWhereInput,
): Prisma.RentalOrderWhereInput {
  return mergePrismaWhere(base, extra) ?? extra;
}
