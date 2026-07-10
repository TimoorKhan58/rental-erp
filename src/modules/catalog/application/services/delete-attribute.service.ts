import { parseRequest } from "@/shared/application/validation";
import { NotFoundError } from "@/shared/infrastructure/errors";

import { toAttributeId } from "../mappers/attribute.mapper";
import {
  AttributeIdParamSchema,
  type AttributeIdParamInput,
} from "../schemas/attribute.schemas";
import { toAttributeAuditValues } from "./attribute-audit.mapper";
import {
  ATTRIBUTE_ENTITY_NAME,
  ATTRIBUTE_MODULE,
} from "./attribute-service.constants";
import type { IAttributeTransactionRunner } from "./attribute-transaction.runner";

export class DeleteAttributeService {
  constructor(private readonly transactionRunner: IAttributeTransactionRunner) {}

  async execute(input: AttributeIdParamInput): Promise<void> {
    const { id } = parseRequest(AttributeIdParamSchema, input);
    const entityId = toAttributeId(id);

    await this.transactionRunner.run(async ({ repository, auditLogger }) => {
      const existing = await repository.findById(entityId);

      if (existing === null) {
        throw new NotFoundError({
          message: "Product attribute not found",
          details: { id },
        });
      }

      await repository.delete(entityId);

      await auditLogger.log({
        module: ATTRIBUTE_MODULE,
        entityName: ATTRIBUTE_ENTITY_NAME,
        recordId: existing.id,
        action: "DELETE",
        status: "SUCCESS",
        oldValues: toAttributeAuditValues(existing),
      });
    });
  }
}
