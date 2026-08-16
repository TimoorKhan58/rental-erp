import type { RentalOrderItemProps } from "@/modules/rental-order/domain/rental-order.types";
import type { RentalOrderStatus } from "@/modules/rental-order/domain/rental-order.constants";

import type { DispatchStatus } from "./dispatch.constants";
import {
  DispatchInvalidItemError,
  DispatchInvalidStatusError,
  DispatchInvariantError,
  createDispatchNumber,
} from "./dispatch.errors";
import {
  resolveDispatchSourceSplit,
  toPersistedDispatchSourceFields,
} from "./dispatch.source.rules";
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

    const hasOwned =
      item.ownedQuantity !== undefined && item.ownedQuantity !== null;
    const hasExternal =
      item.externalQuantity !== undefined && item.externalQuantity !== null;

    if (hasOwned || hasExternal) {
      const owned = item.ownedQuantity ?? 0;
      const external = item.externalQuantity ?? 0;

      if (owned < 0 || external < 0) {
        throw new DispatchInvariantError(
          "Source quantities cannot be negative",
          `items[${index}].ownedQuantity`,
        );
      }

      if (owned + external !== item.quantity) {
        throw new DispatchInvariantError(
          "ownedQuantity + externalQuantity must equal quantity",
          `items[${index}].quantity`,
        );
      }

      return {
        id: "",
        productId: item.productId,
        rentalOrderItemId: item.rentalOrderItemId ?? null,
        quantity: item.quantity,
        ownedQuantity: owned,
        externalQuantity: external,
        notes: normalizeOptionalText(item.notes),
      };
    }

    return {
      id: "",
      productId: item.productId,
      rentalOrderItemId: item.rentalOrderItemId ?? null,
      quantity: item.quantity,
      ownedQuantity: null,
      externalQuantity: null,
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
      `Rental order must be CONFIRMED, RESERVED, or ON_RENT to create dispatch (current: ${status})`,
    );
  }
}

/**
 * Quantities already claimed against reservation by non-CANCELLED dispatches.
 * Line reservedQuantity is not reduced on complete; remaining dispatchable qty
 * is reservedQuantity minus this claim total (existing dispatch records).
 */
export type DispatchQuantityClaimSource = {
  id?: string;
  status: string;
  items: Array<{
    rentalOrderItemId: string | null;
    productId: string;
    quantity: number;
    ownedQuantity?: number | null;
    externalQuantity?: number | null;
  }>;
};

export function sumClaimedDispatchQuantitiesByRentalOrderItem(
  dispatches: DispatchQuantityClaimSource[],
  options?: { excludeDispatchId?: string },
): Map<string, number> {
  const claimed = new Map<string, number>();

  for (const dispatch of dispatches) {
    if (dispatch.status === "CANCELLED") {
      continue;
    }

    if (
      options?.excludeDispatchId !== undefined &&
      dispatch.id === options.excludeDispatchId
    ) {
      continue;
    }

    for (const item of dispatch.items) {
      const key = item.rentalOrderItemId ?? item.productId;
      claimed.set(key, (claimed.get(key) ?? 0) + item.quantity);
    }
  }

  return claimed;
}

/**
 * Owned / external claims from non-CANCELLED dispatches.
 * Null source fields count as fully owned (legacy).
 */
export function sumClaimedSourceDispatchQuantitiesByRentalOrderItem(
  dispatches: DispatchQuantityClaimSource[],
  options?: { excludeDispatchId?: string },
): { owned: Map<string, number>; external: Map<string, number> } {
  const owned = new Map<string, number>();
  const external = new Map<string, number>();

  for (const dispatch of dispatches) {
    if (dispatch.status === "CANCELLED") {
      continue;
    }

    if (
      options?.excludeDispatchId !== undefined &&
      dispatch.id === options.excludeDispatchId
    ) {
      continue;
    }

    for (const item of dispatch.items) {
      const key = item.rentalOrderItemId ?? item.productId;
      const ownedQty =
        item.ownedQuantity === null || item.ownedQuantity === undefined
          ? item.quantity
          : item.ownedQuantity;
      const externalQty =
        item.externalQuantity === null || item.externalQuantity === undefined
          ? 0
          : item.externalQuantity;

      owned.set(key, (owned.get(key) ?? 0) + ownedQty);
      external.set(key, (external.get(key) ?? 0) + externalQty);
    }
  }

  return { owned, external };
}

/** Phase 30: maps SQL aggregate rows to domain claim maps (Rollup A). */
export function toClaimedSourceQuantityMaps(
  rows: ReadonlyArray<{
    rentalOrderItemId: string | null;
    productId: string;
    ownedClaimed: number;
    externalClaimed: number;
  }>,
): { owned: Map<string, number>; external: Map<string, number> } {
  const owned = new Map<string, number>();
  const external = new Map<string, number>();

  for (const row of rows) {
    const key = row.rentalOrderItemId ?? row.productId;
    owned.set(key, (owned.get(key) ?? 0) + row.ownedClaimed);
    external.set(key, (external.get(key) ?? 0) + row.externalClaimed);
  }

  return { owned, external };
}

export function validateDispatchItemsAgainstRentalOrder(
  dispatchItems: CreateDispatchItemData[],
  rentalOrderItems: RentalOrderItemProps[],
  claimedByRentalOrderItem: Map<string, number> = new Map(),
  externalRemainingByRentalOrderItem: Map<string, number> = new Map(),
  claimedOwnedByRentalOrderItem: Map<string, number> = claimedByRentalOrderItem,
): CreateDispatchItemData[] {
  return dispatchItems.map((dispatchItem) => {
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

    const ownedClaimed =
      claimedOwnedByRentalOrderItem.get(rentalItem.id) ??
      claimedOwnedByRentalOrderItem.get(rentalItem.productId) ??
      0;
    const ownedRemaining = rentalItem.reservedQuantity - ownedClaimed;
    const externalRemaining =
      externalRemainingByRentalOrderItem.get(rentalItem.id) ?? 0;

    const split = resolveDispatchSourceSplit(
      dispatchItem.quantity,
      dispatchItem.ownedQuantity,
      dispatchItem.externalQuantity,
      ownedRemaining,
      externalRemaining,
      dispatchItem.productId,
    );

    const persisted = toPersistedDispatchSourceFields(split);

    return {
      ...dispatchItem,
      rentalOrderItemId: rentalItem.id,
      ownedQuantity: persisted.ownedQuantity,
      externalQuantity: persisted.externalQuantity,
    };
  });
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
