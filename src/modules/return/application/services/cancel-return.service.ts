import { ReturnInvalidStatusError } from "@/modules/return/domain";
import { parseRequest } from "@/shared/application/validation";
import {
  NotFoundError,
  UnprocessableError,
} from "@/shared/infrastructure/errors";

import type { ReturnDto } from "../dtos/return.dto";
import { toReturnDto, toReturnId } from "../mappers/return.mapper";
import {
  ReturnIdParamSchema,
  type ReturnIdParamInput,
} from "../schemas/return.schemas";
import { toReturnAuditValues } from "./return-audit.mapper";
import {
  RETURN_ENTITY_NAME,
  RETURN_MODULE,
} from "./return-service.constants";
import type { IReturnTransactionRunner } from "./return-transaction.runner";

export class CancelReturnService {
  constructor(
    private readonly transactionRunner: IReturnTransactionRunner,
  ) {}

  async execute(params: ReturnIdParamInput): Promise<ReturnDto> {
    const { id } = parseRequest(ReturnIdParamSchema, params);

    return this.transactionRunner.run(async ({ returnRepository, auditLogger }) => {
      const existing = await returnRepository.findById(toReturnId(id));

      if (existing === null) {
        throw new NotFoundError({
          message: "Return not found",
          details: { id },
        });
      }

      let cancelled;

      try {
        cancelled = existing.withCancelled();
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

      const previousValues = toReturnAuditValues(existing);
      const updated = await returnRepository.updateStatus(existing.id, {
        status: cancelled.status,
      });

      await auditLogger.log({
        module: RETURN_MODULE,
        entityName: RETURN_ENTITY_NAME,
        recordId: updated.id,
        action: "CANCEL",
        status: "SUCCESS",
        oldValues: previousValues,
        newValues: toReturnAuditValues(updated),
      });

      return toReturnDto(updated);
    });
  }
}
