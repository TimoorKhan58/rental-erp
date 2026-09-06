import type { Prisma } from "@/generated/prisma/client";

import type { Maintenance } from "@/modules/maintenance/domain/maintenance.entity";
import type { MaintenanceSummaryQuery } from "@/modules/maintenance/domain/maintenance-summary.query";
import { MAINTENANCE_SEARCH_FIELDS } from "@/modules/maintenance/domain/maintenance.constants";
import { buildSearchWhereFromInput } from "@/shared/infrastructure/database/repository/query/build-search";
import { mergePrismaWhere } from "@/shared/infrastructure/database/repository/query/merge-prisma-where";

export function mapMaintenanceSummaryFilter(
  filter: Record<string, unknown>,
): Prisma.MaintenanceWhereInput | undefined {
  const where: Prisma.MaintenanceWhereInput = {};

  if (filter.status !== undefined) {
    where.status = filter.status as Maintenance["status"];
  }

  if (filter.productId !== undefined) {
    where.productId = String(filter.productId);
  }

  if (filter.warehouseId !== undefined) {
    where.warehouseId = String(filter.warehouseId);
  }

  if (filter.inventoryId !== undefined) {
    where.inventoryId = String(filter.inventoryId);
  }

  if (filter.serviceType !== undefined) {
    where.serviceType = filter.serviceType as Maintenance["serviceType"];
  }

  if (
    filter.scheduledDateFrom !== undefined ||
    filter.scheduledDateTo !== undefined
  ) {
    where.scheduledDate = {
      ...(filter.scheduledDateFrom !== undefined
        ? { gte: filter.scheduledDateFrom as Date }
        : {}),
      ...(filter.scheduledDateTo !== undefined
        ? { lte: filter.scheduledDateTo as Date }
        : {}),
    };
  }

  if (filter.technician !== undefined) {
    const technician = String(filter.technician).trim();
    if (technician.length > 0) {
      where.technician = { contains: technician, mode: "insensitive" };
    }
  }

  return Object.keys(where).length > 0 ? where : undefined;
}

export function toMaintenanceFilterRecord(
  query: MaintenanceSummaryQuery,
): Record<string, unknown> | undefined {
  const filter: Record<string, unknown> = {};

  if (query.status !== undefined) filter.status = query.status;
  if (query.productId !== undefined) filter.productId = query.productId;
  if (query.warehouseId !== undefined) filter.warehouseId = query.warehouseId;
  if (query.inventoryId !== undefined) filter.inventoryId = query.inventoryId;
  if (query.serviceType !== undefined) filter.serviceType = query.serviceType;
  if (query.scheduledDateFrom !== undefined) {
    filter.scheduledDateFrom = query.scheduledDateFrom;
  }
  if (query.scheduledDateTo !== undefined) {
    filter.scheduledDateTo = query.scheduledDateTo;
  }
  if (query.technician !== undefined) filter.technician = query.technician;

  return Object.keys(filter).length > 0 ? filter : undefined;
}

export function buildMaintenanceSummaryWhere(
  query: MaintenanceSummaryQuery,
): Prisma.MaintenanceWhereInput | undefined {
  const filterRecord = toMaintenanceFilterRecord(query);
  const filterWhere = filterRecord
    ? mapMaintenanceSummaryFilter(filterRecord)
    : undefined;
  const searchWhere = buildSearchWhereFromInput<Prisma.MaintenanceWhereInput>(
    query.search !== undefined && query.search.trim().length > 0
      ? { term: query.search.trim(), fields: [...MAINTENANCE_SEARCH_FIELDS] }
      : undefined,
    [...MAINTENANCE_SEARCH_FIELDS],
  );

  return mergePrismaWhere(filterWhere, searchWhere);
}
