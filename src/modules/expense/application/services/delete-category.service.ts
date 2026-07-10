import { parseRequest } from "@/shared/application/validation";
import { NotFoundError } from "@/shared/infrastructure/errors";

import { toExpenseCategoryId } from "../mappers/expense-category.mapper";
import {
  ExpenseCategoryIdParamSchema,
  type ExpenseCategoryIdParamInput,
} from "../schemas/expense-category.schemas";
import { toExpenseCategoryAuditValues } from "./category-audit.mapper";
import {
  EXPENSE_CATEGORY_ENTITY_NAME,
  EXPENSE_CATEGORY_MODULE,
} from "./category-service.constants";
import type { ICategoryTransactionRunner } from "./category-transaction.runner";

export class DeleteCategoryService {
  constructor(private readonly transactionRunner: ICategoryTransactionRunner) {}

  async execute(input: ExpenseCategoryIdParamInput): Promise<void> {
    const { id } = parseRequest(ExpenseCategoryIdParamSchema, input);
    const categoryId = toExpenseCategoryId(id);

    await this.transactionRunner.run(async ({ repository, auditLogger }) => {
      const existing = await repository.findById(categoryId);

      if (existing === null) {
        throw new NotFoundError({
          message: "Expense category not found",
          details: { id },
        });
      }

      await repository.delete(categoryId);

      await auditLogger.log({
        module: EXPENSE_CATEGORY_MODULE,
        entityName: EXPENSE_CATEGORY_ENTITY_NAME,
        recordId: existing.id,
        action: "DELETE",
        status: "SUCCESS",
        oldValues: toExpenseCategoryAuditValues(existing),
      });
    });
  }
}
