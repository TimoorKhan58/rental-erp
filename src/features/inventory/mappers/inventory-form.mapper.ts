import type {
  CreateInventoryFormValues,
  UpdateInventoryFormValues,
} from "../schemas";
import type {
  CreateInventoryPayload,
  InventoryResponse,
  UpdateInventoryPayload,
} from "../types";

function normalizeOptionalNumber(
  value: number | null | undefined,
): number | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  return value;
}

export function toCreateInventoryPayload(
  values: CreateInventoryFormValues,
): CreateInventoryPayload {
  return {
    productId: values.productId,
    warehouseId: values.warehouseId,
    quantityOnHand: values.quantityOnHand,
    reservedQuantity: normalizeOptionalNumber(values.reservedQuantity),
    minimumStock: normalizeOptionalNumber(values.minimumStock),
    maximumStock: values.maximumStock ?? null,
    isActive: values.isActive,
  };
}

export function toUpdateInventoryPayload(
  values: UpdateInventoryFormValues,
): UpdateInventoryPayload {
  return {
    quantityOnHand: values.quantityOnHand,
    reservedQuantity: values.reservedQuantity,
    minimumStock: values.minimumStock,
    maximumStock: values.maximumStock ?? null,
    isActive: values.isActive,
  };
}

export function toInventoryFormValues(
  inventory: InventoryResponse,
): UpdateInventoryFormValues {
  return {
    quantityOnHand: inventory.quantityOnHand,
    reservedQuantity: inventory.reservedQuantity,
    minimumStock: inventory.minimumStock,
    maximumStock: inventory.maximumStock,
    isActive: inventory.isActive,
  };
}
