import type { RepairListQuery } from "@/modules/repair/domain/repair-list.query";
import type {
  ProductId,
  ReturnInspectionId,
  WarehouseId,
} from "@/shared/domain/ids";

import type { ListRepairsInput } from "../schemas/repair.schemas";

export function toRepairListQuery(input: ListRepairsInput): RepairListQuery {
  return {
    page: input.page,
    pageSize: input.pageSize,
    sortBy: input.sortBy,
    sortOrder: input.sortOrder,
    search: input.search,
    status: input.status,
    returnId: input.returnId as ReturnInspectionId | undefined,
    productId: input.productId as ProductId | undefined,
    warehouseId: input.warehouseId as WarehouseId | undefined,
  };
}
