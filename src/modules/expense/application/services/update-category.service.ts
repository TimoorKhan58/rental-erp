import { parseRequest } from "@/shared/application/validation";
import { ConflictError, NotFoundError } from "@/shared/infrastructure/errors";

import type { ExpenseCategoryDto } from "../dtos/expense-category.dto";
import {
  toExpenseCategoryDto,
  toExpenseCategoryId,
  toUpdateExpenseCategoryData,
} from "../mappers/expense-category.mapper";
import {
  ExpenseCategoryIdParamSchema,
  UpdateExpenseCategorySchema,
  type ExpenseCategoryIdParamInput,
  type UpdateExpenseCategoryInput,
} from "../schemas/expense-category.schemas";
import { toExpenseCategoryAuditValues } from "./category-audit.mapper";
import {
  EXPENSE_CATEGORY_ENTITY_NAME,
  EXPENSE_CATEGORY_MODULE,
} from "./category-service.constants";
import type { ICategoryTransactionRunner } from "./category-transaction.runner";

export class UpdateCategoryService {
  constructor(private readonly transactionRunner: ICategoryTransactionRunner) {}

  async execute(
    params: ExpenseCategoryIdParamInput,
    input: UpdateExpenseCategoryInput,
  ): Promise<ExpenseCategoryDto> {
    const { id } = parseRequest(ExpenseCategoryIdParamSchema, params);
    const data = parseRequest(UpdateExpenseCategorySchema, input);
    const categoryId = toExpenseCategoryId(id);
    const updateData = toUpdateExpenseCategoryData(data);

    return this.transactionRunner.run(async ({ repository, auditLogger }) => {
      const existing = await repository.findById(categoryId);

      if (existing === null) {
        throw new NotFoundError({
          message: "Expense category not found",
          details: { id },
        });
      }

      if (updateData.name !== undefined) {
        const duplicate = await repository.findByName(updateData.name);

        if (duplicate !== null && duplicate.id !== categoryId) {
          throw new ConflictError({
            message: "Expense category name already exists",
            details: { name: updateData.name },
          });
        }
      }

      const previousValues = toExpenseCategoryAuditValues(existing);
      const updated = await repository.update(categoryId, updateData);

      await auditLogger.log({
        module: EXPENSE_CATEGORY_MODULE,
        entityName: EXPENSE_CATEGORY_ENTITY_NAME,
        recordId: updated.id,
        action: "UPDATE",
        status: "SUCCESS",
        oldValues: previousValues,
        newValues: toExpenseCategoryAuditValues(updated),
      });

      return toExpenseCategoryDto(updated);
    });
  }
}
