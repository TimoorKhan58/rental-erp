import { parseRequest } from "@/shared/application/validation";
import { ConflictError } from "@/shared/infrastructure/errors";

import type { UnitDto } from "../dtos/unit.dto";
import {
  toCreateUnitData,
  toUnitDto,
} from "../mappers/unit.mapper";
import {
  CreateUnitSchema,
  type CreateUnitInput,
} from "../schemas/unit.schemas";
import { toUnitAuditValues } from "./unit-audit.mapper";
import {
  UNIT_ENTITY_NAME,
  UNIT_MODULE,
} from "./unit-service.constants";
import type { IUnitTransactionRunner } from "./unit-transaction.runner";

export class CreateUnitService {
  constructor(private readonly transactionRunner: IUnitTransactionRunner) {}

  async execute(input: CreateUnitInput): Promise<UnitDto> {
    const data = parseRequest(CreateUnitSchema, input);
    const createData = toCreateUnitData(data);

    return this.transactionRunner.run(async ({ repository, auditLogger }) => {
      const existingCode = await repository.findByCode(createData.code);

      if (existingCode !== null) {
        throw new ConflictError({
          message: "Unit code already exists",
          details: { code: createData.code },
        });
      }

      const existingName = await repository.findByName(createData.name);

      if (existingName !== null) {
        throw new ConflictError({
          message: "Unit name already exists",
          details: { name: createData.name },
        });
      }
      const entity = await repository.create(createData);

      await auditLogger.log({
        module: UNIT_MODULE,
        entityName: UNIT_ENTITY_NAME,
        recordId: entity.id,
        action: "CREATE",
        status: "SUCCESS",
        newValues: toUnitAuditValues(entity),
      });

      return toUnitDto(entity);
    });
  }
}
