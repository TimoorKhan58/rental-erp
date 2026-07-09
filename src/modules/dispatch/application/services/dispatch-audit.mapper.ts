import type { Dispatch } from "@/modules/dispatch/domain";

export function toDispatchAuditValues(dispatch: Dispatch): Record<string, unknown> {
  const props = dispatch.toProps();

  return {
    dispatchNumber: props.dispatchNumber,
    rentalOrderId: props.rentalOrderId,
    status: props.status,
    dispatchDate: props.dispatchDate.toISOString(),
    deliveryMethod: props.deliveryMethod,
    itemCount: props.items.length,
  };
}
