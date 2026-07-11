import type {
  CreateWarehouseFormValues,
  UpdateWarehouseFormValues,
} from "../schemas";
import type {
  CreateWarehousePayload,
  WarehouseResponse,
  UpdateWarehousePayload,
} from "../types";

function normalizeOptionalString(value: string | null | undefined): string | null {
  if (value === undefined || value === null || value.trim() === "") {
    return null;
  }

  return value.trim();
}

export function toCreateWarehousePayload(
  values: CreateWarehouseFormValues,
): CreateWarehousePayload {
  return {
    warehouseCode: values.warehouseCode.trim(),
    name: values.name.trim(),
    description: normalizeOptionalString(values.description),
    address: normalizeOptionalString(values.address),
    contactPerson: normalizeOptionalString(values.contactPerson),
    phone: normalizeOptionalString(values.phone),
    isActive: values.isActive,
  };
}

export function toUpdateWarehousePayload(
  values: UpdateWarehouseFormValues,
): UpdateWarehousePayload {
  return {
    name: values.name.trim(),
    description: normalizeOptionalString(values.description),
    address: normalizeOptionalString(values.address),
    contactPerson: normalizeOptionalString(values.contactPerson),
    phone: normalizeOptionalString(values.phone),
    isActive: values.isActive,
  };
}

export function toWarehouseFormValues(
  warehouse: WarehouseResponse,
): UpdateWarehouseFormValues {
  return {
    name: warehouse.name,
    description: warehouse.description ?? "",
    address: warehouse.address ?? "",
    contactPerson: warehouse.contactPerson ?? "",
    phone: warehouse.phone ?? "",
    isActive: warehouse.isActive,
  };
}
