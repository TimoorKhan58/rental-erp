import type { IExpenseRepository } from "@/modules/expense/domain/expense.repository.interface";
import { parseRequest } from "@/shared/application/validation";

import type { ExpenseSummaryDto } from "../dtos/expense-summary.dto";
import { toExpenseSummaryDto } from "../dtos/expense-summary.dto";
import { toExpenseSummaryQuery } from "../mappers/expense-summary.mapper";
import {
  GetExpenseSummarySchema,
  type GetExpenseSummaryInput,
} from "../schemas/get-expense-summary.schema";

export class GetExpenseSummaryService {
  constructor(private readonly expenseRepository: IExpenseRepository) {}

  async execute(input: GetExpenseSummaryInput): Promise<ExpenseSummaryDto> {
    const query = parseRequest(GetExpenseSummarySchema, input);
    const summaryQuery = toExpenseSummaryQuery(query);
    const result = await this.expenseRepository.findSummaryStats(summaryQuery);

    return toExpenseSummaryDto(result);
  }
}
