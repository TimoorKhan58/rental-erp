import { REPAIR_REFERENCE_TYPE } from "@/modules/repair/domain";
import { RepairInvalidStatusError } from "@/modules/repair/domain";
import { executeCreateStockMovementInScope } from "@/modules/stock-movement/application/services/create-stock-movement-in-scope";
import { parseRequest } from "@/shared/application/validation";
import {
  NotFoundError,
  UnauthorizedError,
  UnprocessableError,
} from "@/shared/infrastructure/errors";

import type { RepairDto } from "../dtos/repair.dto";
import { toProductId, toRepairDto, toRepairId } from "../mappers/repair.mapper";
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

export class CompleteRepairService {
  constructor(
    private readonly transactionRunner: IRepairTransactionRunner,
  ) {}

  async execute(params: RepairIdParamInput): Promise<RepairDto> {
    const { id } = parseRequest(RepairIdParamSchema, params);

    return this.transactionRunner.run(
      async ({
        repairRepository,
        inventoryRepository,
        stockMovementRepository,
        auditLogger,
        userId,
      }) => {
        if (userId === undefined) {
          throw new UnauthorizedError({
            message: "User context is required to complete repair",
          });
        }

        const existing = await repairRepository.findById(toRepairId(id));

        if (existing === null) {
          throw new NotFoundError({
            message: "Repair not found",
            details: { id },
          });
        }

        let completed;

        try {
          completed = existing.withCompleted();
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

        const inventory = await inventoryRepository.findByProductAndWarehouse(
          toProductId(existing.productId),
          existing.warehouseId,
        );

        if (inventory === null) {
          throw new NotFoundError({
            message: "Inventory not found for product and warehouse",
            details: {
              productId: existing.productId,
              warehouseId: existing.warehouseId,
            },
          });
        }

        await executeCreateStockMovementInScope(
          {
            stockMovementRepository,
            inventoryRepository,
            auditLogger,
            userId,
          },
          {
            inventoryId: inventory.id,
            movementType: "IN",
            quantity: existing.quantity,
            referenceType: REPAIR_REFERENCE_TYPE,
            referenceId: existing.id,
            remarks: `Repaired ${existing.quantity} unit(s) for repair ${existing.repairNumber}`,
          },
        );

        const updated = await repairRepository.updateStatus(existing.id, {
          status: completed.status,
          completedAt: completed.completedAt,
        });

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
