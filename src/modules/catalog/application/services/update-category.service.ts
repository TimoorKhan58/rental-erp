import { parseRequest } from "@/shared/application/validation";
import { ConflictError, NotFoundError } from "@/shared/infrastructure/errors";

import type { CategoryDto } from "../dtos/category.dto";
import {
  toCategoryDto,
  toCategoryId,
  toUpdateCategoryData,
} from "../mappers/category.mapper";
import {
  CategoryIdParamSchema,
  UpdateCategorySchema,
  type CategoryIdParamInput,
  type UpdateCategoryInput,
} from "../schemas/category.schemas";
import { toCategoryAuditValues } from "./category-audit.mapper";
import {
  CATEGORY_ENTITY_NAME,
  CATEGORY_MODULE,
} from "./category-service.constants";
import type { ICategoryTransactionRunner } from "./category-transaction.runner";

export class UpdateCategoryService {
  constructor(private readonly transactionRunner: ICategoryTransactionRunner) {}

  async execute(
    params: CategoryIdParamInput,
    input: UpdateCategoryInput,
  ): Promise<CategoryDto> {
    const { id } = parseRequest(CategoryIdParamSchema, params);
    const data = parseRequest(UpdateCategorySchema, input);
    const entityId = toCategoryId(id);
    const updateData = toUpdateCategoryData(data);

    return this.transactionRunner.run(async ({ repository, auditLogger }) => {
      const existing = await repository.findById(entityId);

      if (existing === null) {
        throw new NotFoundError({
          message: "Category not found",
          details: { id },
        });
      }

      if (updateData.name !== undefined) {
        const duplicate = await repository.findByName(updateData.name);

        if (duplicate !== null && duplicate.id !== entityId) {
          throw new ConflictError({
            message: "Category name already exists",
            details: { name: updateData.name },
          });
        }
      }
      const previousValues = toCategoryAuditValues(existing);
      const updated = await repository.update(entityId, updateData);

      await auditLogger.log({
        module: CATEGORY_MODULE,
        entityName: CATEGORY_ENTITY_NAME,
        recordId: updated.id,
        action: "UPDATE",
        status: "SUCCESS",
        oldValues: previousValues,
        newValues: toCategoryAuditValues(updated),
      });

      return toCategoryDto(updated);
    });
  }
}
