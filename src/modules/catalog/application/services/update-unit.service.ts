import { parseRequest } from "@/shared/application/validation";
import { ConflictError, NotFoundError } from "@/shared/infrastructure/errors";

import type { UnitDto } from "../dtos/unit.dto";
import {
  toUnitDto,
  toUnitId,
  toUpdateUnitData,
} from "../mappers/unit.mapper";
import {
  UnitIdParamSchema,
  UpdateUnitSchema,
  type UnitIdParamInput,
  type UpdateUnitInput,
} from "../schemas/unit.schemas";
import { toUnitAuditValues } from "./unit-audit.mapper";
import {
  UNIT_ENTITY_NAME,
  UNIT_MODULE,
} from "./unit-service.constants";
import type { IUnitTransactionRunner } from "./unit-transaction.runner";

export class UpdateUnitService {
  constructor(private readonly transactionRunner: IUnitTransactionRunner) {}

  async execute(
    params: UnitIdParamInput,
    input: UpdateUnitInput,
  ): Promise<UnitDto> {
    const { id } = parseRequest(UnitIdParamSchema, params);
    const data = parseRequest(UpdateUnitSchema, input);
    const entityId = toUnitId(id);
    const updateData = toUpdateUnitData(data);

    return this.transactionRunner.run(async ({ repository, auditLogger }) => {
      const existing = await repository.findById(entityId);

      if (existing === null) {
        throw new NotFoundError({
          message: "Unit of measure not found",
          details: { id },
        });
      }

      if (updateData.code !== undefined) {
        const duplicateCode = await repository.findByCode(updateData.code);

        if (duplicateCode !== null && duplicateCode.id !== entityId) {
          throw new ConflictError({
            message: "Unit code already exists",
            details: { code: updateData.code },
          });
        }
      }

      if (updateData.name !== undefined) {
        const duplicateName = await repository.findByName(updateData.name);

        if (duplicateName !== null && duplicateName.id !== entityId) {
          throw new ConflictError({
            message: "Unit name already exists",
            details: { name: updateData.name },
          });
        }
      }
      const previousValues = toUnitAuditValues(existing);
      const updated = await repository.update(entityId, updateData);

      await auditLogger.log({
        module: UNIT_MODULE,
        entityName: UNIT_ENTITY_NAME,
        recordId: updated.id,
        action: "UPDATE",
        status: "SUCCESS",
        oldValues: previousValues,
        newValues: toUnitAuditValues(updated),
      });

      return toUnitDto(updated);
    });
  }
}
