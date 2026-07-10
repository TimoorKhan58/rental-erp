import type { AssetDto } from "@/modules/asset/application/dtos/asset.dto";
import type { PaginatedResult, PaginationMeta } from "@/shared/domain/pagination";

export interface AssetResponse {
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
  status: AssetDto["status"];
  disposalDate: string | null;
  disposalAmount: string | null;
  disposalReason: string | null;
  disposedById: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  transfers?: AssetTransferResponse[];
  maintenanceHistory?: AssetMaintenanceHistoryResponse[];
}

export interface AssetTransferResponse {
  id: string;
  assetId: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  transferDate: string;
  reason: string | null;
  transferredById: string;
  createdAt: string;
}

export interface AssetMaintenanceHistoryResponse {
  id: string;
  assetId: string;
  serviceDate: string;
  vendor: string | null;
  cost: string;
  description: string;
  completedById: string;
  createdAt: string;
}

export interface AssetListResponse {
  items: AssetResponse[];
  meta: PaginationMeta;
}

export function toAssetResponse(dto: AssetDto): AssetResponse {
  return {
    id: dto.id,
    assetCode: dto.assetCode,
    name: dto.name,
    categoryId: dto.categoryId,
    serialNumber: dto.serialNumber,
    purchaseDate: dto.purchaseDate,
    purchaseCost: dto.purchaseCost,
    residualValue: dto.residualValue,
    usefulLifeMonths: dto.usefulLifeMonths,
    currentBookValue: dto.currentBookValue,
    warehouseId: dto.warehouseId,
    assignedEmployeeId: dto.assignedEmployeeId,
    vendorId: dto.vendorId,
    notes: dto.notes,
    status: dto.status,
    disposalDate: dto.disposalDate,
    disposalAmount: dto.disposalAmount,
    disposalReason: dto.disposalReason,
    disposedById: dto.disposedById,
    createdById: dto.createdById,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
    transfers: dto.transfers,
    maintenanceHistory: dto.maintenanceHistory,
  };
}

export function toAssetListResponse(
  result: PaginatedResult<AssetDto>,
): AssetListResponse {
  return {
    items: result.items.map(toAssetResponse),
    meta: result.meta,
  };
}
