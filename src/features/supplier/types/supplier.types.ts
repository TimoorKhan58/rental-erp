import type { PaginationMeta } from "@/types/api";

export type SupplierResponse = {
  id: string;
  supplierCode: string;
  name: string;
  phone: string;
  email: string | null;
  address: string;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SupplierListResponse = {
  items: SupplierResponse[];
  meta: PaginationMeta;
};

export type SupplierSortField =
  | "name"
  | "supplierCode"
  | "phone"
  | "email"
  | "createdAt"
  | "updatedAt"
  | "isActive";

export type ListSuppliersParams = {
  page?: number;
  pageSize?: number;
  sortBy?: SupplierSortField;
  sortOrder?: "asc" | "desc";
  search?: string;
  isActive?: boolean;
};

export type CreateSupplierPayload = {
  supplierCode: string;
  name: string;
  phone: string;
  email?: string | null;
  address: string;
  notes?: string | null;
  isActive?: boolean;
};

export type UpdateSupplierPayload = {
  name?: string;
  phone?: string;
  email?: string | null;
  address?: string;
  notes?: string | null;
  isActive?: boolean;
};
