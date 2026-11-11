import { NotFoundError } from "@/shared/infrastructure/errors";

import { toInventoryId } from "../mappers/stock-movement.mapper";
import { executeCreateStockMovementInScope } from "./create-stock-movement-in-scope";
import type { StockMovementWriteScope } from "./stock-movement-transaction.runner";

export interface ReleaseReferenceReservationInput {
  inventoryId: string;
  referenceType: string;
  referenceId: string;
  /** Total the document reserved on this inventory row (e.g. Σ order line reservedQuantity). */
  reservedByReference: number;
  /** Upper bound for this release; omit to release the whole remaining hold. */
  maxQuantity?: number;
  remarks: string;
}

/**
 * Releases at most what this reference (e.g. one rental order) still holds on
 * an inventory row: what it reserved minus what has already been released for
 * it. Inventory.reservedQuantity is shared by every order, so capping only by
 * it would let one order consume another order's hold (QA-012).
 *
 * Returns the quantity released (0 when nothing is held).
 */
export async function releaseReferenceReservationInScope(
  scope: StockMovementWriteScope,
  input: ReleaseReferenceReservationInput,
): Promise<number> {
  const alreadyReleased = await scope.stockMovementRepository.sumReleased(
    input.inventoryId,
    input.referenceType,
    input.referenceId,
  );
  const held = Math.max(0, input.reservedByReference - alreadyReleased);

  if (held === 0) {
    return 0;
  }

  const inventory = await scope.inventoryRepository.findById(
    toInventoryId(input.inventoryId),
  );

  if (inventory === null) {
    throw new NotFoundError({
      message: "Inventory not found",
      details: { inventoryId: input.inventoryId },
    });
  }

  const quantity = Math.min(
    held,
    inventory.reservedQuantity,
    input.maxQuantity ?? Number.POSITIVE_INFINITY,
  );

  if (quantity <= 0) {
    return 0;
  }

  await executeCreateStockMovementInScope(scope, {
    inventoryId: input.inventoryId,
    movementType: "RELEASE",
    quantity,
    referenceType: input.referenceType,
    referenceId: input.referenceId,
    remarks: input.remarks,
  });

  return quantity;
}

/** Σ reservedQuantity of an order's lines for one product. */
export function sumReservedForProduct(
  items: ReadonlyArray<{ productId: string; reservedQuantity: number }>,
  productId: string,
): number {
  return items
    .filter((item) => item.productId === productId)
    .reduce((total, item) => total + item.reservedQuantity, 0);
}
