import { toWarehouseId } from "../mappers/warehouse.mapper";
import {
  WarehouseIdParamSchema,
  type WarehouseIdParamInput,
} from "../schemas/warehouse.schemas";
import { toWarehouseAuditValues } from "./warehouse-audit.mapper";
import {
  WAREHOUSE_ENTITY_NAME,
  WAREHOUSE_MODULE,
} from "./warehouse-service.constants";
import type { IWarehouseTransactionRunner } from "./warehouse-transaction.runner";
import { parseRequest } from "@/shared/application/validation";
import { NotFoundError } from "@/shared/infrastructure/errors";

export class DeleteWarehouseService {
  constructor(private readonly transactionRunner: IWarehouseTransactionRunner) {}

  async execute(input: WarehouseIdParamInput): Promise<void> {
    const { id } = parseRequest(WarehouseIdParamSchema, input);
    const warehouseId = toWarehouseId(id);

    await this.transactionRunner.run(async ({ repository, auditLogger }) => {
      const existing = await repository.findById(warehouseId);

      if (existing === null) {
        throw new NotFoundError({
          message: "Warehouse not found",
          details: { id },
        });
      }

      await repository.delete(warehouseId);

      await auditLogger.log({
        module: WAREHOUSE_MODULE,
        entityName: WAREHOUSE_ENTITY_NAME,
        recordId: existing.id,
        action: "DELETE",
        status: "SUCCESS",
        oldValues: toWarehouseAuditValues(existing),
      });
    });
  }
}
