import {
  ReturnInvalidItemError,
  ReturnInvalidStatusError,
} from "@/modules/return/domain";
import { parseRequest } from "@/shared/application/validation";
import {
  NotFoundError,
  UnprocessableError,
} from "@/shared/infrastructure/errors";

import type { ReturnDto } from "../dtos/return.dto";
import {
  toInspectReturnItems,
  toReturnDto,
  toReturnId,
} from "../mappers/return.mapper";
import {
  InspectReturnSchema,
  ReturnIdParamSchema,
  type InspectReturnInput,
  type ReturnIdParamInput,
} from "../schemas/return.schemas";
import { toReturnAuditValues } from "./return-audit.mapper";
import {
  RETURN_ENTITY_NAME,
  RETURN_MODULE,
} from "./return-service.constants";
import type { IReturnTransactionRunner } from "./return-transaction.runner";

export class InspectReturnService {
  constructor(
    private readonly transactionRunner: IReturnTransactionRunner,
  ) {}

  async execute(
    params: ReturnIdParamInput,
    input: InspectReturnInput,
  ): Promise<ReturnDto> {
    const { id } = parseRequest(ReturnIdParamSchema, params);
    const data = parseRequest(InspectReturnSchema, input);
    const inspectItems = toInspectReturnItems(data);

    return this.transactionRunner.run(async ({ returnRepository, auditLogger }) => {
      const existing = await returnRepository.findById(toReturnId(id));

      if (existing === null) {
        throw new NotFoundError({
          message: "Return not found",
          details: { id },
        });
      }

      let inspected;

      try {
        inspected = existing.withInspected(inspectItems);
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

        if (error instanceof ReturnInvalidItemError) {
          throw new UnprocessableError({
            message: error.message,
            details:
              error.rentalOrderItemId !== undefined
                ? { rentalOrderItemId: error.rentalOrderItemId }
                : undefined,
          });
        }

        throw error;
      }

      const previousValues = toReturnAuditValues(existing);
      const updated = await returnRepository.updateStatus(existing.id, {
        status: inspected.status,
        inspectedAt: inspected.inspectedAt,
        items: inspected.items,
      });

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
    });
  }
}
