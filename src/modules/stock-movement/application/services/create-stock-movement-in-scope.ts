import { Inventory } from "@/modules/inventory/domain/inventory.entity";
import { InventoryInvariantError } from "@/modules/inventory/domain/inventory.errors";
import { StockMovementInsufficientQuantityError } from "@/modules/stock-movement/domain/stock-movement.errors";
import type { StockMovement } from "@/modules/stock-movement/domain/stock-movement.entity";
import {
  NotFoundError,
  UnauthorizedError,
  UnprocessableError,
} from "@/shared/infrastructure/errors";

import type { CreateStockMovementInput } from "../schemas/stock-movement.schemas";
import {
  toCreateStockMovementData,
  toInventoryId,
  toUserId,
} from "../mappers/stock-movement.mapper";
import { computeMovementEffect } from "./movement-effect";
import { toStockMovementAuditValues } from "./stock-movement-audit.mapper";
import {
  STOCK_MOVEMENT_ENTITY_NAME,
  STOCK_MOVEMENT_MODULE,
} from "./stock-movement-service.constants";
import type { StockMovementWriteScope } from "./stock-movement-transaction.runner";

function toInsufficientUnprocessable(
  error: StockMovementInsufficientQuantityError,
): UnprocessableError {
  return new UnprocessableError({
    message: error.message,
    details: {
      movementType: error.movementType,
      requestedQuantity: error.requestedQuantity,
      availableQuantity: error.availableQuantity,
    },
  });
}

export async function executeCreateStockMovementInScope(
  scope: StockMovementWriteScope,
  input: CreateStockMovementInput,
): Promise<StockMovement> {
  const { inventoryRepository, userId } = scope;

  if (userId === undefined) {
    throw new UnauthorizedError({
      message: "User context is required to create stock movement",
    });
  }

  const inventory = await inventoryRepository.findById(
    toInventoryId(input.inventoryId),
  );

  if (inventory === null) {
    throw new NotFoundError({
      message: "Inventory not found",
      details: { inventoryId: input.inventoryId },
    });
  }

  if (input.movementType === "RESERVE") {
    if (!inventory.isActive) {
      throw new UnprocessableError({
        message: "Inventory is inactive",
        details: { inventoryId: input.inventoryId },
      });
    }

    return executeReserveStockMovementInScope(scope, input, inventory);
  }

  if (input.movementType === "RELEASE") {
    // RELEASE must clear existing holds even when inventory is inactive.
    return executeReleaseStockMovementInScope(scope, input, inventory);
  }

  if (!inventory.isActive) {
    throw new UnprocessableError({
      message: "Inventory is inactive",
      details: { inventoryId: input.inventoryId },
    });
  }

  let effect;

  try {
    effect = computeMovementEffect(
      inventory,
      input.movementType,
      input.quantity,
    );
  } catch (error) {
    if (error instanceof StockMovementInsufficientQuantityError) {
      throw toInsufficientUnprocessable(error);
    }

    throw error;
  }

  try {
    Inventory.reconstitute({
      ...inventory.toProps(),
      quantityOnHand: effect.quantityOnHand,
      reservedQuantity: effect.reservedQuantity,
      updatedAt: new Date(),
    });
  } catch (error) {
    if (error instanceof InventoryInvariantError) {
      throw new UnprocessableError({
        message: error.message,
        details: { field: error.field },
      });
    }

    throw error;
  }

  await inventoryRepository.update(inventory.id, {
    quantityOnHand: effect.quantityOnHand,
    reservedQuantity: effect.reservedQuantity,
  });

  return createStockMovementAndAudit(scope, input, inventory, {
    previousQuantity: effect.previousQuantity,
    newQuantity: effect.newQuantity,
  });
}

async function executeReserveStockMovementInScope(
  scope: StockMovementWriteScope,
  input: CreateStockMovementInput,
  inventory: Inventory,
): Promise<StockMovement> {
  const { inventoryRepository } = scope;

  // Database atomic UPDATE is the concurrency authority for RESERVE.
  const reserved = await inventoryRepository.reserveAvailableQuantity(
    inventory.id,
    input.quantity,
  );

  if (reserved === null) {
    const latest = await inventoryRepository.findById(inventory.id);
    const availableQuantity =
      latest?.availableQuantity ?? inventory.availableQuantity;

    throw toInsufficientUnprocessable(
      new StockMovementInsufficientQuantityError(
        "Insufficient available quantity for RESERVE movement",
        "RESERVE",
        input.quantity,
        availableQuantity,
      ),
    );
  }

  try {
    Inventory.reconstitute(reserved.toProps());
  } catch (error) {
    if (error instanceof InventoryInvariantError) {
      throw new UnprocessableError({
        message: error.message,
        details: { field: error.field },
      });
    }

    throw error;
  }

  const previousQuantity = reserved.reservedQuantity - input.quantity;
  const newQuantity = reserved.reservedQuantity;

  return createStockMovementAndAudit(scope, input, reserved, {
    previousQuantity,
    newQuantity,
  });
}

async function executeReleaseStockMovementInScope(
  scope: StockMovementWriteScope,
  input: CreateStockMovementInput,
  inventory: Inventory,
): Promise<StockMovement> {
  const { inventoryRepository } = scope;

  // Database atomic UPDATE is the concurrency authority for RELEASE.
  const released = await inventoryRepository.releaseReservedQuantity(
    inventory.id,
    input.quantity,
  );

  if (released === null) {
    const latest = await inventoryRepository.findById(inventory.id);
    const availableQuantity =
      latest?.reservedQuantity ?? inventory.reservedQuantity;

    throw toInsufficientUnprocessable(
      new StockMovementInsufficientQuantityError(
        "Insufficient reserved quantity for RELEASE movement",
        "RELEASE",
        input.quantity,
        availableQuantity,
      ),
    );
  }

  try {
    Inventory.reconstitute(released.toProps());
  } catch (error) {
    if (error instanceof InventoryInvariantError) {
      throw new UnprocessableError({
        message: error.message,
        details: { field: error.field },
      });
    }

    throw error;
  }

  const previousQuantity = released.reservedQuantity + input.quantity;
  const newQuantity = released.reservedQuantity;

  return createStockMovementAndAudit(scope, input, released, {
    previousQuantity,
    newQuantity,
  });
}

async function createStockMovementAndAudit(
  scope: StockMovementWriteScope,
  input: CreateStockMovementInput,
  inventory: Inventory,
  quantities: { previousQuantity: number; newQuantity: number },
): Promise<StockMovement> {
  const { stockMovementRepository, auditLogger, userId } = scope;

  if (userId === undefined) {
    throw new UnauthorizedError({
      message: "User context is required to create stock movement",
    });
  }

  const movement = await stockMovementRepository.create(
    toCreateStockMovementData(
      input,
      {
        id: inventory.id,
        productId: inventory.productId,
        warehouseId: inventory.warehouseId,
      },
      quantities,
      toUserId(userId),
    ),
  );

  await auditLogger.log({
    module: STOCK_MOVEMENT_MODULE,
    entityName: STOCK_MOVEMENT_ENTITY_NAME,
    recordId: movement.id,
    action: "CREATE",
    status: "SUCCESS",
    newValues: toStockMovementAuditValues(movement),
  });

  return movement;
}
