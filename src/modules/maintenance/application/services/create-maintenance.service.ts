import { Maintenance, MaintenanceInvariantError } from "@/modules/maintenance/domain";
import { parseRequest } from "@/shared/application/validation";
import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
  UnprocessableError,
} from "@/shared/infrastructure/errors";

import type { MaintenanceDto } from "../dtos/maintenance.dto";
import {
  toCreateMaintenanceData,
  toInventoryId,
  toMaintenanceDto,
  toUserId,
} from "../mappers/maintenance.mapper";
import {
  CreateMaintenanceSchema,
  type CreateMaintenanceInput,
} from "../schemas/maintenance.schemas";
import { toMaintenanceAuditValues } from "./maintenance-audit.mapper";
import { validateInventoryForMaintenance } from "./maintenance-inventory.validation";
import {
  MAINTENANCE_ENTITY_NAME,
  MAINTENANCE_MODULE,
} from "./maintenance-service.constants";
import type { IMaintenanceTransactionRunner } from "./maintenance-transaction.runner";

export class CreateMaintenanceService {
  constructor(
    private readonly transactionRunner: IMaintenanceTransactionRunner,
  ) {}

  async execute(input: CreateMaintenanceInput): Promise<MaintenanceDto> {
    const data = parseRequest(CreateMaintenanceSchema, input);

    return this.transactionRunner.run(
      async ({ maintenanceRepository, inventoryRepository, auditLogger, userId }) => {
        if (userId === undefined) {
          throw new UnauthorizedError({
            message: "User context is required to create maintenance",
          });
        }

        const createData = toCreateMaintenanceData(data, toUserId(userId));

        try {
          Maintenance.create(createData);
        } catch (error) {
          if (error instanceof MaintenanceInvariantError) {
            throw new UnprocessableError({
              message: error.message,
              details: { field: error.field },
            });
          }

          throw error;
        }

        const inventory = await inventoryRepository.findById(
          toInventoryId(data.inventoryId),
        );

        if (inventory === null) {
          throw new NotFoundError({
            message: "Inventory not found",
            details: { inventoryId: data.inventoryId },
          });
        }

        validateInventoryForMaintenance(
          inventory,
          createData.productId,
          createData.warehouseId,
          createData.quantity,
        );

        const existing = await maintenanceRepository.findByMaintenanceNumber(
          createData.maintenanceNumber,
        );

        if (existing !== null) {
          throw new ConflictError({
            message: "Maintenance number already exists",
            details: { maintenanceNumber: createData.maintenanceNumber },
          });
        }

        const maintenance = await maintenanceRepository.create(createData);

        await auditLogger.log({
          module: MAINTENANCE_MODULE,
          entityName: MAINTENANCE_ENTITY_NAME,
          recordId: maintenance.id,
          action: "CREATE",
          status: "SUCCESS",
          newValues: toMaintenanceAuditValues(maintenance),
        });

        return toMaintenanceDto(maintenance);
      },
    );
  }
}
