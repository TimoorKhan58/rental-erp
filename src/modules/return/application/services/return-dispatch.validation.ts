import type { Dispatch } from "@/modules/dispatch/domain/dispatch.entity";
import type { IReturnRepository } from "@/modules/return/domain";
import {
  ReturnInvalidItemError,
  ReturnInvariantError,
  assertDispatchEligibleForReturn,
  validateReturnItemsAgainstDispatch,
} from "@/modules/return/domain";
import type { CreateReturnItemData } from "@/modules/return/domain";
import { UnprocessableError } from "@/shared/infrastructure/errors";

function buildPriorReturnedMaps(
  returns: Awaited<ReturnType<IReturnRepository["findByDispatchId"]>>,
  excludeReturnId?: string,
): {
  total: Map<string, number>;
  owned: Map<string, number>;
  external: Map<string, number>;
} {
  const total = new Map<string, number>();
  const owned = new Map<string, number>();
  const external = new Map<string, number>();

  for (const returnRecord of returns) {
    if (excludeReturnId !== undefined && returnRecord.id === excludeReturnId) {
      continue;
    }

    if (returnRecord.status === "CANCELLED") {
      continue;
    }

    for (const item of returnRecord.items) {
      const ownedQty =
        item.ownedQuantity === null || item.ownedQuantity === undefined
          ? item.returnedQuantity
          : item.ownedQuantity;
      const externalQty =
        item.externalQuantity === null || item.externalQuantity === undefined
          ? 0
          : item.externalQuantity;

      total.set(
        item.rentalOrderItemId,
        (total.get(item.rentalOrderItemId) ?? 0) + item.returnedQuantity,
      );
      owned.set(
        item.rentalOrderItemId,
        (owned.get(item.rentalOrderItemId) ?? 0) + ownedQty,
      );
      external.set(
        item.rentalOrderItemId,
        (external.get(item.rentalOrderItemId) ?? 0) + externalQty,
      );
    }
  }

  return { total, owned, external };
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
): CreateReturnItemData[] {
  try {
    const prior = buildPriorReturnedMaps(priorReturns, excludeReturnId);
    return validateReturnItemsAgainstDispatch(
      items,
      dispatch.items.map((item) => ({
        id: item.id,
        rentalOrderItemId: item.rentalOrderItemId,
        quantity: item.quantity,
        ownedQuantity: item.ownedQuantity,
        externalQuantity: item.externalQuantity,
      })),
      prior.total,
      prior.owned,
      prior.external,
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

    if (error instanceof ReturnInvariantError) {
      throw new UnprocessableError({
        message: error.message,
        details: error.field !== undefined ? { field: error.field } : undefined,
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
