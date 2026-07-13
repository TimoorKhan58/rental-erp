import type { Payment } from "@/modules/payment/domain/payment.entity";

export function toPaymentAuditValues(
  payment: Payment,
): Record<string, unknown> {
  const props = payment.toProps();

  return {
    paymentNumber: props.paymentNumber,
    rentalInvoiceId: props.rentalInvoiceId,
    customerId: props.customerId,
    paymentDate: props.paymentDate.toISOString(),
    paymentMethod: props.paymentMethod,
    amount: props.amount,
    isRefund: props.isRefund,
    referenceNumber: props.referenceNumber,
    notes: props.notes,
    status: props.status,
    postedAt: props.postedAt?.toISOString() ?? null,
    voidedAt: props.voidedAt?.toISOString() ?? null,
  };
}
