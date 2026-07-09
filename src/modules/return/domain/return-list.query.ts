import type { DispatchId, RentalOrderId } from "@/shared/domain/ids";

import type { ReturnSortField, ReturnStatus } from "./return.constants";

export interface ReturnListQuery {
  page: number;
  pageSize: number;
  sortBy?: ReturnSortField;
  sortOrder?: "asc" | "desc";
  search?: string;
  status?: ReturnStatus;
  rentalOrderId?: RentalOrderId;
  dispatchId?: DispatchId;
}
