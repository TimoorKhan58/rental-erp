import { RentalOrder } from "@/modules/rental-order/domain/rental-order.entity";
import { RentalOrderInvariantError } from "@/modules/rental-order/domain/rental-order.errors";
import { parseRequest } from "@/shared/application/validation";
import {
  ConflictError,
  UnauthorizedError,
  UnprocessableError,
} from "@/shared/infrastructure/errors";

import type { RentalOrderDto } from "../dtos/rental-order.dto";
import {
  toCreateRentalOrderData,
  toRentalOrderDto,
  toUserId,
} from "../mappers/rental-order.mapper";
import {
  CreateRentalOrderSchema,
  type CreateRentalOrderInput,
} from "../schemas/rental-order.schemas";
import { toRentalOrderAuditValues } from "./rental-order-audit.mapper";
import {
  RENTAL_ORDER_ENTITY_NAME,
  RENTAL_ORDER_MODULE,
} from "./rental-order-service.constants";
import type { IRentalOrderTransactionRunner } from "./rental-order-transaction.runner";

export class CreateRentalOrderService {
  constructor(
    private readonly transactionRunner: IRentalOrderTransactionRunner,
  ) {}

  async execute(input: CreateRentalOrderInput): Promise<RentalOrderDto> {
    const data = parseRequest(CreateRentalOrderSchema, input);

    return this.transactionRunner.run(
      async ({ rentalOrderRepository, auditLogger, userId }) => {
        if (userId === undefined) {
          throw new UnauthorizedError({
            message: "User context is required to create rental order",
          });
        }

        const createData = toCreateRentalOrderData(data, toUserId(userId));

        try {
          RentalOrder.create(createData);
        } catch (error) {
          if (error instanceof RentalOrderInvariantError) {
            throw new UnprocessableError({
              message: error.message,
              details: { field: error.field },
            });
          }

          throw error;
        }

        const existing = await rentalOrderRepository.findByOrderNumber(
          createData.orderNumber,
        );

        if (existing !== null) {
          throw new ConflictError({
            message: "Order number already exists",
            details: { orderNumber: createData.orderNumber },
          });
        }

        const order = await rentalOrderRepository.create(createData);

        await auditLogger.log({
          module: RENTAL_ORDER_MODULE,
          entityName: RENTAL_ORDER_ENTITY_NAME,
          recordId: order.id,
          action: "CREATE",
          status: "SUCCESS",
          newValues: toRentalOrderAuditValues(order),
        });

        return toRentalOrderDto(order);
      },
    );
  }
}
