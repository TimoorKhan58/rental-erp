import {
  RepairInvalidStatusError,
  RepairInvariantError,
  validateRepairCost,
  validateRepairQuantity,
} from "@/modules/repair/domain";
import { parseRequest } from "@/shared/application/validation";
import {
  NotFoundError,
  UnprocessableError,
} from "@/shared/infrastructure/errors";

import type { RepairDto } from "../dtos/repair.dto";
import {
  toRepairDto,
  toRepairId,
  toUpdateRepairData,
} from "../mappers/repair.mapper";
import {
  RepairIdParamSchema,
  UpdateRepairSchema,
  type RepairIdParamInput,
  type UpdateRepairInput,
} from "../schemas/repair.schemas";
import { toRepairAuditValues } from "./repair-audit.mapper";
import {
  loadPriorRepairsForReturn,
  validateRepairAgainstReturnItem,
} from "./repair-return.validation";
import {
  REPAIR_ENTITY_NAME,
  REPAIR_MODULE,
} from "./repair-service.constants";
import type { IRepairTransactionRunner } from "./repair-transaction.runner";

export class UpdateRepairService {
  constructor(
    private readonly transactionRunner: IRepairTransactionRunner,
  ) {}

  async execute(
    params: RepairIdParamInput,
    input: UpdateRepairInput,
  ): Promise<RepairDto> {
    const { id } = parseRequest(RepairIdParamSchema, params);
    const data = parseRequest(UpdateRepairSchema, input);
    const updateData = toUpdateRepairData(data);

    if (updateData.quantity !== undefined) {
      try {
        validateRepairQuantity(updateData.quantity);
      } catch (error) {
        if (error instanceof RepairInvariantError) {
          throw new UnprocessableError({
            message: error.message,
            details: { field: error.field },
          });
        }

        throw error;
      }
    }

    if (updateData.repairCost !== undefined) {
      try {
        validateRepairCost(updateData.repairCost);
      } catch (error) {
        if (error instanceof RepairInvariantError) {
          throw new UnprocessableError({
            message: error.message,
            details: { field: error.field },
          });
        }

        throw error;
      }
    }

    return this.transactionRunner.run(
      async ({ repairRepository, returnRepository, auditLogger }) => {
        const existing = await repairRepository.findById(toRepairId(id));

        if (existing === null) {
          throw new NotFoundError({
            message: "Repair not found",
            details: { id },
          });
        }

        try {
          existing.withUpdated(updateData);
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

          if (error instanceof RepairInvariantError) {
            throw new UnprocessableError({
              message: error.message,
              details: { field: error.field },
            });
          }

          throw error;
        }

        if (updateData.quantity !== undefined) {
          const returnRecord = await returnRepository.findById(existing.returnId);

          if (returnRecord === null) {
            throw new NotFoundError({
              message: "Return not found",
              details: { returnId: existing.returnId },
            });
          }

          const priorRepairs = await loadPriorRepairsForReturn(
            repairRepository,
            existing.returnId,
          );

          validateRepairAgainstReturnItem(
            returnRecord,
            existing.returnItemId,
            existing.productId,
            existing.warehouseId,
            updateData.quantity,
            priorRepairs,
            existing.id,
          );
        }

        const previousValues = toRepairAuditValues(existing);
        const updated = await repairRepository.update(existing.id, updateData);

        await auditLogger.log({
          module: REPAIR_MODULE,
          entityName: REPAIR_ENTITY_NAME,
          recordId: updated.id,
          action: "UPDATE",
          status: "SUCCESS",
          oldValues: previousValues,
          newValues: toRepairAuditValues(updated),
        });

        return toRepairDto(updated);
      },
    );
  }
}
