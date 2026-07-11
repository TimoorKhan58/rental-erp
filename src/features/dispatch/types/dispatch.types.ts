import type { PaginationMeta } from "@/types/api";

export const DISPATCH_STATUSES = [
  "DRAFT",
  "READY",
  "DISPATCHED",
  "COMPLETED",
  "CANCELLED",
] as const;

export type DispatchStatus = (typeof DISPATCH_STATUSES)[number];

export const DELIVERY_METHODS = ["DELIVERY", "CUSTOMER_PICKUP"] as const;

export type DeliveryMethod = (typeof DELIVERY_METHODS)[number];

export type DispatchItemResponse = {
  id: string;
  productId: string;
  rentalOrderItemId: string | null;
  quantity: number;
  notes: string | null;
};

export type DispatchResponse = {
  id: string;
  dispatchNumber: string;
  rentalOrderId: string;
  dispatchDate: string;
  deliveryMethod: DeliveryMethod;
  vehicleNumber: string | null;
  driverName: string | null;
  driverPhone: string | null;
  deliveryAddress: string;
  remarks: string | null;
  status: DispatchStatus;
  readyAt: string | null;
  dispatchedAt: string | null;
  completedAt: string | null;
  items: DispatchItemResponse[];
  createdById: string;
  createdAt: string;
  updatedAt: string;
};

export type DispatchListResponse = {
  items: DispatchResponse[];
  meta: PaginationMeta;
};

export type DispatchSortField =
  | "dispatchNumber"
  | "dispatchDate"
  | "status"
  | "createdAt";

export type ListDispatchesParams = {
  page?: number;
  pageSize?: number;
  sortBy?: DispatchSortField;
  sortOrder?: "asc" | "desc";
  search?: string;
  status?: DispatchStatus;
  rentalOrderId?: string;
};

export type DispatchLineItemPayload = {
  productId: string;
  rentalOrderItemId?: string | null;
  quantity: number;
  notes?: string | null;
};

export type CreateDispatchPayload = {
  dispatchNumber: string;
  rentalOrderId: string;
  dispatchDate: string;
  deliveryMethod: DeliveryMethod;
  vehicleNumber?: string | null;
  driverName?: string | null;
  driverPhone?: string | null;
  deliveryAddress: string;
  remarks?: string | null;
  items: DispatchLineItemPayload[];
};

export type UpdateDispatchPayload = {
  dispatchDate?: string;
  deliveryMethod?: DeliveryMethod;
  vehicleNumber?: string | null;
  driverName?: string | null;
  driverPhone?: string | null;
  deliveryAddress?: string;
  remarks?: string | null;
  items?: DispatchLineItemPayload[];
  markReady?: boolean;
};
