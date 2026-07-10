import { parseRequest } from "@/shared/application/validation";
import { NotFoundError } from "@/shared/infrastructure/errors";

import { toCategoryId } from "../mappers/category.mapper";
import {
  CategoryIdParamSchema,
  type CategoryIdParamInput,
} from "../schemas/category.schemas";
import { toCategoryAuditValues } from "./category-audit.mapper";
import {
  CATEGORY_ENTITY_NAME,
  CATEGORY_MODULE,
} from "./category-service.constants";
import type { ICategoryTransactionRunner } from "./category-transaction.runner";

export class DeleteCategoryService {
  constructor(private readonly transactionRunner: ICategoryTransactionRunner) {}

  async execute(input: CategoryIdParamInput): Promise<void> {
    const { id } = parseRequest(CategoryIdParamSchema, input);
    const entityId = toCategoryId(id);

    await this.transactionRunner.run(async ({ repository, auditLogger }) => {
      const existing = await repository.findById(entityId);

      if (existing === null) {
        throw new NotFoundError({
          message: "Category not found",
          details: { id },
        });
      }

      await repository.delete(entityId);

      await auditLogger.log({
        module: CATEGORY_MODULE,
        entityName: CATEGORY_ENTITY_NAME,
        recordId: existing.id,
        action: "DELETE",
        status: "SUCCESS",
        oldValues: toCategoryAuditValues(existing),
      });
    });
  }
}
