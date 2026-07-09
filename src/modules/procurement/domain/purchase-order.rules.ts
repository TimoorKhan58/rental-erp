import type { PurchaseOrderStatus } from "./purchase-order.constants";
import {
  PurchaseOrderInvalidReceiveError,
  PurchaseOrderInvalidStatusError,
  PurchaseOrderInvariantError,
  createPoNumber,
} from "./purchase-order.errors";
import type {
  CreatePurchaseOrderItemData,
  PurchaseOrderItemProps,
  PurchaseOrderProps,
  ReceivePurchaseOrderItemData,
} from "./purchase-order.types";

export function validatePurchaseOrderItems(
  items: CreatePurchaseOrderItemData[],
): PurchaseOrderItemProps[] {
  if (items.length === 0) {
    throw new PurchaseOrderInvariantError(
      "Purchase order must have at least one item",
      "items",
    );
  }

  const productIds = new Set<string>();

  return items.map((item, index) => {
    if (item.quantity <= 0) {
      throw new PurchaseOrderInvariantError(
        "Item quantity must be greater than zero",
        `items[${index}].quantity`,
      );
    }

    if (item.unitCost < 0) {
      throw new PurchaseOrderInvariantError(
        "Item unit cost must be zero or greater",
        `items[${index}].unitCost`,
      );
    }

    if (productIds.has(item.productId)) {
      throw new PurchaseOrderInvariantError(
        "Duplicate product in purchase order items",
        `items[${index}].productId`,
      );
    }

    productIds.add(item.productId);

    return {
      id: "",
      productId: item.productId,
      quantity: item.quantity,
      unitCost: item.unitCost,
      receivedQuantity: 0,
    };
  });
}

export function assertReceivedQuantityWithinOrdered(
  item: PurchaseOrderItemProps,
): void {
  if (item.receivedQuantity > item.quantity) {
    throw new PurchaseOrderInvariantError(
      "Received quantity cannot exceed ordered quantity",
      "receivedQuantity",
    );
  }

  if (item.receivedQuantity < 0) {
    throw new PurchaseOrderInvariantError(
      "Received quantity cannot be negative",
      "receivedQuantity",
    );
  }
}

export function computeStatusAfterReceive(
  items: PurchaseOrderItemProps[],
): PurchaseOrderStatus {
  const allReceived = items.every(
    (item) => item.receivedQuantity >= item.quantity,
  );

  if (allReceived) {
    return "RECEIVED";
  }

  return "PARTIALLY_RECEIVED";
}

export function applyReceiveToItems(
  items: PurchaseOrderItemProps[],
  receiveItems: ReceivePurchaseOrderItemData[],
): PurchaseOrderItemProps[] {
  if (receiveItems.length === 0) {
    throw new PurchaseOrderInvalidReceiveError(
      "At least one item must be provided for receive",
    );
  }

  const receiveByProduct = new Map<string, number>();

  for (const receiveItem of receiveItems) {
    if (receiveItem.quantity <= 0) {
      throw new PurchaseOrderInvalidReceiveError(
        "Receive quantity must be greater than zero",
        receiveItem.productId,
      );
    }

    const existing = receiveByProduct.get(receiveItem.productId) ?? 0;
    receiveByProduct.set(
      receiveItem.productId,
      existing + receiveItem.quantity,
    );
  }

  const updatedItems = items.map((item) => {
    const receiveQuantity = receiveByProduct.get(item.productId);

    if (receiveQuantity === undefined) {
      return item;
    }

    receiveByProduct.delete(item.productId);

    const updatedReceivedQuantity = item.receivedQuantity + receiveQuantity;

    if (updatedReceivedQuantity > item.quantity) {
      throw new PurchaseOrderInvalidReceiveError(
        "Receive quantity exceeds remaining ordered quantity",
        item.productId,
      );
    }

    const updatedItem: PurchaseOrderItemProps = {
      ...item,
      receivedQuantity: updatedReceivedQuantity,
    };

    assertReceivedQuantityWithinOrdered(updatedItem);

    return updatedItem;
  });

  if (receiveByProduct.size > 0) {
    const [productId] = receiveByProduct.keys();

    throw new PurchaseOrderInvalidReceiveError(
      "Receive item does not exist on purchase order",
      productId,
    );
  }

  return updatedItems;
}

export function assertCanUpdate(status: PurchaseOrderStatus): void {
  if (status !== "DRAFT") {
    throw new PurchaseOrderInvalidStatusError(status, "update");
  }
}

export function assertCanApprove(status: PurchaseOrderStatus): void {
  if (status !== "DRAFT") {
    throw new PurchaseOrderInvalidStatusError(status, "approve");
  }
}

export function assertCanReceive(status: PurchaseOrderStatus): void {
  if (status !== "APPROVED" && status !== "PARTIALLY_RECEIVED") {
    throw new PurchaseOrderInvalidStatusError(status, "receive");
  }
}

export function assertCanCancel(
  status: PurchaseOrderStatus,
  items: PurchaseOrderItemProps[],
): void {
  if (status === "RECEIVED" || status === "CANCELLED") {
    throw new PurchaseOrderInvalidStatusError(status, "cancel");
  }

  if (items.some((item) => item.receivedQuantity > 0)) {
    throw new PurchaseOrderInvalidStatusError(status, "cancel");
  }
}

export function normalizePurchaseOrderProps(
  props: PurchaseOrderProps,
): PurchaseOrderProps {
  return {
    ...props,
    poNumber: createPoNumber(props.poNumber),
    remarks: normalizeOptionalText(props.remarks),
    items: props.items.map((item) => {
      assertReceivedQuantityWithinOrdered(item);
      return item;
    }),
  };
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
