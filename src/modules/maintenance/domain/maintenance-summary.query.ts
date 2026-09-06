import type {
  InventoryId,
  ProductId,
  WarehouseId,
} from "@/shared/domain/ids";

import type {
  MaintenanceServiceType,
  MaintenanceStatus,
} from "./maintenance.constants";

export interface MaintenanceSummaryQuery {
  search?: string;
  status?: MaintenanceStatus;
  productId?: ProductId;
  warehouseId?: WarehouseId;
  inventoryId?: InventoryId;
  serviceType?: MaintenanceServiceType;
  scheduledDateFrom?: Date;
  scheduledDateTo?: Date;
  technician?: string;
}
