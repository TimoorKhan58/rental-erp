import type { AssetStatus } from "./asset.constants";
import {
  AssetInvalidStatusError,
  AssetInvariantError,
} from "./asset.errors";
import type { AssetProps, CreateAssetData } from "./asset.types";
import { createAssetCode } from "./value-objects/asset-code.vo";

export function validatePurchaseCost(purchaseCost: number): void {
  if (purchaseCost < 0) {
    throw new AssetInvariantError(
      "Purchase cost cannot be negative",
      "purchaseCost",
    );
  }
}

export function validateResidualValue(
  residualValue: number,
  purchaseCost: number,
): void {
  if (residualValue < 0) {
    throw new AssetInvariantError(
      "Residual value cannot be negative",
      "residualValue",
    );
  }

  if (residualValue > purchaseCost) {
    throw new AssetInvariantError(
      "Residual value cannot exceed purchase cost",
      "residualValue",
    );
  }
}

export function validateUsefulLifeMonths(usefulLifeMonths: number): void {
  if (usefulLifeMonths <= 0) {
    throw new AssetInvariantError(
      "Useful life must be greater than zero months",
      "usefulLifeMonths",
    );
  }
}

export function validatePurchaseDate(purchaseDate: Date): void {
  if (Number.isNaN(purchaseDate.getTime())) {
    throw new AssetInvariantError("Invalid purchase date", "purchaseDate");
  }

  const today = new Date();
  today.setHours(23, 59, 59, 999);

  if (purchaseDate.getTime() > today.getTime()) {
    throw new AssetInvariantError(
      "Purchase date cannot be in the future",
      "purchaseDate",
    );
  }
}

export function validateDisposalAmount(disposalAmount: number): void {
  if (disposalAmount < 0) {
    throw new AssetInvariantError(
      "Disposal amount cannot be negative",
      "disposalAmount",
    );
  }
}

export function validateMaintenanceCost(cost: number): void {
  if (cost < 0) {
    throw new AssetInvariantError(
      "Maintenance cost cannot be negative",
      "cost",
    );
  }
}

export function assertCanUpdate(status: AssetStatus): void {
  if (status === "DISPOSED") {
    throw new AssetInvalidStatusError(status, "update");
  }
}

export function assertCanTransfer(status: AssetStatus): void {
  if (status !== "ACTIVE") {
    throw new AssetInvalidStatusError(status, "transfer");
  }
}

export function assertCanDispose(status: AssetStatus): void {
  if (status !== "ACTIVE") {
    throw new AssetInvalidStatusError(status, "dispose");
  }
}

export function assertCanAddMaintenance(status: AssetStatus): void {
  if (status === "DISPOSED") {
    throw new AssetInvalidStatusError(status, "add maintenance");
  }
}

export function assertValidStatusTransition(
  from: AssetStatus,
  to: AssetStatus,
): void {
  const allowed: Record<AssetStatus, readonly AssetStatus[]> = {
    ACTIVE: ["UNDER_MAINTENANCE", "TRANSFERRED", "DISPOSED"],
    UNDER_MAINTENANCE: ["ACTIVE"],
    TRANSFERRED: ["ACTIVE"],
    DISPOSED: [],
  };

  if (!allowed[from].includes(to)) {
    throw new AssetInvalidStatusError(from, `transition to ${to}`);
  }
}

export function normalizeAssetProps(props: AssetProps): AssetProps {
  validatePurchaseDate(props.purchaseDate);
  validatePurchaseCost(props.purchaseCost);
  validateResidualValue(props.residualValue, props.purchaseCost);
  validateUsefulLifeMonths(props.usefulLifeMonths);

  if (props.disposalAmount !== null) {
    validateDisposalAmount(props.disposalAmount);
  }

  return {
    ...props,
    assetCode: createAssetCode(props.assetCode),
    name: normalizeRequiredText(props.name, "name"),
    serialNumber: normalizeOptionalText(props.serialNumber),
    notes: normalizeOptionalText(props.notes),
    disposalReason: normalizeOptionalText(props.disposalReason),
  };
}

export function normalizeCreateAssetData(
  data: CreateAssetData,
): Omit<
  AssetProps,
  | "id"
  | "status"
  | "currentBookValue"
  | "disposalDate"
  | "disposalAmount"
  | "disposalReason"
  | "disposedById"
  | "createdAt"
  | "updatedAt"
> {
  validatePurchaseDate(data.purchaseDate);
  validatePurchaseCost(data.purchaseCost);
  validateResidualValue(data.residualValue, data.purchaseCost);
  validateUsefulLifeMonths(data.usefulLifeMonths);

  return {
    assetCode: createAssetCode(data.assetCode),
    name: normalizeRequiredText(data.name, "name"),
    categoryId: data.categoryId,
    serialNumber: normalizeOptionalText(data.serialNumber),
    purchaseDate: data.purchaseDate,
    purchaseCost: data.purchaseCost,
    residualValue: data.residualValue,
    usefulLifeMonths: data.usefulLifeMonths,
    warehouseId: data.warehouseId,
    assignedEmployeeId: data.assignedEmployeeId ?? null,
    vendorId: data.vendorId ?? null,
    notes: normalizeOptionalText(data.notes),
    createdById: data.createdById,
  };
}

function normalizeRequiredText(value: string, field: string): string {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    throw new AssetInvariantError(`${field} is required`, field);
  }

  return trimmed;
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
