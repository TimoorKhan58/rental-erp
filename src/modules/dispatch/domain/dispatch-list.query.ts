import type { RentalOrderId } from "@/shared/domain/ids";

import type { DispatchSortField, DispatchStatus } from "./dispatch.constants";

export interface DispatchListQuery {
  page: number;
  pageSize: number;
  sortBy?: DispatchSortField;
  sortOrder?: "asc" | "desc";
  search?: string;
  status?: DispatchStatus;
  rentalOrderId?: RentalOrderId;
}
