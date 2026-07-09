import { Inventory } from "@/modules/inventory/domain/inventory.entity";
import { InventoryInvariantError } from "@/modules/inventory/domain/inventory.errors";
import { StockMovementInsufficientQuantityError } from "@/modules/stock-movement/domain/stock-movement.errors";
import { parseRequest } from "@/shared/application/validation";
import {
  NotFoundError,
  UnauthorizedError,
  UnprocessableError,
} from "@/shared/infrastructure/errors";

import type { StockMovementDto } from "../dtos/stock-movement.dto";
import {
  toCreateStockMovementData,
  toInventoryId,
  toStockMovementDto,
  toUserId,
} from "../mappers/stock-movement.mapper";
import {
  CreateStockMovementSchema,
  type CreateStockMovementInput,
} from "../schemas/stock-movement.schemas";
import { computeMovementEffect } from "./movement-effect";
import { toStockMovementAuditValues } from "./stock-movement-audit.mapper";
import {
  STOCK_MOVEMENT_ENTITY_NAME,
  STOCK_MOVEMENT_MODULE,
} from "./stock-movement-service.constants";
import type { IStockMovementTransactionRunner } from "./stock-movement-transaction.runner";

export class CreateStockMovementService {
  constructor(
    private readonly transactionRunner: IStockMovementTransactionRunner,
  ) {}

  async execute(input: CreateStockMovementInput): Promise<StockMovementDto> {
    const data = parseRequest(CreateStockMovementSchema, input);

    return this.transactionRunner.run(
      async ({
        stockMovementRepository,
        inventoryRepository,
        auditLogger,
        userId,
      }) => {
        if (userId === undefined) {
          throw new UnauthorizedError({
            message: "User context is required to create stock movement",
          });
        }

        const inventory = await inventoryRepository.findById(
          toInventoryId(data.inventoryId),
        );

        if (inventory === null) {
          throw new NotFoundError({
            message: "Inventory not found",
            details: { inventoryId: data.inventoryId },
          });
        }

        if (!inventory.isActive) {
          throw new UnprocessableError({
            message: "Inventory is inactive",
            details: { inventoryId: data.inventoryId },
          });
        }

        let effect;

        try {
          effect = computeMovementEffect(
            inventory,
            data.movementType,
            data.quantity,
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
            data,
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

        return toStockMovementDto(movement);
      },
    );
  }
}
