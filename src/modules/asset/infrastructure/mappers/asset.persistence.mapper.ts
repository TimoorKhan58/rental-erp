import type { Prisma } from "@/generated/prisma/client";
import { Prisma as PrismaNamespace } from "@/generated/prisma/client";
import {
  Asset,
  ASSET_STATUSES,
  type AddMaintenanceHistoryData,
  type AssetMaintenanceHistoryRecord,
  type AssetStatus,
  type AssetTransferRecord,
  type CreateAssetData,
  type DisposeAssetData,
  type TransferAssetData,
  type UpdateAssetData,
} from "@/modules/asset/domain";
import { createAssetCode } from "@/modules/asset/domain";
import type {
  AssetCategoryId,
  AssetId,
  AssetMaintenanceHistoryId,
  AssetTransferId,
  SupplierId,
  UserId,
  WarehouseId,
} from "@/shared/domain/ids";

function decimalToNumber(value: PrismaNamespace.Decimal): number {
  return Number(value.toString());
}

function numberToDecimal(value: number): PrismaNamespace.Decimal {
  return new PrismaNamespace.Decimal(value.toFixed(2));
}

function toDomainStatus(status: string): AssetStatus {
  if ((ASSET_STATUSES as readonly string[]).includes(status)) {
    return status as AssetStatus;
  }

  throw new Error(`Unsupported asset status for module: ${status}`);
}

