import type { PaginationMeta } from "@/types/api";

export type CustomerResponse = {
  id: string;
  customerCode: string;
  name: string;
  phone: string;
  cnic: string | null;
  address: string;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CustomerListResponse = {
  items: CustomerResponse[];
  meta: PaginationMeta;
};

export type CustomerSortField =
  | "name"
  | "customerCode"
  | "phone"
  | "createdAt"
  | "updatedAt"
  | "isActive";

export type ListCustomersParams = {
  page?: number;
  pageSize?: number;
  sortBy?: CustomerSortField;
  sortOrder?: "asc" | "desc";
  search?: string;
  isActive?: boolean;
};

export type CreateCustomerPayload = {
  customerCode: string;
  name: string;
  phone: string;
  cnic?: string | null;
  address: string;
  notes?: string | null;
  isActive?: boolean;
};

export type UpdateCustomerPayload = {
  name?: string;
  phone?: string;
  cnic?: string | null;
  address?: string;
  notes?: string | null;
  isActive?: boolean;
};

export type UserPermissions = {
  permissions: string[];
  role: string;
};
