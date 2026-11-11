import { ReturnInvalidStatusError } from "@/modules/return/domain";
import { parseRequest } from "@/shared/application/validation";
import {
  ConcurrentUpdateError,
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

export class ReceiveReturnService {
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

      let received;

      try {
        received = existing.withReceived();
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

      const claimed = await returnRepository.claimStatusTransition(
        existing.id,
        "DRAFT",
        {
          status: received.status,
          receivedAt: received.receivedAt,
        },
      );

      if (claimed === null) {
        throw new ConcurrentUpdateError({
          entity: RETURN_ENTITY_NAME,
          id: existing.id,
          expectedStatus: "DRAFT",
          action: "receive",
        });
      }

      await auditLogger.log({
        module: RETURN_MODULE,
        entityName: RETURN_ENTITY_NAME,
        recordId: claimed.id,
        action: "UPDATE",
        status: "SUCCESS",
        oldValues: previousValues,
        newValues: toReturnAuditValues(claimed),
      });

      return toReturnDto(claimed);
    });
  }
}
