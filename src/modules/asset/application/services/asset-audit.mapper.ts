import type { Asset } from "@/modules/asset/domain";
import type { AuditValues } from "@/shared/infrastructure/audit/audit-logger.interface";

import { decimalToDtoString } from "../mappers/asset-decimal.mapper";

export function toAssetAuditValues(asset: Asset): AuditValues {
  const props = asset.toProps();

  return {
    id: props.id,
    assetCode: props.assetCode,
    name: props.name,
    categoryId: props.categoryId,
    serialNumber: props.serialNumber,
    purchaseDate: props.purchaseDate.toISOString().slice(0, 10),
    purchaseCost: decimalToDtoString(props.purchaseCost),
    residualValue: decimalToDtoString(props.residualValue),
    usefulLifeMonths: props.usefulLifeMonths,
    currentBookValue: decimalToDtoString(props.currentBookValue),
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
  };
}
