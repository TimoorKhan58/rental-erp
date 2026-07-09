import type { RentalOrder } from "@/modules/rental-order/domain/rental-order.entity";

export function toRentalOrderAuditValues(
  order: RentalOrder,
): Record<string, unknown> {
  const props = order.toProps();

  return {
    id: props.id,
    orderNumber: props.orderNumber,
    customerId: props.customerId,
    warehouseId: props.warehouseId,
    status: props.status,
    startDate: props.startDate.toISOString(),
    endDate: props.endDate.toISOString(),
    remarks: props.remarks,
    items: props.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      quantity: item.quantity,
      dailyRate: item.dailyRate,
      reservedQuantity: item.reservedQuantity,
    })),
  };
}
