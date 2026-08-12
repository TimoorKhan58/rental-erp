import { RENTAL_ORDER_REFERENCE_TYPE } from "@/modules/rental-order/domain/rental-order.constants";
import { RentalOrderInvalidStatusError } from "@/modules/rental-order/domain/rental-order.errors";
import { executeCreateStockMovementInScope } from "@/modules/stock-movement/application/services/create-stock-movement-in-scope";
import {
  DispatchInvalidStatusError,
  effectiveExternalDispatchQuantity,
  effectiveOwnedDispatchQuantity,
} from "@/modules/dispatch/domain";
import {
  ExternalRentalInvalidDispatchError,
  ExternalRentalInvalidStatusError,
  ExternalRentalInvariantError,
} from "@/modules/external-rental/domain";
import { toExternalRentalWorkflowData } from "@/modules/external-rental/application/mappers/external-rental.mapper";
import { parseRequest } from "@/shared/application/validation";
import type { RentalOrderItemId } from "@/shared/domain/ids";
import {
  NotFoundError,
  UnauthorizedError,
  UnprocessableError,
} from "@/shared/infrastructure/errors";
import {
  NOTIFICATION_EVENT_KEYS,
  enqueueWorkflowNotification,
} from "@/shared/infrastructure/notifications";

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
        externalRentalRepository,
        auditLogger,
        notificationService,
        db,
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

        const externalDispatchItems: Array<{
          rentalOrderItemId: RentalOrderItemId;
          quantity: number;
        }> = [];

        for (const item of updated.items) {
          const ownedQuantity = effectiveOwnedDispatchQuantity(item);
          const externalQuantity = effectiveExternalDispatchQuantity(item);

          if (externalQuantity > 0) {
            if (item.rentalOrderItemId === null) {
              throw new UnprocessableError({
                message:
                  "External dispatch requires rentalOrderItemId on dispatch item",
                details: { productId: item.productId },
              });
            }

            externalDispatchItems.push({
              rentalOrderItemId: item.rentalOrderItemId as RentalOrderItemId,
              quantity: externalQuantity,
            });
          }

          if (ownedQuantity <= 0) {
            continue;
          }

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

          // Consume reservation when owned stock leaves the warehouse.
          const releaseQuantity = Math.min(
            ownedQuantity,
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
            quantity: ownedQuantity,
            referenceType: RENTAL_ORDER_REFERENCE_TYPE,
            referenceId: rentalOrder.id,
            remarks: `Dispatched for rental order ${rentalOrder.orderNumber}`,
          });
        }

        if (externalDispatchItems.length > 0) {
          const agreement = await externalRentalRepository.findActiveByRentalOrderId(
            rentalOrder.id,
          );

          if (agreement === null) {
            throw new UnprocessableError({
              message:
                "External dispatch quantity requires an external rental agreement",
            });
          }

          let externalDispatched;

          try {
            externalDispatched = agreement.withDispatched(externalDispatchItems);
          } catch (error) {
            if (
              error instanceof ExternalRentalInvalidStatusError ||
              error instanceof ExternalRentalInvalidDispatchError ||
              error instanceof ExternalRentalInvariantError
            ) {
              throw new UnprocessableError({
                message: error.message,
                details:
                  error instanceof ExternalRentalInvalidDispatchError &&
                  error.rentalOrderItemId !== undefined
                    ? { rentalOrderItemId: error.rentalOrderItemId }
                    : error instanceof ExternalRentalInvalidStatusError
                      ? {
                          currentStatus: error.currentStatus,
                          action: error.action,
                        }
                      : {
                          field: (error as ExternalRentalInvariantError).field,
                        },
              });
            }

            throw error;
          }

          await externalRentalRepository.updateWorkflow(
            agreement.id,
            toExternalRentalWorkflowData(externalDispatched),
          );
        }

        const completed = updated.withCompleted();
        updated = await dispatchRepository.updateStatus(
          completed.id,
          completed.status,
          { completedAt: completed.completedAt },
        );

        // First physical completion: ephemeral DISPATCHED → persist ON_RENT.
        if (rentalOrder.status !== "ON_RENT") {
          let onRentOrder;

          try {
            onRentOrder = rentalOrder.withDispatched().withOnRent();
          } catch (error) {
            if (error instanceof RentalOrderInvalidStatusError) {
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

          await rentalOrderRepository.updateStatus(
            onRentOrder.id,
            onRentOrder.status,
          );
        }

        await auditLogger.log({
          module: DISPATCH_MODULE,
          entityName: DISPATCH_ENTITY_NAME,
          recordId: updated.id,
          action: "UPDATE",
          status: "SUCCESS",
          oldValues: previousValues,
          newValues: {
            ...toDispatchAuditValues(updated),
            sourceQuantities: updated.items.map((item) => ({
              rentalOrderItemId: item.rentalOrderItemId,
              ownedQuantity: effectiveOwnedDispatchQuantity(item),
              externalQuantity: effectiveExternalDispatchQuantity(item),
            })),
          },
        });

        await enqueueWorkflowNotification(notificationService, db, {
          eventKey: NOTIFICATION_EVENT_KEYS.DISPATCH_COMPLETED,
          module: DISPATCH_MODULE,
          entityName: DISPATCH_ENTITY_NAME,
          recordId: updated.id,
          recipientUserIds: [rentalOrder.createdById],
          data: {
            dispatchNumber: updated.dispatchNumber,
            orderNumber: rentalOrder.orderNumber,
          },
        });

        return toDispatchDto(updated);
      },
    );
  }
}
