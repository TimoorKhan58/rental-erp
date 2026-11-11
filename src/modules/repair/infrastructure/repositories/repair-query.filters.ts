import type { Prisma } from "@/generated/prisma/client";

import type { Repair } from "@/modules/repair/domain/repair.entity";
import type { RepairSummaryQuery } from "@/modules/repair/domain/repair-summary.query";
import { REPAIR_SEARCH_FIELDS } from "@/modules/repair/domain/repair.constants";
import { buildSearchWhereFromInput } from "@/shared/infrastructure/database/repository/query/build-search";
import { mergePrismaWhere } from "@/shared/infrastructure/database/repository/query/merge-prisma-where";

export function mapRepairSummaryFilter(
  filter: Record<string, unknown>,
): Prisma.RepairWhereInput | undefined {
  const where: Prisma.RepairWhereInput = {};

  if (filter.status !== undefined) {
    where.status = filter.status as Repair["status"];
  }

  if (filter.returnId !== undefined) {
    where.returnInspectionId = String(filter.returnId);
  }

  if (filter.productId !== undefined) {
    where.productId = String(filter.productId);
  }

  if (filter.warehouseId !== undefined) {
    where.warehouseId = String(filter.warehouseId);
  }

  if (filter.repairDateFrom !== undefined || filter.repairDateTo !== undefined) {
    where.repairDate = {
      ...(filter.repairDateFrom !== undefined
        ? { gte: filter.repairDateFrom as Date }
        : {}),
      ...(filter.repairDateTo !== undefined
        ? { lte: filter.repairDateTo as Date }
        : {}),
    };
  }

  if (filter.technician !== undefined) {
    const technician = String(filter.technician).trim();
    if (technician.length > 0) {
      where.assignedTo = { contains: technician, mode: "insensitive" };
    }
  }

  return Object.keys(where).length > 0 ? where : undefined;
}

export function toRepairFilterRecord(
  query: RepairSummaryQuery,
): Record<string, unknown> | undefined {
  const filter: Record<string, unknown> = {};

  if (query.status !== undefined) {
    filter.status = query.status;
  }

  if (query.returnId !== undefined) {
    filter.returnId = query.returnId;
  }

  if (query.productId !== undefined) {
    filter.productId = query.productId;
  }

  if (query.warehouseId !== undefined) {
    filter.warehouseId = query.warehouseId;
  }

  if (query.repairDateFrom !== undefined) {
    filter.repairDateFrom = query.repairDateFrom;
  }

  if (query.repairDateTo !== undefined) {
    filter.repairDateTo = query.repairDateTo;
  }

  if (query.technician !== undefined) {
    filter.technician = query.technician;
  }

  return Object.keys(filter).length > 0 ? filter : undefined;
}

export function buildRepairSummaryWhere(
  query: RepairSummaryQuery,
): Prisma.RepairWhereInput | undefined {
  const filterRecord = toRepairFilterRecord(query);
  const filterWhere = filterRecord
    ? mapRepairSummaryFilter(filterRecord)
    : undefined;

  // Domain search maps remarks → repairNotes / assignedTo → technician.
  // Prisma columns are remarks and assignedTo.
  const searchFields = ["repairNumber", "remarks", "assignedTo"] as const;
  const searchWhere = buildSearchWhereFromInput<Prisma.RepairWhereInput>(
    query.search !== undefined && query.search.trim().length > 0
      ? { term: query.search.trim(), fields: [...searchFields] }
      : undefined,
    [...searchFields],
  );

  void REPAIR_SEARCH_FIELDS;

  return mergePrismaWhere(filterWhere, searchWhere);
}

export function mergeRepairWhere(
  base: Prisma.RepairWhereInput | undefined,
  extra: Prisma.RepairWhereInput,
): Prisma.RepairWhereInput {
  return mergePrismaWhere(base, extra) ?? extra;
}
