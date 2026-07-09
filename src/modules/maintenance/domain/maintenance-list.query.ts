import type { InventoryId } from "@/shared/domain/ids";
import type { ProductId } from "@/shared/domain/ids";
import type { WarehouseId } from "@/shared/domain/ids";

import type {
  MaintenanceSortField,
  MaintenanceStatus,
} from "./maintenance.constants";

export interface MaintenanceListQuery {
  page: number;
  pageSize: number;
  sortBy?: MaintenanceSortField;
  sortOrder?: "asc" | "desc";
  search?: string;
  status?: MaintenanceStatus;
  productId?: ProductId;
  warehouseId?: WarehouseId;
  inventoryId?: InventoryId;
}
