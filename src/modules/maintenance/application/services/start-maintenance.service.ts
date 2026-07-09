import { MAINTENANCE_REFERENCE_TYPE } from "@/modules/maintenance/domain";
import { MaintenanceInvalidStatusError } from "@/modules/maintenance/domain";
import { executeCreateStockMovementInScope } from "@/modules/stock-movement/application/services/create-stock-movement-in-scope";
import { parseRequest } from "@/shared/application/validation";
import {
  NotFoundError,
  UnauthorizedError,
  UnprocessableError,
} from "@/shared/infrastructure/errors";

import type { MaintenanceDto } from "../dtos/maintenance.dto";
import { toMaintenanceDto, toMaintenanceId } from "../mappers/maintenance.mapper";
import {
  MaintenanceIdParamSchema,
  type MaintenanceIdParamInput,
} from "../schemas/maintenance.schemas";
import { toMaintenanceAuditValues } from "./maintenance-audit.mapper";
import { validateInventoryForMaintenance } from "./maintenance-inventory.validation";
import {
  MAINTENANCE_ENTITY_NAME,
  MAINTENANCE_MODULE,
} from "./maintenance-service.constants";
import type { IMaintenanceTransactionRunner } from "./maintenance-transaction.runner";

export class StartMaintenanceService {
  constructor(
    private readonly transactionRunner: IMaintenanceTransactionRunner,
  ) {}

  async execute(params: MaintenanceIdParamInput): Promise<MaintenanceDto> {
    const { id } = parseRequest(MaintenanceIdParamSchema, params);

    return this.transactionRunner.run(
      async ({
        maintenanceRepository,
        inventoryRepository,
        stockMovementRepository,
        auditLogger,
        userId,
      }) => {
        if (userId === undefined) {
          throw new UnauthorizedError({
            message: "User context is required to start maintenance",
          });
        }

        const existing = await maintenanceRepository.findById(toMaintenanceId(id));

        if (existing === null) {
          throw new NotFoundError({
            message: "Maintenance not found",
            details: { id },
          });
        }

        let started;

        try {
          started = existing.withStarted();
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

          throw error;
        }

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
          existing.quantity,
        );

        const previousValues = toMaintenanceAuditValues(existing);

        await executeCreateStockMovementInScope(
          {
            stockMovementRepository,
            inventoryRepository,
            auditLogger,
            userId,
          },
          {
            inventoryId: inventory.id,
            movementType: "OUT",
            quantity: existing.quantity,
            referenceType: MAINTENANCE_REFERENCE_TYPE,
            referenceId: existing.id,
            remarks: `Maintenance started for ${existing.maintenanceNumber}`,
          },
        );

        const updated = await maintenanceRepository.updateStatus(existing.id, {
          status: started.status,
          startedAt: started.startedAt,
        });

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
