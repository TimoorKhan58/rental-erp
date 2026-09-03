import type { RentalOrderId } from "@/shared/domain/ids";

import type { DispatchStatus } from "./dispatch.constants";

export interface DispatchSummaryQuery {
  search?: string;
  status?: DispatchStatus;
  rentalOrderId?: RentalOrderId;
  warehouseId?: string;
  dispatchDateFrom?: Date;
  dispatchDateTo?: Date;
}
