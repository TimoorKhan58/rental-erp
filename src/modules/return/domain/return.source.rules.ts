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

/**
 * Phase 28 — explicit source attribution for mixed outstanding lines.
 * Owned-first / external-first inference is rejected when both sources remain.
 */
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
  const mixedOutstanding = ownedRemaining > 0 && externalRemaining > 0;

  if (!hasOwned && !hasExternal) {
    if (quantity <= 0) {
      throw new ReturnInvalidItemError(
        "Return quantity must be positive",
        rentalOrderItemId,
      );
    }

    if (ownedRemaining <= 0 && externalRemaining <= 0) {
      throw new ReturnInvalidItemError(
        "No outstanding owned or external quantity available for return",
        rentalOrderItemId,
      );
    }

    if (mixedOutstanding) {
      throw new ReturnInvalidItemError(
        "Mixed-source return requires explicit ownedQuantity and externalQuantity",
        rentalOrderItemId,
      );
    }

    if (externalRemaining > 0) {
      if (quantity > externalRemaining) {
        throw new ReturnInvalidItemError(
          "External return quantity exceeds remaining external dispatched quantity",
          rentalOrderItemId,
        );
      }

      return {
        ownedQuantity: 0,
        externalQuantity: quantity,
        legacyOwnedOnly: false,
      };
    }

    if (quantity > ownedRemaining) {
      throw new ReturnInvalidItemError(
        "Owned return quantity exceeds remaining owned dispatched quantity",
        rentalOrderItemId,
      );
    }

    return {
      ownedQuantity: quantity,
      externalQuantity: 0,
      legacyOwnedOnly: true,
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
    legacyOwnedOnly: external === 0 && !hasOwned && !hasExternal,
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

export function isMixedSourceReturnItem(
  item: Pick<ReturnItemProps, "ownedQuantity" | "externalQuantity">,
): boolean {
  const owned = item.ownedQuantity ?? 0;
  const external = item.externalQuantity ?? 0;
  return (
    item.ownedQuantity !== null &&
    item.ownedQuantity !== undefined &&
    item.externalQuantity !== null &&
    item.externalQuantity !== undefined &&
    owned > 0 &&
    external > 0
  );
}

export function hasSourceConditionAttribution(
  item: Pick<
    ReturnItemProps,
    | "ownedGoodQuantity"
    | "ownedDamagedQuantity"
    | "ownedLostQuantity"
    | "externalGoodQuantity"
    | "externalDamagedQuantity"
    | "externalLostQuantity"
  >,
): boolean {
  return (
    item.ownedGoodQuantity +
      item.ownedDamagedQuantity +
      item.ownedLostQuantity +
      item.externalGoodQuantity +
      item.externalDamagedQuantity +
      item.externalLostQuantity >
    0
  );
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
