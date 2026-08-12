import type { RentalOrder } from "@/modules/rental-order/domain/rental-order.entity";
import {
  assertRentalOrderEligibleForDispatch,
  DispatchInvalidItemError,
  DispatchInvariantError,
  validateDispatchItemsAgainstRentalOrder,
} from "@/modules/dispatch/domain";
import type { CreateDispatchItemData } from "@/modules/dispatch/domain";
import { UnprocessableError } from "@/shared/infrastructure/errors";

export function validateRentalOrderForDispatch(
  rentalOrder: RentalOrder,
  items: CreateDispatchItemData[],
  claimedOwnedByRentalOrderItem: Map<string, number> = new Map(),
  externalRemainingByRentalOrderItem: Map<string, number> = new Map(),
): CreateDispatchItemData[] {
  try {
    assertRentalOrderEligibleForDispatch(rentalOrder.status);
    return validateDispatchItemsAgainstRentalOrder(
      items,
      rentalOrder.items,
      claimedOwnedByRentalOrderItem,
      externalRemainingByRentalOrderItem,
      claimedOwnedByRentalOrderItem,
    );
  } catch (error) {
    if (error instanceof DispatchInvalidItemError) {
      throw new UnprocessableError({
        message: error.message,
        details: error.productId !== undefined
          ? { productId: error.productId }
          : undefined,
      });
    }

    if (error instanceof DispatchInvariantError) {
      throw new UnprocessableError({
        message: error.message,
        details: error.field !== undefined ? { field: error.field } : undefined,
      });
    }

    throw error;
  }
}
