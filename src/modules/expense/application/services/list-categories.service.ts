import type { IExpenseCategoryRepository } from "@/modules/expense/domain/expense-category.repository.interface";
import type { PaginatedResult } from "@/shared/domain/pagination";
import { parseRequest } from "@/shared/application/validation";

import type { ExpenseCategoryDto } from "../dtos/expense-category.dto";
import {
  toExpenseCategoryDto,
  toExpenseCategoryListQuery,
} from "../mappers/expense-category.mapper";
import {
  ListExpenseCategoriesSchema,
  type ListExpenseCategoriesInput,
} from "../schemas/list-expense-categories.schema";

export class ListCategoriesService {
  constructor(private readonly repository: IExpenseCategoryRepository) {}

  async execute(
    input: ListExpenseCategoriesInput,
  ): Promise<PaginatedResult<ExpenseCategoryDto>> {
    const query = parseRequest(ListExpenseCategoriesSchema, input);
    const result = await this.repository.findPaged(
      toExpenseCategoryListQuery(query),
    );

    return {
      items: result.items.map(toExpenseCategoryDto),
      meta: result.meta,
    };
  }
}
