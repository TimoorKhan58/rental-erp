import { parseRequest } from "@/shared/application/validation";
import { ConflictError } from "@/shared/infrastructure/errors";

import type { TagDto } from "../dtos/tag.dto";
import {
  toCreateTagData,
  toTagDto,
} from "../mappers/tag.mapper";
import {
  CreateTagSchema,
  type CreateTagInput,
} from "../schemas/tag.schemas";
import { toTagAuditValues } from "./tag-audit.mapper";
import {
  TAG_ENTITY_NAME,
  TAG_MODULE,
} from "./tag-service.constants";
import type { ITagTransactionRunner } from "./tag-transaction.runner";

export class CreateTagService {
  constructor(private readonly transactionRunner: ITagTransactionRunner) {}

  async execute(input: CreateTagInput): Promise<TagDto> {
    const data = parseRequest(CreateTagSchema, input);
    const createData = toCreateTagData(data);

    return this.transactionRunner.run(async ({ repository, auditLogger }) => {
      const existingName = await repository.findByName(createData.name);

      if (existingName !== null) {
        throw new ConflictError({
          message: "Product tag name already exists",
          details: { name: createData.name },
        });
      }
      const entity = await repository.create(createData);

      await auditLogger.log({
        module: TAG_MODULE,
        entityName: TAG_ENTITY_NAME,
        recordId: entity.id,
        action: "CREATE",
        status: "SUCCESS",
        newValues: toTagAuditValues(entity),
      });

      return toTagDto(entity);
    });
  }
}
