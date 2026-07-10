import type { PaginatedResult } from "@/shared/domain/pagination";

import type { ExpenseDto } from "../dtos/expense.dto";
import type {
  CreateExpenseInput,
  ExpenseIdParamInput,
  RejectExpenseInput,
  UpdateExpenseInput,
} from "../schemas/expense.schemas";
import type { ListExpensesInput } from "../schemas/list-expenses.schema";
import type { ApproveExpenseService } from "./approve-expense.service";
import type { CreateExpenseService } from "./create-expense.service";
import type { GetExpenseByIdService } from "./get-expense-by-id.service";
import type { ListExpensesService } from "./list-expenses.service";
import type { PayExpenseService } from "./pay-expense.service";
import type { RejectExpenseService } from "./reject-expense.service";
import type { SubmitExpenseService } from "./submit-expense.service";
import type { UpdateExpenseService } from "./update-expense.service";

export interface ExpenseApplicationServices {
  getExpenseById: GetExpenseByIdService;
  listExpenses: ListExpensesService;
  createExpense: CreateExpenseService;
  updateExpense: UpdateExpenseService;
  submitExpense: SubmitExpenseService;
  approveExpense: ApproveExpenseService;
  rejectExpense: RejectExpenseService;
  payExpense: PayExpenseService;
}

export type ExpenseServiceResolver = (
  ctx: import("@/shared/application/context").ExecutionContext,
) => ExpenseApplicationServices;

export interface IExpenseService {
  getById(params: ExpenseIdParamInput): Promise<ExpenseDto>;
  list(input: ListExpensesInput): Promise<PaginatedResult<ExpenseDto>>;
  create(input: CreateExpenseInput): Promise<ExpenseDto>;
  update(
    params: ExpenseIdParamInput,
    input: UpdateExpenseInput,
  ): Promise<ExpenseDto>;
  submit(params: ExpenseIdParamInput): Promise<ExpenseDto>;
  approve(params: ExpenseIdParamInput): Promise<ExpenseDto>;
  reject(
    params: ExpenseIdParamInput,
    input: RejectExpenseInput,
  ): Promise<ExpenseDto>;
  pay(params: ExpenseIdParamInput): Promise<ExpenseDto>;
}
