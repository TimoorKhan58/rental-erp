import type {
  AssetCategoryId,
  AssetId,
  AssetMaintenanceHistoryId,
  AssetTransferId,
  SupplierId,
  UserId,
  WarehouseId,
} from "@/shared/domain/ids";

import type { AssetStatus } from "./asset.constants";
import type { AssetCode } from "./value-objects/asset-code.vo";

export interface AssetProps {
  id: AssetId;
  assetCode: AssetCode;
  name: string;
  categoryId: AssetCategoryId;
  serialNumber: string | null;
  purchaseDate: Date;
  purchaseCost: number;
  residualValue: number;
  usefulLifeMonths: number;
  currentBookValue: number;
  warehouseId: WarehouseId;
  assignedEmployeeId: UserId | null;
  vendorId: SupplierId | null;
  notes: string | null;
  status: AssetStatus;
  disposalDate: Date | null;
  disposalAmount: number | null;
  disposalReason: string | null;
  disposedById: UserId | null;
  createdById: UserId;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAssetData {
  assetCode: AssetCode;
  name: string;
  categoryId: AssetCategoryId;
  serialNumber?: string | null;
  purchaseDate: Date;
  purchaseCost: number;
  residualValue: number;
  usefulLifeMonths: number;
  warehouseId: WarehouseId;
  assignedEmployeeId?: UserId | null;
  vendorId?: SupplierId | null;
  notes?: string | null;
  createdById: UserId;
}

export interface UpdateAssetData {
  name?: string;
  categoryId?: AssetCategoryId;
  serialNumber?: string | null;
  purchaseDate?: Date;
  purchaseCost?: number;
  residualValue?: number;
  usefulLifeMonths?: number;
  warehouseId?: WarehouseId;
  assignedEmployeeId?: UserId | null;
  vendorId?: SupplierId | null;
  notes?: string | null;
}

export interface TransferAssetData {
  toWarehouseId: WarehouseId;
  transferDate: Date;
  reason?: string | null;
  transferredById: UserId;
}

export interface DisposeAssetData {
  disposalDate: Date;
  disposalAmount?: number | null;
  disposalReason?: string | null;
  disposedById: UserId;
}

export interface AddMaintenanceHistoryData {
  serviceDate: Date;
  vendor?: string | null;
  cost: number;
  description: string;
  completedById: UserId;
  setUnderMaintenance?: boolean;
}

export interface AssetTransferRecord {
  id: AssetTransferId;
  assetId: AssetId;
  fromWarehouseId: WarehouseId;
  toWarehouseId: WarehouseId;
  transferDate: Date;
  reason: string | null;
  transferredById: UserId;
  createdAt: Date;
}

export interface AssetMaintenanceHistoryRecord {
  id: AssetMaintenanceHistoryId;
  assetId: AssetId;
  serviceDate: Date;
  vendor: string | null;
  cost: number;
  description: string;
  completedById: UserId;
  createdAt: Date;
}

export interface CreateAssetTransferData extends TransferAssetData {
  assetId: AssetId;
  fromWarehouseId: WarehouseId;
}
