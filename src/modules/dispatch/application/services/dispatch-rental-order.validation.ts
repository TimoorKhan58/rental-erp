import type { RentalOrder } from "@/modules/rental-order/domain/rental-order.entity";
import {
  assertRentalOrderEligibleForDispatch,
  DispatchInvalidItemError,
  validateDispatchItemsAgainstRentalOrder,
} from "@/modules/dispatch/domain";
import type { CreateDispatchItemData } from "@/modules/dispatch/domain";
import { UnprocessableError } from "@/shared/infrastructure/errors";

export function validateRentalOrderForDispatch(
  rentalOrder: RentalOrder,
  items: CreateDispatchItemData[],
): void {
  try {
    assertRentalOrderEligibleForDispatch(rentalOrder.status);
    validateDispatchItemsAgainstRentalOrder(items, rentalOrder.items);
  } catch (error) {
    if (error instanceof DispatchInvalidItemError) {
      throw new UnprocessableError({
        message: error.message,
        details: error.productId !== undefined
          ? { productId: error.productId }
          : undefined,
      });
    }

    throw error;
  }
}
