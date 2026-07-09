import type { Dispatch } from "@/modules/dispatch/domain/dispatch.entity";
import type { IReturnRepository } from "@/modules/return/domain";
import {
  ReturnInvalidItemError,
  assertDispatchEligibleForReturn,
  validateReturnItemsAgainstDispatch,
} from "@/modules/return/domain";
import type { CreateReturnItemData } from "@/modules/return/domain";
import { UnprocessableError } from "@/shared/infrastructure/errors";

function buildPriorReturnedMap(
  returns: Awaited<ReturnType<IReturnRepository["findByDispatchId"]>>,
  excludeReturnId?: string,
): Map<string, number> {
  const map = new Map<string, number>();

  for (const returnRecord of returns) {
    if (excludeReturnId !== undefined && returnRecord.id === excludeReturnId) {
      continue;
    }

    if (returnRecord.status === "CANCELLED") {
      continue;
    }

    for (const item of returnRecord.items) {
      const existing = map.get(item.rentalOrderItemId) ?? 0;
      map.set(item.rentalOrderItemId, existing + item.returnedQuantity);
    }
  }

  return map;
}

export function validateDispatchForReturn(dispatch: Dispatch): void {
  try {
    assertDispatchEligibleForReturn(dispatch.status);
  } catch (error) {
    if (error instanceof ReturnInvalidItemError) {
      throw new UnprocessableError({ message: error.message });
    }

    throw error;
  }
}

export function validateReturnItemsForDispatch(
  items: CreateReturnItemData[],
  dispatch: Dispatch,
  priorReturns: Awaited<ReturnType<IReturnRepository["findByDispatchId"]>>,
  excludeReturnId?: string,
): void {
  try {
    validateReturnItemsAgainstDispatch(
      items,
      dispatch.items.map((item) => ({
        id: item.id,
        rentalOrderItemId: item.rentalOrderItemId,
        quantity: item.quantity,
      })),
      buildPriorReturnedMap(priorReturns, excludeReturnId),
    );
  } catch (error) {
    if (error instanceof ReturnInvalidItemError) {
      throw new UnprocessableError({
        message: error.message,
        details:
          error.rentalOrderItemId !== undefined
            ? { rentalOrderItemId: error.rentalOrderItemId }
            : undefined,
      });
    }

    throw error;
  }
}

export async function loadPriorReturnsForDispatch(
  returnRepository: IReturnRepository,
  dispatchId: Dispatch["id"],
): Promise<Awaited<ReturnType<IReturnRepository["findByDispatchId"]>>> {
  return returnRepository.findByDispatchId(dispatchId);
}
