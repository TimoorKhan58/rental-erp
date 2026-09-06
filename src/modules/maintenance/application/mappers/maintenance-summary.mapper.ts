import type {
  InventoryId,
  ProductId,
  WarehouseId,
} from "@/shared/domain/ids";

import type { GetMaintenanceSummaryInput } from "../schemas/get-maintenance-summary.schema";

export function toMaintenanceSummaryQuery(input: GetMaintenanceSummaryInput) {
  return {
    search: input.search,
    status: input.status,
    productId: input.productId as ProductId | undefined,
    warehouseId: input.warehouseId as WarehouseId | undefined,
    inventoryId: input.inventoryId as InventoryId | undefined,
    serviceType: input.serviceType,
    scheduledDateFrom: input.scheduledDateFrom,
    scheduledDateTo: input.scheduledDateTo,
    technician: input.technician,
  };
}
