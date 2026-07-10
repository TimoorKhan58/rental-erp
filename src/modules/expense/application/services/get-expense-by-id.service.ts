import type { IExpenseRepository } from "@/modules/expense/domain/expense.repository.interface";
import { parseRequest } from "@/shared/application/validation";
import { NotFoundError } from "@/shared/infrastructure/errors";

import type { ExpenseDto } from "../dtos/expense.dto";
import { toExpenseDto, toExpenseId } from "../mappers/expense.mapper";
import {
  ExpenseIdParamSchema,
  type ExpenseIdParamInput,
} from "../schemas/expense.schemas";

export class GetExpenseByIdService {
  constructor(private readonly expenseRepository: IExpenseRepository) {}

  async execute(params: ExpenseIdParamInput): Promise<ExpenseDto> {
    const { id } = parseRequest(ExpenseIdParamSchema, params);

    const expense = await this.expenseRepository.findById(toExpenseId(id));

    if (expense === null) {
      throw new NotFoundError({
        message: "Expense not found",
        details: { id },
      });
    }

    return toExpenseDto(expense);
  }
}
