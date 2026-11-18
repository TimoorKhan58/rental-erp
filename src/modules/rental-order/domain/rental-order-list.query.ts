import type { RentalOrderStage } from "./rental-order-stage";

export interface RentalOrderListQuery {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  search?: string;
  status?: string;
  /** A simple stage (usability revamp R3); `status` wins when both are given. */
  stage?: RentalOrderStage;
  /** For the late stage: keep orders due back before this business day. */
  returnBefore?: Date;
  customerId?: string;
  warehouseId?: string;
  /** Inclusive — keep orders with eventEndDate >= eventFrom. */
  eventFrom?: Date;
  /** Inclusive — keep orders with eventStartDate <= eventTo. */
  eventTo?: Date;
}
