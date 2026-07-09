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

export async function executeCreateStockMovementInScope(
  scope: StockMovementWriteScope,
  input: CreateStockMovementInput,
): Promise<StockMovement> {
  const {
    stockMovementRepository,
    inventoryRepository,
    auditLogger,
    userId,
  } = scope;

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
      throw new UnprocessableError({
        message: error.message,
        details: {
          movementType: error.movementType,
          requestedQuantity: error.requestedQuantity,
          availableQuantity: error.availableQuantity,
        },
      });
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

  const movement = await stockMovementRepository.create(
    toCreateStockMovementData(
      input,
      {
        id: inventory.id,
        productId: inventory.productId,
        warehouseId: inventory.warehouseId,
      },
      {
        previousQuantity: effect.previousQuantity,
        newQuantity: effect.newQuantity,
      },
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
