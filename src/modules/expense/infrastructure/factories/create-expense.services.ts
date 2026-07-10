import type { ExpenseApplicationServices as ExpenseApplicationServicesBase } from "@/modules/expense/application/services/expense-application-services.interface";
import { ApproveExpenseService } from "@/modules/expense/application/services/approve-expense.service";
import { CreateExpenseService } from "@/modules/expense/application/services/create-expense.service";
import {
  ExpenseService,
} from "@/modules/expense/application/services/expense.service";
import type { IExpenseService } from "@/modules/expense/application/services/expense-application-services.interface";
import { GetExpenseByIdService } from "@/modules/expense/application/services/get-expense-by-id.service";
import { ListExpensesService } from "@/modules/expense/application/services/list-expenses.service";
import { PayExpenseService } from "@/modules/expense/application/services/pay-expense.service";
import { RejectExpenseService } from "@/modules/expense/application/services/reject-expense.service";
import { SubmitExpenseService } from "@/modules/expense/application/services/submit-expense.service";
import { UpdateExpenseService } from "@/modules/expense/application/services/update-expense.service";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";

import { createExpenseRepositoryFromSharedDeps } from "./create-expense.repository";
import { createExpenseTransactionRunner } from "./create-expense-transaction.runner";

export type { ExpenseApplicationServicesBase as ExpenseApplicationServices };

export interface WiredExpenseApplicationServices
  extends ExpenseApplicationServicesBase {
  expenseService: IExpenseService;
}

export function createExpenseApplicationServices(
  deps: SharedDeps,
  userId?: string,
): WiredExpenseApplicationServices {
  const repository = createExpenseRepositoryFromSharedDeps(deps);
  const transactionRunner = createExpenseTransactionRunner(deps, { userId });

  const getExpenseById = new GetExpenseByIdService(repository);
  const listExpenses = new ListExpensesService(repository);
  const createExpense = new CreateExpenseService(transactionRunner);
  const updateExpense = new UpdateExpenseService(transactionRunner);
  const submitExpense = new SubmitExpenseService(transactionRunner);
  const approveExpense = new ApproveExpenseService(transactionRunner);
  const rejectExpense = new RejectExpenseService(transactionRunner);
  const payExpense = new PayExpenseService(transactionRunner);

  return {
    getExpenseById,
    listExpenses,
    createExpense,
    updateExpense,
    submitExpense,
    approveExpense,
    rejectExpense,
    payExpense,
    expenseService: new ExpenseService(
      getExpenseById,
      listExpenses,
      createExpense,
      updateExpense,
      submitExpense,
      approveExpense,
      rejectExpense,
      payExpense,
    ),
  };
}
