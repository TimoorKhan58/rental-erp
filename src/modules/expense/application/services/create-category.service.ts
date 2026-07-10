import { parseRequest } from "@/shared/application/validation";
import { ConflictError } from "@/shared/infrastructure/errors";

import type { ExpenseCategoryDto } from "../dtos/expense-category.dto";
import {
  toCreateExpenseCategoryData,
  toExpenseCategoryDto,
} from "../mappers/expense-category.mapper";
import {
  CreateExpenseCategorySchema,
  type CreateExpenseCategoryInput,
} from "../schemas/expense-category.schemas";
import { toExpenseCategoryAuditValues } from "./category-audit.mapper";
import {
  EXPENSE_CATEGORY_ENTITY_NAME,
  EXPENSE_CATEGORY_MODULE,
} from "./category-service.constants";
import type { ICategoryTransactionRunner } from "./category-transaction.runner";

export class CreateCategoryService {
  constructor(private readonly transactionRunner: ICategoryTransactionRunner) {}

  async execute(
    input: CreateExpenseCategoryInput,
  ): Promise<ExpenseCategoryDto> {
    const data = parseRequest(CreateExpenseCategorySchema, input);
    const createData = toCreateExpenseCategoryData(data);

    return this.transactionRunner.run(async ({ repository, auditLogger }) => {
      const existingName = await repository.findByName(createData.name);

      if (existingName !== null) {
        throw new ConflictError({
          message: "Expense category name already exists",
          details: { name: createData.name },
        });
      }

      const category = await repository.create(createData);

      await auditLogger.log({
        module: EXPENSE_CATEGORY_MODULE,
        entityName: EXPENSE_CATEGORY_ENTITY_NAME,
        recordId: category.id,
        action: "CREATE",
        status: "SUCCESS",
        newValues: toExpenseCategoryAuditValues(category),
      });

      return toExpenseCategoryDto(category);
    });
  }
}
