import {
  ReturnInvalidStatusError,
  ReturnInvariantError,
  validateReturnItems,
} from "@/modules/return/domain";
import { parseRequest } from "@/shared/application/validation";
import {
  NotFoundError,
  UnprocessableError,
} from "@/shared/infrastructure/errors";

import type { ReturnDto } from "../dtos/return.dto";
import {
  toDispatchId,
  toReturnDto,
  toReturnId,
  toUpdateReturnData,
} from "../mappers/return.mapper";
import {
  ReturnIdParamSchema,
  UpdateReturnSchema,
  type ReturnIdParamInput,
  type UpdateReturnInput,
} from "../schemas/return.schemas";
import { toReturnAuditValues } from "./return-audit.mapper";
import {
  loadPriorReturnsForDispatch,
  validateReturnItemsForDispatch,
} from "./return-dispatch.validation";
import {
  RETURN_ENTITY_NAME,
  RETURN_MODULE,
} from "./return-service.constants";
import type { IReturnTransactionRunner } from "./return-transaction.runner";

export class UpdateReturnService {
  constructor(
    private readonly transactionRunner: IReturnTransactionRunner,
  ) {}

  async execute(
    params: ReturnIdParamInput,
    input: UpdateReturnInput,
  ): Promise<ReturnDto> {
    const { id } = parseRequest(ReturnIdParamSchema, params);
    const data = parseRequest(UpdateReturnSchema, input);
    const updateData = toUpdateReturnData(data);

    if (updateData.items !== undefined) {
      try {
        validateReturnItems(updateData.items);
      } catch (error) {
        if (error instanceof ReturnInvariantError) {
          throw new UnprocessableError({
            message: error.message,
            details: { field: error.field },
          });
        }

        throw error;
      }
    }

    return this.transactionRunner.run(
      async ({ returnRepository, dispatchRepository, auditLogger }) => {
        const existing = await returnRepository.findById(toReturnId(id));

        if (existing === null) {
          throw new NotFoundError({
            message: "Return not found",
            details: { id },
          });
        }

        try {
          existing.assertCanUpdate();
        } catch (error) {
          if (error instanceof ReturnInvalidStatusError) {
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

        if (updateData.items !== undefined) {
          const dispatch = await dispatchRepository.findById(
            toDispatchId(existing.dispatchId),
          );

          if (dispatch === null) {
            throw new NotFoundError({
              message: "Dispatch not found",
              details: { dispatchId: existing.dispatchId },
            });
          }

          const priorReturns = await loadPriorReturnsForDispatch(
            returnRepository,
            dispatch.id,
          );

          validateReturnItemsForDispatch(
            updateData.items,
            dispatch,
            priorReturns,
            existing.id,
          );
        }

        const previousValues = toReturnAuditValues(existing);
        const updated = await returnRepository.update(existing.id, updateData);

        await auditLogger.log({
          module: RETURN_MODULE,
          entityName: RETURN_ENTITY_NAME,
          recordId: updated.id,
          action: "UPDATE",
          status: "SUCCESS",
          oldValues: previousValues,
          newValues: toReturnAuditValues(updated),
        });

        return toReturnDto(updated);
      },
    );
  }
}
