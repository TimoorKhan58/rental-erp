import type { CustomerId, WarehouseId } from "@/shared/domain/ids";

import type { RentalOrderStatus } from "./rental-order.constants";

export interface RentalOrderSummaryQuery {
  search?: string;
  status?: RentalOrderStatus;
  customerId?: CustomerId;
  warehouseId?: WarehouseId;
  eventFrom?: Date;
  eventTo?: Date;
}
