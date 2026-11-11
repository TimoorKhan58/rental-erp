import type { Prisma } from "@/generated/prisma/client";

import type { InventorySummaryQuery } from "@/modules/inventory/domain/inventory-summary.query";
import { buildInventorySearchClause } from "@/modules/inventory/domain/inventory-search";
import { mergePrismaWhere } from "@/shared/infrastructure/database/repository/query/merge-prisma-where";

function mapInventorySummaryFilter(
  query: InventorySummaryQuery,
): Prisma.InventoryWhereInput | undefined {
  const where: Prisma.InventoryWhereInput = {};

  if (query.productId !== undefined) {
    where.productId = query.productId;
  }

  if (query.warehouseId !== undefined) {
    where.warehouseId = query.warehouseId;
  }

  if (query.isActive !== undefined) {
    where.isActive = query.isActive;
  }

  return Object.keys(where).length > 0 ? where : undefined;
}

export function buildInventorySummaryWhere(
  query: InventorySummaryQuery,
): Prisma.InventoryWhereInput | undefined {
  const filterWhere = mapInventorySummaryFilter(query);
  const searchWhere = buildInventorySearchClause(query.search) as
    | Prisma.InventoryWhereInput
    | undefined;

  return mergePrismaWhere(filterWhere, searchWhere);
}
