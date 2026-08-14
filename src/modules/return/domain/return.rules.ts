import type { ReturnStatus } from "./return.constants";
import {
  ReturnInvalidItemError,
  ReturnInvalidStatusError,
  ReturnInvariantError,
  createReturnNumber,
} from "./return.errors";
import {
  resolveReturnSourceSplit,
  toPersistedReturnSourceFields,
  effectiveOwnedReturnQuantity,
  effectiveExternalReturnQuantity,
  hasSourceConditionAttribution,
  isMixedSourceReturnItem,
} from "./return.source.rules";
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

    const hasOwned =
      item.ownedQuantity !== undefined && item.ownedQuantity !== null;
    const hasExternal =
      item.externalQuantity !== undefined && item.externalQuantity !== null;

    if (hasOwned || hasExternal) {
      const owned = item.ownedQuantity ?? 0;
      const external = item.externalQuantity ?? 0;

      if (owned < 0 || external < 0) {
        throw new ReturnInvariantError(
          "Source quantities cannot be negative",
          `items[${index}].ownedQuantity`,
        );
      }

      if (owned + external !== item.quantity) {
        throw new ReturnInvariantError(
          "ownedQuantity + externalQuantity must equal quantity",
          `items[${index}].quantity`,
        );
      }

      return {
        id: "",
        rentalOrderItemId: item.rentalOrderItemId,
        dispatchItemId: item.dispatchItemId ?? null,
        returnedQuantity: item.quantity,
        ownedQuantity: owned,
        externalQuantity: external,
        goodQuantity: 0,
        damagedQuantity: 0,
        lostQuantity: 0,
        missingQuantity: 0,
        ownedGoodQuantity: 0,
        ownedDamagedQuantity: 0,
        ownedLostQuantity: 0,
        externalGoodQuantity: 0,
        externalDamagedQuantity: 0,
        externalLostQuantity: 0,
        notes: normalizeOptionalText(item.notes),
      };
    }

    return {
      id: "",
      rentalOrderItemId: item.rentalOrderItemId,
      dispatchItemId: item.dispatchItemId ?? null,
      returnedQuantity: item.quantity,
      ownedQuantity: null,
      externalQuantity: null,
      goodQuantity: 0,
      damagedQuantity: 0,
      lostQuantity: 0,
      missingQuantity: 0,
      ownedGoodQuantity: 0,
      ownedDamagedQuantity: 0,
      ownedLostQuantity: 0,
      externalGoodQuantity: 0,
      externalDamagedQuantity: 0,
      externalLostQuantity: 0,
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
    ownedQuantity?: number | null;
    externalQuantity?: number | null;
  }>,
  priorReturnedByItem: Map<string, number> = new Map(),
  priorOwnedReturnedByItem: Map<string, number> = new Map(),
  priorExternalReturnedByItem: Map<string, number> = new Map(),
): CreateReturnItemData[] {
  const dispatchByRentalItem = new Map<
    string,
    {
      id: string;
      quantity: number;
      ownedQuantity: number;
      externalQuantity: number;
    }
  >();

  for (const dispatchItem of dispatchItems) {
    if (dispatchItem.rentalOrderItemId === null) {
      continue;
    }

    const ownedQuantity =
      dispatchItem.ownedQuantity === null ||
      dispatchItem.ownedQuantity === undefined
        ? dispatchItem.quantity
        : dispatchItem.ownedQuantity;
    const externalQuantity =
      dispatchItem.externalQuantity === null ||
      dispatchItem.externalQuantity === undefined
        ? 0
        : dispatchItem.externalQuantity;

    dispatchByRentalItem.set(dispatchItem.rentalOrderItemId, {
      id: dispatchItem.id,
      quantity: dispatchItem.quantity,
      ownedQuantity,
      externalQuantity,
    });
  }

  return returnItems.map((returnItem) => {
    const dispatchItem = dispatchByRentalItem.get(returnItem.rentalOrderItemId);

    if (dispatchItem === undefined) {
      throw new ReturnInvalidItemError(
        "Return item does not belong to dispatch",
        returnItem.rentalOrderItemId,
      );
    }

    const priorReturned =
      priorReturnedByItem.get(returnItem.rentalOrderItemId) ?? 0;
    const priorOwned =
      priorOwnedReturnedByItem.get(returnItem.rentalOrderItemId) ??
      priorReturned;
    const priorExternal =
      priorExternalReturnedByItem.get(returnItem.rentalOrderItemId) ?? 0;

    const ownedRemaining = dispatchItem.ownedQuantity - priorOwned;
    const externalRemaining = dispatchItem.externalQuantity - priorExternal;
    const remaining = dispatchItem.quantity - priorReturned;

    if (returnItem.quantity > remaining) {
      throw new ReturnInvalidItemError(
        "Return quantity exceeds remaining dispatched quantity",
        returnItem.rentalOrderItemId,
      );
    }

    const split = resolveReturnSourceSplit(
      returnItem.quantity,
      returnItem.ownedQuantity,
      returnItem.externalQuantity,
      ownedRemaining,
      externalRemaining,
      returnItem.rentalOrderItemId,
    );
    const persisted = toPersistedReturnSourceFields(split);

    return {
      ...returnItem,
      dispatchItemId: returnItem.dispatchItemId ?? dispatchItem.id,
      ownedQuantity: persisted.ownedQuantity,
      externalQuantity: persisted.externalQuantity,
    };
  });
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

    const ownedGood = inspectItem.ownedGoodQuantity ?? 0;
    const ownedDamaged = inspectItem.ownedDamagedQuantity ?? 0;
    const ownedLost = inspectItem.ownedLostQuantity ?? 0;
    const externalGood = inspectItem.externalGoodQuantity ?? 0;
    const externalDamaged = inspectItem.externalDamagedQuantity ?? 0;
    const externalLost = inspectItem.externalLostQuantity ?? 0;

    if (
      ownedGood < 0 ||
      ownedDamaged < 0 ||
      ownedLost < 0 ||
      externalGood < 0 ||
      externalDamaged < 0 ||
      externalLost < 0
    ) {
      throw new ReturnInvalidItemError(
        "Source×condition quantities cannot be negative",
        item.rentalOrderItemId,
      );
    }

    const sourceConditionTotal =
      ownedGood +
      ownedDamaged +
      ownedLost +
      externalGood +
      externalDamaged +
      externalLost;
    const hasSourceCondition = sourceConditionTotal > 0;
    const mixed = isMixedSourceReturnItem(item);

    if (mixed && !hasSourceCondition) {
      throw new ReturnInvalidItemError(
        "Mixed-source return requires explicit source×condition attribution",
        item.rentalOrderItemId,
      );
    }

    if (hasSourceCondition) {
      const ownedReturned = effectiveOwnedReturnQuantity(item);
      const externalReturned = effectiveExternalReturnQuantity(item);

      if (ownedGood + ownedDamaged + ownedLost !== ownedReturned) {
        throw new ReturnInvalidItemError(
          "Owned GOOD/DAMAGED/LOST must sum to ownedQuantity",
          item.rentalOrderItemId,
        );
      }

      if (externalGood + externalDamaged + externalLost !== externalReturned) {
        throw new ReturnInvalidItemError(
          "External GOOD/DAMAGED/LOST must sum to externalQuantity",
          item.rentalOrderItemId,
        );
      }

      const derivedGood = ownedGood + externalGood;
      const derivedDamaged = ownedDamaged + externalDamaged;
      const derivedLost = ownedLost + externalLost;

      if (
        inspectItem.goodQuantity !== derivedGood ||
        inspectItem.damagedQuantity !== derivedDamaged ||
        inspectItem.lostQuantity !== derivedLost
      ) {
        throw new ReturnInvalidItemError(
          "Global condition quantities must equal source×condition totals",
          item.rentalOrderItemId,
        );
      }

      if (inspectItem.missingQuantity !== 0) {
        throw new ReturnInvalidItemError(
          "missingQuantity must be 0 when source×condition attribution is provided",
          item.rentalOrderItemId,
        );
      }
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
      ownedGoodQuantity: ownedGood,
      ownedDamagedQuantity: ownedDamaged,
      ownedLostQuantity: ownedLost,
      externalGoodQuantity: externalGood,
      externalDamagedQuantity: externalDamaged,
      externalLostQuantity: externalLost,
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

/**
 * Owned restock uses owned GOOD only when source×condition attribution exists.
 * Mixed lines without attribution must not guess from global GOOD.
 */
export function computeRestockQuantity(item: ReturnItemProps): number {
  const ownedReturned = effectiveOwnedReturnQuantity(item);

  if (hasSourceConditionAttribution(item)) {
    return item.ownedGoodQuantity;
  }

  if (isMixedSourceReturnItem(item)) {
    throw new ReturnInvalidItemError(
      "Mixed-source return requires explicit source×condition attribution",
      item.rentalOrderItemId,
    );
  }

  return Math.min(item.goodQuantity, ownedReturned);
}

/** Qty whose rental reservation should clear when the return is completed. */
export function computeReleaseQuantity(item: ReturnItemProps): number {
  return effectiveOwnedReturnQuantity(item);
}

export function computeExternalCustomerReturnQuantity(
  item: ReturnItemProps,
): number {
  return effectiveExternalReturnQuantity(item);
}
