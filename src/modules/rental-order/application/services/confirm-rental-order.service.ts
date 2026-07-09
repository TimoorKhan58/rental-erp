import { RentalOrderInvalidStatusError } from "@/modules/rental-order/domain/rental-order.errors";
import { parseRequest } from "@/shared/application/validation";
import {
  NotFoundError,
  UnprocessableError,
} from "@/shared/infrastructure/errors";

import type { RentalOrderDto } from "../dtos/rental-order.dto";
import {
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

export class ConfirmRentalOrderService {
  constructor(
    private readonly transactionRunner: IRentalOrderTransactionRunner,
  ) {}

  async execute(params: RentalOrderIdParamInput): Promise<RentalOrderDto> {
    const { id } = parseRequest(RentalOrderIdParamSchema, params);

    return this.transactionRunner.run(async ({ rentalOrderRepository, auditLogger }) => {
      const existing = await rentalOrderRepository.findById(toRentalOrderId(id));

      if (existing === null) {
        throw new NotFoundError({
          message: "Rental order not found",
          details: { id },
        });
      }

      let confirmed;

      try {
        confirmed = existing.withConfirmed();
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
      const updated = await rentalOrderRepository.updateStatus(
        existing.id,
        confirmed.status,
      );

      await auditLogger.log({
        module: RENTAL_ORDER_MODULE,
        entityName: RENTAL_ORDER_ENTITY_NAME,
        recordId: updated.id,
        action: "APPROVE",
        status: "SUCCESS",
        oldValues: previousValues,
        newValues: toRentalOrderAuditValues(updated),
      });

      return toRentalOrderDto(updated);
    });
  }
}
