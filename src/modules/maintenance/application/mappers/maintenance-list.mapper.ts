import type { MaintenanceListQuery } from "@/modules/maintenance/domain/maintenance-list.query";
import type {
  InventoryId,
  ProductId,
  WarehouseId,
} from "@/shared/domain/ids";

import type { ListMaintenancesInput } from "../schemas/maintenance.schemas";

export function toMaintenanceListQuery(
  input: ListMaintenancesInput,
): MaintenanceListQuery {
  return {
    page: input.page,
    pageSize: input.pageSize,
    sortBy: input.sortBy,
    sortOrder: input.sortOrder,
    search: input.search,
    status: input.status,
    productId: input.productId as ProductId | undefined,
    warehouseId: input.warehouseId as WarehouseId | undefined,
    inventoryId: input.inventoryId as InventoryId | undefined,
  };
}
