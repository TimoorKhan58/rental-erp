import type { IExpenseCategoryRepository } from "@/modules/expense/domain/expense-category.repository.interface";
import { parseRequest } from "@/shared/application/validation";
import { NotFoundError } from "@/shared/infrastructure/errors";

import type { ExpenseCategoryDto } from "../dtos/expense-category.dto";
import {
  toExpenseCategoryDto,
  toExpenseCategoryId,
} from "../mappers/expense-category.mapper";
import {
  ExpenseCategoryIdParamSchema,
  type ExpenseCategoryIdParamInput,
} from "../schemas/expense-category.schemas";

export class GetCategoryByIdService {
  constructor(private readonly repository: IExpenseCategoryRepository) {}

  async execute(
    input: ExpenseCategoryIdParamInput,
  ): Promise<ExpenseCategoryDto> {
    const params = parseRequest(ExpenseCategoryIdParamSchema, input);
    const category = await this.repository.findById(
      toExpenseCategoryId(params.id),
    );

    if (category === null) {
      throw new NotFoundError({
        message: "Expense category not found",
        details: { id: params.id },
      });
    }

    return toExpenseCategoryDto(category);
  }
}
