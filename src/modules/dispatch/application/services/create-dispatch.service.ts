import { Dispatch } from "@/modules/dispatch/domain";
import {
  DispatchInvariantError,
} from "@/modules/dispatch/domain";
import { parseRequest } from "@/shared/application/validation";
import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
  UnprocessableError,
} from "@/shared/infrastructure/errors";

import type { DispatchDto } from "../dtos/dispatch.dto";
import {
  toCreateDispatchData,
  toDispatchDto,
  toRentalOrderId,
  toUserId,
} from "../mappers/dispatch.mapper";
import {
  CreateDispatchSchema,
  type CreateDispatchInput,
} from "../schemas/dispatch.schemas";
import { toDispatchAuditValues } from "./dispatch-audit.mapper";
import { validateRentalOrderForDispatch } from "./dispatch-rental-order.validation";
import {
  DISPATCH_ENTITY_NAME,
  DISPATCH_MODULE,
} from "./dispatch-service.constants";
import type { IDispatchTransactionRunner } from "./dispatch-transaction.runner";

export class CreateDispatchService {
  constructor(
    private readonly transactionRunner: IDispatchTransactionRunner,
  ) {}

  async execute(input: CreateDispatchInput): Promise<DispatchDto> {
    const data = parseRequest(CreateDispatchSchema, input);

    return this.transactionRunner.run(
      async ({
        dispatchRepository,
        rentalOrderRepository,
        auditLogger,
        userId,
      }) => {
        if (userId === undefined) {
          throw new UnauthorizedError({
            message: "User context is required to create dispatch",
          });
        }

        const createData = toCreateDispatchData(data, toUserId(userId));

        try {
          Dispatch.create(createData);
        } catch (error) {
          if (error instanceof DispatchInvariantError) {
            throw new UnprocessableError({
              message: error.message,
              details: { field: error.field },
            });
          }

          throw error;
        }

        const rentalOrder = await rentalOrderRepository.findById(
          toRentalOrderId(data.rentalOrderId),
        );

        if (rentalOrder === null) {
          throw new NotFoundError({
            message: "Rental order not found",
            details: { rentalOrderId: data.rentalOrderId },
          });
        }

        validateRentalOrderForDispatch(rentalOrder, createData.items);

        const existing = await dispatchRepository.findByDispatchNumber(
          createData.dispatchNumber,
        );

        if (existing !== null) {
          throw new ConflictError({
            message: "Dispatch number already exists",
            details: { dispatchNumber: createData.dispatchNumber },
          });
        }

        const dispatch = await dispatchRepository.create(createData);

        await auditLogger.log({
          module: DISPATCH_MODULE,
          entityName: DISPATCH_ENTITY_NAME,
          recordId: dispatch.id,
          action: "CREATE",
          status: "SUCCESS",
          newValues: toDispatchAuditValues(dispatch),
        });

        return toDispatchDto(dispatch);
      },
    );
  }
}
