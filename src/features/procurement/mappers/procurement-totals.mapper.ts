import type { PurchaseOrderItemResponse } from "../types";

export function calculateLineSubtotal(item: {
  quantity: number;
  unitCost: number;
}): number {
  return item.quantity * item.unitCost;
}

export function calculateOrderTotal(
  items: Array<{ quantity: number; unitCost: number }>,
): number {
  return items.reduce((sum, item) => sum + calculateLineSubtotal(item), 0);
}

export function getRemainingQuantity(item: PurchaseOrderItemResponse): number {
  return Math.max(0, item.quantity - item.receivedQuantity);
}

export function matchesOrderDateRange(
  orderDate: string,
  from?: string,
  to?: string,
): boolean {
  if (!from && !to) {
    return true;
  }

  const timestamp = new Date(orderDate).getTime();

  if (from && timestamp < new Date(from).getTime()) {
    return false;
  }

  if (to) {
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);

    if (timestamp > end.getTime()) {
      return false;
    }
  }

  return true;
}
