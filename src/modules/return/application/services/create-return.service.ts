import { Return } from "@/modules/return/domain";
import { ReturnInvariantError } from "@/modules/return/domain";
import { parseRequest } from "@/shared/application/validation";
import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
  UnprocessableError,
} from "@/shared/infrastructure/errors";

import type { ReturnDto } from "../dtos/return.dto";
import {
  toCreateReturnData,
  toDispatchId,
  toReturnDto,
  toRentalOrderId,
  toUserId,
} from "../mappers/return.mapper";
import {
  CreateReturnSchema,
  type CreateReturnInput,
} from "../schemas/return.schemas";
import { toReturnAuditValues } from "./return-audit.mapper";
import {
  loadPriorReturnsForDispatch,
  validateDispatchForReturn,
  validateReturnItemsForDispatch,
} from "./return-dispatch.validation";
import {
  RETURN_ENTITY_NAME,
  RETURN_MODULE,
} from "./return-service.constants";
import type { IReturnTransactionRunner } from "./return-transaction.runner";

export class CreateReturnService {
  constructor(
    private readonly transactionRunner: IReturnTransactionRunner,
  ) {}

  async execute(input: CreateReturnInput): Promise<ReturnDto> {
    const data = parseRequest(CreateReturnSchema, input);

    return this.transactionRunner.run(
      async ({
        returnRepository,
        dispatchRepository,
        rentalOrderRepository,
        auditLogger,
        userId,
      }) => {
        if (userId === undefined) {
          throw new UnauthorizedError({
            message: "User context is required to create return",
          });
        }

        const createData = toCreateReturnData(data, toUserId(userId));

        try {
          Return.create(createData);
        } catch (error) {
          if (error instanceof ReturnInvariantError) {
            throw new UnprocessableError({
              message: error.message,
              details: { field: error.field },
            });
          }

          throw error;
        }

        const dispatch = await dispatchRepository.findById(
          toDispatchId(data.dispatchId),
        );

        if (dispatch === null) {
          throw new NotFoundError({
            message: "Dispatch not found",
            details: { dispatchId: data.dispatchId },
          });
        }

        validateDispatchForReturn(dispatch);

        if (dispatch.rentalOrderId !== toRentalOrderId(data.rentalOrderId)) {
          throw new UnprocessableError({
            message: "Dispatch does not belong to rental order",
          });
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

        const priorReturns = await loadPriorReturnsForDispatch(
          returnRepository,
          dispatch.id,
        );

        validateReturnItemsForDispatch(
          createData.items,
          dispatch,
          priorReturns,
        );

        const existing = await returnRepository.findByReturnNumber(
          createData.returnNumber,
        );

        if (existing !== null) {
          throw new ConflictError({
            message: "Return number already exists",
            details: { returnNumber: createData.returnNumber },
          });
        }

        const returnRecord = await returnRepository.create(createData);

        await auditLogger.log({
          module: RETURN_MODULE,
          entityName: RETURN_ENTITY_NAME,
          recordId: returnRecord.id,
          action: "CREATE",
          status: "SUCCESS",
          newValues: toReturnAuditValues(returnRecord),
        });

        return toReturnDto(returnRecord);
      },
    );
  }
}
