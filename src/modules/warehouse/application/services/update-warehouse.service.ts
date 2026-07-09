import type { WarehouseDto } from "../dtos/warehouse.dto";
import {
  toWarehouseDto,
  toWarehouseId,
  toUpdateWarehouseData,
} from "../mappers/warehouse.mapper";
import {
  WarehouseIdParamSchema,
  UpdateWarehouseSchema,
  type WarehouseIdParamInput,
  type UpdateWarehouseInput,
} from "../schemas/warehouse.schemas";
import { toWarehouseAuditValues } from "./warehouse-audit.mapper";
import {
  WAREHOUSE_ENTITY_NAME,
  WAREHOUSE_MODULE,
} from "./warehouse-service.constants";
import type { IWarehouseTransactionRunner } from "./warehouse-transaction.runner";
import { parseRequest } from "@/shared/application/validation";
import { NotFoundError } from "@/shared/infrastructure/errors";

export class UpdateWarehouseService {
  constructor(private readonly transactionRunner: IWarehouseTransactionRunner) {}

  async execute(
    params: WarehouseIdParamInput,
    input: UpdateWarehouseInput,
  ): Promise<WarehouseDto> {
    const { id } = parseRequest(WarehouseIdParamSchema, params);
    const data = parseRequest(UpdateWarehouseSchema, input);
    const warehouseId = toWarehouseId(id);
    const updateData = toUpdateWarehouseData(data);

    return this.transactionRunner.run(async ({ repository, auditLogger }) => {
      const existing = await repository.findById(warehouseId);

      if (existing === null) {
        throw new NotFoundError({
          message: "Warehouse not found",
          details: { id },
        });
      }

      const updated = await repository.update(warehouseId, updateData);

      await auditLogger.log({
        module: WAREHOUSE_MODULE,
        entityName: WAREHOUSE_ENTITY_NAME,
        recordId: updated.id,
        action: "UPDATE",
        status: "SUCCESS",
        oldValues: toWarehouseAuditValues(existing),
        newValues: toWarehouseAuditValues(updated),
      });

      return toWarehouseDto(updated);
    });
  }
}
