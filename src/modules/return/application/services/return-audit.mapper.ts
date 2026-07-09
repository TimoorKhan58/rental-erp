import type { Return } from "@/modules/return/domain";

export function toReturnAuditValues(returnRecord: Return): Record<string, unknown> {
  const props = returnRecord.toProps();

  return {
    returnNumber: props.returnNumber,
    rentalOrderId: props.rentalOrderId,
    dispatchId: props.dispatchId,
    status: props.status,
    returnDate: props.returnDate.toISOString(),
    itemCount: props.items.length,
    lostQuantity: props.items.reduce((sum, item) => sum + item.lostQuantity, 0),
  };
}
