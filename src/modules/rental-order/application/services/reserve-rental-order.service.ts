import { RENTAL_ORDER_REFERENCE_TYPE } from "@/modules/rental-order/domain/rental-order.constants";
import {
  RentalOrderInvalidReserveError,
  RentalOrderInvalidStatusError,
  RentalOrderInvariantError,
} from "@/modules/rental-order/domain/rental-order.errors";
import { assertValidAvailabilityPeriod } from "@/modules/rental-order/domain/rental-order.availability.rules";
import { executeCreateStockMovementInScope } from "@/modules/stock-movement/application/services/create-stock-movement-in-scope";
import { parseRequest } from "@/shared/application/validation";
import type { ProductId } from "@/shared/domain/ids";
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
import { GetDateAwareAvailabilityService } from "./get-date-aware-availability.service";
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

        // Aggregate requested deltas by product (reserve input is incremental).
        const deltaByProduct = new Map<string, number>();
        for (const reserveItem of data.items) {
          const productId = reserveItem.productId;
          deltaByProduct.set(
            productId,
            (deltaByProduct.get(productId) ?? 0) + reserveItem.quantity,
          );
        }

        // Date-aware capacity checks must complete before any mutation.
        const availabilityService = new GetDateAwareAvailabilityService(
          rentalOrderRepository,
          inventoryRepository,
        );

        for (const [productId, deltaQuantity] of deltaByProduct) {
          const orderItem = existing.items.find(
            (item) => item.productId === productId,
          );

          if (orderItem === undefined) {
            throw new UnprocessableError({
              message: "Reserve item does not exist on rental order",
              details: { productId },
            });
          }

          try {
            assertValidAvailabilityPeriod({
              startDate: orderItem.startDate,
              endDate: orderItem.endDate,
            });
          } catch (error) {
            if (error instanceof RentalOrderInvariantError) {
              throw new UnprocessableError({
                message: error.message,
                details: { productId, field: error.field },
              });
            }

            throw error;
          }

          const availability = await availabilityService.execute({
            productId,
            warehouseId: existing.warehouseId,
            startDate: orderItem.startDate,
            endDate: orderItem.endDate,
            excludeRentalOrderId: existing.id,
          });

          if (deltaQuantity > availability.dateAwareAvailableQuantity) {
            throw new UnprocessableError({
              message:
                "Insufficient date-aware availability for the requested rental period",
              details: {
                productId,
                warehouseId: existing.warehouseId,
                requestedQuantity: deltaQuantity,
                dateAwareAvailableQuantity:
                  availability.dateAwareAvailableQuantity,
                dateAwareCommittedQuantity:
                  availability.dateAwareCommittedQuantity,
                startDate: orderItem.startDate.toISOString(),
                endDate: orderItem.endDate.toISOString(),
              },
            });
          }
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

        if (updated === null) {
          throw new UnprocessableError({
            message: "Rental order cannot be reserved",
            details: {
              currentStatus: existing.status,
              action: "reserve",
            },
          });
        }

        // Resolve inventory rows first, then reserve in deterministic id order
        // to reduce deadlock risk when concurrent orders touch the same SKUs.
        const reserveTargets: Array<{
          inventoryId: string;
          quantity: number;
          productId: ProductId;
        }> = [];

        for (const reserveItem of data.items) {
          const inventory =
            await inventoryRepository.findByProductAndWarehouse(
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

          reserveTargets.push({
            inventoryId: inventory.id,
            quantity: reserveItem.quantity,
            productId: toProductId(reserveItem.productId),
          });
        }

        reserveTargets.sort((left, right) =>
          left.inventoryId.localeCompare(right.inventoryId),
        );

        for (const target of reserveTargets) {
          await executeCreateStockMovementInScope(
            {
              stockMovementRepository,
              inventoryRepository,
              auditLogger,
              userId,
            },
            {
              inventoryId: target.inventoryId,
              movementType: "RESERVE",
              quantity: target.quantity,
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
