import type { IExpenseRepository } from "@/modules/expense/domain/expense.repository.interface";
import { parseRequest } from "@/shared/application/validation";
import type { PaginatedResult } from "@/shared/domain/pagination";

import type { ExpenseDto } from "../dtos/expense.dto";
import { toExpenseDto, toExpenseListQuery } from "../mappers/expense.mapper";
import {
  ListExpensesSchema,
  type ListExpensesInput,
} from "../schemas/list-expenses.schema";

export class ListExpensesService {
  constructor(private readonly expenseRepository: IExpenseRepository) {}

  async execute(input: ListExpensesInput): Promise<PaginatedResult<ExpenseDto>> {
    const query = parseRequest(ListExpensesSchema, input);
    const listQuery = toExpenseListQuery(query);
    const result = await this.expenseRepository.findPaged(listQuery);

    return {
      ...result,
      items: result.items.map(toExpenseDto),
    };
  }
}
