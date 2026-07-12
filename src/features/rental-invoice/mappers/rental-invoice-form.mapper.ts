import type { CreateRentalInvoiceFormValues } from "../schemas";
import type { CreateRentalInvoicePayload } from "../types";

function normalizeOptionalString(
  value: string | null | undefined,
): string | null {
  if (value === undefined || value === null || value.trim() === "") {
    return null;
  }

  return value.trim();
}

export function toCreateRentalInvoicePayload(
  values: CreateRentalInvoiceFormValues,
): CreateRentalInvoicePayload {
  return {
    invoiceNumber: values.invoiceNumber.trim(),
    rentalOrderId: values.rentalOrderId,
    customerId: values.customerId,
    invoiceDate: values.invoiceDate,
    dueDate: normalizeOptionalString(values.dueDate),
    notes: normalizeOptionalString(values.notes),
    items: values.items.map((item, index) => ({
      lineType: item.lineType,
      description: item.description.trim(),
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      sortOrder: index,
    })),
  };
}
