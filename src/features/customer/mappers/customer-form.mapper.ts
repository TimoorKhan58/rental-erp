import type {
  CreateCustomerFormValues,
  UpdateCustomerFormValues,
} from "../schemas";
import type {
  CreateCustomerPayload,
  CustomerResponse,
  UpdateCustomerPayload,
} from "../types";

function normalizeOptionalString(value: string | null | undefined): string | null {
  if (value === undefined || value === null || value.trim() === "") {
    return null;
  }

  return value.trim();
}

export function toCreateCustomerPayload(
  values: CreateCustomerFormValues,
): CreateCustomerPayload {
  return {
    customerCode: values.customerCode.trim(),
    name: values.name.trim(),
    phone: values.phone.trim(),
    cnic: normalizeOptionalString(values.cnic),
    address: values.address.trim(),
    notes: normalizeOptionalString(values.notes),
    isActive: values.isActive,
  };
}

export function toUpdateCustomerPayload(
  values: UpdateCustomerFormValues,
): UpdateCustomerPayload {
  return {
    name: values.name.trim(),
    phone: values.phone.trim(),
    cnic: normalizeOptionalString(values.cnic),
    address: values.address.trim(),
    notes: normalizeOptionalString(values.notes),
    isActive: values.isActive,
  };
}

export function toCustomerFormValues(
  customer: CustomerResponse,
): UpdateCustomerFormValues {
  return {
    name: customer.name,
    phone: customer.phone,
    cnic: customer.cnic ?? "",
    address: customer.address,
    notes: customer.notes ?? "",
    isActive: customer.isActive,
  };
}
