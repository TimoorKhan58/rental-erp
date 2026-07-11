import type { PaginationMeta } from "@/types/api";

export const RENTAL_ORDER_STATUSES = [
  "DRAFT",
  "CONFIRMED",
  "RESERVED",
  "CANCELLED",
] as const;

export type RentalOrderStatus = (typeof RENTAL_ORDER_STATUSES)[number];

export type RentalReservationFilter =
  | "not-started"
  | "partial"
  | "complete";

export type RentalOrderItemResponse = {
  id: string;
  productId: string;
  quantity: number;
  dailyRate: number;
  reservedQuantity: number;
};

export type RentalOrderResponse = {
  id: string;
  orderNumber: string;
  customerId: string;
  warehouseId: string;
  status: RentalOrderStatus;
  startDate: string;
  endDate: string;
  remarks: string | null;
  items: RentalOrderItemResponse[];
  createdById: string;
  createdAt: string;
  updatedAt: string;
};

export type RentalOrderListResponse = {
  items: RentalOrderResponse[];
  meta: PaginationMeta;
};

export type RentalOrderSortField =
  | "orderNumber"
  | "eventStartDate"
  | "eventEndDate"
  | "status"
  | "createdAt";

export type ListRentalOrdersParams = {
  page?: number;
  pageSize?: number;
  sortBy?: RentalOrderSortField;
  sortOrder?: "asc" | "desc";
  search?: string;
  status?: RentalOrderStatus;
  customerId?: string;
  warehouseId?: string;
};

export type RentalOrderLineItemPayload = {
  productId: string;
  quantity: number;
  dailyRate: number;
};

export type CreateRentalOrderPayload = {
  orderNumber: string;
  customerId: string;
  warehouseId: string;
  startDate: string;
  endDate: string;
  remarks?: string | null;
  items: RentalOrderLineItemPayload[];
};

export type UpdateRentalOrderPayload = {
  customerId?: string;
  warehouseId?: string;
  startDate?: string;
  endDate?: string;
  remarks?: string | null;
  items?: RentalOrderLineItemPayload[];
};

export type ReserveRentalOrderPayload = {
  items: Array<{
    productId: string;
    quantity: number;
  }>;
};
