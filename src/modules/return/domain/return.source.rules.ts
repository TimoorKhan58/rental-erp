import {
  ReturnInvalidItemError,
  ReturnInvariantError,
} from "./return.errors";
import type { CreateReturnItemData, ReturnItemProps } from "./return.types";

export type ResolvedReturnSourceSplit = {
  ownedQuantity: number;
  externalQuantity: number;
  legacyOwnedOnly: boolean;
};

export function resolveReturnSourceSplit(
  quantity: number,
  ownedInput: number | null | undefined,
  externalInput: number | null | undefined,
  ownedRemaining: number,
  externalRemaining: number,
  rentalOrderItemId?: string,
): ResolvedReturnSourceSplit {
  const hasOwned = ownedInput !== undefined && ownedInput !== null;
  const hasExternal = externalInput !== undefined && externalInput !== null;

  if (!hasOwned && !hasExternal) {
    const owned = Math.min(quantity, Math.max(0, ownedRemaining));
    const external = quantity - owned;

    if (external > externalRemaining) {
      throw new ReturnInvalidItemError(
        "Return quantity exceeds remaining dispatched quantity",
        rentalOrderItemId,
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
    throw new ReturnInvariantError(
      "Source quantities cannot be negative",
      "ownedQuantity",
    );
  }

  if (owned + external !== quantity) {
    throw new ReturnInvariantError(
      "ownedQuantity + externalQuantity must equal quantity",
      "quantity",
    );
  }

  if (owned > ownedRemaining) {
    throw new ReturnInvalidItemError(
      "Owned return quantity exceeds remaining owned dispatched quantity",
      rentalOrderItemId,
    );
  }

  if (external > externalRemaining) {
    throw new ReturnInvalidItemError(
      "External return quantity exceeds remaining external dispatched quantity",
      rentalOrderItemId,
    );
  }

  return {
    ownedQuantity: owned,
    externalQuantity: external,
    legacyOwnedOnly: false,
  };
}

export function effectiveOwnedReturnQuantity(
  item: Pick<ReturnItemProps, "returnedQuantity" | "ownedQuantity" | "externalQuantity">,
): number {
  if (item.ownedQuantity === null || item.ownedQuantity === undefined) {
    return item.returnedQuantity;
  }

  return item.ownedQuantity;
}

export function effectiveExternalReturnQuantity(
  item: Pick<ReturnItemProps, "returnedQuantity" | "ownedQuantity" | "externalQuantity">,
): number {
  if (item.externalQuantity === null || item.externalQuantity === undefined) {
    return 0;
  }

  return item.externalQuantity;
}

export function toPersistedReturnSourceFields(
  split: ResolvedReturnSourceSplit,
): Pick<CreateReturnItemData, "ownedQuantity" | "externalQuantity"> {
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
