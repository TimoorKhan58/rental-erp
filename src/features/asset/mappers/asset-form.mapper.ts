import type {
  CreateAssetFormValues,
  DisposeAssetFormValues,
  MaintenanceAssetFormValues,
  TransferAssetFormValues,
  UpdateAssetFormValues,
} from "../schemas";
import type {
  AddMaintenancePayload,
  AssetResponse,
  CreateAssetPayload,
  DisposeAssetPayload,
  TransferAssetPayload,
  UpdateAssetPayload,
} from "../types";

function normalizeOptionalString(value: string | null | undefined): string | null {
  if (value === undefined || value === null || value.trim() === "") {
    return null;
  }
  return value.trim();
}

export function parseMoney(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === "") {
    return 0;
  }
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatMoneyInput(value: string | number | null | undefined): number {
  return parseMoney(value);
}

export function generateAssetCode(): string {
  const date = new Date();
  const ymd = date.toISOString().slice(0, 10).replaceAll("-", "");
  const suffix = String(date.getTime()).slice(-4);
  return `AST-${ymd}-${suffix}`;
}

export function toCreateAssetPayload(
  values: CreateAssetFormValues,
): CreateAssetPayload {
  return {
    assetCode: values.assetCode.trim() || generateAssetCode(),
    name: values.name.trim(),
    categoryId: values.categoryId,
    serialNumber: normalizeOptionalString(values.serialNumber),
    purchaseDate: values.purchaseDate,
    purchaseCost: values.purchaseCost,
    residualValue: values.residualValue,
    usefulLifeMonths: values.usefulLifeMonths,
    warehouseId: values.warehouseId,
    assignedEmployeeId: normalizeOptionalString(values.assignedEmployeeId),
    vendorId: normalizeOptionalString(values.vendorId),
    notes: normalizeOptionalString(values.notes),
  };
}

export function toUpdateAssetPayload(
  values: UpdateAssetFormValues,
): UpdateAssetPayload {
  return {
    name: values.name.trim(),
    categoryId: values.categoryId,
    serialNumber: normalizeOptionalString(values.serialNumber),
    purchaseDate: values.purchaseDate,
    purchaseCost: values.purchaseCost,
    residualValue: values.residualValue,
    usefulLifeMonths: values.usefulLifeMonths,
    warehouseId: values.warehouseId,
    assignedEmployeeId: normalizeOptionalString(values.assignedEmployeeId),
    vendorId: normalizeOptionalString(values.vendorId),
    notes: normalizeOptionalString(values.notes),
  };
}

export function toAssetFormValues(asset: AssetResponse): UpdateAssetFormValues {
  return {
    name: asset.name,
    categoryId: asset.categoryId,
    serialNumber: asset.serialNumber ?? "",
    purchaseDate: asset.purchaseDate,
    purchaseCost: parseMoney(asset.purchaseCost),
    residualValue: parseMoney(asset.residualValue),
    usefulLifeMonths: asset.usefulLifeMonths,
    warehouseId: asset.warehouseId,
    assignedEmployeeId: asset.assignedEmployeeId ?? "",
    vendorId: asset.vendorId ?? "",
    notes: asset.notes ?? "",
  };
}

export function toTransferAssetPayload(
  values: TransferAssetFormValues,
): TransferAssetPayload {
  return {
    toWarehouseId: values.toWarehouseId,
    transferDate: values.transferDate,
    reason: normalizeOptionalString(values.reason),
  };
}

export function toDisposeAssetPayload(
  values: DisposeAssetFormValues,
): DisposeAssetPayload {
  return {
    disposalDate: values.disposalDate,
    disposalAmount:
      values.disposalAmount === undefined || values.disposalAmount === null
        ? null
        : values.disposalAmount,
    disposalReason: normalizeOptionalString(values.disposalReason),
  };
}

export function toMaintenancePayload(
  values: MaintenanceAssetFormValues,
): AddMaintenancePayload {
  return {
    serviceDate: values.serviceDate,
    vendor: normalizeOptionalString(values.vendor),
    cost: values.cost,
    description: values.description.trim(),
    setUnderMaintenance: values.setUnderMaintenance ?? false,
  };
}
