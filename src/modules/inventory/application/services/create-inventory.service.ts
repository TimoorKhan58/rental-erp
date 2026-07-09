import type { InventoryDto } from "../dtos/inventory.dto";
import {
  toCreateInventoryData,
  toInventoryDto,
} from "../mappers/inventory.mapper";
import {
  CreateInventorySchema,
  type CreateInventoryInput,
} from "../schemas/inventory.schemas";
import { toInventoryAuditValues } from "./inventory-audit.mapper";
import {
  INVENTORY_ENTITY_NAME,
  INVENTORY_MODULE,
} from "./inventory-service.constants";
import type { IInventoryTransactionRunner } from "./inventory-transaction.runner";
import { parseRequest } from "@/shared/application/validation";
import { ConflictError } from "@/shared/infrastructure/errors";

export class CreateInventoryService {
  constructor(private readonly transactionRunner: IInventoryTransactionRunner) {}

  async execute(input: CreateInventoryInput): Promise<InventoryDto> {
    const data = parseRequest(CreateInventorySchema, input);
    const createData = toCreateInventoryData(data);

    return this.transactionRunner.run(async ({ repository, auditLogger }) => {
      const existing = await repository.findByProductAndWarehouse(
        createData.productId,
        createData.warehouseId,
      );

      if (existing !== null) {
        throw new ConflictError({
          message: "Inventory record already exists for this product and warehouse",
          details: {
            productId: createData.productId,
            warehouseId: createData.warehouseId,
          },
        });
      }

      const inventory = await repository.create(createData);

      await auditLogger.log({
        module: INVENTORY_MODULE,
        entityName: INVENTORY_ENTITY_NAME,
        recordId: inventory.id,
        action: "CREATE",
        status: "SUCCESS",
        newValues: toInventoryAuditValues(inventory),
      });

      return toInventoryDto(inventory);
    });
  }
}
