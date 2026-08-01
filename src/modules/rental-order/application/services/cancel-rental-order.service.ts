import { RENTAL_ORDER_REFERENCE_TYPE } from "@/modules/rental-order/domain/rental-order.constants";
import { RentalOrderInvalidStatusError } from "@/modules/rental-order/domain/rental-order.errors";
import { executeCreateStockMovementInScope } from "@/modules/stock-movement/application/services/create-stock-movement-in-scope";
import { parseRequest } from "@/shared/application/validation";
import {
  NotFoundError,
  UnauthorizedError,
  UnprocessableError,
} from "@/shared/infrastructure/errors";

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
        dispatchRepository,
        inventoryRepository,
        stockMovementRepository,
        auditLogger,
        userId,
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

        let cancelled;

        try {
          cancelled = existing.withCancelled();
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

        const priorDispatches = await dispatchRepository.findPaged({
          page: 1,
          pageSize: 100,
          rentalOrderId: existing.id,
          sortOrder: "desc",
        });

        const activeDispatches = priorDispatches.items.filter(
          (dispatch) => dispatch.status !== "CANCELLED",
        );

        if (activeDispatches.length > 0) {
          throw new UnprocessableError({
            message:
              "Cannot cancel rental order with active dispatches. Cancel dispatches first.",
            details: {
              activeDispatchCount: activeDispatches.length,
            },
          });
        }

        const previousValues = toRentalOrderAuditValues(existing);
        const reservedItems = existing.items.filter(
          (item) => item.reservedQuantity > 0,
        );

        if (reservedItems.length > 0) {
          if (userId === undefined) {
            throw new UnauthorizedError({
              message: "User context is required to cancel reserved rental order",
            });
          }

          const inventories =
            await inventoryRepository.findByProductsAndWarehouse(
              reservedItems.map((item) => toProductId(item.productId)),
              existing.warehouseId,
            );
          const inventoryByProductId = new Map(
            inventories.map((inventory) => [inventory.productId, inventory]),
          );

          for (const item of reservedItems) {
            const inventory = inventoryByProductId.get(
              toProductId(item.productId),
            );

            if (inventory === undefined) {
              throw new NotFoundError({
                message: "Inventory not found for product and warehouse",
                details: {
                  productId: item.productId,
                  warehouseId: existing.warehouseId,
                },
              });
            }

            await executeCreateStockMovementInScope(
              {
                stockMovementRepository,
                inventoryRepository,
                auditLogger,
                userId,
              },
              {
                inventoryId: inventory.id,
                movementType: "RELEASE",
                quantity: item.reservedQuantity,
                referenceType: RENTAL_ORDER_REFERENCE_TYPE,
                referenceId: existing.id,
                remarks: `Released reservation on cancel of rental order ${existing.orderNumber}`,
              },
            );
          }
        }

        const updated = await rentalOrderRepository.updateReserve(existing.id, {
          status: cancelled.status,
          items: existing.items.map((item) => ({
            id: item.id,
            reservedQuantity: 0,
          })),
        });

        await auditLogger.log({
          module: RENTAL_ORDER_MODULE,
          entityName: RENTAL_ORDER_ENTITY_NAME,
          recordId: updated.id,
          action: "CANCEL",
          status: "SUCCESS",
          oldValues: previousValues,
          newValues: toRentalOrderAuditValues(updated),
        });

        return toRentalOrderDto(updated);
      },
    );
  }
}
