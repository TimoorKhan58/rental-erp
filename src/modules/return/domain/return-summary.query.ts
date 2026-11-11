import type { DispatchId, RentalOrderId } from "@/shared/domain/ids";

import type { ReturnStatus } from "./return.constants";

export interface ReturnSummaryQuery {
  search?: string;
  status?: ReturnStatus;
  rentalOrderId?: RentalOrderId;
  dispatchId?: DispatchId;
  returnDateFrom?: Date;
  returnDateTo?: Date;
}
