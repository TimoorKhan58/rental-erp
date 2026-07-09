import type { PurchaseOrder } from "@/modules/procurement/domain/purchase-order.entity";

export function toPurchaseOrderAuditValues(order: PurchaseOrder): Record<string, unknown> {
  const props = order.toProps();

  return {
    id: props.id,
    poNumber: props.poNumber,
    supplierId: props.supplierId,
    warehouseId: props.warehouseId,
    status: props.status,
    orderDate: props.orderDate.toISOString(),
    expectedDate: props.expectedDate?.toISOString() ?? null,
    remarks: props.remarks,
    items: props.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      quantity: item.quantity,
      unitCost: item.unitCost,
      receivedQuantity: item.receivedQuantity,
    })),
  };
}
