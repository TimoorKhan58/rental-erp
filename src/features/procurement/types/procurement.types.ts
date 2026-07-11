import type { PaginationMeta } from "@/types/api";

export const PURCHASE_ORDER_STATUSES = [
  "DRAFT",
  "APPROVED",
  "PARTIALLY_RECEIVED",
  "RECEIVED",
  "CANCELLED",
] as const;

export type PurchaseOrderStatus = (typeof PURCHASE_ORDER_STATUSES)[number];

export type PurchaseOrderItemResponse = {
  id: string;
  productId: string;
  quantity: number;
  unitCost: number;
  receivedQuantity: number;
};

export type ProcurementResponse = {
  id: string;
  poNumber: string;
  supplierId: string;
  warehouseId: string;
  status: PurchaseOrderStatus;
  orderDate: string;
  expectedDate: string | null;
  remarks: string | null;
  items: PurchaseOrderItemResponse[];
  createdAt: string;
  updatedAt: string;
};

export type ProcurementListResponse = {
  items: ProcurementResponse[];
  meta: PaginationMeta;
};

export type ProcurementSortField =
  | "poNumber"
  | "orderDate"
  | "expectedDate"
  | "status"
  | "createdAt";

export type ListProcurementsParams = {
  page?: number;
  pageSize?: number;
  sortBy?: ProcurementSortField;
  sortOrder?: "asc" | "desc";
  search?: string;
  status?: PurchaseOrderStatus;
  supplierId?: string;
  warehouseId?: string;
};

export type ProcurementLineItemPayload = {
  productId: string;
  quantity: number;
  unitCost: number;
};

export type CreateProcurementPayload = {
  poNumber: string;
  supplierId: string;
  warehouseId: string;
  orderDate: string;
  expectedDate?: string | null;
  remarks?: string | null;
  items: ProcurementLineItemPayload[];
};

export type UpdateProcurementPayload = {
  supplierId?: string;
  warehouseId?: string;
  orderDate?: string;
  expectedDate?: string | null;
  remarks?: string | null;
  items?: ProcurementLineItemPayload[];
};

export type ReceiveProcurementPayload = {
  items: Array<{
    productId: string;
    quantity: number;
  }>;
};
