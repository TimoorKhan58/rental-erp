import {
  Expense,
  ExpenseEligibilityError,
  ExpenseInvariantError,
} from "@/modules/expense/domain";
import { parseRequest } from "@/shared/application/validation";
import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
  UnprocessableError,
} from "@/shared/infrastructure/errors";

import type { ExpenseDto } from "../dtos/expense.dto";
import {
  toCreateExpenseData,
  toExpenseCategoryId,
  toExpenseDto,
  toSupplierId,
  toUserId,
} from "../mappers/expense.mapper";
import {
  CreateExpenseSchema,
  type CreateExpenseInput,
} from "../schemas/expense.schemas";
import { toExpenseAuditValues } from "./expense-audit.mapper";
import { validateSupplierForExpense } from "./expense-supplier.validation";
import {
  EXPENSE_ENTITY_NAME,
  EXPENSE_MODULE,
} from "./expense-service.constants";
import type { IExpenseTransactionRunner } from "./expense-transaction.runner";

export class CreateExpenseService {
  constructor(
    private readonly transactionRunner: IExpenseTransactionRunner,
  ) {}

  async execute(input: CreateExpenseInput): Promise<ExpenseDto> {
    const data = parseRequest(CreateExpenseSchema, input);

    return this.transactionRunner.run(
      async ({
        expenseRepository,
        expenseCategoryRepository,
        supplierRepository,
        auditLogger,
        userId,
      }) => {
        if (userId === undefined) {
          throw new UnauthorizedError({
            message: "User context is required to create expense",
          });
        }

        const createData = toCreateExpenseData(data, toUserId(userId));

        try {
          Expense.create(createData);
        } catch (error) {
          if (error instanceof ExpenseInvariantError) {
            throw new UnprocessableError({
              message: error.message,
              details: { field: error.field },
            });
          }

          if (error instanceof ExpenseEligibilityError) {
            throw new UnprocessableError({
              message: error.message,
            });
          }

          throw error;
        }

        const categoryExists = await expenseCategoryRepository.exists(
          toExpenseCategoryId(data.categoryId),
        );

        if (!categoryExists) {
          throw new NotFoundError({
            message: "Expense category not found",
            details: { categoryId: data.categoryId },
          });
        }

        if (data.expenseType === "VENDOR" && data.supplierId) {
          await validateSupplierForExpense(
            supplierRepository,
            toSupplierId(data.supplierId),
          );
        }

        const existing = await expenseRepository.findByExpenseNumber(
          createData.expenseNumber,
        );

        if (existing !== null) {
          throw new ConflictError({
            message: "Expense number already exists",
            details: { expenseNumber: createData.expenseNumber },
          });
        }

        const expense = await expenseRepository.create(createData);

        await auditLogger.log({
          module: EXPENSE_MODULE,
          entityName: EXPENSE_ENTITY_NAME,
          recordId: expense.id,
          action: "CREATE",
          status: "SUCCESS",
          newValues: toExpenseAuditValues(expense),
        });

        return toExpenseDto(expense);
      },
    );
  }
}
