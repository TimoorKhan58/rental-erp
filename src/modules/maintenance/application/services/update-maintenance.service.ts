import {
  MaintenanceInvalidStatusError,
  MaintenanceInvariantError,
  validateMaintenanceCost,
  validateMaintenanceQuantity,
} from "@/modules/maintenance/domain";
import { parseRequest } from "@/shared/application/validation";
import {
  NotFoundError,
  UnprocessableError,
} from "@/shared/infrastructure/errors";

import type { MaintenanceDto } from "../dtos/maintenance.dto";
import {
  toMaintenanceDto,
  toMaintenanceId,
  toUpdateMaintenanceData,
} from "../mappers/maintenance.mapper";
import {
  MaintenanceIdParamSchema,
  UpdateMaintenanceSchema,
  type MaintenanceIdParamInput,
  type UpdateMaintenanceInput,
} from "../schemas/maintenance.schemas";
import { toMaintenanceAuditValues } from "./maintenance-audit.mapper";
import { validateInventoryForMaintenance } from "./maintenance-inventory.validation";
import {
  MAINTENANCE_ENTITY_NAME,
  MAINTENANCE_MODULE,
} from "./maintenance-service.constants";
import type { IMaintenanceTransactionRunner } from "./maintenance-transaction.runner";

export class UpdateMaintenanceService {
  constructor(
    private readonly transactionRunner: IMaintenanceTransactionRunner,
  ) {}

  async execute(
    params: MaintenanceIdParamInput,
    input: UpdateMaintenanceInput,
  ): Promise<MaintenanceDto> {
    const { id } = parseRequest(MaintenanceIdParamSchema, params);
    const data = parseRequest(UpdateMaintenanceSchema, input);
    const updateData = toUpdateMaintenanceData(data);

    if (updateData.quantity !== undefined) {
      try {
        validateMaintenanceQuantity(updateData.quantity);
      } catch (error) {
        if (error instanceof MaintenanceInvariantError) {
          throw new UnprocessableError({
            message: error.message,
            details: { field: error.field },
          });
        }

        throw error;
      }
    }

    if (updateData.estimatedCost !== undefined) {
      try {
        validateMaintenanceCost(updateData.estimatedCost, "estimatedCost");
      } catch (error) {
        if (error instanceof MaintenanceInvariantError) {
          throw new UnprocessableError({
            message: error.message,
            details: { field: error.field },
          });
        }

        throw error;
      }
    }

    if (updateData.actualCost !== undefined) {
      try {
        validateMaintenanceCost(updateData.actualCost, "actualCost");
      } catch (error) {
        if (error instanceof MaintenanceInvariantError) {
          throw new UnprocessableError({
            message: error.message,
            details: { field: error.field },
          });
        }

        throw error;
      }
    }

    return this.transactionRunner.run(
      async ({ maintenanceRepository, inventoryRepository, auditLogger }) => {
        const existing = await maintenanceRepository.findById(toMaintenanceId(id));

        if (existing === null) {
          throw new NotFoundError({
            message: "Maintenance not found",
            details: { id },
          });
        }

        try {
          existing.withUpdated(updateData);
        } catch (error) {
          if (error instanceof MaintenanceInvalidStatusError) {
            throw new UnprocessableError({
              message: error.message,
              details: {
                currentStatus: error.currentStatus,
                action: error.action,
              },
            });
          }

          if (error instanceof MaintenanceInvariantError) {
            throw new UnprocessableError({
              message: error.message,
              details: { field: error.field },
            });
          }

          throw error;
        }

        if (updateData.quantity !== undefined) {
          const inventory = await inventoryRepository.findById(existing.inventoryId);

          if (inventory === null) {
            throw new NotFoundError({
              message: "Inventory not found",
              details: { inventoryId: existing.inventoryId },
            });
          }

          validateInventoryForMaintenance(
            inventory,
            existing.productId,
            existing.warehouseId,
            updateData.quantity,
          );
        }

        const previousValues = toMaintenanceAuditValues(existing);
        const updated = await maintenanceRepository.update(existing.id, updateData);

        await auditLogger.log({
          module: MAINTENANCE_MODULE,
          entityName: MAINTENANCE_ENTITY_NAME,
          recordId: updated.id,
          action: "UPDATE",
          status: "SUCCESS",
          oldValues: previousValues,
          newValues: toMaintenanceAuditValues(updated),
        });

        return toMaintenanceDto(updated);
      },
    );
  }
}
