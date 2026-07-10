import { parseRequest } from "@/shared/application/validation";
import { ConflictError, NotFoundError } from "@/shared/infrastructure/errors";

import type { TagDto } from "../dtos/tag.dto";
import {
  toTagDto,
  toTagId,
  toUpdateTagData,
} from "../mappers/tag.mapper";
import {
  TagIdParamSchema,
  UpdateTagSchema,
  type TagIdParamInput,
  type UpdateTagInput,
} from "../schemas/tag.schemas";
import { toTagAuditValues } from "./tag-audit.mapper";
import {
  TAG_ENTITY_NAME,
  TAG_MODULE,
} from "./tag-service.constants";
import type { ITagTransactionRunner } from "./tag-transaction.runner";

export class UpdateTagService {
  constructor(private readonly transactionRunner: ITagTransactionRunner) {}

  async execute(
    params: TagIdParamInput,
    input: UpdateTagInput,
  ): Promise<TagDto> {
    const { id } = parseRequest(TagIdParamSchema, params);
    const data = parseRequest(UpdateTagSchema, input);
    const entityId = toTagId(id);
    const updateData = toUpdateTagData(data);

    return this.transactionRunner.run(async ({ repository, auditLogger }) => {
      const existing = await repository.findById(entityId);

      if (existing === null) {
        throw new NotFoundError({
          message: "Product tag not found",
          details: { id },
        });
      }

      if (updateData.name !== undefined) {
        const duplicate = await repository.findByName(updateData.name);

        if (duplicate !== null && duplicate.id !== entityId) {
          throw new ConflictError({
            message: "Product tag name already exists",
            details: { name: updateData.name },
          });
        }
      }
      const previousValues = toTagAuditValues(existing);
      const updated = await repository.update(entityId, updateData);

      await auditLogger.log({
        module: TAG_MODULE,
        entityName: TAG_ENTITY_NAME,
        recordId: updated.id,
        action: "UPDATE",
        status: "SUCCESS",
        oldValues: previousValues,
        newValues: toTagAuditValues(updated),
      });

      return toTagDto(updated);
    });
  }
}
