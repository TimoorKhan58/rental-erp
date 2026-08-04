import type { SupplierPayment } from "@/modules/supplier-payment/domain/supplier-payment.entity";

export function toSupplierPaymentAuditValues(
  payment: SupplierPayment,
): Record<string, unknown> {
  const props = payment.toProps();

  return {
    paymentNumber: props.paymentNumber,
    purchaseOrderId: props.purchaseOrderId,
    supplierId: props.supplierId,
    paymentDate: props.paymentDate.toISOString(),
    paymentMethod: props.paymentMethod,
    amount: props.amount,
    referenceNumber: props.referenceNumber,
    notes: props.notes,
    status: props.status,
    postedAt: props.postedAt?.toISOString() ?? null,
    voidedAt: props.voidedAt?.toISOString() ?? null,
  };
}
