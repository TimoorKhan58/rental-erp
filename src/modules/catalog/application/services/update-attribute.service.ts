import { parseRequest } from "@/shared/application/validation";
import { ConflictError, NotFoundError } from "@/shared/infrastructure/errors";

import type { AttributeDto } from "../dtos/attribute.dto";
import {
  toAttributeDto,
  toAttributeId,
  toUpdateAttributeData,
} from "../mappers/attribute.mapper";
import {
  AttributeIdParamSchema,
  UpdateAttributeSchema,
  type AttributeIdParamInput,
  type UpdateAttributeInput,
} from "../schemas/attribute.schemas";
import { toAttributeAuditValues } from "./attribute-audit.mapper";
import {
  ATTRIBUTE_ENTITY_NAME,
  ATTRIBUTE_MODULE,
} from "./attribute-service.constants";
import type { IAttributeTransactionRunner } from "./attribute-transaction.runner";

export class UpdateAttributeService {
  constructor(private readonly transactionRunner: IAttributeTransactionRunner) {}

  async execute(
    params: AttributeIdParamInput,
    input: UpdateAttributeInput,
  ): Promise<AttributeDto> {
    const { id } = parseRequest(AttributeIdParamSchema, params);
    const data = parseRequest(UpdateAttributeSchema, input);
    const entityId = toAttributeId(id);
    const updateData = toUpdateAttributeData(data);

    return this.transactionRunner.run(async ({ repository, auditLogger }) => {
      const existing = await repository.findById(entityId);

      if (existing === null) {
        throw new NotFoundError({
          message: "Product attribute not found",
          details: { id },
        });
      }

      if (updateData.name !== undefined) {
        const duplicate = await repository.findByName(updateData.name);

        if (duplicate !== null && duplicate.id !== entityId) {
          throw new ConflictError({
            message: "Product attribute name already exists",
            details: { name: updateData.name },
          });
        }
      }
      const previousValues = toAttributeAuditValues(existing);
      const updated = await repository.update(entityId, updateData);

      await auditLogger.log({
        module: ATTRIBUTE_MODULE,
        entityName: ATTRIBUTE_ENTITY_NAME,
        recordId: updated.id,
        action: "UPDATE",
        status: "SUCCESS",
        oldValues: previousValues,
        newValues: toAttributeAuditValues(updated),
      });

      return toAttributeDto(updated);
    });
  }
}
