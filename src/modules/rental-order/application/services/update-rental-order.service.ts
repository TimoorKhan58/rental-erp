import {
  RentalOrderInvalidStatusError,
  RentalOrderInvariantError,
} from "@/modules/rental-order/domain/rental-order.errors";
import { validateRentalOrderItems } from "@/modules/rental-order/domain/rental-order.rules";
import { parseRequest } from "@/shared/application/validation";
import {
  NotFoundError,
  UnprocessableError,
} from "@/shared/infrastructure/errors";

import type { RentalOrderDto } from "../dtos/rental-order.dto";
import {
  toRentalOrderDto,
  toRentalOrderId,
  toUpdateRentalOrderData,
} from "../mappers/rental-order.mapper";
import {
  RentalOrderIdParamSchema,
  UpdateRentalOrderSchema,
  type RentalOrderIdParamInput,
  type UpdateRentalOrderInput,
} from "../schemas/rental-order.schemas";
import { toRentalOrderAuditValues } from "./rental-order-audit.mapper";
import {
  RENTAL_ORDER_ENTITY_NAME,
  RENTAL_ORDER_MODULE,
} from "./rental-order-service.constants";
import type { IRentalOrderTransactionRunner } from "./rental-order-transaction.runner";

export class UpdateRentalOrderService {
  constructor(
    private readonly transactionRunner: IRentalOrderTransactionRunner,
  ) {}

  async execute(
    params: RentalOrderIdParamInput,
    input: UpdateRentalOrderInput,
  ): Promise<RentalOrderDto> {
    const { id } = parseRequest(RentalOrderIdParamSchema, params);
    const data = parseRequest(UpdateRentalOrderSchema, input);
    const updateData = toUpdateRentalOrderData(data);

    if (updateData.items !== undefined) {
      try {
        validateRentalOrderItems(updateData.items);
      } catch (error) {
        if (error instanceof RentalOrderInvariantError) {
          throw new UnprocessableError({
            message: error.message,
            details: { field: error.field },
          });
        }

        throw error;
      }
    }

    return this.transactionRunner.run(async ({ rentalOrderRepository, auditLogger }) => {
      const existing = await rentalOrderRepository.findById(toRentalOrderId(id));

      if (existing === null) {
        throw new NotFoundError({
          message: "Rental order not found",
          details: { id },
        });
      }

      try {
        existing.assertCanUpdate();
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

      const previousValues = toRentalOrderAuditValues(existing);
      const updated = await rentalOrderRepository.update(existing.id, updateData);

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
    });
  }
}
