import type { InventoryDto } from "../dtos/inventory.dto";
import {
  toInventoryDto,
  toInventoryId,
  toUpdateInventoryData,
} from "../mappers/inventory.mapper";
import {
  InventoryIdParamSchema,
  UpdateInventorySchema,
  type InventoryIdParamInput,
  type UpdateInventoryInput,
} from "../schemas/inventory.schemas";
import { toInventoryAuditValues } from "./inventory-audit.mapper";
import {
  INVENTORY_ENTITY_NAME,
  INVENTORY_MODULE,
} from "./inventory-service.constants";
import type { IInventoryTransactionRunner } from "./inventory-transaction.runner";
import { parseRequest } from "@/shared/application/validation";
import { NotFoundError } from "@/shared/infrastructure/errors";

export class UpdateInventoryService {
  constructor(private readonly transactionRunner: IInventoryTransactionRunner) {}

  async execute(
    params: InventoryIdParamInput,
    input: UpdateInventoryInput,
  ): Promise<InventoryDto> {
    const { id } = parseRequest(InventoryIdParamSchema, params);
    const data = parseRequest(UpdateInventorySchema, input);
    const inventoryId = toInventoryId(id);
    const updateData = toUpdateInventoryData(data);

    return this.transactionRunner.run(async ({ repository, auditLogger }) => {
      const existing = await repository.findById(inventoryId);

      if (existing === null) {
        throw new NotFoundError({
          message: "Inventory not found",
          details: { id },
        });
      }

      const updated = await repository.update(inventoryId, updateData);

      await auditLogger.log({
        module: INVENTORY_MODULE,
        entityName: INVENTORY_ENTITY_NAME,
        recordId: updated.id,
        action: "UPDATE",
        status: "SUCCESS",
        oldValues: toInventoryAuditValues(existing),
        newValues: toInventoryAuditValues(updated),
      });

      return toInventoryDto(updated);
    });
  }
}
