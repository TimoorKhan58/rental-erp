import type { AssetStatus } from "@/modules/asset/domain";

export interface AssetDto {
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
  transfers?: AssetTransferDto[];
  maintenanceHistory?: AssetMaintenanceHistoryDto[];
}

export interface AssetTransferDto {
  id: string;
  assetId: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  transferDate: string;
  reason: string | null;
  transferredById: string;
  createdAt: string;
}

export interface AssetMaintenanceHistoryDto {
  id: string;
  assetId: string;
  serviceDate: string;
  vendor: string | null;
  cost: string;
  description: string;
  completedById: string;
  createdAt: string;
}

export interface CreateAssetDto {
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
}

export interface UpdateAssetDto {
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
}

export interface TransferAssetDto {
  toWarehouseId: string;
  transferDate: string;
  reason?: string | null;
}

export interface DisposeAssetDto {
  disposalDate: string;
  disposalAmount?: number | null;
  disposalReason?: string | null;
}

export interface AddMaintenanceHistoryDto {
  serviceDate: string;
  vendor?: string | null;
  cost: number;
  description: string;
  setUnderMaintenance?: boolean;
}

export interface AssetIdParamDto {
  id: string;
}
