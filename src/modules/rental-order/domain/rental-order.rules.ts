import type { RentalOrderStatus } from "./rental-order.constants";
import {
  RentalOrderInvalidReserveError,
  RentalOrderInvalidStatusError,
  RentalOrderInvariantError,
  createOrderNumber,
} from "./rental-order.errors";
import type {
  CreateRentalOrderItemData,
  RentalOrderItemProps,
  RentalOrderProps,
  ReserveRentalOrderItemData,
} from "./rental-order.types";

export function validateRentalPeriod(startDate: Date, endDate: Date): void {
  if (endDate.getTime() <= startDate.getTime()) {
    throw new RentalOrderInvariantError(
      "End date must be after start date",
      "endDate",
    );
  }
}

export function validateRentalOrderItems(
  items: CreateRentalOrderItemData[],
): RentalOrderItemProps[] {
  if (items.length === 0) {
    throw new RentalOrderInvariantError(
      "Rental order must have at least one item",
      "items",
    );
  }

  const productIds = new Set<string>();

  return items.map((item, index) => {
    if (item.quantity <= 0) {
      throw new RentalOrderInvariantError(
        "Item quantity must be greater than zero",
        `items[${index}].quantity`,
      );
    }

    if (item.dailyRate <= 0) {
      throw new RentalOrderInvariantError(
        "Item daily rate must be greater than zero",
        `items[${index}].dailyRate`,
      );
    }

    if (productIds.has(item.productId)) {
      throw new RentalOrderInvariantError(
        "Duplicate product in rental order items",
        `items[${index}].productId`,
      );
    }

    productIds.add(item.productId);

    return {
      id: "",
      productId: item.productId,
      quantity: item.quantity,
      dailyRate: item.dailyRate,
      reservedQuantity: 0,
    };
  });
}

export function assertReservedQuantityWithinOrdered(
  item: RentalOrderItemProps,
): void {
  if (item.reservedQuantity > item.quantity) {
    throw new RentalOrderInvariantError(
      "Reserved quantity cannot exceed ordered quantity",
      "reservedQuantity",
    );
  }

  if (item.reservedQuantity < 0) {
    throw new RentalOrderInvariantError(
      "Reserved quantity cannot be negative",
      "reservedQuantity",
    );
  }
}

export function computeStatusAfterReserve(
  items: RentalOrderItemProps[],
): RentalOrderStatus {
  const allReserved = items.every(
    (item) => item.reservedQuantity >= item.quantity,
  );

  if (allReserved) {
    return "RESERVED";
  }

  return "CONFIRMED";
}

export function applyReserveToItems(
  items: RentalOrderItemProps[],
  reserveItems: ReserveRentalOrderItemData[],
): RentalOrderItemProps[] {
  if (reserveItems.length === 0) {
    throw new RentalOrderInvalidReserveError(
      "At least one item must be provided for reserve",
    );
  }

  const reserveByProduct = new Map<string, number>();

  for (const reserveItem of reserveItems) {
    if (reserveItem.quantity <= 0) {
      throw new RentalOrderInvalidReserveError(
        "Reserve quantity must be greater than zero",
        reserveItem.productId,
      );
    }

    const existing = reserveByProduct.get(reserveItem.productId) ?? 0;
    reserveByProduct.set(
      reserveItem.productId,
      existing + reserveItem.quantity,
    );
  }

  const updatedItems = items.map((item) => {
    const reserveQuantity = reserveByProduct.get(item.productId);

    if (reserveQuantity === undefined) {
      return item;
    }

    reserveByProduct.delete(item.productId);

    const updatedReservedQuantity = item.reservedQuantity + reserveQuantity;

    if (updatedReservedQuantity > item.quantity) {
      throw new RentalOrderInvalidReserveError(
        "Reserve quantity exceeds remaining ordered quantity",
        item.productId,
      );
    }

    const updatedItem: RentalOrderItemProps = {
      ...item,
      reservedQuantity: updatedReservedQuantity,
    };

    assertReservedQuantityWithinOrdered(updatedItem);

    return updatedItem;
  });

  if (reserveByProduct.size > 0) {
    const [productId] = reserveByProduct.keys();

    throw new RentalOrderInvalidReserveError(
      "Reserve item does not exist on rental order",
      productId,
    );
  }

  return updatedItems;
}

export function assertCanUpdate(status: RentalOrderStatus): void {
  if (status !== "DRAFT") {
    throw new RentalOrderInvalidStatusError(status, "update");
  }
}

export function assertCanConfirm(status: RentalOrderStatus): void {
  if (status !== "DRAFT") {
    throw new RentalOrderInvalidStatusError(status, "confirm");
  }
}

