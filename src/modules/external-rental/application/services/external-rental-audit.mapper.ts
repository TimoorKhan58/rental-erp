import type { ExternalRentalAgreement } from "@/modules/external-rental/domain";

export function toExternalRentalAuditValues(
  agreement: ExternalRentalAgreement,
): Record<string, unknown> {
  const props = agreement.toProps();

  return {
    id: props.id,
    agreementNumber: props.agreementNumber,
    supplierId: props.supplierId,
    warehouseId: props.warehouseId,
    rentalOrderId: props.rentalOrderId,
    status: props.status,
    settlementStatus: props.settlementStatus,
    hireStartDate: props.hireStartDate.toISOString(),
    hireEndDate: props.hireEndDate.toISOString(),
    expectedReturnToSupplierDate:
      props.expectedReturnToSupplierDate.toISOString(),
    totalHireInCost: props.totalHireInCost,
    amountDue: props.amountDue,
    amountPaid: props.amountPaid,
    remarks: props.remarks,
    items: props.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      rentalOrderItemId: item.rentalOrderItemId,
      quantityRequested: item.quantityRequested,
      quantityConfirmed: item.quantityConfirmed,
      quantityReceived: item.quantityReceived,
      quantityAllocated: item.quantityAllocated,
      quantityDispatched: item.quantityDispatched,
      quantityReturnedFromCustomer: item.quantityReturnedFromCustomer,
      quantityReturnedToSupplier: item.quantityReturnedToSupplier,
      quantityWrittenOff: item.quantityWrittenOff,
      unitCost: item.unitCost,
      lineHireInCost: item.lineHireInCost,
    })),
  };
}
