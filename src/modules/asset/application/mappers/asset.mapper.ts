import {
  Asset,
  createAssetCode,
  type AddMaintenanceHistoryData,
  type AssetMaintenanceHistoryRecord,
  type AssetTransferRecord,
  type CreateAssetData,
  type DisposeAssetData,
  type TransferAssetData,
  type UpdateAssetData,
} from "@/modules/asset/domain";
import type {
  AssetCategoryId,
  AssetId,
  SupplierId,
  UserId,
  WarehouseId,
} from "@/shared/domain/ids";

import type {
  AssetDto,
  AssetMaintenanceHistoryDto,
  AssetTransferDto,
} from "../dtos/asset.dto";
import type {
  AddMaintenanceHistoryInput,
  CreateAssetInput,
  DisposeAssetInput,
  TransferAssetInput,
  UpdateAssetInput,
} from "../schemas/asset.schemas";
import { decimalToDtoString } from "./asset-decimal.mapper";

export function toAssetId(id: string): AssetId {
  return id as AssetId;
}

export function toAssetCategoryId(id: string): AssetCategoryId {
  return id as AssetCategoryId;
}

export function toWarehouseId(id: string): WarehouseId {
  return id as WarehouseId;
}

export function toSupplierId(id: string): SupplierId {
  return id as SupplierId;
}

export function toUserId(id: string): UserId {
  return id as UserId;
}

export function toCreateAssetData(
  input: CreateAssetInput,
  createdById: UserId,
): CreateAssetData {
  return {
    assetCode: createAssetCode(input.assetCode),
    name: input.name,
    categoryId: toAssetCategoryId(input.categoryId),
    serialNumber: input.serialNumber,
    purchaseDate: input.purchaseDate,
    purchaseCost: input.purchaseCost,
    residualValue: input.residualValue,
    usefulLifeMonths: input.usefulLifeMonths,
    warehouseId: toWarehouseId(input.warehouseId),
    assignedEmployeeId:
      input.assignedEmployeeId !== undefined && input.assignedEmployeeId !== null
        ? toUserId(input.assignedEmployeeId)
        : input.assignedEmployeeId,
    vendorId:
      input.vendorId !== undefined && input.vendorId !== null
        ? toSupplierId(input.vendorId)
        : input.vendorId,
    notes: input.notes,
    createdById,
  };
}

export function toUpdateAssetData(input: UpdateAssetInput): UpdateAssetData {
  return {
    name: input.name,
    categoryId:
      input.categoryId !== undefined
        ? toAssetCategoryId(input.categoryId)
        : undefined,
    serialNumber: input.serialNumber,
    purchaseDate: input.purchaseDate,
    purchaseCost: input.purchaseCost,
    residualValue: input.residualValue,
    usefulLifeMonths: input.usefulLifeMonths,
    warehouseId:
      input.warehouseId !== undefined
        ? toWarehouseId(input.warehouseId)
        : undefined,
    assignedEmployeeId:
      input.assignedEmployeeId !== undefined
        ? input.assignedEmployeeId !== null
          ? toUserId(input.assignedEmployeeId)
          : null
        : undefined,
    vendorId:
      input.vendorId !== undefined
        ? input.vendorId !== null
          ? toSupplierId(input.vendorId)
          : null
        : undefined,
    notes: input.notes,
  };
}

export function toTransferAssetData(
  input: TransferAssetInput,
  transferredById: UserId,
): TransferAssetData {
  return {
    toWarehouseId: toWarehouseId(input.toWarehouseId),
    transferDate: input.transferDate,
    reason: input.reason,
    transferredById,
  };
}

export function toDisposeAssetData(
  input: DisposeAssetInput,
  disposedById: UserId,
): DisposeAssetData {
  return {
    disposalDate: input.disposalDate,
    disposalAmount: input.disposalAmount,
    disposalReason: input.disposalReason,
    disposedById,
  };
}

export function toAddMaintenanceHistoryData(
  input: AddMaintenanceHistoryInput,
  completedById: UserId,
): AddMaintenanceHistoryData {
  return {
    serviceDate: input.serviceDate,
    vendor: input.vendor,
    cost: input.cost,
    description: input.description,
    completedById,
    setUnderMaintenance: input.setUnderMaintenance,
  };
}

export function toAssetDto(asset: Asset): AssetDto {
  const props = asset.toProps();

  return {
    id: props.id,
    assetCode: props.assetCode,
    name: props.name,
    categoryId: props.categoryId,
    serialNumber: props.serialNumber,
    purchaseDate: props.purchaseDate.toISOString().slice(0, 10),
    purchaseCost: decimalToDtoString(props.purchaseCost)!,
    residualValue: decimalToDtoString(props.residualValue)!,
    usefulLifeMonths: props.usefulLifeMonths,
    currentBookValue: decimalToDtoString(props.currentBookValue)!,
    warehouseId: props.warehouseId,
    assignedEmployeeId: props.assignedEmployeeId,
    vendorId: props.vendorId,
    notes: props.notes,
    status: props.status,
    disposalDate: props.disposalDate
      ? props.disposalDate.toISOString().slice(0, 10)
      : null,
    disposalAmount: decimalToDtoString(props.disposalAmount),
    disposalReason: props.disposalReason,
    disposedById: props.disposedById,
    createdById: props.createdById,
    createdAt: props.createdAt.toISOString(),
    updatedAt: props.updatedAt.toISOString(),
  };
}

export function toAssetTransferDto(
  record: AssetTransferRecord,
): AssetTransferDto {
  return {
    id: record.id,
    assetId: record.assetId,
    fromWarehouseId: record.fromWarehouseId,
    toWarehouseId: record.toWarehouseId,
    transferDate: record.transferDate.toISOString().slice(0, 10),
    reason: record.reason,
    transferredById: record.transferredById,
    createdAt: record.createdAt.toISOString(),
  };
}

export function toAssetMaintenanceHistoryDto(
  record: AssetMaintenanceHistoryRecord,
): AssetMaintenanceHistoryDto {
  return {
    id: record.id,
    assetId: record.assetId,
    serviceDate: record.serviceDate.toISOString().slice(0, 10),
    vendor: record.vendor,
    cost: decimalToDtoString(record.cost)!,
    description: record.description,
    completedById: record.completedById,
    createdAt: record.createdAt.toISOString(),
  };
}

export function toAssetDetailDto(
  asset: Asset,
  transfers: AssetTransferRecord[],
  maintenanceHistory: AssetMaintenanceHistoryRecord[],
): AssetDto {
  return {
    ...toAssetDto(asset),
    transfers: transfers.map(toAssetTransferDto),
    maintenanceHistory: maintenanceHistory.map(toAssetMaintenanceHistoryDto),
  };
}
