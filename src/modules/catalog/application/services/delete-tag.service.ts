import { parseRequest } from "@/shared/application/validation";
import { NotFoundError } from "@/shared/infrastructure/errors";

import { toTagId } from "../mappers/tag.mapper";
import {
  TagIdParamSchema,
  type TagIdParamInput,
} from "../schemas/tag.schemas";
import { toTagAuditValues } from "./tag-audit.mapper";
import {
  TAG_ENTITY_NAME,
  TAG_MODULE,
} from "./tag-service.constants";
import type { ITagTransactionRunner } from "./tag-transaction.runner";

export class DeleteTagService {
  constructor(private readonly transactionRunner: ITagTransactionRunner) {}

  async execute(input: TagIdParamInput): Promise<void> {
    const { id } = parseRequest(TagIdParamSchema, input);
    const entityId = toTagId(id);

    await this.transactionRunner.run(async ({ repository, auditLogger }) => {
      const existing = await repository.findById(entityId);

      if (existing === null) {
        throw new NotFoundError({
          message: "Product tag not found",
          details: { id },
        });
      }

      await repository.delete(entityId);

      await auditLogger.log({
        module: TAG_MODULE,
        entityName: TAG_ENTITY_NAME,
        recordId: existing.id,
        action: "DELETE",
        status: "SUCCESS",
        oldValues: toTagAuditValues(existing),
      });
    });
  }
}
