import { RENTAL_ORDER_REFERENCE_TYPE } from "@/modules/rental-order/domain/rental-order.constants";
import { executeCreateStockMovementInScope } from "@/modules/stock-movement/application/services/create-stock-movement-in-scope";
import { DispatchInvalidStatusError } from "@/modules/dispatch/domain";
import { parseRequest } from "@/shared/application/validation";
import {
  NotFoundError,
  UnauthorizedError,
  UnprocessableError,
} from "@/shared/infrastructure/errors";

import type { DispatchDto } from "../dtos/dispatch.dto";
import { toDispatchDto, toDispatchId, toProductId } from "../mappers/dispatch.mapper";
import {
  DispatchIdParamSchema,
  type DispatchIdParamInput,
} from "../schemas/dispatch.schemas";
import { toDispatchAuditValues } from "./dispatch-audit.mapper";
import {
  DISPATCH_ENTITY_NAME,
  DISPATCH_MODULE,
} from "./dispatch-service.constants";
import type { IDispatchTransactionRunner } from "./dispatch-transaction.runner";

export class CompleteDispatchService {
  constructor(
    private readonly transactionRunner: IDispatchTransactionRunner,
  ) {}

  async execute(params: DispatchIdParamInput): Promise<DispatchDto> {
    const { id } = parseRequest(DispatchIdParamSchema, params);

    return this.transactionRunner.run(
      async ({
        dispatchRepository,
        rentalOrderRepository,
        inventoryRepository,
        stockMovementRepository,
        auditLogger,
        userId,
      }) => {
        if (userId === undefined) {
          throw new UnauthorizedError({
            message: "User context is required to complete dispatch",
          });
        }

        const existing = await dispatchRepository.findById(toDispatchId(id));

        if (existing === null) {
          throw new NotFoundError({
            message: "Dispatch not found",
            details: { id },
          });
        }

        const rentalOrder = await rentalOrderRepository.findById(
          existing.rentalOrderId,
        );

        if (rentalOrder === null) {
          throw new NotFoundError({
            message: "Rental order not found",
            details: { rentalOrderId: existing.rentalOrderId },
          });
        }

        let dispatched;

        try {
          dispatched = existing.withDispatched();
        } catch (error) {
          if (error instanceof DispatchInvalidStatusError) {
            throw new UnprocessableError({
              message: error.message,
              details: {
                currentStatus: error.currentStatus,
                action: error.action,
              },
            });
          }

          throw error;
        }

        const previousValues = toDispatchAuditValues(existing);
        let updated = await dispatchRepository.updateStatus(
          existing.id,
          dispatched.status,
          { dispatchedAt: dispatched.dispatchedAt },
        );

        for (const item of updated.items) {
          const inventory = await inventoryRepository.findByProductAndWarehouse(
            toProductId(item.productId),
            rentalOrder.warehouseId,
          );

          if (inventory === null) {
            throw new NotFoundError({
              message: "Inventory not found for product and warehouse",
              details: {
                productId: item.productId,
                warehouseId: rentalOrder.warehouseId,
              },
            });
          }

          const movementScope = {
            stockMovementRepository,
            inventoryRepository,
            auditLogger,
            userId,
          };

          // Consume reservation when stock leaves the warehouse so available
          // quantity is no longer held against items that are already on rent.
          const releaseQuantity = Math.min(
            item.quantity,
            inventory.reservedQuantity,
          );

          if (releaseQuantity > 0) {
            await executeCreateStockMovementInScope(movementScope, {
              inventoryId: inventory.id,
              movementType: "RELEASE",
              quantity: releaseQuantity,
              referenceType: RENTAL_ORDER_REFERENCE_TYPE,
              referenceId: rentalOrder.id,
              remarks: `Released reservation for dispatch of rental order ${rentalOrder.orderNumber}`,
            });
          }

          await executeCreateStockMovementInScope(movementScope, {
            inventoryId: inventory.id,
            movementType: "OUT",
            quantity: item.quantity,
            referenceType: RENTAL_ORDER_REFERENCE_TYPE,
            referenceId: rentalOrder.id,
            remarks: `Dispatched for rental order ${rentalOrder.orderNumber}`,
          });
        }

        const completed = updated.withCompleted();
        updated = await dispatchRepository.updateStatus(
          completed.id,
          completed.status,
          { completedAt: completed.completedAt },
        );

        await auditLogger.log({
          module: DISPATCH_MODULE,
          entityName: DISPATCH_ENTITY_NAME,
          recordId: updated.id,
          action: "UPDATE",
          status: "SUCCESS",
          oldValues: previousValues,
          newValues: toDispatchAuditValues(updated),
        });

        return toDispatchDto(updated);
      },
    );
  }
}
