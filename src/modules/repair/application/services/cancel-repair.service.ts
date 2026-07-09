import { RepairInvalidStatusError } from "@/modules/repair/domain";
import { parseRequest } from "@/shared/application/validation";
import {
  NotFoundError,
  UnprocessableError,
} from "@/shared/infrastructure/errors";

import type { RepairDto } from "../dtos/repair.dto";
import { toRepairDto, toRepairId } from "../mappers/repair.mapper";
import {
  RepairIdParamSchema,
  type RepairIdParamInput,
} from "../schemas/repair.schemas";
import { toRepairAuditValues } from "./repair-audit.mapper";
import {
  REPAIR_ENTITY_NAME,
  REPAIR_MODULE,
} from "./repair-service.constants";
import type { IRepairTransactionRunner } from "./repair-transaction.runner";

export class CancelRepairService {
  constructor(
    private readonly transactionRunner: IRepairTransactionRunner,
  ) {}

  async execute(params: RepairIdParamInput): Promise<RepairDto> {
    const { id } = parseRequest(RepairIdParamSchema, params);

    return this.transactionRunner.run(async ({ repairRepository, auditLogger }) => {
      const existing = await repairRepository.findById(toRepairId(id));

      if (existing === null) {
        throw new NotFoundError({
          message: "Repair not found",
          details: { id },
        });
      }

      let cancelled;

      try {
        cancelled = existing.withCancelled();
      } catch (error) {
        if (error instanceof RepairInvalidStatusError) {
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

      const previousValues = toRepairAuditValues(existing);
      const updated = await repairRepository.updateStatus(existing.id, {
        status: cancelled.status,
      });

      await auditLogger.log({
        module: REPAIR_MODULE,
        entityName: REPAIR_ENTITY_NAME,
        recordId: updated.id,
        action: "CANCEL",
        status: "SUCCESS",
        oldValues: previousValues,
        newValues: toRepairAuditValues(updated),
      });

      return toRepairDto(updated);
    });
  }
}
