import { Asset } from "@/modules/asset/domain/asset.entity";
import { createAssetCode } from "@/modules/asset/domain";
import type { CreateAssetData } from "@/modules/asset/domain/asset.types";
import type {
  AssetCategoryId,
  AssetId,
  UserId,
  WarehouseId,
} from "@/shared/domain/ids";

export const ASSET_ID =
  "aa0e8400-e29b-41d4-a716-446655440000" as AssetId;

export const OTHER_ASSET_ID =
  "aa0e8400-e29b-41d4-a716-446655440001" as AssetId;

export const CATEGORY_ID =
  "aa0e8400-e29b-41d4-a716-446655440010" as AssetCategoryId;

export const OTHER_CATEGORY_ID =
  "aa0e8400-e29b-41d4-a716-446655440011" as AssetCategoryId;

export const WAREHOUSE_ID =
  "660e8400-e29b-41d4-a716-446655440000" as WarehouseId;

export const OTHER_WAREHOUSE_ID =
  "660e8400-e29b-41d4-a716-446655440001" as WarehouseId;

export const USER_ID =
  "550e8400-e29b-41d4-a716-446655440000" as UserId;

export const VALID_CREATE_INPUT = {
  assetCode: "AST-001",
  name: "Forklift Model X",
  categoryId: CATEGORY_ID,
  serialNumber: "SN-12345",
  purchaseDate: "2025-06-01",
  purchaseCost: 500000,
  residualValue: 50000,
  usefulLifeMonths: 60,
  warehouseId: WAREHOUSE_ID,
  notes: "Primary warehouse equipment",
};

export const VALID_TRANSFER_INPUT = {
  toWarehouseId: OTHER_WAREHOUSE_ID,
  transferDate: "2026-01-20",
  reason: "Relocated to secondary hub",
};

export const VALID_DISPOSE_INPUT = {
  disposalDate: "2026-02-01",
  disposalAmount: 25000,
  disposalReason: "End of useful life",
};

export const VALID_MAINTENANCE_INPUT = {
  serviceDate: "2026-01-25",
  vendor: "Service Co",
  cost: 1500,
  description: "Annual inspection",
  setUnderMaintenance: true,
};

export function buildCreateAssetData(
  override: Partial<CreateAssetData> = {},
): CreateAssetData {
  return {
    assetCode: createAssetCode(VALID_CREATE_INPUT.assetCode),
    name: VALID_CREATE_INPUT.name,
    categoryId: CATEGORY_ID,
    serialNumber: VALID_CREATE_INPUT.serialNumber,
    purchaseDate: new Date(VALID_CREATE_INPUT.purchaseDate),
    purchaseCost: VALID_CREATE_INPUT.purchaseCost,
    residualValue: VALID_CREATE_INPUT.residualValue,
    usefulLifeMonths: VALID_CREATE_INPUT.usefulLifeMonths,
    warehouseId: WAREHOUSE_ID,
    notes: VALID_CREATE_INPUT.notes,
    createdById: USER_ID,
    ...override,
  };
}

export function buildAssetEntity(
  override: Partial<ReturnType<typeof Asset.create>> & {
    id?: AssetId;
    status?: Asset["status"];
    currentBookValue?: number;
    disposalDate?: Date | null;
    disposalAmount?: number | null;
    disposalReason?: string | null;
    disposedById?: UserId | null;
    createdAt?: Date;
    updatedAt?: Date;
  } = {},
): Asset {
  const created = Asset.create(buildCreateAssetData());
  const now = new Date("2026-01-15T10:00:00.000Z");

  return Asset.reconstitute({
    id: override.id ?? ASSET_ID,
    assetCode: override.assetCode ?? created.assetCode,
    name: override.name ?? created.name,
    categoryId: override.categoryId ?? created.categoryId,
    serialNumber: override.serialNumber ?? created.serialNumber,
    purchaseDate: override.purchaseDate ?? created.purchaseDate,
    purchaseCost: override.purchaseCost ?? created.purchaseCost,
    residualValue: override.residualValue ?? created.residualValue,
    usefulLifeMonths: override.usefulLifeMonths ?? created.usefulLifeMonths,
    currentBookValue:
      override.currentBookValue ?? created.purchaseCost,
    warehouseId: override.warehouseId ?? created.warehouseId,
    assignedEmployeeId:
      override.assignedEmployeeId ?? created.assignedEmployeeId,
    vendorId: override.vendorId ?? created.vendorId,
    notes: override.notes ?? created.notes,
    status: override.status ?? "ACTIVE",
    disposalDate: override.disposalDate ?? null,
    disposalAmount: override.disposalAmount ?? null,
    disposalReason: override.disposalReason ?? null,
    disposedById: override.disposedById ?? null,
    createdById: override.createdById ?? created.createdById,
    createdAt: override.createdAt ?? now,
    updatedAt: override.updatedAt ?? now,
  });
}

export function buildDisposedAssetEntity(
  override: Parameters<typeof buildAssetEntity>[0] = {},
): Asset {
  return buildAssetEntity({
    status: "DISPOSED",
    disposalDate: new Date(VALID_DISPOSE_INPUT.disposalDate),
    disposalAmount: VALID_DISPOSE_INPUT.disposalAmount,
    disposalReason: VALID_DISPOSE_INPUT.disposalReason,
    disposedById: USER_ID,
    ...override,
  });
}

export function buildUnderMaintenanceAssetEntity(
  override: Parameters<typeof buildAssetEntity>[0] = {},
): Asset {
  return buildAssetEntity({
    status: "UNDER_MAINTENANCE",
    ...override,
  });
}
