import { toInventoryId } from "../mappers/inventory.mapper";
import {
  InventoryIdParamSchema,
  type InventoryIdParamInput,
} from "../schemas/inventory.schemas";
import { toInventoryAuditValues } from "./inventory-audit.mapper";
import {
  INVENTORY_ENTITY_NAME,
  INVENTORY_MODULE,
} from "./inventory-service.constants";
import type { IInventoryTransactionRunner } from "./inventory-transaction.runner";
import { parseRequest } from "@/shared/application/validation";
import { NotFoundError } from "@/shared/infrastructure/errors";

export class DeleteInventoryService {
  constructor(private readonly transactionRunner: IInventoryTransactionRunner) {}

  async execute(input: InventoryIdParamInput): Promise<void> {
    const { id } = parseRequest(InventoryIdParamSchema, input);
    const inventoryId = toInventoryId(id);

    await this.transactionRunner.run(async ({ repository, auditLogger }) => {
      const existing = await repository.findById(inventoryId);

      if (existing === null) {
        throw new NotFoundError({
          message: "Inventory not found",
          details: { id },
        });
      }

      await repository.delete(inventoryId);

      await auditLogger.log({
        module: INVENTORY_MODULE,
        entityName: INVENTORY_ENTITY_NAME,
        recordId: existing.id,
        action: "DELETE",
        status: "SUCCESS",
        oldValues: toInventoryAuditValues(existing),
      });
    });
  }
}
