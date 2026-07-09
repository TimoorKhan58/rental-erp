import { RENTAL_ORDER_REFERENCE_TYPE } from "@/modules/rental-order/domain/rental-order.constants";
import {
  RentalOrderInvalidReserveError,
  RentalOrderInvalidStatusError,
} from "@/modules/rental-order/domain/rental-order.errors";
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
  ReserveRentalOrderSchema,
  type RentalOrderIdParamInput,
  type ReserveRentalOrderInput,
} from "../schemas/rental-order.schemas";
import { toRentalOrderAuditValues } from "./rental-order-audit.mapper";
import {
  RENTAL_ORDER_ENTITY_NAME,
  RENTAL_ORDER_MODULE,
} from "./rental-order-service.constants";
import type { IRentalOrderTransactionRunner } from "./rental-order-transaction.runner";

export class ReserveRentalOrderService {
  constructor(
    private readonly transactionRunner: IRentalOrderTransactionRunner,
  ) {}

  async execute(
    params: RentalOrderIdParamInput,
    input: ReserveRentalOrderInput,
  ): Promise<RentalOrderDto> {
    const { id } = parseRequest(RentalOrderIdParamSchema, params);
    const data = parseRequest(ReserveRentalOrderSchema, input);

    return this.transactionRunner.run(
      async ({
        rentalOrderRepository,
        inventoryRepository,
        stockMovementRepository,
        auditLogger,
        userId,
      }) => {
        if (userId === undefined) {
          throw new UnauthorizedError({
            message: "User context is required to reserve rental order",
          });
        }

        const existing = await rentalOrderRepository.findById(
          toRentalOrderId(id),
        );

        if (existing === null) {
          throw new NotFoundError({
            message: "Rental order not found",
            details: { id },
          });
        }

        let reservedOrder;

        try {
          reservedOrder = existing.withReserved(
            data.items.map((item) => ({
              productId: toProductId(item.productId),
              quantity: item.quantity,
            })),
          );
        } catch (error) {
          if (
            error instanceof RentalOrderInvalidStatusError ||
            error instanceof RentalOrderInvalidReserveError
          ) {
            throw new UnprocessableError({
              message: error.message,
              details:
                error instanceof RentalOrderInvalidReserveError &&
                error.productId !== undefined
                  ? { productId: error.productId }
                  : undefined,
            });
          }

          throw error;
        }

        const previousValues = toRentalOrderAuditValues(existing);
        const updated = await rentalOrderRepository.updateReserve(
          existing.id,
          {
            status: reservedOrder.status,
            items: reservedOrder.items.map((item) => ({
              id: item.id,
              reservedQuantity: item.reservedQuantity,
            })),
          },
        );

        for (const reserveItem of data.items) {
          const inventory = await inventoryRepository.findByProductAndWarehouse(
            toProductId(reserveItem.productId),
            existing.warehouseId,
          );

          if (inventory === null) {
            throw new NotFoundError({
              message: "Inventory not found for product and warehouse",
              details: {
                productId: reserveItem.productId,
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
              movementType: "RESERVE",
              quantity: reserveItem.quantity,
              referenceType: RENTAL_ORDER_REFERENCE_TYPE,
              referenceId: existing.id,
              remarks: `Reserved for rental order ${existing.orderNumber}`,
            },
          );
        }

        await auditLogger.log({
          module: RENTAL_ORDER_MODULE,
          entityName: RENTAL_ORDER_ENTITY_NAME,
          recordId: updated.id,
          action: "UPDATE",
          status: "SUCCESS",
          oldValues: previousValues,
          newValues: toRentalOrderAuditValues(updated),
        });

        return toRentalOrderDto(updated);
      },
    );
  }
}
