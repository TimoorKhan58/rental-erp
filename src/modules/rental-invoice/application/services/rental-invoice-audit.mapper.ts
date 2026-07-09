import type { RentalInvoice } from "@/modules/rental-invoice/domain/rental-invoice.entity";

export function toRentalInvoiceAuditValues(
  invoice: RentalInvoice,
): Record<string, unknown> {
  const props = invoice.toProps();

  return {
    invoiceNumber: props.invoiceNumber,
    rentalOrderId: props.rentalOrderId,
    customerId: props.customerId,
    invoiceDate: props.invoiceDate.toISOString(),
    dueDate: props.dueDate?.toISOString() ?? null,
    subtotal: props.subtotal,
    discount: props.discount,
    tax: props.tax,
    grandTotal: props.grandTotal,
    paidAmount: props.paidAmount,
    balance: props.balance,
    status: props.status,
    notes: props.notes,
    issuedAt: props.issuedAt?.toISOString() ?? null,
    voidedAt: props.voidedAt?.toISOString() ?? null,
    itemCount: props.items.length,
  };
}
