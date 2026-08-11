import { RENTAL_ORDER_REFERENCE_TYPE } from "@/modules/rental-order/domain/rental-order.constants";
import { RentalOrderInvalidStatusError } from "@/modules/rental-order/domain/rental-order.errors";
import { executeCreateStockMovementInScope } from "@/modules/stock-movement/application/services/create-stock-movement-in-scope";
import { parseRequest } from "@/shared/application/validation";
import {
  NotFoundError,
  UnauthorizedError,
  UnprocessableError,
} from "@/shared/infrastructure/errors";
import {
  NOTIFICATION_EVENT_KEYS,
  enqueueWorkflowNotification,
} from "@/shared/infrastructure/notifications";

import type { RentalOrderDto } from "../dtos/rental-order.dto";
import {
  toProductId,
  toRentalOrderDto,
  toRentalOrderId,
} from "../mappers/rental-order.mapper";
import {
  RentalOrderIdParamSchema,
  type RentalOrderIdParamInput,
} from "../schemas/rental-order.schemas";
import { toRentalOrderAuditValues } from "./rental-order-audit.mapper";
import {
  RENTAL_ORDER_ENTITY_NAME,
  RENTAL_ORDER_MODULE,
} from "./rental-order-service.constants";
import type { IRentalOrderTransactionRunner } from "./rental-order-transaction.runner";

export class CancelRentalOrderService {
  constructor(
    private readonly transactionRunner: IRentalOrderTransactionRunner,
  ) {}

  async execute(params: RentalOrderIdParamInput): Promise<RentalOrderDto> {
    const { id } = parseRequest(RentalOrderIdParamSchema, params);

    return this.transactionRunner.run(
      async ({
        rentalOrderRepository,
        inventoryRepository,
        stockMovementRepository,
        dispatchRepository,
        auditLogger,
        notificationService,
        userId,
        db,
      }) => {
        const existing = await rentalOrderRepository.findById(
          toRentalOrderId(id),
        );

        if (existing === null) {
          throw new NotFoundError({
            message: "Rental order not found",
            details: { id },
          });
        }

        try {
          existing.withCancelled();
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

        const dispatches = await dispatchRepository.findPaged({
          page: 1,
          pageSize: 100,
          sortOrder: "desc",
          rentalOrderId: existing.id,
        });

        const conflictingDispatch = dispatches.items.find(
          (dispatch) => dispatch.status !== "CANCELLED",
        );

        if (conflictingDispatch !== undefined) {
          throw new UnprocessableError({
            message:
              "Rental order cannot be cancelled because it has an active dispatch",
            details: {
              rentalOrderId: existing.id,
              dispatchId: conflictingDispatch.id,
              dispatchStatus: conflictingDispatch.status,
            },
          });
        }

        const previousValues = toRentalOrderAuditValues(existing);

        // Claim CANCELLED before RELEASE so concurrent cancels cannot
        // double-release against a shared inventory reserved pool.
        // Item reservedQuantity is left intact until after RELEASE so a
        // concurrent reserve that landed before the claim is still released.
        const claimed = await rentalOrderRepository.cancelIfCancellable(
          existing.id,
        );

        if (claimed === null) {
          throw new UnprocessableError({
            message: "Rental order cannot be cancelled",
            details: {
              currentStatus: existing.status,
              action: "cancel",
            },
          });
        }

        const releaseLines = claimed.items.filter(
          (item) => item.reservedQuantity > 0,
        );

        if (releaseLines.length > 0 && userId === undefined) {
          throw new UnauthorizedError({
            message: "User context is required to cancel reserved rental order",
          });
        }

        const releaseTargets: Array<{
          inventoryId: string;
          quantity: number;
        }> = [];

        for (const line of releaseLines) {
          const inventory =
            await inventoryRepository.findByProductAndWarehouse(
              toProductId(line.productId),
              existing.warehouseId,
            );

          if (inventory === null) {
            throw new NotFoundError({
              message: "Inventory not found for product and warehouse",
              details: {
                productId: line.productId,
                warehouseId: existing.warehouseId,
              },
            });
          }

          releaseTargets.push({
            inventoryId: inventory.id,
            quantity: line.reservedQuantity,
          });
        }

        releaseTargets.sort((left, right) =>
          left.inventoryId.localeCompare(right.inventoryId),
        );

        for (const target of releaseTargets) {
          await executeCreateStockMovementInScope(
            {
              stockMovementRepository,
              inventoryRepository,
              auditLogger,
              userId,
            },
            {
              inventoryId: target.inventoryId,
              movementType: "RELEASE",
              quantity: target.quantity,
              referenceType: RENTAL_ORDER_REFERENCE_TYPE,
              referenceId: existing.id,
              remarks: `Released on cancel of rental order ${existing.orderNumber}`,
            },
          );
        }

        const updated = await rentalOrderRepository.clearReservedQuantities(
          claimed.id,
        );

        await auditLogger.log({
          module: RENTAL_ORDER_MODULE,
          entityName: RENTAL_ORDER_ENTITY_NAME,
          recordId: updated.id,
          action: "CANCEL",
          status: "SUCCESS",
          oldValues: previousValues,
          newValues: toRentalOrderAuditValues(updated),
        });

        await enqueueWorkflowNotification(notificationService, db, {
          eventKey: NOTIFICATION_EVENT_KEYS.RENTAL_ORDER_CANCELLED,
          module: RENTAL_ORDER_MODULE,
          entityName: RENTAL_ORDER_ENTITY_NAME,
          recordId: updated.id,
          recipientUserIds: [updated.createdById],
          data: { orderNumber: updated.orderNumber },
        });

        return toRentalOrderDto(updated);
      },
    );
  }
}
