import type { PaginationMeta } from "@/types/api";

export type WarehouseResponse = {
  id: string;
  warehouseCode: string;
  name: string;
  description: string | null;
  address: string | null;
  contactPerson: string | null;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type WarehouseListResponse = {
  items: WarehouseResponse[];
  meta: PaginationMeta;
};

export type WarehouseSortField =
  | "name"
  | "warehouseCode"
  | "contactPerson"
  | "phone"
  | "createdAt"
  | "updatedAt"
  | "isActive";

export type ListWarehousesParams = {
  page?: number;
  pageSize?: number;
  sortBy?: WarehouseSortField;
  sortOrder?: "asc" | "desc";
  search?: string;
  isActive?: boolean;
};

export type CreateWarehousePayload = {
  warehouseCode: string;
  name: string;
  description?: string | null;
  address?: string | null;
  contactPerson?: string | null;
  phone?: string | null;
  isActive?: boolean;
};

export type UpdateWarehousePayload = {
  name?: string;
  description?: string | null;
  address?: string | null;
  contactPerson?: string | null;
  phone?: string | null;
  isActive?: boolean;
};