export function toAssetDomain(record: {
  id: string;
  assetCode: string;
  name: string;
  categoryId: string;
  serialNumber: string | null;
  purchaseDate: Date;
  purchaseCost: PrismaNamespace.Decimal;
  residualValue: PrismaNamespace.Decimal;
  usefulLifeMonths: number;
  currentBookValue: PrismaNamespace.Decimal;
  warehouseId: string;
  assignedEmployeeId: string | null;
  vendorId: string | null;
  notes: string | null;
  status: string;
  disposalDate: Date | null;
  disposalAmount: PrismaNamespace.Decimal | null;
  disposalReason: string | null;
  disposedById: string | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}): Asset {
  return Asset.reconstitute({
    id: record.id as AssetId,
    assetCode: createAssetCode(record.assetCode),
    name: record.name,
    categoryId: record.categoryId as AssetCategoryId,
    serialNumber: record.serialNumber,
    purchaseDate: record.purchaseDate,
    purchaseCost: decimalToNumber(record.purchaseCost),
    residualValue: decimalToNumber(record.residualValue),
    usefulLifeMonths: record.usefulLifeMonths,
    currentBookValue: decimalToNumber(record.currentBookValue),
    warehouseId: record.warehouseId as WarehouseId,
    assignedEmployeeId: record.assignedEmployeeId as UserId | null,
    vendorId: record.vendorId as SupplierId | null,
    notes: record.notes,
    status: toDomainStatus(record.status),
    disposalDate: record.disposalDate,
    disposalAmount:
      record.disposalAmount !== null
        ? decimalToNumber(record.disposalAmount)
        : null,
    disposalReason: record.disposalReason,
    disposedById: record.disposedById as UserId | null,
    createdById: record.createdById as UserId,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
}

export function toAssetCreateInput(
  data: CreateAssetData,
): Prisma.AssetCreateInput {
  const normalized = Asset.create(data);

  return {
    assetCode: normalized.assetCode,
    name: normalized.name,
    category: { connect: { id: normalized.categoryId } },
    serialNumber: normalized.serialNumber,
    purchaseDate: normalized.purchaseDate,
    purchaseCost: numberToDecimal(normalized.purchaseCost),
    residualValue: numberToDecimal(normalized.residualValue),
    usefulLifeMonths: normalized.usefulLifeMonths,
    currentBookValue: numberToDecimal(normalized.purchaseCost),
    warehouse: { connect: { id: normalized.warehouseId } },
    assignedEmployee:
      normalized.assignedEmployeeId !== null
        ? { connect: { id: normalized.assignedEmployeeId } }
        : undefined,
    vendor:
      normalized.vendorId !== null
        ? { connect: { id: normalized.vendorId } }
        : undefined,
    notes: normalized.notes,
    status: "ACTIVE",
    createdBy: { connect: { id: normalized.createdById } },
  };
}

export function toAssetUpdateInput(data: UpdateAssetData): Prisma.AssetUpdateInput {
  return {
    ...(data.name !== undefined ? { name: data.name } : {}),
    ...(data.categoryId !== undefined
      ? { category: { connect: { id: data.categoryId } } }
      : {}),
    ...(data.serialNumber !== undefined ? { serialNumber: data.serialNumber } : {}),
    ...(data.purchaseDate !== undefined ? { purchaseDate: data.purchaseDate } : {}),
    ...(data.purchaseCost !== undefined
      ? { purchaseCost: numberToDecimal(data.purchaseCost) }
      : {}),
    ...(data.residualValue !== undefined
      ? { residualValue: numberToDecimal(data.residualValue) }
      : {}),
    ...(data.usefulLifeMonths !== undefined
      ? { usefulLifeMonths: data.usefulLifeMonths }
      : {}),
    ...(data.warehouseId !== undefined
      ? { warehouse: { connect: { id: data.warehouseId } } }
      : {}),
    ...(data.assignedEmployeeId !== undefined
      ? {
          assignedEmployee:
            data.assignedEmployeeId !== null
              ? { connect: { id: data.assignedEmployeeId } }
              : { disconnect: true },
        }
      : {}),
    ...(data.vendorId !== undefined
      ? {
          vendor:
            data.vendorId !== null
              ? { connect: { id: data.vendorId } }
              : { disconnect: true },
        }
      : {}),
    ...(data.notes !== undefined ? { notes: data.notes } : {}),
  };
}

export function toAssetTransferUpdateInput(
  data: TransferAssetData,
): Prisma.AssetUpdateInput {
  return {
    warehouse: { connect: { id: data.toWarehouseId } },
    status: "ACTIVE",
  };
}

export function toAssetDisposeUpdateInput(
  data: DisposeAssetData,
): Prisma.AssetUpdateInput {
  return {
    status: "DISPOSED",
    disposalDate: data.disposalDate,
    disposalAmount:
      data.disposalAmount !== undefined && data.disposalAmount !== null
        ? numberToDecimal(data.disposalAmount)
        : null,
    disposalReason: data.disposalReason ?? null,
    disposedBy: { connect: { id: data.disposedById } },
  };
}

export function toAssetMaintenanceStatusUpdateInput(
  data: AddMaintenanceHistoryData,
): Prisma.AssetUpdateInput {
  if (!data.setUnderMaintenance) {
    return {};
  }

  return {
    status: "UNDER_MAINTENANCE",
  };
}

export function toAssetTransferCreateInput(data: {
  assetId: AssetId;
  fromWarehouseId: WarehouseId;
  toWarehouseId: WarehouseId;
  transferDate: Date;
  reason?: string | null;
  transferredById: UserId;
}): Prisma.AssetTransferCreateInput {
  return {
    asset: { connect: { id: data.assetId } },
    fromWarehouse: { connect: { id: data.fromWarehouseId } },
    toWarehouse: { connect: { id: data.toWarehouseId } },
    transferDate: data.transferDate,
    reason: data.reason ?? null,
    transferredBy: { connect: { id: data.transferredById } },
  };
}

export function toAssetMaintenanceHistoryCreateInput(
  assetId: AssetId,
  data: AddMaintenanceHistoryData,
): Prisma.AssetMaintenanceHistoryCreateInput {
  return {
    asset: { connect: { id: assetId } },
    serviceDate: data.serviceDate,
    vendor: data.vendor ?? null,
    cost: numberToDecimal(data.cost),
    description: data.description,
    completedBy: { connect: { id: data.completedById } },
  };
}

export function toAssetTransferDomain(record: {
  id: string;
  assetId: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  transferDate: Date;
  reason: string | null;
  transferredById: string;
  createdAt: Date;
}): AssetTransferRecord {
  return {
    id: record.id as AssetTransferId,
    assetId: record.assetId as AssetId,
    fromWarehouseId: record.fromWarehouseId as WarehouseId,
    toWarehouseId: record.toWarehouseId as WarehouseId,
    transferDate: record.transferDate,
    reason: record.reason,
    transferredById: record.transferredById as UserId,
    createdAt: record.createdAt,
  };
}

export function toAssetMaintenanceHistoryDomain(record: {
  id: string;
  assetId: string;
  serviceDate: Date;
  vendor: string | null;
  cost: PrismaNamespace.Decimal;
  description: string;
  completedById: string;
  createdAt: Date;
}): AssetMaintenanceHistoryRecord {
  return {
    id: record.id as AssetMaintenanceHistoryId,
    assetId: record.assetId as AssetId,
    serviceDate: record.serviceDate,
    vendor: record.vendor,
    cost: decimalToNumber(record.cost),
    description: record.description,
    completedById: record.completedById as UserId,
    createdAt: record.createdAt,
  };
}
