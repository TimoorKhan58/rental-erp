import type {
  CreateProcurementFormValues,
  UpdateProcurementFormValues,
} from "../schemas";
import type {
  CreateProcurementPayload,
  ProcurementResponse,
  UpdateProcurementPayload,
} from "../types";

function normalizeOptionalString(value: string | null | undefined): string | null {
  if (value === undefined || value === null || value.trim() === "") {
    return null;
  }

  return value.trim();
}

function normalizeOptionalDate(value: string | null | undefined): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value.trim() === "") {
    return null;
  }

  return value;
}

export function toCreateProcurementPayload(
  values: CreateProcurementFormValues,
): CreateProcurementPayload {
  return {
    poNumber: values.poNumber.trim(),
    supplierId: values.supplierId,
    warehouseId: values.warehouseId,
    orderDate: values.orderDate,
    expectedDate: normalizeOptionalDate(values.expectedDate) ?? null,
    remarks: normalizeOptionalString(values.remarks),
    items: values.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      unitCost: item.unitCost,
    })),
  };
}

export function toUpdateProcurementPayload(
  values: UpdateProcurementFormValues,
): UpdateProcurementPayload {
  return {
    supplierId: values.supplierId,
    warehouseId: values.warehouseId,
    orderDate: values.orderDate,
    expectedDate: normalizeOptionalDate(values.expectedDate) ?? null,
    remarks: normalizeOptionalString(values.remarks),
    items: values.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      unitCost: item.unitCost,
    })),
  };
}

export function toProcurementFormValues(
  procurement: ProcurementResponse,
): UpdateProcurementFormValues {
  return {
    supplierId: procurement.supplierId,
    warehouseId: procurement.warehouseId,
    orderDate: procurement.orderDate,
    expectedDate: procurement.expectedDate ?? "",
    remarks: procurement.remarks ?? "",
    items: procurement.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      unitCost: item.unitCost,
    })),
  };
}
