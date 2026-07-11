import type {
  CreateReturnFormValues,
  InspectReturnFormValues,
  UpdateReturnFormValues,
} from "../schemas";
import type {
  CreateReturnPayload,
  InspectReturnPayload,
  ReturnResponse,
  UpdateReturnPayload,
} from "../types";

function normalizeOptionalString(value: string | null | undefined): string | null {
  if (value === undefined || value === null || value.trim() === "") {
    return null;
  }

  return value.trim();
}

function normalizeDispatchItemId(value: string | null | undefined): string | null {
  if (value === undefined || value === null || value.trim() === "") {
    return null;
  }

  return value.trim();
}

function toLineItemPayload(
  item: CreateReturnFormValues["items"][number],
): CreateReturnPayload["items"][number] {
  return {
    rentalOrderItemId: item.rentalOrderItemId,
    dispatchItemId: normalizeDispatchItemId(item.dispatchItemId),
    quantity: item.quantity,
    notes: normalizeOptionalString(item.notes),
  };
}

export function toCreateReturnPayload(values: CreateReturnFormValues): CreateReturnPayload {
  return {
    returnNumber: values.returnNumber.trim(),
    rentalOrderId: values.rentalOrderId,
    dispatchId: values.dispatchId,
    returnDate: values.returnDate,
    remarks: normalizeOptionalString(values.remarks),
    items: values.items.map(toLineItemPayload),
  };
}

export function toUpdateReturnPayload(values: UpdateReturnFormValues): UpdateReturnPayload {
  return {
    returnDate: values.returnDate,
    remarks: normalizeOptionalString(values.remarks),
    items: values.items.map(toLineItemPayload),
  };
}

export function toInspectReturnPayload(values: InspectReturnFormValues): InspectReturnPayload {
  return {
    items: values.items.map((item) => ({
      rentalOrderItemId: item.rentalOrderItemId,
      goodQuantity: item.goodQuantity,
      damagedQuantity: item.damagedQuantity,
      lostQuantity: item.lostQuantity,
      notes: normalizeOptionalString(item.notes),
    })),
  };
}

export function toReturnFormValues(returnRecord: ReturnResponse): UpdateReturnFormValues {
  return {
    returnDate: returnRecord.returnDate,
    remarks: returnRecord.remarks ?? "",
    items: returnRecord.items.map((item) => ({
      rentalOrderItemId: item.rentalOrderItemId,
      dispatchItemId: item.dispatchItemId ?? "",
      quantity: item.returnedQuantity,
      notes: item.notes ?? "",
    })),
  };
}

export function toInspectFormValues(returnRecord: ReturnResponse): InspectReturnFormValues {
  return {
    items: returnRecord.items.map((item) => ({
      rentalOrderItemId: item.rentalOrderItemId,
      returnedQuantity: item.returnedQuantity,
      goodQuantity: item.goodQuantity,
      damagedQuantity: item.damagedQuantity,
      lostQuantity: item.lostQuantity,
      notes: item.notes ?? "",
    })),
  };
}

export function computePriorReturnedByItem(
  returns: ReturnResponse[],
  excludeReturnId?: string,
): Map<string, number> {
  const totals = new Map<string, number>();

  for (const returnRecord of returns) {
    if (returnRecord.status === "CANCELLED") {
      continue;
    }

    if (excludeReturnId && returnRecord.id === excludeReturnId) {
      continue;
    }

    for (const item of returnRecord.items) {
      const current = totals.get(item.rentalOrderItemId) ?? 0;
      totals.set(item.rentalOrderItemId, current + item.returnedQuantity);
    }
  }

  return totals;
}