export function assertCanReserve(status: RentalOrderStatus): void {
  if (status !== "CONFIRMED") {
    throw new RentalOrderInvalidStatusError(status, "reserve");
  }
}

export function assertCanCancel(
  status: RentalOrderStatus,
  items: RentalOrderItemProps[],
): void {
  if (status !== "DRAFT" && status !== "CONFIRMED") {
    throw new RentalOrderInvalidStatusError(status, "cancel");
  }

  if (items.some((item) => item.reservedQuantity > 0)) {
    throw new RentalOrderInvalidStatusError(status, "cancel");
  }
}

const LIFECYCLE_STATUS_RANK: Record<RentalOrderStatus, number> = {
  DRAFT: 0,
  CONFIRMED: 1,
  RESERVED: 2,
  DISPATCHED: 3,
  ON_RENT: 4,
  PARTIALLY_RETURNED: 5,
  RETURNED: 6,
  COMPLETED: 7,
  CANCELLED: -1,
};

export function assertCanApplyLifecycleStatus(
  current: RentalOrderStatus,
  next: RentalOrderStatus,
): void {
  if (current === "CANCELLED" || current === "COMPLETED") {
    throw new RentalOrderInvalidStatusError(current, "advance lifecycle");
  }

  if (
    next === "DRAFT" ||
    next === "CONFIRMED" ||
    next === "RESERVED" ||
    next === "CANCELLED"
  ) {
    throw new RentalOrderInvalidStatusError(current, `set to ${next}`);
  }

  if (LIFECYCLE_STATUS_RANK[next] < LIFECYCLE_STATUS_RANK[current]) {
    throw new RentalOrderInvalidStatusError(current, `set to ${next}`);
  }
}

export function computeStatusAfterDispatchComplete(
  current: RentalOrderStatus,
  items: RentalOrderItemProps[],
  dispatchedByItemId: ReadonlyMap<string, number>,
): RentalOrderStatus {
  if (current === "CANCELLED" || current === "COMPLETED") {
    return current;
  }

  let totalReserved = 0;
  let totalDispatched = 0;

  for (const item of items) {
    const reserved = item.reservedQuantity;
    const dispatched = dispatchedByItemId.get(item.id) ?? 0;
    totalReserved += reserved;
    totalDispatched += Math.min(dispatched, reserved);
  }

  let next: RentalOrderStatus = current;

  if (totalDispatched > 0) {
    next =
      totalReserved > 0 && totalDispatched >= totalReserved
        ? "ON_RENT"
        : "DISPATCHED";
  }

  return LIFECYCLE_STATUS_RANK[next] >= LIFECYCLE_STATUS_RANK[current]
    ? next
    : current;
}

export function computeStatusAfterReturnComplete(
  current: RentalOrderStatus,
  items: RentalOrderItemProps[],
  returnedByItemId: ReadonlyMap<string, number>,
): RentalOrderStatus {
  if (current === "CANCELLED" || current === "COMPLETED") {
    return current;
  }

  let totalReserved = 0;
  let totalReturned = 0;
  let anyReturned = false;

  for (const item of items) {
    const reserved = item.reservedQuantity;
    const returned = returnedByItemId.get(item.id) ?? 0;
    totalReserved += reserved;
    totalReturned += Math.min(returned, reserved);
    if (returned > 0) {
      anyReturned = true;
    }
  }

  let next: RentalOrderStatus = current;

  if (anyReturned) {
    next =
      totalReserved > 0 && totalReturned >= totalReserved
        ? "COMPLETED"
        : "PARTIALLY_RETURNED";
  }

  return LIFECYCLE_STATUS_RANK[next] >= LIFECYCLE_STATUS_RANK[current]
    ? next
    : current;
}

export function normalizeRentalOrderProps(
  props: RentalOrderProps,
): RentalOrderProps {
  validateRentalPeriod(props.startDate, props.endDate);

  return {
    ...props,
    orderNumber: createOrderNumber(props.orderNumber),
    remarks: normalizeOptionalText(props.remarks),
    items: props.items.map((item) => {
      assertReservedQuantityWithinOrdered(item);
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

export function computeRentalDays(startDate: Date, endDate: Date): number {
  validateRentalPeriod(startDate, endDate);
  const msPerDay = 1000 * 60 * 60 * 24;
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / msPerDay);
  return Math.max(1, days);
}

export function computeLineTotal(
  quantity: number,
  dailyRate: number,
  numberOfDays: number,
): number {
  return quantity * dailyRate * numberOfDays;
}
