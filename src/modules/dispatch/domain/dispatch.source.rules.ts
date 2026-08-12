import {
  DispatchInvalidItemError,
  DispatchInvariantError,
} from "./dispatch.errors";
import type { CreateDispatchItemData, DispatchItemProps } from "./dispatch.types";

export type ResolvedDispatchSourceSplit = {
  ownedQuantity: number;
  externalQuantity: number;
  /** When true, persist null source fields (legacy owned-only row). */
  legacyOwnedOnly: boolean;
};

/**
 * Resolve owned vs external quantities for a dispatch line.
 * Omitted sources → owned-first against remaining pools.
 * Explicit sources must sum to quantity.
 */
export function resolveDispatchSourceSplit(
  quantity: number,
  ownedInput: number | null | undefined,
  externalInput: number | null | undefined,
  ownedRemaining: number,
  externalRemaining: number,
  productId?: string,
): ResolvedDispatchSourceSplit {
  const hasOwned = ownedInput !== undefined && ownedInput !== null;
  const hasExternal = externalInput !== undefined && externalInput !== null;

  if (!hasOwned && !hasExternal) {
    const owned = Math.min(quantity, Math.max(0, ownedRemaining));
    const external = quantity - owned;

    if (external > externalRemaining) {
      throw new DispatchInvalidItemError(
        externalRemaining <= 0 && ownedRemaining <= 0
          ? "No remaining quantity available for dispatch"
          : "Dispatch quantity exceeds remaining owned and external capacity",
        productId,
      );
    }

    return {
      ownedQuantity: owned,
      externalQuantity: external,
      legacyOwnedOnly: external === 0,
    };
  }

  const owned = hasOwned ? ownedInput : 0;
  const external = hasExternal ? externalInput : 0;

  if (owned < 0 || external < 0) {
    throw new DispatchInvariantError(
      "Source quantities cannot be negative",
      "ownedQuantity",
    );
  }

  if (owned + external !== quantity) {
    throw new DispatchInvariantError(
      "ownedQuantity + externalQuantity must equal quantity",
      "quantity",
    );
  }

  if (owned > ownedRemaining) {
    throw new DispatchInvalidItemError(
      ownedRemaining <= 0
        ? "No remaining reserved quantity available for owned dispatch"
        : "Owned dispatch quantity exceeds remaining reserved quantity",
      productId,
    );
  }

  if (external > externalRemaining) {
    throw new DispatchInvalidItemError(
      externalRemaining <= 0
        ? "No remaining external allocated quantity available for dispatch"
        : "External dispatch quantity exceeds remaining allocated quantity",
      productId,
    );
  }

  return {
    ownedQuantity: owned,
    externalQuantity: external,
    legacyOwnedOnly: false,
  };
}

export function effectiveOwnedDispatchQuantity(
  item: Pick<DispatchItemProps, "quantity" | "ownedQuantity" | "externalQuantity">,
): number {
  if (item.ownedQuantity === null || item.ownedQuantity === undefined) {
    return item.quantity;
  }

  return item.ownedQuantity;
}

export function effectiveExternalDispatchQuantity(
  item: Pick<DispatchItemProps, "quantity" | "ownedQuantity" | "externalQuantity">,
): number {
  if (item.externalQuantity === null || item.externalQuantity === undefined) {
    return 0;
  }

  return item.externalQuantity;
}

export function toPersistedDispatchSourceFields(
  split: ResolvedDispatchSourceSplit,
): Pick<CreateDispatchItemData, "ownedQuantity" | "externalQuantity"> {
  if (split.legacyOwnedOnly) {
    return {
      ownedQuantity: null,
      externalQuantity: null,
    };
  }

  return {
    ownedQuantity: split.ownedQuantity,
    externalQuantity: split.externalQuantity,
  };
}
