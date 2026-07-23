import type { ReturnStatus } from "./return.constants";
import {
  ReturnInvalidItemError,
  ReturnInvalidStatusError,
  ReturnInvariantError,
  createReturnNumber,
} from "./return.errors";
import type {
  CreateReturnItemData,
  InspectReturnItemData,
  ReturnItemProps,
  ReturnProps,
} from "./return.types";
import { COMPLETED_DISPATCH_STATUS } from "./return.constants";

export function validateReturnItems(
  items: CreateReturnItemData[],
): ReturnItemProps[] {
  if (items.length === 0) {
    throw new ReturnInvariantError("Return must have at least one item", "items");
  }

  const rentalOrderItemIds = new Set<string>();

  return items.map((item, index) => {
    if (item.quantity <= 0) {
      throw new ReturnInvariantError(
        "Item quantity must be greater than zero",
        `items[${index}].quantity`,
      );
    }

    if (rentalOrderItemIds.has(item.rentalOrderItemId)) {
      throw new ReturnInvariantError(
        "Duplicate rental order item in return items",
        `items[${index}].rentalOrderItemId`,
      );
    }

    rentalOrderItemIds.add(item.rentalOrderItemId);

    return {
      id: "",
      rentalOrderItemId: item.rentalOrderItemId,
      dispatchItemId: item.dispatchItemId ?? null,
      returnedQuantity: item.quantity,
      goodQuantity: 0,
      damagedQuantity: 0,
      lostQuantity: 0,
      missingQuantity: 0,
      notes: normalizeOptionalText(item.notes),
    };
  });
}

export function validateReturnDate(returnDate: Date): void {
  if (Number.isNaN(returnDate.getTime())) {
    throw new ReturnInvariantError("Invalid return date", "returnDate");
  }
}

export function assertCanUpdate(status: ReturnStatus): void {
  if (status !== "DRAFT") {
    throw new ReturnInvalidStatusError(status, "update");
  }
}

export function assertCanReceive(status: ReturnStatus): void {
  if (status !== "DRAFT") {
    throw new ReturnInvalidStatusError(status, "receive");
  }
}

export function assertCanInspect(status: ReturnStatus): void {
  if (status !== "RECEIVED") {
    throw new ReturnInvalidStatusError(status, "inspect");
  }
}

export function assertCanComplete(status: ReturnStatus): void {
  if (status !== "INSPECTED") {
    throw new ReturnInvalidStatusError(status, "complete");
  }
}

export function assertCanCancel(status: ReturnStatus): void {
  if (
    status === "COMPLETED" ||
    status === "CANCELLED"
  ) {
    throw new ReturnInvalidStatusError(status, "cancel");
  }
}

export function assertDispatchEligibleForReturn(status: string): void {
  if (status !== COMPLETED_DISPATCH_STATUS) {
    throw new ReturnInvalidItemError(
      `Dispatch must be COMPLETED to create return (current: ${status})`,
    );
  }
}

export function validateReturnItemsAgainstDispatch(
  returnItems: CreateReturnItemData[],
  dispatchItems: Array<{
    id: string;
    rentalOrderItemId: string | null;
    quantity: number;
  }>,
  priorReturnedByItem: Map<string, number> = new Map(),
): void {
  const dispatchByRentalItem = new Map<string, { id: string; quantity: number }>();

  for (const dispatchItem of dispatchItems) {
    if (dispatchItem.rentalOrderItemId === null) {
      continue;
    }

    dispatchByRentalItem.set(dispatchItem.rentalOrderItemId, {
      id: dispatchItem.id,
      quantity: dispatchItem.quantity,
    });
  }

  for (const returnItem of returnItems) {
    const dispatchItem = dispatchByRentalItem.get(returnItem.rentalOrderItemId);

    if (dispatchItem === undefined) {
      throw new ReturnInvalidItemError(
        "Return item does not belong to dispatch",
        returnItem.rentalOrderItemId,
      );
    }

    const priorReturned =
      priorReturnedByItem.get(returnItem.rentalOrderItemId) ?? 0;
    const remaining = dispatchItem.quantity - priorReturned;

    if (returnItem.quantity > remaining) {
      throw new ReturnInvalidItemError(
        "Return quantity exceeds remaining dispatched quantity",
        returnItem.rentalOrderItemId,
      );
    }
  }
}

export function applyInspectionToItems(
  items: ReturnItemProps[],
  inspectItems: InspectReturnItemData[],
): ReturnItemProps[] {
  if (inspectItems.length === 0) {
    throw new ReturnInvalidItemError("At least one item must be provided for inspect");
  }

  const inspectMap = new Map(
    inspectItems.map((item) => [item.rentalOrderItemId, item]),
  );

  return items.map((item) => {
    const inspectItem = inspectMap.get(item.rentalOrderItemId);

    if (inspectItem === undefined) {
      return item;
    }

    inspectMap.delete(item.rentalOrderItemId);

    if (
      inspectItem.goodQuantity < 0 ||
      inspectItem.damagedQuantity < 0 ||
      inspectItem.lostQuantity < 0 ||
      inspectItem.missingQuantity < 0
    ) {
      throw new ReturnInvalidItemError(
        "Inspection quantities cannot be negative",
        item.rentalOrderItemId,
      );
    }

    const total =
      inspectItem.goodQuantity +
      inspectItem.damagedQuantity +
      inspectItem.lostQuantity +
      inspectItem.missingQuantity;

    if (total !== item.returnedQuantity) {
      throw new ReturnInvalidItemError(
        "Inspection quantities must sum to returned quantity",
        item.rentalOrderItemId,
      );
    }

    return {
      ...item,
      goodQuantity: inspectItem.goodQuantity,
      damagedQuantity: inspectItem.damagedQuantity,
      lostQuantity: inspectItem.lostQuantity,
      missingQuantity: inspectItem.missingQuantity,
      notes:
        inspectItem.notes !== undefined
          ? normalizeOptionalText(inspectItem.notes)
          : item.notes,
    };
  });
}

export function normalizeReturnProps(props: ReturnProps): ReturnProps {
  validateReturnDate(props.returnDate);

  return {
    ...props,
    returnNumber: createReturnNumber(props.returnNumber),
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

export function computeRestockQuantity(item: ReturnItemProps): number {
  return item.goodQuantity;
}

/** Qty whose rental reservation should clear when the return is completed. */
export function computeReleaseQuantity(item: ReturnItemProps): number {
  return item.returnedQuantity;
}
