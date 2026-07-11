import type {
  CreateDispatchFormValues,
  UpdateDispatchFormValues,
} from "../schemas";
import type {
  CreateDispatchPayload,
  DispatchResponse,
  UpdateDispatchPayload,
} from "../types";

function normalizeOptionalString(value: string | null | undefined): string | null {
  if (value === undefined || value === null || value.trim() === "") {
    return null;
  }

  return value.trim();
}

function normalizeRentalOrderItemId(value: string | null | undefined): string | null {
  if (value === undefined || value === null || value.trim() === "") {
    return null;
  }

  return value.trim();
}

function toLineItemPayload(
  item: CreateDispatchFormValues["items"][number],
): CreateDispatchPayload["items"][number] {
  return {
    productId: item.productId,
    rentalOrderItemId: normalizeRentalOrderItemId(item.rentalOrderItemId),
    quantity: item.quantity,
    notes: normalizeOptionalString(item.notes),
  };
}

export function toCreateDispatchPayload(
  values: CreateDispatchFormValues,
): CreateDispatchPayload {
  return {
    dispatchNumber: values.dispatchNumber.trim(),
    rentalOrderId: values.rentalOrderId,
    dispatchDate: values.dispatchDate,
    deliveryMethod: values.deliveryMethod,
    vehicleNumber: normalizeOptionalString(values.vehicleNumber),
    driverName: normalizeOptionalString(values.driverName),
    driverPhone: normalizeOptionalString(values.driverPhone),
    deliveryAddress: values.deliveryAddress.trim(),
    remarks: normalizeOptionalString(values.remarks),
    items: values.items.map(toLineItemPayload),
  };
}

export function toUpdateDispatchPayload(
  values: UpdateDispatchFormValues,
): UpdateDispatchPayload {
  return {
    dispatchDate: values.dispatchDate,
    deliveryMethod: values.deliveryMethod,
    vehicleNumber: normalizeOptionalString(values.vehicleNumber),
    driverName: normalizeOptionalString(values.driverName),
    driverPhone: normalizeOptionalString(values.driverPhone),
    deliveryAddress: values.deliveryAddress.trim(),
    remarks: normalizeOptionalString(values.remarks),
    items: values.items.map(toLineItemPayload),
  };
}

export function toDispatchFormValues(dispatch: DispatchResponse): UpdateDispatchFormValues {
  return {
    dispatchDate: dispatch.dispatchDate,
    deliveryMethod: dispatch.deliveryMethod,
    vehicleNumber: dispatch.vehicleNumber ?? "",
    driverName: dispatch.driverName ?? "",
    driverPhone: dispatch.driverPhone ?? "",
    deliveryAddress: dispatch.deliveryAddress,
    remarks: dispatch.remarks ?? "",
    items: dispatch.items.map((item) => ({
      productId: item.productId,
      rentalOrderItemId: item.rentalOrderItemId ?? "",
      quantity: item.quantity,
      notes: item.notes ?? "",
    })),
  };
}
