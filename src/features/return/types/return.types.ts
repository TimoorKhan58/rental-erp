import type { PaginationMeta } from "@/types/api";

export const RETURN_STATUSES = [
  "DRAFT",
  "RECEIVED",
  "INSPECTED",
  "COMPLETED",
  "CANCELLED",
] as const;

export type ReturnStatus = (typeof RETURN_STATUSES)[number];

export type ReturnItemResponse = {
  id: string;
  rentalOrderItemId: string;
  dispatchItemId: string | null;
  returnedQuantity: number;
  goodQuantity: number;
  damagedQuantity: number;
  lostQuantity: number;
  notes: string | null;
};

export type ReturnResponse = {
  id: string;
  returnNumber: string;
  rentalOrderId: string;
  dispatchId: string;
  returnDate: string;
  remarks: string | null;
  status: ReturnStatus;
  receivedAt: string | null;
  inspectedAt: string | null;
  completedAt: string | null;
  items: ReturnItemResponse[];
  createdById: string;
  createdAt: string;
  updatedAt: string;
};

export type ReturnListResponse = {
  items: ReturnResponse[];
  meta: PaginationMeta;
};

export type ReturnSortField =
  | "returnNumber"
  | "inspectionDate"
  | "status"
  | "createdAt";

export type ListReturnsParams = {
  page?: number;
  pageSize?: number;
  sortBy?: ReturnSortField;
  sortOrder?: "asc" | "desc";
  search?: string;
  status?: ReturnStatus;
  rentalOrderId?: string;
  dispatchId?: string;
};

export type ReturnLineItemPayload = {
  rentalOrderItemId: string;
  dispatchItemId?: string | null;
  quantity: number;
  notes?: string | null;
};

export type CreateReturnPayload = {
  returnNumber: string;
  rentalOrderId: string;
  dispatchId: string;
  returnDate: string;
  remarks?: string | null;
  items: ReturnLineItemPayload[];
};

export type UpdateReturnPayload = {
  returnDate?: string;
  remarks?: string | null;
  items?: ReturnLineItemPayload[];
};

export type InspectReturnItemPayload = {
  rentalOrderItemId: string;
  goodQuantity: number;
  damagedQuantity: number;
  lostQuantity: number;
  notes?: string | null;
};

export type InspectReturnPayload = {
  items: InspectReturnItemPayload[];
};
