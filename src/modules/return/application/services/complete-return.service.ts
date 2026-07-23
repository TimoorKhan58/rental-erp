import { syncRentalOrderStatusFromReturns } from "@/modules/rental-order/application/services/sync-rental-order-status-from-returns";
import { RENTAL_ORDER_REFERENCE_TYPE } from "@/modules/rental-order/domain/rental-order.constants";
import { executeCreateStockMovementInScope } from "@/modules/stock-movement/application/services/create-stock-movement-in-scope";
import {
  ReturnInvalidStatusError,
  computeReleaseQuantity,
  computeRestockQuantity,
} from "@/modules/return/domain";
import { parseRequest } from "@/shared/application/validation";
import {
  NotFoundError,
  UnauthorizedError,
  UnprocessableError,
} from "@/shared/infrastructure/errors";

import type { ReturnDto } from "../dtos/return.dto";
import { toProductId, toReturnDto, toReturnId } from "../mappers/return.mapper";
import {
  ReturnIdParamSchema,
  type ReturnIdParamInput,
} from "../schemas/return.schemas";
import { toReturnAuditValues } from "./return-audit.mapper";
import {
  RETURN_ENTITY_NAME,
  RETURN_MODULE,
} from "./return-service.constants";
import type { IReturnTransactionRunner } from "./return-transaction.runner";

export class CompleteReturnService {
  constructor(
    private readonly transactionRunner: IReturnTransactionRunner,
  ) {}

  async execute(params: ReturnIdParamInput): Promise<ReturnDto> {
    const { id } = parseRequest(ReturnIdParamSchema, params);

    return this.transactionRunner.run(
      async ({
        returnRepository,
        dispatchRepository,
        rentalOrderRepository,
        inventoryRepository,
        stockMovementRepository,
        auditLogger,
        userId,
      }) => {
        if (userId === undefined) {
          throw new UnauthorizedError({
            message: "User context is required to complete return",
          });
        }

        const existing = await returnRepository.findById(toReturnId(id));

        if (existing === null) {
          throw new NotFoundError({
            message: "Return not found",
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

        let completed;

        try {
          completed = existing.withCompleted();
        } catch (error) {
          if (error instanceof ReturnInvalidStatusError) {
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

        const previousValues = toReturnAuditValues(existing);

        for (const item of existing.items) {
          const rentalItem = rentalOrder.items.find(
            (orderItem) => orderItem.id === item.rentalOrderItemId,
          );

          if (rentalItem === undefined) {
            throw new NotFoundError({
              message: "Rental order item not found",
              details: { rentalOrderItemId: item.rentalOrderItemId },
            });
          }

          const releaseQuantity = computeReleaseQuantity(item);
          const restockQuantity = computeRestockQuantity(item);

          if (releaseQuantity > 0 || restockQuantity > 0) {
            const inventory = await inventoryRepository.findByProductAndWarehouse(
              toProductId(rentalItem.productId),
              rentalOrder.warehouseId,
            );

            if (inventory === null) {
              throw new NotFoundError({
                message: "Inventory not found for product and warehouse",
                details: {
                  productId: rentalItem.productId,
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

            // Clear any leftover reservation so returned stock becomes available.
            // (Dispatch usually releases first; this covers partial / leftover reserve.)
            const releaseNow = Math.min(
              releaseQuantity,
              inventory.reservedQuantity,
            );

            if (releaseNow > 0) {
              await executeCreateStockMovementInScope(movementScope, {
                inventoryId: inventory.id,
                movementType: "RELEASE",
                quantity: releaseNow,
                referenceType: RENTAL_ORDER_REFERENCE_TYPE,
                referenceId: rentalOrder.id,
                remarks: `Released reservation for return ${existing.returnNumber} on rental order ${rentalOrder.orderNumber}`,
              });
            }

            if (restockQuantity > 0) {
              await executeCreateStockMovementInScope(movementScope, {
                inventoryId: inventory.id,
                movementType: "IN",
                quantity: restockQuantity,
                referenceType: RENTAL_ORDER_REFERENCE_TYPE,
                referenceId: rentalOrder.id,
                remarks: `Returned for rental order ${rentalOrder.orderNumber} (${item.goodQuantity} good, ${item.damagedQuantity} damaged)`,
              });
            }
          }

          if (item.lostQuantity > 0) {
            await auditLogger.log({
              module: RETURN_MODULE,
              entityName: RETURN_ENTITY_NAME,
              recordId: existing.id,
              action: "RETURN",
              status: "SUCCESS",
              newValues: {
                rentalOrderItemId: item.rentalOrderItemId,
                lostQuantity: item.lostQuantity,
                returnNumber: existing.returnNumber,
              },
            });
          }
        }

        const updated = await returnRepository.updateStatus(existing.id, {
          status: completed.status,
          completedAt: completed.completedAt,
        });

        await auditLogger.log({
          module: RETURN_MODULE,
          entityName: RETURN_ENTITY_NAME,
          recordId: updated.id,
          action: "UPDATE",
          status: "SUCCESS",
          oldValues: previousValues,
          newValues: toReturnAuditValues(updated),
        });

        await syncRentalOrderStatusFromReturns(existing.rentalOrderId, {
          dispatchRepository,
          returnRepository,
          rentalOrderRepository,
        });

        return toReturnDto(updated);
      },
    );
  }
}
