import {
  ExpenseEligibilityError,
  ExpenseInvalidStatusError,
  ExpenseInvariantError,
} from "@/modules/expense/domain";
import { parseRequest } from "@/shared/application/validation";
import {
  NotFoundError,
  UnprocessableError,
} from "@/shared/infrastructure/errors";

import type { ExpenseDto } from "../dtos/expense.dto";
import {
  toExpenseCategoryId,
  toExpenseDto,
  toExpenseId,
  toSupplierId,
  toUpdateExpenseData,
} from "../mappers/expense.mapper";
import {
  ExpenseIdParamSchema,
  UpdateExpenseSchema,
  type ExpenseIdParamInput,
  type UpdateExpenseInput,
} from "../schemas/expense.schemas";
import { toExpenseAuditValues } from "./expense-audit.mapper";
import { validateSupplierForExpense } from "./expense-supplier.validation";
import {
  EXPENSE_ENTITY_NAME,
  EXPENSE_MODULE,
} from "./expense-service.constants";
import type { IExpenseTransactionRunner } from "./expense-transaction.runner";

export class UpdateExpenseService {
  constructor(
    private readonly transactionRunner: IExpenseTransactionRunner,
  ) {}

  async execute(
    params: ExpenseIdParamInput,
    input: UpdateExpenseInput,
  ): Promise<ExpenseDto> {
    const { id } = parseRequest(ExpenseIdParamSchema, params);
    const data = parseRequest(UpdateExpenseSchema, input);
    const updateData = toUpdateExpenseData(data);

    return this.transactionRunner.run(
      async ({
        expenseRepository,
        expenseCategoryRepository,
        supplierRepository,
        auditLogger,
      }) => {
        const existing = await expenseRepository.findById(toExpenseId(id));

        if (existing === null) {
          throw new NotFoundError({
            message: "Expense not found",
            details: { id },
          });
        }

        try {
          existing.withUpdated(updateData);
        } catch (error) {
          if (error instanceof ExpenseInvalidStatusError) {
            throw new UnprocessableError({
              message: error.message,
              details: {
                currentStatus: error.currentStatus,
                action: error.action,
              },
            });
          }

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

        if (updateData.categoryId !== undefined) {
          const categoryExists = await expenseCategoryRepository.exists(
            toExpenseCategoryId(updateData.categoryId),
          );

          if (!categoryExists) {
            throw new NotFoundError({
              message: "Expense category not found",
              details: { categoryId: updateData.categoryId },
            });
          }
        }

        const nextExpenseType = updateData.expenseType ?? existing.expenseType;
        const nextSupplierId =
          updateData.supplierId !== undefined
            ? updateData.supplierId
            : existing.supplierId;

        if (nextExpenseType === "VENDOR" && nextSupplierId !== null) {
          await validateSupplierForExpense(
            supplierRepository,
            toSupplierId(nextSupplierId),
          );
        }

        const previousValues = toExpenseAuditValues(existing);
        const updated = await expenseRepository.update(
          existing.id,
          updateData,
          existing,
        );

        await auditLogger.log({
          module: EXPENSE_MODULE,
          entityName: EXPENSE_ENTITY_NAME,
          recordId: updated.id,
          action: "UPDATE",
          status: "SUCCESS",
          oldValues: previousValues,
          newValues: toExpenseAuditValues(updated),
        });

        return toExpenseDto(updated);
      },
    );
  }
}
