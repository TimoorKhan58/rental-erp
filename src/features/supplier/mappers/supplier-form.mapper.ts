import type {
  CreateSupplierFormValues,
  UpdateSupplierFormValues,
} from "../schemas";
import type {
  CreateSupplierPayload,
  SupplierResponse,
  UpdateSupplierPayload,
} from "../types";

function normalizeOptionalString(value: string | null | undefined): string | null {
  if (value === undefined || value === null || value.trim() === "") {
    return null;
  }

  return value.trim();
}

export function toCreateSupplierPayload(
  values: CreateSupplierFormValues,
): CreateSupplierPayload {
  return {
    supplierCode: values.supplierCode.trim(),
    name: values.name.trim(),
    phone: values.phone.trim(),
    email: normalizeOptionalString(values.email),
    address: values.address.trim(),
    notes: normalizeOptionalString(values.notes),
    isActive: values.isActive,
  };
}

export function toUpdateSupplierPayload(
  values: UpdateSupplierFormValues,
): UpdateSupplierPayload {
  return {
    name: values.name.trim(),
    phone: values.phone.trim(),
    email: normalizeOptionalString(values.email),
    address: values.address.trim(),
    notes: normalizeOptionalString(values.notes),
    isActive: values.isActive,
  };
}

export function toSupplierFormValues(
  supplier: SupplierResponse,
): UpdateSupplierFormValues {
  return {
    name: supplier.name,
    phone: supplier.phone,
    email: supplier.email ?? "",
    address: supplier.address,
    notes: supplier.notes ?? "",
    isActive: supplier.isActive,
  };
}
