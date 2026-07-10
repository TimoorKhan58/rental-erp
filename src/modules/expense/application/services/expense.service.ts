import type { PaginatedResult } from "@/shared/domain/pagination";

import type { ExpenseDto } from "../dtos/expense.dto";
import type {
  CreateExpenseInput,
  ExpenseIdParamInput,
  RejectExpenseInput,
  UpdateExpenseInput,
} from "../schemas/expense.schemas";
import type { ListExpensesInput } from "../schemas/list-expenses.schema";
import type { IExpenseService } from "./expense-application-services.interface";
import type { ApproveExpenseService } from "./approve-expense.service";
import type { CreateExpenseService } from "./create-expense.service";
import type { GetExpenseByIdService } from "./get-expense-by-id.service";
import type { ListExpensesService } from "./list-expenses.service";
import type { PayExpenseService } from "./pay-expense.service";
import type { RejectExpenseService } from "./reject-expense.service";
import type { SubmitExpenseService } from "./submit-expense.service";
import type { UpdateExpenseService } from "./update-expense.service";

export class ExpenseService implements IExpenseService {
  constructor(
    private readonly getExpenseById: GetExpenseByIdService,
    private readonly listExpenses: ListExpensesService,
    private readonly createExpense: CreateExpenseService,
    private readonly updateExpense: UpdateExpenseService,
    private readonly submitExpense: SubmitExpenseService,
    private readonly approveExpense: ApproveExpenseService,
    private readonly rejectExpense: RejectExpenseService,
    private readonly payExpense: PayExpenseService,
  ) {}

  getById(params: ExpenseIdParamInput): Promise<ExpenseDto> {
    return this.getExpenseById.execute(params);
  }

  list(input: ListExpensesInput): Promise<PaginatedResult<ExpenseDto>> {
    return this.listExpenses.execute(input);
  }

  create(input: CreateExpenseInput): Promise<ExpenseDto> {
    return this.createExpense.execute(input);
  }

  update(
    params: ExpenseIdParamInput,
    input: UpdateExpenseInput,
  ): Promise<ExpenseDto> {
    return this.updateExpense.execute(params, input);
  }

  submit(params: ExpenseIdParamInput): Promise<ExpenseDto> {
    return this.submitExpense.execute(params);
  }

  approve(params: ExpenseIdParamInput): Promise<ExpenseDto> {
    return this.approveExpense.execute(params);
  }

  reject(
    params: ExpenseIdParamInput,
    input: RejectExpenseInput,
  ): Promise<ExpenseDto> {
    return this.rejectExpense.execute(params, input);
  }

  pay(params: ExpenseIdParamInput): Promise<ExpenseDto> {
    return this.payExpense.execute(params);
  }
}
