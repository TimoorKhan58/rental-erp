import { DispatchInvalidStatusError } from "@/modules/dispatch/domain";
import { parseRequest } from "@/shared/application/validation";
import {
  NotFoundError,
  UnprocessableError,
} from "@/shared/infrastructure/errors";

import type { DispatchDto } from "../dtos/dispatch.dto";
import { toDispatchDto, toDispatchId } from "../mappers/dispatch.mapper";
import {
  DispatchIdParamSchema,
  type DispatchIdParamInput,
} from "../schemas/dispatch.schemas";
import { toDispatchAuditValues } from "./dispatch-audit.mapper";
import {
  DISPATCH_ENTITY_NAME,
  DISPATCH_MODULE,
} from "./dispatch-service.constants";
import type { IDispatchTransactionRunner } from "./dispatch-transaction.runner";

export class CancelDispatchService {
  constructor(
    private readonly transactionRunner: IDispatchTransactionRunner,
  ) {}

  async execute(params: DispatchIdParamInput): Promise<DispatchDto> {
    const { id } = parseRequest(DispatchIdParamSchema, params);

    return this.transactionRunner.run(async ({ dispatchRepository, auditLogger }) => {
      const existing = await dispatchRepository.findById(toDispatchId(id));

      if (existing === null) {
        throw new NotFoundError({
          message: "Dispatch not found",
          details: { id },
        });
      }

      let cancelled;

      try {
        cancelled = existing.withCancelled();
      } catch (error) {
        if (error instanceof DispatchInvalidStatusError) {
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

      const previousValues = toDispatchAuditValues(existing);
      const updated = await dispatchRepository.updateStatus(
        existing.id,
        cancelled.status,
      );

      await auditLogger.log({
        module: DISPATCH_MODULE,
        entityName: DISPATCH_ENTITY_NAME,
        recordId: updated.id,
        action: "CANCEL",
        status: "SUCCESS",
        oldValues: previousValues,
        newValues: toDispatchAuditValues(updated),
      });

      return toDispatchDto(updated);
    });
  }
}
