import type { PaginationMeta } from "@/types/api";

export const ASSET_STATUSES = [
  "ACTIVE",
  "UNDER_MAINTENANCE",
  "TRANSFERRED",
  "DISPOSED",
] as const;
export type AssetStatus = (typeof ASSET_STATUSES)[number];

export type AssetResponse = {
  id: string;
  assetCode: string;
  name: string;
  categoryId: string;
  serialNumber: string | null;
  purchaseDate: string;
  purchaseCost: string;
  residualValue: string;
  usefulLifeMonths: number;
  currentBookValue: string;
  warehouseId: string;
  assignedEmployeeId: string | null;
  vendorId: string | null;
  notes: string | null;
  status: AssetStatus;
  disposalDate: string | null;
  disposalAmount: string | null;
  disposalReason: string | null;
  disposedById: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  transfers?: AssetTransferResponse[];
  maintenanceHistory?: AssetMaintenanceHistoryResponse[];
};

export type AssetTransferResponse = {
  id: string;
  assetId: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  transferDate: string;
  reason: string | null;
  transferredById: string;
  createdAt: string;
};

export type AssetMaintenanceHistoryResponse = {
  id: string;
  assetId: string;
  serviceDate: string;
  vendor: string | null;
  cost: string;
  description: string;
  completedById: string;
  createdAt: string;
};

export type AssetListResponse = {
  items: AssetResponse[];
  meta: PaginationMeta;
};

export type AssetSortField =
  | "name"
  | "assetCode"
  | "purchaseDate"
  | "purchaseCost"
  | "currentBookValue"
  | "status"
  | "createdAt"
  | "updatedAt";

export type ListAssetsParams = {
  page?: number;
  pageSize?: number;
  sortBy?: AssetSortField;
  sortOrder?: "asc" | "desc";
  search?: string;
  status?: AssetStatus;
  categoryId?: string;
  warehouseId?: string;
};

export type CreateAssetPayload = {
  assetCode: string;
  name: string;
  categoryId: string;
  serialNumber?: string | null;
  purchaseDate: string;
  purchaseCost: number;
  residualValue: number;
  usefulLifeMonths: number;
  warehouseId: string;
  assignedEmployeeId?: string | null;
  vendorId?: string | null;
  notes?: string | null;
};

export type UpdateAssetPayload = {
  name?: string;
  categoryId?: string;
  serialNumber?: string | null;
  purchaseDate?: string;
  purchaseCost?: number;
  residualValue?: number;
  usefulLifeMonths?: number;
  warehouseId?: string;
  assignedEmployeeId?: string | null;
  vendorId?: string | null;
  notes?: string | null;
};

export type TransferAssetPayload = {
  toWarehouseId: string;
  transferDate: string;
  reason?: string | null;
};

export type DisposeAssetPayload = {
  disposalDate: string;
  disposalAmount?: number | null;
  disposalReason?: string | null;
};

export type AddMaintenancePayload = {
  serviceDate: string;
  vendor?: string | null;
  cost: number;
  description: string;
  setUnderMaintenance?: boolean;
};

export type AssetCategoryResponse = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AssetCategoryListResponse = {
  items: AssetCategoryResponse[];
  meta: PaginationMeta;
};

export type ListAssetCategoriesParams = {
  page?: number;
  pageSize?: number;
  sortBy?: "name" | "createdAt" | "updatedAt" | "isActive";
  sortOrder?: "asc" | "desc";
  search?: string;
  isActive?: boolean;
};

export type CreateAssetCategoryPayload = {
  name: string;
  description?: string | null;
  isActive?: boolean;
};
