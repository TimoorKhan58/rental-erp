import type { RentalOrderItemProps } from "@/modules/rental-order/domain/rental-order.types";
import type { RentalOrderStatus } from "@/modules/rental-order/domain/rental-order.constants";

import type { DispatchStatus } from "./dispatch.constants";
import {
  DispatchInvalidItemError,
  DispatchInvalidStatusError,
  DispatchInvariantError,
  createDispatchNumber,
} from "./dispatch.errors";
import type {
  CreateDispatchItemData,
  DispatchItemProps,
  DispatchProps,
} from "./dispatch.types";
import { ELIGIBLE_RENTAL_ORDER_STATUSES } from "./dispatch.constants";

export function validateDispatchItems(
  items: CreateDispatchItemData[],
): DispatchItemProps[] {
  if (items.length === 0) {
    throw new DispatchInvariantError(
      "Dispatch must have at least one item",
      "items",
    );
  }

  const productIds = new Set<string>();

  return items.map((item, index) => {
    if (item.quantity <= 0) {
      throw new DispatchInvariantError(
        "Item quantity must be greater than zero",
        `items[${index}].quantity`,
      );
    }

    if (productIds.has(item.productId)) {
      throw new DispatchInvariantError(
        "Duplicate product in dispatch items",
        `items[${index}].productId`,
      );
    }

    productIds.add(item.productId);

    return {
      id: "",
      productId: item.productId,
      rentalOrderItemId: item.rentalOrderItemId ?? null,
      quantity: item.quantity,
      notes: normalizeOptionalText(item.notes),
    };
  });
}

export function validateDispatchDate(dispatchDate: Date): void {
  if (Number.isNaN(dispatchDate.getTime())) {
    throw new DispatchInvariantError("Invalid dispatch date", "dispatchDate");
  }
}

export function validateDeliveryAddress(address: string): string {
  const trimmed = address.trim();

  if (trimmed.length === 0) {
    throw new DispatchInvariantError(
      "Delivery address is required",
      "deliveryAddress",
    );
  }

  return trimmed;
}

export function assertCanUpdate(status: DispatchStatus): void {
  if (status !== "DRAFT") {
    throw new DispatchInvalidStatusError(status, "update");
  }
}

export function assertCanMarkReady(status: DispatchStatus): void {
  if (status !== "DRAFT") {
    throw new DispatchInvalidStatusError(status, "mark ready");
  }
}

export function assertCanComplete(status: DispatchStatus): void {
  if (status !== "READY") {
    throw new DispatchInvalidStatusError(status, "complete");
  }
}

export function assertCanCancel(status: DispatchStatus): void {
  if (status !== "DRAFT" && status !== "READY") {
    throw new DispatchInvalidStatusError(status, "cancel");
  }
}

export function assertRentalOrderEligibleForDispatch(
  status: RentalOrderStatus,
): void {
  if (!(ELIGIBLE_RENTAL_ORDER_STATUSES as readonly string[]).includes(status)) {
    throw new DispatchInvalidItemError(
      `Rental order must be CONFIRMED, RESERVED, DISPATCHED, ON_RENT, or PARTIALLY_RETURNED to create dispatch (current: ${status})`,
    );
  }
}

export function validateDispatchItemsAgainstRentalOrder(
  dispatchItems: CreateDispatchItemData[],
  rentalOrderItems: RentalOrderItemProps[],
): void {
  for (const dispatchItem of dispatchItems) {
    const rentalItem = findRentalOrderItem(
      dispatchItem,
      rentalOrderItems,
    );

    if (rentalItem === undefined) {
      throw new DispatchInvalidItemError(
        "Dispatch item does not belong to rental order",
        dispatchItem.productId,
      );
    }

    if (dispatchItem.quantity > rentalItem.reservedQuantity) {
      throw new DispatchInvalidItemError(
        "Dispatch quantity exceeds reserved quantity",
        dispatchItem.productId,
      );
    }
  }
}

function findRentalOrderItem(
  dispatchItem: CreateDispatchItemData,
  rentalOrderItems: RentalOrderItemProps[],
): RentalOrderItemProps | undefined {
  if (dispatchItem.rentalOrderItemId !== undefined && dispatchItem.rentalOrderItemId !== null) {
    const byId = rentalOrderItems.find(
      (item) => item.id === dispatchItem.rentalOrderItemId,
    );

    if (byId !== undefined && byId.productId !== dispatchItem.productId) {
      throw new DispatchInvalidItemError(
        "Rental order item product mismatch",
        dispatchItem.productId,
      );
    }

    return byId;
  }

  return rentalOrderItems.find(
    (item) => item.productId === dispatchItem.productId,
  );
}

export function normalizeDispatchProps(props: DispatchProps): DispatchProps {
  validateDispatchDate(props.dispatchDate);

  return {
    ...props,
    dispatchNumber: createDispatchNumber(props.dispatchNumber),
    deliveryAddress: validateDeliveryAddress(props.deliveryAddress),
    vehicleNumber: normalizeOptionalText(props.vehicleNumber),
    driverName: normalizeOptionalText(props.driverName),
    driverPhone: normalizeOptionalText(props.driverPhone),
    remarks: normalizeOptionalText(props.remarks),
    items: props.items.map((item) => ({
      ...item,
      notes: normalizeOptionalText(item.notes),
    })),
  };
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
