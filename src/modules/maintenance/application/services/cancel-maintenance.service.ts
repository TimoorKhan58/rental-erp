import { MAINTENANCE_REFERENCE_TYPE } from "@/modules/maintenance/domain";
import { MaintenanceInvalidStatusError } from "@/modules/maintenance/domain";
import { executeCreateStockMovementInScope } from "@/modules/stock-movement/application/services/create-stock-movement-in-scope";
import { parseRequest } from "@/shared/application/validation";
import {
  ConcurrentUpdateError,
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
import {
  MAINTENANCE_ENTITY_NAME,
  MAINTENANCE_MODULE,
} from "./maintenance-service.constants";
import type { IMaintenanceTransactionRunner } from "./maintenance-transaction.runner";

export class CancelMaintenanceService {
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
            message: "User context is required to cancel maintenance",
          });
        }

        const existing = await maintenanceRepository.findById(toMaintenanceId(id));

        if (existing === null) {
          throw new NotFoundError({
            message: "Maintenance not found",
            details: { id },
          });
        }

        let cancelled;

        try {
          cancelled = existing.withCancelled();
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

        const wasInProgress = existing.status === "IN_PROGRESS";
        const previousValues = toMaintenanceAuditValues(existing);

        const claimed = await maintenanceRepository.claimStatusTransition(
          existing.id,
          ["SCHEDULED", "IN_PROGRESS"],
          {
            status: cancelled.status,
          },
        );

        if (claimed === null) {
          throw new ConcurrentUpdateError({
            entity: MAINTENANCE_ENTITY_NAME,
            id: existing.id,
            expectedStatus: "SCHEDULED|IN_PROGRESS",
            action: "cancel",
          });
        }

        if (wasInProgress) {
          const inventory = await inventoryRepository.findById(existing.inventoryId);

          if (inventory === null) {
            throw new NotFoundError({
              message: "Inventory not found",
              details: { inventoryId: existing.inventoryId },
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
              referenceType: MAINTENANCE_REFERENCE_TYPE,
              referenceId: existing.id,
              remarks: `Maintenance cancelled for ${existing.maintenanceNumber}`,
            },
          );
        }

        await auditLogger.log({
          module: MAINTENANCE_MODULE,
          entityName: MAINTENANCE_ENTITY_NAME,
          recordId: claimed.id,
          action: "CANCEL",
          status: "SUCCESS",
          oldValues: previousValues,
          newValues: toMaintenanceAuditValues(claimed),
        });

        return toMaintenanceDto(claimed);
      },
    );
  }
}
