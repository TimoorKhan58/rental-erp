import type { AssetId } from "@/shared/domain/ids";
import type { Entity } from "@/shared/domain/base-entity";

import type { AssetStatus } from "./asset.constants";
import {
  assertCanAddMaintenance,
  assertCanDispose,
  assertCanTransfer,
  assertCanUpdate,
  normalizeCreateAssetData,
  normalizeAssetProps,
  validateDisposalAmount,
  validateMaintenanceCost,
  validatePurchaseCost,
  validatePurchaseDate,
  validateResidualValue,
  validateUsefulLifeMonths,
} from "./asset.rules";
import type {
  AddMaintenanceHistoryData,
  AssetProps,
  CreateAssetData,
  DisposeAssetData,
  TransferAssetData,
  UpdateAssetData,
} from "./asset.types";

export class Asset implements Entity<AssetId> {
  readonly id: AssetId;
  readonly assetCode: AssetProps["assetCode"];
  readonly name: string;
  readonly categoryId: AssetProps["categoryId"];
  readonly serialNumber: string | null;
  readonly purchaseDate: Date;
  readonly purchaseCost: number;
  readonly residualValue: number;
  readonly usefulLifeMonths: number;
  readonly currentBookValue: number;
  readonly warehouseId: AssetProps["warehouseId"];
  readonly assignedEmployeeId: AssetProps["assignedEmployeeId"];
  readonly vendorId: AssetProps["vendorId"];
  readonly notes: string | null;
  readonly status: AssetStatus;
  readonly disposalDate: Date | null;
  readonly disposalAmount: number | null;
  readonly disposalReason: string | null;
  readonly disposedById: AssetProps["disposedById"];
  readonly createdById: AssetProps["createdById"];
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: AssetProps) {
    const normalized = normalizeAssetProps(props);

    this.id = normalized.id;
    this.assetCode = normalized.assetCode;
    this.name = normalized.name;
    this.categoryId = normalized.categoryId;
    this.serialNumber = normalized.serialNumber;
    this.purchaseDate = normalized.purchaseDate;
    this.purchaseCost = normalized.purchaseCost;
    this.residualValue = normalized.residualValue;
    this.usefulLifeMonths = normalized.usefulLifeMonths;
    this.currentBookValue = normalized.currentBookValue;
    this.warehouseId = normalized.warehouseId;
    this.assignedEmployeeId = normalized.assignedEmployeeId;
    this.vendorId = normalized.vendorId;
    this.notes = normalized.notes;
    this.status = normalized.status;
    this.disposalDate = normalized.disposalDate;
    this.disposalAmount = normalized.disposalAmount;
    this.disposalReason = normalized.disposalReason;
    this.disposedById = normalized.disposedById;
    this.createdById = normalized.createdById;
    this.createdAt = normalized.createdAt;
    this.updatedAt = normalized.updatedAt;
  }

  static create(
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
    return normalizeCreateAssetData(data);
  }

  static reconstitute(props: AssetProps): Asset {
    return new Asset(props);
  }

  toProps(): AssetProps {
    return {
      id: this.id,
      assetCode: this.assetCode,
      name: this.name,
      categoryId: this.categoryId,
      serialNumber: this.serialNumber,
      purchaseDate: this.purchaseDate,
      purchaseCost: this.purchaseCost,
      residualValue: this.residualValue,
      usefulLifeMonths: this.usefulLifeMonths,
      currentBookValue: this.currentBookValue,
      warehouseId: this.warehouseId,
      assignedEmployeeId: this.assignedEmployeeId,
      vendorId: this.vendorId,
      notes: this.notes,
      status: this.status,
      disposalDate: this.disposalDate,
      disposalAmount: this.disposalAmount,
      disposalReason: this.disposalReason,
      disposedById: this.disposedById,
      createdById: this.createdById,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  withUpdated(data: UpdateAssetData): Asset {
    assertCanUpdate(this.status);

    const purchaseCost = data.purchaseCost ?? this.purchaseCost;
    const residualValue = data.residualValue ?? this.residualValue;
    const usefulLifeMonths = data.usefulLifeMonths ?? this.usefulLifeMonths;
    const purchaseDate = data.purchaseDate ?? this.purchaseDate;

    validatePurchaseDate(purchaseDate);
    validatePurchaseCost(purchaseCost);
    validateResidualValue(residualValue, purchaseCost);
    validateUsefulLifeMonths(usefulLifeMonths);

    return Asset.reconstitute({
      ...this.toProps(),
      name: data.name ?? this.name,
      categoryId: data.categoryId ?? this.categoryId,
      serialNumber:
        data.serialNumber !== undefined ? data.serialNumber : this.serialNumber,
      purchaseDate,
      purchaseCost,
      residualValue,
      usefulLifeMonths,
      warehouseId: data.warehouseId ?? this.warehouseId,
      assignedEmployeeId:
        data.assignedEmployeeId !== undefined
          ? data.assignedEmployeeId
          : this.assignedEmployeeId,
      vendorId: data.vendorId !== undefined ? data.vendorId : this.vendorId,
      notes: data.notes !== undefined ? data.notes : this.notes,
      updatedAt: new Date(),
    });
  }

  withTransferred(data: TransferAssetData): Asset {
    assertCanTransfer(this.status);

    return Asset.reconstitute({
      ...this.toProps(),
      warehouseId: data.toWarehouseId,
      status: "ACTIVE",
      updatedAt: new Date(),
    });
  }

  withDisposed(data: DisposeAssetData): Asset {
    assertCanDispose(this.status);

    if (data.disposalAmount !== undefined && data.disposalAmount !== null) {
      validateDisposalAmount(data.disposalAmount);
    }

    return Asset.reconstitute({
      ...this.toProps(),
      status: "DISPOSED",
      disposalDate: data.disposalDate,
      disposalAmount: data.disposalAmount ?? null,
      disposalReason: data.disposalReason ?? null,
      disposedById: data.disposedById,
      updatedAt: new Date(),
    });
  }

  withMaintenanceStatus(data: AddMaintenanceHistoryData): Asset {
    assertCanAddMaintenance(this.status);
    validateMaintenanceCost(data.cost);

    if (!data.setUnderMaintenance || this.status !== "ACTIVE") {
      return this;
    }

    return Asset.reconstitute({
      ...this.toProps(),
      status: "UNDER_MAINTENANCE",
      updatedAt: new Date(),
    });
  }
}
