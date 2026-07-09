import type { WarehouseDto } from "../dtos/warehouse.dto";
import {
  toCreateWarehouseData,
  toWarehouseDto,
} from "../mappers/warehouse.mapper";
import {
  CreateWarehouseSchema,
  type CreateWarehouseInput,
} from "../schemas/warehouse.schemas";
import { toWarehouseAuditValues } from "./warehouse-audit.mapper";
import {
  WAREHOUSE_ENTITY_NAME,
  WAREHOUSE_MODULE,
} from "./warehouse-service.constants";
import type { IWarehouseTransactionRunner } from "./warehouse-transaction.runner";
import { parseRequest } from "@/shared/application/validation";
import { ConflictError } from "@/shared/infrastructure/errors";

export class CreateWarehouseService {
  constructor(private readonly transactionRunner: IWarehouseTransactionRunner) {}

  async execute(input: CreateWarehouseInput): Promise<WarehouseDto> {
    const data = parseRequest(CreateWarehouseSchema, input);
    const createData = toCreateWarehouseData(data);

    return this.transactionRunner.run(async ({ repository, auditLogger }) => {
      const existingCode = await repository.findByWarehouseCode(
        createData.warehouseCode,
      );

      if (existingCode !== null) {
        throw new ConflictError({
          message: "Warehouse code already exists",
          details: { warehouseCode: createData.warehouseCode },
        });
      }

      const warehouse = await repository.create(createData);

      await auditLogger.log({
        module: WAREHOUSE_MODULE,
        entityName: WAREHOUSE_ENTITY_NAME,
        recordId: warehouse.id,
        action: "CREATE",
        status: "SUCCESS",
        newValues: toWarehouseAuditValues(warehouse),
      });

      return toWarehouseDto(warehouse);
    });
  }
}
